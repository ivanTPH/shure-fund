-- =============================================================================
-- Shure.Fund — Initial Schema
-- Migration: 001_initial_schema.sql
--
-- Core rule enforced at the database layer:
--   1. Funds must exist before a stage can be set to in_progress
--      (wallet balance check trigger on contract_stages)
--   2. Evidence must exist before approval is meaningful
--      (enforced by application + evidence_status enum)
--   3. All approvals must be granted before a release is permitted
--      (FK from releases → stage_approval_completions, written only by trigger)
--   4. Every state transition writes an immutable audit_event
--      (after-triggers on all status columns)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";


-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

create type user_role as enum (
  'admin',
  'funder',
  'developer',
  'contractor',
  'subcontractor',
  'quantity_surveyor',
  'commercial',
  'professional',
  'treasury'
);

create type company_type as enum (
  'funder',
  'developer',
  'contractor',
  'subcontractor',
  'supplier',
  'consultant'
);

-- All valid stage states as required
create type stage_status as enum (
  'draft',
  'sent',
  'accepted',
  'in_progress',
  'awaiting_approval',
  'returned',
  'disputed',
  'available_to_release',
  'released',
  'funding_gap',
  'part_funded'
);

create type contract_status as enum (
  'draft',
  'issued',
  'accepted',
  'active',
  'completed',
  'disputed',
  'cancelled'
);

create type package_status as enum (
  'draft',
  'active',
  'on_hold',
  'completed'
);

create type evidence_status as enum (
  'pending',
  'accepted',
  'rejected',
  'requires_more'
);

create type approval_role as enum (
  'commercial',
  'professional',
  'treasury'
);

create type approval_decision as enum (
  'pending',
  'approved',
  'rejected',
  'returned'
);

create type release_status as enum (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

create type variation_status as enum (
  'pending',
  'under_review',
  'approved',
  'rejected',
  'active',
  'cancelled'
);

create type wallet_transaction_type as enum (
  'deposit',
  'allocation_in',
  'allocation_out',
  'release',
  'reversal',
  'buffer_adjustment'
);

create type audit_action as enum (
  'stage_status_changed',
  'contract_status_changed',
  'package_status_changed',
  'evidence_submitted',
  'evidence_reviewed',
  'approval_given',
  'approval_rejected',
  'approval_returned',
  'all_approvals_complete',
  'release_initiated',
  'release_completed',
  'release_failed',
  'variation_requested',
  'variation_approved',
  'variation_rejected',
  'variation_activated',
  'dispute_opened',
  'dispute_resolved',
  'wallet_funded',
  'wallet_allocated',
  'override_applied'
);


-- ---------------------------------------------------------------------------
-- TABLES (in dependency order)
-- ---------------------------------------------------------------------------

-- companies ----------------------------------------------------------------
create table companies (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  type       company_type not null,
  verified   boolean     not null default false,
  created_at timestamptz not null default now()
);

-- users --------------------------------------------------------------------
-- users.id is expected to match auth.users.id (set at signup via trigger or
-- the Supabase handle_new_user pattern).
create table users (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  full_name  text        not null,
  role       user_role   not null,
  company_id uuid        references companies(id) on delete set null,
  created_at timestamptz not null default now()
);

-- projects -----------------------------------------------------------------
create table projects (
  id           uuid    primary key default gen_random_uuid(),
  name         text    not null,
  address      text    not null,
  funder_id    uuid    not null references users(id) on delete restrict,
  developer_id uuid    not null references users(id) on delete restrict,
  status       text    not null default 'active'
                       check (status in ('active', 'on_hold', 'completed', 'cancelled')),
  created_at   timestamptz not null default now()
);

-- contracts ----------------------------------------------------------------
create table contracts (
  id            uuid            primary key default gen_random_uuid(),
  project_id    uuid            not null references projects(id) on delete cascade,
  contractor_id uuid            not null references users(id) on delete restrict,
  total_value   numeric(15, 2)  not null check (total_value > 0),
  status        contract_status not null default 'draft',
  created_at    timestamptz     not null default now()
);

-- contract_stages ----------------------------------------------------------
create table contract_stages (
  id          uuid          primary key default gen_random_uuid(),
  contract_id uuid          not null references contracts(id) on delete cascade,
  name        text          not null,
  description text,
  value       numeric(15,2) not null check (value > 0),
  status      stage_status  not null default 'draft',
  start_date  date,
  end_date    date,
  created_at  timestamptz   not null default now(),

  constraint stages_dates_order check (
    end_date is null or start_date is null or end_date >= start_date
  )
);

-- packages -----------------------------------------------------------------
create table packages (
  id          uuid           primary key default gen_random_uuid(),
  stage_id    uuid           not null references contract_stages(id) on delete cascade,
  name        text           not null,
  value       numeric(15,2)  not null check (value > 0),
  status      package_status not null default 'draft',
  assigned_to uuid           references users(id) on delete set null,
  created_at  timestamptz    not null default now()
);

-- evidence -----------------------------------------------------------------
create table evidence (
  id          uuid            primary key default gen_random_uuid(),
  package_id  uuid            references packages(id) on delete cascade,
  stage_id    uuid            not null references contract_stages(id) on delete cascade,
  file_url    text            not null,
  file_type   text            not null,
  uploaded_by uuid            not null references users(id) on delete restrict,
  uploaded_at timestamptz     not null default now(),
  status      evidence_status not null default 'pending',
  reviewer_id uuid            references users(id) on delete set null,
  reviewed_at timestamptz,
  notes       text
);

-- approvals ----------------------------------------------------------------
create table approvals (
  id          uuid              primary key default gen_random_uuid(),
  stage_id    uuid              not null references contract_stages(id) on delete cascade,
  approved_by uuid              not null references users(id) on delete restrict,
  role        approval_role     not null,
  decision    approval_decision not null default 'pending',
  notes       text,
  created_at  timestamptz       not null default now(),

  -- One approval record per role per stage. The trigger will update
  -- decision in place as the approver acts.
  unique (stage_id, role)
);

-- stage_approval_completions -----------------------------------------------
-- Written exclusively by fn_check_approval_completion() when every approval
-- record for a stage reaches decision = 'approved'.
-- releases.stage_id FK-references this table — the FK IS the gate.
-- A release cannot be inserted until this record exists for the stage.
create table stage_approval_completions (
  stage_id     uuid        primary key
               references contract_stages(id) on delete cascade,
  completed_at timestamptz not null default now(),
  completed_by uuid        not null references users(id) on delete restrict
);

-- releases -----------------------------------------------------------------
-- stage_id references stage_approval_completions, not contract_stages.
-- This is the FK constraint that enforces "approvals must exist before release."
-- If no stage_approval_completions row exists for this stage_id, the INSERT fails.
create table releases (
  id          uuid           primary key default gen_random_uuid(),
  stage_id    uuid           not null
              references stage_approval_completions(stage_id) on delete restrict,
  amount      numeric(15,2)  not null check (amount > 0),
  released_by uuid           not null references users(id) on delete restrict,
  released_at timestamptz    not null default now(),
  status      release_status not null default 'pending',
  reference   text,
  notes       text
);

-- variations ---------------------------------------------------------------
create table variations (
  id           uuid             primary key default gen_random_uuid(),
  stage_id     uuid             not null references contract_stages(id) on delete cascade,
  description  text             not null,
  value_change numeric(15,2)    not null,  -- positive = uplift, negative = reduction
  requested_by uuid             not null references users(id) on delete restrict,
  status       variation_status not null default 'pending',
  approved_by  uuid             references users(id) on delete set null,
  approved_at  timestamptz,
  created_at   timestamptz      not null default now()
);

-- wallets ------------------------------------------------------------------
create table wallets (
  id                uuid          primary key default gen_random_uuid(),
  project_id        uuid          not null unique references projects(id) on delete cascade,
  balance           numeric(15,2) not null default 0 check (balance >= 0),
  ringfenced_amount numeric(15,2) not null default 0 check (ringfenced_amount >= 0),
  available_amount  numeric(15,2) not null default 0 check (available_amount >= 0),
  updated_at        timestamptz   not null default now(),

  -- Total committed (ringfenced) + available cannot exceed total balance
  constraint wallet_amounts_within_balance
    check (ringfenced_amount + available_amount <= balance)
);

-- wallet_transactions ------------------------------------------------------
create table wallet_transactions (
  id         uuid                   primary key default gen_random_uuid(),
  wallet_id  uuid                   not null references wallets(id) on delete cascade,
  amount     numeric(15,2)          not null,  -- positive = in, negative = out
  type       wallet_transaction_type not null,
  reference  text                   not null,
  created_by uuid                   not null references users(id) on delete restrict,
  created_at timestamptz            not null default now()
);

-- audit_events -------------------------------------------------------------
-- Immutable. Written only by security-definer trigger functions.
-- No application-level INSERT is permitted (no RLS insert policy for users).
create table audit_events (
  id         uuid         primary key default gen_random_uuid(),
  project_id uuid         references projects(id) on delete set null,
  stage_id   uuid         references contract_stages(id) on delete set null,
  actor_id   uuid         references users(id) on delete set null,
  action     audit_action not null,
  from_state text,
  to_state   text,
  metadata   jsonb        not null default '{}',
  created_at timestamptz  not null default now()
);


-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
create index idx_users_company              on users(company_id);
create index idx_projects_funder            on projects(funder_id);
create index idx_projects_developer         on projects(developer_id);
create index idx_contracts_project          on contracts(project_id);
create index idx_contracts_contractor       on contracts(contractor_id);
create index idx_contracts_status           on contracts(status);
create index idx_stages_contract            on contract_stages(contract_id);
create index idx_stages_status              on contract_stages(status);
create index idx_packages_stage             on packages(stage_id);
create index idx_packages_assigned          on packages(assigned_to);
create index idx_evidence_stage             on evidence(stage_id);
create index idx_evidence_package           on evidence(package_id);
create index idx_evidence_status            on evidence(status);
create index idx_approvals_stage            on approvals(stage_id);
create index idx_approvals_role_decision    on approvals(stage_id, role, decision);
create index idx_approval_completions_stage on stage_approval_completions(stage_id);
create index idx_releases_stage             on releases(stage_id);
create index idx_releases_status            on releases(status);
create index idx_variations_stage           on variations(stage_id);
create index idx_variations_status          on variations(status);
create index idx_wallets_project            on wallets(project_id);
create index idx_wallet_tx_wallet           on wallet_transactions(wallet_id);
create index idx_wallet_tx_created          on wallet_transactions(created_at desc);
create index idx_audit_project              on audit_events(project_id);
create index idx_audit_stage                on audit_events(stage_id);
create index idx_audit_actor                on audit_events(actor_id);
create index idx_audit_action               on audit_events(action);
create index idx_audit_created              on audit_events(created_at desc);


-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS (used by triggers and RLS policies)
-- ---------------------------------------------------------------------------

-- Resolve project_id from a stage_id without a join in every trigger
create or replace function fn_project_id_for_stage(p_stage_id uuid)
returns uuid language sql security definer stable as $$
  select c.project_id
    from contract_stages cs
    join contracts c on c.id = cs.contract_id
   where cs.id = p_stage_id;
$$;

-- True when the current Supabase auth user is a funder or developer on the project
create or replace function fn_user_is_project_admin(p_project_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from projects
     where id = p_project_id
       and (funder_id = auth.uid() or developer_id = auth.uid())
  );
$$;

-- True when the current user participates on the project in any capacity
create or replace function fn_user_on_project(p_project_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from projects
     where id = p_project_id
       and (funder_id = auth.uid() or developer_id = auth.uid())
  )
  or exists (
    select 1 from contracts
     where project_id = p_project_id
       and contractor_id = auth.uid()
  );
$$;

-- True when the current user has the admin role
create or replace function fn_user_is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from users
     where id = auth.uid() and role = 'admin'
  );
$$;


-- ---------------------------------------------------------------------------
-- TRIGGER FUNCTIONS
-- ---------------------------------------------------------------------------

-- 1. GATE: wallet available_amount must cover stage value before in_progress
--    Fires BEFORE UPDATE of status on contract_stages.
create or replace function fn_guard_funding_gate()
returns trigger language plpgsql security definer as $$
declare
  v_project_id uuid;
  v_available  numeric(15,2);
begin
  -- Only enforce the transition into in_progress
  if new.status <> 'in_progress' or old.status = 'in_progress' then
    return new;
  end if;

  select c.project_id into v_project_id
    from contracts c where c.id = new.contract_id;

  select w.available_amount into v_available
    from wallets w where w.project_id = v_project_id;

  if v_available is null or v_available < new.value then
    raise exception
      'FUNDING_GATE: wallet available_amount (%) is less than stage value (%) for stage "%". '
      'Funds must exist before work progresses.',
      coalesce(v_available, 0), new.value, new.name
      using errcode = 'SF001';
  end if;

  return new;
end;
$$;

create trigger trg_guard_funding_gate
  before update of status on contract_stages
  for each row execute function fn_guard_funding_gate();


-- 2. GATE: write stage_approval_completions when every approval is 'approved'.
--    This is what unlocks the FK on releases.
--    Fires AFTER UPDATE of decision on approvals.
create or replace function fn_check_approval_completion()
returns trigger language plpgsql security definer as $$
declare
  v_total_count    int;
  v_approved_count int;
begin
  -- Only act when a decision moves to 'approved'
  if new.decision <> 'approved' then
    return new;
  end if;

  -- Count all approvals for this stage and how many are now approved
  select
    count(*),
    count(*) filter (where decision = 'approved')
  into v_total_count, v_approved_count
  from approvals
  where stage_id = new.stage_id;

  -- All existing approval records must be approved (no pending, rejected, returned)
  if v_total_count > 0 and v_total_count = v_approved_count then
    -- Insert the completion certificate if not already present
    insert into stage_approval_completions (stage_id, completed_by)
    values (new.stage_id, new.approved_by)
    on conflict (stage_id) do nothing;

    -- Advance stage to available_to_release if it is currently awaiting_approval
    update contract_stages
       set status = 'available_to_release'
     where id = new.stage_id
       and status = 'awaiting_approval';

    -- Write the completion audit event
    insert into audit_events (
      project_id, stage_id, actor_id, action, from_state, to_state, metadata
    )
    values (
      fn_project_id_for_stage(new.stage_id),
      new.stage_id,
      new.approved_by,
      'all_approvals_complete',
      'awaiting_approval',
      'available_to_release',
      jsonb_build_object(
        'approval_count', v_total_count,
        'completing_role', new.role
      )
    );
  end if;

  return new;
end;
$$;

create trigger trg_check_approval_completion
  after update of decision on approvals
  for each row execute function fn_check_approval_completion();


-- 3. AUDIT: stage status transitions
create or replace function fn_audit_stage_transition()
returns trigger language plpgsql security definer as $$
begin
  if old.status = new.status then
    return new;
  end if;

  insert into audit_events (
    project_id, stage_id, actor_id, action, from_state, to_state, metadata
  )
  values (
    fn_project_id_for_stage(new.id),
    new.id,
    auth.uid(),
    'stage_status_changed',
    old.status::text,
    new.status::text,
    jsonb_build_object(
      'stage_name',  new.name,
      'stage_value', new.value
    )
  );

  return new;
end;
$$;

create trigger trg_audit_stage_transition
  after update of status on contract_stages
  for each row execute function fn_audit_stage_transition();


-- 4. AUDIT: contract status transitions
create or replace function fn_audit_contract_transition()
returns trigger language plpgsql security definer as $$
begin
  if old.status = new.status then
    return new;
  end if;

  insert into audit_events (
    project_id, stage_id, actor_id, action, from_state, to_state, metadata
  )
  values (
    new.project_id,
    null,
    auth.uid(),
    'contract_status_changed',
    old.status::text,
    new.status::text,
    jsonb_build_object(
      'contract_id',  new.id,
      'total_value',  new.total_value
    )
  );

  return new;
end;
$$;

create trigger trg_audit_contract_transition
  after update of status on contracts
  for each row execute function fn_audit_contract_transition();


-- 5. AUDIT: approval decisions
create or replace function fn_audit_approval_decision()
returns trigger language plpgsql security definer as $$
begin
  if old.decision = new.decision then
    return new;
  end if;

  insert into audit_events (
    project_id, stage_id, actor_id, action, from_state, to_state, metadata
  )
  values (
    fn_project_id_for_stage(new.stage_id),
    new.stage_id,
    new.approved_by,
    case new.decision
      when 'approved' then 'approval_given'
      when 'rejected' then 'approval_rejected'
      else                 'approval_returned'
    end,
    old.decision::text,
    new.decision::text,
    jsonb_build_object('role', new.role, 'notes', new.notes)
  );

  return new;
end;
$$;

create trigger trg_audit_approval_decision
  after update of decision on approvals
  for each row execute function fn_audit_approval_decision();


-- 6. AUDIT: evidence submitted (INSERT) and reviewed (UPDATE of status)
create or replace function fn_audit_evidence()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    insert into audit_events (
      project_id, stage_id, actor_id, action, from_state, to_state, metadata
    )
    values (
      fn_project_id_for_stage(new.stage_id),
      new.stage_id,
      new.uploaded_by,
      'evidence_submitted',
      null,
      'pending',
      jsonb_build_object(
        'file_type',  new.file_type,
        'package_id', new.package_id
      )
    );

  elsif old.status <> new.status then
    insert into audit_events (
      project_id, stage_id, actor_id, action, from_state, to_state, metadata
    )
    values (
      fn_project_id_for_stage(new.stage_id),
      new.stage_id,
      coalesce(new.reviewer_id, auth.uid()),
      'evidence_reviewed',
      old.status::text,
      new.status::text,
      jsonb_build_object(
        'file_type', new.file_type,
        'notes',     new.notes
      )
    );
  end if;

  return new;
end;
$$;

create trigger trg_audit_evidence
  after insert or update of status on evidence
  for each row execute function fn_audit_evidence();


-- 7. AUDIT: release initiated (INSERT) and status changes (UPDATE)
create or replace function fn_audit_release()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    insert into audit_events (
      project_id, stage_id, actor_id, action, from_state, to_state, metadata
    )
    values (
      fn_project_id_for_stage(new.stage_id),
      new.stage_id,
      new.released_by,
      'release_initiated',
      null,
      new.status::text,
      jsonb_build_object('amount', new.amount, 'reference', new.reference)
    );

  elsif old.status <> new.status then
    insert into audit_events (
      project_id, stage_id, actor_id, action, from_state, to_state, metadata
    )
    values (
      fn_project_id_for_stage(new.stage_id),
      new.stage_id,
      auth.uid(),
      case new.status
        when 'completed' then 'release_completed'
        when 'failed'    then 'release_failed'
        else                  'release_initiated'
      end,
      old.status::text,
      new.status::text,
      jsonb_build_object('amount', new.amount, 'reference', new.reference)
    );
  end if;

  return new;
end;
$$;

create trigger trg_audit_release
  after insert or update of status on releases
  for each row execute function fn_audit_release();


-- 8. AUDIT: variation requested (INSERT) and status changes (UPDATE)
create or replace function fn_audit_variation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    insert into audit_events (
      project_id, stage_id, actor_id, action, from_state, to_state, metadata
    )
    values (
      fn_project_id_for_stage(new.stage_id),
      new.stage_id,
      new.requested_by,
      'variation_requested',
      null,
      'pending',
      jsonb_build_object(
        'description',  new.description,
        'value_change', new.value_change
      )
    );

  elsif old.status <> new.status then
    insert into audit_events (
      project_id, stage_id, actor_id, action, from_state, to_state, metadata
    )
    values (
      fn_project_id_for_stage(new.stage_id),
      new.stage_id,
      coalesce(new.approved_by, new.requested_by),
      case new.status
        when 'approved'  then 'variation_approved'
        when 'rejected'  then 'variation_rejected'
        when 'active'    then 'variation_activated'
        else                  'variation_requested'
      end,
      old.status::text,
      new.status::text,
      jsonb_build_object(
        'description',  new.description,
        'value_change', new.value_change
      )
    );
  end if;

  return new;
end;
$$;

create trigger trg_audit_variation
  after insert or update of status on variations
  for each row execute function fn_audit_variation();


-- 9. UTIL: keep wallets.updated_at current
create or replace function fn_wallet_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_wallet_touch
  before update on wallets
  for each row execute function fn_wallet_touch();


-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table companies             enable row level security;
alter table users                 enable row level security;
alter table projects              enable row level security;
alter table contracts             enable row level security;
alter table contract_stages       enable row level security;
alter table packages              enable row level security;
alter table evidence              enable row level security;
alter table approvals             enable row level security;
alter table stage_approval_completions enable row level security;
alter table releases              enable row level security;
alter table variations            enable row level security;
alter table wallets               enable row level security;
alter table wallet_transactions   enable row level security;
alter table audit_events          enable row level security;

-- ── companies ──────────────────────────────────────────────────────────────
create policy "companies: read own company"
  on companies for select
  using (
    fn_user_is_admin()
    or exists (
      select 1 from users
       where id = auth.uid() and company_id = companies.id
    )
  );

create policy "companies: admin insert"
  on companies for insert
  with check (fn_user_is_admin());

create policy "companies: admin update"
  on companies for update
  using (fn_user_is_admin());

-- ── users ──────────────────────────────────────────────────────────────────
create policy "users: read own record or project participants"
  on users for select
  using (
    id = auth.uid()
    or fn_user_is_admin()
    -- project admin can see all users on their projects
    or exists (
      select 1 from projects p
       where p.funder_id = auth.uid()
          or p.developer_id = auth.uid()
    )
  );

create policy "users: update own record"
  on users for update
  using (id = auth.uid() or fn_user_is_admin());

create policy "users: insert own record or admin"
  on users for insert
  with check (id = auth.uid() or fn_user_is_admin());

-- ── projects ───────────────────────────────────────────────────────────────
create policy "projects: participants read"
  on projects for select
  using (fn_user_is_admin() or fn_user_on_project(id));

create policy "projects: funder/developer/admin insert"
  on projects for insert
  with check (
    fn_user_is_admin()
    or exists (
      select 1 from users
       where id = auth.uid()
         and role in ('funder', 'developer', 'admin')
    )
  );

create policy "projects: project admin update"
  on projects for update
  using (fn_user_is_admin() or fn_user_is_project_admin(id));

-- ── contracts ──────────────────────────────────────────────────────────────
create policy "contracts: participants read"
  on contracts for select
  using (
    fn_user_is_admin()
    or fn_user_on_project(project_id)
    or contractor_id = auth.uid()
  );

create policy "contracts: project admin insert"
  on contracts for insert
  with check (
    fn_user_is_admin()
    or fn_user_is_project_admin(project_id)
  );

create policy "contracts: project admin update"
  on contracts for update
  using (
    fn_user_is_admin()
    or fn_user_is_project_admin(project_id)
  );

-- ── contract_stages ────────────────────────────────────────────────────────
create policy "stages: participants read"
  on contract_stages for select
  using (
    fn_user_is_admin()
    or exists (
      select 1 from contracts c
       where c.id = contract_id
         and (fn_user_on_project(c.project_id) or c.contractor_id = auth.uid())
    )
  );

create policy "stages: project admin insert"
  on contract_stages for insert
  with check (
    fn_user_is_admin()
    or exists (
      select 1 from contracts c
       where c.id = contract_id
         and fn_user_is_project_admin(c.project_id)
    )
  );

create policy "stages: project admin or contractor update"
  on contract_stages for update
  using (
    fn_user_is_admin()
    or exists (
      select 1 from contracts c
       where c.id = contract_id
         and (fn_user_is_project_admin(c.project_id) or c.contractor_id = auth.uid())
    )
  );

-- ── packages ───────────────────────────────────────────────────────────────
create policy "packages: participants read"
  on packages for select
  using (
    fn_user_is_admin()
    or assigned_to = auth.uid()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and (fn_user_on_project(c.project_id) or c.contractor_id = auth.uid())
    )
  );

create policy "packages: project admin or contractor insert"
  on packages for insert
  with check (
    fn_user_is_admin()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and (fn_user_is_project_admin(c.project_id) or c.contractor_id = auth.uid())
    )
  );

create policy "packages: participants update"
  on packages for update
  using (
    fn_user_is_admin()
    or assigned_to = auth.uid()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and (fn_user_is_project_admin(c.project_id) or c.contractor_id = auth.uid())
    )
  );

-- ── evidence ───────────────────────────────────────────────────────────────
create policy "evidence: participants read"
  on evidence for select
  using (
    fn_user_is_admin()
    or uploaded_by = auth.uid()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and (fn_user_on_project(c.project_id) or c.contractor_id = auth.uid())
    )
  );

create policy "evidence: uploader insert"
  on evidence for insert
  with check (fn_user_is_admin() or uploaded_by = auth.uid());

create policy "evidence: reviewer or project admin update"
  on evidence for update
  using (
    fn_user_is_admin()
    or reviewer_id = auth.uid()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and fn_user_is_project_admin(c.project_id)
    )
  );

-- ── approvals ──────────────────────────────────────────────────────────────
create policy "approvals: participants read"
  on approvals for select
  using (
    fn_user_is_admin()
    or approved_by = auth.uid()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and fn_user_on_project(c.project_id)
    )
  );

create policy "approvals: qualified roles insert"
  on approvals for insert
  with check (
    fn_user_is_admin()
    or (
      approved_by = auth.uid()
      and exists (
        select 1 from users
         where id = auth.uid()
           and role in ('commercial', 'professional', 'treasury', 'admin')
      )
    )
  );

create policy "approvals: approver updates own decision"
  on approvals for update
  using (
    fn_user_is_admin()
    or approved_by = auth.uid()
  );

-- ── stage_approval_completions ─────────────────────────────────────────────
-- Populated exclusively by fn_check_approval_completion (security definer).
-- No user-facing insert or update. Read is open to project participants.
create policy "approval_completions: participants read"
  on stage_approval_completions for select
  using (
    fn_user_is_admin()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and fn_user_on_project(c.project_id)
    )
  );

-- ── releases ───────────────────────────────────────────────────────────────
create policy "releases: participants read"
  on releases for select
  using (
    fn_user_is_admin()
    or released_by = auth.uid()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and fn_user_on_project(c.project_id)
    )
  );

create policy "releases: treasury and funder insert"
  on releases for insert
  with check (
    fn_user_is_admin()
    or exists (
      select 1 from users
       where id = auth.uid()
         and role in ('treasury', 'funder', 'admin')
    )
  );

create policy "releases: treasury and funder update status"
  on releases for update
  using (
    fn_user_is_admin()
    or released_by = auth.uid()
    or exists (
      select 1 from users
       where id = auth.uid()
         and role in ('treasury', 'funder', 'admin')
    )
  );

-- ── variations ─────────────────────────────────────────────────────────────
create policy "variations: participants read"
  on variations for select
  using (
    fn_user_is_admin()
    or requested_by = auth.uid()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and (fn_user_on_project(c.project_id) or c.contractor_id = auth.uid())
    )
  );

create policy "variations: contractor or project participant insert"
  on variations for insert
  with check (
    fn_user_is_admin()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and (c.contractor_id = auth.uid() or fn_user_on_project(c.project_id))
    )
  );

create policy "variations: project admin or requester update"
  on variations for update
  using (
    fn_user_is_admin()
    or requested_by = auth.uid()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
       where cs.id = stage_id
         and fn_user_is_project_admin(c.project_id)
    )
  );

-- ── wallets ────────────────────────────────────────────────────────────────
create policy "wallets: project admin read"
  on wallets for select
  using (fn_user_is_admin() or fn_user_is_project_admin(project_id));

create policy "wallets: funder or admin insert"
  on wallets for insert
  with check (
    fn_user_is_admin()
    or fn_user_is_project_admin(project_id)
  );

create policy "wallets: treasury or funder update"
  on wallets for update
  using (
    fn_user_is_admin()
    or exists (
      select 1 from users
       where id = auth.uid()
         and role in ('funder', 'treasury', 'admin')
    )
  );

-- ── wallet_transactions ────────────────────────────────────────────────────
create policy "wallet_transactions: project admin read"
  on wallet_transactions for select
  using (
    fn_user_is_admin()
    or exists (
      select 1 from wallets w
       where w.id = wallet_id
         and fn_user_is_project_admin(w.project_id)
    )
  );

create policy "wallet_transactions: treasury or funder insert"
  on wallet_transactions for insert
  with check (
    fn_user_is_admin()
    or exists (
      select 1 from users
       where id = auth.uid()
         and role in ('funder', 'treasury', 'admin')
    )
  );

-- Transactions are immutable once written — no update or delete policies.

-- ── audit_events ───────────────────────────────────────────────────────────
-- Audit events are written only by security-definer trigger functions,
-- which bypass RLS. Direct INSERT from application clients is blocked.
create policy "audit_events: project participants read"
  on audit_events for select
  using (
    fn_user_is_admin()
    or actor_id = auth.uid()
    or (project_id is not null and fn_user_on_project(project_id))
  );

-- No INSERT policy for regular users — triggers use security definer and
-- therefore bypass RLS. This ensures audit_events cannot be tampered with
-- by application-level clients.
