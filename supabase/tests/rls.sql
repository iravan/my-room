-- RLS checks for the rooms migration: run with run-rls.sh. Any failed assert aborts with a non-zero exit.
\set ON_ERROR_STOP on
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');

create function as_user(sub text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(sub, ''), false);
  execute format('set role %s', case when sub is null then 'anon' else 'authenticated' end);
end $$;
create function expect_denied(q text) returns void language plpgsql as $$
begin
  execute q;
  raise exception 'expected denial: %', q;
exception when insufficient_privilege or check_violation then null;
  when others then if sqlerrm like 'new row violates row-level security%' then null; else raise; end if;
end $$;
grant execute on function as_user(text), expect_denied(text) to anon, authenticated;

-- A creates a private room with an album and a cover
select as_user('00000000-0000-0000-0000-00000000000a');
insert into rooms (settings, spinning_id) values ('{"preset": 1}', 'x1');
insert into albums (room_id, id, album) select id, 'x1', '{"title": "Mine"}' from rooms;
insert into storage.objects (bucket_id, name) values ('covers', '00000000-0000-0000-0000-00000000000a/front.img');
do $$ begin assert (select count(*) from albums) = 1, 'owner sees own album'; end $$;
select expect_denied($q$insert into storage.objects (bucket_id, name) values ('covers', '00000000-0000-0000-0000-00000000000b/x.img')$q$);
select expect_denied($q$insert into albums (room_id, id, album) select id, '../bad', '{}' from rooms$q$);
reset role;

-- B can't see, change or write into A's private room
select id as a_room from rooms \gset
select as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from rooms) = 0, 'private room hidden from others';
  assert (select count(*) from albums) = 0, 'private albums hidden from others';
  assert (select count(*) from storage.objects) = 0, 'private covers hidden from others';
end $$;
update rooms set spinning_id = 'hacked';
select expect_denied(format($q$insert into albums (room_id, id, album) values (%L, 'evil', '{}')$q$, :'a_room'));
select expect_denied($q$insert into rooms (owner) values ('00000000-0000-0000-0000-00000000000a')$q$);
reset role;
do $$ begin assert (select spinning_id from rooms) = 'x1', 'B could not update A''s room'; end $$;

-- Published: anyone (even signed out) can read, still only A writes
select as_user('00000000-0000-0000-0000-00000000000a');
update rooms set is_public = true;
reset role;
select as_user(null);
do $$ begin
  assert (select count(*) from rooms) = 1, 'published room readable by anon';
  assert (select count(*) from albums) = 1, 'published albums readable by anon';
  assert (select count(*) from storage.objects) = 1, 'published covers readable by anon';
end $$;
select expect_denied($q$insert into rooms default values$q$);
update albums set album = '{"title": "defaced"}';
reset role;
select as_user('00000000-0000-0000-0000-00000000000b');
update albums set album = '{"title": "defaced"}';
delete from storage.objects;
reset role;
do $$ begin
  assert (select album->>'title' from albums) = 'Mine', 'nobody but the owner edits albums';
  assert (select count(*) from storage.objects) = 1, 'nobody but the owner deletes covers';
end $$;
select 'RLS checks passed' as result;
