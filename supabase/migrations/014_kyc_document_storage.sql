-- Migration 014: KYC document storage bucket
-- =============================================================================
-- Creates a private storage bucket for KYC identity documents.
-- Path convention: kyc-documents/{userId}/{docType}-{timestamp}.{ext}
-- Only service-role can write (via API route); users can read their own files.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760,  -- 10 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Service role inserts (API route uses service key)
create policy "kyc documents: service role insert"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'kyc-documents');

-- Users can only read their own files
create policy "kyc documents: own read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role can read all (admin review)
create policy "kyc documents: service role read"
  on storage.objects for select
  to service_role
  using (bucket_id = 'kyc-documents');

-- Service role can delete (for compliance cleanup)
create policy "kyc documents: service role delete"
  on storage.objects for delete
  to service_role
  using (bucket_id = 'kyc-documents');
