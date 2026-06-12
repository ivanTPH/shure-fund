/**
 * GET  /api/stages/[stageId]/packages  — list work packages for a stage
 * POST /api/stages/[stageId]/packages  — create a new work package
 *
 * Work packages are sub-stage units of work, optionally assigned to a
 * subcontractor. Evidence can be linked to a specific package.
 *
 * Roles:
 *   GET:  any project participant
 *   POST: admin, developer, contractor (only on their own stages)
 *
 * POST body:
 *   name         string  (required)
 *   value        number  (required, > 0)
 *   assignedTo?  uuid    (user id — optional, must exist in users table)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ stageId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stageId } = await context.params;
  const service = createServiceClient();

  const { data, error } = await service
    .from("packages")
    .select(`
      id, name, value, status, created_at,
      assignee:users!assigned_to ( id, full_name, email, role ),
      evidence ( id, name, status, uploaded_at )
    `)
    .eq("stage_id", stageId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const packages = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    value: Number(p.value),
    status: p.status,
    createdAt: p.created_at,
    assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
    evidenceCount: Array.isArray(p.evidence) ? p.evidence.length : 0,
  }));

  return NextResponse.json({ packages });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role || !["admin", "developer", "contractor"].includes(role)) {
    return NextResponse.json({ error: "Forbidden — admin, developer, or contractor only." }, { status: 403 });
  }

  let body: { name?: string; value?: number; assignedTo?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { name, value, assignedTo } = body;
  if (!name?.trim()) return NextResponse.json({ error: "name is required." }, { status: 400 });
  if (!value || Number(value) <= 0) return NextResponse.json({ error: "value must be a positive number." }, { status: 400 });

  const { stageId } = await context.params;
  const service = createServiceClient();

  // Verify stage exists
  const { data: stage } = await service
    .from("contract_stages")
    .select("id, status")
    .eq("id", stageId)
    .maybeSingle();

  if (!stage) return NextResponse.json({ error: "Stage not found." }, { status: 404 });

  // Upsert user row for FK safety
  const meta = user.user_metadata ?? {};
  await service.from("users").upsert(
    { id: user.id, email: user.email ?? "", full_name: meta.full_name ?? user.email ?? "Unknown", role: meta.role ?? role },
    { onConflict: "id", ignoreDuplicates: false },
  );

  const { data, error } = await service
    .from("packages")
    .insert({
      stage_id:    stageId,
      name:        name.trim(),
      value:       Number(value),
      assigned_to: assignedTo ?? null,
      status:      "draft",
    })
    .select("id, name, value, status, created_at, assigned_to")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ package: data }, { status: 201 });
}
