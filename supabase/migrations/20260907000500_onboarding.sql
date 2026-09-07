-- First-run state, so the welcome flow shows once and never again.
--
-- Nullable rather than a boolean default false: the timestamp answers "when did
-- this person actually start" as well as "have they seen it", and a null is
-- unambiguous for rows that predate the column.
alter table public.profiles
  add column if not exists onboarded_at timestamptz;

-- Everyone who already signed in has, by definition, already joined. Backfill
-- them so "new user" means new, not "anyone who existed before this shipped".
update public.profiles
set onboarded_at = created_at
where onboarded_at is null;
