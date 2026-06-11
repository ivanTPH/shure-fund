/**
 * POST /api/projects/[projectId]/approvals/bulk
 *
 * Submit the same approval decision across multiple stages in a single request.
 * Useful for commercial/admin reviewers processing many awaiting stages at once.
 *
 * Body:
 *   stageIds:        string[]           — stages to approve (must all be awaiting_approval)
 *   decision:        "approved"|"rejected"|"returned"
 *   notes?:          string             — required when decision = "returned"
 *   certifiedAmount?: number            — applied to all stages (or use certifiedAmounts map)
 *   certifiedAmounts?: Record<stageId, number> — per-stage override
 *   roleOverride?:   "commercial"|"professional"|"treasury"  — admin only
 *
 * Returns:
 *   { results: [{stageId, success, error?}], succeeded, failed }
 *
 * Roles: commercial, consultant, funder, developer, admin
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import { notifyApprovalDecision } from "@/lib/notifications/notificationService";

type ApprovalRole = "commercial" | "professional" | "treasury";
type ApprovalDecision = "approved" | "rejected" | "returned";

function toApprovalRole(appRole: AppRole | string): ApprovalRole | null {
  switch (appRole) {
    case "commercial":   return "commercial";
    case "consultant":
    case "professional": return "professional";
    case "funder":
    case "developer":
    case "treasury":     return "treasury";
    case "admin":        return "treasury"; // body may override
    default:             return null;
  }
}

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  // 1. Auth
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appRole = getRole(user) as AppRole | null;
  if (!appRole) return NextResponse.json({ error: "No role assigned." }, { status: 403 });

  if (appRole === "contractor") {
    return NextResponse.json({ error: "Contractors cannot submit bulk approvals." }, { status: 403 });
  }

  // 2. Parse body
  let body: {
    stageIds?: string[];
    decision?: string;
    notes?: string;
    certifiedAmount?: number;
    certifiedAmounts?: Record<string, number>;
    roleOverride?: string;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { stageIds, decision, notes, certifiedAmount, certifiedAmounts, roleOverride } = body;

  if (!Array.isArray(stageIds) || stageIds.length === 0) {
    return NextResponse.json({ error: "stageIds must be a non-empty array." }, { status: 400 });
  }
  if (stageIds.length > 50) {
    return NextResponse.json({ error: "Maximum 50 stages per bulk request." }, { status: 400 });
  }
  if (!decision || !["approved", "rejected", "returned"].includes(decision)) {
    return NextResponse.json({ error: "decision must be one of: approved, rejected, returned" }, { status: 400 });
  }
  if (decision === "returned" && !notes?.trim()) {
    return NextResponse.json({ error: "notes are required when returning stages." }, { status: 400 });
  }

  // 3. Resolve approval role
  let approvalRole: ApprovalRole | null = toApprovalRole(appRole);
  if (appRole === "admin" && roleOverride && ["commercial", "professional", "treasury"].includes(roleOverride)) {
    approvalRole = roleOverride as ApprovalRole;
  }
  if (!approvalRole) {
    return NextResponse.json({ error: `Role "${appRole}" cannot submit approvals.` }, { status: 403 });
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  // 4. Fetch all stages — verify they belong to this project and are awaiting_approval
  const { data: stages, error: stagesErr } = await service
    .from("contract_stages")
    .select("id, name, status, contract_id, contracts!inner(id, project_id)")
    .in("id", stageIds)
    .eq("contracts.project_id", projectId);

  if (stagesErr) return NextResponse.json({ error: stagesErr.message }, { status: 500 });

  const foundIds = new Set((stages ?? []).map(s => s.id));

  // 5. Ensure user row exists
  await service.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Unknown",
      role: appRole,
    },
    { onConflict: "id", ignoreDuplicates: false },
  );

  // 6. Process each stage
  const results: Array<{ stageId: string; success: boolean; error?: string }> = [];

  for (const stageId of stageIds) {
    // Stage not found / doesn't belong to project
    if (!foundIds.has(stageId)) {
      results.push({ stageId, success: false, error: "Stage not found or not on this project." });
      continue;
    }

    const stage = (stages ?? []).find(s => s.id === stageId)!;

    if (stage.status !== "awaiting_approval") {
      results.push({ stageId, success: false, error: `Stage status is "${stage.status}", not awaiting_approval.` });
      continue;
    }

    // Per-stage certified amount (map takes priority over global)
    const stageCertified = certifiedAmounts?.[stageId] ?? certifiedAmount ?? null;

    const { error: upsertErr } = await service
      .from("approvals")
      .upsert(
        {
          stage_id: stageId,
          approved_by: user.id,
          role: approvalRole,
          decision: decision as ApprovalDecision,
          notes: notes?.trim() ?? null,
          certified_amount: stageCertified,
        },
        { onConflict: "stage_id,role" },
      );

    if (upsertErr) {
      results.push({ stageId, success: false, error: upsertErr.message });
      continue;
    }

    // Fire notification (non-fatal)
    try {
      const contract = Array.isArray(stage.contracts) ? stage.contracts[0] : stage.contracts;
      await notifyApprovalDecision(
        service,
        projectId,
        stageId,
        stage.name,
        stage.contract_id,
        decision as ApprovalDecision,
        approvalRole,
      );
    } catch { /* non-fatal */ }

    results.push({ stageId, success: true });
  }

  const succeeded = results.filter(r => r.success).length;
  const failed    = results.filter(r => !r.success).length;

  return NextResponse.json({ results, succeeded, failed });
}
