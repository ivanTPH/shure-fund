import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /auth/logout — signs the user out and redirects to /auth/login.
 * Use a form with method="post" or a fetch POST to trigger this.
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}
