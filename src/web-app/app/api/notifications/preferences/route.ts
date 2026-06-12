/**
 * GET  /api/notifications/preferences  — list user's notification preferences
 * PATCH /api/notifications/preferences — update one or more preferences
 *
 * Missing rows in the DB mean "use default" (both channels enabled).
 * GET always returns all known event types with current or default values.
 *
 * PATCH body:
 *   { preferences: Array<{ eventType: string; emailEnabled: boolean; pushEnabled: boolean }> }
 *
 * Auth: any authenticated user (own preferences only — enforced by RLS)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Canonical event types shown in preferences UI
export const NOTIFICATION_EVENT_TYPES = [
  "stage_status_changed",
  "evidence_submitted",
  "evidence_reviewed",
  "approval_given",
  "approval_rejected",
  "approval_returned",
  "all_approvals_complete",
  "release_completed",
  "release_failed",
  "wallet_funded",
  "dispute_opened",
  "dispute_resolved",
  "variation_requested",
  "variation_approved",
  "kyc_submitted",
  "kyc_approved",
  "kyc_rejected",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export type NotificationPreference = {
  eventType: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
};

export async function GET(_req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("notification_preferences")
    .select("event_type, email_enabled, push_enabled")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build a map of stored values
  const stored = new Map(
    (data ?? []).map((row) => [row.event_type, row]),
  );

  // Return all known types with current or default values
  const preferences: NotificationPreference[] = NOTIFICATION_EVENT_TYPES.map((eventType) => {
    const row = stored.get(eventType);
    return {
      eventType,
      emailEnabled: row ? row.email_enabled : true,
      pushEnabled:  row ? row.push_enabled  : true,
    };
  });

  return NextResponse.json({ preferences });
}

export async function PATCH(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { preferences?: Array<{ eventType: string; emailEnabled: boolean; pushEnabled: boolean }> };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { preferences } = body;
  if (!Array.isArray(preferences) || preferences.length === 0) {
    return NextResponse.json({ error: "preferences array is required." }, { status: 400 });
  }

  // Validate event types
  const validSet = new Set<string>(NOTIFICATION_EVENT_TYPES);
  for (const pref of preferences) {
    if (!pref.eventType || !validSet.has(pref.eventType)) {
      return NextResponse.json({ error: `Unknown event type: ${pref.eventType}` }, { status: 400 });
    }
    if (typeof pref.emailEnabled !== "boolean" || typeof pref.pushEnabled !== "boolean") {
      return NextResponse.json({ error: "emailEnabled and pushEnabled must be booleans." }, { status: 400 });
    }
  }

  const service = createServiceClient();

  const rows = preferences.map((pref) => ({
    user_id:       user.id,
    event_type:    pref.eventType,
    email_enabled: pref.emailEnabled,
    push_enabled:  pref.pushEnabled,
    updated_at:    new Date().toISOString(),
  }));

  const { error } = await service
    .from("notification_preferences")
    .upsert(rows, { onConflict: "user_id,event_type" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, updated: preferences.length });
}
