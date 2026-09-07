-- Lecture grouping and custom thumbnails.

-- ---------------------------------------------------------------------------
-- Nested sections: a module may now sit inside another module, so a topic like
-- "Manipulation" can hold "Pt 1" and "Pt 2" while still living under "The
-- Project". Existing rows get parent_id = null and stay top-level sections, so
-- no backfill is needed.
--
-- Child modules keep their course_id, which means every existing RLS policy
-- and the student_overview rollup continue to work untouched.
-- ---------------------------------------------------------------------------
alter table public.modules
  add column if not exists parent_id uuid references public.modules(id) on delete cascade;

create index if not exists modules_parent_idx on public.modules(parent_id, position);

-- A module cannot be its own parent. Deeper cycles are prevented in the app,
-- which only ever offers two levels.
alter table public.modules
  drop constraint if exists modules_no_self_parent;

alter table public.modules
  add constraint modules_no_self_parent check (parent_id is null or parent_id <> id);

-- ---------------------------------------------------------------------------
-- Custom thumbnails. Null means fall back to the YouTube thumbnail.
-- ---------------------------------------------------------------------------
alter table public.lessons add column if not exists thumbnail_path text;

-- Public bucket: these are course artwork, not student work, and every card on
-- the course page would otherwise need its own signed URL on each render.
insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

drop policy if exists "anyone reads thumbnails" on storage.objects;
create policy "anyone reads thumbnails" on storage.objects
  for select using (bucket_id = 'thumbnails');

drop policy if exists "mentor uploads thumbnails" on storage.objects;
create policy "mentor uploads thumbnails" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'thumbnails' and public.is_mentor());

drop policy if exists "mentor replaces thumbnails" on storage.objects;
create policy "mentor replaces thumbnails" on storage.objects
  for update to authenticated
  using (bucket_id = 'thumbnails' and public.is_mentor());

drop policy if exists "mentor deletes thumbnails" on storage.objects;
create policy "mentor deletes thumbnails" on storage.objects
  for delete to authenticated
  using (bucket_id = 'thumbnails' and public.is_mentor());
