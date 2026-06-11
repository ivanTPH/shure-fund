/**
 * POST /api/projects/[projectId]/retention/release
 *
 * Releases the withheld retention (5%) for a specific released stage.
 *
 * Body:  { stageId: string }
 * Roles: admin, developer, funder
 *
 * Guards:
 *  - Stage must have status = "released"
 *  - retention_released_at must be null (not already released)
 *  - Stage must belong to a contract on this project
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

const RETENTION_PCT = 0.05;

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer", "funder"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admin, developer, or funder can release retention." }, { status: 403 });
  }

  let body: { stageId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { stageId } = body;
  if (!stageId) return NextResponse.json({ error: "stageId is required." }, { status: 400 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  // Verify stage belongs to this project and is released, retention not yet released
  const { data: stage, error: stageErr } = await service
    .from("contract_stages")
    .select("id, name, value, status, retention_released_at, contract_id")
    .eq("id", stageId)
    .maybeSingle();

  if (stageErr || !stage) {
    return NextResponse.json({ error: "Stage not found." }, { status: 404 });
  }

  // Verify stage's contract belongs to this project
  const { data: contract } = await service
    .from("contracts")
    .select("id, project_id")
    .eq("id", stage.contract_id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!contract) {
    return NextResponse.json({ error: "Stage does not belong to this project." }, { status: 404 });
  }

  if (stage.status !== "released") {
    return NextResponse.json({ error: "Retention can only be released for stages with status 'released'." }, { status: 422 });
  }

  if (stage.retention_released_at) {
    return NextResponse.json({ error: "Retention has already been released for this stage." }, { status: 409 });
  }

  // retentionAmount is calculated on the certified/released value.
  // The trust wallet already paid the full certified amount at stage release —
  // retention is withheld by the employer from their onward payment to the contractor
  // and does not constitute a separate trust account deduction.
  // We compute the amount here for the audit record only.
  const retentionAmount = Math.round(Number(stage.value) * RETENTION_PCT * 100) / 100;

  // Mark stage retention as released
  const now = new Date().toISOString();
  const { error: updateErr } = await service
    .from("contract_stages")
    .update({ retention_released_at: now })
    .eq("id", stageId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // No wallet balance change: the trust already disbursed the full certified amount
  // at the original stage release. Retention release is an employer-to-contractor
  // event recorded here for audit completeness only.

  // Audit log
  await service.from("audit_events").insert({
    project_id: projectId,
    stage_id:   stageId,
    actor_id:   user.id,
    action:     "retention_released",
    from_state: "released",
    to_state:   "released",
    metadata:   { retention_amount: retentionAmount, stage_name: stage.name },
  });

  return NextResponse.json({
    stageId,
    retentionAmount,
    retentionReleasedAt: now,
  });
}
