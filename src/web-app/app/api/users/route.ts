/**
 * GET /api/users?email=<email>
 *
 * Look up a user by email address. Used by the token holder management UI
 * to resolve a user ID from an email before adding them as a holder.
 *
 * Role restrictions: admin and developer only.
 * Returns: { user: { id, full_name, email, role } }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin" && role !== "developer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = req.nextUrl.searchParams.get("email")?.trim();
  if (!email) return NextResponse.json({ error: "email query param is required." }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("users")
    .select("id, full_name, email, role")
    .eq("email", email)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No user found with that email." }, { status: 404 });

  return NextResponse.json({ user: data });
}
