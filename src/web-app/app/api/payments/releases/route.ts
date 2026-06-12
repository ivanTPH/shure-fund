/**
 * GET /api/payments/releases
 *
 * Cross-project released stage payments for the current user.
 * Returns all contract_stages with status='released' across projects
 * the user has access to, ordered by most recent first.
 *
 * Roles: funder, developer, admin
 * Others: 403
 *
 * Query params:
 *   limit?     — max records (default 200)
 *   projectId? — scope to one project
 *
 * Response:
 *   { releases: ReleaseItem[], summary: { totalReleased, totalStages, projectCount } }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

const ALLOWED_ROLES = ["funder", "developer", "admin"];

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const service = createServiceClient();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "200"), 500);
  const projectIdFilter = req.nextUrl.searchParams.get("projectId");

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

  if (projectIds.length === 0) {
    return NextResponse.json({ releases: [], summary: { totalReleased: 0, totalStages: 0, projectCount: 0 } });
  }

  if (projectIdFilter) {
    if (!projectIds.includes(projectIdFilter)) {
      return NextResponse.json({ error: "Project not found or access denied." }, { status: 403 });
    }
    projectIds = [projectIdFilter];
  }

  // Fetch released stages across all accessible projects
  const { data, error } = await service
    .from("contract_stages")
    .select(`
      id, name, value, status, end_date, retention_released_at,
      contract:contracts!contract_id (
        id, project_id,
        project:projects!project_id ( id, name, address, status )
      )
    `)
    .eq("status", "released")
    .order("end_date", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const releases = (data ?? [])
    .map((s) => {
      const contract = Array.isArray(s.contract) ? s.contract[0] : s.contract;
      if (!contract) return null;
      if (!projectIds.includes(contract.project_id)) return null;
      const project = Array.isArray(contract.project) ? contract.project[0] : contract.project;
      return {
        stageId: s.id,
        stageName: s.name,
        value: Number(s.value),
        endDate: s.end_date,
        retentionReleasedAt: s.retention_released_at,
        contractId: contract.id,
        projectId: contract.project_id,
        projectName: project?.name ?? null,
        projectAddress: project?.address ?? null,
        projectStatus: project?.status ?? null,
      };
    })
    .filter(Boolean);

  const totalReleased = releases.reduce((s, r) => s + (r?.value ?? 0), 0);
  const projectSet = new Set(releases.map((r) => r?.projectId));

  return NextResponse.json({
    releases,
    summary: {
      totalReleased,
      totalStages: releases.length,
      projectCount: projectSet.size,
    },
  });
}
