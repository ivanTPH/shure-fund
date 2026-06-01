/**
 * POST /api/admin/invite
 *
 * Sends a Supabase invite email to a new user.
 * The invite email contains a magic link; on click the user lands on
 * /auth/callback which exchanges the token and redirects to /account/setup.
 *
 * The fn_handle_new_user DB trigger fires when Supabase creates the auth user,
 * writing a public.users row with the supplied role from invite metadata.
 *
 * Admin only.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

const VALID_ROLES = ["funder", "developer", "commercial", "contractor", "consultant", "admin"];

export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  let body: { email: string; role: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, role: inviteRole } = body;
  if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!inviteRole || !VALID_ROLES.includes(inviteRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const service = createServiceClient();

  const { data, error } = await service.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
    data: { role: inviteRole },
    redirectTo: `${origin}/auth/callback?next=/account/setup`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, userId: data.user?.id });
}
