/**
 * lib/notifications/notificationService.ts
 *
 * Project-scoped, action-driven notification service.
 *
 * Design:
 *   - Every notification names EXACTLY who should act and on WHAT.
 *   - Recipient lookup uses project_members first (explicit assignment),
 *     then falls back to the FK columns on projects/contracts.
 *   - Each notification carries:
 *       required_action  — imperative phrase shown as the notification title
 *       entity_type/id/name — what the action is about (deep-link context)
 *       action_url       — direct URL to the action screen
 *
 * Must only be called from trusted server-side code (service role client).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, buildTransactionalEmail } from "@/lib/email/emailService";

type Db = SupabaseClient;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.shure.fund";

// ---------------------------------------------------------------------------
// Notification payload
// ---------------------------------------------------------------------------

export type NotificationPayload = {
  type: string;
  required_action: string;    // shown as iOS-style title: "Approve variation"
  message: string;            // body: "Stage 2 — Foundation Pour needs your approval"
  entity_type: string;        // 'variation' | 'stage' | 'dispute' | 'evidence'
  entity_id: string | null;
  entity_name: string;
  action_url: string;
  project_id: string | null;
  stage_id: string | null;
  contract_id: string | null;
};

// ---------------------------------------------------------------------------
// Recipient resolution — project-scoped
// ---------------------------------------------------------------------------

/**
 * Resolve user IDs for the given roles, scoped to a specific project.
 *
 * Lookup order:
 *   1. project_members table (explicit assignment — most specific)
 *   2. projects.funder_id / developer_id FK (for funder/developer roles)
 *   3. contracts.contractor_id for the project (for contractor role)
 *   4. Global fallback: all active users with the role (only if nothing project-scoped found)
 */
async function getRecipientsForRoles(
  db: Db,
  roles: string[],
  projectId: string | null,
): Promise<string[]> {
  if (!projectId || !roles.length) return [];

  const ids = new Set<string>();

  // 1. project_members (includes delegated contacts)
  const { data: members } = await db
    .from("project_members")
    .select("user_id, delegated_to, role")
    .eq("project_id", projectId)
    .in("role", roles);

  for (const m of members ?? []) {
    ids.add(m.user_id);
    if (m.delegated_to) ids.add(m.delegated_to); // delegation chain
  }

  // 2. If requesting funder/developer, also check the project FK columns
  //    (handles projects created before project_members seeding)
  if (roles.includes("funder") || roles.includes("developer")) {
    const { data: proj } = await db
      .from("projects")
      .select("funder_id, developer_id")
      .eq("id", projectId)
      .single();

    if (proj) {
      if (roles.includes("funder") && proj.funder_id) ids.add(proj.funder_id);
      if (roles.includes("developer") && proj.developer_id) ids.add(proj.developer_id);
    }
  }

  // 3. contractor_id via contracts
  if (roles.includes("contractor")) {
    const { data: contracts } = await db
      .from("contracts")
      .select("contractor_id")
      .eq("project_id", projectId);
    for (const c of contracts ?? []) {
      if (c.contractor_id) ids.add(c.contractor_id);
    }
  }

  // 4. Global fallback for roles not resolved above (commercial, consultant, admin etc.)
  //    Only if nothing was found via project scope for these roles.
  const rolesMissing = roles.filter((r) => {
    const found = (members ?? []).some((m) => m.role === r);
    return !found && !["funder", "developer", "contractor"].includes(r);
  });

  if (rolesMissing.length > 0) {
    const { data: global } = await db
      .from("users")
      .select("id")
      .in("role", rolesMissing)
      .eq("active", true);
    for (const u of global ?? []) ids.add(u.id);
  }

  // admin always gets everything
  if (roles.includes("admin")) {
    const { data: admins } = await db.from("users").select("id").eq("role", "admin").eq("active", true);
    for (const u of admins ?? []) ids.add(u.id);
  }

  return Array.from(ids);
}

// ---------------------------------------------------------------------------
// Core insert
// ---------------------------------------------------------------------------

async function insertNotification(db: Db, userId: string, payload: NotificationPayload) {
  await db.from("notifications").insert({
    user_id:         userId,
    project_id:      payload.project_id,
    stage_id:        payload.stage_id,
    contract_id:     payload.contract_id,
    type:            payload.type,
    required_action: payload.required_action,
    message:         payload.message,
    entity_type:     payload.entity_type,
    entity_id:       payload.entity_id,
    entity_name:     payload.entity_name,
    action_url:      payload.action_url,
    read:            false,
  });
}

async function notifyRecipients(db: Db, userIds: string[], payload: NotificationPayload) {
  if (!userIds.length) return;

  // Insert DB notifications
  await Promise.all(userIds.map((uid) => insertNotification(db, uid, payload)));

  // Fire transactional emails — non-fatal, never blocks the main flow
  try {
    const { data: users } = await db
      .from("users")
      .select("id, full_name, email")
      .in("id", userIds);

    if (users?.length) {
      const notification = {
        type:            payload.type,
        required_action: payload.required_action,
        message:         payload.message,
        entity_name:     payload.entity_name,
        action_url:      payload.action_url,
        created_at:      new Date().toISOString(),
      };
      await Promise.all(
        users.map((u) => {
          const { subject, html, text } = buildTransactionalEmail(
            u.full_name ?? u.email,
            notification,
            SITE_URL,
          );
          return sendEmail({ to: u.email, subject, html, text });
        }),
      );
    }
  } catch (err) {
    console.error("[notificationService] Email send failed (non-fatal):", err);
  }
}

async function notifyRoles(
  db: Db,
  roles: string[],
  projectId: string | null,
  payload: NotificationPayload,
) {
  const userIds = await getRecipientsForRoles(db, roles, projectId);
  await notifyRecipients(db, userIds, payload);
}

// ---------------------------------------------------------------------------
// Stage notifications
// ---------------------------------------------------------------------------

export async function notifyApprovalRequired(
  db: Db,
  projectId: string,
  stageId: string,
  stageName: string,
  contractId: string | null,
) {
  const url = `/projects/${projectId}/stages/${stageId}/approve`;
  await notifyRoles(db, ["commercial", "consultant", "developer", "admin"], projectId, {
    type:            "approval_required",
    required_action: "Approve stage",
    message:         `"${stageName}" is awaiting your approval before funds can be released.`,
    entity_type:     "stage",
    entity_id:       stageId,
    entity_name:     stageName,
    action_url:      url,
    project_id:      projectId,
    stage_id:        stageId,
    contract_id:     contractId,
  });
}

export async function notifyPaymentReady(
  db: Db,
  projectId: string,
  stageId: string,
  stageName: string,
  contractId: string | null,
) {
  const url = `/projects/${projectId}/stages/${stageId}/release`;
  await notifyRoles(db, ["funder", "admin"], projectId, {
    type:            "payment_ready",
    required_action: "Release payment",
    message:         `"${stageName}" has been approved — funds are ready to release.`,
    entity_type:     "stage",
    entity_id:       stageId,
    entity_name:     stageName,
    action_url:      url,
    project_id:      projectId,
    stage_id:        stageId,
    contract_id:     contractId,
  });
}

export async function notifyEvidenceRequired(
  db: Db,
  projectId: string,
  stageId: string,
  stageName: string,
  contractId: string | null,
) {
  const url = `/projects/${projectId}/stages/${stageId}`;
  await notifyRoles(db, ["contractor", "admin"], projectId, {
    type:            "evidence_required",
    required_action: "Upload evidence",
    message:         `Evidence is required for "${stageName}" before approval can proceed.`,
    entity_type:     "stage",
    entity_id:       stageId,
    entity_name:     stageName,
    action_url:      url,
    project_id:      projectId,
    stage_id:        stageId,
    contract_id:     contractId,
  });
}

export async function notifyFundingGap(
  db: Db,
  projectId: string,
  stageId: string,
  stageName: string,
  contractId: string | null,
) {
  const url = `/projects/${projectId}/wallet`;
  await notifyRoles(db, ["funder", "developer", "admin"], projectId, {
    type:            "funding_gap",
    required_action: "Top up wallet",
    message:         `Insufficient funds to cover "${stageName}". Wallet top-up required before work can proceed.`,
    entity_type:     "stage",
    entity_id:       stageId,
    entity_name:     stageName,
    action_url:      url,
    project_id:      projectId,
    stage_id:        stageId,
    contract_id:     contractId,
  });
}

export async function notifyDisputeRaised(
  db: Db,
  projectId: string,
  stageId: string,
  stageName: string,
  contractId: string | null,
  disputeId: string,
) {
  const url = `/projects/${projectId}/stages/${stageId}/disputes/${disputeId}`;
  await notifyRoles(db, ["commercial", "developer", "funder", "admin"], projectId, {
    type:            "dispute_raised",
    required_action: "Respond to dispute",
    message:         `A dispute has been raised on "${stageName}". Review and respond.`,
    entity_type:     "dispute",
    entity_id:       disputeId,
    entity_name:     stageName,
    action_url:      url,
    project_id:      projectId,
    stage_id:        stageId,
    contract_id:     contractId,
  });
}

export async function notifyDisputeResolved(
  db: Db,
  projectId: string,
  stageId: string,
  stageName: string,
  contractId: string | null,
  disputeId: string,
) {
  const url = `/projects/${projectId}/stages/${stageId}/disputes/${disputeId}`;
  await notifyRoles(db, ["funder", "developer", "contractor", "commercial", "admin"], projectId, {
    type:            "dispute_resolved",
    required_action: "View resolution",
    message:         `The dispute on "${stageName}" has been resolved. Review the outcome.`,
    entity_type:     "dispute",
    entity_id:       disputeId,
    entity_name:     stageName,
    action_url:      url,
    project_id:      projectId,
    stage_id:        stageId,
    contract_id:     contractId,
  });
}

// ---------------------------------------------------------------------------
// Variation notifications
// ---------------------------------------------------------------------------

export async function notifyVariationSubmitted(
  db: Db,
  projectId: string,
  stageId: string,
  stageName: string,
  contractId: string | null,
  variationId: string,
  valueChange: number,
) {
  const url = `/projects/${projectId}/stages/${stageId}/variations/${variationId}`;
  const sign = valueChange >= 0 ? "+" : "";
  const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  await notifyRoles(db, ["commercial", "developer", "admin"], projectId, {
    type:            "variation_submitted",
    required_action: "Review variation",
    message:         `A ${sign}${gbp.format(valueChange)} variation on "${stageName}" is awaiting commercial review.`,
    entity_type:     "variation",
    entity_id:       variationId,
    entity_name:     stageName,
    action_url:      url,
    project_id:      projectId,
    stage_id:        stageId,
    contract_id:     contractId,
  });
}

export async function notifyVariationApproved(
  db: Db,
  projectId: string,
  stageId: string,
  stageName: string,
  contractId: string | null,
  variationId: string,
  requesterId: string,
) {
  const url = `/projects/${projectId}/stages/${stageId}/variations/${variationId}`;

  // Tell the requester directly
  await insertNotification(db, requesterId, {
    type:            "variation_approved",
    required_action: "View approved variation",
    message:         `Your variation on "${stageName}" has been approved and is awaiting funding confirmation.`,
    entity_type:     "variation",
    entity_id:       variationId,
    entity_name:     stageName,
    action_url:      url,
    project_id:      projectId,
    stage_id:        stageId,
    contract_id:     contractId,
  });

  // Tell the funder — they need to confirm wallet coverage
  const funderIds = await getRecipientsForRoles(db, ["funder", "admin"], projectId);
  await notifyRecipients(db, funderIds, {
    type:            "variation_approved",
    required_action: "Confirm funding",
    message:         `A variation on "${stageName}" is approved and needs wallet confirmation before it can activate.`,
    entity_type:     "variation",
    entity_id:       variationId,
    entity_name:     stageName,
    action_url:      url,
    project_id:      projectId,
    stage_id:        stageId,
    contract_id:     contractId,
  });
}

export async function notifyVariationRejected(
  db: Db,
  projectId: string,
  stageId: string,
  stageName: string,
  contractId: string | null,
  variationId: string,
  requesterId: string,
) {
  const url = `/projects/${projectId}/stages/${stageId}/variations/${variationId}`;
  await insertNotification(db, requesterId, {
    type:            "variation_rejected",
    required_action: "View rejection",
    message:         `Your variation on "${stageName}" has been rejected. See the detail for reasons.`,
    entity_type:     "variation",
    entity_id:       variationId,
    entity_name:     stageName,
    action_url:      url,
    project_id:      projectId,
    stage_id:        stageId,
    contract_id:     contractId,
  });
}

// ---------------------------------------------------------------------------
// Approval decision notifications
// ---------------------------------------------------------------------------

/**
 * Fire notifications after an individual approval decision is recorded.
 *
 * - returned  → contractor told to address feedback and resubmit
 * - rejected  → contractor + developer + admin told the stage was rejected
 * - approved  → if ALL approval rows for the stage are now approved,
 *               notify the funder that payment is ready to release
 */
export async function notifyApprovalDecision(
  db: Db,
  projectId: string,
  stageId: string,
  stageName: string,
  contractId: string | null,
  decision: "approved" | "rejected" | "returned",
  approvalRole: string,
) {
  const stageUrl = `/projects/${projectId}/stages/${stageId}`;

  if (decision === "returned") {
    await notifyRoles(db, ["contractor", "admin"], projectId, {
      type:            "approval_returned",
      required_action: "Address feedback and resubmit",
      message:         `"${stageName}" was returned by the ${approvalRole} reviewer. Address their feedback before resubmitting.`,
      entity_type:     "stage",
      entity_id:       stageId,
      entity_name:     stageName,
      action_url:      stageUrl,
      project_id:      projectId,
      stage_id:        stageId,
      contract_id:     contractId,
    });
    return;
  }

  if (decision === "rejected") {
    await notifyRoles(db, ["contractor", "developer", "admin"], projectId, {
      type:            "approval_rejected",
      required_action: "View rejection details",
      message:         `"${stageName}" was rejected by the ${approvalRole} reviewer. See the stage for details.`,
      entity_type:     "stage",
      entity_id:       stageId,
      entity_name:     stageName,
      action_url:      stageUrl,
      project_id:      projectId,
      stage_id:        stageId,
      contract_id:     contractId,
    });
    return;
  }

  // approved — check if all approval rows for this stage are now approved
  if (decision === "approved") {
    const { data: allApprovals } = await db
      .from("approvals")
      .select("decision")
      .eq("stage_id", stageId);

    const allDone =
      (allApprovals ?? []).length > 0 &&
      (allApprovals ?? []).every((a) => a.decision === "approved");

    if (allDone) {
      await notifyPaymentReady(db, projectId, stageId, stageName, contractId);
    }
  }
}
