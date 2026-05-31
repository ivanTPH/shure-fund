-- =============================================================================
-- Migration 006: Auth Bridge
--
-- Creates a handle_new_user trigger so that every Supabase auth sign-up
-- automatically produces:
--   1. A public.users row (using email + role from signup metadata)
--   2. project_members rows for every active project (dev convenience seeding;
--      replace with an invite flow in production)
--
-- This bridges the gap between seed data (fake UUIDs) and real auth accounts,
-- letting test users log in and immediately see all project data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- fn_handle_new_user
-- ---------------------------------------------------------------------------

create or replace function fn_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role user_role;
begin
  -- Derive role from signup metadata; fall back to consultant
  begin
    v_role := (new.raw_user_meta_data->>'role')::user_role;
  exception when others then
    v_role := 'consultant'::user_role;
  end;

  if v_role is null then
    v_role := 'consultant'::user_role;
  end if;

  -- Create (or refresh) the public.users row
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    v_role
  )
  on conflict (id) do update
    set email     = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        role      = excluded.role;

  -- Seed project_members for every active project.
  -- Admins bypass membership checks (fn_user_is_admin), so no rows needed.
  if v_role <> 'admin'::user_role then
    insert into project_members (project_id, user_id, role, is_primary)
    select id, new.id, v_role, false
    from   projects
    where  status = 'active'
    on conflict (project_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

-- Install trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function fn_handle_new_user();
