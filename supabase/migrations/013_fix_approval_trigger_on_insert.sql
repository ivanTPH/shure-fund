-- Migration 013: fix approval completion trigger for both INSERT and UPDATE
--
-- Problem 1: trg_check_approval_completion only fired on UPDATE.
--   First-run approval journeys INSERT new rows (no prior approval history),
--   so the trigger never fired and stages got stuck in awaiting_approval.
--
-- Problem 2: The original check used v_total_count = v_approved_count, which
--   would advance the stage after any single approved INSERT (1/1 satisfied).
--   This is a security issue — 1 approval shouldn't satisfy a 3-role chain.
--
-- Fix: rewrite fn_check_approval_completion to explicitly require all three
--   standard approval roles (commercial, professional, treasury) to be present
--   AND approved before advancing the stage. Then add an INSERT trigger so the
--   check also fires when rows are first created.

create or replace function fn_check_approval_completion()
returns trigger language plpgsql security definer as $$
declare
  v_approved_count int;
begin
  -- Only act when a decision is 'approved'
  if new.decision <> 'approved' then
    return new;
  end if;

  -- Count how many of the three required roles are approved for this stage
  select count(*)
  into v_approved_count
  from approvals
  where stage_id    = new.stage_id
    and decision    = 'approved'
    and role in ('commercial', 'professional', 'treasury');

  -- All three roles must be approved to complete
  if v_approved_count < 3 then
    return new;
  end if;

  -- Ensure no remaining non-approved rows exist for other roles
  if exists (
    select 1 from approvals
    where stage_id = new.stage_id
      and decision <> 'approved'
  ) then
    return new;
  end if;

  -- Insert the completion certificate if not already present
  insert into stage_approval_completions (stage_id, completed_by)
  values (new.stage_id, new.approved_by)
  on conflict (stage_id) do nothing;

  -- Advance stage to available_to_release if it is currently awaiting_approval
  update contract_stages
     set status = 'available_to_release'
   where id = new.stage_id
     and status = 'awaiting_approval';

  -- Write the completion audit event
  insert into audit_events (
    project_id, stage_id, actor_id, action, from_state, to_state, metadata
  )
  values (
    fn_project_id_for_stage(new.stage_id),
    new.stage_id,
    new.approved_by,
    'all_approvals_complete',
    'awaiting_approval',
    'available_to_release',
    jsonb_build_object(
      'approval_count', v_approved_count,
      'completing_role', new.role
    )
  );

  return new;
end;
$$;

-- Add INSERT trigger so first-run journeys (all rows are new INSERTs) also
-- go through the completion check. The UPDATE trigger already exists from 001.
create trigger trg_check_approval_completion_insert
  after insert on approvals
  for each row execute function fn_check_approval_completion();
