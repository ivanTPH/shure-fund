import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getRole } from "@/lib/auth";

const VALID_ROLES = ["funder", "developer", "commercial", "contractor", "consultant", "admin"];

// Roles a developer (project owner) is permitted to invite.
// Funders, developers, and admins must be invited by an admin to maintain
// financial oversight.
const DEVELOPER_INVITABLE_ROLES = ["commercial", "contractor", "consultant"];

/**
 * POST /api/admin/invite
 * Sends a Supabase email invitation.
 * - Admin: may invite any role.
 * - Developer: may invite contractor, commercial, and consultant only.
 * The fn_handle_new_user DB trigger creates the public.users row automatically
 * using raw_user_meta_data.role and raw_user_meta_data.full_name.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const role = getRole(user);

  if (role !== "admin" && role !== "developer") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email: string = (body.email ?? "").trim().toLowerCase();
  const inviteRole: string = body.role ?? "commercial";

  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (!VALID_ROLES.includes(inviteRole)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  // Developers may only invite operational roles — not financial or admin roles.
  if (role === "developer" && !DEVELOPER_INVITABLE_ROLES.includes(inviteRole)) {
    return NextResponse.json(
      { error: `Project owners can only invite: ${DEVELOPER_INVITABLE_ROLES.join(", ")}.` },
      { status: 403 },
    );
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!serviceKey) return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });

  const service = createServiceClient(serviceUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const origin = new URL(request.url).origin;
  const { error } = await service.auth.admin.inviteUserByEmail(email, {
    data: { role: inviteRole },
    redirectTo: `${origin}/auth/callback?next=/account/setup`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
