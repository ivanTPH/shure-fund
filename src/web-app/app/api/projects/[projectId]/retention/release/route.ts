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

  // Fetch wallet for this project
  const { data: wallet } = await service
    .from("wallets")
    .select("id, balance, available_amount")
    .eq("project_id", projectId)
    .maybeSingle();

  // Record wallet transaction (retention_release = money out)
  if (wallet) {
    await service.from("wallet_transactions").insert({
      wallet_id:  wallet.id,
      type:       "retention_release",
      amount:     retentionAmount,
      reference:  `Retention released — ${stage.name}`,
    });

    // Update wallet balance
    await service
      .from("wallets")
      .update({
        balance:          Number(wallet.balance) - retentionAmount,
        available_amount: Math.max(0, Number(wallet.available_amount) - retentionAmount),
      })
      .eq("id", wallet.id);
  }

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
