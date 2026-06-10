-- Migration 022: project completion fields + drawdown_requests table

-- ── Project completion ──────────────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by  uuid REFERENCES users(id) ON DELETE SET NULL;

-- Add project_completed audit action
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'project_completed';

-- ── Drawdown requests ───────────────────────────────────────────────────────

CREATE TYPE drawdown_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');

CREATE TABLE IF NOT EXISTS drawdown_requests (
  id           uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by uuid            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount       numeric(15,2)   NOT NULL CHECK (amount > 0),
  description  text,
  status       drawdown_status NOT NULL DEFAULT 'pending',
  reviewed_by  uuid            REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  review_notes text,
  created_at   timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drawdown_requests_project_idx ON drawdown_requests(project_id);
CREATE INDEX IF NOT EXISTS drawdown_requests_status_idx  ON drawdown_requests(status);

ALTER TABLE drawdown_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drawdown_project_members_read" ON drawdown_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = drawdown_requests.project_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = drawdown_requests.project_id
        AND (p.funder_id = auth.uid() OR p.developer_id = auth.uid())
    )
  );
