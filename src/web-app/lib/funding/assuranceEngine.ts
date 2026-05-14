/**
 * lib/funding/assuranceEngine.ts
 *
 * Pure, side-effect-free calculation engine for project funding assurance.
 * Contains no I/O — callers supply the raw data, this module returns state.
 *
 * States:
 *   funded  — wallet covers all active WIP with ≥ 15% buffer
 *   warning — wallet covers active WIP but buffer is thin (< 15%)
 *   gap     — wallet cannot cover active WIP
 *
 * Active stages counted in WIP:
 *   in_progress, awaiting_approval, returned, disputed
 *
 * Upcoming stages (not counted in WIP but shown in position detail):
 *   accepted, part_funded, funding_gap
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FundingState = "funded" | "warning" | "gap";

export const ACTIVE_WIP_STATUSES = [
  "in_progress",
  "awaiting_approval",
  "returned",
  "disputed",
] as const;

export const UPCOMING_STATUSES = [
  "accepted",
  "part_funded",
  "funding_gap",
] as const;

export type StageSnapshot = {
  stageId: string;
  stageName: string;
  value: number;
  status: string;
};

export type FundingPosition = {
  state: FundingState;
  /** wallets.available_amount */
  walletBalance: number;
  /** Sum of active WIP stage values */
  projectedWip: number;
  /** Sum of upcoming stage values */
  upcomingWip: number;
  /** max(0, projectedWip - walletBalance) */
  shortfall: number;
  /** walletBalance / projectedWip × 100 (percentage), null when projectedWip = 0 */
  coveragePct: number | null;
  activeStages: StageSnapshot[];
  upcomingStages: StageSnapshot[];
  calculatedAt: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum buffer ratio above WIP before state downgrades from funded → warning */
const WARNING_BUFFER_RATIO = 0.15;

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

export function calculateFundingPosition(
  walletBalance: number,
  stages: StageSnapshot[],
): FundingPosition {
  const activeStages = stages.filter((s) =>
    (ACTIVE_WIP_STATUSES as readonly string[]).includes(s.status),
  );
  const upcomingStages = stages.filter((s) =>
    (UPCOMING_STATUSES as readonly string[]).includes(s.status),
  );

  const projectedWip = activeStages.reduce((sum, s) => sum + s.value, 0);
  const upcomingWip = upcomingStages.reduce((sum, s) => sum + s.value, 0);
  const shortfall = Math.max(0, projectedWip - walletBalance);
  const coveragePct = projectedWip > 0
    ? (walletBalance / projectedWip) * 100
    : null;

  let state: FundingState;
  if (projectedWip === 0) {
    // No active work — always funded
    state = "funded";
  } else if (walletBalance < projectedWip) {
    state = "gap";
  } else {
    const bufferRatio = (walletBalance - projectedWip) / projectedWip;
    state = bufferRatio >= WARNING_BUFFER_RATIO ? "funded" : "warning";
  }

  return {
    state,
    walletBalance,
    projectedWip,
    upcomingWip,
    shortfall,
    coveragePct,
    activeStages,
    upcomingStages,
    calculatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Display helpers (pure)
// ---------------------------------------------------------------------------

export const FUNDING_STATE_LABELS: Record<FundingState, string> = {
  funded:  "Funded",
  warning: "Warning",
  gap:     "Funding gap",
};

export const FUNDING_STATE_DESCRIPTIONS: Record<FundingState, string> = {
  funded:  "Wallet covers all active work with adequate buffer.",
  warning: "Wallet covers active WIP but buffer is thin — monitor closely.",
  gap:     "Wallet cannot cover active WIP. Stage progression is blocked.",
};
