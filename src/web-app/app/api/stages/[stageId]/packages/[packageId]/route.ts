/**
 * PATCH /api/stages/[stageId]/packages/[packageId]
 *
 * Update a work package's status or assignment.
 *
 * Body:
 *   status?     "draft" | "active" | "on_hold" | "completed"
 *   assignedTo? uuid | null
 *   name?       string
 *
 * Roles: admin, developer, contractor (only on their assigned packages)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ stageId: string; packageId: string }> };

const VALID_STATUSES = ["draft", "active", "on_hold", "completed"] as const;
type PackageStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role || !["admin", "developer", "contractor"].includes(role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { status?: string; assignedTo?: string | null; name?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { status, assignedTo, name } = body;

  if (status !== undefined && !VALID_STATUSES.includes(status as PackageStatus)) {
    return NextResponse.json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
    }, { status: 400 });
  }

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
  }

  const { stageId, packageId } = await context.params;
  const service = createServiceClient();

  // Verify package belongs to stage
  const { data: pkg } = await service
    .from("packages")
    .select("id, stage_id, assigned_to, status")
    .eq("id", packageId)
    .eq("stage_id", stageId)
    .maybeSingle();

  if (!pkg) return NextResponse.json({ error: "Package not found." }, { status: 404 });

  // Contractors can only update packages assigned to them
  if (role === "contractor" && pkg.assigned_to !== user.id) {
    return NextResponse.json({ error: "You can only update packages assigned to you." }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined)     updates.status = status;
  if (assignedTo !== undefined) updates.assigned_to = assignedTo;
  if (name !== undefined)       updates.name = name.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data, error } = await service
    .from("packages")
    .update(updates)
    .eq("id", packageId)
    .select("id, name, value, status, assigned_to")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ package: data });
}
