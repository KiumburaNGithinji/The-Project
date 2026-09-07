-- Quiz access + grading, screenshot storage, and the mentor's rollup view.

-- ---------------------------------------------------------------------------
-- Quiz: read questions without the answer key
-- ---------------------------------------------------------------------------
create or replace function public.get_quiz(p_assignment_id uuid)
returns table (id uuid, prompt text, options jsonb, position int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
begin
  select a.course_id into v_course_id
  from public.assignments a where a.id = p_assignment_id and a.kind = 'quiz';

  if v_course_id is null then
    raise exception 'quiz not found';
  end if;

  if not (public.is_enrolled(v_course_id) or public.is_mentor()) then
    raise exception 'not enrolled';
  end if;

  return query
    select q.id, q.prompt, q.options, q.position
    from public.quiz_questions q
    where q.assignment_id = p_assignment_id
    order by q.position, q.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Quiz: grade server-side and record the submission
-- p_answers is {"<question_id>": <selected option index>, ...}
-- ---------------------------------------------------------------------------
create or replace function public.submit_quiz(p_assignment_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_course_id  uuid;
  v_pass_score numeric;
  v_total      int := 0;
  v_correct    int := 0;
  v_results    jsonb := '[]'::jsonb;
  v_percent    numeric;
  q            record;
  v_answer     int;
  v_is_right   boolean;
begin
  select a.course_id, a.pass_score into v_course_id, v_pass_score
  from public.assignments a where a.id = p_assignment_id and a.kind = 'quiz';

  if v_course_id is null then
    raise exception 'quiz not found';
  end if;

  if not public.is_enrolled(v_course_id) then
    raise exception 'not enrolled';
  end if;

  for q in
    select * from public.quiz_questions
    where assignment_id = p_assignment_id
    order by position, id
  loop
    v_total := v_total + 1;
    v_answer := nullif(p_answers ->> q.id::text, '')::int;
    v_is_right := v_answer is not null and v_answer = q.correct_index;
    if v_is_right then
      v_correct := v_correct + 1;
    end if;

    v_results := v_results || jsonb_build_object(
      'question_id',   q.id,
      'selected',      v_answer,
      'correct',       v_is_right,
      'correct_index', q.correct_index,
      'explanation',   q.explanation
    );
  end loop;

  v_percent := case when v_total = 0 then 0
                    else round((v_correct::numeric / v_total) * 100, 2) end;

  insert into public.submissions
    (assignment_id, user_id, status, quiz_answers, quiz_score, quiz_total)
  values
    (p_assignment_id, auth.uid(), 'submitted', p_answers, v_percent, v_total)
  on conflict (assignment_id, user_id) do update
    set quiz_answers = excluded.quiz_answers,
        quiz_score   = excluded.quiz_score,
        quiz_total   = excluded.quiz_total,
        status       = 'submitted',
        submitted_at = now();

  return jsonb_build_object(
    'score',   v_correct,
    'total',   v_total,
    'percent', v_percent,
    'passed',  v_pass_score is null or v_percent >= v_pass_score,
    'results', v_results
  );
end;
$$;

revoke execute on function public.get_quiz(uuid)            from anon;
revoke execute on function public.submit_quiz(uuid, jsonb)  from anon;
grant  execute on function public.get_quiz(uuid)            to authenticated;
grant  execute on function public.submit_quiz(uuid, jsonb)  to authenticated;

-- ---------------------------------------------------------------------------
-- Screenshot storage — path is <user_id>/<assignment_id>/<filename>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

create policy "students upload own screenshots" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "students read own screenshots" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submissions'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_mentor())
  );

create policy "students delete own screenshots" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Mentor rollup: one row per enrolled student per course
-- ---------------------------------------------------------------------------
create or replace view public.student_overview
with (security_invoker = true) as
select
  e.course_id,
  p.id                as user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  e.enrolled_at,
  (select count(*) from public.lessons l
     join public.modules m on m.id = l.module_id
    where m.course_id = e.course_id and l.is_published)              as lessons_total,
  (select count(*) from public.lesson_progress lp
     join public.lessons l on l.id = lp.lesson_id
     join public.modules m on m.id = l.module_id
    where m.course_id = e.course_id
      and lp.user_id = p.id
      and lp.completed_at is not null)                               as lessons_completed,
  (select count(*) from public.assignments a
    where a.course_id = e.course_id)                                 as assignments_total,
  (select count(*) from public.submissions s
     join public.assignments a on a.id = s.assignment_id
    where a.course_id = e.course_id
      and s.user_id = p.id
      and s.status in ('submitted','reviewed'))                      as assignments_submitted,
  (select max(lp.updated_at) from public.lesson_progress lp
     join public.lessons l on l.id = lp.lesson_id
     join public.modules m on m.id = l.module_id
    where m.course_id = e.course_id and lp.user_id = p.id)           as last_active_at
from public.enrollments e
join public.profiles p on p.id = e.user_id
where e.status = 'active';
