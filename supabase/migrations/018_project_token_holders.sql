-- Migration 018: project_token_holders
-- Registry of trust token holders for each project.
-- Each row defines a beneficiary's share percentage used when distributing
-- stage payments via token_payments.

CREATE TABLE IF NOT EXISTS project_token_holders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_pct  numeric(6,4) NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
  label      text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_token_holders_project_idx ON project_token_holders (project_id);
CREATE INDEX IF NOT EXISTS project_token_holders_user_idx    ON project_token_holders (user_id);

ALTER TABLE project_token_holders ENABLE ROW LEVEL SECURITY;

-- Admin, developer, and funder on the project can read
CREATE POLICY "token_holders_project_read" ON project_token_holders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_token_holders.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('admin', 'developer', 'funder')
    )
  );

-- Only admin / developer can insert or delete (managed via service role in API routes)
