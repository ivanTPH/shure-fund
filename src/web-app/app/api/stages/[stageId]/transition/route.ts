/**
 * POST /api/stages/[stageId]/transition
 *
 * Server-side workflow engine for contract stage transitions.
 * All validation runs here — the client is never trusted to determine
 * whether a transition is valid.
 *
 * Request body:
 *   { action: TransitionAction, reason?: string }
 *
 * Success response:
 *   200 { ok: true, from: StageStatus, to: StageStatus, action: TransitionAction }
 *
 * Error responses:
 *   400 — malformed request body
 *   401 — not authenticated
 *   403 — invalid transition, wrong role, or pre-condition failed
 *   404 — stage not found
 *   500 — unexpected DB error
 *
 * Audit trail: the DB trigger fn_audit_stage_transition fires automatically
 * on every status UPDATE to contract_stages, writing an immutable row to
 * audit_events. This handler does not need to write audit events manually.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import {
  validateTransition,
  isValidStatus,
  type StageStatus,
  type TransitionAction,
} from "@/lib/workflow/stateMachine";
import {
  notifyApprovalRequired,
  notifyPaymentReady,
  notifyEvidenceRequired,
  notifyFundingGap,
} from "@/lib/notifications/notificationService";

// ---------------------------------------------------------------------------
// Request body type
// ---------------------------------------------------------------------------

type TransitionRequest = {
  action: TransitionAction;
  reason?: string;
};

// ---------------------------------------------------------------------------
// Pre-condition checks — DB queries that run after validation passes
// ---------------------------------------------------------------------------

async function checkWalletCoversStage(
  stageId: string,
  stageValue: number,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<{ ok: boolean; reason: string }> {
  // Resolve project wallet via stage → contract → project → wallet
  const { data, error } = await supabase
    .from("contract_stages")
    .select(`
      value,
      contracts!inner (
        project_id,
        projects!inner (
          wallets!inner ( available_amount )
        )
      )
    `)
    .eq("id", stageId)
    .single();

  if (error || !data) {
    return { ok: false, reason: "Could not read wallet balance for this stage." };
  }

  // Navigate the nested join result
  const contract = Array.isArray(data.contracts) ? data.contracts[0] : data.contracts;
  const project = Array.isArray(contract?.projects) ? contract.projects[0] : contract?.projects;
  const wallet = Array.isArray(project?.wallets) ? project.wallets[0] : project?.wallets;
  const available: number = wallet?.available_amount ?? 0;

  if (available < stageValue) {
    return {
      ok: false,
      reason:
        `Wallet available balance (£${available.toLocaleString()}) is less than ` +
        `stage value (£${stageValue.toLocaleString()}). ` +
        `Funds must exist before work can progress.`,
    };
  }

  return { ok: true, reason: "" };
}

async function checkAllApprovalsGranted(
  stageId: string,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<{ ok: boolean; reason: string }> {
  const { data, error } = await supabase
    .from("approvals")
    .select("role, decision")
    .eq("stage_id", stageId);

  if (error) {
    return { ok: false, reason: "Could not read approval records for this stage." };
  }

  if (!data || data.length === 0) {
    return { ok: false, reason: "No approval records found. Approvals must be configured before release." };
  }

  const pending = data.filter((a) => a.decision !== "approved");
  if (pending.length > 0) {
    const roles = pending.map((a) => a.role).join(", ");
    return {
      ok: false,
      reason: `The following approvals are not yet granted: ${roles}. All approvals must be approved before the stage can be released.`,
    };
  }

  return { ok: true, reason: "" };
}

async function checkEvidenceUploaded(
  stageId: string,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<{ ok: boolean; reason: string }> {
  const { data, error } = await supabase
    .from("evidence")
    .select("id, status")
    .eq("stage_id", stageId)
    .neq("status", "rejected");

  if (error) {
    return { ok: false, reason: "Could not verify evidence records for this stage." };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      reason:
        "No evidence has been uploaded for this stage. " +
        "At least one evidence file must be submitted before moving to approval.",
    };
  }

  return { ok: true, reason: "" };
}

async function checkApprovalCertificateExists(
  stageId: string,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<{ ok: boolean; reason: string }> {
  const { data, error } = await supabase
    .from("stage_approval_completions")
    .select("stage_id")
    .eq("stage_id", stageId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "Could not verify approval completion record." };
  }

  if (!data) {
    return {
      ok: false,
      reason:
        "Approval completion record does not exist for this stage. " +
        "All required approvals must be granted before payment can be released.",
    };
  }

  return { ok: true, reason: "" };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ stageId: string }> },
) {
  // ---- 1. Authenticate ----
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorRole = getRole(user) as AppRole | null;
  if (!actorRole) {
    return NextResponse.json(
      { error: "Your account has no role assigned. Contact your administrator." },
      { status: 403 },
    );
  }

  // ---- 2. Parse request body ----
  let body: TransitionRequest;
  try {
    body = (await request.json()) as TransitionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { action, reason } = body;
  if (!action) {
    return NextResponse.json({ error: "Missing required field: action" }, { status: 400 });
  }

  // ---- 3. Resolve stageId ----
  const { stageId } = await context.params;

  // ---- 4. Load current stage from DB ----
  const serviceClient = createServiceClient();
  const { data: stage, error: stageError } = await serviceClient
    .from("contract_stages")
    .select("id, status, value, name")
    .eq("id", stageId)
    .single();

  if (stageError || !stage) {
    return NextResponse.json({ error: "Stage not found." }, { status: 404 });
  }

  if (!isValidStatus(stage.status)) {
    return NextResponse.json(
      { error: `Stage has unrecognised status: "${stage.status}"` },
      { status: 500 },
    );
  }

  const currentStatus = stage.status as StageStatus;

  // ---- 5. Pure state machine validation ----
  const validation = validateTransition(action, currentStatus, actorRole);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 403 });
  }

  const { rule } = validation;

  // ---- 6. Pre-condition checks ----
  for (const condition of rule.preConditions) {
    let check: { ok: boolean; reason: string };

    if (condition === "wallet_covers_stage_value") {
      check = await checkWalletCoversStage(stageId, stage.value, serviceClient);
    } else if (condition === "all_approvals_granted") {
      check = await checkAllApprovalsGranted(stageId, serviceClient);
    } else if (condition === "approval_certificate_exists") {
      check = await checkApprovalCertificateExists(stageId, serviceClient);
    } else if (condition === "evidence_uploaded") {
      check = await checkEvidenceUploaded(stageId, serviceClient);
    } else {
      // Unknown pre-condition — fail safe
      check = { ok: false, reason: `Unknown pre-condition: ${condition}` };
    }

    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 403 });
    }
  }

  // ---- 7. Execute the transition ----
  // The DB trigger fn_guard_funding_gate enforces the wallet gate at the DB layer.
  // The DB trigger fn_audit_stage_transition writes the immutable audit event.
  // We use the user client here so auth.uid() is set correctly in the triggers.
  const { error: updateError } = await userClient
    .from("contract_stages")
    .update({ status: rule.to })
    .eq("id", stageId);

  if (updateError) {
    // Detect funding gate violation raised by the DB trigger (errcode SF001)
    if (updateError.message.includes("FUNDING_GATE")) {
      return NextResponse.json(
        { error: "Funding gate: wallet balance is insufficient to start this stage." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: `Database error: ${updateError.message}` },
      { status: 500 },
    );
  }

  // ---- 8. Fire notifications (non-fatal) ----
  try {
    // Resolve project + contract for notification context
    const { data: stageCtx } = await serviceClient
      .from("contract_stages")
      .select("contracts!inner ( id, project_id )")
      .eq("id", stageId)
      .single();
    const contract = Array.isArray(stageCtx?.contracts) ? stageCtx.contracts[0] : stageCtx?.contracts;
    const projectId: string | null = contract?.project_id ?? null;
    const contractId: string | null = contract?.id ?? null;

    if (projectId) {
      if (rule.to === "awaiting_approval") {
        await notifyApprovalRequired(serviceClient, projectId, stageId, stage.name, contractId);
      } else if (rule.to === "available_to_release") {
        await notifyPaymentReady(serviceClient, projectId, stageId, stage.name, contractId);
      } else if (rule.to === "in_progress") {
        await notifyEvidenceRequired(serviceClient, projectId, stageId, stage.name, contractId);
      } else if (rule.to === "funding_gap") {
        await notifyFundingGap(serviceClient, projectId, stageId, stage.name, contractId);
      }
    }
  } catch { /* non-fatal — transitions must never fail due to notification errors */ }

  // ---- 9. Success ----
  return NextResponse.json({
    ok: true,
    stageId,
    stageName: stage.name,
    from: currentStatus,
    to: rule.to,
    action,
    reason: reason ?? null,
    actor: { id: user.id, email: user.email, role: actorRole },
  });
}

// ---------------------------------------------------------------------------
// GET /api/stages/[stageId]/transition — introspect available actions
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ stageId: string }> },
) {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorRole = getRole(user) as AppRole | null;
  const { stageId } = await context.params;

  const { data: stage } = await createServiceClient()
    .from("contract_stages")
    .select("id, status, name, value")
    .eq("id", stageId)
    .single();

  if (!stage || !isValidStatus(stage.status)) {
    return NextResponse.json({ error: "Stage not found." }, { status: 404 });
  }

  const { availableActions } = await import("@/lib/workflow/stateMachine");
  const actions = actorRole
    ? availableActions(stage.status as StageStatus, actorRole)
    : [];

  return NextResponse.json({
    stageId,
    stageName: stage.name,
    currentStatus: stage.status,
    actorRole,
    availableActions: actions,
  });
}
