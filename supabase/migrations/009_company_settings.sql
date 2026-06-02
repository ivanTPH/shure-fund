-- 009_company_settings.sql
-- Extends the companies table with contact/address fields needed by the
-- admin company-settings page.

alter table companies
  add column if not exists email              text,
  add column if not exists phone              text,
  add column if not exists registered_address text;

-- Allow admins to update their own company row
create policy "companies: admin can update own company"
  on companies for update
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role = 'admin'
        and users.company_id = companies.id
    )
  )
  with check (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role = 'admin'
        and users.company_id = companies.id
    )
  );
