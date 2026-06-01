/**
 * GET  /api/projects/[projectId]/contracts/[contractId]/approval-chain
 *   Returns all stages for the contract with their approval records,
 *   plus project members grouped by approval role.
 *
 * POST /api/projects/[projectId]/contracts/[contractId]/approval-chain
 *   Pre-seeds a pending approval record for a specific user/role/stage.
 *   Body: { stageId, approvalRole: 'commercial'|'professional'|'treasury', userId }
 *   Restricted to admin and developer only.
 *   Uses upsert so re-assigning is safe (does not overwrite an existing decision).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ projectId: string; contractId: string }> };

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, contractId } = await context.params;
  const service = createServiceClient();

  // Verify contract belongs to project
  const { data: contract } = await service
    .from("contracts")
    .select("id, total_value, status, contractor:users!contractor_id(id, full_name, email)")
    .eq("id", contractId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });

  // Fetch all stages for this contract
  const { data: stages } = await service
    .from("contract_stages")
    .select("id, name, value, status, sequence_order")
    .eq("contract_id", contractId)
    .order("sequence_order", { ascending: true });

  // Fetch all approval records for all stages in this contract
  const stageIds = (stages ?? []).map((s) => s.id);
  const { data: approvals } = stageIds.length > 0
    ? await service
        .from("approvals")
        .select("id, stage_id, role, decision, notes, certified_amount, created_at, approved_by:users!approved_by(id, full_name, email, role)")
        .in("stage_id", stageIds)
    : { data: [] };

  // Fetch project members with approval-relevant roles
  const { data: members } = await service
    .from("project_members")
    .select("id, role, user:users!user_id(id, full_name, email, role)")
    .eq("project_id", projectId)
    .in("role", ["commercial", "consultant", "funder", "developer", "admin"]);

  // Group members by which approval_role they can fill
  const commercialApprovers = (members ?? []).filter((m) => m.role === "commercial");
  const professionalApprovers = (members ?? []).filter((m) => m.role === "consultant");
  const treasuryApprovers = (members ?? []).filter((m) =>
    ["funder", "developer", "admin"].includes(m.role),
  );

  // Build per-stage approval map
  type Approval = NonNullable<typeof approvals>[number];
  const approvalsByStage = new Map<string, Approval[]>();
  for (const ap of approvals ?? []) {
    if (!approvalsByStage.has(ap.stage_id)) approvalsByStage.set(ap.stage_id, []);
    approvalsByStage.get(ap.stage_id)!.push(ap);
  }

  const stagesWithApprovals = (stages ?? []).map((s) => ({
    ...s,
    approvals: (approvalsByStage.get(s.id) ?? []).map((ap) => ({
      id: ap.id,
      role: ap.role,
      decision: ap.decision,
      notes: ap.notes,
      certifiedAmount: ap.certified_amount,
      createdAt: ap.created_at,
      approvedBy: Array.isArray(ap.approved_by) ? ap.approved_by[0] : ap.approved_by,
    })),
  }));

  const normalise = (m: NonNullable<typeof members>[0]) => ({
    memberId: m.id,
    projectRole: m.role,
    user: Array.isArray(m.user) ? m.user[0] : m.user,
  });

  return NextResponse.json({
    contract: {
      id: contract.id,
      totalValue: contract.total_value,
      status: contract.status,
      contractor: Array.isArray(contract.contractor) ? contract.contractor[0] : contract.contractor,
    },
    stages: stagesWithApprovals,
    approvers: {
      commercial:   commercialApprovers.map(normalise),
      professional: professionalApprovers.map(normalise),
      treasury:     treasuryApprovers.map(normalise),
    },
  });
}

// ---------------------------------------------------------------------------
// POST — pre-seed a pending approval record
// ---------------------------------------------------------------------------

type SeedBody = {
  stageId: string;
  approvalRole: "commercial" | "professional" | "treasury";
  userId: string;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admin or developer can configure the approval chain." }, { status: 403 });
  }

  const { projectId, contractId } = await context.params;

  let body: SeedBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { stageId, approvalRole, userId } = body;
  if (!stageId || !approvalRole || !userId) {
    return NextResponse.json({ error: "stageId, approvalRole, and userId are required." }, { status: 400 });
  }
  if (!["commercial", "professional", "treasury"].includes(approvalRole)) {
    return NextResponse.json({ error: "Invalid approvalRole." }, { status: 400 });
  }

  const service = createServiceClient();

  // Verify stage belongs to this contract
  const { data: stage } = await service
    .from("contract_stages")
    .select("id, status, contract_id")
    .eq("id", stageId)
    .eq("contract_id", contractId)
    .maybeSingle();

  if (!stage) return NextResponse.json({ error: "Stage not found in this contract." }, { status: 404 });

  // Don't overwrite an existing decision — only seed if pending or absent
  const { data: existing } = await service
    .from("approvals")
    .select("id, decision")
    .eq("stage_id", stageId)
    .eq("role", approvalRole)
    .maybeSingle();

  if (existing && existing.decision !== "pending") {
    return NextResponse.json(
      { error: `This role already has a ${existing.decision} decision and cannot be re-assigned.` },
      { status: 409 },
    );
  }

  // Ensure the target user exists in users table
  const { data: targetUser } = await service
    .from("users")
    .select("id, full_name, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (!targetUser) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Verify user is a member of this project
  const { data: membership } = await service
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "User is not a member of this project." }, { status: 403 });
  }

  // Upsert pending approval record
  const { data: upserted, error: upsertError } = await service
    .from("approvals")
    .upsert(
      {
        stage_id: stageId,
        approved_by: userId,
        role: approvalRole,
        decision: "pending",
        notes: null,
        certified_amount: null,
      },
      { onConflict: "stage_id,role" },
    )
    .select("id, stage_id, role, decision, approved_by:users!approved_by(id, full_name, email)")
    .single();

  if (upsertError || !upserted) {
    return NextResponse.json({ error: upsertError?.message ?? "Failed to seed approval." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    approval: {
      id: upserted.id,
      stageId: upserted.stage_id,
      role: upserted.role,
      decision: upserted.decision,
      approvedBy: Array.isArray(upserted.approved_by) ? upserted.approved_by[0] : upserted.approved_by,
    },
  });
}
