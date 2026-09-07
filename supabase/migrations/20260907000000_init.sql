-- The Project — core schema
-- Day-trading course platform: lectures (unlisted YouTube), progress tracking,
-- four kinds of homework, mentor oversight.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  discord_id  text unique,
  username    text,
  full_name   text,
  avatar_url  text,
  role        text not null default 'student' check (role in ('student','mentor')),
  created_at  timestamptz not null default now()
);

-- Populated from the Discord OAuth identity on first sign-in.
-- Everyone starts as a student; promote the mentor once, by hand:
--   update public.profiles set role = 'mentor' where discord_id = '...';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, discord_id, username, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'provider_id',
    coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECURITY DEFINER so it bypasses RLS on profiles — without this, any policy
-- that calls it while filtering profiles would recurse.
create or replace function public.is_mentor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'mentor'
  );
$$;

-- ---------------------------------------------------------------------------
-- Course structure
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  description  text,
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  description text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists modules_course_idx on public.modules(course_id, position);

create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.modules(id) on delete cascade,
  title            text not null,
  description      text,
  youtube_id       text not null,
  duration_seconds int,
  position         int not null default 0,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists lessons_module_idx on public.lessons(module_id, position);

create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  status      text not null default 'active' check (status in ('active','revoked')),
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create or replace function public.is_enrolled(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = auth.uid()
      and course_id = p_course_id
      and status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Watch progress
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_progress (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  lesson_id             uuid not null references public.lessons(id) on delete cascade,
  last_position_seconds int not null default 0,
  watched_seconds       int not null default 0,
  percent_watched       numeric(5,2) not null default 0,
  completed_at          timestamptz,
  updated_at            timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index if not exists lesson_progress_user_idx on public.lesson_progress(user_id);

-- ---------------------------------------------------------------------------
-- Homework
-- ---------------------------------------------------------------------------
create table if not exists public.assignments (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  lesson_id    uuid references public.lessons(id) on delete cascade,
  kind         text not null check (kind in ('screenshot','journal','quiz','checkbox')),
  title        text not null,
  instructions text,
  position     int not null default 0,
  due_at       timestamptz,
  pass_score   numeric(5,2),           -- quiz only: percent needed to count as complete
  created_at   timestamptz not null default now()
);
create index if not exists assignments_course_idx on public.assignments(course_id, position);
create index if not exists assignments_lesson_idx on public.assignments(lesson_id);

-- correct_index must never reach the browser. No student-facing select policy
-- exists on this table; students read questions through get_quiz() instead.
create table if not exists public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  prompt        text not null,
  options       jsonb not null,
  correct_index int not null,
  explanation   text,
  position      int not null default 0
);
create index if not exists quiz_questions_assignment_idx on public.quiz_questions(assignment_id, position);

create table if not exists public.submissions (
  id               uuid primary key default gen_random_uuid(),
  assignment_id    uuid not null references public.assignments(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  status           text not null default 'submitted' check (status in ('draft','submitted','reviewed')),
  journal_text     text,
  screenshot_paths text[] not null default '{}',
  quiz_answers     jsonb,
  quiz_score       numeric(5,2),
  quiz_total       int,
  is_checked       boolean not null default false,
  mentor_feedback  text,
  submitted_at     timestamptz not null default now(),
  reviewed_at      timestamptz,
  unique (assignment_id, user_id)
);
create index if not exists submissions_user_idx on public.submissions(user_id);
create index if not exists submissions_assignment_idx on public.submissions(assignment_id);
