/**
 * GET /api/evidence/pending
 *
 * Cross-project pending evidence queue.
 * Returns all evidence records with status='pending' across all projects
 * the current user has access to, ordered by upload date ascending.
 *
 * Roles allowed: commercial, consultant, professional, funder, developer, admin
 * Contractor / unauthenticated: 403 / 401
 *
 * Query params:
 *   limit?    — max records (default 100)
 *   projectId? — scope to one project
 *
 * Response:
 *   { items: PendingItem[], total: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

const REVIEWER_ROLES = ["commercial", "consultant", "professional", "funder", "developer", "admin"];

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role || !REVIEWER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden — reviewer roles only." }, { status: 403 });
  }

  const service = createServiceClient();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "100"), 200);
  const projectIdFilter = req.nextUrl.searchParams.get("projectId");

  // Get all projects this user is a member of (or all, for admin)
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
    return NextResponse.json({ items: [], total: 0 });
  }

  // If project scoped, verify membership
  if (projectIdFilter) {
    if (!projectIds.includes(projectIdFilter)) {
      return NextResponse.json({ error: "Project not found or access denied." }, { status: 403 });
    }
    projectIds = [projectIdFilter];
  }

  // Fetch pending evidence across all accessible projects
  // Join through contract_stages → contracts → projects to filter by project
  const { data, error } = await service
    .from("evidence")
    .select(`
      id, name, file_type, file_size, uploaded_at, notes,
      stage:contract_stages!stage_id (
        id, name, status, value,
        contract:contracts!contract_id (
          id, project_id,
          project:projects!project_id ( id, name, address )
        )
      ),
      uploader:users!uploaded_by ( id, full_name, email, role )
    `)
    .eq("status", "pending")
    .order("uploaded_at", { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter to projects this user can access + normalise nested arrays
  const items = (data ?? [])
    .map((ev) => {
      const stage = Array.isArray(ev.stage) ? ev.stage[0] : ev.stage;
      if (!stage) return null;
      const contract = Array.isArray(stage.contract) ? stage.contract[0] : stage.contract;
      if (!contract) return null;
      if (!projectIds.includes(contract.project_id)) return null;
      const project = Array.isArray(contract.project) ? contract.project[0] : contract.project;
      const uploader = Array.isArray(ev.uploader) ? ev.uploader[0] : ev.uploader;
      return {
        id: ev.id,
        name: ev.name,
        fileType: ev.file_type,
        fileSize: ev.file_size,
        uploadedAt: ev.uploaded_at,
        notes: ev.notes,
        stageId: stage.id,
        stageName: stage.name,
        stageStatus: stage.status,
        contractId: contract.id,
        projectId: contract.project_id,
        projectName: project?.name ?? null,
        projectAddress: project?.address ?? null,
        uploadedBy: uploader
          ? { id: uploader.id, fullName: uploader.full_name, email: uploader.email, role: uploader.role }
          : null,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items, total: items.length });
}
