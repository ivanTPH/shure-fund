/**
 * Shared TypeScript types used by both web-app and mobile.
 * These are the canonical domain types aligned with the Supabase schema.
 */

// ---------------------------------------------------------------------------
// Auth / Users
// ---------------------------------------------------------------------------

export type AppRole =
  | "funder"
  | "developer"
  | "commercial"
  | "contractor"
  | "consultant"
  | "admin";

export type AppUser = {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  active: boolean;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type Project = {
  id: string;
  name: string;
  location: string;
  status: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Contracts & Stages
// ---------------------------------------------------------------------------

export type Contract = {
  id: string;
  project_id: string;
  title: string;
  contractor_name: string;
  status: string;
  created_at: string;
};

export type ContractStage = {
  id: string;
  contract_id: string;
  name: string;
  value: number;
  status: string;
  sequence_order: number;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Variations
// ---------------------------------------------------------------------------

export type VariationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "active"
  | "pending_funding"
  | "cancelled";

export type Variation = {
  id: string;
  stage_id: string;
  description: string;
  value_change: number;
  status: VariationStatus;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------

export type DisputeStatus = "raised" | "under_review" | "resolved" | "escalated";

export type Dispute = {
  id: string;
  stage_id: string;
  raised_by: string;
  respondent_id: string | null;
  reason: string;
  evidence_url: string | null;
  status: DisputeStatus;
  resolution_notes: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type EvidenceStatus = "uploaded" | "pending" | "accepted" | "rejected";

export type Evidence = {
  id: string;
  stage_id: string;
  uploaded_by: string;
  title: string;
  file_url: string | null;
  status: EvidenceStatus;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export type Wallet = {
  id: string;
  project_id: string;
  total_deposited: number;
  available_amount: number;
  reserved_amount: number;
  released_amount: number;
  updated_at: string;
};

export type WalletTransaction = {
  id: string;
  wallet_id: string;
  type: "deposit" | "release" | "reserve" | "reversal";
  amount: number;
  description: string | null;
  balance_after: number | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType =
  | "payment_ready"
  | "approval_required"
  | "evidence_required"
  | "variation_submitted"
  | "variation_approved"
  | "variation_rejected"
  | "dispute_raised"
  | "dispute_resolved"
  | "funding_gap";

export type AppNotification = {
  id: string;
  user_id: string;
  project_id: string | null;
  stage_id: string | null;
  type: NotificationType;
  message: string;
  action_url: string | null;
  read: boolean;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Funding
// ---------------------------------------------------------------------------

export type FundingStatus = "funded" | "warning" | "gap";

export type FundingPosition = {
  status: FundingStatus;
  walletBalance: number;
  totalRequired: number;
  totalReleased: number;
  bufferPct: number;
};
