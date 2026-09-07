-- The engineer role.
--
-- Osman mentors; whoever builds and operates the site is an engineer. They hold
-- identical power over the course — the split exists so student-facing copy can
-- keep naming the mentor without the engineer being mistaken for one.

-- ---------------------------------------------------------------------------
-- profiles.role gains a third value
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'mentor', 'engineer'));

-- ---------------------------------------------------------------------------
-- is_staff() is the honest name for "may manage this course".
-- is_mentor() stays as a wrapper: 21 policies call it, and rewriting them all
-- to say the same thing would be churn with a chance of missing one.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('mentor', 'engineer')
  );
$$;

create or replace function public.is_mentor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff();
$$;

-- ---------------------------------------------------------------------------
-- Guardrails on role changes, enforced in the database rather than the UI.
--
-- This also closes a hole that predates the engineer role: the "update own
-- profile" policy lets any authenticated user PATCH their own row, role column
-- included, so a student could promote themselves through the REST API without
-- ever touching the app.
-- ---------------------------------------------------------------------------
create or replace function public.guard_role_change()
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
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Break glass: the service-role key answers to nobody, so a project that has
  -- locked itself out is always repairable from a server.
  if v_jwt_role = 'service_role' then
    return new;
  end if;

  if not public.is_staff() then
    raise exception 'only a mentor or engineer can change roles';
  end if;

  if auth.uid() = new.id then
    raise exception 'you cannot change your own role';
  end if;

  if old.role = 'mentor'
     and new.role <> 'mentor'
     and (select count(*) from public.profiles where role = 'mentor') <= 1 then
    raise exception 'the last mentor cannot be demoted';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_role_change on public.profiles;
create trigger guard_role_change
  before update of role on public.profiles
  for each row execute function public.guard_role_change();

-- ---------------------------------------------------------------------------
-- The one way the app changes a role. SECURITY DEFINER so no broad update
-- policy on profiles is needed; the trigger above still vets the write.
-- ---------------------------------------------------------------------------
create or replace function public.set_member_role(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_row public.profiles;
begin
  if not public.is_staff() then
    raise exception 'only a mentor or engineer can change roles';
  end if;

  if p_role not in ('student', 'mentor', 'engineer') then
    raise exception 'unknown role: %', p_role;
  end if;

  update public.profiles set role = p_role
  where id = p_user_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'no such member';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'username', v_row.username,
    'role', v_row.role
  );
end;
$$;

revoke execute on function public.set_member_role(uuid, text) from anon;
grant  execute on function public.set_member_role(uuid, text) to authenticated;
