export type StageStatus =
  | "blocked"
  | "in_review"
  | "ready"
  | "partially_approved"
  | "approved"
  | "partially_released"
  | "released"
  | "disputed"
  | "on_hold";

export type EvidenceType = "file" | "form";

export type EvidenceStatus = "pending" | "accepted" | "rejected" | "requires_more";

export type ApprovalRole = "commercial" | "professional" | "treasury";
export type UserRole = ApprovalRole | "contractor" | "funder" | "subcontractor";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type FundingSourceType = "funder" | "contractor";

export type ActionPriority = "critical" | "high" | "medium";

export type QueueActionType =
  | "fund_stage"
  | "review_evidence"
  | "approve_stage"
  | "release_funding"
  | "resolve_blockers"
  | "review_dispute"
  | "review_variation"
  | "activate_variation";

export interface UserRecord {
  id: string;
  name: string;
  role: UserRole;
}

export interface ProjectRecord {
  id: string;
  name: string;
  status: string;
  reserveBuffer: number;
}

export interface StageRecordV2 {
  id: string;
  projectId: string;
  name: string;
  status: StageStatus;
  requiredAmount: number;
  releasedAmount: number;
}

export interface EvidenceRequirementRecord {
  id: string;
  stageId: string;
  label: string;
  type: EvidenceType;
  required: boolean;
}

export interface EvidenceRecord {
  id: string;
  stageId: string;
  type: EvidenceType;
  status: EvidenceStatus;
  requirementId: string;
  name: string;
  submittedAt?: string;
}

export interface ApprovalRecord {
  id: string;
  stageId: string;
  role: ApprovalRole;
  status: ApprovalStatus;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
}

export interface LedgerAccountRecord {
  id: string;
  name: string;
  balance: number;
  projectId: string;
  stageId?: string;
}

export interface LedgerEntryRecord {
  id: string;
  accountId: string;
  amount: number;
  type: "deposit" | "allocation_in" | "allocation_out" | "release";
  reference: string;
  timestamp: string;
  sourceType?: FundingSourceType;
  restrictedUse?: boolean;
  stageId?: string;
}

export interface OverrideRecord {
  active: boolean;
  reason: string;
  userId: string;
  timestamp: string;
  overriddenBlockers: string[];
}

export interface DisputeRecord {
  id: string;
  stageId: string;
  title: string;
  reason: string;
  disputedAmount: number;
  status: "open" | "resolved";
  openedBy: string;
  openedAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface VariationRecord {
  id: string;
  stageId: string;
  title: string;
  reason: string;
  amountDelta: number;
  status: "pending" | "approved" | "rejected" | "active";
  createdBy: string;
  createdAt: string;
  commercialApprovedBy?: string;
  commercialApprovedAt?: string;
  treasuryApprovedBy?: string;
  treasuryApprovedAt?: string;
  activatedBy?: string;
  activatedAt?: string;
}

export interface AuditLogRecord {
  id: string;
  eventType: "STATE_CHANGE" | "USER_ACTION" | "SYSTEM_DERIVED";
  entity: "project" | "stage" | "evidence" | "approval" | "ledger" | "dispute" | "variation";
  entityId: string;
  action:
    | "funding_added"
    | "evidence_updated"
    | "approval_given"
    | "stage_released"
    | "override_applied"
    | "dispute_opened"
    | "dispute_resolved"
    | "variation_created"
    | "variation_approved"
    | "variation_rejected"
    | "variation_activated";
  beforeState: unknown;
  afterState: unknown;
  user: string;
  timestamp: string;
}

export type SystemEventType = "approval" | "evidence" | "funding" | "dispute" | "variation" | "release";

export type SystemEventDetails = Record<string, string | number | boolean | null>;

export interface SystemEventRecord {
  id: string;
  timestamp: string;
  stageId?: string;
  eventType: SystemEventType;
  actor?: UserRole;
  summary: string;
  details?: SystemEventDetails;
}

export interface SystemStageRecord extends StageRecordV2 {
  evidenceRequirementIds: string[];
  requiredApprovalRoles: ApprovalRole[];
  approvalSequence?: ApprovalRole[];
  contractorName?: string;
  subcontractorName?: string;
  override?: OverrideRecord;
  overrideActive?: boolean;
  onHold?: boolean;
  disputes?: DisputeRecord[];
  variations?: VariationRecord[];
}

export interface SystemStateRecord {
  currentUserId: string;
  users: UserRecord[];
  projects: ProjectRecord[];
  stages: SystemStageRecord[];
  evidenceRequirements: EvidenceRequirementRecord[];
  evidence: EvidenceRecord[];
  approvals: ApprovalRecord[];
  ledgerAccounts: LedgerAccountRecord[];
  ledgerEntries: LedgerEntryRecord[];
  auditLog: AuditLogRecord[];
  eventHistory: SystemEventRecord[];
}
