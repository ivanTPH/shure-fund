/**
 * GET /api/notifications/summary
 *
 * Returns a lightweight summary for the current user's notification badge:
 *   { unread: number, actionRequired: number }
 *
 * - unread: notifications where read_at IS NULL
 * - actionRequired: subset where type indicates action needed
 *   (approval_required, release_ready, kyc_required, dispute_raised)
 *
 * Auth: authenticated users only. Non-authenticated → 401.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

const ACTION_TYPES = [
  "approval_required",
  "release_ready",
  "kyc_required",
  "dispute_raised",
  "variation_submitted",
  "stage_approved",
];

export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const role = getRole(user);
  if (!role) return NextResponse.json({ error: "No role." }, { status: 403 });

  const service = createServiceClient();

  const { data: notifications } = await service
    .from("notifications")
    .select("id, type, read")
    .eq("user_id", user.id);

  const unread = (notifications ?? []).filter((n) => !n.read).length;
  const actionRequired = (notifications ?? []).filter(
    (n) => !n.read && ACTION_TYPES.includes(n.type)
  ).length;

  return NextResponse.json({ unread, actionRequired });
}
