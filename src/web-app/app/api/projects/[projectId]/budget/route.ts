/**
 * GET /api/projects/[projectId]/budget
 *
 * Budget vs actual analysis for all contracts on this project.
 *
 * Per stage returns:
 *   originalValue    — stage.value at creation
 *   variationImpact  — sum of approved variation value_changes
 *   currentValue     — originalValue + variationImpact
 *   certifiedAmount  — most conservative approved certified_amount
 *   paid             — amount released to contractor (0 if not released)
 *   retentionWithheld — 5% of paid if stage released
 *   retentionReleased — whether retention_released_at is set
 *   variance         — certifiedAmount - currentValue (negative = under-cert)
 *
 * Also returns per-contract and portfolio roll-up totals.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assertProjectAccess } from "@/lib/auth-server";
import { getRole } from "@/lib/auth";

const RETENTION_PCT = 0.05;
type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (getRole(user) === "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  // Fetch contracts + stages
  const { data: contracts, error } = await service
    .from("contracts")
    .select(`
      id, total_value, status,
      contractor:users!contractor_id ( id, full_name ),
      contract_stages (
        id, name, value, status, retention_released_at
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allStageIds = (contracts ?? []).flatMap((c) =>
    (c.contract_stages ?? []).map((s) => s.id),
  );

  // Batch fetch approvals + variations for all stages
  const [approvalRows, variationRows] = allStageIds.length
    ? await Promise.all([
        service
          .from("approvals")
          .select("stage_id, decision, certified_amount")
          .in("stage_id", allStageIds)
          .then((r) => r.data ?? []),
        service
          .from("variations")
          .select("stage_id, status, value_change")
          .in("stage_id", allStageIds)
          .eq("status", "approved")
          .then((r) => r.data ?? []),
      ])
    : [[], []];

  // Index by stage_id
  const approvalsByStage = new Map<string, typeof approvalRows>();
  for (const a of approvalRows) {
    if (!approvalsByStage.has(a.stage_id)) approvalsByStage.set(a.stage_id, []);
    approvalsByStage.get(a.stage_id)!.push(a);
  }
  const variationsByStage = new Map<string, typeof variationRows>();
  for (const v of variationRows) {
    if (!variationsByStage.has(v.stage_id)) variationsByStage.set(v.stage_id, []);
    variationsByStage.get(v.stage_id)!.push(v);
  }

  // Aggregate portfolio totals
  let portOriginal = 0;
  let portVariations = 0;
  let portCurrent = 0;
  let portCertified = 0;
  let portPaid = 0;
  let portRetentionHeld = 0;
  let portRetentionReleased = 0;

  const enrichedContracts = (contracts ?? []).map((c) => {
    const contractor = Array.isArray(c.contractor) ? c.contractor[0] : c.contractor;

    let cOriginal = 0, cVariations = 0, cCurrent = 0;
    let cCertified = 0, cPaid = 0, cRetentionHeld = 0, cRetentionReleased = 0;

    const stages = (c.contract_stages ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => {
        const stageApprovals = approvalsByStage.get(s.id) ?? [];
        const stageVariations = variationsByStage.get(s.id) ?? [];

        const originalValue = Number(s.value);

        // Approved variation impact
        const variationImpact = stageVariations.reduce((sum, v) => sum + Number(v.value_change), 0);
        const currentValue = originalValue + variationImpact;

        // Most conservative certified amount from approved approvals
        const certifiedAmounts = stageApprovals
          .filter((a) => a.decision === "approved" && a.certified_amount !== null)
          .map((a) => Number(a.certified_amount));
        const certifiedAmount = certifiedAmounts.length > 0
          ? Math.min(...certifiedAmounts)
          : null;

        // Paid = certified (or original) if released; else 0
        const isReleased = s.status === "released";
        const paid = isReleased ? (certifiedAmount ?? originalValue) : 0;

        // Retention
        const retentionWithheld = isReleased ? Math.round(paid * RETENTION_PCT * 100) / 100 : 0;
        const retentionReleased = isReleased && s.retention_released_at !== null;

        // Variance: how much the certified differs from current budget
        const variance = certifiedAmount !== null ? certifiedAmount - currentValue : null;

        // Accumulate contract totals
        cOriginal   += originalValue;
        cVariations += variationImpact;
        cCurrent    += currentValue;
        cCertified  += certifiedAmount ?? 0;
        cPaid       += paid;
        cRetentionHeld     += retentionWithheld;
        cRetentionReleased += retentionReleased ? retentionWithheld : 0;

        return {
          id: s.id,
          name: s.name,
          status: s.status,
          originalValue,
          variationImpact,
          currentValue,
          certifiedAmount,
          paid,
          retentionWithheld,
          retentionReleased,
          variance,
        };
      });

    // Accumulate portfolio totals
    portOriginal         += cOriginal;
    portVariations       += cVariations;
    portCurrent          += cCurrent;
    portCertified        += cCertified;
    portPaid             += cPaid;
    portRetentionHeld    += cRetentionHeld;
    portRetentionReleased += cRetentionReleased;

    return {
      id: c.id,
      contractorName: contractor?.full_name ?? "Unknown contractor",
      contractStatus: c.status,
      stages,
      summary: {
        originalTotal:    cOriginal,
        variationTotal:   cVariations,
        currentTotal:     cCurrent,
        certifiedTotal:   cCertified,
        paidTotal:        cPaid,
        pendingTotal:     cCurrent - cPaid,
        retentionHeld:    cRetentionHeld,
        retentionReleased: cRetentionReleased,
      },
    };
  });

  return NextResponse.json({
    contracts: enrichedContracts,
    portfolio: {
      originalTotal:    portOriginal,
      variationTotal:   portVariations,
      currentTotal:     portCurrent,
      certifiedTotal:   portCertified,
      paidTotal:        portPaid,
      pendingTotal:     portCurrent - portPaid,
      retentionHeld:    portRetentionHeld,
      retentionReleased: portRetentionReleased,
    },
  });
}
