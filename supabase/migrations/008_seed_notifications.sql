-- =============================================================================
-- Migration 008: Seed Notifications
--
-- Strategy:
--   1. Create fn_seed_user_notifications(user_id, role) — inserts a set of
--      role-appropriate sample notifications if the user has none yet.
--      Uses the fixed seed UUIDs for projects/stages/variations so action
--      links work straight away in the demo environment.
--
--   2. Create trg_seed_user_notifications — fires AFTER INSERT ON public.users
--      so every new dev-login user automatically gets sample notifications.
--      (The fn_handle_new_user auth trigger inserts into public.users first,
--      so this fires immediately after signup — correct ordering.)
--
--   3. Retroactively seed existing users (the seven seed rows from seed.sql).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Seed function
-- ---------------------------------------------------------------------------

create or replace function fn_seed_user_notifications(p_user_id uuid, p_role user_role)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Idempotent: skip if user already has any notifications
  if exists (select 1 from notifications where user_id = p_user_id limit 1) then
    return;
  end if;

  -- =========================================================================
  -- FUNDER / ADMIN — payment releases + disputes
  -- =========================================================================
  if p_role in ('funder', 'admin') then
    insert into notifications
      (id, user_id, project_id, stage_id, type, message,
       required_action, entity_type, entity_id, entity_name, action_url, read, created_at)
    values
      -- Foundation Package ready to release (Aurora)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000501',
       'payment_ready',
       'Foundation Package on Aurora Civic Centre has passed all sign-offs and is ready for payment release.',
       'Release payment',
       'stage', '00000000-0000-0000-0000-000000000501',
       'Foundation Package — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000501/release',
       false, '2026-04-02T11:30:00Z'),

      -- Structural Frame disputed (Aurora)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000502',
       'dispute_raised',
       'Structural Frame on Aurora Civic Centre is under dispute. Payment is held pending resolution.',
       'Review dispute',
       'stage', '00000000-0000-0000-0000-000000000502',
       'Structural Frame — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000502/disputes/00000000-0000-0000-0000-000000000d01',
       false, '2026-04-04T14:00:00Z'),

      -- Strip-Out disputed (Harbour)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000303',
       '00000000-0000-0000-0000-000000000506',
       'dispute_raised',
       'Strip-Out And Demolition on Harbour Exchange Retrofit is disputed despite all approvals being granted.',
       'Review dispute',
       'stage', '00000000-0000-0000-0000-000000000506',
       'Strip-Out And Demolition — Harbour Exchange Retrofit',
       '/projects/00000000-0000-0000-0000-000000000303/stages/00000000-0000-0000-0000-000000000506/disputes/00000000-0000-0000-0000-000000000d02',
       false, '2026-04-06T09:15:00Z'),

      -- Shell And Core awaiting approval (Meridian) — read/informational for funder
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000302',
       '00000000-0000-0000-0000-000000000504',
       'approval_required',
       'Shell And Core on Meridian Life Sciences Hub is awaiting final sign-offs before payment can proceed.',
       'Monitor approval',
       'stage', '00000000-0000-0000-0000-000000000504',
       'Shell And Core — Meridian Life Sciences Hub',
       '/projects/00000000-0000-0000-0000-000000000302/stages/00000000-0000-0000-0000-000000000504',
       true, '2026-04-03T10:00:00Z');
  end if;

  -- =========================================================================
  -- CONTRACTOR — evidence requests + dispute responses
  -- =========================================================================
  if p_role in ('contractor', 'subcontractor') then
    insert into notifications
      (id, user_id, project_id, stage_id, type, message,
       required_action, entity_type, entity_id, entity_name, action_url, read, created_at)
    values
      -- Steel delivery pack needs resubmission (Frame, Aurora)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000502',
       'evidence_required',
       'Steel delivery pack on Structural Frame requires more information — the commercial reviewer has returned it for clarification.',
       'Resubmit evidence',
       'stage', '00000000-0000-0000-0000-000000000502',
       'Structural Frame — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000502',
       false, '2026-04-03T15:30:00Z'),

      -- Structural Frame dispute (Aurora)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000502',
       'dispute_raised',
       'A dispute has been raised on Structural Frame — Aurora Civic Centre. Provide your position to unblock payment.',
       'Respond to dispute',
       'stage', '00000000-0000-0000-0000-000000000502',
       'Structural Frame — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000502/disputes/00000000-0000-0000-0000-000000000d01',
       false, '2026-04-04T14:00:00Z'),

      -- Strip-Out dispute (Harbour)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000303',
       '00000000-0000-0000-0000-000000000506',
       'dispute_raised',
       'Strip-Out And Demolition on Harbour Exchange Retrofit is disputed despite full sign-off. Provide supporting documentation.',
       'Respond to dispute',
       'stage', '00000000-0000-0000-0000-000000000506',
       'Strip-Out And Demolition — Harbour Exchange Retrofit',
       '/projects/00000000-0000-0000-0000-000000000303/stages/00000000-0000-0000-0000-000000000506/disputes/00000000-0000-0000-0000-000000000d02',
       false, '2026-04-06T09:15:00Z'),

      -- Variation submitted confirmation (Harbour Facade) — already read
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000303',
       '00000000-0000-0000-0000-000000000507',
       'variation_submitted',
       'Your variation request for Facade Stabilisation (£22,000) has been submitted and is pending review.',
       null,
       'variation', '00000000-0000-0000-0000-000000000802',
       'Facade Stabilisation — Harbour Exchange Retrofit',
       '/projects/00000000-0000-0000-0000-000000000303/stages/00000000-0000-0000-0000-000000000507',
       true, '2026-04-05T11:30:00Z'),

      -- Envelope variation confirmation (Aurora) — already read
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000503',
       'variation_submitted',
       'Your variation request for Envelope Works (£15,000) has been submitted and is pending review.',
       null,
       'variation', '00000000-0000-0000-0000-000000000801',
       'Envelope Works — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000503',
       true, '2026-04-04T12:15:00Z');
  end if;

  -- =========================================================================
  -- COMMERCIAL — approvals + variations to review
  -- =========================================================================
  if p_role in ('commercial') then
    insert into notifications
      (id, user_id, project_id, stage_id, type, message,
       required_action, entity_type, entity_id, entity_name, action_url, read, created_at)
    values
      -- Shell And Core sign-off needed (Meridian)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000302',
       '00000000-0000-0000-0000-000000000504',
       'approval_required',
       'Shell And Core on Meridian Life Sciences Hub is awaiting your commercial sign-off. Evidence has been submitted.',
       'Approve stage',
       'stage', '00000000-0000-0000-0000-000000000504',
       'Shell And Core — Meridian Life Sciences Hub',
       '/projects/00000000-0000-0000-0000-000000000302/stages/00000000-0000-0000-0000-000000000504/approve',
       false, '2026-04-03T10:00:00Z'),

      -- MEP First Fix sign-off (Meridian)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000302',
       '00000000-0000-0000-0000-000000000505',
       'approval_required',
       'MEP First Fix on Meridian Life Sciences Hub has evidence submitted and is awaiting your review.',
       'Approve stage',
       'stage', '00000000-0000-0000-0000-000000000505',
       'MEP First Fix — Meridian Life Sciences Hub',
       '/projects/00000000-0000-0000-0000-000000000302/stages/00000000-0000-0000-0000-000000000505/approve',
       false, '2026-04-04T15:00:00Z'),

      -- Envelope variation to review (Aurora)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000503',
       'variation_submitted',
       'A variation has been requested on Envelope Works — Aurora Civic Centre. Additional weatherproofing detail, value change: +£15,000.',
       'Review variation',
       'variation', '00000000-0000-0000-0000-000000000801',
       'Envelope Works — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000503',
       false, '2026-04-04T12:15:00Z'),

      -- Harbour Facade variation to review
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000303',
       '00000000-0000-0000-0000-000000000507',
       'variation_submitted',
       'Facade Stabilisation variation on Harbour Exchange Retrofit needs review. Additional restraint detail, value change: +£22,000.',
       'Review variation',
       'variation', '00000000-0000-0000-0000-000000000802',
       'Facade Stabilisation — Harbour Exchange Retrofit',
       '/projects/00000000-0000-0000-0000-000000000303/stages/00000000-0000-0000-0000-000000000507',
       false, '2026-04-05T11:30:00Z'),

      -- Frame dispute (Aurora) — read/informational
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000502',
       'dispute_raised',
       'Structural Frame on Aurora Civic Centre is under dispute. Your sign-off is paused until resolution.',
       'Monitor dispute',
       'stage', '00000000-0000-0000-0000-000000000502',
       'Structural Frame — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000502/disputes/00000000-0000-0000-0000-000000000d01',
       true, '2026-04-04T14:00:00Z');
  end if;

  -- =========================================================================
  -- PROFESSIONAL — approvals for shell/facade
  -- =========================================================================
  if p_role in ('professional') then
    insert into notifications
      (id, user_id, project_id, stage_id, type, message,
       required_action, entity_type, entity_id, entity_name, action_url, read, created_at)
    values
      -- Shell And Core sign-off (Meridian)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000302',
       '00000000-0000-0000-0000-000000000504',
       'approval_required',
       'Shell And Core on Meridian Life Sciences Hub needs your professional sign-off before payment can proceed.',
       'Approve stage',
       'stage', '00000000-0000-0000-0000-000000000504',
       'Shell And Core — Meridian Life Sciences Hub',
       '/projects/00000000-0000-0000-0000-000000000302/stages/00000000-0000-0000-0000-000000000504/approve',
       false, '2026-04-03T10:00:00Z'),

      -- Facade Stabilisation sign-off (Harbour)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000303',
       '00000000-0000-0000-0000-000000000507',
       'approval_required',
       'Facade Stabilisation on Harbour Exchange Retrofit is awaiting your professional sign-off.',
       'Approve stage',
       'stage', '00000000-0000-0000-0000-000000000507',
       'Facade Stabilisation — Harbour Exchange Retrofit',
       '/projects/00000000-0000-0000-0000-000000000303/stages/00000000-0000-0000-0000-000000000507/approve',
       false, '2026-04-05T11:00:00Z'),

      -- Foundation Foundation approval confirmed — read
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000501',
       'variation_approved',
       'Foundation Package on Aurora Civic Centre has been fully approved and released for payment.',
       null,
       'stage', '00000000-0000-0000-0000-000000000501',
       'Foundation Package — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000501',
       true, '2026-04-02T11:05:00Z');
  end if;

  -- =========================================================================
  -- TREASURY — financial approvals
  -- =========================================================================
  if p_role in ('treasury') then
    insert into notifications
      (id, user_id, project_id, stage_id, type, message,
       required_action, entity_type, entity_id, entity_name, action_url, read, created_at)
    values
      -- Shell And Core treasury sign-off (Meridian)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000302',
       '00000000-0000-0000-0000-000000000504',
       'approval_required',
       'Shell And Core on Meridian Life Sciences Hub requires your treasury sign-off to complete the approval chain.',
       'Approve stage',
       'stage', '00000000-0000-0000-0000-000000000504',
       'Shell And Core — Meridian Life Sciences Hub',
       '/projects/00000000-0000-0000-0000-000000000302/stages/00000000-0000-0000-0000-000000000504/approve',
       false, '2026-04-03T10:00:00Z'),

      -- Facade Stabilisation treasury sign-off (Harbour)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000303',
       '00000000-0000-0000-0000-000000000507',
       'approval_required',
       'Facade Stabilisation on Harbour Exchange Retrofit is awaiting your treasury sign-off.',
       'Approve stage',
       'stage', '00000000-0000-0000-0000-000000000507',
       'Facade Stabilisation — Harbour Exchange Retrofit',
       '/projects/00000000-0000-0000-0000-000000000303/stages/00000000-0000-0000-0000-000000000507/approve',
       false, '2026-04-05T11:00:00Z'),

      -- Wallet funded for Aurora — read
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       null,
       'variation_approved',
       'Aurora Civic Centre wallet funded with £600,000 by Harbour Capital. Funds are available for stage allocation.',
       null,
       'stage', null,
       'Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301',
       true, '2026-04-01T09:30:00Z');
  end if;

  -- =========================================================================
  -- DEVELOPER — variations + disputes + approvals
  -- =========================================================================
  if p_role in ('developer') then
    insert into notifications
      (id, user_id, project_id, stage_id, type, message,
       required_action, entity_type, entity_id, entity_name, action_url, read, created_at)
    values
      -- Envelope variation to review (Aurora)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000503',
       'variation_submitted',
       'A variation has been submitted on Envelope Works — Aurora Civic Centre. Additional weatherproofing detail required, value change: +£15,000.',
       'Review variation',
       'variation', '00000000-0000-0000-0000-000000000801',
       'Envelope Works — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000503',
       false, '2026-04-04T12:15:00Z'),

      -- Harbour Facade variation to review
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000303',
       '00000000-0000-0000-0000-000000000507',
       'variation_submitted',
       'Facade Stabilisation variation on Harbour Exchange Retrofit submitted — additional restraint works, value change: +£22,000.',
       'Review variation',
       'variation', '00000000-0000-0000-0000-000000000802',
       'Facade Stabilisation — Harbour Exchange Retrofit',
       '/projects/00000000-0000-0000-0000-000000000303/stages/00000000-0000-0000-0000-000000000507',
       false, '2026-04-05T11:30:00Z'),

      -- Frame dispute notification (Aurora)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000502',
       'dispute_raised',
       'Structural Frame on Aurora Civic Centre is under dispute. Review and coordinate resolution to unblock the approval chain.',
       'Review dispute',
       'stage', '00000000-0000-0000-0000-000000000502',
       'Structural Frame — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000502/disputes/00000000-0000-0000-0000-000000000d01',
       false, '2026-04-04T14:00:00Z'),

      -- Harbour Strip-Out dispute
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000303',
       '00000000-0000-0000-0000-000000000506',
       'dispute_raised',
       'Strip-Out And Demolition on Harbour Exchange Retrofit is disputed. All approvals were granted — coordinate resolution.',
       'Review dispute',
       'stage', '00000000-0000-0000-0000-000000000506',
       'Strip-Out And Demolition — Harbour Exchange Retrofit',
       '/projects/00000000-0000-0000-0000-000000000303/stages/00000000-0000-0000-0000-000000000506/disputes/00000000-0000-0000-0000-000000000d02',
       false, '2026-04-06T09:15:00Z'),

      -- Foundation approved — read/informational
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000501',
       'variation_approved',
       'Foundation Package on Aurora Civic Centre passed all sign-offs and is ready for payment release.',
       null,
       'stage', '00000000-0000-0000-0000-000000000501',
       'Foundation Package — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000501',
       true, '2026-04-02T11:05:00Z');
  end if;

  -- =========================================================================
  -- ADMIN — everything across all projects
  -- =========================================================================
  if p_role in ('admin') then
    insert into notifications
      (id, user_id, project_id, stage_id, type, message,
       required_action, entity_type, entity_id, entity_name, action_url, read, created_at)
    values
      -- Foundation ready to release (Aurora)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000501',
       'payment_ready',
       'Foundation Package on Aurora Civic Centre is approved and ready for payment release.',
       'Release payment',
       'stage', '00000000-0000-0000-0000-000000000501',
       'Foundation Package — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000501/release',
       false, '2026-04-02T11:30:00Z'),

      -- Frame disputed (Aurora)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000502',
       'dispute_raised',
       'Structural Frame on Aurora Civic Centre is under dispute. Payment is held. Admin override available.',
       'Resolve dispute',
       'stage', '00000000-0000-0000-0000-000000000502',
       'Structural Frame — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000502/disputes/00000000-0000-0000-0000-000000000d01',
       false, '2026-04-04T14:00:00Z'),

      -- Envelope variation (Aurora)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000503',
       'variation_submitted',
       'Variation pending on Envelope Works — Aurora Civic Centre. Additional weatherproofing: +£15,000.',
       'Review variation',
       'variation', '00000000-0000-0000-0000-000000000801',
       'Envelope Works — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000503',
       false, '2026-04-04T12:15:00Z'),

      -- Shell And Core pending (Meridian)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000302',
       '00000000-0000-0000-0000-000000000504',
       'approval_required',
       'Shell And Core on Meridian Life Sciences Hub is awaiting two further sign-offs (professional, treasury).',
       'Monitor approvals',
       'stage', '00000000-0000-0000-0000-000000000504',
       'Shell And Core — Meridian Life Sciences Hub',
       '/projects/00000000-0000-0000-0000-000000000302/stages/00000000-0000-0000-0000-000000000504',
       false, '2026-04-03T10:00:00Z'),

      -- Strip-Out disputed (Harbour)
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000303',
       '00000000-0000-0000-0000-000000000506',
       'dispute_raised',
       'Strip-Out And Demolition on Harbour Exchange Retrofit is disputed despite all approvals. Admin override available.',
       'Resolve dispute',
       'stage', '00000000-0000-0000-0000-000000000506',
       'Strip-Out And Demolition — Harbour Exchange Retrofit',
       '/projects/00000000-0000-0000-0000-000000000303/stages/00000000-0000-0000-0000-000000000506/disputes/00000000-0000-0000-0000-000000000d02',
       false, '2026-04-06T09:15:00Z'),

      -- Harbour Facade variation
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000303',
       '00000000-0000-0000-0000-000000000507',
       'variation_submitted',
       'Variation pending on Facade Stabilisation — Harbour Exchange Retrofit. Additional restraint works: +£22,000.',
       'Review variation',
       'variation', '00000000-0000-0000-0000-000000000802',
       'Facade Stabilisation — Harbour Exchange Retrofit',
       '/projects/00000000-0000-0000-0000-000000000303/stages/00000000-0000-0000-0000-000000000507',
       false, '2026-04-05T11:30:00Z'),

      -- Foundation approved — already read
      (gen_random_uuid(), p_user_id,
       '00000000-0000-0000-0000-000000000301',
       '00000000-0000-0000-0000-000000000501',
       'variation_approved',
       'Foundation Package on Aurora Civic Centre passed all sign-offs.',
       null,
       'stage', '00000000-0000-0000-0000-000000000501',
       'Foundation Package — Aurora Civic Centre',
       '/projects/00000000-0000-0000-0000-000000000301/stages/00000000-0000-0000-0000-000000000501',
       true, '2026-04-02T11:05:00Z');
  end if;

end;
$$;


-- ---------------------------------------------------------------------------
-- Trigger: auto-seed notifications whenever a new public.users row is created
-- (fn_handle_new_user inserts into public.users, which fires this trigger)
-- ---------------------------------------------------------------------------

create or replace function fn_on_user_created_seed_notifications()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform fn_seed_user_notifications(new.id, new.role);
  return new;
end;
$$;

drop trigger if exists trg_seed_user_notifications on users;
create trigger trg_seed_user_notifications
  after insert on users
  for each row execute function fn_on_user_created_seed_notifications();


-- ---------------------------------------------------------------------------
-- Retroactive seed for the seven existing seed users
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in select id, role from users loop
    perform fn_seed_user_notifications(r.id, r.role);
  end loop;
end;
$$;
