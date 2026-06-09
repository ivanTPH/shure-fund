/**
 * lib/notifications/webPushService.ts
 *
 * Sends Web Push notifications to browser subscribers stored in
 * web_push_subscriptions. Requires VAPID env vars to be set.
 *
 * Must only be called from trusted server-side code.
 *
 * Env vars required:
 *   VAPID_PUBLIC_KEY   — URL-safe base64 public key
 *   VAPID_PRIVATE_KEY  — URL-safe base64 private key
 *   VAPID_SUBJECT      — mailto: or https: URI (e.g. "mailto:admin@shure.fund")
 *
 * Generate keys with: node -e "require('web-push').generateVAPIDKeys()" | npx web-push generate-vapid-keys
 */

import webPush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient;

type WebPushPayload = {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
};

function isConfigured(): boolean {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

function getWebPush() {
  if (!isConfigured()) return null;
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return webPush;
}

type PushSubscriptionRecord = {
  id: string;
  user_id: string;
  endpoint: string;
  subscription: unknown;
};

async function getSubscriptionsForUsers(
  db: Db,
  userIds: string[],
): Promise<PushSubscriptionRecord[]> {
  if (!userIds.length) return [];
  const { data } = await db
    .from("web_push_subscriptions")
    .select("id, user_id, endpoint, subscription")
    .in("user_id", userIds);
  return (data ?? []) as PushSubscriptionRecord[];
}

async function sendToSubscriptions(
  subs: PushSubscriptionRecord[],
  payload: WebPushPayload,
  db: Db,
): Promise<void> {
  const wp = getWebPush();
  if (!wp) {
    // VAPID not configured — log and skip (non-fatal)
    console.info("[webPush] VAPID not configured — skipping web push delivery");
    return;
  }

  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          sub.subscription as webPush.PushSubscription,
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        // 410 Gone / 404 Not Found = subscription expired, remove it
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          staleIds.push(sub.id);
        }
      }
    }),
  );

  // Clean up expired subscriptions
  if (staleIds.length) {
    await db.from("web_push_subscriptions").delete().in("id", staleIds);
  }
}

// ---------------------------------------------------------------------------
// Public helpers — mirror the Expo pushService pattern
// ---------------------------------------------------------------------------

export async function webPushToUsers(
  db: Db,
  userIds: string[],
  payload: WebPushPayload,
): Promise<void> {
  const subs = await getSubscriptionsForUsers(db, userIds);
  await sendToSubscriptions(subs, payload, db);
}

export async function webPushToRoles(
  db: Db,
  roles: string[],
  payload: WebPushPayload,
): Promise<void> {
  if (!roles.length) return;
  const { data } = await db
    .from("users")
    .select("id")
    .in("role", roles)
    .eq("active", true);
  const userIds = (data ?? []).map((u) => u.id as string);
  const subs = await getSubscriptionsForUsers(db, userIds);
  await sendToSubscriptions(subs, payload, db);
}

// ---------------------------------------------------------------------------
// Domain-specific helpers
// ---------------------------------------------------------------------------

export async function webPushStageSubmitted(db: Db, stageName: string, projectId: string) {
  await webPushToRoles(db, ["developer", "commercial", "admin"], {
    title: "Stage submitted for review",
    body: `"${stageName}" has been submitted and is awaiting acceptance.`,
    data: { projectId, type: "stage_submitted" },
  });
}

export async function webPushApprovalRequired(db: Db, stageName: string, role: string, projectId: string) {
  await webPushToRoles(db, [role, "admin"], {
    title: "Approval required",
    body: `Your sign-off is needed for stage "${stageName}".`,
    data: { projectId, type: "approval_required" },
  });
}

export async function webPushPaymentReady(db: Db, stageName: string, projectId: string) {
  await webPushToRoles(db, ["funder", "admin"], {
    title: "Payment ready",
    body: `Stage "${stageName}" has cleared all approvals and is ready for release.`,
    data: { projectId, type: "payment_ready" },
  });
}
