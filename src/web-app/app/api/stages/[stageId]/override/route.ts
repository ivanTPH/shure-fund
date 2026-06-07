/**
 * PATCH /api/stages/[stageId]/override
 *
 * Admin-only endpoint to force-set a stage's status, bypassing the normal
 * state machine validation and pre-condition checks. Used for recovery of
 * stuck or incorrectly-transitioned stages.
 *
 * The existing DB trigger fn_audit_stage_transition fires automatically on
 * every status UPDATE, so no manual audit write is needed here.
 *
 * Request body: { status: StageStatus, reason: string }
 * Response:     { ok: true, from: string, to: string }
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { isValidStatus, type StageStatus } from "@/lib/workflow/stateMachine";

type RouteContext = { params: Promise<{ stageId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin only — override requires administrator role." }, { status: 403 });
  }

  let body: { status: string; reason: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status: targetStatus, reason } = body;

  if (!targetStatus || !isValidStatus(targetStatus)) {
    return NextResponse.json({ error: `Invalid status "${targetStatus}".` }, { status: 400 });
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Reason is required for audit trail." }, { status: 400 });
  }

  const { stageId } = await context.params;
  const service = createServiceClient();

  // Fetch current status + project_id (needed for audit event)
  const { data: stage, error: fetchErr } = await service
    .from("contract_stages")
    .select("id, status, name, contracts!inner ( project_id )")
    .eq("id", stageId)
    .single();

  if (fetchErr || !stage) {
    return NextResponse.json({ error: "Stage not found." }, { status: 404 });
  }

  const fromStatus = stage.status as StageStatus;
  const contract = Array.isArray(stage.contracts) ? stage.contracts[0] : stage.contracts;
  const projectId: string | null = contract?.project_id ?? null;

  if (fromStatus === targetStatus) {
    return NextResponse.json({ error: `Stage is already in status "${targetStatus}".` }, { status: 400 });
  }

  // Force-update — bypasses state machine
  const { error: updateErr } = await service
    .from("contract_stages")
    .update({ status: targetStatus as StageStatus })
    .eq("id", stageId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Write explicit audit event so the override reason is permanently recorded.
  // The DB trigger fn_audit_stage_transition also fires (recording the status
  // change), but it has no access to the API-level reason. This second row
  // captures the admin's stated justification.
  await service.from("audit_events").insert({
    project_id: projectId,
    stage_id:   stageId,
    actor_id:   user.id,
    action:     "admin_override",
    from_state: fromStatus,
    to_state:   targetStatus,
    metadata:   {
      reason:      reason.trim(),
      stage_name:  stage.name ?? stageId,
      override_by: user.email ?? user.id,
    },
  });

  return NextResponse.json({ ok: true, from: fromStatus, to: targetStatus });
}
