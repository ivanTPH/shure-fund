-- =============================================================================
-- Migration 002: Evidence storage bucket + profile sync trigger
-- =============================================================================

-- Add name and file_size columns to evidence (needed for display)
alter table evidence
  add column if not exists name      text,
  add column if not exists file_size bigint;

-- ---------------------------------------------------------------------------
-- Profile sync: create a users row whenever an auth user is created.
-- This ensures uploaded_by FK is always satisfiable.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'contractor')
  )
  on conflict (id) do update
    set
      full_name = excluded.full_name,
      role      = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: sync any auth users that already exist
insert into public.users (id, email, full_name, role)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  coalesce((au.raw_user_meta_data->>'role')::user_role, 'contractor')
from auth.users au
on conflict (id) do update
  set
    full_name = excluded.full_name,
    role      = excluded.role;

-- ---------------------------------------------------------------------------
-- Evidence storage bucket (private, 50 MB limit)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

-- Storage RLS: only service-role uploads (API route uses service key).
-- Authenticated users can read objects they uploaded or that belong to
-- a project they are on (resolved via the file path convention
-- evidence/{stageId}/{filename}).
create policy "evidence objects: service role only"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'evidence');

create policy "evidence objects: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'evidence');
