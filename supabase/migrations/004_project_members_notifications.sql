-- =============================================================================
-- Migration 004: Project Members + Enriched Notifications
--
-- Purpose:
--   1. project_members — explicit assignment of users to projects with scoped
--      roles, primary/delegated contacts. This is the authoritative source
--      for "who is responsible for what on this project" and drives both
--      notifications and the audit chain.
--
--   2. Enrich notifications — add action context so the notification itself
--      tells the user exactly what they need to do and on which entity,
--      enabling iOS-style deep-link navigation to the exact action screen.
--
--   3. Add consultant to user_role enum (needed for approval chains).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Add consultant to user_role if not already present
-- ---------------------------------------------------------------------------
alter type user_role add value if not exists 'consultant';

-- ---------------------------------------------------------------------------
-- project_members
--
-- Explicitly assigns users to projects with a project-scoped role.
-- Supports delegation: if delegated_to is set, notifications for this member
-- are also copied to the delegated user.
--
-- Relationship to schema FKs:
--   projects.funder_id    → auto-creates a project_member row (role=funder, is_primary=true)
--   projects.developer_id → auto-creates a project_member row (role=developer, is_primary=true)
--   contracts.contractor_id → auto-creates a project_member row per contract (role=contractor)
--
-- These auto-rows are supplemented by manually added members:
--   e.g. commercial managers, quantity surveyors, consultants.
-- ---------------------------------------------------------------------------

create table if not exists project_members (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references projects(id)  on delete cascade,
  user_id         uuid        not null references users(id)      on delete cascade,
  role            user_role   not null,
  is_primary      boolean     not null default true,
  delegated_to    uuid        references users(id)               on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),

  unique (project_id, user_id)
);

create index if not exists idx_project_members_project on project_members(project_id);
create index if not exists idx_project_members_user    on project_members(user_id);
create index if not exists idx_project_members_role    on project_members(project_id, role);

alter table project_members enable row level security;

-- Any user on the project can see members (for showing contacts)
create policy "project_members: view if on project"
  on project_members for select
  using (
    user_id = auth.uid()
    or fn_user_on_project(project_id)
    or fn_user_is_admin()
  );

-- Only admins/developers can manage membership
create policy "project_members: admin manage"
  on project_members for all
  using (fn_user_is_admin() or
    exists (select 1 from projects where id = project_id and developer_id = auth.uid()))
  with check (fn_user_is_admin() or
    exists (select 1 from projects where id = project_id and developer_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Seed project_members from existing project FKs
-- (runs once at migration time; future projects seeded by trigger below)
-- ---------------------------------------------------------------------------

insert into project_members (project_id, user_id, role, is_primary)
select id, funder_id,    'funder'::user_role,    true
  from projects
  where funder_id is not null
on conflict (project_id, user_id) do nothing;

insert into project_members (project_id, user_id, role, is_primary)
select id, developer_id, 'developer'::user_role, true
  from projects
  where developer_id is not null
on conflict (project_id, user_id) do nothing;

insert into project_members (project_id, user_id, role, is_primary)
select p.id, c.contractor_id, 'contractor'::user_role, true
  from contracts c
  join projects p on p.id = c.project_id
  where c.contractor_id is not null
on conflict (project_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Trigger: auto-seed project_members when a new project is created
-- ---------------------------------------------------------------------------

create or replace function fn_seed_project_members()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into project_members (project_id, user_id, role, is_primary)
  values (new.id, new.funder_id,    'funder'::user_role,    true)
  on conflict (project_id, user_id) do nothing;

  insert into project_members (project_id, user_id, role, is_primary)
  values (new.id, new.developer_id, 'developer'::user_role, true)
  on conflict (project_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_seed_project_members on projects;
create trigger trg_seed_project_members
  after insert on projects
  for each row execute function fn_seed_project_members();

-- ---------------------------------------------------------------------------
-- Trigger: auto-seed contractor project_member when a contract is created
-- ---------------------------------------------------------------------------

create or replace function fn_seed_contractor_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.contractor_id is not null then
    insert into project_members (project_id, user_id, role, is_primary)
    values (new.project_id, new.contractor_id, 'contractor'::user_role, true)
    on conflict (project_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_seed_contractor_member on contracts;
create trigger trg_seed_contractor_member
  after insert on contracts
  for each row execute function fn_seed_contractor_member();

-- ---------------------------------------------------------------------------
-- Enrich notifications with action context
--
-- These fields power the iOS-style notification UI:
--   required_action  — imperative verb phrase: "Approve variation", "Release payment"
--   entity_type      — 'variation' | 'stage' | 'dispute' | 'evidence'
--   entity_id        — UUID of the entity the action applies to
--   entity_name      — Human-readable name: "Stage 2 — Foundation Pour"
--   contract_id      — FK for audit chain traceability
-- ---------------------------------------------------------------------------

alter table notifications
  add column if not exists required_action text,
  add column if not exists entity_type     text,
  add column if not exists entity_id       uuid,
  add column if not exists entity_name     text,
  add column if not exists contract_id     uuid references contracts(id) on delete set null;

create index if not exists idx_notifications_entity
  on notifications(entity_type, entity_id)
  where entity_id is not null;

-- ---------------------------------------------------------------------------
-- Add projects.location alias (some API routes used 'location'; keep both)
-- The canonical column is 'address'. We add a generated column for compat.
-- ---------------------------------------------------------------------------
-- Note: if 'address' was already named 'location' in your local DB, skip.
alter table projects add column if not exists location text
  generated always as (address) stored;
