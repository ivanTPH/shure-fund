/**
 * Cross-project Approvals Hub — /approvals
 *
 * Shows every pending sign-off across all projects for the current user.
 * Role → approval_role mapping mirrors the per-stage approve page:
 *   commercial  → commercial
 *   consultant  → professional
 *   funder      → treasury
 *   developer   → treasury
 *   treasury    → treasury  (explicit role for clarity)
 *   admin       → all three approval roles
 *
 * The page fetches:
 *   1. The user's project memberships (project_ids)
 *   2. All awaiting_approval stages in those projects
 *   3. The pending approval row for the user's role on each of those stages
 *
 * Server component — no interactivity needed; the action buttons deep-link
 * to the per-stage approve page.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import AppShell from "../components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Maps an app role to its approval_role value(s). Admin gets all three. */
function toApprovalRoles(role: string): string[] | null {
  switch (role) {
    case "commercial":  return ["commercial"];
    case "consultant":  return ["professional"];
    case "professional":return ["professional"];
    case "treasury":    return ["treasury"];
    case "funder":
    case "developer":   return ["treasury"];
    case "admin":       return ["commercial", "professional", "treasury"];
    default:            return null;
  }
}

const ROLE_LABEL: Record<string, string> = {
  commercial:  "Commercial",
  professional: "Professional",
  treasury:    "Treasury",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PendingApproval = {
  approvalId: string;
  approvalRole: string;
  stageId: string;
  stageName: string;
  stageValue: number;
  stageStatus: string;
  stageEndDate: string | null;
  contractId: string;
  projectId: string;
  projectName: string;
  projectAddress: string;
  isOverdue: boolean;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ApprovalsPage() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/approvals");

  const role = getRole(user);
  const approvalRoles = role ? toApprovalRoles(role) : null;

  // Roles that have no approval responsibilities
  if (!approvalRoles) redirect("/projects");

  const service = createServiceClient();

  // 1. Get user's project IDs (project_members + funder/developer FK)
  let projectIds: string[] = [];

  if (role === "admin") {
    // Admin sees all projects
    const { data: allProjects } = await service.from("projects").select("id");
    projectIds = (allProjects ?? []).map(p => p.id);
  } else {
    const [{ data: memberships }, { data: projects }] = await Promise.all([
      service.from("project_members").select("project_id").eq("user_id", user.id),
      service.from("projects").select("id").or(`funder_id.eq.${user.id},developer_id.eq.${user.id}`),
    ]);
    const fromMembers = (memberships ?? []).map(m => m.project_id);
    const fromProjects = (projects ?? []).map(p => p.id);
    projectIds = [...new Set([...fromMembers, ...fromProjects])];
  }

  if (projectIds.length === 0) {
    return (
      <AppShell>
        <div className="px-4 py-10 max-w-xl mx-auto text-center">
          <p className="text-2xl font-bold mb-2" style={{ color: "var(--brand-navy, #0D1144)" }}>No projects</p>
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>You have no projects to review yet.</p>
        </div>
      </AppShell>
    );
  }

  // 2. Get all awaiting_approval stages in the user's projects
  const { data: awaitingStages } = await service
    .from("contract_stages")
    .select(`
      id, name, value, status, end_date,
      contract:contracts!contract_id (
        id, project_id,
        project:projects!project_id ( id, name, address )
      )
    `)
    .eq("status", "awaiting_approval")
    .in(
      "contract_id",
      // sub-select: contract_ids for the user's projects
      (await service
        .from("contracts")
        .select("id")
        .in("project_id", projectIds)
      ).data?.map(c => c.id) ?? [],
    );

  const stageIds = (awaitingStages ?? []).map(s => s.id);

  if (stageIds.length === 0) {
    return (
      <AppShell>
        <div className="px-4 py-8 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--brand-navy, #0D1144)" }}>Approvals</h1>
          <p className="text-sm mb-8" style={{ color: "rgba(13,17,68,0.5)" }}>Your pending sign-offs across all projects.</p>
          <div
            className="rounded-[20px] px-6 py-12 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-3xl mb-3">✓</p>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--brand-navy, #0D1144)" }}>All clear</p>
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>No stages are currently awaiting your sign-off.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // 3. Fetch pending approvals matching the user's role(s) for those stages
  const { data: pendingApprovals } = await service
    .from("approvals")
    .select("id, stage_id, role, decision")
    .in("stage_id", stageIds)
    .in("role", approvalRoles)
    .eq("decision", "pending");

  // Build a lookup: stageId → approval
  const approvalByStage = new Map(
    (pendingApprovals ?? []).map(a => [a.stage_id, a]),
  );

  // 4. Build the enriched approval list
  const items: PendingApproval[] = [];

  for (const stage of awaitingStages ?? []) {
    const approval = approvalByStage.get(stage.id);
    if (!approval) continue; // already signed off

    const contractRow = Array.isArray(stage.contract) ? stage.contract[0] : stage.contract;
    if (!contractRow) continue;
    const projectRow = Array.isArray(contractRow.project) ? contractRow.project[0] : contractRow.project;
    if (!projectRow) continue;

    const isOverdue = !!stage.end_date && new Date(stage.end_date) < new Date();

    items.push({
      approvalId:     approval.id,
      approvalRole:   approval.role,
      stageId:        stage.id,
      stageName:      stage.name,
      stageValue:     Number(stage.value),
      stageStatus:    stage.status,
      stageEndDate:   stage.end_date,
      contractId:     contractRow.id,
      projectId:      projectRow.id,
      projectName:    projectRow.name,
      projectAddress: projectRow.address ?? "",
      isOverdue,
    });
  }

  // Group by project
  const byProject = new Map<string, { name: string; address: string; items: PendingApproval[] }>();
  for (const item of items) {
    if (!byProject.has(item.projectId)) {
      byProject.set(item.projectId, { name: item.projectName, address: item.projectAddress, items: [] });
    }
    byProject.get(item.projectId)!.items.push(item);
  }

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Approvals</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
            {items.length} pending sign-off{items.length !== 1 ? "s" : ""} across your projects.
          </p>
        </div>

        {/* Project groups */}
        <div className="space-y-8">
          {[...byProject.entries()].map(([projectId, group]) => (
            <div key={projectId}>
              {/* Project heading */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <Link
                    href={`/projects/${projectId}`}
                    className="text-sm font-semibold transition hover:opacity-70"
                    style={{ color: "var(--brand-navy, #0D1144)" }}
                  >
                    {group.name}
                  </Link>
                  {group.address && (
                    <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{group.address}</p>
                  )}
                </div>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>
                  {group.items.length} pending
                </span>
              </div>

              {/* Stage cards */}
              <div className="space-y-2">
                {group.items.map((item) => {
                  const endStr = fmtDate(item.stageEndDate);
                  return (
                    <div
                      key={item.approvalId}
                      className="rounded-[20px] p-4"
                      style={{
                        border: item.isOverdue
                          ? "1px solid rgba(220,38,38,0.2)"
                          : "1px solid var(--surface-border, #e4e7f0)",
                        backgroundColor: item.isOverdue ? "rgba(220,38,38,0.04)" : "#fff",
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Role badge */}
                          <span
                            className="inline-block mb-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#7c3aed" }}
                          >
                            {ROLE_LABEL[item.approvalRole] ?? item.approvalRole} sign-off
                          </span>

                          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--brand-navy, #0D1144)" }}>
                            {item.stageName}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {item.isOverdue && (
                              <span className="text-[10px] font-bold" style={{ color: "#dc2626" }}>
                                ⚠ Overdue
                              </span>
                            )}
                            {endStr && (
                              <span className="text-[10px]" style={{ color: "rgba(13,17,68,0.45)" }}>
                                Due {endStr}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold mb-2" style={{ color: "var(--brand-navy, #0D1144)" }}>
                            {gbp.format(item.stageValue)}
                          </p>
                          <Link
                            href={`/projects/${item.projectId}/stages/${item.stageId}/approve`}
                            className="inline-block rounded-xl px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                            style={{
                              backgroundColor: "var(--brand-navy, #0D1144)",
                            }}
                          >
                            Sign off →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Admin: link to full audit log */}
        {role === "admin" && (
          <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
            <Link href="/audit-log" className="text-xs transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.45)" }}>
              View full audit log →
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
