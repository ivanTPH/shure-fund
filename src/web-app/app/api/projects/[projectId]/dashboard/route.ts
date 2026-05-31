/**
 * GET /api/projects/[projectId]/dashboard
 *
 * Aggregated, single-shot endpoint for the role-aware project dashboard.
 * Returns everything all three role views need — the client picks what to render.
 *
 * Response shape:
 *   { project, wallet, contracts, summary }
 *
 * contracts[] each include stages[] with per-stage approval and evidence counts
 * so the client never has to fire N additional requests.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assertProjectAccess } from "@/lib/auth-server";

type RouteContext = { params: Promise<{ projectId: string }> };

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function nextAction(status: string): string {
  switch (status) {
    case "draft":                return "Send for review";
    case "sent":                 return "Waiting for acceptance";
    case "accepted":             return "Confirm funds to start work";
    case "in_progress":          return "Upload proof of work";
    case "awaiting_approval":    return "Sign off for payment";
    case "returned":             return "Contractor to fix and resubmit";
    case "disputed":             return "Dispute needs sorting — payment held";
    case "available_to_release": return "Release payment";
    case "released":             return "Payment released";
    case "funding_gap":          return "Add funds to continue";
    case "part_funded":          return "Finish adding funds";
    default:                     return status.replace(/_/g, " ");
  }
}

function isActive(status: string): boolean {
  return !["released", "draft"].includes(status);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, context: RouteContext) {
  // 1. Auth
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  // 2. Fetch project, wallet, and contracts in parallel
  const [
    { data: project, error: projErr },
    { data: wallet },
    { data: contracts, error: contractsErr },
  ] = await Promise.all([
    service.from("projects").select("id, name, address, status").eq("id", projectId).single(),
    service.from("wallets").select("balance, available_amount, ringfenced_amount").eq("project_id", projectId).maybeSingle(),
    service.from("contracts")
      .select(`
        id, contractor_id, total_value, status, created_at,
        contractor:users!contractor_id ( id, full_name, email ),
        contract_stages (
          id, name, description, value, status, start_date, end_date, created_at
        )
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
  ]);

  if (projErr || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (contractsErr) {
    return NextResponse.json({ error: contractsErr.message }, { status: 500 });
  }

  // Collect all stage IDs for batch queries
  const allStages = (contracts ?? []).flatMap((c) =>
    (c.contract_stages ?? []).map((s) => ({ ...s, contractId: c.id })),
  );
  const stageIds = allStages.map((s) => s.id);

  // 3. Fetch all stage-level data in parallel
  const [approvals, evidence, variations, disputes] = stageIds.length
    ? await Promise.all([
        service.from("approvals").select("stage_id, role, decision, certified_amount").in("stage_id", stageIds).then(r => r.data ?? []),
        service.from("evidence").select("stage_id, status").in("stage_id", stageIds).then(r => r.data ?? []),
        service.from("variations").select("stage_id, status, value_change").in("stage_id", stageIds).then(r => r.data ?? []),
        service.from("disputes").select("id, stage_id, status").in("stage_id", stageIds).then(r => r.data ?? []),
      ])
    : [[], [], [], []] as [unknown[], unknown[], unknown[], unknown[]];

  type ApprovalRow  = { stage_id: string; role: string; decision: string; certified_amount: number | null };
  type EvidenceRow  = { stage_id: string; status: string };
  type VariationRow = { stage_id: string; status: string; value_change: number };
  type DisputeRow   = { id: string; stage_id: string; status: string };

  // ---------------------------------------------------------------------------
  // Aggregate per-stage lookups
  // ---------------------------------------------------------------------------

  const approvalsByStage = new Map<string, ApprovalRow[]>();
  for (const a of approvals as ApprovalRow[]) {
    if (!approvalsByStage.has(a.stage_id)) approvalsByStage.set(a.stage_id, []);
    approvalsByStage.get(a.stage_id)!.push(a);
  }

  const evidenceByStage = new Map<string, EvidenceRow[]>();
  for (const e of evidence as EvidenceRow[]) {
    if (!evidenceByStage.has(e.stage_id)) evidenceByStage.set(e.stage_id, []);
    evidenceByStage.get(e.stage_id)!.push(e);
  }

  const variationsByStage = new Map<string, VariationRow[]>();
  for (const v of variations as VariationRow[]) {
    if (!variationsByStage.has(v.stage_id)) variationsByStage.set(v.stage_id, []);
    variationsByStage.get(v.stage_id)!.push(v);
  }

  const disputesByStage = new Map<string, DisputeRow[]>();
  for (const d of disputes as DisputeRow[]) {
    if (!disputesByStage.has(d.stage_id)) disputesByStage.set(d.stage_id, []);
    disputesByStage.get(d.stage_id)!.push(d);
  }

  // ---------------------------------------------------------------------------
  // Build enriched contracts response
  // ---------------------------------------------------------------------------

  let totalCommitted = 0;
  let totalDrawn = 0;
  let pendingApprovalsTotal = 0;
  let activeDisputesTotal = 0;
  let pendingVariationsTotal = 0;
  let stagesInProgress = 0;
  let stagesAwaiting = 0;
  let pendingEvidenceTotal = 0;

  // 30-day projected draw: stages starting within 30 days that aren't released
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  let projectedDraw30d = 0;

  const enrichedContracts = (contracts ?? []).map((c) => {
    const contractor = Array.isArray(c.contractor) ? c.contractor[0] : c.contractor;
    const stages = (c.contract_stages ?? []).map((s) => {
      const stageApprovals = approvalsByStage.get(s.id) ?? [];
      const stageEvidence = evidenceByStage.get(s.id) ?? [];
      const stageVariations = variationsByStage.get(s.id) ?? [];
      const stageDisputes = disputesByStage.get(s.id) ?? [];

      const pendingApprovals = stageApprovals.filter((a) => a.decision === "pending").length;
      const pendingEvidence = stageEvidence.filter((e) => e.status === "pending").length;
      const pendingVariations = stageVariations.filter((v) =>
        ["submitted", "under_review"].includes(v.status),
      ).length;
      const activeDisputeRecords = stageDisputes.filter((d) =>
        ["raised", "under_review"].includes(d.status),
      );
      const activeDisputes = activeDisputeRecords.length;
      const activeDisputeId = activeDisputeRecords[0]?.id ?? null;

      // Best certified amount: take the max from approved approvals that have one set
      const approvedCertified = stageApprovals
        .filter((a) => a.decision === "approved" && a.certified_amount !== null)
        .map((a) => Number(a.certified_amount));
      const certifiedAmount = approvedCertified.length > 0
        ? Math.min(...approvedCertified) // take conservative (smallest approved cert)
        : null;

      // Variation value impact: sum of approved variation value_changes
      const variationImpact = stageVariations
        .filter((v) => v.status === "approved")
        .reduce((sum, v) => sum + Number(v.value_change), 0);

      // Accumulate summary totals
      totalCommitted += Number(s.value);
      if (s.status === "released") totalDrawn += Number(s.value);
      pendingApprovalsTotal += pendingApprovals;
      activeDisputesTotal += activeDisputes;
      pendingVariationsTotal += pendingVariations;
      if (s.status === "in_progress") stagesInProgress++;
      if (s.status === "awaiting_approval") stagesAwaiting++;
      pendingEvidenceTotal += pendingEvidence;

      // Projected 30-day draw
      if (s.start_date && isActive(s.status)) {
        const start = new Date(s.start_date);
        if (start <= in30Days) projectedDraw30d += Number(s.value);
      }

      return {
        id: s.id,
        contractId: c.id,
        name: s.name,
        description: s.description,
        value: Number(s.value),
        status: s.status,
        startDate: s.start_date,
        endDate: s.end_date,
        certifiedAmount,
        variationImpact,
        pendingApprovals,
        pendingEvidence,
        pendingVariations,
        activeDisputes,
        activeDisputeId,
        nextAction: nextAction(s.status),
      };
    });

    return {
      id: c.id,
      contractorId: c.contractor_id,
      contractorName: contractor?.full_name ?? "Unknown contractor",
      contractorEmail: contractor?.email ?? null,
      totalValue: Number(c.total_value),
      status: c.status,
      stages,
    };
  });

  // ---------------------------------------------------------------------------
  // Funding gap warning: wallet available < projected 30-day draw
  // ---------------------------------------------------------------------------
  const walletAvailable = Number(wallet?.available_amount ?? 0);
  const walletBalance = Number(wallet?.balance ?? 0);
  const walletRingfenced = Number(wallet?.ringfenced_amount ?? 0);
  const fundingGapWarning = walletAvailable < projectedDraw30d;

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      address: project.address,
      status: project.status,
    },
    wallet: {
      balance: walletBalance,
      available: walletAvailable,
      ringfenced: walletRingfenced,
    },
    contracts: enrichedContracts,
    summary: {
      totalCommitted,
      totalDrawn,
      totalRemaining: totalCommitted - totalDrawn,
      pendingApprovals: pendingApprovalsTotal,
      activeDisputes: activeDisputesTotal,
      pendingVariations: pendingVariationsTotal,
      stagesInProgress,
      stagesAwaiting,
      pendingEvidence: pendingEvidenceTotal,
      projectedDraw30d,
      fundingGapWarning,
    },
  });
}
