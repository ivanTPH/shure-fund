/**
 * GET  /api/projects/[projectId]/members  — list project members with full user detail
 * POST /api/projects/[projectId]/members  — add a member (admin/developer)
 * DELETE /api/projects/[projectId]/members?userId= — remove a member
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  const { data, error } = await service
    .from("project_members")
    .select(`
      id, role, is_primary, notes, created_at,
      member:users!user_id ( id, full_name, email, role ),
      delegate:users!delegated_to ( id, full_name, email )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admins or developers can manage project members" }, { status: 403 });
  }

  const { projectId } = await context.params;
  let body: { userId: string; role: string; isPrimary?: boolean; delegatedTo?: string; notes?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, role: memberRole, isPrimary = true, delegatedTo, notes } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!memberRole) return NextResponse.json({ error: "role required" }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("project_members")
    .upsert({
      project_id:   projectId,
      user_id:      userId,
      role:         memberRole,
      is_primary:   isPrimary,
      delegated_to: delegatedTo ?? null,
      notes:        notes ?? null,
    }, { onConflict: "project_id,user_id" })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data }, { status: 201 });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admins or developers can manage project members" }, { status: 403 });
  }

  const { projectId } = await context.params;
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
