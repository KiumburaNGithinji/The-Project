-- The pathway: lecture 1, its homework approved, then lecture 2.
--
-- Three rules, and every one of them is enforced here rather than in the UI,
-- because the UI is a suggestion to anyone holding the anon key:
--   1. A lecture opens only when everything before it is watched AND approved.
--   2. Only staff can approve work. A student cannot approve their own.
--   3. Homework is due 24h after the lecture is finished; late is flagged,
--      not punished — they are already blocked until it is approved.

-- ---------------------------------------------------------------------------
-- Submission review states
-- ---------------------------------------------------------------------------
alter table public.submissions drop constraint if exists submissions_status_check;
update public.submissions set status = 'approved' where status = 'reviewed';
alter table public.submissions
  add constraint submissions_status_check
  check (status in ('draft', 'submitted', 'approved', 'returned'));

-- A student may hand work in and edit it. They may not decide it is good.
-- Without this, "update own submissions" lets anyone PATCH status = 'approved'
-- straight through PostgREST and walk the entire pathway in one request.
create or replace function public.guard_submission_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jwt_role text := coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );
  v_privileged boolean := v_jwt_role = 'service_role' or public.is_staff();
begin
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'submitted') and not v_privileged then
      raise exception 'only a mentor or engineer can approve work';
    end if;
    if new.mentor_feedback is not null and not v_privileged then
      raise exception 'only a mentor or engineer can leave feedback';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status in ('approved', 'returned')
     and not v_privileged then
    raise exception 'only a mentor or engineer can approve work';
  end if;

  if new.mentor_feedback is distinct from old.mentor_feedback
     and not v_privileged then
    raise exception 'only a mentor or engineer can leave feedback';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_submission_review on public.submissions;
create trigger guard_submission_review
  before insert or update on public.submissions
  for each row execute function public.guard_submission_review();

-- ---------------------------------------------------------------------------
-- The caller's route through the course, in order, with the gate resolved.
--
-- Ordering mirrors the sidebar: sections by position, a section's own lectures
-- before the topics nested under it, then each topic's lectures.
-- ---------------------------------------------------------------------------
create or replace function public.course_path(p_course_id uuid)
returns table (
  lesson_id         uuid,
  module_id         uuid,
  ordinal           int,
  state             text,   -- done | current | locked
  watched           boolean,
  completed_at      timestamptz,
  homework_total    int,
  homework_approved int,
  homework_pending  int,
  homework_returned int,
  due_at            timestamptz,
  overdue           boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with ordered as (
    select
      l.id as lesson_id,
      l.module_id,
      row_number() over (
        order by
          coalesce(pm.position, m.position),
          case when m.parent_id is null then 0 else 1 end,
          m.position,
          l.position,
          l.id
      )::int as ordinal
    from public.lessons l
    join public.modules m on m.id = l.module_id
    left join public.modules pm on pm.id = m.parent_id
    where l.is_published and m.course_id = p_course_id
  ),
  hw as (
    select
      o.lesson_id,
      count(a.id)::int                                        as total,
      count(*) filter (where s.status = 'approved')::int      as approved,
      count(*) filter (where s.status = 'submitted')::int     as pending,
      count(*) filter (where s.status = 'returned')::int      as returned
    from ordered o
    left join public.assignments a on a.lesson_id = o.lesson_id
    left join public.submissions s
      on s.assignment_id = a.id and s.user_id = auth.uid()
    group by o.lesson_id
  ),
  merged as (
    select
      o.lesson_id,
      o.module_id,
      o.ordinal,
      lp.completed_at,
      lp.completed_at is not null as watched,
      coalesce(h.total, 0)    as total,
      coalesce(h.approved, 0) as approved,
      coalesce(h.pending, 0)  as pending,
      coalesce(h.returned, 0) as returned
    from ordered o
    left join hw h on h.lesson_id = o.lesson_id
    left join public.lesson_progress lp
      on lp.lesson_id = o.lesson_id and lp.user_id = auth.uid()
  ),
  flagged as (
    select m.*, (m.watched and m.approved >= m.total) as cleared
    from merged m
  ),
  blocked as (
    select min(ordinal) as ord from flagged where not cleared
  )
  select
    f.lesson_id,
    f.module_id,
    f.ordinal,
    case
      -- Staff walk through walls; they are not students of their own course.
      when (select public.is_staff())      then 'done'
      when f.cleared                       then 'done'
      when f.ordinal = (select ord from blocked) then 'current'
      else 'locked'
    end as state,
    f.watched,
    f.completed_at,
    f.total,
    f.approved,
    f.pending,
    f.returned,
    case
      when f.total > 0 and f.completed_at is not null and f.approved < f.total
      then f.completed_at + interval '24 hours'
    end as due_at,
    coalesce(
      f.total > 0
        and f.completed_at is not null
        and f.approved < f.total
        and now() > f.completed_at + interval '24 hours',
      false
    ) as overdue
  from flagged f
  order by f.ordinal;
$$;

-- May the caller open this lecture at all? The lesson page and the progress
-- endpoint both ask before handing over a video id or recording a second.
create or replace function public.lesson_open(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select cp.state <> 'locked'
      from public.course_path((
        select m.course_id
        from public.lessons l
        join public.modules m on m.id = l.module_id
        where l.id = p_lesson_id
      )) cp
      where cp.lesson_id = p_lesson_id
    ),
    false
  );
$$;

revoke execute on function public.course_path(uuid)  from anon;
revoke execute on function public.lesson_open(uuid)  from anon;
grant  execute on function public.course_path(uuid)  to authenticated;
grant  execute on function public.lesson_open(uuid)  to authenticated;

-- ---------------------------------------------------------------------------
-- The mentor's roster gains a review queue: work handed in and waiting.
-- ---------------------------------------------------------------------------
-- Dropped rather than replaced: a new column in the middle of the list is
-- not something CREATE OR REPLACE VIEW will accept.
drop view if exists public.student_overview;
create view public.student_overview
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
      and s.status in ('submitted','approved'))                      as assignments_submitted,
  (select count(*) from public.submissions s
     join public.assignments a on a.id = s.assignment_id
    where a.course_id = e.course_id
      and s.user_id = p.id
      and s.status = 'submitted')                                    as awaiting_review,
  (select max(lp.updated_at) from public.lesson_progress lp
     join public.lessons l on l.id = lp.lesson_id
     join public.modules m on m.id = l.module_id
    where m.course_id = e.course_id and lp.user_id = p.id)           as last_active_at
from public.enrollments e
join public.profiles p on p.id = e.user_id
where e.status = 'active';
