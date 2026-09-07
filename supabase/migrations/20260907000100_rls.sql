-- Row-level security.
-- Shape of the rules: a student reaches only their own rows; the mentor reaches
-- every row. Course content is readable by anyone actively enrolled.

alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.modules         enable row level security;
alter table public.lessons         enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.assignments     enable row level security;
alter table public.quiz_questions  enable row level security;
alter table public.submissions     enable row level security;

-- profiles ------------------------------------------------------------------
create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "mentor reads all profiles" on public.profiles
  for select to authenticated using (public.is_mentor());
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- courses / modules / lessons ------------------------------------------------
create policy "enrolled read course" on public.courses
  for select to authenticated using (public.is_enrolled(id) or public.is_mentor());
create policy "mentor writes courses" on public.courses
  for all to authenticated using (public.is_mentor()) with check (public.is_mentor());

create policy "enrolled read modules" on public.modules
  for select to authenticated using (public.is_enrolled(course_id) or public.is_mentor());
create policy "mentor writes modules" on public.modules
  for all to authenticated using (public.is_mentor()) with check (public.is_mentor());

create policy "enrolled read lessons" on public.lessons
  for select to authenticated using (
    public.is_mentor()
    or (is_published and exists (
      select 1 from public.modules m
      where m.id = lessons.module_id and public.is_enrolled(m.course_id)
    ))
  );
create policy "mentor writes lessons" on public.lessons
  for all to authenticated using (public.is_mentor()) with check (public.is_mentor());

-- enrollments ----------------------------------------------------------------
create policy "read own enrollment" on public.enrollments
  for select to authenticated using (user_id = auth.uid() or public.is_mentor());
create policy "mentor writes enrollments" on public.enrollments
  for all to authenticated using (public.is_mentor()) with check (public.is_mentor());

-- lesson_progress ------------------------------------------------------------
create policy "read own progress" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid() or public.is_mentor());
create policy "insert own progress" on public.lesson_progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own progress" on public.lesson_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- assignments ----------------------------------------------------------------
create policy "enrolled read assignments" on public.assignments
  for select to authenticated using (public.is_enrolled(course_id) or public.is_mentor());
create policy "mentor writes assignments" on public.assignments
  for all to authenticated using (public.is_mentor()) with check (public.is_mentor());

-- quiz_questions -------------------------------------------------------------
-- Deliberately no student select policy: correct_index would leak the answer
-- key. Students go through get_quiz() / submit_quiz().
create policy "mentor manages quiz questions" on public.quiz_questions
  for all to authenticated using (public.is_mentor()) with check (public.is_mentor());

-- submissions ----------------------------------------------------------------
create policy "read own submissions" on public.submissions
  for select to authenticated using (user_id = auth.uid() or public.is_mentor());
create policy "insert own submissions" on public.submissions
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own submissions" on public.submissions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mentor reviews submissions" on public.submissions
  for update to authenticated using (public.is_mentor()) with check (public.is_mentor());
