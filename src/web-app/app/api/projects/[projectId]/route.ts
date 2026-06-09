/**
 * PATCH /api/projects/[projectId]  — update project status
 *
 * Allows admin and developer to change a project's lifecycle status.
 * Valid statuses: active, on_hold, completed, cancelled
 *
 * Body: { status: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/auth-server";

const VALID_STATUSES = ["active", "on_hold", "completed", "cancelled"] as const;
type ProjectStatus = typeof VALID_STATUSES[number];

type RouteContext = { params: Promise<{ projectId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin" && role !== "developer") {
    return NextResponse.json({ error: "Only admin and developer can update project status." }, { status: 403 });
  }

  let body: { status?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status } = body;
  if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  const { data, error } = await service
    .from("projects")
    .update({ status: status as ProjectStatus })
    .eq("id", projectId)
    .select("id, name, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  return NextResponse.json({ project: data });
}
