/**
 * GET /api/packages
 *
 * Cross-project work packages list for the current user.
 *
 * Uses a join query (packages → stages → contracts → projects) with
 * client-side project filtering to avoid URI-too-long on large `.in()` sets.
 *
 * Roles: all authenticated users
 * Query params:
 *   ?status=draft|active|on_hold|completed|all  (default: all)
 *   ?projectId=<uuid>     scope to one project
 *   ?assignedToMe=true    only packages assigned to the current user
 *   ?limit=<n>            max results (default: 100)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

const VALID_STATUSES = ["draft", "active", "on_hold", "completed"] as const;
type PackageStatus = (typeof VALID_STATUSES)[number];

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const statusParam  = searchParams.get("status") ?? "all";
  const projectParam = searchParams.get("projectId") ?? null;
  const assignedToMe = searchParams.get("assignedToMe") === "true";
  const limit        = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 200);

  if (statusParam !== "all" && !VALID_STATUSES.includes(statusParam as PackageStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: all, ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  // Determine accessible project IDs (small set — safe for .in())
  let allowedProjectIds: Set<string>;
  if (role === "admin") {
    allowedProjectIds = null as unknown as Set<string>; // sentinel: all projects
  } else if (role === "contractor") {
    const { data: c1 } = await service
      .from("contracts").select("project_id").eq("contractor_id", user.id);
    const { data: c2 } = await service
      .from("project_members").select("project_id").eq("user_id", user.id);
    allowedProjectIds = new Set([
      ...(c1 ?? []).map((c) => c.project_id),
      ...(c2 ?? []).map((m) => m.project_id),
    ]);
  } else {
    const { data } = await service
      .from("project_members").select("project_id").eq("user_id", user.id);
    allowedProjectIds = new Set((data ?? []).map((m) => m.project_id));
  }

  const scopedProjectId = projectParam;

  // Fetch all packages with stage → contract → project join
  // Limit is applied after client-side filtering, so fetch generously
  let pkgQuery = service
    .from("packages")
    .select(`
      id, name, value, status, created_at, stage_id, assigned_to,
      stage:contract_stages!packages_stage_id_fkey (
        id, name,
        contract:contracts!contract_stages_contract_id_fkey (
          id, project_id,
          project:projects!contracts_project_id_fkey ( id, name, address )
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (statusParam !== "all") {
    pkgQuery = pkgQuery.eq("status", statusParam as PackageStatus);
  }

  if (assignedToMe) {
    pkgQuery = pkgQuery.eq("assigned_to", user.id);
  }

  const { data, error } = await pkgQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch assignee names
  const assigneeIds = [...new Set(
    (data ?? []).map((p) => p.assigned_to).filter((id): id is string => Boolean(id)),
  )];
  const assigneeMap = new Map<string, { full_name: string; email: string }>();
  if (assigneeIds.length > 0) {
    const { data: users } = await service
      .from("users").select("id, full_name, email").in("id", assigneeIds);
    for (const u of users ?? []) {
      assigneeMap.set(u.id, { full_name: u.full_name, email: u.email });
    }
  }

  // Client-side filter + shape
  const packages: Array<{
    id: string; name: string; value: number; status: PackageStatus;
    createdAt: string; stageId: string; stageName: string | null;
    contractId: string | null; projectId: string | null;
    assigneeId: string | null; assigneeName: string | null; assigneeEmail: string | null;
  }> = [];

  for (const p of data ?? []) {
    const stage    = Array.isArray(p.stage) ? p.stage[0] : p.stage;
    const contract = stage ? (Array.isArray(stage.contract) ? stage.contract[0] : stage.contract) : null;
    const project  = contract ? (Array.isArray(contract.project) ? contract.project[0] : contract.project) : null;
    const projectId = project?.id ?? null;

    // Project access filter
    if (allowedProjectIds !== null && (!projectId || !allowedProjectIds.has(projectId))) continue;
    if (scopedProjectId && projectId !== scopedProjectId) continue;

    const assignee = p.assigned_to ? (assigneeMap.get(p.assigned_to) ?? null) : null;
    packages.push({
      id:            p.id,
      name:          p.name,
      value:         Number(p.value),
      status:        p.status as PackageStatus,
      createdAt:     p.created_at,
      stageId:       p.stage_id,
      stageName:     stage?.name ?? null,
      contractId:    contract?.id ?? null,
      projectId,
      assigneeId:    p.assigned_to ?? null,
      assigneeName:  assignee?.full_name ?? null,
      assigneeEmail: assignee?.email ?? null,
    });

    if (packages.length >= limit) break;
  }

  const summary = {
    total:     packages.length,
    active:    packages.filter((p) => p.status === "active").length,
    completed: packages.filter((p) => p.status === "completed").length,
    draft:     packages.filter((p) => p.status === "draft").length,
    on_hold:   packages.filter((p) => p.status === "on_hold").length,
  };

  return NextResponse.json({ packages, summary });
}
