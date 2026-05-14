/**
 * lib/workflow/stateMachine.ts
 *
 * Pure server-side state machine for contract stages.
 * Contains no I/O — only validation logic.
 * The API route handler is responsible for DB reads, pre-condition queries,
 * the actual UPDATE, and returning HTTP responses.
 *
 * Design rule: every transition is validated here before any DB write occurs.
 * Invalid transitions never reach the database.
 */

import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Stage status — the 11 canonical states
// ---------------------------------------------------------------------------

export const STAGE_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "in_progress",
  "awaiting_approval",
  "returned",
  "disputed",
  "available_to_release",
  "released",
  "funding_gap",
  "part_funded",
] as const;

export type StageStatus = (typeof STAGE_STATUSES)[number];

export function isValidStatus(value: string): value is StageStatus {
  return (STAGE_STATUSES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Pre-condition types — what the API handler must check before executing
// ---------------------------------------------------------------------------

export type PreCondition =
  | "wallet_covers_stage_value"     // wallets.available_amount >= contract_stages.value
  | "all_approvals_granted"         // every approval row for the stage has decision = 'approved'
  | "approval_certificate_exists"   // stage_approval_completions row exists for the stage
  | "evidence_uploaded";            // at least one non-rejected evidence record exists for the stage

// ---------------------------------------------------------------------------
// Transition actions
// ---------------------------------------------------------------------------

export type TransitionAction =
  | "submit"                   // draft → sent
  | "accept"                   // sent → accepted
  | "reject"                   // sent → returned
  | "allocate_funding"         // accepted | funding_gap | part_funded → in_progress
  | "flag_funding_gap"         // accepted → funding_gap (explicit gap registration)
  | "partial_fund"             // accepted | funding_gap → part_funded
  | "submit_for_approval"      // in_progress | returned → awaiting_approval
  | "complete_approvals"       // awaiting_approval → available_to_release
  | "release"                  // available_to_release → released
  | "return"                   // awaiting_approval | disputed → returned
  | "restart"                  // returned → in_progress
  | "open_dispute"             // in_progress | awaiting_approval → disputed
  | "resolve_dispute_continue" // disputed → awaiting_approval
  | "resolve_dispute_reject";  // disputed → returned

// ---------------------------------------------------------------------------
// Transition rule shape
// ---------------------------------------------------------------------------

type TransitionRule = {
  /** States from which this action is valid */
  from: StageStatus[];
  /** The resulting state if the transition is allowed */
  to: StageStatus;
  /**
   * Roles that may perform this action.
   * Empty array means any authenticated user can perform it.
   */
  allowedRoles: AppRole[];
  /**
   * Pre-conditions that the API handler must verify before executing the DB write.
   * Checked in order — first failure aborts the transition.
   */
  preConditions: PreCondition[];
  /** Human-readable description for audit trails and error messages */
  description: string;
};

// ---------------------------------------------------------------------------
// Transition graph — the single source of truth for valid moves
// ---------------------------------------------------------------------------

export const TRANSITIONS: Record<TransitionAction, TransitionRule> = {
  submit: {
    from: ["draft"],
    to: "sent",
    allowedRoles: ["contractor", "developer", "admin"],
    preConditions: [],
    description: "Contractor submits stage for developer review",
  },

  accept: {
    from: ["sent"],
    to: "accepted",
    allowedRoles: ["developer", "funder", "admin"],
    preConditions: [],
    description: "Developer accepts stage definition and scope",
  },

  reject: {
    from: ["sent"],
    to: "returned",
    allowedRoles: ["developer", "funder", "admin"],
    preConditions: [],
    description: "Developer rejects stage, returns to contractor for revision",
  },

  allocate_funding: {
    from: ["accepted", "funding_gap", "part_funded"],
    to: "in_progress",
    allowedRoles: ["funder", "developer", "admin"],
    preConditions: ["wallet_covers_stage_value"],
    description: "Funder confirms wallet covers stage value; work may begin",
  },

  flag_funding_gap: {
    from: ["accepted"],
    to: "funding_gap",
    allowedRoles: ["funder", "developer", "admin"],
    preConditions: [],
    description: "Explicitly registers that wallet cannot yet cover this stage",
  },

  partial_fund: {
    from: ["accepted", "funding_gap"],
    to: "part_funded",
    allowedRoles: ["funder", "developer", "admin"],
    preConditions: [],
    description: "Partial funding allocated; stage blocked pending remainder",
  },

  submit_for_approval: {
    from: ["in_progress", "returned"],
    to: "awaiting_approval",
    allowedRoles: ["contractor", "developer", "admin"],
    preConditions: ["evidence_uploaded"],
    description: "Contractor marks work complete, submits for approval chain",
  },

  complete_approvals: {
    from: ["awaiting_approval"],
    to: "available_to_release",
    allowedRoles: ["commercial", "consultant", "developer", "funder", "admin"],
    preConditions: ["all_approvals_granted"],
    description: "All required roles have approved; stage cleared for release",
  },

  release: {
    from: ["available_to_release"],
    to: "released",
    allowedRoles: ["funder", "admin"],
    preConditions: ["approval_certificate_exists", "wallet_covers_stage_value"],
    description: "Funder triggers payment release to contractor",
  },

  return: {
    from: ["awaiting_approval", "disputed"],
    to: "returned",
    allowedRoles: ["commercial", "consultant", "developer", "funder", "admin"],
    preConditions: [],
    description: "Stage returned to contractor for rework or revision",
  },

  restart: {
    from: ["returned"],
    to: "in_progress",
    allowedRoles: ["contractor", "developer", "admin"],
    preConditions: ["wallet_covers_stage_value"],
    description: "Contractor restarts work on a returned stage",
  },

  open_dispute: {
    from: ["in_progress", "awaiting_approval"],
    to: "disputed",
    allowedRoles: ["contractor", "commercial", "consultant", "developer", "funder", "admin"],
    preConditions: [],
    description: "A dispute is raised, blocking further progress until resolved",
  },

  resolve_dispute_continue: {
    from: ["disputed"],
    to: "awaiting_approval",
    allowedRoles: ["developer", "funder", "admin"],
    preConditions: [],
    description: "Dispute resolved in favour of continuation; returns to approval",
  },

  resolve_dispute_reject: {
    from: ["disputed"],
    to: "returned",
    allowedRoles: ["developer", "funder", "admin"],
    preConditions: [],
    description: "Dispute resolved with rejection; stage returned for rework",
  },
};

// ---------------------------------------------------------------------------
// Terminal states — no outgoing transitions are defined from here
// ---------------------------------------------------------------------------

export const TERMINAL_STATES: StageStatus[] = ["released"];

// ---------------------------------------------------------------------------
// validateTransition — pure synchronous validation
// Returns either the rule (with its preConditions) or a rejection reason.
// ---------------------------------------------------------------------------

export type ValidationResult =
  | { ok: true; rule: TransitionRule }
  | { ok: false; reason: string };

export function validateTransition(
  action: TransitionAction,
  currentStatus: StageStatus,
  actorRole: AppRole,
): ValidationResult {
  const rule = TRANSITIONS[action];

  if (!rule) {
    return { ok: false, reason: `Unknown transition action: "${action}"` };
  }

  if (!rule.from.includes(currentStatus)) {
    const valid = rule.from.join(", ");
    return {
      ok: false,
      reason: `Action "${action}" is not valid from state "${currentStatus}". ` +
              `Valid from: ${valid}.`,
    };
  }

  if (TERMINAL_STATES.includes(currentStatus)) {
    return {
      ok: false,
      reason: `Stage is in terminal state "${currentStatus}". No further transitions are permitted.`,
    };
  }

  if (rule.allowedRoles.length > 0 && !rule.allowedRoles.includes(actorRole)) {
    return {
      ok: false,
      reason: `Role "${actorRole}" cannot perform "${action}". ` +
              `Required: ${rule.allowedRoles.join(", ")}.`,
    };
  }

  return { ok: true, rule };
}

// ---------------------------------------------------------------------------
// Helpers — used by tests and the API route handler
// ---------------------------------------------------------------------------

/** Returns all valid actions from a given state for a given role */
export function availableActions(
  currentStatus: StageStatus,
  actorRole: AppRole,
): TransitionAction[] {
  return (Object.entries(TRANSITIONS) as [TransitionAction, TransitionRule][])
    .filter(([, rule]) =>
      rule.from.includes(currentStatus) &&
      (rule.allowedRoles.length === 0 || rule.allowedRoles.includes(actorRole)),
    )
    .map(([action]) => action);
}
