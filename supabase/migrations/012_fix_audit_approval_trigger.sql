-- Migration 012: fix type cast in fn_audit_approval_decision
--
-- The CASE expression returned a 'text' literal which PostgreSQL cannot
-- implicitly cast to audit_action when the row is UPDATEd (trigger fires
-- on UPDATE of decision). Explicit ::audit_action casts resolve this.
-- INSERT path (new approvals) never triggered the bug because the trigger
-- only fires on UPDATE, but after test reruns the same stage goes through
-- the approval cycle twice, hitting the UPDATE path.

create or replace function fn_audit_approval_decision()
returns trigger language plpgsql security definer as $$
begin
  if old.decision = new.decision then
    return new;
  end if;

  insert into audit_events (
    project_id, stage_id, actor_id, action, from_state, to_state, metadata
  )
  values (
    fn_project_id_for_stage(new.stage_id),
    new.stage_id,
    new.approved_by,
    case new.decision
      when 'approved' then 'approval_given'::audit_action
      when 'rejected' then 'approval_rejected'::audit_action
      else                 'approval_returned'::audit_action
    end,
    old.decision::text,
    new.decision::text,
    jsonb_build_object('role', new.role, 'notes', new.notes)
  );

  return new;
end;
$$;
