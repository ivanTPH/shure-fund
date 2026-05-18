-- =============================================================================
-- Migration 007: Seed Audit Events
--
-- The audit_events table is populated by DB triggers that fire on UPDATE.
-- Because seed.sql uses direct INSERT statements, no triggers fired and the
-- audit trail is empty.
--
-- This migration inserts synthetic audit events that faithfully reconstruct
-- the history implied by the seed data's current state, giving the audit log
-- meaningful content to demonstrate immediately after db reset.
--
-- Actor key (from seed.sql):
--   201 = Maya Singh      (commercial)
--   202 = Owen Blake      (professional)
--   203 = Leah Mercer     (treasury / funder rep)
--   204 = Helen Grant     (developer / commercial)
--   205 = Harbour Capital (funder)
--   206 = Hawthorne Build (contractor)
--
-- Project / contract / stage IDs:
--   301 = Aurora Civic Centre      (contract 401, stages 501–503)
--   302 = Meridian Life Sciences   (contract 402, stages 504–505)
--   303 = Harbour Exchange Retrofit(contract 403, stages 506–507)
-- =============================================================================

-- Use explicit UUIDs in the b-range so they never clash with other seeds.
-- We skip inserting events that are not supported by the current enum to stay safe.

insert into audit_events
  (id, project_id, stage_id, actor_id, action, from_state, to_state, metadata, created_at)
values

  -- =========================================================================
  -- AURORA CIVIC CENTRE  (project 301)
  -- =========================================================================

  -- Wallet funded (funder deposited £600,000)
  ('00000000-0000-0000-0000-00000000b001',
   '00000000-0000-0000-0000-000000000301', null,
   '00000000-0000-0000-0000-000000000205',
   'wallet_funded', null, null,
   '{"amount": 600000, "reference": "Initial deposit"}',
   '2026-04-01T09:05:00Z'),

  -- Foundation (501): contractor started work → in_progress
  ('00000000-0000-0000-0000-00000000b002',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000206',
   'stage_status_changed', 'draft', 'in_progress',
   '{"stage_name": "Foundation Package"}',
   '2026-04-01T10:00:00Z'),

  -- Foundation (501): evidence submitted × 2
  ('00000000-0000-0000-0000-00000000b003',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "Foundation inspection photos", "file_type": "file"}',
   '2026-04-02T08:20:00Z'),

  ('00000000-0000-0000-0000-00000000b004',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "Concrete pour checklist", "file_type": "form"}',
   '2026-04-02T09:00:00Z'),

  -- Foundation (501): contractor submitted for approval
  ('00000000-0000-0000-0000-00000000b005',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000206',
   'stage_status_changed', 'in_progress', 'awaiting_approval',
   '{"stage_name": "Foundation Package"}',
   '2026-04-02T09:30:00Z'),

  -- Wallet allocated for Foundation
  ('00000000-0000-0000-0000-00000000b006',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000203',
   'wallet_allocated', null, null,
   '{"amount": 160000, "reference": "Allocate foundation stage"}',
   '2026-04-02T11:00:00Z'),

  -- Foundation (501): commercial approved
  ('00000000-0000-0000-0000-00000000b007',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000201',
   'approval_given', 'awaiting_approval', 'awaiting_approval',
   '{"role": "commercial", "certified_amount": 160000}',
   '2026-04-02T10:00:00Z'),

  -- Foundation (501): professional approved
  ('00000000-0000-0000-0000-00000000b008',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000202',
   'approval_given', 'awaiting_approval', 'awaiting_approval',
   '{"role": "professional", "certified_amount": 160000}',
   '2026-04-02T10:30:00Z'),

  -- Foundation (501): treasury approved → all complete
  ('00000000-0000-0000-0000-00000000b009',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000203',
   'approval_given', 'awaiting_approval', 'awaiting_approval',
   '{"role": "treasury", "certified_amount": 160000}',
   '2026-04-02T11:00:00Z'),

  ('00000000-0000-0000-0000-00000000b010',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000203',
   'all_approvals_complete', 'awaiting_approval', 'available_to_release',
   '{"approval_count": 3, "completing_role": "treasury"}',
   '2026-04-02T11:00:01Z'),

  -- Structural Frame (502): started
  ('00000000-0000-0000-0000-00000000b011',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000502',
   '00000000-0000-0000-0000-000000000206',
   'stage_status_changed', 'draft', 'in_progress',
   '{"stage_name": "Structural Frame"}',
   '2026-04-03T08:00:00Z'),

  -- Frame (502): wallet allocated
  ('00000000-0000-0000-0000-00000000b012',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000502',
   '00000000-0000-0000-0000-000000000203',
   'wallet_allocated', null, null,
   '{"amount": 40000, "reference": "Allocate frame stage"}',
   '2026-04-03T14:20:00Z'),

  -- Frame (502): evidence submitted
  ('00000000-0000-0000-0000-00000000b013',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000502',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "Steel delivery pack", "file_type": "file"}',
   '2026-04-03T10:15:00Z'),

  ('00000000-0000-0000-0000-00000000b014',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000502',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "Frame erection checklist", "file_type": "form"}',
   '2026-04-03T10:45:00Z'),

  -- Frame (502): submitted for approval
  ('00000000-0000-0000-0000-00000000b015',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000502',
   '00000000-0000-0000-0000-000000000206',
   'stage_status_changed', 'in_progress', 'awaiting_approval',
   '{"stage_name": "Structural Frame"}',
   '2026-04-03T11:00:00Z'),

  -- Frame (502): commercial raised a dispute (steel quantity shortfall)
  ('00000000-0000-0000-0000-00000000b016',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000502',
   '00000000-0000-0000-0000-000000000201',
   'dispute_opened', 'awaiting_approval', 'disputed',
   '{"reason": "Steel tonnage short — delivery pack does not reconcile with structural drawings. Payment held pending resolution.", "disputed_value": 240000}',
   '2026-04-03T14:00:00Z'),

  -- Frame (502): stage moved to disputed
  ('00000000-0000-0000-0000-00000000b017',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000502',
   '00000000-0000-0000-0000-000000000201',
   'stage_status_changed', 'awaiting_approval', 'disputed',
   '{"stage_name": "Structural Frame"}',
   '2026-04-03T14:00:01Z'),

  -- Envelope (503): variation requested
  ('00000000-0000-0000-0000-00000000b018',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000503',
   '00000000-0000-0000-0000-000000000206',
   'variation_requested', null, null,
   '{"description": "Weatherproofing detail variation — Additional sealing detail required for revised facade interface.", "value_change": 15000}',
   '2026-04-04T12:00:00Z'),

  -- =========================================================================
  -- MERIDIAN LIFE SCIENCES HUB  (project 302)
  -- =========================================================================

  -- Wallet funded
  ('00000000-0000-0000-0000-00000000b019',
   '00000000-0000-0000-0000-000000000302', null,
   '00000000-0000-0000-0000-000000000205',
   'wallet_funded', null, null,
   '{"amount": 250000, "reference": "Sponsor deposit"}',
   '2026-04-02T08:05:00Z'),

  -- Shell and Core (504): started
  ('00000000-0000-0000-0000-00000000b020',
   '00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000504',
   '00000000-0000-0000-0000-000000000206',
   'stage_status_changed', 'draft', 'in_progress',
   '{"stage_name": "Shell And Core"}',
   '2026-04-03T07:30:00Z'),

  -- Shell and Core (504): wallet allocated
  ('00000000-0000-0000-0000-00000000b021',
   '00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000504',
   '00000000-0000-0000-0000-000000000203',
   'wallet_allocated', null, null,
   '{"amount": 120000, "reference": "Allocate shell and core"}',
   '2026-04-03T09:45:00Z'),

  -- Shell (504): evidence submitted
  ('00000000-0000-0000-0000-00000000b022',
   '00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000504',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "Shell inspection pack", "file_type": "file"}',
   '2026-04-03T08:10:00Z'),

  ('00000000-0000-0000-0000-00000000b023',
   '00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000504',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "Shell quality checklist", "file_type": "form"}',
   '2026-04-03T08:35:00Z'),

  -- Shell (504): submitted for approval
  ('00000000-0000-0000-0000-00000000b024',
   '00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000504',
   '00000000-0000-0000-0000-000000000206',
   'stage_status_changed', 'in_progress', 'awaiting_approval',
   '{"stage_name": "Shell And Core"}',
   '2026-04-03T09:00:00Z'),

  -- Shell (504): commercial approved
  ('00000000-0000-0000-0000-00000000b025',
   '00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000504',
   '00000000-0000-0000-0000-000000000201',
   'approval_given', 'awaiting_approval', 'awaiting_approval',
   '{"role": "commercial", "certified_amount": 180000}',
   '2026-04-03T09:20:00Z'),

  -- MEP First Fix (505): wallet allocated
  ('00000000-0000-0000-0000-00000000b026',
   '00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000505',
   '00000000-0000-0000-0000-000000000203',
   'wallet_allocated', null, null,
   '{"amount": 20000, "reference": "Allocate MEP first fix"}',
   '2026-04-04T13:00:00Z'),

  -- MEP (505): evidence submitted
  ('00000000-0000-0000-0000-00000000b027',
   '00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000505',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "MEP test pack", "file_type": "file"}',
   '2026-04-04T14:00:00Z'),

  ('00000000-0000-0000-0000-00000000b028',
   '00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000505',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "MEP quality checklist", "file_type": "form"}',
   '2026-04-04T14:20:00Z'),

  -- =========================================================================
  -- HARBOUR EXCHANGE RETROFIT  (project 303)
  -- =========================================================================

  -- Wallet funded
  ('00000000-0000-0000-0000-00000000b029',
   '00000000-0000-0000-0000-000000000303', null,
   '00000000-0000-0000-0000-000000000205',
   'wallet_funded', null, null,
   '{"amount": 190000, "reference": "Bridge facility drawdown"}',
   '2026-04-04T07:35:00Z'),

  -- Demolition (506): started
  ('00000000-0000-0000-0000-00000000b030',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000206',
   'stage_status_changed', 'draft', 'in_progress',
   '{"stage_name": "Strip-Out And Demolition"}',
   '2026-04-05T07:00:00Z'),

  -- Demolition (506): wallet allocated
  ('00000000-0000-0000-0000-00000000b031',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000203',
   'wallet_allocated', null, null,
   '{"amount": 80000, "reference": "Allocate demolition package"}',
   '2026-04-05T08:00:00Z'),

  -- Demolition (506): evidence submitted
  ('00000000-0000-0000-0000-00000000b032',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "Demolition completion pack", "file_type": "file"}',
   '2026-04-05T07:30:00Z'),

  ('00000000-0000-0000-0000-00000000b033',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "Waste segregation checklist", "file_type": "form"}',
   '2026-04-05T07:45:00Z'),

  -- Demolition (506): submitted for approval
  ('00000000-0000-0000-0000-00000000b034',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000206',
   'stage_status_changed', 'in_progress', 'awaiting_approval',
   '{"stage_name": "Strip-Out And Demolition"}',
   '2026-04-05T08:00:00Z'),

  -- Demolition (506): commercial approved
  ('00000000-0000-0000-0000-00000000b035',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000201',
   'approval_given', 'awaiting_approval', 'awaiting_approval',
   '{"role": "commercial", "certified_amount": 110000}',
   '2026-04-05T08:05:00Z'),

  -- Demolition (506): professional approved
  ('00000000-0000-0000-0000-00000000b036',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000202',
   'approval_given', 'awaiting_approval', 'awaiting_approval',
   '{"role": "professional", "certified_amount": 110000}',
   '2026-04-05T08:10:00Z'),

  -- Demolition (506): treasury approved → all approvals complete
  ('00000000-0000-0000-0000-00000000b037',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000203',
   'approval_given', 'awaiting_approval', 'awaiting_approval',
   '{"role": "treasury", "certified_amount": 110000}',
   '2026-04-05T08:15:00Z'),

  ('00000000-0000-0000-0000-00000000b038',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000203',
   'all_approvals_complete', 'awaiting_approval', 'available_to_release',
   '{"approval_count": 3, "completing_role": "treasury"}',
   '2026-04-05T08:15:01Z'),

  -- Demolition (506): funder raised dispute post-approval (waste disposal certification missing)
  ('00000000-0000-0000-0000-00000000b039',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000205',
   'dispute_opened', 'available_to_release', 'disputed',
   '{"reason": "Waste disposal certificates for hazardous materials not provided. Release blocked pending EA compliance sign-off.", "disputed_value": 110000}',
   '2026-04-05T09:00:00Z'),

  -- Demolition (506): stage moved to disputed
  ('00000000-0000-0000-0000-00000000b040',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000205',
   'stage_status_changed', 'available_to_release', 'disputed',
   '{"stage_name": "Strip-Out And Demolition"}',
   '2026-04-05T09:00:01Z'),

  -- Facade Stabilisation (507): wallet allocated
  ('00000000-0000-0000-0000-00000000b041',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000507',
   '00000000-0000-0000-0000-000000000203',
   'wallet_allocated', null, null,
   '{"amount": 50000, "reference": "Allocate facade stabilisation"}',
   '2026-04-05T10:50:00Z'),

  -- Facade (507): commercial approved
  ('00000000-0000-0000-0000-00000000b042',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000507',
   '00000000-0000-0000-0000-000000000201',
   'approval_given', 'awaiting_approval', 'awaiting_approval',
   '{"role": "commercial", "certified_amount": 150000}',
   '2026-04-05T10:30:00Z'),

  -- Facade (507): variation requested
  ('00000000-0000-0000-0000-00000000b043',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000507',
   '00000000-0000-0000-0000-000000000206',
   'variation_requested', null, null,
   '{"description": "Temporary works revision — Additional facade restraint detail required before progression.", "value_change": 22000}',
   '2026-04-05T11:20:00Z'),

  -- Facade (507): evidence submitted
  ('00000000-0000-0000-0000-00000000b044',
   '00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000507',
   '00000000-0000-0000-0000-000000000206',
   'evidence_submitted', null, null,
   '{"file_name": "Facade stabilisation pack", "file_type": "file"}',
   '2026-04-05T12:15:00Z')

on conflict (id) do nothing;
