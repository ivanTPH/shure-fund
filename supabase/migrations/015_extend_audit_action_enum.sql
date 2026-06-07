-- Migration 015: Extend audit_action enum for KYC and compliance review events
--
-- The KYC and AML compliance review routes write audit_events rows, but the
-- relevant action values were not in the original enum. ALTER TYPE ... ADD VALUE
-- is safe and non-destructive — existing rows are unaffected.

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'kyc_approved';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'kyc_rejected';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_approved';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_rejected';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_escalated';
