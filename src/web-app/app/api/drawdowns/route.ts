/**
 * GET /api/drawdowns
 *
 * Cross-project drawdown requests for the current user.
 * Returns all drawdown requests across all projects the user has access to.
 *
 * Roles: funder, developer, admin
 * Others: 403
 *
 * Query params:
 *   status?    — filter by status: pending | approved | rejected | withdrawn | all (default: all)
 *   projectId? — scope to one project
 *   limit?     — max records (default 200)
 *
 * Response:
 *   { requests: DrawdownItem[], summary: { total, pending, approved, rejected } }
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
  const statusFilter = req.nextUrl.searchParams.get("status") ?? "all";
  const projectIdFilter = req.nextUrl.searchParams.get("projectId");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "200"), 500);

  const VALID_STATUSES = ["pending", "approved", "rejected", "withdrawn"];
  if (statusFilter !== "all" && !VALID_STATUSES.includes(statusFilter)) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  }

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
    return NextResponse.json({ requests: [], summary: { total: 0, pending: 0, approved: 0, rejected: 0 } });
  }

  if (projectIdFilter) {
    if (!projectIds.includes(projectIdFilter)) {
      return NextResponse.json({ error: "Project not found or access denied." }, { status: 403 });
    }
    projectIds = [projectIdFilter];
  }

  let query = service
    .from("drawdown_requests")
    .select(`
      id, amount, description, status, created_at, reviewed_at, review_notes,
      project_id,
      project:projects!project_id ( id, name, address ),
      requester:users!requested_by ( id, full_name, email ),
      reviewer:users!reviewed_by ( id, full_name, email )
    `)
    .in("project_id", projectIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const requests = (data ?? []).map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewNotes: r.review_notes,
    projectId: r.project_id,
    projectName: (Array.isArray(r.project) ? r.project[0] : r.project)?.name ?? null,
    projectAddress: (Array.isArray(r.project) ? r.project[0] : r.project)?.address ?? null,
    requester: Array.isArray(r.requester) ? r.requester[0] : r.requester,
    reviewer: Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer,
  }));

  const summary = {
    total:    requests.length,
    pending:  requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return NextResponse.json({ requests, summary });
}
