/**
 * GET   /api/projects/[projectId]  — fetch project details
 * PATCH /api/projects/[projectId]  — update project (name, address, status)
 *
 * Allows admin and developer to update project details.
 * Valid statuses: active, on_hold, completed, cancelled
 *
 * Body: { name?: string; address?: string; status?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/auth-server";

const VALID_STATUSES = ["active", "on_hold", "completed", "cancelled"] as const;
type ProjectStatus = typeof VALID_STATUSES[number];

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  const { data, error } = await service
    .from("projects")
    .select("id, name, address, status, created_at")
    .eq("id", projectId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  return NextResponse.json({ project: data });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin" && role !== "developer") {
    return NextResponse.json({ error: "Only admin and developer can update project settings." }, { status: 403 });
  }

  let body: { name?: string; address?: string; status?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, address, status } = body;

  if (status !== undefined && !(VALID_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  if (name !== undefined && name.trim().length === 0) {
    return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
  }

  if (!name && !address && !status) {
    return NextResponse.json({ error: "Provide at least one field: name, address, or status." }, { status: 400 });
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  const updates: Record<string, unknown> = {};
  if (name    !== undefined) updates.name    = name.trim();
  if (address !== undefined) updates.address = address.trim();
  if (status  !== undefined) updates.status  = status as ProjectStatus;

  const { data, error } = await service
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select("id, name, address, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  return NextResponse.json({ project: data });
}
