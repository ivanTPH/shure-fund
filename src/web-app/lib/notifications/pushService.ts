/**
 * lib/notifications/pushService.ts
 *
 * Sends Expo push notifications to mobile devices.
 * Reads push tokens from the `users.push_token` column.
 *
 * Must only be called from trusted server-side code (service role client).
 * Uses Expo's push API — no native SDK required server-side.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
};

async function sendExpoPushMessages(messages: ExpoPushMessage[]): Promise<void> {
  if (!messages.length) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch {
    // Non-fatal — push failure should never block the main flow
  }
}

async function getPushTokensForUsers(db: Db, userIds: string[]): Promise<{ id: string; push_token: string }[]> {
  if (!userIds.length) return [];
  const { data } = await db
    .from("users")
    .select("id, push_token")
    .in("id", userIds)
    .not("push_token", "is", null)
    .eq("active", true);
  return (data ?? []).filter((u) => u.push_token) as { id: string; push_token: string }[];
}

async function getPushTokensForRoles(db: Db, roles: string[]): Promise<{ id: string; push_token: string }[]> {
  if (!roles.length) return [];
  const { data } = await db
    .from("users")
    .select("id, push_token")
    .in("role", roles)
    .not("push_token", "is", null)
    .eq("active", true);
  return (data ?? []).filter((u) => u.push_token) as { id: string; push_token: string }[];
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export async function pushToUsers(
  db: Db,
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const users = await getPushTokensForUsers(db, userIds);
  const messages: ExpoPushMessage[] = users.map((u) => ({
    to: u.push_token,
    title,
    body,
    data,
    sound: "default",
  }));
  await sendExpoPushMessages(messages);
}

export async function pushToRoles(
  db: Db,
  roles: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const users = await getPushTokensForRoles(db, roles);
  const messages: ExpoPushMessage[] = users.map((u) => ({
    to: u.push_token,
    title,
    body,
    data,
    sound: "default",
  }));
  await sendExpoPushMessages(messages);
}

// ---------------------------------------------------------------------------
// Domain-specific push helpers (mirror notificationService pattern)
// ---------------------------------------------------------------------------

export async function pushVariationSubmitted(db: Db, stageName: string, projectId: string): Promise<void> {
  await pushToRoles(db, ["commercial", "developer", "admin"],
    "New variation submitted",
    `A variation for stage "${stageName}" is awaiting review.`,
    { projectId, type: "variation_submitted" },
  );
}

export async function pushVariationApproved(db: Db, stageName: string, requesterId: string, projectId: string): Promise<void> {
  await pushToUsers(db, [requesterId],
    "Variation approved",
    `Your variation for "${stageName}" has been approved and is awaiting funding confirmation.`,
    { projectId, type: "variation_approved" },
  );
}

export async function pushVariationRejected(db: Db, stageName: string, requesterId: string, projectId: string): Promise<void> {
  await pushToUsers(db, [requesterId],
    "Variation rejected",
    `Your variation for "${stageName}" has been rejected.`,
    { projectId, type: "variation_rejected" },
  );
}

export async function pushDisputeRaised(db: Db, stageName: string, projectId: string): Promise<void> {
  await pushToRoles(db, ["commercial", "developer", "admin"],
    "Dispute raised",
    `A dispute has been raised on stage "${stageName}".`,
    { projectId, type: "dispute_raised" },
  );
}

export async function pushPaymentReady(db: Db, stageName: string, projectId: string): Promise<void> {
  await pushToRoles(db, ["funder", "admin"],
    "Payment ready",
    `Stage "${stageName}" is cleared for payment release.`,
    { projectId, type: "payment_ready" },
  );
}
