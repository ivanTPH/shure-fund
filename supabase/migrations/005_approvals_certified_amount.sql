-- Migration 005: add certified_amount to approvals
-- Commercial approvers may certify an amount that differs from the contracted
-- stage value. This is optional — null means the contracted value stands.
alter table approvals
  add column if not exists certified_amount numeric(15,2);
