/**
 * GET /api/portfolio
 *
 * Cross-project financial portfolio summary for the current user.
 * Aggregates wallet balances, stage values, and funding positions
 * across all projects the user has access to.
 *
 * Roles: funder, developer, admin
 * Others: 403
 *
 * Response:
 *   { summary: PortfolioSummary, projects: ProjectSnapshot[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

const ALLOWED_ROLES = ["funder", "developer", "admin"];

export async function GET(_req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const service = createServiceClient();

  // Determine accessible projects
  let projectIds: string[] = [];
  if (role === "admin") {
    const { data } = await service.from("projects").select("id, name, address, status");
    projectIds = (data ?? []).map((p) => p.id);
  } else {
    const { data } = await service
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);
    projectIds = (data ?? []).map((m) => m.project_id);
  }

  if (projectIds.length === 0) {
    return NextResponse.json({
      summary: { totalProjects: 0, totalCommitted: 0, totalDrawn: 0, totalAvailable: 0, fundingGaps: 0 },
      projects: [],
    });
  }

  // Fetch projects
  const { data: projects } = await service
    .from("projects")
    .select("id, name, address, status")
    .in("id", projectIds);

  // Fetch wallets for all projects
  const { data: wallets } = await service
    .from("wallets")
    .select("project_id, balance, available_amount, ringfenced_amount")
    .in("project_id", projectIds);

  const walletMap = new Map(
    (wallets ?? []).map((w) => [w.project_id, w]),
  );

  // Fetch all stages across all projects
  const { data: stagesRaw } = await service
    .from("contract_stages")
    .select(`
      id, value, status,
      contract:contracts!contract_id ( project_id )
    `)
    .in("contracts.project_id", projectIds)
    .not("status", "in", '("draft","sent","cancelled")');

  // Group stages by project
  type StageRow = typeof stagesRaw extends (infer T)[] | null ? T : never;
  const stagesByProject = new Map<string, StageRow[]>();
  for (const s of stagesRaw ?? []) {
    const contract = Array.isArray(s.contract) ? s.contract[0] : s.contract;
    if (!contract) continue;
    const pid = contract.project_id;
    if (!stagesByProject.has(pid)) stagesByProject.set(pid, []);
    stagesByProject.get(pid)!.push(s);
  }

  // Fetch active PoF declarations
  const { data: pofRaw } = await service
    .from("proof_of_funds")
    .select("project_id, amount")
    .in("project_id", projectIds)
    .eq("status", "active");

  const pofByProject = new Map<string, number>();
  for (const p of pofRaw ?? []) {
    pofByProject.set(p.project_id, (pofByProject.get(p.project_id) ?? 0) + Number(p.amount));
  }

  // Build per-project snapshots
  const snapshots = (projects ?? []).map((proj) => {
    const wallet = walletMap.get(proj.id);
    const stages = stagesByProject.get(proj.id) ?? [];
    const pof = pofByProject.get(proj.id) ?? 0;

    const totalCommitted = stages.reduce((s, st) => s + Number(st.value), 0);
    const totalDrawn     = stages.filter((s) => s.status === "released").reduce((s, st) => s + Number(st.value), 0);
    const totalRingfenced = stages
      .filter((s) => ["in_progress", "awaiting_approval", "available_to_release"].includes(s.status))
      .reduce((s, st) => s + Number(st.value), 0);

    const walletBalance   = Number(wallet?.balance ?? 0);
    const walletAvailable = Number(wallet?.available_amount ?? 0);
    const fundingGap      = totalRingfenced > walletAvailable && walletAvailable < totalRingfenced;

    return {
      projectId:       proj.id,
      projectName:     proj.name,
      projectAddress:  proj.address,
      projectStatus:   proj.status,
      walletBalance,
      walletAvailable,
      totalCommitted,
      totalDrawn,
      totalRingfenced,
      pofTotal:        pof,
      hasFundingGap:   fundingGap,
      stageCount:      stages.length,
      releasedCount:   stages.filter((s) => s.status === "released").length,
      awaitingCount:   stages.filter((s) => s.status === "awaiting_approval").length,
    };
  });

  const summary = {
    totalProjects:   snapshots.length,
    totalCommitted:  snapshots.reduce((s, p) => s + p.totalCommitted, 0),
    totalDrawn:      snapshots.reduce((s, p) => s + p.totalDrawn, 0),
    totalAvailable:  snapshots.reduce((s, p) => s + p.walletAvailable, 0),
    totalPof:        snapshots.reduce((s, p) => s + p.pofTotal, 0),
    fundingGaps:     snapshots.filter((p) => p.hasFundingGap).length,
    awaitingApproval: snapshots.reduce((s, p) => s + p.awaitingCount, 0),
  };

  return NextResponse.json({ summary, projects: snapshots });
}
