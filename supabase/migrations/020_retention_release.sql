-- Migration 020: Retention release mechanism
--
-- 1. Add retention_released_at column to contract_stages
-- 2. Add retention_release to wallet_transaction_type enum
-- 3. Add retention_released to audit_action enum

ALTER TABLE contract_stages
  ADD COLUMN IF NOT EXISTS retention_released_at timestamptz;

ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'retention_release';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'retention_released';
