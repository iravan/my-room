-- One room per user: its settings and what's spinning, plus its albums (the web app's Album objects as jsonb)
-- and cover images in Storage under covers/<owner uid>/<image name>. Private by default; a published room is
-- readable by anyone (visitor links). Only the owner ever writes.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb check (pg_column_size(settings) < 16384),
  spinning_id text not null default '',
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.albums (
  room_id uuid not null references public.rooms (id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  album jsonb not null check (jsonb_typeof(album) = 'object' and pg_column_size(album) < 65536),
  updated_at timestamptz not null default now(),
  primary key (room_id, id)
);

alter table public.rooms enable row level security;
alter table public.albums enable row level security;

create policy "rooms: owner or published can read" on public.rooms
  for select using (owner = auth.uid() or is_public);
create policy "rooms: owner creates" on public.rooms
  for insert to authenticated with check (owner = auth.uid());
create policy "rooms: owner updates" on public.rooms
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "rooms: owner deletes" on public.rooms
  for delete to authenticated using (owner = auth.uid());

create policy "albums: readable with their room" on public.albums
  for select using (exists (select 1 from public.rooms r where r.id = room_id and (r.owner = auth.uid() or r.is_public)));
create policy "albums: owner writes" on public.albums
  for all to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and r.owner = auth.uid()))
  with check (exists (select 1 from public.rooms r where r.id = room_id and r.owner = auth.uid()));

-- Cover images: private bucket, 10 MB cap and image types only (same limits as the app).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "covers: owner writes own folder" on storage.objects
  for insert to authenticated with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers: owner updates own folder" on storage.objects
  for update to authenticated using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers: owner deletes own folder" on storage.objects
  for delete to authenticated using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers: owner or published room can read" on storage.objects
  for select using (
    bucket_id = 'covers' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.rooms r where r.owner::text = (storage.foldername(name))[1] and r.is_public)
    )
  );
