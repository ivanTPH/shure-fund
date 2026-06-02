/**
 * GET  /api/stages/[stageId]/approvals — list all approval records for a stage
 * POST /api/stages/[stageId]/approvals — upsert the current user's approval decision
 *
 * App role → approval_role mapping:
 *   commercial  → commercial
 *   consultant  → professional
 *   funder      → treasury
 *   developer   → treasury
 *   admin       → acts for whatever role is provided in body (or treasury by default)
 *
 * DB trigger fn_check_approval_completion fires after every UPDATE of decision
 * on the approvals table. When every approval row for a stage is 'approved', it
 * writes a row to stage_approval_completions. No manual write needed here.
 *
 * DB trigger fn_audit_approval_decision writes an immutable audit_event after
 * every UPDATE of decision. No manual audit write needed here.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import { notifyApprovalDecision } from "@/lib/notifications/notificationService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApprovalRole = "commercial" | "professional" | "treasury";
type ApprovalDecision = "approved" | "rejected" | "returned";

/** Maps an app-level role to its approval_role enum value */
function toApprovalRole(appRole: AppRole): ApprovalRole | null {
  switch (appRole) {
    case "commercial":  return "commercial";
    case "consultant":  return "professional";
    case "funder":
    case "developer":   return "treasury";
    case "admin":       return "treasury"; // fallback; body may override
    default:            return null;
  }
}

// ---------------------------------------------------------------------------
// GET — list approvals for a stage
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ stageId: string }> },
) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stageId } = await context.params;
  const service = createServiceClient();

  const { data, error } = await service
    .from("approvals")
    .select(`
      id, stage_id, role, decision, notes, certified_amount, created_at,
      approver:users!approved_by ( id, full_name, email, role )
    `)
    .eq("stage_id", stageId)
    .order("role");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const approvals = (data ?? []).map((row) => ({
    id: row.id,
    stageId: row.stage_id,
    role: row.role,
    decision: row.decision,
    notes: row.notes,
    certifiedAmount: row.certified_amount,
    createdAt: row.created_at,
    approver: Array.isArray(row.approver) ? row.approver[0] : row.approver,
  }));

  return NextResponse.json({ approvals });
}

// ---------------------------------------------------------------------------
// POST — upsert approval decision for the current user
// ---------------------------------------------------------------------------

type ApprovalBody = {
  decision: ApprovalDecision;
  notes?: string;
  certifiedAmount?: number;
  /** Admin only: override which approval_role to act as */
  roleOverride?: ApprovalRole;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ stageId: string }> },
) {
  // 1. Authenticate
  const userClient = await createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = getRole(user) as AppRole | null;
  if (!appRole) {
    return NextResponse.json(
      { error: "Your account has no role assigned." },
      { status: 403 },
    );
  }

  // 2. Parse body
  let body: ApprovalBody;
  try {
    body = (await request.json()) as ApprovalBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { decision, notes, certifiedAmount, roleOverride } = body;
  if (!decision || !["approved", "rejected", "returned"].includes(decision)) {
    return NextResponse.json(
      { error: "decision must be one of: approved, rejected, returned" },
      { status: 400 },
    );
  }

  if (decision === "returned" && !notes?.trim()) {
    return NextResponse.json(
      { error: "Notes are required when returning a stage." },
      { status: 400 },
    );
  }

  // 3. Resolve approval role
  let approvalRole: ApprovalRole | null = toApprovalRole(appRole);
  if (appRole === "admin" && roleOverride) {
    approvalRole = roleOverride;
  }
  if (!approvalRole) {
    return NextResponse.json(
      { error: `Role "${appRole}" is not permitted to submit approvals.` },
      { status: 403 },
    );
  }

  const { stageId } = await context.params;
  const service = createServiceClient();

  // 4. Verify stage exists and is in awaiting_approval
  const { data: stage, error: stageError } = await service
    .from("contract_stages")
    .select("id, name, status, contract_id, contract:contracts!contract_id(id, project_id)")
    .eq("id", stageId)
    .single();

  if (stageError || !stage) {
    return NextResponse.json({ error: "Stage not found." }, { status: 404 });
  }

  if (stage.status !== "awaiting_approval") {
    return NextResponse.json(
      { error: `Approvals can only be submitted when the stage is awaiting_approval. Current status: ${stage.status}.` },
      { status: 403 },
    );
  }

  // 5. Ensure user profile row exists (FK: approvals.approved_by → users.id)
  const meta = user.user_metadata ?? {};
  await service.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      full_name: meta.full_name ?? user.email?.split("@")[0] ?? "Unknown",
      role: meta.role ?? appRole,
    },
    { onConflict: "id", ignoreDuplicates: false },
  );

  // 6. Upsert approval record
  // unique (stage_id, role) — one approval per role per stage
  const { data: upserted, error: upsertError } = await service
    .from("approvals")
    .upsert(
      {
        stage_id: stageId,
        approved_by: user.id,
        role: approvalRole,
        decision,
        notes: notes?.trim() ?? null,
        certified_amount: certifiedAmount ?? null,
      },
      { onConflict: "stage_id,role" },
    )
    .select(`
      id, stage_id, role, decision, notes, certified_amount, created_at,
      approver:users!approved_by ( id, full_name, email, role )
    `)
    .single();

  if (upsertError || !upserted) {
    return NextResponse.json(
      { error: `Database error: ${upsertError?.message}` },
      { status: 500 },
    );
  }

  // 7. Fire notifications (non-fatal)
  try {
    const contractInfo = Array.isArray(stage.contract) ? stage.contract[0] : stage.contract;
    const projectId = (contractInfo as { project_id?: string } | null)?.project_id ?? null;
    if (projectId) {
      await notifyApprovalDecision(
        service,
        projectId,
        stageId,
        stage.name,
        stage.contract_id,
        decision,
        approvalRole,
      );
    }
  } catch (err) {
    console.error("[approvals] Notification error (non-fatal):", err);
  }

  return NextResponse.json({
    ok: true,
    approval: {
      id: upserted.id,
      stageId: upserted.stage_id,
      role: upserted.role,
      decision: upserted.decision,
      notes: upserted.notes,
      certifiedAmount: upserted.certified_amount,
      createdAt: upserted.created_at,
      approver: Array.isArray(upserted.approver) ? upserted.approver[0] : upserted.approver,
    },
  });
}
