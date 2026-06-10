/**
 * AML rule evaluation utility.
 *
 * Each check function returns a ComplianceHit or null.
 * A non-null hit should be written to compliance_reviews and the triggering action blocked.
 */

import { createServiceClient } from "@/lib/supabase/service";

export type RiskLevel = "medium" | "high" | "critical";

export interface ComplianceHit {
  rule_id: string;
  rule_label: string;
  risk_level: RiskLevel;
  entity_type: string;
  entity_id: string;
  triggered_by: string;
  context: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

/**
 * Rule: Large first deposit from a new source (> £10,000).
 * Returns a hit if this is the user's first deposit and amount > 10000.
 */
export async function checkLargeFirstDeposit(
  userId: string,
  depositAmount: number,
  walletTransactionId: string,
  projectId: string
): Promise<ComplianceHit | null> {
  if (depositAmount <= 10000) return null;

  const supabase = createServiceClient();
  const { count } = await supabase
    .from("wallet_transactions")
    .select("id", { count: "exact", head: true })
    .eq("type", "deposit")
    .eq("created_by", userId);

  // count includes the current transaction if already inserted — check <= 1
  if ((count ?? 0) <= 1) {
    return {
      rule_id: "LARGE_FIRST_DEPOSIT",
      rule_label: "Large first deposit from new source (> £10,000)",
      risk_level: "high",
      entity_type: "wallet_transaction",
      entity_id: walletTransactionId,
      triggered_by: userId,
      context: { amount: depositAmount, project_id: projectId },
    };
  }
  return null;
}

/**
 * Rule: Round-number deposit exactly divisible by £10,000.
 * Structuring indicator — medium risk.
 */
export function checkRoundNumberDeposit(
  userId: string,
  depositAmount: number,
  walletTransactionId: string,
  projectId: string
): ComplianceHit | null {
  if (depositAmount > 0 && depositAmount % 10000 === 0) {
    return {
      rule_id: "ROUND_NUMBER_DEPOSIT",
      rule_label: "Round-number deposit (structuring indicator)",
      risk_level: "medium",
      entity_type: "wallet_transaction",
      entity_id: walletTransactionId,
      triggered_by: userId,
      context: { amount: depositAmount, project_id: projectId },
    };
  }
  return null;
}

/**
 * Rule: Three or more deposits within 24 hours from the same funder.
 * Layering indicator — high risk.
 */
export async function checkRapidSequentialDeposits(
  userId: string,
  walletTransactionId: string,
  projectId: string
): Promise<ComplianceHit | null> {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("wallet_transactions")
    .select("id", { count: "exact", head: true })
    .eq("type", "deposit")
    .eq("created_by", userId)
    .gte("created_at", since);

  if ((count ?? 0) >= 3) {
    return {
      rule_id: "RAPID_SEQUENTIAL_DEPOSITS",
      rule_label: "Three or more deposits within 24 hours (layering indicator)",
      risk_level: "high",
      entity_type: "wallet_transaction",
      entity_id: walletTransactionId,
      triggered_by: userId,
      context: { deposit_count_24h: count, project_id: projectId },
    };
  }
  return null;
}

/**
 * Rule: Wallet top-up immediately followed by a release (< 24 hours).
 * Rapid in/out — medium risk.
 */
export async function checkRapidTopUpRelease(
  userId: string,
  projectId: string,
  releaseTransactionId: string
): Promise<ComplianceHit | null> {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find any deposit on this project wallet in the last 24h
  const { data: wallet } = await supabase
    .from("project_wallets")
    .select("id")
    .eq("project_id", projectId)
    .single();

  if (!wallet) return null;

  const { count } = await supabase
    .from("wallet_transactions")
    .select("id", { count: "exact", head: true })
    .eq("wallet_id", wallet.id)
    .eq("type", "deposit")
    .gte("created_at", since);

  if ((count ?? 0) > 0) {
    return {
      rule_id: "RAPID_TOPUP_RELEASE",
      rule_label: "Wallet top-up followed by payment release within 24 hours",
      risk_level: "medium",
      entity_type: "wallet_transaction",
      entity_id: releaseTransactionId,
      triggered_by: userId,
      context: { project_id: projectId },
    };
  }
  return null;
}

/**
 * Rule: Unverified token holder receiving payment (kyc_status != 'approved').
 * High risk — must block release.
 */
export async function checkUnverifiedTokenHolder(
  tokenHolderId: string,
  releaseTransactionId: string,
  projectId: string
): Promise<ComplianceHit | null> {
  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("kyc_status")
    .eq("id", tokenHolderId)
    .single();

  if (!user || user.kyc_status !== "approved") {
    return {
      rule_id: "UNVERIFIED_TOKEN_HOLDER",
      rule_label: "Token holder without approved KYC receiving payment",
      risk_level: "high",
      entity_type: "wallet_transaction",
      entity_id: releaseTransactionId,
      triggered_by: tokenHolderId,
      context: {
        token_holder_id: tokenHolderId,
        kyc_status: user?.kyc_status ?? "unknown",
        project_id: projectId,
      },
    };
  }
  return null;
}

/**
 * Rule: KYC expired (> 12 months) and a payment is triggered.
 * Medium risk.
 */
export async function checkKycExpiry(
  userId: string,
  entityId: string,
  entityType: string
): Promise<ComplianceHit | null> {
  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("kyc_expires_at, kyc_status")
    .eq("id", userId)
    .single();

  if (
    user?.kyc_expires_at &&
    new Date(user.kyc_expires_at) < new Date() &&
    user.kyc_status === "approved"
  ) {
    return {
      rule_id: "KYC_EXPIRED",
      rule_label: "KYC expired — due diligence refresh required",
      risk_level: "medium",
      entity_type: entityType,
      entity_id: entityId,
      triggered_by: userId,
      context: { kyc_expires_at: user.kyc_expires_at },
    };
  }
  return null;
}

/**
 * Rule: Tier 2 proof-of-funds withdrawn before valid_until date.
 * Indicates uncommitted funds are no longer available ahead of schedule.
 * Medium risk — advisory, does not block the withdrawal.
 */
export function checkPofEarlyWithdrawal(
  userId: string,
  pofId: string,
  projectId: string,
  validUntil: string, // ISO date string
): ComplianceHit | null {
  if (new Date(validUntil) > new Date()) {
    return {
      rule_id:      "TIER2_POF_WITHDRAWAL",
      rule_label:   "Tier 2 proof-of-funds withdrawn before expiry",
      risk_level:   "medium",
      entity_type:  "proof_of_funds",
      entity_id:    pofId,
      triggered_by: userId,
      context:      { project_id: projectId, valid_until: validUntil },
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Persistence helper
// ---------------------------------------------------------------------------

/**
 * Write a compliance hit to the DB.
 * Returns the created review record ID.
 */
export async function recordComplianceHit(hit: ComplianceHit): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("compliance_reviews")
    .insert({
      rule_id:      hit.rule_id,
      rule_label:   hit.rule_label,
      risk_level:   hit.risk_level,
      entity_type:  hit.entity_type,
      entity_id:    hit.entity_id,
      triggered_by: hit.triggered_by,
      context:      hit.context,
      status:       "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[AML] Failed to record compliance hit:", error.message);
    return null;
  }
  return data.id;
}

/**
 * Run all deposit-related AML checks.
 * Returns array of rule_ids that fired (non-empty = block the deposit).
 */
export async function runDepositAmlChecks(opts: {
  userId: string;
  amount: number;
  walletTransactionId: string;
  projectId: string;
}): Promise<string[]> {
  const { userId, amount, walletTransactionId, projectId } = opts;
  const hits: ComplianceHit[] = [];

  const [largeFirst, roundNumber, rapidSeq] = await Promise.all([
    checkLargeFirstDeposit(userId, amount, walletTransactionId, projectId),
    Promise.resolve(checkRoundNumberDeposit(userId, amount, walletTransactionId, projectId)),
    checkRapidSequentialDeposits(userId, walletTransactionId, projectId),
  ]);

  if (largeFirst)  hits.push(largeFirst);
  if (roundNumber) hits.push(roundNumber);
  if (rapidSeq)    hits.push(rapidSeq);

  // Record all hits (fire-and-forget individual failures)
  await Promise.all(hits.map(recordComplianceHit));

  // Only HIGH and CRITICAL risk block the action; MEDIUM is advisory
  return hits
    .filter((h) => h.risk_level === "high" || h.risk_level === "critical")
    .map((h) => h.rule_id);
}
