-- =============================================================================
-- Shure.Fund — Seed Data
-- Recreates all data from initialSystemState (demoData.ts) in the DB schema.
--
-- Fixed UUIDs used so IDs are stable and can be referenced in tests.
-- ID ranges:
--   Companies:  00000000-0000-0000-0000-0000000001xx
--   Users:      00000000-0000-0000-0000-0000000002xx
--   Projects:   00000000-0000-0000-0000-0000000003xx
--   Contracts:  00000000-0000-0000-0000-0000000004xx
--   Stages:     00000000-0000-0000-0000-0000000005xx
--   Evidence:   00000000-0000-0000-0000-0000000006xx
--   Approvals:  00000000-0000-0000-0000-0000000007xx
--   Variations: 00000000-0000-0000-0000-0000000008xx
--   Wallets:    00000000-0000-0000-0000-0000000009xx
--   Wallet tx:  00000000-0000-0000-0000-000000000axx
-- =============================================================================

-- ---------------------------------------------------------------------------
-- COMPANIES
-- ---------------------------------------------------------------------------
insert into companies (id, name, type, verified) values
  ('00000000-0000-0000-0000-000000000101', 'Shure Capital Partners', 'funder',     true),
  ('00000000-0000-0000-0000-000000000102', 'Aurora Development Ltd',  'developer',  true),
  ('00000000-0000-0000-0000-000000000103', 'Hawthorne Build',         'contractor', true),
  ('00000000-0000-0000-0000-000000000104', 'Groundline Civils',       'subcontractor', true),
  ('00000000-0000-0000-0000-000000000105', 'North Steel Systems',     'subcontractor', true),
  ('00000000-0000-0000-0000-000000000106', 'Pinnacle Facades',        'subcontractor', true),
  ('00000000-0000-0000-0000-000000000107', 'Axis Construction',       'contractor', true),
  ('00000000-0000-0000-0000-000000000108', 'Cityform Structures',     'subcontractor', true),
  ('00000000-0000-0000-0000-000000000109', 'Northpoint MEP',          'subcontractor', true),
  ('00000000-0000-0000-0000-000000000110', 'East Quay Projects',      'contractor', true),
  ('00000000-0000-0000-0000-000000000111', 'Urban Stripout',          'subcontractor', true),
  ('00000000-0000-0000-0000-000000000112', 'Harbour Capital',         'funder',     true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- USERS
-- All users share placeholder emails for seeding purposes.
-- ---------------------------------------------------------------------------
insert into users (id, email, full_name, role, company_id) values
  ('00000000-0000-0000-0000-000000000201', 'maya.singh@shure.fund',      'Maya Singh',      'commercial',    '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000202', 'owen.blake@shure.fund',       'Owen Blake',      'professional',  '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000203', 'leah.mercer@shure.fund',      'Leah Mercer',     'treasury',      '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000204', 'helen.grant@shure.fund',      'Helen Grant',     'commercial',    '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000205', 'admin@harbourcapital.co.uk',  'Harbour Capital', 'funder',        '00000000-0000-0000-0000-000000000112'),
  ('00000000-0000-0000-0000-000000000206', 'contracts@hawthornebuild.co.uk', 'Hawthorne Build', 'contractor', '00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-000000000207', 'admin@pinnaclefacades.co.uk', 'Pinnacle Facades', 'subcontractor','00000000-0000-0000-0000-000000000106')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- PROJECTS
-- 'address' maps to 'location' in the app model.
-- ---------------------------------------------------------------------------
insert into projects (id, name, address, funder_id, developer_id, status) values
  ('00000000-0000-0000-0000-000000000301', 'Aurora Civic Centre',         'Leeds',     '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000204', 'active'),
  ('00000000-0000-0000-0000-000000000302', 'Meridian Life Sciences Hub',  'Cambridge', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000204', 'active'),
  ('00000000-0000-0000-0000-000000000303', 'Harbour Exchange Retrofit',   'Liverpool', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000204', 'active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- CONTRACTS
-- One main contract per project.
-- ---------------------------------------------------------------------------
insert into contracts (id, project_id, contractor_id, total_value, status) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000206', 520000.00, 'active'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000206', 270000.00, 'active'),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000206', 260000.00, 'active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- CONTRACT STAGES
-- DB status mapping (app status → DB status):
--   approved  → available_to_release
--   blocked   → draft
--   in_review → in_progress
--   disputed  → disputed
-- ---------------------------------------------------------------------------
insert into contract_stages (id, contract_id, name, description, value, status, start_date, end_date) values
  -- Aurora stages
  ('00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000401',
   'Foundation Package',
   'Substructure works covering excavation, reinforcement, pours, and foundation inspection close-out.',
   160000.00, 'available_to_release', '2026-04-01', '2026-04-14'),

  ('00000000-0000-0000-0000-000000000502',
   '00000000-0000-0000-0000-000000000401',
   'Structural Frame',
   'Primary steel frame fabrication, erection, and connection verification for the civic centre superstructure.',
   240000.00, 'disputed', '2026-04-15', '2026-05-09'),

  ('00000000-0000-0000-0000-000000000503',
   '00000000-0000-0000-0000-000000000401',
   'Envelope Works',
   'Facade and weatherproofing works including mock-up approval, sealing details, and envelope completion checks.',
   120000.00, 'draft', '2026-05-10', '2026-06-04'),

  -- Meridian stages
  ('00000000-0000-0000-0000-000000000504',
   '00000000-0000-0000-0000-000000000402',
   'Shell And Core',
   'Shell and core delivery covering frame close-out, structure interfaces, and inspection pack approval.',
   180000.00, 'awaiting_approval', '2026-04-03', '2026-04-28'),

  ('00000000-0000-0000-0000-000000000505',
   '00000000-0000-0000-0000-000000000402',
   'MEP First Fix',
   'First-fix mechanical, electrical, and public health installations with associated test and quality records.',
   90000.00, 'draft', '2026-04-29', '2026-05-22'),

  -- Harbour stages
  ('00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000403',
   'Strip-Out And Demolition',
   'Demolition and strip-out works including waste segregation, temporary protection, and certified quantity review.',
   110000.00, 'disputed', '2026-04-05', '2026-04-19'),

  ('00000000-0000-0000-0000-000000000507',
   '00000000-0000-0000-0000-000000000403',
   'Facade Stabilisation',
   'Facade restraint and temporary works package covering stabilisation design coordination and site installation.',
   150000.00, 'draft', '2026-04-20', '2026-05-16')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- EVIDENCE
-- 'notes' column carries the display name used by the app's EvidenceRecord.
-- 'file_type' is used to distinguish file vs form evidence.
-- ---------------------------------------------------------------------------
insert into evidence (id, stage_id, file_url, file_type, uploaded_by, uploaded_at, status, notes) values
  -- Foundation (stage-foundation → 501)
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000501',
   '/uploads/foundation-inspection-photos.zip', 'file',
   '00000000-0000-0000-0000-000000000206', '2026-04-02T08:20:00.000Z', 'accepted',
   'Foundation inspection photos'),

  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000501',
   '/uploads/foundation-pour-checklist.json', 'form',
   '00000000-0000-0000-0000-000000000206', '2026-04-02T09:00:00.000Z', 'accepted',
   'Concrete pour checklist'),

  -- Frame (stage-frame → 502)
  ('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000502',
   '/uploads/steel-delivery-pack.pdf', 'file',
   '00000000-0000-0000-0000-000000000206', '2026-04-03T10:15:00.000Z', 'requires_more',
   'Steel delivery pack'),

  ('00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000502',
   '/uploads/frame-erection-checklist.json', 'form',
   '00000000-0000-0000-0000-000000000206', '2026-04-03T10:45:00.000Z', 'pending',
   'Frame erection checklist'),

  -- Envelope (stage-envelope → 503)
  ('00000000-0000-0000-0000-000000000605', '00000000-0000-0000-0000-000000000503',
   '/uploads/facade-mockup-approval.pdf', 'file',
   '00000000-0000-0000-0000-000000000206', '2026-04-03T13:00:00.000Z', 'pending',
   'Facade mock-up approval'),

  -- Meridian shell (504)
  ('00000000-0000-0000-0000-000000000606', '00000000-0000-0000-0000-000000000504',
   '/uploads/shell-inspection-pack.pdf', 'file',
   '00000000-0000-0000-0000-000000000206', '2026-04-03T08:10:00.000Z', 'accepted',
   'Shell inspection pack'),

  ('00000000-0000-0000-0000-000000000607', '00000000-0000-0000-0000-000000000504',
   '/uploads/shell-quality-checklist.json', 'form',
   '00000000-0000-0000-0000-000000000206', '2026-04-03T08:35:00.000Z', 'accepted',
   'Shell quality checklist'),

  -- Meridian MEP (505)
  ('00000000-0000-0000-0000-000000000608', '00000000-0000-0000-0000-000000000505',
   '/uploads/mep-test-pack.pdf', 'file',
   '00000000-0000-0000-0000-000000000206', '2026-04-04T14:00:00.000Z', 'accepted',
   'MEP test pack'),

  ('00000000-0000-0000-0000-000000000609', '00000000-0000-0000-0000-000000000505',
   '/uploads/mep-quality-checklist.json', 'form',
   '00000000-0000-0000-0000-000000000206', '2026-04-04T14:20:00.000Z', 'accepted',
   'MEP quality checklist'),

  -- Harbour demolition (506)
  ('00000000-0000-0000-0000-000000000610', '00000000-0000-0000-0000-000000000506',
   '/uploads/demolition-completion-pack.pdf', 'file',
   '00000000-0000-0000-0000-000000000206', '2026-04-05T07:30:00.000Z', 'accepted',
   'Demolition completion pack'),

  ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000506',
   '/uploads/waste-segregation-checklist.json', 'form',
   '00000000-0000-0000-0000-000000000206', '2026-04-05T07:45:00.000Z', 'accepted',
   'Waste segregation checklist'),

  -- Harbour facade (507)
  ('00000000-0000-0000-0000-000000000612', '00000000-0000-0000-0000-000000000507',
   '/uploads/facade-stabilisation-pack.pdf', 'file',
   '00000000-0000-0000-0000-000000000206', '2026-04-05T12:15:00.000Z', 'pending',
   'Facade stabilisation pack')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- APPROVALS
-- approved_by stores the designated approver (NOT NULL in schema).
-- For pending approvals, this is the expected approver.
-- decision = 'pending' means not yet decided.
-- ---------------------------------------------------------------------------
insert into approvals (id, stage_id, approved_by, role, decision, created_at) values
  -- Foundation (all approved)
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000201', 'commercial',   'approved', '2026-04-02T10:00:00.000Z'),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000202', 'professional', 'approved', '2026-04-02T10:30:00.000Z'),
  ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000203', 'treasury',     'approved', '2026-04-02T11:00:00.000Z'),

  -- Frame (all pending — blocked by dispute)
  ('00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000201', 'commercial',   'pending', '2026-04-03T00:00:00.000Z'),
  ('00000000-0000-0000-0000-000000000705', '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000202', 'professional', 'pending', '2026-04-03T00:00:00.000Z'),
  ('00000000-0000-0000-0000-000000000706', '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000203', 'treasury',     'pending', '2026-04-03T00:00:00.000Z'),

  -- Envelope (all pending — on hold)
  ('00000000-0000-0000-0000-000000000707', '00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000201', 'commercial',   'pending', '2026-04-03T00:00:00.000Z'),
  ('00000000-0000-0000-0000-000000000708', '00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000202', 'professional', 'pending', '2026-04-03T00:00:00.000Z'),

  -- Meridian shell (commercial approved, others pending)
  ('00000000-0000-0000-0000-000000000709', '00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000201', 'commercial',   'approved', '2026-04-03T09:20:00.000Z'),
  ('00000000-0000-0000-0000-000000000710', '00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000202', 'professional', 'pending',  '2026-04-03T00:00:00.000Z'),
  ('00000000-0000-0000-0000-000000000711', '00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000203', 'treasury',     'pending',  '2026-04-03T00:00:00.000Z'),

  -- Meridian MEP (all pending)
  ('00000000-0000-0000-0000-000000000712', '00000000-0000-0000-0000-000000000505', '00000000-0000-0000-0000-000000000201', 'commercial',   'pending', '2026-04-04T00:00:00.000Z'),
  ('00000000-0000-0000-0000-000000000713', '00000000-0000-0000-0000-000000000505', '00000000-0000-0000-0000-000000000202', 'professional', 'pending', '2026-04-04T00:00:00.000Z'),

  -- Harbour demolition (all approved — but stage is disputed)
  ('00000000-0000-0000-0000-000000000714', '00000000-0000-0000-0000-000000000506', '00000000-0000-0000-0000-000000000201', 'commercial',   'approved', '2026-04-05T08:05:00.000Z'),
  ('00000000-0000-0000-0000-000000000715', '00000000-0000-0000-0000-000000000506', '00000000-0000-0000-0000-000000000202', 'professional', 'approved', '2026-04-05T08:10:00.000Z'),
  ('00000000-0000-0000-0000-000000000716', '00000000-0000-0000-0000-000000000506', '00000000-0000-0000-0000-000000000203', 'treasury',     'approved', '2026-04-05T08:15:00.000Z'),

  -- Harbour facade (commercial approved, others pending)
  ('00000000-0000-0000-0000-000000000717', '00000000-0000-0000-0000-000000000507', '00000000-0000-0000-0000-000000000201', 'commercial',   'approved', '2026-04-05T10:30:00.000Z'),
  ('00000000-0000-0000-0000-000000000718', '00000000-0000-0000-0000-000000000507', '00000000-0000-0000-0000-000000000202', 'professional', 'pending',  '2026-04-05T00:00:00.000Z'),
  ('00000000-0000-0000-0000-000000000719', '00000000-0000-0000-0000-000000000507', '00000000-0000-0000-0000-000000000203', 'treasury',     'pending',  '2026-04-05T00:00:00.000Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- STAGE APPROVAL COMPLETIONS
-- Foundation stage has all approvals approved, so it gets a completion record.
-- This is what allows a release to be created for the foundation stage.
-- (Normally written by fn_check_approval_completion trigger — seeded manually.)
-- ---------------------------------------------------------------------------
insert into stage_approval_completions (stage_id, completed_at, completed_by) values
  ('00000000-0000-0000-0000-000000000501', '2026-04-02T11:00:00.000Z', '00000000-0000-0000-0000-000000000203')
on conflict (stage_id) do nothing;

-- ---------------------------------------------------------------------------
-- VARIATIONS
-- description maps to title/reason in the app model.
-- value_change maps to amountDelta.
-- ---------------------------------------------------------------------------
insert into variations (id, stage_id, description, value_change, requested_by, status, created_at) values
  -- Envelope variation (on hold pending review)
  ('00000000-0000-0000-0000-000000000801',
   '00000000-0000-0000-0000-000000000503',
   'Weatherproofing detail variation — Additional sealing detail required for revised facade interface.',
   15000.00,
   '00000000-0000-0000-0000-000000000206',
   'pending',
   '2026-04-04T12:00:00.000Z'),

  -- Harbour facade variation
  ('00000000-0000-0000-0000-000000000802',
   '00000000-0000-0000-0000-000000000507',
   'Temporary works revision — Additional facade restraint detail required before progression.',
   22000.00,
   '00000000-0000-0000-0000-000000000206',
   'pending',
   '2026-04-05T11:20:00.000Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- WALLETS
-- One wallet per project. balance / available_amount from initialSystemState.
-- Aurora project wallet: 600k deposited, 200k allocated → 240k project balance
-- (from demoData: account-project-aurora balance = 240000, stage accounts = 160000+40000+0)
-- ---------------------------------------------------------------------------
insert into wallets (id, project_id, balance, ringfenced_amount, available_amount) values
  -- Aurora: total deposited 600k, allocated 200k to stages, project balance 240k
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000301', 600000.00, 200000.00, 240000.00),
  -- Meridian: deposited 250k, allocated 140k, project balance 110k
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000302', 250000.00, 140000.00, 110000.00),
  -- Harbour: deposited 190k, allocated 130k, project balance 60k
  ('00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000303', 190000.00, 130000.00,  60000.00)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- WALLET TRANSACTIONS
-- Mirrors the ledgerEntries from demoData.ts.
-- ---------------------------------------------------------------------------
insert into wallet_transactions (id, wallet_id, amount, type, reference, created_by, created_at) values
  -- Aurora
  ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-000000000901',  600000.00, 'deposit',       'Initial deposit',            '00000000-0000-0000-0000-000000000205', '2026-04-01T09:00:00.000Z'),
  ('00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-000000000901', -160000.00, 'allocation_out', 'Allocate foundation stage',  '00000000-0000-0000-0000-000000000203', '2026-04-02T11:00:00.000Z'),
  ('00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-000000000901',  160000.00, 'allocation_in',  'Allocate foundation stage',  '00000000-0000-0000-0000-000000000203', '2026-04-02T11:00:00.000Z'),
  ('00000000-0000-0000-0000-00000000a004', '00000000-0000-0000-0000-000000000901',  -40000.00, 'allocation_out', 'Allocate frame stage',       '00000000-0000-0000-0000-000000000203', '2026-04-03T14:20:00.000Z'),
  ('00000000-0000-0000-0000-00000000a005', '00000000-0000-0000-0000-000000000901',   40000.00, 'allocation_in',  'Allocate frame stage',       '00000000-0000-0000-0000-000000000203', '2026-04-03T14:20:00.000Z'),
  -- Meridian
  ('00000000-0000-0000-0000-00000000a006', '00000000-0000-0000-0000-000000000902',  250000.00, 'deposit',        'Sponsor deposit',            '00000000-0000-0000-0000-000000000205', '2026-04-02T08:00:00.000Z'),
  ('00000000-0000-0000-0000-00000000a007', '00000000-0000-0000-0000-000000000902', -120000.00, 'allocation_out', 'Allocate shell and core',    '00000000-0000-0000-0000-000000000203', '2026-04-03T09:45:00.000Z'),
  ('00000000-0000-0000-0000-00000000a008', '00000000-0000-0000-0000-000000000902',  120000.00, 'allocation_in',  'Allocate shell and core',    '00000000-0000-0000-0000-000000000203', '2026-04-03T09:45:00.000Z'),
  ('00000000-0000-0000-0000-00000000a009', '00000000-0000-0000-0000-000000000902',  -20000.00, 'allocation_out', 'Allocate MEP first fix',     '00000000-0000-0000-0000-000000000203', '2026-04-04T13:00:00.000Z'),
  ('00000000-0000-0000-0000-00000000a010', '00000000-0000-0000-0000-000000000902',   20000.00, 'allocation_in',  'Allocate MEP first fix',     '00000000-0000-0000-0000-000000000203', '2026-04-04T13:00:00.000Z'),
  -- Harbour
  ('00000000-0000-0000-0000-00000000a011', '00000000-0000-0000-0000-000000000903',  190000.00, 'deposit',        'Bridge facility drawdown',   '00000000-0000-0000-0000-000000000205', '2026-04-04T07:30:00.000Z'),
  ('00000000-0000-0000-0000-00000000a012', '00000000-0000-0000-0000-000000000903',  -80000.00, 'allocation_out', 'Allocate demolition package','00000000-0000-0000-0000-000000000203', '2026-04-05T08:00:00.000Z'),
  ('00000000-0000-0000-0000-00000000a013', '00000000-0000-0000-0000-000000000903',   80000.00, 'allocation_in',  'Allocate demolition package','00000000-0000-0000-0000-000000000203', '2026-04-05T08:00:00.000Z'),
  ('00000000-0000-0000-0000-00000000a014', '00000000-0000-0000-0000-000000000903',  -50000.00, 'allocation_out', 'Allocate facade stabilisation','00000000-0000-0000-0000-000000000203','2026-04-05T10:50:00.000Z'),
  ('00000000-0000-0000-0000-00000000a015', '00000000-0000-0000-0000-000000000903',   50000.00, 'allocation_in',  'Allocate facade stabilisation','00000000-0000-0000-0000-000000000203','2026-04-05T10:50:00.000Z')
on conflict (id) do nothing;
