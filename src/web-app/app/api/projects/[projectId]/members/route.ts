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
import { assertProjectAccess } from "@/lib/auth-server";

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

  // KYC gate: funders and contractors must have approved KYC before joining a project.
  // Admins and developers are internal staff and are exempt.
  const KYC_REQUIRED_ROLES = ["funder", "contractor"];
  if (KYC_REQUIRED_ROLES.includes(memberRole)) {
    const { data: targetUser } = await service
      .from("users")
      .select("kyc_status, full_name")
      .eq("id", userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (targetUser.kyc_status !== "approved") {
      const statusLabel: Record<string, string> = {
        not_started:    "has not started identity verification",
        pending_review: "has identity verification under review",
        rejected:       "failed identity verification",
        expired:        "has expired identity verification",
      };
      const reason = statusLabel[targetUser.kyc_status] ?? "has not completed identity verification";
      return NextResponse.json(
        {
          error: `${targetUser.full_name} ${reason}. KYC must be approved before assigning a ${memberRole} role on a project.`,
          kyc_status: targetUser.kyc_status,
        },
        { status: 403 }
      );
    }
  }

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
