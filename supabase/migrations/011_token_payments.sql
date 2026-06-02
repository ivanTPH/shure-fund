-- ============================================================
-- Migration 011: token_payments table
-- Records individual payments to each token holder (trust co-beneficiary)
-- when a stage is released. All rows in a batch share the same paid_at
-- timestamp to enforce simultaneous payment as required by the trust structure.
-- ============================================================

CREATE TABLE IF NOT EXISTS token_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  stage_id    uuid NOT NULL REFERENCES contract_stages(id),
  project_id  uuid NOT NULL REFERENCES projects(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  share_pct   numeric(6,4),           -- pro-rata percentage (e.g. 0.5000 = 50%)
  reference   text NOT NULL,
  paid_at     timestamptz NOT NULL    -- same value for all rows in one release batch
);

CREATE INDEX IF NOT EXISTS token_payments_stage_id_idx   ON token_payments (stage_id);
CREATE INDEX IF NOT EXISTS token_payments_user_id_idx    ON token_payments (user_id);
CREATE INDEX IF NOT EXISTS token_payments_project_id_idx ON token_payments (project_id);

ALTER TABLE token_payments ENABLE ROW LEVEL SECURITY;

-- Token holders can see their own payment records
CREATE POLICY "token_payments_own_read" ON token_payments
  FOR SELECT USING (user_id = auth.uid());

-- Admins, developers, and funders on the same project can see all records
CREATE POLICY "token_payments_project_read" ON token_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = token_payments.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('admin', 'developer', 'funder')
    )
  );
