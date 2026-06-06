/**
 * GET /api/admin/overview
 *
 * Aggregated cross-platform statistics for the admin dashboard.
 * Restricted to: admin only.
 *
 * Response shape:
 *   { totals, projects, recentActivity }
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const service = createServiceClient();

  // Fetch everything in parallel
  const [
    { data: projects },
    { data: wallets },
    { data: stages },
    { data: approvals },
    { data: disputes },
    { data: variations },
    { data: amlFlags },
    { data: kycPending },
    { data: recentEvents },
  ] = await Promise.all([
    service.from("projects").select("id, name, address, status, created_at").order("created_at", { ascending: false }),
    service.from("wallets").select("project_id, balance, available_amount, ringfenced_amount"),
    service.from("contract_stages").select(`
      id, status, value,
      contracts!inner ( project_id )
    `),
    service.from("approvals").select("id, stage_id, decision"),
    service.from("disputes").select("id, status, stage_id, disputed_value"),
    service.from("variations").select("id, status, stage_id, value_change"),
    service.from("aml_flags").select("id, status").in("status", ["pending", "flagged"]),
    service.from("kyc_submissions").select("id, kyc_status").eq("kyc_status", "pending_review"),
    service
      .from("audit_events")
      .select("id, event_type, description, created_at, project_id")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  // Build project-id → wallet lookup
  const walletByProject = new Map(
    (wallets ?? []).map(w => [w.project_id, w]),
  );

  // Build project-id → stage arrays
  type StageRow = { id: string; status: string; value: unknown; contracts: { project_id: string }[] | { project_id: string } };
  const stagesByProject = new Map<string, StageRow[]>();
  for (const s of stages ?? []) {
    const c = Array.isArray(s.contracts) ? s.contracts[0] : s.contracts;
    const pid = c?.project_id;
    if (!pid) continue;
    if (!stagesByProject.has(pid)) stagesByProject.set(pid, []);
    stagesByProject.get(pid)!.push(s);
  }

  // Build stage-id → project-id lookup for alert aggregation
  const projectByStage = new Map<string, string>();
  for (const s of stages ?? []) {
    const c = Array.isArray(s.contracts) ? s.contracts[0] : s.contracts;
    if (c?.project_id) projectByStage.set(s.id, c.project_id);
  }

  // Per-project alert counts
  const pendingApprovalsByProject = new Map<string, number>();
  for (const a of approvals ?? []) {
    if (a.decision !== "pending") continue;
    const pid = projectByStage.get(a.stage_id);
    if (pid) pendingApprovalsByProject.set(pid, (pendingApprovalsByProject.get(pid) ?? 0) + 1);
  }

  const activeDisputesByProject = new Map<string, number>();
  for (const d of disputes ?? []) {
    if (!["raised", "under_review"].includes(d.status)) continue;
    const pid = projectByStage.get(d.stage_id);
    if (pid) activeDisputesByProject.set(pid, (activeDisputesByProject.get(pid) ?? 0) + 1);
  }

  const pendingVariationsByProject = new Map<string, number>();
  for (const v of variations ?? []) {
    if (!["submitted", "under_review"].includes(v.status)) continue;
    const pid = projectByStage.get(v.stage_id);
    if (pid) pendingVariationsByProject.set(pid, (pendingVariationsByProject.get(pid) ?? 0) + 1);
  }

  // Build enriched project list
  const enrichedProjects = (projects ?? []).map(p => {
    const wallet = walletByProject.get(p.id);
    const pStages = stagesByProject.get(p.id) ?? [];

    const stageCounts = {
      total:             pStages.length,
      inProgress:        pStages.filter(s => s.status === "in_progress").length,
      awaitingApproval:  pStages.filter(s => s.status === "awaiting_approval").length,
      disputed:          pStages.filter(s => s.status === "disputed").length,
      released:          pStages.filter(s => s.status === "released").length,
      fundingGap:        pStages.filter(s => s.status === "funding_gap").length,
    };

    const contracted = pStages.reduce((sum, s) => sum + Number(s.value), 0);
    const released   = pStages.filter(s => s.status === "released").reduce((sum, s) => sum + Number(s.value), 0);

    return {
      id:      p.id,
      name:    p.name,
      address: p.address,
      status:  p.status,
      createdAt: p.created_at,
      wallet: {
        balance:    Number(wallet?.balance ?? 0),
        available:  Number(wallet?.available_amount ?? 0),
        ringfenced: Number(wallet?.ringfenced_amount ?? 0),
      },
      stages: stageCounts,
      financials: { contracted, released },
      alerts: {
        pendingApprovals:  pendingApprovalsByProject.get(p.id) ?? 0,
        activeDisputes:    activeDisputesByProject.get(p.id) ?? 0,
        pendingVariations: pendingVariationsByProject.get(p.id) ?? 0,
      },
    };
  });

  // Platform totals
  const totalWalletBalance    = enrichedProjects.reduce((s, p) => s + p.wallet.balance, 0);
  const totalWalletAvailable  = enrichedProjects.reduce((s, p) => s + p.wallet.available, 0);
  const totalContracted       = enrichedProjects.reduce((s, p) => s + p.financials.contracted, 0);
  const totalReleased         = enrichedProjects.reduce((s, p) => s + p.financials.released, 0);
  const totalPendingApprovals = enrichedProjects.reduce((s, p) => s + p.alerts.pendingApprovals, 0);
  const totalActiveDisputes   = enrichedProjects.reduce((s, p) => s + p.alerts.activeDisputes, 0);
  const totalPendingVariations = enrichedProjects.reduce((s, p) => s + p.alerts.pendingVariations, 0);

  // Fetch project names for recent events
  const projectNameMap = new Map((projects ?? []).map(p => [p.id, p.name]));

  const recentActivity = (recentEvents ?? []).map(e => ({
    id:          e.id,
    eventType:   e.event_type,
    description: e.description,
    createdAt:   e.created_at,
    projectId:   e.project_id,
    projectName: e.project_id ? (projectNameMap.get(e.project_id) ?? null) : null,
  }));

  return NextResponse.json({
    totals: {
      projects:          (projects ?? []).length,
      walletBalance:     totalWalletBalance,
      walletAvailable:   totalWalletAvailable,
      totalContracted,
      totalReleased,
      pendingApprovals:  totalPendingApprovals,
      activeDisputes:    totalActiveDisputes,
      pendingVariations: totalPendingVariations,
      amlFlags:          (amlFlags ?? []).length,
      pendingKyc:        (kycPending ?? []).length,
    },
    projects: enrichedProjects,
    recentActivity,
  });
}
