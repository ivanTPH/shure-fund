-- =============================================================================
-- Migration 009: Company settings
--
-- Single-row table (enforced by boolean primary key + check constraint).
-- Stores org-level display details used across reports and notifications.
-- =============================================================================

create table if not exists company_settings (
  singleton   boolean     primary key default true check (singleton),
  name        text        not null default '',
  email       text        not null default '',
  phone       text        not null default '',
  address     text        not null default '',
  updated_at  timestamptz not null default now()
);

-- Seed the single row so GET always returns something
insert into company_settings (singleton) values (true) on conflict do nothing;

-- RLS
alter table company_settings enable row level security;

-- Any authenticated user can read (used for report headers etc.)
create policy "company_settings: authenticated read"
  on company_settings for select
  to authenticated
  using (true);

-- Only admins can update
create policy "company_settings: admin update"
  on company_settings for update
  to authenticated
  using (fn_user_is_admin())
  with check (fn_user_is_admin());
