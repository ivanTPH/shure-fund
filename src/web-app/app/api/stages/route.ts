/**
 * GET /api/stages
 *
 * Cross-project stage list for the current user.
 *
 * Roles: all authenticated users
 * - admin/developer/funder: stages from all accessible projects
 * - contractor: stages from contracts where they are the contractor
 * - commercial/consultant: stages from projects they are members of
 *
 * Query params:
 *   ?status=<stage_status>|all       (default: all)
 *   ?projectId=<uuid>                 scope to one project
 *   ?contractId=<uuid>                scope to one contract
 *   ?awaitingApproval=true            only awaiting_approval stages
 *   ?limit=<n>                        max results (default: 100)
 *
 * Response:
 *   {
 *     stages: StageItem[],
 *     summary: { total, in_progress, awaiting_approval, available_to_release, released }
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

const VALID_STATUSES = [
  "draft", "sent", "accepted", "in_progress", "awaiting_approval",
  "available_to_release", "released", "on_hold", "cancelled",
] as const;
type StageStatus = (typeof VALID_STATUSES)[number];

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const statusParam       = searchParams.get("status") ?? "all";
  const projectParam      = searchParams.get("projectId") ?? null;
  const contractParam     = searchParams.get("contractId") ?? null;
  const awaitingApproval  = searchParams.get("awaitingApproval") === "true";
  const limit             = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 200);

  if (statusParam !== "all" && !VALID_STATUSES.includes(statusParam as StageStatus)) {
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
  } else if (role === "contractor") {
    // Contractors see stages from contracts they are assigned to
    const { data } = await service
      .from("contracts")
      .select("project_id")
      .eq("contractor_id", user.id);
    projectIds = [...new Set((data ?? []).map((c) => c.project_id))];
  } else {
    const { data } = await service
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);
    projectIds = (data ?? []).map((m) => m.project_id);
  }

  if (projectParam) {
    if (!projectIds.includes(projectParam)) {
      return NextResponse.json({ stages: [], summary: zeroSummary() });
    }
    projectIds = [projectParam];
  }

  if (projectIds.length === 0) {
    return NextResponse.json({ stages: [], summary: zeroSummary() });
  }

  // Build query from contracts → stages
  let contractQuery = service
    .from("contracts")
    .select("id, project_id, status")
    .in("project_id", projectIds);

  if (contractParam) {
    contractQuery = contractQuery.eq("id", contractParam);
  }

  const { data: contractRows } = await contractQuery;
  const contractIds = (contractRows ?? []).map((c) => c.id);
  const contractMap = new Map(
    (contractRows ?? []).map((c) => [c.id, c]),
  );

  if (contractIds.length === 0) {
    return NextResponse.json({ stages: [], summary: zeroSummary() });
  }

  // Fetch project names
  const { data: projectRows } = await service
    .from("projects")
    .select("id, name, address")
    .in("id", projectIds);
  const projectMap = new Map(
    (projectRows ?? []).map((p) => [p.id, p]),
  );

  // Build stages query
  let stageQuery = service
    .from("contract_stages")
    .select("id, name, description, value, status, start_date, end_date, created_at, contract_id")
    .in("contract_id", contractIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (awaitingApproval) {
    stageQuery = stageQuery.eq("status", "awaiting_approval");
  } else if (statusParam !== "all") {
    stageQuery = stageQuery.eq("status", statusParam as StageStatus);
  }

  const { data, error } = await stageQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stages = (data ?? []).map((s) => {
    const contract  = contractMap.get(s.contract_id);
    const projectId = contract?.project_id ?? null;
    const project   = projectId ? (projectMap.get(projectId) ?? null) : null;
    return {
      id:              s.id,
      name:            s.name,
      description:     s.description ?? null,
      value:           Number(s.value),
      status:          s.status as StageStatus,
      startDate:       s.start_date ?? null,
      endDate:         s.end_date ?? null,
      createdAt:       s.created_at,
      contractId:      s.contract_id,
      contractStatus:  contract?.status ?? null,
      projectId:       projectId,
      projectName:     project?.name ?? null,
      projectAddress:  project?.address ?? null,
    };
  });

  const s = stages.reduce((acc, st) => {
    acc[st.status] = (acc[st.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summary = {
    total:                 stages.length,
    in_progress:           s["in_progress"]           ?? 0,
    awaiting_approval:     s["awaiting_approval"]     ?? 0,
    available_to_release:  s["available_to_release"]  ?? 0,
    released:              s["released"]               ?? 0,
  };

  return NextResponse.json({ stages, summary });
}

function zeroSummary() {
  return { total: 0, in_progress: 0, awaiting_approval: 0, available_to_release: 0, released: 0 };
}
