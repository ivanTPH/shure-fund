/**
 * PATCH /api/projects/[projectId]/proof-of-funds/[pofId]
 *
 * Withdraw an active proof-of-funds declaration.
 *
 * Body: { withdrawalReason?: string }
 * Roles: funder (own declarations), admin
 *
 * Side-effect: if withdrawn before valid_until, fires TIER2_POF_WITHDRAWAL
 * AML compliance review (medium risk, non-blocking).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { checkPofEarlyWithdrawal, recordComplianceHit } from "@/lib/compliance/amlRules";

type RouteContext = { params: Promise<{ projectId: string; pofId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "funder"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admin and funder can withdraw proof of funds." }, { status: 403 });
  }

  let body: { withdrawalReason?: string } = {};
  try { body = await req.json(); } catch { /* body is optional */ }

  const { projectId, pofId } = await context.params;
  const service = createServiceClient();

  // Fetch the declaration and verify ownership
  const { data: pof } = await service
    .from("proof_of_funds")
    .select("id, project_id, declared_by, amount, valid_until, status")
    .eq("id", pofId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!pof) return NextResponse.json({ error: "Declaration not found." }, { status: 404 });

  // Funders can only withdraw their own declarations
  if (role === "funder" && pof.declared_by !== user.id) {
    return NextResponse.json({ error: "You can only withdraw your own declarations." }, { status: 403 });
  }

  if (pof.status !== "active") {
    return NextResponse.json(
      { error: `Cannot withdraw a declaration with status '${pof.status}'.` },
      { status: 422 },
    );
  }

  const now = new Date().toISOString();

  const { data: updated, error: updateErr } = await service
    .from("proof_of_funds")
    .update({
      status:            "withdrawn",
      withdrawn_at:      now,
      withdrawal_reason: body.withdrawalReason?.trim() || null,
    })
    .eq("id", pofId)
    .select("id, status, withdrawn_at, withdrawal_reason")
    .single();

  if (updateErr || !updated) {
    return NextResponse.json({ error: updateErr?.message ?? "Update failed." }, { status: 500 });
  }

  // AML: fire early-withdrawal rule (non-blocking, medium risk)
  const hit = checkPofEarlyWithdrawal(user.id, pofId, projectId, pof.valid_until);
  if (hit) {
    await recordComplianceHit(hit); // fire-and-forget
  }

  return NextResponse.json({
    declaration: updated,
    amlFlagged: hit !== null,
  });
}
