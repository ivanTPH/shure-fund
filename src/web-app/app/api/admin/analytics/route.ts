/**
 * GET /api/admin/analytics
 *
 * Admin-only cross-project analytics:
 *  - Stage status distribution across all projects
 *  - Evidence review rates (pending vs reviewed)
 *  - Approval throughput (approved vs rejected vs returned per role)
 *  - Funding health overview (projects with gaps, total pof vs wallet)
 *  - Contract status distribution
 *
 * Admin only — 403 for all other roles.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin") return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const service = createServiceClient();

  // Fetch all data in parallel
  const [
    { data: stages },
    { data: evidence },
    { data: approvals },
    { data: wallets },
    { data: pof },
    { data: contracts },
    { data: projects },
  ] = await Promise.all([
    service.from("contract_stages").select("id, status, value"),
    service.from("evidence").select("id, status"),
    service.from("stage_approvals").select("id, decision, role"),
    service.from("wallets").select("project_id, balance, available_amount"),
    service.from("proof_of_funds").select("project_id, amount, status"),
    service.from("contracts").select("id, status"),
    service.from("projects").select("id, status"),
  ]);

  // Stage status distribution
  const stageStatuses: Record<string, number> = {};
  let totalStageValue = 0;
  let releasedValue = 0;
  for (const s of stages ?? []) {
    stageStatuses[s.status] = (stageStatuses[s.status] ?? 0) + 1;
    totalStageValue += Number(s.value);
    if (s.status === "released") releasedValue += Number(s.value);
  }

  // Evidence review rates
  const evidenceStatuses: Record<string, number> = {};
  for (const e of evidence ?? []) {
    evidenceStatuses[e.status] = (evidenceStatuses[e.status] ?? 0) + 1;
  }

  // Approval throughput by role and decision
  const approvalStats: Record<string, Record<string, number>> = {};
  for (const a of approvals ?? []) {
    if (!approvalStats[a.role]) approvalStats[a.role] = {};
    const byRole = approvalStats[a.role];
    byRole[a.decision] = (byRole[a.decision] ?? 0) + 1;
  }

  // Funding health
  const totalWalletBalance   = (wallets ?? []).reduce((s, w) => s + Number(w.balance), 0);
  const totalWalletAvailable = (wallets ?? []).reduce((s, w) => s + Number(w.available_amount), 0);
  const activePofTotal = (pof ?? [])
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + Number(p.amount), 0);

  // Contract status distribution
  const contractStatuses: Record<string, number> = {};
  for (const c of contracts ?? []) {
    contractStatuses[c.status] = (contractStatuses[c.status] ?? 0) + 1;
  }

  // Project status distribution
  const projectStatuses: Record<string, number> = {};
  for (const p of projects ?? []) {
    projectStatuses[p.status] = (projectStatuses[p.status] ?? 0) + 1;
  }

  return NextResponse.json({
    stages: {
      distribution: stageStatuses,
      totalCount: stages?.length ?? 0,
      totalValue: totalStageValue,
      releasedValue,
      releaseRate: totalStageValue > 0 ? releasedValue / totalStageValue : 0,
    },
    evidence: {
      distribution: evidenceStatuses,
      totalCount: evidence?.length ?? 0,
      pendingCount: evidenceStatuses["pending"] ?? 0,
      reviewedCount: (evidenceStatuses["accepted"] ?? 0) + (evidenceStatuses["rejected"] ?? 0) + (evidenceStatuses["requires_more"] ?? 0),
    },
    approvals: {
      byRole: approvalStats,
      totalCount: approvals?.length ?? 0,
    },
    funding: {
      totalWalletBalance,
      totalWalletAvailable,
      activePofTotal,
      tier1AndTier2Total: totalWalletBalance + activePofTotal,
    },
    contracts: {
      distribution: contractStatuses,
      totalCount: contracts?.length ?? 0,
    },
    projects: {
      distribution: projectStatuses,
      totalCount: projects?.length ?? 0,
    },
  });
}
