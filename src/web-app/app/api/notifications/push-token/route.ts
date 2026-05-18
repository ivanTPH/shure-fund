/**
 * POST /api/notifications/push-token
 *
 * Registers or clears the caller's Expo push token.
 * Called by the mobile app on startup (or when the user grants push permission).
 *
 * Body: { token: string }        — registers the token
 *       { token: null }          — clears the token (disable push)
 *
 * The token is stored in users.push_token and consumed by lib/notifications/pushService.ts.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { token: string | null };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token } = body;

  // token must be a non-empty string or explicitly null
  if (token !== null && (typeof token !== "string" || !token.trim())) {
    return NextResponse.json({ error: "token must be a non-empty string or null" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("users")
    .update({ push_token: token ?? null })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { error } = await service
    .from("users")
    .update({ push_token: null })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
