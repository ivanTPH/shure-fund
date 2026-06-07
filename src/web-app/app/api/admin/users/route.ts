/**
 * GET /api/admin/users  — list all users (admin only)
 * PATCH /api/admin/users — update a user's role or active status (admin only)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("users")
    .select("id, full_name, email, role, active, kyc_status, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  let body: { userId: string; role?: string; active?: boolean; kyc_status?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, role: newRole, active, kyc_status } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (newRole !== undefined) update.role = newRole;
  if (active !== undefined) update.active = active;
  if (kyc_status !== undefined) {
    const validStatuses = ["not_started", "pending_review", "approved", "rejected", "expired"];
    if (!validStatuses.includes(kyc_status)) {
      return NextResponse.json({ error: `kyc_status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }
    update.kyc_status = kyc_status;
    if (kyc_status === "approved") {
      update.kyc_reviewed_at = new Date().toISOString();
      update.kyc_expires_at  = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.from("users").update(update).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep auth.user_metadata in sync so getRole() picks up role changes immediately
  // rather than waiting for the user's next JWT refresh.
  if (newRole !== undefined) {
    await service.auth.admin.updateUserById(userId, { user_metadata: { role: newRole } });
  }

  return NextResponse.json({ ok: true });
}
