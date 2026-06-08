-- Migration 016: add kyc_submitted to audit_action enum
-- Needed for KYC POST route to write an audit event when a user submits KYC.

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'kyc_submitted';
