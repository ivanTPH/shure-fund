/**
 * GET /api/contracts
 *
 * Cross-project contracts list for the current user.
 *
 * Roles: all authenticated users
 * - admin: all contracts across all projects
 * - others: contracts from projects they are members of
 *
 * Query params:
 *   ?status=draft|issued|accepted|active|completed|cancelled|all  (default: all)
 *   ?projectId=<uuid>   scope to one project
 *   ?limit=<n>          max results (default: 100)
 *
 * Response:
 *   {
 *     contracts: ContractItem[],
 *     summary: { total, active, draft, issued, accepted, completed, cancelled }
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

const VALID_STATUSES = ["draft", "issued", "accepted", "active", "completed", "cancelled"] as const;
type ContractStatus = (typeof VALID_STATUSES)[number];

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const statusParam  = searchParams.get("status") ?? "all";
  const projectParam = searchParams.get("projectId") ?? null;
  const limit        = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 200);

  if (statusParam !== "all" && !VALID_STATUSES.includes(statusParam as ContractStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: all, ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  // Determine accessible project IDs
  let projectIds: string[] = [];
  if (role === "admin") {
    const { data } = await service.from("projects").select("id");
    projectIds = (data ?? []).map((p) => p.id);
  } else {
    const { data } = await service
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);
    projectIds = (data ?? []).map((m) => m.project_id);
  }

  if (projectParam) {
    if (!projectIds.includes(projectParam)) {
      return NextResponse.json({ contracts: [], summary: zeroSummary() });
    }
    projectIds = [projectParam];
  }

  if (projectIds.length === 0) {
    return NextResponse.json({ contracts: [], summary: zeroSummary() });
  }

  // Build query
  let query = service
    .from("contracts")
    .select(`
      id, status, total_value, created_at,
      project:projects!project_id ( id, name, address ),
      contractor:users!contractor_id ( id, full_name, email ),
      contract_stages ( id, status )
    `)
    .in("project_id", projectIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusParam !== "all") {
    query = query.eq("status", statusParam as ContractStatus);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contracts = (data ?? []).map((c) => {
    const project    = Array.isArray(c.project) ? c.project[0] : c.project;
    const contractor = Array.isArray(c.contractor) ? c.contractor[0] : c.contractor;
    const stages     = Array.isArray(c.contract_stages) ? c.contract_stages : [];
    return {
      id:               c.id,
      status:           c.status as ContractStatus,
      totalValue:       Number(c.total_value ?? 0),
      createdAt:        c.created_at,
      projectId:        project?.id ?? null,
      projectName:      project?.name ?? null,
      projectAddress:   project?.address ?? null,
      contractorId:     contractor?.id ?? null,
      contractorName:   contractor?.full_name ?? null,
      contractorEmail:  contractor?.email ?? null,
      stageCount:       stages.length,
      activeStages:     stages.filter((s) => s.status === "in_progress" || s.status === "awaiting_approval").length,
      releasedStages:   stages.filter((s) => s.status === "released").length,
    };
  });

  // Summary counts across ALL statuses (ignoring the status filter for summary)
  const summary = buildSummary(contracts, statusParam);

  return NextResponse.json({ contracts, summary });
}

function zeroSummary() {
  return { total: 0, active: 0, draft: 0, issued: 0, accepted: 0, completed: 0, cancelled: 0 };
}

function buildSummary(
  contracts: Array<{ status: string }>,
  _filter: string,
) {
  const counts: Record<string, number> = {};
  for (const c of contracts) {
    counts[c.status] = (counts[c.status] ?? 0) + 1;
  }
  return {
    total:     contracts.length,
    active:    counts["active"]    ?? 0,
    draft:     counts["draft"]     ?? 0,
    issued:    counts["issued"]    ?? 0,
    accepted:  counts["accepted"]  ?? 0,
    completed: counts["completed"] ?? 0,
    cancelled: counts["cancelled"] ?? 0,
  };
}
