-- Customised rooms in the cloud: the room's layout, options and replaced looks as one jsonb per room (the web app's
-- RoomData; ~1 KB per moved item, so it lives in its own table rather than the 16 KB rooms.settings), and uploaded
-- 3D models in Storage under models/<owner uid>/<name>.glb. Same rules as albums and covers: the owner writes,
-- a published room is readable by anyone.

create table public.room_layouts (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  layout jsonb not null default '{}'::jsonb check (jsonb_typeof(layout) = 'object' and pg_column_size(layout) < 1048576),
  updated_at timestamptz not null default now()
);
alter table public.room_layouts enable row level security;

create policy "room_layouts: readable with their room" on public.room_layouts
  for select using (exists (select 1 from public.rooms r where r.id = room_id and (r.owner = auth.uid() or r.is_public)));
create policy "room_layouts: owner writes" on public.room_layouts
  for all to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and r.owner = auth.uid()))
  with check (exists (select 1 from public.rooms r where r.id = room_id and r.owner = auth.uid()));

-- Uploaded models: private bucket, 20 MB cap, GLB only (same limits as the app's guard).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('models', 'models', false, 20971520, array['model/gltf-binary'])
on conflict (id) do nothing;

create policy "models: owner writes own folder" on storage.objects
  for insert to authenticated with check (bucket_id = 'models' and (storage.foldername(name))[1] = auth.uid()::text and name ~ '/[0-9a-f]{8}\.glb$');
create policy "models: owner updates own folder" on storage.objects
  for update to authenticated using (bucket_id = 'models' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "models: owner deletes own folder" on storage.objects
  for delete to authenticated using (bucket_id = 'models' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "models: owner or published room can read" on storage.objects
  for select using (
    bucket_id = 'models' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.rooms r where r.owner::text = (storage.foldername(name))[1] and r.is_public)
    )
  );
