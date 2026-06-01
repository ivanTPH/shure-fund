import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase OAuth / Magic Link PKCE callback.
 * Handles two flows:
 *  1. PKCE code exchange — OAuth providers and magic links
 *  2. Token-hash (OTP) — email invitations sent via inviteUserByEmail
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code        = searchParams.get("code");
  const token_hash  = searchParams.get("token_hash");
  const type        = searchParams.get("type");
  const next        = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  // Flow 1 — PKCE code exchange (OAuth / magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // Flow 2 — token-hash OTP (email invite)
  if (token_hash && type) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // All flows failed — redirect to login with an error hint.
  const errorUrl = new URL("/auth/login", origin);
  errorUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(errorUrl);
}
