-- =============================================================================
-- Migration 003: Phase 2 — Notifications, Disputes, Variation enum extension,
--                Push tokens, Dispute evidence, User deactivation
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extend variation_status with Phase 2 states
-- ---------------------------------------------------------------------------
alter type variation_status add value if not exists 'draft';
alter type variation_status add value if not exists 'submitted';
alter type variation_status add value if not exists 'pending_funding';

-- ---------------------------------------------------------------------------
-- Notifications table
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references users(id) on delete cascade,
  project_id  uuid        references projects(id) on delete cascade,
  stage_id    uuid        references contract_stages(id) on delete set null,
  type        text        not null,
  message     text        not null,
  action_url  text,
  read        boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user    on notifications(user_id, read, created_at desc);
create index if not exists idx_notifications_project on notifications(project_id);

alter table notifications enable row level security;

create policy "notifications: owner read"
  on notifications for select
  using (user_id = auth.uid() or exists (
    select 1 from users u where u.id = auth.uid() and u.role = 'admin'
  ));

create policy "notifications: service insert"
  on notifications for insert
  to service_role
  with check (true);

create policy "notifications: owner mark read"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Disputes table
-- ---------------------------------------------------------------------------
create type dispute_status as enum (
  'raised',
  'under_review',
  'resolved',
  'escalated'
);

create type dispute_resolution as enum (
  'full_payment',
  'partial_payment',
  'rejected_claim',
  'escalated_externally'
);

create table if not exists disputes (
  id                   uuid             primary key default gen_random_uuid(),
  stage_id             uuid             not null references contract_stages(id) on delete cascade,
  raised_by            uuid             not null references users(id) on delete restrict,
  disputed_value       numeric(15,2)    not null check (disputed_value > 0),
  reason               text             not null,
  evidence_url         text,
  status               dispute_status   not null default 'raised',
  -- Respondent position
  respondent_id        uuid             references users(id) on delete set null,
  respondent_position  text,
  responded_at         timestamptz,
  -- Resolution
  resolution           dispute_resolution,
  resolution_notes     text,
  resolved_value       numeric(15,2),
  resolved_by          uuid             references users(id) on delete set null,
  resolved_at          timestamptz,
  created_at           timestamptz      not null default now()
);

create index if not exists idx_disputes_stage  on disputes(stage_id);
create index if not exists idx_disputes_status on disputes(status);

alter table disputes enable row level security;

create policy "disputes: participants read"
  on disputes for select
  using (
    raised_by = auth.uid()
    or respondent_id = auth.uid()
    or exists (
      select 1 from contract_stages cs
      join contracts c on c.id = cs.contract_id
      where cs.id = stage_id
        and (fn_user_on_project(c.project_id) or fn_user_is_admin())
    )
  );

create policy "disputes: authorised raise"
  on disputes for insert
  with check (raised_by = auth.uid());

create policy "disputes: authorised update"
  on disputes for update
  using (fn_user_is_admin() or raised_by = auth.uid() or respondent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Push tokens — stored on users table
-- ---------------------------------------------------------------------------
alter table users
  add column if not exists push_token text,
  add column if not exists active     boolean not null default true;

-- ---------------------------------------------------------------------------
-- Audit trigger for disputes
-- ---------------------------------------------------------------------------
create or replace function fn_audit_dispute()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select c.project_id into v_project_id
    from contract_stages cs
    join contracts c on c.id = cs.contract_id
    where cs.id = new.stage_id;

  if tg_op = 'INSERT' then
    insert into audit_events (project_id, stage_id, actor_id, action, metadata)
    values (v_project_id, new.stage_id, new.raised_by, 'dispute_opened',
            jsonb_build_object('disputed_value', new.disputed_value, 'reason', new.reason));

  elsif tg_op = 'UPDATE' and old.status <> new.status then
    insert into audit_events (project_id, stage_id, actor_id, action, from_state, to_state, metadata)
    values (v_project_id, new.stage_id, auth.uid(), 'dispute_resolved',
            old.status::text, new.status::text,
            jsonb_build_object('resolution', new.resolution, 'notes', new.resolution_notes));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_dispute on disputes;
create trigger trg_audit_dispute
  after insert or update of status on disputes
  for each row execute function fn_audit_dispute();

-- ---------------------------------------------------------------------------
-- Audit trigger for variations (status changes)
-- ---------------------------------------------------------------------------
create or replace function fn_audit_variation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select c.project_id into v_project_id
    from contract_stages cs
    join contracts c on c.id = cs.contract_id
    where cs.id = new.stage_id;

  if tg_op = 'INSERT' then
    insert into audit_events (project_id, stage_id, actor_id, action, metadata)
    values (v_project_id, new.stage_id, new.requested_by, 'variation_requested',
            jsonb_build_object('value_change', new.value_change, 'description', new.description));

  elsif tg_op = 'UPDATE' and old.status <> new.status then
    declare
      v_action audit_action;
    begin
      v_action := case new.status
        when 'approved'        then 'variation_approved'
        when 'rejected'        then 'variation_rejected'
        when 'active'          then 'variation_activated'
        else 'variation_requested'
      end;
      insert into audit_events (project_id, stage_id, actor_id, action, from_state, to_state, metadata)
      values (v_project_id, new.stage_id, auth.uid(), v_action,
              old.status::text, new.status::text,
              jsonb_build_object('value_change', new.value_change));
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_variation on variations;
create trigger trg_audit_variation
  after insert or update of status on variations
  for each row execute function fn_audit_variation();
