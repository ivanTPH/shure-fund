-- Migration 021: Tier 2 proof-of-funds declarations
--
-- Funders declare their uncommitted bank proof-of-funds for the next 30 days.
-- Early withdrawal triggers an AML compliance review (TIER2_POF_WITHDRAWAL).

CREATE TYPE pof_status AS ENUM ('active', 'expired', 'withdrawn');

CREATE TABLE proof_of_funds (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  declared_by       uuid        NOT NULL REFERENCES users(id),
  amount            numeric(15,2) NOT NULL CHECK (amount > 0),
  bank_name         text,
  bank_reference    text,
  valid_from        date        NOT NULL,
  valid_until       date        NOT NULL,
  status            pof_status  NOT NULL DEFAULT 'active',
  withdrawn_at      timestamptz,
  withdrawal_reason text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pof_valid_dates CHECK (valid_until > valid_from)
);

CREATE INDEX pof_project_idx ON proof_of_funds (project_id);
CREATE INDEX pof_status_idx  ON proof_of_funds (status);
