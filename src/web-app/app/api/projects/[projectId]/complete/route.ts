/**
 * POST /api/projects/[projectId]/complete
 *
 * Marks a project as completed.
 *
 * Allowed: admin, developer
 * Validation:
 *   - Project must currently be 'active' or 'on_hold'
 *   - All contract_stages across all contracts must be 'released'
 *     (empty projects — no contracts — can be completed)
 *
 * Side effects:
 *   - Sets project.status = 'completed', project.completed_at, project.completed_by
 *   - Inserts audit_event (project_completed)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/auth-server";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin" && role !== "developer") {
    return NextResponse.json({ error: "Only admin and developer can complete a project." }, { status: 403 });
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  // Fetch project
  const { data: project } = await service
    .from("projects")
    .select("id, name, status")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (!["active", "on_hold"].includes(project.status)) {
    return NextResponse.json(
      { error: `Project is already '${project.status}' and cannot be completed.` },
      { status: 422 },
    );
  }

  // Check all stages are released
  const { data: contracts } = await service
    .from("contracts")
    .select(`contract_stages ( id, name, status )`)
    .eq("project_id", projectId);

  const unreleasedStages = (contracts ?? [])
    .flatMap((c) => c.contract_stages ?? [])
    .filter((s) => s.status !== "released");

  if (unreleasedStages.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot complete project: ${unreleasedStages.length} stage(s) have not been released.`,
        unreleased: unreleasedStages.map((s) => ({ id: s.id, name: s.name, status: s.status })),
      },
      { status: 422 },
    );
  }

  // Mark complete
  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await service
    .from("projects")
    .update({ status: "completed", completed_at: now, completed_by: user.id })
    .eq("id", projectId)
    .select("id, name, status, completed_at")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Audit log
  await service.from("audit_events").insert({
    project_id: projectId,
    actor_id:   user.id,
    action:     "project_completed",
    from_state: "active",
    to_state:   "completed",
    metadata:   { project_name: project.name },
  });

  return NextResponse.json({ project: updated });
}
