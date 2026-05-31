/**
 * lib/workflow/variationStateMachine.ts
 *
 * Pure state machine for the variation lifecycle.
 * No I/O — callers supply current state, this returns the next state or an error.
 *
 * DB enum values: draft | submitted | pending | under_review | approved |
 *                 rejected | active | pending_funding | cancelled
 *
 * Phase 2 mapping:
 *   draft          — created but not yet sent
 *   submitted      — sent by contractor/developer for commercial review
 *   under_review   — commercial is actively reviewing
 *   approved       — approved but wallet not yet confirmed
 *   pending_funding — approved, wallet confirmation required
 *   rejected       — rejected, workflow ends
 *   active         — activated, stage value updated
 *   cancelled      — withdrawn
 */

import type { AppRole } from "@/lib/auth";

export type VariationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "pending_funding"
  | "rejected"
  | "active"
  | "cancelled";

export type VariationAction =
  | "submit"            // draft → submitted (contractor / developer)
  | "begin_review"      // submitted → under_review (commercial)
  | "approve"           // under_review → approved (commercial)
  | "reject"            // under_review | submitted → rejected (commercial)
  | "confirm_funding"   // approved → active (funder / admin) — wallet must cover
  | "mark_pending"      // approved → pending_funding (system / funder)
  | "retry_funding"     // pending_funding → active (funder / admin) — wallet now covers
  | "cancel"            // draft | submitted → cancelled (requester / admin)
  ;

type VariationRule = {
  from: VariationStatus[];
  to: VariationStatus;
  allowedRoles: AppRole[];
  requiresWalletCheck: boolean;
  description: string;
};

export const VARIATION_TRANSITIONS: Record<VariationAction, VariationRule> = {
  submit: {
    from: ["draft"],
    to: "submitted",
    allowedRoles: ["contractor", "developer", "admin"],
    requiresWalletCheck: false,
    description: "Contractor / developer submits variation for commercial review",
  },
  begin_review: {
    from: ["submitted"],
    to: "under_review",
    allowedRoles: ["commercial", "admin"],
    requiresWalletCheck: false,
    description: "Commercial opens the variation for formal review",
  },
  approve: {
    from: ["under_review"],
    to: "approved",
    allowedRoles: ["commercial", "admin"],
    requiresWalletCheck: false,
    description: "Commercial approves the variation — funding confirmation required",
  },
  reject: {
    from: ["under_review", "submitted"],
    to: "rejected",
    allowedRoles: ["commercial", "admin"],
    requiresWalletCheck: false,
    description: "Commercial rejects the variation",
  },
  confirm_funding: {
    from: ["approved"],
    to: "active",
    allowedRoles: ["funder", "admin"],
    requiresWalletCheck: true,
    description: "Funder confirms wallet covers variation — stage value updated",
  },
  mark_pending: {
    from: ["approved"],
    to: "pending_funding",
    allowedRoles: ["funder", "developer", "admin"],
    requiresWalletCheck: false,
    description: "Mark variation as waiting for wallet top-up",
  },
  retry_funding: {
    from: ["pending_funding"],
    to: "active",
    allowedRoles: ["funder", "admin"],
    requiresWalletCheck: true,
    description: "Wallet now covers variation — activate",
  },
  cancel: {
    from: ["draft", "submitted"],
    to: "cancelled",
    allowedRoles: ["contractor", "developer", "admin"],
    requiresWalletCheck: false,
    description: "Variation withdrawn by requester",
  },
};

export type VariationValidationResult =
  | { ok: true; rule: VariationRule }
  | { ok: false; reason: string };

export function validateVariationTransition(
  action: VariationAction,
  currentStatus: VariationStatus,
  actorRole: AppRole,
): VariationValidationResult {
  const rule = VARIATION_TRANSITIONS[action];
  if (!rule) return { ok: false, reason: `Unknown variation action: "${action}"` };

  if (!rule.from.includes(currentStatus)) {
    return {
      ok: false,
      reason: `Action "${action}" is not valid from status "${currentStatus}". Valid from: ${rule.from.join(", ")}.`,
    };
  }

  if (rule.allowedRoles.length > 0 && !rule.allowedRoles.includes(actorRole)) {
    return {
      ok: false,
      reason: `Role "${actorRole}" cannot perform "${action}". Required: ${rule.allowedRoles.join(", ")}.`,
    };
  }

  return { ok: true, rule };
}

export const TERMINAL_VARIATION_STATUSES: VariationStatus[] = ["rejected", "active", "cancelled"];
