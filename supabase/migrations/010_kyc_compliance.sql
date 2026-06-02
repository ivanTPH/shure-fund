-- ============================================================
-- Migration 010: KYC fields on users + kyc_submissions + compliance_reviews
-- ============================================================

-- 1. KYC columns on users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kyc_status       text NOT NULL DEFAULT 'not_started'
                           CHECK (kyc_status IN ('not_started','pending_review','approved','rejected','expired')),
  ADD COLUMN IF NOT EXISTS kyc_tier         text NOT NULL DEFAULT 'standard'
                           CHECK (kyc_tier IN ('standard','enhanced')),
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_expires_at   timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_notes        text;

-- 2. KYC submissions table (stores each form submission)
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name       text NOT NULL,
  date_of_birth   date NOT NULL,
  nationality     text NOT NULL,
  address_line1   text NOT NULL,
  address_line2   text,
  city            text NOT NULL,
  postcode        text NOT NULL,
  country         text NOT NULL DEFAULT 'GB',
  document_type   text NOT NULL CHECK (document_type IN ('passport','driving_licence','national_id')),
  document_number text NOT NULL,
  document_expiry date NOT NULL,
  -- Storage paths for uploaded document images
  document_front_path  text,
  document_back_path   text,
  proof_of_address_path text,
  -- Source of funds declaration
  source_of_funds text NOT NULL,
  source_of_wealth text,
  -- Internal review fields
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  reviewer_id     uuid REFERENCES users(id),
  reviewer_notes  text,
  reviewed_at     timestamptz
);

-- 3. Compliance reviews table (AML / KYC human-in-the-loop queue)
CREATE TABLE IF NOT EXISTS compliance_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  triggered_by    uuid REFERENCES users(id),
  reviewer_id     uuid REFERENCES users(id),
  rule_id         text NOT NULL,
  rule_label      text NOT NULL,
  risk_level      text NOT NULL CHECK (risk_level IN ('medium','high','critical')),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','escalated')),
  entity_type     text NOT NULL,  -- 'wallet_transaction' | 'token_assignment' | 'kyc' | 'deposit'
  entity_id       uuid NOT NULL,
  context         jsonb,
  reviewer_notes  text
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS kyc_submissions_user_id_idx    ON kyc_submissions (user_id);
CREATE INDEX IF NOT EXISTS kyc_submissions_status_idx     ON kyc_submissions (status);
CREATE INDEX IF NOT EXISTS compliance_reviews_status_idx  ON compliance_reviews (status);
CREATE INDEX IF NOT EXISTS compliance_reviews_triggered_by_idx ON compliance_reviews (triggered_by);

-- 5. RLS
ALTER TABLE kyc_submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reviews ENABLE ROW LEVEL SECURITY;

-- Users can read/insert their own KYC submissions
CREATE POLICY "kyc_submissions_own_read" ON kyc_submissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "kyc_submissions_own_insert" ON kyc_submissions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can read all KYC submissions and update (review) them
CREATE POLICY "kyc_submissions_admin_all" ON kyc_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Compliance reviews: only admins can read/write
CREATE POLICY "compliance_reviews_admin_all" ON compliance_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Service role can insert compliance reviews (from API routes using service client)
-- (Service role bypasses RLS by default, so no additional policy needed)
