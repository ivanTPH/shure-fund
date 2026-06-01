import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/account
 * Updates the authenticated user's profile in public.users.
 * Used by the account setup page after invite.
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const fullName: string = (body.full_name ?? "").trim();
  if (!fullName) return NextResponse.json({ error: "full_name is required." }, { status: 400 });

  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
