/**
 * lib/notifications/notificationService.ts
 *
 * Creates notifications in response to state machine transitions.
 * Uses the service role client (bypasses RLS) — must only be called from
 * trusted server-side code that has already validated the actor.
 *
 * Notification types:
 *   payment_ready | approval_required | evidence_required |
 *   variation_submitted | variation_approved | variation_rejected |
 *   dispute_raised | dispute_resolved | funding_gap
 *
 * Role routing:
 *   funder     → payment_ready, funding_gap, dispute_raised, dispute_resolved
 *   commercial → approval_required, variation_submitted
 *   contractor → evidence_required, variation_approved, variation_rejected
 *   developer  → all types (oversight)
 *   admin      → all types
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient;

// ---------------------------------------------------------------------------
// Role routing helpers
// ---------------------------------------------------------------------------

const ROLE_NOTIFICATION_TYPES: Record<string, string[]> = {
  funder:      ["payment_ready", "funding_gap", "dispute_raised", "dispute_resolved"],
  commercial:  ["approval_required", "variation_submitted"],
  contractor:  ["evidence_required", "variation_approved", "variation_rejected"],
  consultant:  ["approval_required"],
  developer:   ["payment_ready", "approval_required", "evidence_required", "variation_submitted", "variation_approved", "variation_rejected", "dispute_raised", "dispute_resolved", "funding_gap"],
  admin:       ["payment_ready", "approval_required", "evidence_required", "variation_submitted", "variation_approved", "variation_rejected", "dispute_raised", "dispute_resolved", "funding_gap"],
};

async function getUsersForRoles(db: Db, roles: string[], projectId: string | null): Promise<string[]> {
  if (!projectId) return [];
  // Get all users on this project with the specified roles
  // This is a simplified lookup — in production you'd filter by project membership
  const { data } = await db
    .from("users")
    .select("id, role")
    .in("role", roles)
    .eq("active", true);

  return (data ?? []).map((u) => u.id);
}

async function insertNotification(
  db: Db,
  userId: string,
  type: string,
  message: string,
  projectId: string | null,
  stageId: string | null,
  actionUrl: string | null,
) {
  await db.from("notifications").insert({
    user_id: userId,
    project_id: projectId,
    stage_id: stageId,
    type,
    message,
    action_url: actionUrl,
    read: false,
  });
}

async function notifyRoles(
  db: Db,
  roles: string[],
  type: string,
  message: string,
  projectId: string | null,
  stageId: string | null,
  actionUrl: string | null,
) {
  const userIds = await getUsersForRoles(db, roles, projectId);
  await Promise.all(
    userIds.map((uid) => insertNotification(db, uid, type, message, projectId, stageId, actionUrl)),
  );
}

// ---------------------------------------------------------------------------
// Stage transition notifications
// ---------------------------------------------------------------------------

export async function notifyPaymentReady(
  db: Db, stageId: string, stageName: string, projectId: string | null,
) {
  const url = stageId ? `/projects/${projectId}/stages/${stageId}/action` : null;
  await notifyRoles(db, ["funder", "admin"], "payment_ready",
    `Stage "${stageName}" is cleared for payment release.`, projectId, stageId, url);
}

export async function notifyApprovalRequired(
  db: Db, stageId: string, stageName: string, projectId: string | null,
) {
  const url = stageId ? `/projects/${projectId}/stages/${stageId}/action` : null;
  await notifyRoles(db, ["commercial", "consultant", "developer", "admin"], "approval_required",
    `Stage "${stageName}" is awaiting your approval.`, projectId, stageId, url);
}

export async function notifyEvidenceRequired(
  db: Db, stageId: string, stageName: string, projectId: string | null,
) {
  const url = stageId ? `/projects/${projectId}/stages/${stageId}/action` : null;
  await notifyRoles(db, ["contractor", "admin"], "evidence_required",
    `Evidence upload required for stage "${stageName}".`, projectId, stageId, url);
}

export async function notifyFundingGap(
  db: Db, stageId: string, stageName: string, projectId: string | null,
) {
  const url = stageId ? `/projects/${projectId}/stages/${stageId}` : null;
  await notifyRoles(db, ["funder", "developer", "admin"], "funding_gap",
    `Funding gap on stage "${stageName}" — wallet top-up required.`, projectId, stageId, url);
}

export async function notifyDisputeRaised(
  db: Db, stageId: string, stageName: string, projectId: string | null,
) {
  const url = stageId ? `/projects/${projectId}/stages/${stageId}` : null;
  await notifyRoles(db, ["funder", "commercial", "developer", "admin"], "dispute_raised",
    `A dispute has been raised on stage "${stageName}".`, projectId, stageId, url);
}

export async function notifyDisputeResolved(
  db: Db, stageId: string, stageName: string, projectId: string | null,
) {
  const url = stageId ? `/projects/${projectId}/stages/${stageId}` : null;
  await notifyRoles(db, ["funder", "commercial", "developer", "contractor", "admin"], "dispute_resolved",
    `Dispute on stage "${stageName}" has been resolved.`, projectId, stageId, url);
}

// ---------------------------------------------------------------------------
// Variation notifications
// ---------------------------------------------------------------------------

export async function notifyVariationSubmitted(
  db: Db, stageId: string, variationId: string, projectId: string | null,
) {
  const url = `/projects/${projectId}/stages/${stageId}/variations/${variationId}`;
  await notifyRoles(db, ["commercial", "developer", "admin"], "variation_submitted",
    `A new variation has been submitted for review.`, projectId, stageId, url);
}

export async function notifyVariationApproved(
  db: Db, stageId: string, variationId: string, projectId: string | null, requesterId: string,
) {
  const url = `/projects/${projectId}/stages/${stageId}/variations/${variationId}`;
  // Notify the requester directly + funder
  await insertNotification(db, requesterId, "variation_approved",
    "Your variation has been approved and is awaiting funding confirmation.", projectId, stageId, url);
  await notifyRoles(db, ["funder", "admin"], "variation_approved",
    "A variation requires wallet confirmation before it can activate.", projectId, stageId, url);
}

export async function notifyVariationRejected(
  db: Db, stageId: string, variationId: string, projectId: string | null, requesterId: string,
) {
  const url = `/projects/${projectId}/stages/${stageId}/variations/${variationId}`;
  await insertNotification(db, requesterId, "variation_rejected",
    "Your submitted variation has been rejected.", projectId, stageId, url);
}
