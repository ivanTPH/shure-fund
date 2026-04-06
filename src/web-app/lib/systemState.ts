import type { ActionType } from "./actionConfig";
import type { PriorityKey } from "./priorityConfig";
import type {
  ActionPriority,
  ApprovalStatus as FundingApprovalStatus,
  ApprovalRole as FundingApprovalRole,
  AuditLogRecord,
  DisputeRecord,
  EvidenceRequirementRecord,
  EvidenceRecord,
  EvidenceStatus,
  EvidenceType,
  FundingSourceType,
  LedgerAccountRecord,
  LedgerEntryRecord,
  QueueActionType,
  SystemStageRecord,
  SystemStateRecord,
  UserRecord,
  UserRole as FundingUserRole,
  VariationRecord,
} from "./shureFundModels";
import {
  type AuditLogEntry,
  type AppUser,
  canActOnApproval,
  canSubmitStageCompletion,
  getStageRemainingFundingRequirement,
  type ApprovalRole,
  type ContractRecord,
  type NotificationRecord,
  type ProjectRecord,
  type ProjectFundingRecord,
  type QueueActionKey,
  type StageRecord,
  type UserRole,
} from "./stageStore";

export type Role = Exclude<UserRole, "admin"> | "delivery" | "All";

export interface RoleViewConfig {
  focus: string[];
  title: string;
}

export type ReleaseRequiredRole = ApprovalRole | "delivery" | "funder";
export type ReleaseStageState = "releasable" | "blocked" | "attention-required";

export interface EvidenceComplianceStatus {
  total: number;
  required: number;
  missingRequired: boolean;
  allRequiredAccepted: boolean;
  state: "compliant" | "action-required" | "pending";
}

export interface PaymentBlockingReason {
  code:
    | "professional-approval-pending"
    | "professional-approval-rejected"
    | "commercial-approval-pending"
    | "commercial-approval-rejected"
    | "treasury-approval-pending"
    | "treasury-approval-rejected"
    | "project-funding-shortfall"
    | "stage-funding-unallocated"
    | "funding-gate-blocked"
    | "evidence-review-requested"
    | "evidence-incomplete"
    | "open-dispute"
    | "pending-variation"
    | "completion-submission-required";
  category: "approval" | "evidence" | "funding" | "dispute" | "variation" | "completion";
  label: string;
  nextRequiredRole?: ReleaseRequiredRole;
  nextRecommendedAction: QueueActionKey;
  priority: PriorityKey;
}

export interface PaymentDecision {
  releasable: boolean;
  state: ReleaseStageState;
  blockingReasons: PaymentBlockingReason[];
  reasons: string[];
  nextRecommendedAction?: PaymentBlockingReason;
}

export interface ReleaseStageDecision {
  stage: StageRecord;
  state: ReleaseStageState;
  releasable: boolean;
  blockers: PaymentBlockingReason[];
  nextAction?: PaymentBlockingReason;
}

export interface ReleaseControlSummary extends ProjectControlSummary {
  blockedStages: number;
  attentionRequiredStages: number;
  releasableStages: number;
}

export interface ReleaseControlGroups {
  releasable: ReleaseStageDecision[];
  blocked: ReleaseStageDecision[];
  attentionRequired: ReleaseStageDecision[];
}

export interface ReleaseControlModel {
  summary: ReleaseControlSummary;
  groupedStages: ReleaseControlGroups;
  stageDecisions: ReleaseStageDecision[];
  actionQueue: ActionQueueItem[];
}

export interface ContractAdministrationSummaryItem {
  contract: ContractRecord;
  stages: StageRecord[];
  totalStageValue: number;
  releasableStages: number;
  blockedStages: number;
  attentionRequiredStages: number;
}

export interface ContractAdministrationModel {
  summaries: ContractAdministrationSummaryItem[];
  stagesByContract: Record<string, StageRecord[]>;
}

export interface ProjectWorkspaceStageListItem {
  id: string;
  name: string;
  workflowState: WorkflowProgressLabel;
  evidenceState: WorkflowProgressLabel;
  approvalState: WorkflowProgressLabel;
  fundingState: WorkflowProgressLabel;
  releaseState: WorkflowProgressLabel;
  hasWarning: boolean;
  isReady: boolean;
}

export interface ProjectWorkspaceApprovalItem {
  role: ApprovalRole;
  status: WorkflowProgressLabel;
}

export interface ProjectWorkspaceStageDetail {
  stage: StageRecord;
  contract: ContractRecord | null;
  workflowState: WorkflowProgressLabel;
  evidenceState: WorkflowProgressLabel;
  approvalState: WorkflowProgressLabel;
  fundingState: WorkflowProgressLabel;
  releaseState: WorkflowProgressLabel;
  commercialContext: string[];
  evidenceItems: StageRecord["evidenceItems"];
  approvals: ProjectWorkspaceApprovalItem[];
  fundingSummary: StageFundingSummary | null;
  releaseDecision: ReleaseStageDecision;
}

export interface ProjectWorkspaceModel {
  stages: ProjectWorkspaceStageListItem[];
  selectedStage: ProjectWorkspaceStageDetail | null;
}

export interface ProjectNotificationSummary {
  total: number;
  unread: number;
  active: number;
  resolved: number;
}

export interface ProjectOverviewMetrics {
  totalContractValue: number;
  ringfencedFunds: number;
  wip30d: number;
  reserveBuffer: number;
  totalRequiredCover: number;
  gap: number;
  releasableValue: number;
  blockedValue: number;
  stagesNeedingAttention: number;
  totalStages: number;
  openDisputes: number;
  pendingVariations: number;
}

export type DashboardFinancialState = "healthy" | "at-risk" | "blocked";

export type ExplicitWorkflowState =
  | "draft"
  | "active"
  | "funded"
  | "awaiting-evidence"
  | "awaiting-approval"
  | "releasable"
  | "blocked"
  | "disputed"
  | "archived";

export interface WorkflowStateSummary {
  state: ExplicitWorkflowState;
  label: string;
}

export interface RoleScopedActionState {
  actions: ActionQueueItem[];
  nextAction: ActionQueueItem | null;
  waitingRole: ReleaseRequiredRole | null;
  isEmptyForRole: boolean;
}

export interface ProjectGuidanceSummary {
  text: string;
  roleLabel: string;
  waitingRoleLabel: string | null;
  actionable: boolean;
}

export interface DashboardPrimaryMetric {
  label: string;
  value: number;
  tone: "safe" | "attention" | "action" | "info";
  helper: string;
}

export interface DashboardStatusItem {
  label: string;
  value: string;
  tone: "healthy" | "at-risk" | "blocked" | "informational";
}

export type WorkflowProgressLabel =
  | "Not started"
  | "In review"
  | "Waiting"
  | "Ready for approval"
  | "Approved"
  | "Ready for release"
  | "Released"
  | "Blocked";

export interface HomeTaskItem {
  id: string;
  projectId: string;
  projectName: string;
  contractTitle?: string;
  stageId?: string;
  stageName?: string;
  title: string;
  summary: string;
  nextActionLabel?: string;
  ownerLabel: string;
  amount?: number;
  priority: PriorityKey;
  actionKey?: QueueActionKey;
  statusLabel: WorkflowProgressLabel;
  issueCount?: number;
  actionType?: ActionType;
}

export interface HomeTaskSections {
  needsMyActionNow: HomeTaskItem[];
  waitingOnOthers: HomeTaskItem[];
  awaitingMyApproval: HomeTaskItem[];
}

export interface ProjectOverviewModel {
  project: ProjectRecord;
  contracts: ContractRecord[];
  stages: StageRecord[];
  funding: FundingAssuranceModel;
  releaseControl: ReleaseControlModel;
  contractAdministration: ContractAdministrationModel;
  metrics: ProjectOverviewMetrics;
  actionQueue: ActionQueueItem[];
  routedNotifications: RoutedNotification[];
  notificationSummary: ProjectNotificationSummary;
  healthState: ProjectRecord["health"];
  trustState: ProjectRecord["trustState"];
}

export interface PortfolioSummary {
  totalProjects: number;
  healthyProjects: number;
  riskProjects: number;
  blockedProjects: number;
  totalContractValue: number;
  totalRingfencedFunds: number;
  totalGap: number;
  releasableValue: number;
  blockedValue: number;
  attentionStages: number;
}

export interface PortfolioOverviewModel {
  projects: ProjectOverviewModel[];
  summary: PortfolioSummary;
}

export type MobileOperationsRole = "delivery" | "professional" | "commercial" | "treasury";

export type RoutedNotification = Omit<
  NotificationRecord,
  "status" | "createdAt" | "updatedAt" | "active"
>;

export interface FundingPosition {
  required: number;
  available: number;
  gap: number;
  canProceed: boolean;
  wipRequired: number;
  reserveBuffer: number;
  totalRequiredWithBuffer: number;
  gapToRequiredCover: number;
  projectedWip30Days: number;
  bufferAmount: number;
  warningThresholdAmount: number;
  allocatedToStages: number;
  unallocatedFunds: number;
  contractFunding: Record<string, ContractFundingSummary>;
  stageFunding: Record<string, StageFundingSummary>;
}

export interface FundingSummaryMetric {
  key: "wip" | "funds" | "reserve" | "gap";
  label: string;
  value: number;
  tone: "blue" | "green" | "amber" | "red";
  helperText: string;
}

export interface StageFundingSummary {
  stageId: string;
  contractId: string;
  stageName: string;
  progressPercent: number;
  remainingRequirement: number;
  projectedWip30Days: number;
  allocated: number;
  shortfall: number;
  canProgress: boolean;
}

export interface ContractFundingSummary {
  contractId: string;
  contractTitle: string;
  totalRequired: number;
  allocated: number;
  available: number;
  shortfall: number;
  fundedState: "fully-funded" | "partially-funded" | "underfunded";
}

export interface FundingAssuranceModel {
  hasFundingData: boolean;
  position: FundingPosition;
  stageForecasts: StageFundingSummary[];
  contractSummaries: ContractFundingSummary[];
}

export interface EvidenceItem {
  id: string;
  stageId: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  status: "accepted" | "submitted" | "missing" | "rejected";
  required: boolean;
}

export interface Dispute {
  id: string;
  contractId: string;
  stageId: string;
  title: string;
  disputedValue: number;
  reason: string;
  status: "open" | "resolved";
  frozenAmount: number;
}

export interface Variation {
  id: string;
  contractId: string;
  title: string;
  addedValue: number;
  fundingRequired: number;
  approved: boolean;
  status: "pending" | "approved";
}

// Role-based dashboard view config helper
export function getRoleViewConfig(role: Role): RoleViewConfig {
  switch (role) {
    case "delivery":
      return {
        focus: ["evidence", "stage-progress"],
        title: "Delivery View",
      };
    case "professional":
      return {
        focus: ["evidence", "professional-approval"],
        title: "Professional Assurance View",
      };
    case "commercial":
      return {
        focus: ["commercial-approval", "disputes", "variations"],
        title: "Commercial View",
      };
    case "treasury":
      return {
        focus: ["funding", "payment-release"],
        title: "Treasury View",
      };
    case "funder":
      return {
        focus: ["funding", "risk", "overview"],
        title: "Funder View",
      };
    default:
      return {
        focus: ["overview", "funding"],
        title: "Project View",
      };
  }
}
function getNextApprovalBlocker(stage: StageRecord): PaymentBlockingReason | null {
  const approvalSequence: ApprovalRole[] = ["professional", "commercial", "treasury"];

  for (const role of approvalSequence) {
    const decision = stage.approvals[role];
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    if (decision === "rejected") {
      return {
        code: `${role}-approval-rejected` as PaymentBlockingReason["code"],
        category: "approval",
        label: `${roleLabel} approval rejected`,
        nextRequiredRole: role,
        nextRecommendedAction: `approve-${role}` as QueueActionKey,
        priority: "high",
      };
    }

    if (decision === "pending") {
      if (canActOnApproval(stage, role)) {
        return {
          code: `${role}-approval-pending` as PaymentBlockingReason["code"],
          category: "approval",
          label: `${roleLabel} approval pending`,
          nextRequiredRole: role,
          nextRecommendedAction: `approve-${role}` as QueueActionKey,
          priority: "medium",
        };
      }

      const prerequisiteRole = role === "commercial" ? "professional" : "commercial";
      const prerequisiteLabel = prerequisiteRole.charAt(0).toUpperCase() + prerequisiteRole.slice(1);

      return {
        code: `${prerequisiteRole}-approval-pending` as PaymentBlockingReason["code"],
        category: "approval",
        label: `${roleLabel} approval waiting for ${prerequisiteLabel.toLowerCase()} sign-off`,
        nextRequiredRole: prerequisiteRole,
        nextRecommendedAction: `approve-${prerequisiteRole}` as QueueActionKey,
        priority: "medium",
      };
    }
  }

  return null;
}

function getOpenDisputeBlocker(stage: StageRecord): PaymentBlockingReason | null {
  const dispute = stage.disputes.find((item) => item.status === "open");

  if (!dispute) {
    return null;
  }

  return {
    code: "open-dispute",
    category: "dispute",
    label: dispute.title,
    nextRequiredRole: "commercial",
    nextRecommendedAction: "review-dispute",
    priority: "high",
  };
}

function getPendingVariationBlocker(stage: StageRecord): PaymentBlockingReason | null {
  const variation = stage.variations.find((item) => item.status === "pending");

  if (!variation) {
    return null;
  }

  return {
    code: "pending-variation",
    category: "variation",
    label: variation.title,
    nextRequiredRole: "commercial",
    nextRecommendedAction: "review-variation",
    priority: "medium",
  };
}

function getEvidenceBlocker(stage: StageRecord): PaymentBlockingReason | null {
  if (stage.evidenceStatus === "accepted") {
    return null;
  }

  if (stage.evidenceStatus === "pending" || stage.evidenceStatus === "reviewed") {
    return {
      code: "evidence-review-requested",
      category: "evidence",
      label: "Evidence review requested",
      nextRequiredRole: "delivery",
      nextRecommendedAction: "review-evidence",
      priority: "high",
    };
  }

  return {
    code: "evidence-incomplete",
    category: "evidence",
    label: "Required evidence not fully accepted",
    nextRequiredRole: "delivery",
    nextRecommendedAction: "review-evidence",
    priority: "high",
  };
}

function getCompletionBlocker(stage: StageRecord): PaymentBlockingReason | null {
  if (stage.lifecycle === "draft" || stage.lifecycle === "archived" || stage.lifecycle === "rejected") {
    return null;
  }

  if (!canSubmitStageCompletion(stage)) {
    return null;
  }

  if (stage.completionState === "submitted" || stage.completionState === "accepted") {
    return null;
  }

  return {
    code: "completion-submission-required",
    category: "completion",
    label:
      stage.completionState === "returned"
        ? "Stage completion resubmission required"
        : "Stage completion submission required",
    nextRequiredRole: "delivery",
    nextRecommendedAction: "record-completion",
    priority: "medium",
  };
}

function getTodayDate() {
  return new Date();
}

function createEmptyFundingPosition(): FundingPosition {
  return {
    required: 0,
    available: 0,
    gap: 0,
    canProceed: false,
    wipRequired: 0,
    reserveBuffer: 0,
    totalRequiredWithBuffer: 0,
    gapToRequiredCover: 0,
    projectedWip30Days: 0,
    bufferAmount: 0,
    warningThresholdAmount: 0,
    allocatedToStages: 0,
    unallocatedFunds: 0,
    contractFunding: {},
    stageFunding: {},
  };
}

function toMidnight(dateInput: string | Date) {
  const date = typeof dateInput === "string" ? new Date(`${dateInput}T00:00:00`) : new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDaySpan(start: Date, end: Date) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.max(Math.round((end.getTime() - start.getTime()) / millisecondsPerDay) + 1, 1);
}

function getStageForecastWip(stage: StageRecord, windowStart: Date, windowEnd: Date) {
  const stageStart = toMidnight(stage.plannedStart);
  const stageEnd = toMidnight(stage.plannedEnd);
  const overlapStart = stageStart > windowStart ? stageStart : windowStart;
  const overlapEnd = stageEnd < windowEnd ? stageEnd : windowEnd;

  if (overlapEnd < overlapStart) {
    return 0;
  }

  const overlapDays = getDaySpan(overlapStart, overlapEnd);
  const stageDays = getDaySpan(stageStart, stageEnd);
  const remainingRequirement = getStageRemainingFundingRequirement(stage);

  return Math.min(remainingRequirement, stage.value * (overlapDays / stageDays));
}

export function deriveFundingAssuranceModel(
  project: { id: string; fundingBuffer?: number },
  contracts: ContractRecord[],
  stages: StageRecord[],
  projectFundingRecord: ProjectFundingRecord | null,
): FundingAssuranceModel {
  const hasFundingData = projectFundingRecord !== null;
  const funding = projectFundingRecord ?? {
    projectId: project.id,
    ringfencedFunds: 0,
    bufferAmount: project.fundingBuffer ?? 0,
    warningThresholdPercent: 15,
    stageAllocations: {},
    lastUpdatedAt: new Date().toISOString(),
  };
  const windowStart = toMidnight(getTodayDate());
  const windowEnd = toMidnight(new Date(windowStart.getTime() + 29 * 24 * 60 * 60 * 1000));
  const stageForecasts = stages.map((stage) => {
    const allocated = funding.stageAllocations[stage.id] ?? 0;
    const remainingRequirement = getStageRemainingFundingRequirement(stage);
    const projectedWip30Days = getStageForecastWip(stage, windowStart, windowEnd);
    const shortfall = Math.max(remainingRequirement - allocated, 0);

    return {
      stageId: stage.id,
      contractId: stage.contractId,
      stageName: stage.name,
      progressPercent: stage.progressPercent,
      remainingRequirement,
      projectedWip30Days,
      allocated,
      shortfall,
      canProgress: shortfall === 0,
    } satisfies StageFundingSummary;
  });
  const projectedWip30Days = stageForecasts.reduce((total, stage) => total + stage.projectedWip30Days, 0);
  const allocatedToStages = stageForecasts.reduce((total, stage) => total + stage.allocated, 0);
  const available = funding.ringfencedFunds;
  const required = projectedWip30Days + funding.bufferAmount;
  const gap = Math.max(required - available, 0);
  const warningThresholdAmount = required + required * (funding.warningThresholdPercent / 100);
  const contractSummaries = contracts.map((contract) => {
    const contractStages = stageForecasts.filter((stage) => stage.contractId === contract.id);
    const totalRequired = contractStages.reduce((total, stage) => total + stage.remainingRequirement, 0);
    const allocated = contractStages.reduce((total, stage) => total + stage.allocated, 0);
    const shortfall = Math.max(totalRequired - allocated, 0);

    return {
      contractId: contract.id,
      contractTitle: contract.title,
      totalRequired,
      allocated,
      available: contract.allocatedFunding,
      shortfall,
      fundedState: shortfall === 0 ? "fully-funded" : allocated > 0 ? "partially-funded" : "underfunded",
    } satisfies ContractFundingSummary;
  });

  return {
    hasFundingData,
    position: {
      required,
      available,
      gap,
      canProceed: available >= required,
      wipRequired: projectedWip30Days,
      reserveBuffer: funding.bufferAmount,
      totalRequiredWithBuffer: required,
      gapToRequiredCover: gap,
      projectedWip30Days,
      bufferAmount: funding.bufferAmount,
      warningThresholdAmount,
      allocatedToStages,
      unallocatedFunds: Math.max(available - allocatedToStages, 0),
      contractFunding: Object.fromEntries(contractSummaries.map((contract) => [contract.contractId, contract])),
      stageFunding: Object.fromEntries(stageForecasts.map((stage) => [stage.stageId, stage])),
    },
    stageForecasts,
    contractSummaries,
  };
}

function getFundingBlockers(stage: StageRecord, funding: FundingPosition): PaymentBlockingReason[] {
  const blockers: PaymentBlockingReason[] = [];
  const stageFunding = funding.stageFunding[stage.id];

  if (stageFunding && stageFunding.shortfall > 0) {
    blockers.push({
      code: "stage-funding-unallocated",
      category: "funding",
      label: `${stage.name} is short £${Math.round(stageFunding.shortfall).toLocaleString("en-GB")} of required stage funding`,
      nextRequiredRole: "treasury",
      nextRecommendedAction: "allocate-stage-funding",
      priority: "critical",
    });
  }

  if (!stage.fundingGate) {
    blockers.push({
      code: "funding-gate-blocked",
      category: "funding",
      label: "Funding gate blocked",
      nextRequiredRole: "treasury",
      nextRecommendedAction: stageFunding && stageFunding.shortfall > 0 ? "allocate-stage-funding" : "release-funding",
      priority: "critical",
    });
  }

  if (!funding.canProceed) {
    blockers.push({
      code: "project-funding-shortfall",
      category: "funding",
      label: "Project funding shortfall blocks release",
      nextRequiredRole: "funder",
      nextRecommendedAction: "add-funds",
      priority: "critical",
    });
  }

  return blockers;
}

function getReleaseBlockers(stage: StageRecord, funding: FundingPosition): PaymentBlockingReason[] {
  const blockers: PaymentBlockingReason[] = [];
  const approvalBlocker = getNextApprovalBlocker(stage);
  const disputeBlocker = getOpenDisputeBlocker(stage);
  const variationBlocker = getPendingVariationBlocker(stage);
  const evidenceBlocker = getEvidenceBlocker(stage);
  const completionBlocker = getCompletionBlocker(stage);

  if (approvalBlocker) {
    blockers.push(approvalBlocker);
  }

  if (disputeBlocker) {
    blockers.push(disputeBlocker);
  }

  if (variationBlocker) {
    blockers.push(variationBlocker);
  }

  if (evidenceBlocker) {
    blockers.push(evidenceBlocker);
  }

  if (completionBlocker) {
    blockers.push(completionBlocker);
  }

  blockers.push(...getFundingBlockers(stage, funding));

  return blockers.sort((left, right) => {
    const priorityRank: Record<PriorityKey, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return priorityRank[left.priority] - priorityRank[right.priority];
  });
}

function getReleaseStageState(blockers: PaymentBlockingReason[]): ReleaseStageState {
  if (blockers.length === 0) {
    return "releasable";
  }

  if (
    blockers.some(
      (blocker) =>
        blocker.category === "funding" ||
        blocker.code.endsWith("rejected") ||
        blocker.code === "evidence-incomplete",
    )
  ) {
    return "blocked";
  }

  return "attention-required";
}

export function deriveReleaseStageDecision(stage: StageRecord, funding: FundingPosition): ReleaseStageDecision {
  const blockers = getReleaseBlockers(stage, funding);
  const state = getReleaseStageState(blockers);

  return {
    stage,
    state,
    releasable: blockers.length === 0,
    blockers,
    nextAction: blockers[0],
  };
}

// Payment release decision reasoning helper
export function getPaymentDecision(stage: StageRecord, funding?: FundingPosition): PaymentDecision {
  const effectiveFunding = funding ?? createEmptyFundingPosition();
  const decision = deriveReleaseStageDecision(stage, effectiveFunding);

  return {
    releasable: decision.releasable,
    state: decision.state,
    blockingReasons: decision.blockers,
    reasons: decision.blockers.map((reason) => reason.label),
    nextRecommendedAction: decision.nextAction,
  };
}

export function deriveFundingMetricCards(funding: FundingPosition): FundingSummaryMetric[] {
  return [
    {
      key: "wip",
      label: "WIP 30d",
      value: funding.wipRequired,
      tone: "blue",
      helperText: "Projected work-in-progress over the next 30 days",
    },
    {
      key: "reserve",
      label: "Reserve Buffer",
      value: funding.reserveBuffer,
      tone: "amber",
      helperText: "Additional buffer held above projected WIP",
    },
    {
      key: "funds",
      label: "Ringfenced Funds",
      value: funding.available,
      tone: "green",
      helperText: "Cash currently ringfenced for project delivery",
    },
    {
      key: "gap",
      label: "Gap to Required Cover",
      value: funding.gapToRequiredCover,
      tone: "red",
      helperText: "max(0, (WIP 30d + Reserve Buffer) - Ringfenced Funds)",
    },
  ];
}

export function formatRoleLabel(role?: ReleaseRequiredRole | Role | UserRole | null): string {
  if (!role || role === "All") return "Owner";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function deriveFinancialHealthState({
  gapToRequiredCover,
  canProceed,
  releasableValue,
}: {
  gapToRequiredCover: number;
  canProceed: boolean;
  releasableValue: number;
}): DashboardFinancialState {
  if (gapToRequiredCover > 0 && !canProceed) {
    return "blocked";
  }

  if (gapToRequiredCover > 0) {
    return "at-risk";
  }

  if (releasableValue > 0) {
    return "healthy";
  }

  return "at-risk";
}

export function getGapDescriptor(gapToRequiredCover: number, canProceed: boolean, hasFundingData = true) {
  if (!hasFundingData) {
    return "Funding information is missing.";
  }

  if (gapToRequiredCover <= 0) {
    return "Cover is in place.";
  }

  return canProceed ? "Funding gap to review." : "Funding shortfall is blocking progress.";
}

export function deriveWorkflowState(stage: StageRecord, funding: FundingPosition): WorkflowStateSummary {
  if (stage.lifecycle === "archived") {
    return { state: "archived", label: "Archived" };
  }

  if (stage.lifecycle === "draft") {
    return { state: "draft", label: "Draft" };
  }

  if (stage.disputeState === "open") {
    return { state: "disputed", label: "Disputed" };
  }

  const decision = deriveReleaseStageDecision(stage, funding);

  if (decision.releasable) {
    return { state: "releasable", label: "Releasable" };
  }

  if (decision.blockers.some((blocker) => blocker.category === "funding")) {
    return { state: "blocked", label: "Blocked" };
  }

  if (stage.evidenceStatus !== "accepted") {
    return { state: "awaiting-evidence", label: "Awaiting evidence" };
  }

  if (stage.approvals.professional !== "approved" || stage.approvals.commercial !== "approved" || stage.approvals.treasury !== "approved") {
    return { state: "awaiting-approval", label: "Awaiting approval" };
  }

  if (stage.fundingGate || stage.fundingStatus === "funded") {
    return { state: "funded", label: "Funded" };
  }

  return { state: "active", label: "Active" };
}

export function deriveWorkflowProgressLabel(stage: StageRecord, funding: FundingPosition): WorkflowProgressLabel {
  const workflow = deriveWorkflowState(stage, funding);

  switch (workflow.state) {
    case "draft":
      return "Not started";
    case "awaiting-evidence":
      return "In review";
    case "awaiting-approval":
      return stage.evidenceStatus === "accepted" ? "Ready for approval" : "Waiting";
    case "releasable":
      return "Ready for release";
    case "blocked":
    case "disputed":
      return "Blocked";
    case "funded":
    case "active":
    case "archived":
    default:
      return stage.completionState === "accepted" ? "Released" : "In review";
  }
}

function mapEvidenceStateToWorkflowLabel(stage: StageRecord): WorkflowProgressLabel {
  switch (stage.evidenceStatus) {
    case "accepted":
      return "Approved";
    case "reviewed":
    case "pending":
      return "In review";
    case "missing":
      return "Waiting";
    case "rejected":
      return "Blocked";
    default:
      return "Not started";
  }
}

function mapApprovalStateToWorkflowLabel(stage: StageRecord): WorkflowProgressLabel {
  const decisions = Object.values(stage.approvals);

  if (decisions.every((decision) => decision === "approved")) {
    return "Approved";
  }

  if (decisions.some((decision) => decision === "rejected")) {
    return "Blocked";
  }

  if (decisions.some((decision) => decision === "pending")) {
    return stage.evidenceStatus === "accepted" ? "Waiting" : "Not started";
  }

  return "Not started";
}

function mapFundingStateToWorkflowLabel(stage: StageRecord, stageFunding: StageFundingSummary | null): WorkflowProgressLabel {
  if (stage.fundingGate || stage.fundingStatus === "funded" || (stageFunding && stageFunding.shortfall <= 0 && stageFunding.canProgress)) {
    return "Approved";
  }

  if (stageFunding && stageFunding.shortfall > 0 && !stageFunding.canProgress) {
    return "Blocked";
  }

  if (stage.fundingStatus === "reserved" || (stageFunding && stageFunding.allocated > 0)) {
    return "In review";
  }

  return "Waiting";
}

function mapReleaseStateToWorkflowLabel(decision: ReleaseStageDecision, stage: StageRecord): WorkflowProgressLabel {
  if (stage.completionState === "accepted" && decision.releasable) {
    return "Released";
  }

  if (decision.releasable) {
    return "Approved";
  }

  if (decision.state === "blocked") {
    return "Blocked";
  }

  return "Waiting";
}

function mapApprovalDecisionToWorkflowLabel(status: StageRecord["approvals"][ApprovalRole]): WorkflowProgressLabel {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Blocked";
    default:
      return "Waiting";
  }
}

export function filterActionsForRole(actions: ActionQueueItem[], role: Role): ActionQueueItem[] {
  return actions
    .filter((action) => {
      if (role === "All") return true;
      switch (role) {
        case "treasury":
          return action.type === "funding" || action.requiredRole === "treasury";
        case "funder":
          return action.type === "funding" || action.requiredRole === "funder";
        case "commercial":
          return action.type === "dispute" || action.type === "variation" || action.requiredRole === "commercial";
        case "delivery":
          return action.type === "evidence" || action.requiredRole === "delivery" || action.type === "completion";
        case "professional":
          return action.requiredRole === "professional";
        default:
          return true;
      }
    })
    .sort((a, b) => {
      const priorityRank: Record<PriorityKey, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };

      return priorityRank[a.priority] - priorityRank[b.priority];
    });
}

export function deriveRoleScopedActionState(actions: ActionQueueItem[], role: Role): RoleScopedActionState {
  const filteredActions = filterActionsForRole(actions, role);
  const nextAction = filteredActions[0] ?? null;
  const waitingRole = nextAction ? null : actions[0]?.requiredRole ?? null;

  return {
    actions: filteredActions,
    nextAction,
    waitingRole,
    isEmptyForRole: filteredActions.length === 0,
  };
}

export function deriveGuidanceCopy({
  state,
  gap,
  canProceed,
  releasableValue,
  action,
  role,
}: {
  state: DashboardFinancialState;
  gap: number;
  canProceed: boolean;
  releasableValue: number;
  action?: ActionQueueItem | null;
  role: Role;
}): ProjectGuidanceSummary {
  if (action) {
    return {
      text:
        action.type === "funding" && gap > 0
          ? `Add £${Math.round(gap).toLocaleString("en-GB")} to restore funding cover`
          : `${action.title}${action.stageName ? ` for ${action.stageName}` : ""}`.replace(/\s+/g, " ").trim(),
      roleLabel: formatRoleLabel(action.requiredRole),
      waitingRoleLabel: null,
      actionable: true,
    };
  }

  if (role !== "All") {
    return {
      text: "No actions required for your role",
      roleLabel: formatRoleLabel(role),
      waitingRoleLabel: null,
      actionable: false,
    };
  }

  if (state === "blocked") {
    return {
      text: `Add £${Math.round(gap).toLocaleString("en-GB")} to restore funding cover`,
      roleLabel: canProceed ? "Owner" : "Treasury",
      waitingRoleLabel: null,
      actionable: true,
    };
  }

  if (state === "at-risk") {
    return {
      text: gap > 0 ? `Prevent a £${Math.round(gap).toLocaleString("en-GB")} funding gap from widening` : "Review next blocker before release",
      roleLabel: "Owner",
      waitingRoleLabel: null,
      actionable: true,
    };
  }

  return {
    text: releasableValue > 0 ? "Review releasable value for controlled payment" : "Monitor next stage for readiness",
    roleLabel: "Owner",
    waitingRoleLabel: null,
    actionable: true,
  };
}

export function deriveControlSummaryForRole(summary: ProjectControlSummary, role: Role): Partial<ProjectControlSummary> {
  if (role === "All") {
    return summary;
  }

  const roleMetrics: Record<Role, readonly (keyof ProjectControlSummary)[]> = {
    All: [],
    funder: [],
    treasury: ["blockedByFunding", "readyForPayment"],
    commercial: ["openDisputes", "pendingVariations"],
    delivery: ["actionRequiredEvidence"],
    professional: [],
  };

  return Object.fromEntries(
    Object.entries(summary).filter(([key]) => roleMetrics[role].includes(key as keyof ProjectControlSummary)),
  ) as Partial<ProjectControlSummary>;
}

export function deriveReleaseGroups(
  decisions: ReleaseStageDecision[],
  filters?: { contractId?: string | null; state?: ReleaseStageState | "all" },
): ReleaseControlGroups {
  const filtered = decisions.filter((decision) => {
    if (filters?.contractId && filters.contractId !== "all" && decision.stage.contractId !== filters.contractId) {
      return false;
    }

    if (filters?.state && filters.state !== "all" && decision.state !== filters.state) {
      return false;
    }

    return true;
  });

  return {
    releasable: filtered.filter((decision) => decision.state === "releasable"),
    blocked: filtered.filter((decision) => decision.state === "blocked"),
    attentionRequired: filtered.filter((decision) => decision.state === "attention-required"),
  };
}

export function deriveOverviewStatusItems(
  portfolio: PortfolioOverviewModel,
  role: Role,
): DashboardStatusItem[] {
  const projectsRequiringAction = portfolio.projects.filter((project) => deriveRoleScopedActionState(project.actionQueue, role).actions.length > 0).length;
  const blockedItems = portfolio.projects.reduce((count, project) => count + project.releaseControl.summary.blockedStages, 0);

  return [
    {
      label: "Need action",
      value: String(projectsRequiringAction),
      tone: projectsRequiringAction > 0 ? "blocked" : "healthy",
    },
    {
      label: "Ready to release",
      value: `£${Math.round(portfolio.summary.releasableValue).toLocaleString("en-GB")}`,
      tone: "healthy",
    },
    {
      label: "Funding gap",
      value: `£${Math.round(portfolio.summary.totalGap).toLocaleString("en-GB")}`,
      tone: portfolio.summary.totalGap > 0 ? "blocked" : "informational",
    },
    {
      label: "Blocked",
      value: String(blockedItems),
      tone: blockedItems > 0 ? "at-risk" : "healthy",
    },
  ];
}

export function deriveHomeTaskSections(
  portfolio: PortfolioOverviewModel,
  role: Role,
): HomeTaskSections {
  const needsMyActionNow: HomeTaskItem[] = [];
  const waitingOnOthers: HomeTaskItem[] = [];
  const awaitingMyApproval: HomeTaskItem[] = [];

  const priorityRank: Record<PriorityKey, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  const aggregateItems = (items: HomeTaskItem[]) =>
    Array.from(
      items.reduce((acc, item) => {
        const key = `${item.projectId}:${item.stageId ?? "project"}`;
        const group = acc.get(key) ?? [];
        group.push(item);
        acc.set(key, group);
        return acc;
      }, new Map<string, HomeTaskItem[]>()),
    ).map(([, group]) => {
      const sorted = [...group].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
      const primary = sorted[0];
      const distinctSummaries = Array.from(new Set(sorted.map((item) => item.summary).filter(Boolean)));
      const fundingIssues = sorted.filter(
        (item) => item.actionType === "funding" || /funding|cover|shortfall|gap/i.test(item.summary),
      );
      const additionalIssueCount = Math.max(sorted.length - 1, 0);

      let summary = primary.summary;

      if (fundingIssues.length > 1) {
        summary = primary.statusLabel === "Blocked" ? "Funding is blocking this stage." : "Funding needs attention.";
      } else if (distinctSummaries.length > 1) {
        summary = `${primary.summary}${additionalIssueCount > 0 ? ` Plus ${additionalIssueCount} more issue${additionalIssueCount > 1 ? "s" : ""}.` : ""}`;
      }

      return {
        ...primary,
        summary,
        nextActionLabel: primary.nextActionLabel ?? primary.title,
        issueCount: sorted.length > 1 ? sorted.length : undefined,
      };
    });

  portfolio.projects.forEach((project) => {
    const roleActions = filterActionsForRole(project.actionQueue, role);
    const otherActions =
      role === "All"
        ? []
        : project.actionQueue.filter((action) => !roleActions.some((roleAction) => roleAction.id === action.id));

    const mapActionToTask = (action: ActionQueueItem): HomeTaskItem => {
      const stage = action.stageId ? project.stages.find((item) => item.id === action.stageId) ?? null : null;
      const contract = stage ? project.contracts.find((item) => item.id === stage.contractId) ?? null : null;
      return {
        id: action.id,
        projectId: project.project.id,
        projectName: project.project.name,
        contractTitle: contract?.title,
        stageId: stage?.id,
        stageName: stage?.name,
        title: stage?.name ?? action.title,
        summary: action.blockerLabel ?? action.detail,
        nextActionLabel: action.title,
        ownerLabel: formatRoleLabel(action.requiredRole ?? role),
        amount: stage?.value,
        priority: action.priority,
        actionKey: action.actionKey,
        statusLabel: stage ? deriveWorkflowProgressLabel(stage, project.funding.position) : "In review",
        actionType: action.type,
      };
    };

    roleActions.forEach((action) => {
      const item = mapActionToTask(action);
      needsMyActionNow.push(item);

      if (action.type === "approval" && (role === "All" || action.requiredRole === role)) {
        awaitingMyApproval.push(item);
      }
    });

    otherActions.forEach((action) => {
      waitingOnOthers.push(mapActionToTask(action));
    });
  });

  const sortByPriority = (items: HomeTaskItem[]) =>
    [...items].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

return {
  needsMyActionNow: sortByPriority(aggregateItems(needsMyActionNow)),
  waitingOnOthers: sortByPriority(aggregateItems(waitingOnOthers)),
  awaitingMyApproval: sortByPriority(aggregateItems(awaitingMyApproval)),
};
}

function getAuditEntryRole(entry: AuditLogEntry): ApprovalRole | null {
  switch (entry.actionKey) {
    case "approve-professional":
    case "review-audit":
      return "professional";
    case "approve-commercial":
    case "review-dispute":
    case "review-variation":
      return "commercial";
    case "approve-treasury":
    case "release-funding":
      return "treasury";
    default:
      return null;
  }
}

export function deriveRecentCompletedItems(
  auditLog: AuditLogEntry[],
  portfolio: PortfolioOverviewModel,
): HomeTaskItem[] {
  return auditLog
    .filter((entry) => entry.success)
    .slice()
    .reverse()
    .slice(0, 6)
    .map((entry) => {
      const stage = entry.stageId
        ? portfolio.projects.flatMap((projectModel) => projectModel.stages).find((item) => item.id === entry.stageId) ?? null
        : null;
      const project = stage
        ? portfolio.projects.find((projectModel) =>
            projectModel.contracts.some((contract) => contract.id === stage.contractId),
          ) ?? null
        : portfolio.projects[0] ?? null;
      const statusLabel: HomeTaskItem["statusLabel"] = entry.actionKey === "release-funding" ? "Released" : "Approved";

      return {
        id: entry.id,
        projectId: project?.project.id ?? "unknown-project",
        projectName: project?.project.name ?? "Unknown project",
        contractTitle: stage ? project?.contracts.find((contract) => contract.id === stage.contractId)?.title : undefined,
        stageId: stage?.id,
        stageName: stage?.name,
        title: entry.actionKey === "release-funding" ? "Payment released" : "Workflow completed",
        summary: entry.message,
        nextActionLabel: undefined,
        ownerLabel: formatRoleLabel(getAuditEntryRole(entry) ?? null),
        amount: stage?.value,
        priority: "low",
        actionKey: undefined,
        statusLabel,
      };
    });
}

export function derivePrimaryDashboardMetric(
  funding: FundingAssuranceModel,
): DashboardPrimaryMetric {
  if (!funding.hasFundingData) {
    return {
      label: "Funding Data Status",
      value: 0,
      tone: "info",
      helper: "Funding records are awaiting controlled data confirmation.",
    };
  }

  if (funding.position.gapToRequiredCover > 0) {
    return {
      label: "Gap to Required Cover",
      value: funding.position.gapToRequiredCover,
      tone: "action",
      helper: getGapDescriptor(funding.position.gapToRequiredCover, funding.position.canProceed, funding.hasFundingData),
    };
  }

  return {
    label: "Ringfenced Funds Available",
    value: funding.position.available,
    tone: "safe",
    helper: "Only verified and approved value becomes releasable.",
  };
}

function deriveProjectHealthState(
  project: ProjectRecord,
  releaseControl: ReleaseControlModel,
  funding: FundingAssuranceModel,
): ProjectRecord["health"] {
  if (funding.position.gapToRequiredCover > 0 || releaseControl.groupedStages.blocked.length > 0) {
    return "blocked";
  }

  if (
    releaseControl.groupedStages.attentionRequired.length > 0 ||
    releaseControl.summary.openDisputes > 0 ||
    releaseControl.summary.pendingVariations > 0
  ) {
    return "at-risk";
  }

  return project.health === "blocked" ? "healthy" : project.health;
}

function deriveProjectTrustState(healthState: ProjectRecord["health"]): ProjectRecord["trustState"] {
  if (healthState === "blocked") {
    return "critical";
  }

  if (healthState === "at-risk") {
    return "watch";
  }

  return "trusted";
}

function deriveProjectNotificationSummary(notifications: NotificationRecord[]): ProjectNotificationSummary {
  return {
    total: notifications.length,
    unread: notifications.filter((notification) => notification.status === "unread").length,
    active: notifications.filter((notification) => notification.active).length,
    resolved: notifications.filter((notification) => notification.status === "resolved").length,
  };
}

export function deriveProjectOverviewModel(
  project: ProjectRecord,
  contracts: ContractRecord[],
  stages: StageRecord[],
  projectFundingRecord: ProjectFundingRecord | null,
  users: AppUser[],
  notifications: NotificationRecord[],
): ProjectOverviewModel {
  const projectContracts = contracts.filter((contract) => contract.projectId === project.id);
  const contractIds = new Set(projectContracts.map((contract) => contract.id));
  const projectStages = stages.filter((stage) => contractIds.has(stage.contractId));
  const funding = deriveFundingAssuranceModel(project, projectContracts, projectStages, projectFundingRecord);
  const releaseControl = deriveReleaseControlModel(projectStages, funding.position);
  const contractAdministration = deriveContractAdministrationModel(projectContracts, projectStages, funding.position);
  const routedNotifications = deriveRoutedNotifications(
    releaseControl.actionQueue,
    users,
    projectContracts,
    projectStages,
    project.id,
  );
  const projectNotifications = notifications.filter((notification) => notification.projectId === project.id);
  const mergedNotifications = projectNotifications.length > 0 ? projectNotifications : routedNotifications.map((notification) => ({
    ...notification,
    status: "unread" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    active: true,
  }));
  const releasableValue = releaseControl.groupedStages.releasable.reduce((total, decision) => total + decision.stage.value, 0);
  const blockedValue = releaseControl.groupedStages.blocked.reduce((total, decision) => total + decision.stage.value, 0);
  const healthState = deriveProjectHealthState(project, releaseControl, funding);
  const trustState = deriveProjectTrustState(healthState);

  return {
    project,
    contracts: projectContracts,
    stages: projectStages,
    funding,
    releaseControl,
    contractAdministration,
    metrics: {
      totalContractValue: projectContracts.reduce((total, contract) => total + contract.totalValue, 0),
      ringfencedFunds: funding.position.available,
      wip30d: funding.position.wipRequired,
      reserveBuffer: funding.position.reserveBuffer,
      totalRequiredCover: funding.position.totalRequiredWithBuffer,
      gap: funding.position.gapToRequiredCover,
      releasableValue,
      blockedValue,
      stagesNeedingAttention: releaseControl.groupedStages.attentionRequired.length + releaseControl.groupedStages.blocked.length,
      totalStages: projectStages.length,
      openDisputes: releaseControl.summary.openDisputes,
      pendingVariations: releaseControl.summary.pendingVariations,
    },
    actionQueue: releaseControl.actionQueue,
    routedNotifications,
    notificationSummary: deriveProjectNotificationSummary(mergedNotifications),
    healthState,
    trustState,
  };
}

export function deriveProjectWorkspaceModel(
  projectModel: ProjectOverviewModel,
  selectedStageId?: string | null,
): ProjectWorkspaceModel {
  const stages = projectModel.stages.map((stage) => {
    const fundingSummary = projectModel.funding.position.stageFunding[stage.id] ?? null;
    const releaseDecision = deriveReleaseStageDecision(stage, projectModel.funding.position);
    const workflowState = deriveWorkflowProgressLabel(stage, projectModel.funding.position);
    const evidenceState = mapEvidenceStateToWorkflowLabel(stage);
    const approvalState = mapApprovalStateToWorkflowLabel(stage);
    const fundingState = mapFundingStateToWorkflowLabel(stage, fundingSummary);
    const releaseState = mapReleaseStateToWorkflowLabel(releaseDecision, stage);

    return {
      id: stage.id,
      name: stage.name,
      workflowState,
      evidenceState,
      approvalState,
      fundingState,
      releaseState,
      hasWarning: releaseDecision.blockers.length > 0 || stage.blockers.length > 0,
      isReady: releaseDecision.releasable,
    };
  });

  const selectedStage =
    projectModel.stages.find((stage) => stage.id === selectedStageId) ??
    projectModel.stages[0] ??
    null;

  if (!selectedStage) {
    return {
      stages,
      selectedStage: null,
    };
  }

  const selectedContract = projectModel.contracts.find((contract) => contract.id === selectedStage.contractId) ?? null;
  const fundingSummary = projectModel.funding.position.stageFunding[selectedStage.id] ?? null;
  const releaseDecision = deriveReleaseStageDecision(selectedStage, projectModel.funding.position);

  return {
    stages,
    selectedStage: {
      stage: selectedStage,
      contract: selectedContract,
      workflowState: deriveWorkflowProgressLabel(selectedStage, projectModel.funding.position),
      evidenceState: mapEvidenceStateToWorkflowLabel(selectedStage),
      approvalState: mapApprovalStateToWorkflowLabel(selectedStage),
      fundingState: mapFundingStateToWorkflowLabel(selectedStage, fundingSummary),
      releaseState: mapReleaseStateToWorkflowLabel(releaseDecision, selectedStage),
      commercialContext: [
        selectedContract?.title ?? "Contract not linked",
        selectedContract?.summary ?? "No contract summary available",
        selectedContract
          ? `Commercial parties: ${selectedContract.parties.map((party) => `${party.organisation} (${party.role})`).join(", ")}`
          : "Commercial parties not available",
      ],
      evidenceItems: selectedStage.evidenceItems,
      approvals: (["professional", "commercial", "treasury"] as ApprovalRole[]).map((role) => ({
        role,
        status: mapApprovalDecisionToWorkflowLabel(selectedStage.approvals[role]),
      })),
      fundingSummary,
      releaseDecision,
    },
  };
}

export function derivePortfolioOverviewModel(
  projects: ProjectRecord[],
  contracts: ContractRecord[],
  stages: StageRecord[],
  projectFunding: ProjectFundingRecord[],
  users: AppUser[],
  notifications: NotificationRecord[],
): PortfolioOverviewModel {
  const projectModels = projects
    .filter((project) => project.active)
    .map((project) =>
      deriveProjectOverviewModel(
        project,
        contracts,
        stages,
        projectFunding.find((funding) => funding.projectId === project.id) ?? null,
        users,
        notifications,
      ),
    );

  return {
    projects: projectModels,
    summary: {
      totalProjects: projectModels.length,
      healthyProjects: projectModels.filter((project) => project.healthState === "healthy").length,
      riskProjects: projectModels.filter((project) => project.healthState === "at-risk").length,
      blockedProjects: projectModels.filter((project) => project.healthState === "blocked").length,
      totalContractValue: projectModels.reduce((total, project) => total + project.metrics.totalContractValue, 0),
      totalRingfencedFunds: projectModels.reduce((total, project) => total + project.metrics.ringfencedFunds, 0),
      totalGap: projectModels.reduce((total, project) => total + project.metrics.gap, 0),
      releasableValue: projectModels.reduce((total, project) => total + project.metrics.releasableValue, 0),
      blockedValue: projectModels.reduce((total, project) => total + project.metrics.blockedValue, 0),
      attentionStages: projectModels.reduce((total, project) => total + project.metrics.stagesNeedingAttention, 0),
    },
  };
}

export function getQueueActionType(actionKey: QueueActionKey): ActionType {
  switch (actionKey) {
    case "release-funding":
    case "add-funds":
    case "allocate-stage-funding":
    case "adjust-buffer":
      return "funding";
    case "review-dispute":
      return "dispute";
    case "review-variation":
      return "variation";
    case "review-evidence":
      return "evidence";
    case "review-audit":
      return "audit";
    case "record-completion":
      return "completion";
    case "mark-ready":
      return "readiness";
    default:
      return "approval";
  }
}
// Action Queue helper
export interface ActionQueueItem {
  id: string;
  priority: PriorityKey;
  title: string;
  detail: string;
  owner: string;
  type: ActionType;
  stageId?: string;
  stageName?: string;
  blockerLabel?: string;
  requiredRole?: PaymentBlockingReason["nextRequiredRole"];
  actionKey: QueueActionKey;
}

export interface ActionQueueInput {
  stages: StageRecord[];
  project: Project & {
    projectedWIP30Days: number;
    fundingBuffer: number;
  };
  calculateFundingPosition: (project: {
    projectedWIP30Days: number;
    fundingBuffer: number;
    reserveAvailable: number;
  }) => FundingPosition;
}

export interface ProjectControlSummary {
  readyForPayment: number;
  blockedByFunding: number;
  openDisputes: number;
  pendingVariations: number;
  actionRequiredEvidence: number;
}

export interface ProjectControlSummaryInput {
  stages: StageRecord[];
  project: Project & {
    projectedWIP30Days: number;
    fundingBuffer: number;
  };
  calculateFundingPosition: (project: {
    projectedWIP30Days: number;
    fundingBuffer: number;
    reserveAvailable: number;
  }) => FundingPosition;
}

export function getActionQueue(input: ActionQueueInput): ActionQueueItem[];
export function getActionQueue(state: SystemStateRecord, projectId?: string): FundingActionQueueItem[];
export function getActionQueue(
  input: ActionQueueInput | SystemStateRecord,
  projectId?: string,
): ActionQueueItem[] | FundingActionQueueItem[] {
  if ("project" in input && "calculateFundingPosition" in input) {
    const funding = input.calculateFundingPosition(input.project);
    return deriveReleaseControlModel(input.stages as StageRecord[], funding).actionQueue;
  }

  return deriveFundingActionQueue(input, projectId);
}

export function deriveReleaseControlModel(stages: StageRecord[], funding: FundingPosition): ReleaseControlModel {
  const stageDecisions = stages.map((stage) => deriveReleaseStageDecision(stage, funding));
  const releasable = stageDecisions.filter((decision) => decision.state === "releasable");
  const blocked = stageDecisions.filter((decision) => decision.state === "blocked");
  const attentionRequired = stageDecisions.filter((decision) => decision.state === "attention-required");
  const actionQueue: ActionQueueItem[] = [];
  let fundingActionAdded = false;

  stageDecisions.forEach((decision) => {
    decision.blockers.forEach((blocker, blockerIndex) => {
      if (blocker.code === "project-funding-shortfall") {
        if (fundingActionAdded) {
          return;
        }

        fundingActionAdded = true;
        actionQueue.push({
          id: "aq-project-funding-shortfall",
          priority: blocker.priority,
          title: "Project funding shortfall requires action",
          detail: `Reserve gap of £${Math.max(funding.gap, 0).toLocaleString("en-GB")}`,
          owner: "Treasury",
          type: "funding",
          blockerLabel: blocker.label,
          actionKey: blocker.nextRecommendedAction,
          requiredRole: blocker.nextRequiredRole === "delivery" ? undefined : blocker.nextRequiredRole,
        });
        return;
      }

      const owner =
        blocker.nextRequiredRole === "delivery"
          ? "Delivery"
          : blocker.nextRequiredRole
          ? blocker.nextRequiredRole.charAt(0).toUpperCase() + blocker.nextRequiredRole.slice(1)
          : blocker.category.charAt(0).toUpperCase() + blocker.category.slice(1);

      actionQueue.push({
        id: `aq-${decision.stage.id}-${blocker.code}-${blockerIndex}`,
        priority: blocker.priority,
        title: `${decision.stage.name} requires ${owner.toLowerCase()} action`,
        detail: blocker.label,
        owner,
        type: getQueueActionType(blocker.nextRecommendedAction),
        stageId: decision.stage.id,
        stageName: decision.stage.name,
        blockerLabel: blocker.label,
        requiredRole: blocker.nextRequiredRole === "delivery" ? undefined : blocker.nextRequiredRole,
        actionKey: blocker.nextRecommendedAction,
      });
    });
  });

  return {
    summary: {
      readyForPayment: releasable.length,
      blockedByFunding: stageDecisions.filter((decision) =>
        decision.blockers.some((blocker) => blocker.category === "funding"),
      ).length,
      openDisputes: stages.reduce(
        (count, stage) => count + stage.disputes.filter((dispute) => dispute.status === "open").length,
        0,
      ),
      pendingVariations: stages.reduce(
        (count, stage) => count + stage.variations.filter((variation) => variation.status === "pending").length,
        0,
      ),
      actionRequiredEvidence: stageDecisions.filter((decision) =>
        decision.blockers.some((blocker) => blocker.category === "evidence"),
      ).length,
      blockedStages: blocked.length,
      attentionRequiredStages: attentionRequired.length,
      releasableStages: releasable.length,
    },
    groupedStages: {
      releasable,
      blocked,
      attentionRequired,
    },
    stageDecisions,
    actionQueue,
  };
}

export function deriveContractAdministrationModel(
  contracts: ContractRecord[],
  stages: StageRecord[],
  funding: FundingPosition,
): ContractAdministrationModel {
  const stagesByContract = Object.fromEntries(
    contracts.map((contract) => [contract.id, stages.filter((stage) => stage.contractId === contract.id)]),
  );

  return {
    stagesByContract,
    summaries: contracts.map((contract) => {
      const contractStages = stagesByContract[contract.id] ?? [];
      const releaseModel = deriveReleaseControlModel(contractStages, funding);

      return {
        contract,
        stages: contractStages,
        totalStageValue: contractStages.reduce((total, stage) => total + stage.value, 0),
        releasableStages: releaseModel.groupedStages.releasable.length,
        blockedStages: releaseModel.groupedStages.blocked.length,
        attentionRequiredStages: releaseModel.groupedStages.attentionRequired.length,
      };
    }),
  };
}

export function deriveMobileActionInbox(releaseControl: ReleaseControlModel, role: MobileOperationsRole): ActionQueueItem[] {
  return releaseControl.actionQueue.filter((action) => {
    switch (role) {
      case "delivery":
        return (
          action.requiredRole === undefined &&
          (action.type === "evidence" || action.type === "completion" || action.actionKey === "record-completion")
        );
      case "professional":
        return action.requiredRole === "professional";
      case "commercial":
        return action.requiredRole === "commercial" || action.type === "dispute" || action.type === "variation";
      case "treasury":
        return action.requiredRole === "treasury" || action.type === "funding";
      default:
        return false;
    }
  });
}

function mapActionToAssignedRole(action: ActionQueueItem): UserRole {
  if (action.requiredRole) {
    return action.requiredRole;
  }

  switch (action.type) {
    case "evidence":
    case "completion":
    case "readiness":
      return "delivery";
    case "dispute":
    case "variation":
      return "commercial";
    case "funding":
      return "treasury";
    case "audit":
      return "professional";
    default:
      return "admin";
  }
}

export function deriveRoutedNotifications(
  actionQueue: ActionQueueItem[],
  users: AppUser[],
  contracts: ContractRecord[],
  stages: StageRecord[],
  projectId: string,
): RoutedNotification[] {
  return actionQueue.map((action) => {
    const assignedRole = mapActionToAssignedRole(action);
    const assignedUser = users.find((user) => user.role === assignedRole && user.active && user.projectIds.includes(projectId)) ?? null;
    const stage = action.stageId ? stages.find((item) => item.id === action.stageId) ?? null : null;
    const contractId = stage?.contractId ?? null;

    return {
      id: `notif-${action.id}-${assignedRole}`,
      actionId: action.id,
      actionKey: action.actionKey,
      title: action.title,
      detail: action.detail,
      priority: action.priority,
      assignedRole,
      assignedUserId: assignedUser?.id ?? null,
      projectId,
      contractId,
      stageId: action.stageId ?? null,
    };
  });
}
// Project-level control summary helper
export function getProjectControlSummary({
  stages,
  project,
  calculateFundingPosition,
}: ProjectControlSummaryInput): ProjectControlSummary {
  const funding = calculateFundingPosition(project);
  return deriveReleaseControlModel(stages as StageRecord[], funding).summary;
}
// Demo evidence items
export const demoEvidence: EvidenceItem[] = [
  {
    id: "e1",
    stageId: "s1",
    name: "Site Setup Photos",
    type: "photo",
    uploadedBy: "Site Engineer",
    uploadedAt: "2026-03-27 09:00",
    status: "accepted",
    required: true
  },
  {
    id: "e2",
    stageId: "s1",
    name: "Setup Completion Certificate",
    type: "certificate",
    uploadedBy: "Project Manager",
    uploadedAt: "2026-03-27 10:00",
    status: "accepted",
    required: true
  },
  {
    id: "e3",
    stageId: "s2",
    name: "Excavation Inspection Report",
    type: "inspection",
    uploadedBy: "Inspector",
    uploadedAt: "2026-03-28 08:30",
    status: "submitted",
    required: true
  },
  {
    id: "e4",
    stageId: "s2",
    name: "Delivery Note - Excavator",
    type: "delivery_note",
    uploadedBy: "Supplier",
    uploadedAt: "2026-03-28 08:00",
    status: "accepted",
    required: false
  },
  {
    id: "e5",
    stageId: "s3",
    name: "Steel Frame Invoice",
    type: "invoice",
    uploadedBy: "Accounts",
    uploadedAt: "2026-03-29 09:15",
    status: "missing",
    required: true
  },
  {
    id: "e6",
    stageId: "s3",
    name: "Frame Inspection Certificate",
    type: "certificate",
    uploadedBy: "Inspector",
    uploadedAt: "2026-03-29 10:00",
    status: "rejected",
    required: true
  }
];

// Evidence compliance helper
export function getStageEvidenceStatus(stageId: string, evidenceItems: EvidenceItem[]): EvidenceComplianceStatus {
  const stageEvidence = evidenceItems.filter((item) => item.stageId === stageId);
  const requiredItems = stageEvidence.filter((item) => item.required);
  const missingRequired = requiredItems.some((item) => item.status === "missing" || item.status === "rejected");
  const allRequiredAccepted =
    requiredItems.length > 0 && requiredItems.every((item) => item.status === "accepted");

  return {
    total: stageEvidence.length,
    required: requiredItems.length,
    missingRequired,
    allRequiredAccepted,
    state: allRequiredAccepted ? "compliant" : missingRequired ? "action-required" : "pending"
  };
}
// Demo disputes
export const demoDisputes: Dispute[] = [
  {
    id: "d1",
    contractId: "c1",
    stageId: "s2",
    title: "Excavation Over-measurement",
    disputedValue: 40000,
    reason: "Claimed quantity exceeds contract BOQ.",
    status: "open",
    frozenAmount: 40000
  },
  {
    id: "d2",
    contractId: "c2",
    stageId: "s3",
    title: "Frame Install Delay Penalty",
    disputedValue: 20000,
    reason: "Delay penalty applied for late start.",
    status: "resolved",
    frozenAmount: 0
  }
];

// Demo variations
export const demoVariations: Variation[] = [
  {
    id: "v1",
    contractId: "c1",
    title: "Additional Drainage Works",
    addedValue: 25000,
    fundingRequired: 25000,
    approved: false,
    status: "pending"
  },
  {
    id: "v2",
    contractId: "c2",
    title: "Steel Frame Upgrade",
    addedValue: 50000,
    fundingRequired: 50000,
    approved: true,
    status: "approved"
  }
];
// Stage-level payment release logic
export function canReleasePayment(
  stage: Stage,
  approvals: ApprovalStatus,
  funding: Pick<FundingPosition, "canProceed">,
): boolean {
  if (!stage.approved) return false;
  if (!approvals.professionalApproved) return false;
  if (!approvals.commercialApproved) return false;
  if (!approvals.treasuryApproved) return false;
  if (!funding.canProceed) return false;
  return true;
}

// Demo audit log
export const demoAuditLog = [
  {
    id: "a1",
    type: "STAGE_APPROVED",
    message: "Stage 'Site Setup' approved by Commercial",
    timestamp: "2026-03-28 10:15",
    user: "Commercial Manager"
  },
  {
    id: "a2",
    type: "EVIDENCE_SUBMITTED",
    message: "Evidence uploaded for 'Excavation'",
    timestamp: "2026-03-28 11:20",
    user: "Site Engineer"
  },
  {
    id: "a3",
    type: "PAYMENT_RELEASED",
    message: "Payment released for 'Site Setup'",
    timestamp: "2026-03-28 14:05",
    user: "Treasury"
  }
];
// Approval statuses keyed by stage id
export const demoApprovalStatuses: { [stageId: string]: ApprovalStatus } = {
  s1: {
    commercialApproved: true,
    professionalApproved: true,
    treasuryApproved: true
  },
  s2: {
    commercialApproved: true,
    professionalApproved: false,
    treasuryApproved: false
  },
  s3: {
    commercialApproved: false,
    professionalApproved: false,
    treasuryApproved: false
  }
};

// Demo users for authority & sign-off
export const demoUsers = [
  {
    id: "u1",
    name: "Alice Carter",
    role: "delivery",
    company: "BuildCo",
    active: true
  },
  {
    id: "u2",
    name: "Ben Smith",
    role: "professional",
    company: "AssurePro",
    active: true
  },
  {
    id: "u3",
    name: "Clara Jones",
    role: "commercial",
    company: "BuildCo",
    active: true
  },
  {
    id: "u4",
    name: "David Lee",
    role: "treasury",
    company: "BuildCo",
    active: false
  },
  {
    id: "u5",
    name: "Eve Patel",
    role: "funder",
    company: "FundBank",
    active: true
  }
];
// Core system state models for Shure.Fund

export type ProjectStatus = "healthy" | "at-risk" | "blocked";

export interface Project {
  id: string;
  name: string;
  totalValue: number;
  fundedValue: number;
  reserveRequired: number; // 30-day forecast placeholder
  reserveAvailable: number;
  status: ProjectStatus;
}

export type ContractStatus = "draft" | "active" | "paused";

export interface Contract {
  id: string;
  projectId: string;
  title: string;
  totalValue: number;
  allocatedFunding: number;
  status: ContractStatus;
}

export type StageStatus = "pending" | "in-progress" | "complete" | "rejected";

export interface Stage {
  id: string;
  contractId: string;
  name: string;
  value: number;
  plannedStart: string; // ISO date string
  plannedEnd: string;   // ISO date string
  status: StageStatus;
  evidenceRequired: boolean;
  approved: boolean;
}

export interface FundingStatus {
  isFunded: boolean;
  shortfall: number;
  canProceed: boolean;
}

export interface ApprovalStatus {
  commercialApproved: boolean;
  professionalApproved: boolean;
  treasuryApproved: boolean;
}

// Demo mock object for UI integration
export const demoProject: Project & {
  projectedWIP30Days: number;
  fundingBuffer: number;
} = {
  id: "proj-001",
  name: "Central Plaza Tower",
  totalValue: 1000000,
  fundedValue: 800000,
  reserveRequired: 120000,
  reserveAvailable: 100000,
  status: "healthy",
  projectedWIP30Days: 250000,
  fundingBuffer: 50000,
};

export function calculateFundingPosition(project: { projectedWIP30Days: number; fundingBuffer: number; reserveAvailable: number }): FundingPosition {
  const required = project.projectedWIP30Days + project.fundingBuffer;
  const available = project.reserveAvailable;
  const gap = Math.max(required - available, 0);
  return {
    required,
    available,
    gap,
    canProceed: available >= required,
    wipRequired: project.projectedWIP30Days,
    reserveBuffer: project.fundingBuffer,
    totalRequiredWithBuffer: required,
    gapToRequiredCover: gap,
    projectedWip30Days: project.projectedWIP30Days,
    bufferAmount: project.fundingBuffer,
    warningThresholdAmount: required * 1.15,
    allocatedToStages: 0,
    unallocatedFunds: available,
    contractFunding: {},
    stageFunding: {},
  };
}

export const demoContracts = [
  {
    id: "c1",
    projectId: "p1",
    title: "Groundworks Package",
    totalValue: 400000,
    allocatedFunding: 350000,
    status: "active"
  },
  {
    id: "c2",
    projectId: "p1",
    title: "Superstructure Package",
    totalValue: 600000,
    allocatedFunding: 450000,
    status: "active"
  }
];

export const demoStages = [
  {
    id: "s1",
    contractId: "c1",
    name: "Site Setup",
    value: 100000,
    plannedStart: "2026-04-01",
    plannedEnd: "2026-04-10",
    status: "complete",
    evidenceRequired: true,
    approved: true
  },
  {
    id: "s2",
    contractId: "c1",
    name: "Excavation",
    value: 150000,
    plannedStart: "2026-04-11",
    plannedEnd: "2026-04-25",
    status: "in-progress",
    evidenceRequired: true,
    approved: false
  },
  {
    id: "s3",
    contractId: "c2",
    name: "Frame Install",
    value: 300000,
    plannedStart: "2026-05-01",
    plannedEnd: "2026-05-30",
    status: "pending",
    evidenceRequired: true,
    approved: false
  }
];

// Phase 1 funding control engine

export interface FundingStageSummary {
  stageId: string;
  stageName: string;
  totalBalance: number;
  allocatedFunds: number;
  requiredFunds: number;
  releasableFunds: number;
  gapToRequiredCover: number;
}

export interface FundingSummary {
  projectId: string;
  projectName: string;
  projectBalance: number;
  totalBalance: number;
  allocatedFunds: number;
  ringfencedFunds: number;
  projectedWip30Days: number;
  reserveBuffer: number;
  requiredCover: number;
  frozenFunds: number;
  availableFunds: number;
  requiredFunds: number;
  releasableFunds: number;
  shortfall: number;
  gapToRequiredCover: number;
  availableProjectFunds: number;
  stageSummaries: FundingStageSummary[];
}

export interface FundingSummaryMetrics {
  projectBalance: number;
  allocatedFunds: number;
  ringfencedFunds: number;
  projectedWip30Days: number;
  reserveBuffer: number;
  requiredCover: number;
  frozenFunds: number;
  releasableFunds: number;
  shortfall: number;
  availableFunds: number;
}

export interface StageBlocker {
  code: "funding" | "evidence" | "approvals" | "disputed" | "on_hold" | "variation";
  label: string;
  priority: ActionPriority;
}

export interface ReleaseDecisionReason {
  type: StageBlocker["code"] | "override";
  message: string;
}

export interface ReleaseDecisionCard {
  projectId: string;
  stageId: string;
  stageName: string;
  status: SystemStageRecord["status"];
  releasable: boolean;
  overridden: boolean;
  reasons: ReleaseDecisionReason[];
  overriddenBlockers: StageBlocker[];
}

export interface FundingActionGroup {
  actionType: QueueActionType;
  priority: ActionPriority;
  actionableBy: FundingApprovalRole | "system";
  count: number;
  title: string;
  detail: string;
}

export interface FundingActionQueueItem {
  id: string;
  projectId: string;
  projectName: string;
  stageId: string;
  stageName: string;
  priority: ActionPriority;
  actionCount: number;
  groupedActions: FundingActionGroup[];
}

export interface OperationalSummary {
  blocked: number;
  in_review: number;
  ready: number;
  partially_approved: number;
  approved: number;
  partially_released: number;
  released: number;
  disputed: number;
  on_hold: number;
  releasable: number;
}

export interface LedgerTransactionItem {
  id: string;
  timestamp: string;
  accountName: string;
  workPackageName?: string;
  reference: string;
  type: LedgerEntryRecord["type"];
  amount: number;
  sourceType?: FundingSourceType;
  restrictedUse: boolean;
}

export interface ApprovalPanelItem {
  id: string;
  role: FundingApprovalRole;
  status: FundingApprovalStatus;
  canAct: boolean;
  sequenceBlocked: boolean;
}

export interface StageDetailModel {
  projectName: string;
  stage: SystemStageRecord;
  blockers: StageBlocker[];
  releaseDecision: ReleaseDecisionCard;
  funding: FundingStageSummary;
  fundingStatusLabel: "Funded" | "Partially funded" | "Blocked";
  contributesToRequiredCover: boolean;
  blockingRelease: boolean;
  certifiedValue: number;
  payableValue: number;
  frozenValue: number;
  evidenceState: DerivedEvidenceState;
  approvalState: "blocked" | "ready" | "partially_approved" | "approved" | "rejected";
  fundingState: "funded" | "shortfall";
  disputes: Array<
    DisputeRecord & {
      canResolve: boolean;
    }
  >;
  variations: Array<
    VariationRecord & {
      canApprove: boolean;
      canReject: boolean;
      canActivate: boolean;
    }
  >;
  evidence: Array<
    EvidenceRequirementRecord & {
      record: EvidenceRecord | null;
    }
  >;
  approvals: ApprovalPanelItem[];
  ledgerTransactions: LedgerTransactionItem[];
  availableActions: {
    addEvidence: boolean;
    fundStage: boolean;
    applyOverride: boolean;
    release: boolean;
    openDispute: boolean;
    resolveDispute: boolean;
    createVariation: boolean;
    reviewVariation: boolean;
    activateVariation: boolean;
  };
}

export interface RoleJourneySummary {
  role: FundingUserRole;
  heading: string;
  attentionCount: number;
  blockedCount: number;
  payableValue: number;
  frozenValue: number;
  items: Array<{
    stageId: string;
    stageName: string;
    summary: string;
    tone: "attention" | "blocked" | "payable" | "frozen";
  }>;
}

type DerivedEvidenceState = "missing" | "in_review" | "accepted";

function cloneSystemState(state: SystemStateRecord): SystemStateRecord {
  return structuredClone(state);
}

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getUserRecord(state: SystemStateRecord, userId = state.currentUserId): UserRecord {
  const user = state.users.find((entry) => entry.id === userId);

  if (!user) {
    throw new Error(`Unknown user ${userId}`);
  }

  return user;
}

function getProjectRecord(state: SystemStateRecord, projectId: string) {
  const project = state.projects.find((entry) => entry.id === projectId);

  if (!project) {
    throw new Error(`Unknown project ${projectId}`);
  }

  return project;
}

function getProjectAccount(state: SystemStateRecord, projectId: string): LedgerAccountRecord {
  const account = state.ledgerAccounts.find((entry) => entry.projectId === projectId && !entry.stageId);

  if (!account) {
    throw new Error(`Missing project account for ${projectId}`);
  }

  return account;
}

function getStageAccount(state: SystemStateRecord, stageId: string): LedgerAccountRecord {
  const account = state.ledgerAccounts.find((entry) => entry.stageId === stageId);

  if (!account) {
    throw new Error(`Missing stage account for ${stageId}`);
  }

  return account;
}

function getEvidenceViews(state: SystemStateRecord, stageId: string) {
  return state.evidenceRequirements
    .filter((entry) => entry.stageId === stageId)
    .map((requirement) => ({
      ...requirement,
      record: state.evidence.find((evidence) => evidence.requirementId === requirement.id) ?? null,
    }));
}

function getApprovalRecords(state: SystemStateRecord, stageId: string, roles: FundingApprovalRole[]) {
  return roles.map((role) => state.approvals.find((entry) => entry.stageId === stageId && entry.role === role) ?? null);
}

function approvalsComplete(state: SystemStateRecord, stage: SystemStageRecord) {
  return getApprovalRecords(state, stage.id, stage.requiredApprovalRoles).every((approval) => approval?.status === "approved");
}

function approvalRejected(state: SystemStateRecord, stage: SystemStageRecord) {
  return getApprovalRecords(state, stage.id, stage.requiredApprovalRoles).some((approval) => approval?.status === "rejected");
}

function getApprovedCount(state: SystemStateRecord, stage: SystemStageRecord) {
  return getApprovalRecords(state, stage.id, stage.requiredApprovalRoles).filter((approval) => approval?.status === "approved")
    .length;
}

function getPendingApprovalRoles(state: SystemStateRecord, stage: SystemStageRecord) {
  return stage.requiredApprovalRoles.filter((role) => {
    const approval = state.approvals.find((entry) => entry.stageId === stage.id && entry.role === role);
    return approval?.status !== "approved";
  });
}

function getNextApprovalRole(stage: SystemStageRecord, pendingRoles: FundingApprovalRole[]) {
  if (!stage.approvalSequence?.length) {
    return null;
  }

  return stage.approvalSequence.find((role) => pendingRoles.includes(role)) ?? null;
}

function canApprovalRoleAct(
  state: SystemStateRecord,
  stage: SystemStageRecord,
  role: FundingApprovalRole,
) {
  if (getEvidenceState(state, stage.id) !== "accepted") {
    return false;
  }

  if (stage.approvalSequence?.length) {
    const nextRole = getNextApprovalRole(stage, getPendingApprovalRoles(state, stage));
    return nextRole === role;
  }

  return true;
}

function getEvidenceState(state: SystemStateRecord, stageId: string): DerivedEvidenceState {
  const evidenceViews = getEvidenceViews(state, stageId).filter((entry) => entry.required);

  if (evidenceViews.some((entry) => entry.record === null)) {
    return "missing";
  }

  if (evidenceViews.every((entry) => entry.record?.status === "accepted")) {
    return "accepted";
  }

  return "in_review";
}

function getOpenDisputes(stage: SystemStageRecord) {
  return (stage.disputes ?? []).filter((entry) => entry.status === "open");
}

function getPendingVariations(stage: SystemStageRecord) {
  return (stage.variations ?? []).filter((entry) => entry.status === "pending");
}

function getFrozenValue(stage: SystemStageRecord) {
  const remainingValue = Math.max(stage.requiredAmount - stage.releasedAmount, 0);
  const disputedValue = getOpenDisputes(stage).reduce((total, dispute) => total + dispute.disputedAmount, 0);
  return Math.min(disputedValue, remainingValue);
}

function getPayableValue(stage: SystemStageRecord) {
  const remainingValue = Math.max(stage.requiredAmount - stage.releasedAmount, 0);
  return Math.max(remainingValue - getFrozenValue(stage), 0);
}

function getReleasableFundsForStage(state: SystemStateRecord, stage: SystemStageRecord, allocatedFunds: number) {
  return approvalsComplete(state, stage) && getEvidenceState(state, stage.id) === "accepted"
    ? Math.min(allocatedFunds, getPayableValue(stage))
    : 0;
}

function getDerivedStageStatus(
  state: SystemStateRecord,
  stage: SystemStageRecord,
): SystemStageRecord["status"] {
  if (stage.onHold) {
    return "on_hold";
  }

  if (getOpenDisputes(stage).length > 0) {
    return "disputed";
  }

  if (stage.releasedAmount >= stage.requiredAmount) {
    return "released";
  }

  if (stage.releasedAmount > 0) {
    return "partially_released";
  }

  const stageFunding = getStageAccount(state, stage.id).balance;
  const funded = stageFunding >= getPayableValue(stage);
  const evidenceState = getEvidenceState(state, stage.id);
  const approvedCount = getApprovedCount(state, stage);
  const allApproved = approvalsComplete(state, stage);
  const anyRejected = approvalRejected(state, stage);
  const hasPendingVariation = getPendingVariations(stage).length > 0;

  if (!funded || evidenceState === "missing") {
    return "blocked";
  }

  if (anyRejected || hasPendingVariation) {
    return "blocked";
  }

  if (evidenceState === "in_review") {
    return "in_review";
  }

  if (allApproved) {
    return "approved";
  }

  if (approvedCount > 0) {
    return "partially_approved";
  }

  return "ready";
}

function recomputeLedgerBalances(state: SystemStateRecord) {
  state.ledgerAccounts = state.ledgerAccounts.map((account) => ({
    ...account,
    balance: state.ledgerEntries
      .filter((entry) => entry.accountId === account.id)
      .reduce((total, entry) => total + entry.amount, 0),
  }));
}

function appendAuditLog(
  state: SystemStateRecord,
  userId: string,
  eventType: AuditLogRecord["eventType"],
  action: AuditLogRecord["action"],
  entity: AuditLogRecord["entity"],
  entityId: string,
  beforeState: unknown,
  afterState: unknown,
) {
  const user = getUserRecord(state, userId);
  const nextEntry: AuditLogRecord = {
    id: randomId("audit"),
    eventType,
    entity,
    entityId,
    action,
    beforeState,
    afterState,
    user: user.name,
    timestamp: nowIso(),
  };

  state.auditLog = [nextEntry, ...state.auditLog];
}

function reconcileSystemState(state: SystemStateRecord, auditUserId?: string) {
  const previousStages = new Map(
    state.stages.map((stage) => [stage.id, { status: stage.status, overrideActive: Boolean(stage.overrideActive) }]),
  );

  recomputeLedgerBalances(state);
  state.stages = state.stages.map((stage) => {
    const overrideActive = Boolean(stage.override?.active);
    return {
      ...stage,
      status: getDerivedStageStatus(state, stage),
      overrideActive,
    };
  });

  if (auditUserId) {
    state.stages.forEach((stage) => {
      const previous = previousStages.get(stage.id);
      if (!previous || (previous.status === stage.status && previous.overrideActive === Boolean(stage.overrideActive))) {
        return;
      }

      appendAuditLog(
        state,
        auditUserId,
        "STATE_CHANGE",
        previous.overrideActive !== Boolean(stage.overrideActive) ? "override_applied" : "approval_given",
        "stage",
        stage.id,
        previous,
        { status: stage.status, overrideActive: Boolean(stage.overrideActive) },
      );
    });
  }
}

function getStageFundingSummary(state: SystemStateRecord, stage: SystemStageRecord): FundingStageSummary {
  const allocatedFunds = getStageAccount(state, stage.id).balance;
  const requiredFunds = getPayableValue(stage);
  const releasableFunds = getReleasableFundsForStage(state, stage, allocatedFunds);

  return {
    stageId: stage.id,
    stageName: stage.name,
    totalBalance: allocatedFunds,
    allocatedFunds,
    requiredFunds,
    releasableFunds,
    gapToRequiredCover: Math.max(requiredFunds - allocatedFunds, 0),
  };
}

function getApprovalStateSummary(state: SystemStateRecord, stage: SystemStageRecord) {
  if (approvalRejected(state, stage)) {
    return "rejected" as const;
  }

  if (approvalsComplete(state, stage)) {
    return "approved" as const;
  }

  if (getApprovedCount(state, stage) > 0) {
    return "partially_approved" as const;
  }

  return getEvidenceState(state, stage.id) === "accepted" ? ("ready" as const) : ("blocked" as const);
}

export function getLedgerTransactions(
  state: SystemStateRecord,
  projectId: string,
  stageId?: string,
): LedgerTransactionItem[] {
  const stagesById = Object.fromEntries(state.stages.map((stage) => [stage.id, stage]));
  const accountsById = Object.fromEntries(state.ledgerAccounts.map((account) => [account.id, account]));

  return state.ledgerEntries
    .filter((entry) => {
      const account = accountsById[entry.accountId];
      if (!account || account.projectId !== projectId) {
        return false;
      }

      if (!stageId) {
        return true;
      }

      return entry.stageId === stageId || account.stageId === stageId;
    })
    .map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      accountName: accountsById[entry.accountId]?.name ?? "Unknown account",
      workPackageName: entry.stageId ? stagesById[entry.stageId]?.name : undefined,
      reference: entry.reference,
      type: entry.type,
      amount: entry.amount,
      sourceType: entry.sourceType,
      restrictedUse: Boolean(entry.restrictedUse),
    }))
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function initializeSystemState(state: SystemStateRecord): SystemStateRecord {
  const nextState = cloneSystemState(state);
  reconcileSystemState(nextState);
  return nextState;
}

export function deriveFundingSummaryMetrics(
  state: SystemStateRecord,
  projectId: string,
): FundingSummaryMetrics {
  const project = getProjectRecord(state, projectId);
  const projectStages = state.stages.filter((stage) => stage.projectId === projectId);
  const projectAccountBalance = getProjectAccount(state, projectId).balance;
  const allocatedFunds = projectStages.reduce((total, stage) => total + getStageAccount(state, stage.id).balance, 0);
  const projectBalance = projectAccountBalance + allocatedFunds;
  const reserveBuffer = project.reserveBuffer;
  const projectedWip30Days = projectStages.reduce((total, stage) => total + getPayableValue(stage), 0);
  const frozenFunds = projectStages.reduce((total, stage) => total + getFrozenValue(stage), 0);

  // Ringfenced funds are the protected client funds available to the project after reserving the buffer.
  const ringfencedFunds = Math.max(projectBalance - reserveBuffer, 0);

  // Required cover holds the upcoming work package requirement plus the reserve buffer.
  const requiredCover = projectedWip30Days + reserveBuffer;

  // Available funds are the unallocated protected funds remaining after work package allocations and reserve.
  const availableFunds = Math.max(projectBalance - allocatedFunds - reserveBuffer, 0);

  // Certified payable is what remains safely drawable after cover requirements and frozen disputed value.
  const releasableFunds = Math.max(0, ringfencedFunds - requiredCover - frozenFunds);

  // Shortfall shows how much additional protected funding is needed once frozen value is excluded.
  const shortfall = Math.max(0, requiredCover - (ringfencedFunds - frozenFunds));

  return {
    projectBalance,
    allocatedFunds,
    ringfencedFunds,
    projectedWip30Days,
    reserveBuffer,
    requiredCover,
    frozenFunds,
    releasableFunds,
    shortfall,
    availableFunds,
  };
}

export function getFundingSummary(state: SystemStateRecord, projectId: string): FundingSummary {
  const project = getProjectRecord(state, projectId);
  const stageSummaries = state.stages
    .filter((stage) => stage.projectId === projectId)
    .map((stage) => getStageFundingSummary(state, stage));
  const availableProjectFunds = getProjectAccount(state, projectId).balance;
  const metrics = deriveFundingSummaryMetrics(state, projectId);

  return {
    projectId,
    projectName: project.name,
    projectBalance: metrics.projectBalance,
    totalBalance: metrics.projectBalance,
    allocatedFunds: metrics.allocatedFunds,
    ringfencedFunds: metrics.ringfencedFunds,
    projectedWip30Days: metrics.projectedWip30Days,
    reserveBuffer: metrics.reserveBuffer,
    requiredCover: metrics.requiredCover,
    frozenFunds: metrics.frozenFunds,
    availableFunds: metrics.availableFunds,
    requiredFunds: metrics.requiredCover,
    releasableFunds: metrics.releasableFunds,
    shortfall: metrics.shortfall,
    gapToRequiredCover: metrics.shortfall,
    availableProjectFunds,
    stageSummaries,
  };
}

export function getStageBlockers(state: SystemStateRecord, stageId: string): StageBlocker[] {
  const stage = state.stages.find((entry) => entry.id === stageId);

  if (!stage) {
    throw new Error(`Unknown stage ${stageId}`);
  }

  if (stage.releasedAmount >= stage.requiredAmount) {
    return [];
  }

  const blockers: StageBlocker[] = [];
  const fundingSummary = getStageFundingSummary(state, stage);
  const evidenceState = getEvidenceState(state, stage.id);
  const pendingApprovals = getPendingApprovalRoles(state, stage);
  const hasRejectedApproval = approvalRejected(state, stage);
  const frozenValue = getFrozenValue(stage);
  const payableValue = getPayableValue(stage);
  const pendingVariations = getPendingVariations(stage);

  if (stage.onHold) {
    blockers.push({
      code: "on_hold",
      label: "Work Package is on hold and cannot progress.",
      priority: "critical",
    });
  }

  if (frozenValue > 0 && payableValue === 0) {
    blockers.push({
      code: "disputed",
      label: `Frozen value of £${frozenValue.toLocaleString("en-GB")} is under dispute.`,
      priority: "critical",
    });
  }

  if (pendingVariations.length > 0) {
    blockers.push({
      code: "variation",
      label: `${pendingVariations.length} pending variation${pendingVariations.length === 1 ? "" : "s"} require approval and funding cover.`,
      priority: "high",
    });
  }

  if (fundingSummary.gapToRequiredCover > 0) {
    blockers.push({
      code: "funding",
      label: `Funding gap of £${fundingSummary.gapToRequiredCover.toLocaleString("en-GB")} remains.`,
      priority: "critical",
    });
  }

  if (evidenceState !== "accepted") {
    blockers.push({
      code: "evidence",
      label:
        evidenceState === "missing"
          ? "Required evidence is missing."
          : "Required evidence is still in review.",
      priority: evidenceState === "missing" ? "critical" : "high",
    });
  }

  if (hasRejectedApproval || pendingApprovals.length > 0) {
    blockers.push({
      code: "approvals",
      label: hasRejectedApproval
        ? "Required approvals include a rejected decision."
        : `Required approvals are incomplete: ${pendingApprovals.join(", ")}.`,
      priority: "high",
    });
  }

  return blockers;
}

export function getReleaseDecisions(
  state: SystemStateRecord,
  projectId?: string,
): ReleaseDecisionCard[] {
  return state.stages
    .filter((stage) => !projectId || stage.projectId === projectId)
    .map((stage) => {
      const blockers = getStageBlockers(state, stage.id);
      const overridden = Boolean(stage.override?.active);
      const frozenValue = getFrozenValue(stage);
      const advisoryReasons: ReleaseDecisionReason[] = frozenValue > 0
        ? [
            {
              type: "disputed",
              message: `Frozen value of £${frozenValue.toLocaleString("en-GB")} remains outside payable drawdown.`,
            },
          ]
        : [];

      return {
        projectId: stage.projectId,
        stageId: stage.id,
        stageName: stage.name,
        status: getDerivedStageStatus(state, stage),
        releasable: blockers.length === 0 || overridden,
        overridden,
        overriddenBlockers: overridden
          ? (stage.override?.overriddenBlockers ?? blockers.map((blocker) => blocker.label)).map((label) => {
              const matchingBlocker = blockers.find((blocker) => blocker.label === label);
              return matchingBlocker ?? {
                code: "funding",
                label,
                priority: "critical",
              };
            })
          : [],
        reasons: overridden
          ? [
              {
                type: "override",
                message: `Treasury override applied: ${stage.override?.reason ?? "Reason not recorded."}`,
              },
              ...advisoryReasons,
              ...blockers.map((blocker) => ({ type: blocker.code, message: blocker.label })),
            ]
          : [...advisoryReasons, ...blockers.map((blocker) => ({ type: blocker.code, message: blocker.label }))],
      };
    });
}

export function getOperationalSummary(
  state: SystemStateRecord,
  projectId?: string,
): OperationalSummary {
  return getReleaseDecisions(state, projectId).reduce(
    (summary, decision) => {
      summary[decision.status] += 1;
      if (decision.releasable) {
        summary.releasable += 1;
      }
      return summary;
    },
    {
      blocked: 0,
      in_review: 0,
      ready: 0,
      partially_approved: 0,
      approved: 0,
      partially_released: 0,
      released: 0,
      disputed: 0,
      on_hold: 0,
      releasable: 0,
    } satisfies OperationalSummary,
  );
}

function pushGroupedStageAction(
  groups: Map<string, FundingActionGroup>,
  action: Omit<FundingActionGroup, "count">,
) {
  const existing = groups.get(action.actionType);

  if (existing) {
    existing.count += 1;
    return;
  }

  groups.set(action.actionType, {
    ...action,
    count: 1,
  });
}

function deriveFundingActionQueue(
  state: SystemStateRecord,
  projectId?: string,
): FundingActionQueueItem[] {
  const items = state.stages
    .filter((stage) => !projectId || stage.projectId === projectId)
    .map((stage) => {
      const project = state.projects.find((entry) => entry.id === stage.projectId);

      if (!project || stage.releasedAmount >= stage.requiredAmount) {
        return null;
      }

      const groups = new Map<string, FundingActionGroup>();
      const blockers = getStageBlockers(state, stage.id);
      const stageFunding = getStageFundingSummary(state, stage);
      const evidenceViews = getEvidenceViews(state, stage.id).filter((entry) => entry.required);
      const pendingEvidenceCount = evidenceViews.filter((entry) => entry.record?.status !== "accepted").length;
      const pendingApprovals = getPendingApprovalRoles(state, stage);
      const stageStatus = getDerivedStageStatus(state, stage);
      const openDisputes = getOpenDisputes(stage);
      const pendingVariations = getPendingVariations(stage);

      if (stageFunding.gapToRequiredCover > 0) {
        pushGroupedStageAction(groups, {
          actionType: "fund_stage",
          actionableBy: "treasury",
          priority: "critical",
          title: `Fund ${stage.name} Work Package`,
          detail: `Allocate £${stageFunding.gapToRequiredCover.toLocaleString("en-GB")} to meet required cover.`,
        });
      }

      if (pendingEvidenceCount > 0) {
        pushGroupedStageAction(groups, {
          actionType: "review_evidence",
          actionableBy: "professional",
          priority: evidenceViews.some((entry) => entry.record === null) ? "critical" : "high",
          title: `Review supporting items for ${stage.name}`,
          detail: `${pendingEvidenceCount} supporting item${pendingEvidenceCount === 1 ? "" : "s"} need attention.`,
        });
      }

      if (
        stageStatus === "ready" ||
        stageStatus === "partially_approved" ||
        (stageStatus === "disputed" && getPayableValue(stage) > 0)
      ) {
        pendingApprovals.forEach((role) => {
          pushGroupedStageAction(groups, {
            actionType: "approve_stage",
            actionableBy: role,
            priority: "high",
            title: `Approve ${stage.name} Work Package`,
            detail: `${role.charAt(0).toUpperCase()}${role.slice(1)} approval is required.`,
          });
        });
      }

      if (openDisputes.length > 0) {
        pushGroupedStageAction(groups, {
          actionType: "review_dispute",
          actionableBy: "commercial",
          priority: "high",
          title: `Review dispute for ${stage.name}`,
          detail: `${openDisputes.length} dispute item${openDisputes.length === 1 ? "" : "s"} are freezing value.`,
        });
      }

      if (pendingVariations.length > 0) {
        const treasuryReviewPending = pendingVariations.some(
          (variation) => Boolean(variation.commercialApprovedAt) && !variation.treasuryApprovedAt,
        );
        const variationNeedsFunding = pendingVariations.some(
          (variation) =>
            Boolean(variation.commercialApprovedAt) &&
            variation.amountDelta > 0 &&
            stageFunding.gapToRequiredCover > 0,
        );
        pushGroupedStageAction(groups, {
          actionType: variationNeedsFunding ? "activate_variation" : "review_variation",
          actionableBy: variationNeedsFunding || treasuryReviewPending ? "treasury" : "commercial",
          priority: variationNeedsFunding ? "critical" : "high",
          title: `Review variation for ${stage.name}`,
          detail: variationNeedsFunding
            ? "Variation needs funding cover before activation."
            : treasuryReviewPending
              ? "Variation is ready for treasury review."
              : `${pendingVariations.length} variation item${pendingVariations.length === 1 ? "" : "s"} require commercial review.`,
        });
      }

      if (blockers.length > 0) {
        pushGroupedStageAction(groups, {
          actionType: "resolve_blockers",
          actionableBy: "system",
          priority: blockers.some((blocker) => blocker.priority === "critical") ? "critical" : "medium",
          title: `Resolve blockers for ${stage.name} Work Package`,
          detail: blockers.map((blocker) => blocker.label).join(" "),
        });
      }

      const groupedActions = Array.from(groups.values());

      if (groupedActions.length === 0) {
        return null;
      }

      const priorityOrder: Record<ActionPriority, number> = { critical: 0, high: 1, medium: 2 };
      const priority = groupedActions.reduce(
        (current, group) =>
          priorityOrder[group.priority] < priorityOrder[current] ? group.priority : current,
        groupedActions[0].priority,
      );

      return {
        id: `${stage.id}-grouped-actions`,
        projectId: project.id,
        projectName: project.name,
        stageId: stage.id,
        stageName: stage.name,
        priority,
        actionCount: groupedActions.reduce((total, group) => total + group.count, 0),
        groupedActions,
      } satisfies FundingActionQueueItem;
    })
    .filter((item): item is FundingActionQueueItem => item !== null);

  const priorityOrder: Record<ActionPriority, number> = { critical: 0, high: 1, medium: 2 };
  return items.sort((left, right) => priorityOrder[left.priority] - priorityOrder[right.priority]);
}

export function getStageDetail(state: SystemStateRecord, stageId: string, userId = state.currentUserId): StageDetailModel {
  const stage = state.stages.find((entry) => entry.id === stageId);

  if (!stage) {
    throw new Error(`Unknown stage ${stageId}`);
  }

  const project = state.projects.find((entry) => entry.id === stage.projectId);
  const funding = getStageFundingSummary(state, stage);
  const user = getUserRecord(state, userId);
  const releaseDecision = getReleaseDecisions(state, stage.projectId).find((entry) => entry.stageId === stageId)!;

  if (!project) {
    throw new Error(`Unable to derive stage detail for ${stageId}`);
  }

  return {
    projectName: project.name,
    stage,
    blockers: getStageBlockers(state, stageId),
    releaseDecision,
    funding,
    fundingStatusLabel:
      funding.gapToRequiredCover === 0 ? "Funded" : funding.allocatedFunds > 0 ? "Partially funded" : "Blocked",
    contributesToRequiredCover: funding.requiredFunds > 0,
    blockingRelease: !releaseDecision.releasable,
    certifiedValue: stage.requiredAmount,
    payableValue: getPayableValue(stage),
    frozenValue: getFrozenValue(stage),
    evidenceState: getEvidenceState(state, stageId),
    approvalState: getApprovalStateSummary(state, stage),
    fundingState: funding.gapToRequiredCover === 0 ? "funded" : "shortfall",
    disputes: (stage.disputes ?? []).map((dispute) => ({
      ...dispute,
      canResolve: dispute.status === "open" && ["commercial", "treasury"].includes(user.role),
    })),
    variations: (stage.variations ?? []).map((variation) => ({
      ...variation,
      canApprove:
        variation.status === "pending" &&
        ((user.role === "commercial" && !variation.commercialApprovedAt) ||
          (user.role === "treasury" && Boolean(variation.commercialApprovedAt) && !variation.treasuryApprovedAt)),
      canReject:
        variation.status === "pending" &&
        ((user.role === "commercial" && !variation.commercialApprovedAt) ||
          (user.role === "treasury" && Boolean(variation.commercialApprovedAt) && !variation.treasuryApprovedAt)),
      canActivate: variation.status === "approved" && user.role === "treasury",
    })),
    evidence: getEvidenceViews(state, stageId),
    approvals: stage.requiredApprovalRoles.map((role) => {
      const approval = state.approvals.find((entry) => entry.stageId === stageId && entry.role === role);

      return {
        id: approval?.id ?? `${stageId}-${role}`,
        role,
        status: approval?.status ?? "pending",
        canAct: user.role === role && canApprovalRoleAct(state, stage, role) && approval?.status !== "approved",
        sequenceBlocked: Boolean(stage.approvalSequence?.length) && !canApprovalRoleAct(state, stage, role),
      };
    }),
    ledgerTransactions: getLedgerTransactions(state, stage.projectId, stageId),
    availableActions: {
      addEvidence: ["contractor", "subcontractor", "professional", "commercial"].includes(user.role),
      fundStage: user.role === "treasury",
      applyOverride: user.role === "treasury",
      release: user.role === "treasury",
      openDispute: ["contractor", "commercial"].includes(user.role),
      resolveDispute: ["commercial", "treasury"].includes(user.role),
      createVariation: ["contractor", "commercial"].includes(user.role),
      reviewVariation: ["commercial", "treasury"].includes(user.role),
      activateVariation: user.role === "treasury",
    },
  };
}

export function getRoleJourneySummary(
  state: SystemStateRecord,
  projectId: string,
  role: FundingUserRole = getUserRecord(state).role,
): RoleJourneySummary {
  const stageDetails = state.stages
    .filter((stage) => stage.projectId === projectId)
    .map((stage) => getStageDetail(state, stage.id));

  const items = stageDetails.flatMap((detail) => {
    const stageItems: RoleJourneySummary["items"] = [];

    if (detail.frozenValue > 0 && ["commercial", "contractor", "funder", "subcontractor"].includes(role)) {
      stageItems.push({
        stageId: detail.stage.id,
        stageName: detail.stage.name,
        summary: `Frozen value ${detail.frozenValue.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} is under dispute.`,
        tone: "frozen",
      });
    }

    if (detail.releaseDecision.releasable && detail.payableValue > 0 && ["treasury", "funder", "commercial"].includes(role)) {
      stageItems.push({
        stageId: detail.stage.id,
        stageName: detail.stage.name,
        summary: `Payable value ${detail.payableValue.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} is ready for controlled drawdown.`,
        tone: "payable",
      });
    }

    if (detail.blockers.length > 0) {
      const primaryBlocker = detail.blockers[0];
      const attentionRoles: FundingUserRole[] =
        primaryBlocker.code === "funding"
          ? ["treasury", "funder"]
          : primaryBlocker.code === "evidence"
            ? ["contractor", "subcontractor", "professional"]
            : primaryBlocker.code === "approvals"
              ? ["commercial", "professional", "treasury"]
              : primaryBlocker.code === "variation"
                ? ["commercial", "treasury", "contractor"]
                : ["commercial", "contractor", "funder"];

      if (attentionRoles.includes(role)) {
        stageItems.push({
          stageId: detail.stage.id,
          stageName: detail.stage.name,
          summary: primaryBlocker.label,
          tone: primaryBlocker.priority === "critical" ? "blocked" : "attention",
        });
      }
    }

    return stageItems;
  });

  return {
    role,
    heading:
      role === "treasury"
        ? "Treasury Control Journey"
        : role === "funder"
          ? "Funder Review Journey"
          : role === "contractor"
            ? "Contractor Operational Journey"
            : role === "subcontractor"
              ? "Subcontractor Visibility"
              : `${role.charAt(0).toUpperCase()}${role.slice(1)} Journey`,
    attentionCount: items.filter((item) => item.tone === "attention").length,
    blockedCount: items.filter((item) => item.tone === "blocked").length,
    payableValue: stageDetails.reduce((total, detail) => total + (detail.releaseDecision.releasable ? detail.payableValue : 0), 0),
    frozenValue: stageDetails.reduce((total, detail) => total + detail.frozenValue, 0),
    items,
  };
}

export function setCurrentUser(state: SystemStateRecord, userId: string): SystemStateRecord {
  const nextState = cloneSystemState(state);
  getUserRecord(nextState, userId);
  nextState.currentUserId = userId;
  return nextState;
}

export function depositFunds(
  state: SystemStateRecord,
  projectId: string,
  amount: number,
  sourceType: FundingSourceType,
  stageId?: string,
  userId = state.currentUserId,
): SystemStateRecord {
  if (amount <= 0 || getUserRecord(state, userId).role !== "treasury") {
    return state;
  }

  if (sourceType === "contractor" && !stageId) {
    return state;
  }

  const nextState = cloneSystemState(state);
  const beforeState = stageId ? getStageDetail(nextState, stageId) : getFundingSummary(nextState, projectId);
  const timestamp = nowIso();
  const isRestrictedUse = sourceType === "contractor";

  if (isRestrictedUse && stageId) {
    nextState.ledgerEntries.push({
      id: randomId("entry"),
      accountId: getStageAccount(nextState, stageId).id,
      amount,
      type: "deposit",
      reference: "Contractor supplementary contribution",
      timestamp,
      sourceType,
      restrictedUse: true,
      stageId,
    });
  } else {
    nextState.ledgerEntries.push({
      id: randomId("entry"),
      accountId: getProjectAccount(nextState, projectId).id,
      amount,
      type: "deposit",
      reference: "Funder drawdown",
      timestamp,
      sourceType,
      restrictedUse: false,
      stageId,
    });
  }
  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "funding_added",
    stageId ? "stage" : "ledger",
    stageId ?? projectId,
    beforeState,
    stageId ? getStageDetail(nextState, stageId) : getFundingSummary(nextState, projectId),
  );
  return nextState;
}

export function allocateStageFunds(
  state: SystemStateRecord,
  stageId: string,
  userId = state.currentUserId,
): SystemStateRecord {
  if (getUserRecord(state, userId).role !== "treasury") {
    return state;
  }

  const nextState = cloneSystemState(state);
  const stage = nextState.stages.find((entry) => entry.id === stageId);

  if (!stage) {
    return state;
  }

  const stageFunding = getStageFundingSummary(nextState, stage);
  const availableProjectFunds = Math.max(getProjectAccount(nextState, stage.projectId).balance - getProjectRecord(nextState, stage.projectId).reserveBuffer, 0);
  const transferAmount = Math.min(stageFunding.gapToRequiredCover, availableProjectFunds);

  if (transferAmount <= 0) {
    return state;
  }

  const beforeState = getStageDetail(nextState, stageId);
  const timestamp = nowIso();
  nextState.ledgerEntries.push({
    id: randomId("entry"),
    accountId: getProjectAccount(nextState, stage.projectId).id,
    amount: -transferAmount,
    type: "allocation_out",
    reference: `Allocate ${stage.name}`,
    timestamp,
    stageId,
  });
  nextState.ledgerEntries.push({
    id: randomId("entry"),
    accountId: getStageAccount(nextState, stageId).id,
    amount: transferAmount,
    type: "allocation_in",
    reference: `Allocate ${stage.name}`,
    timestamp,
    stageId,
    sourceType: "funder",
    restrictedUse: false,
  });
  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "funding_added",
    "stage",
    stageId,
    beforeState,
    getStageDetail(nextState, stageId),
  );
  return nextState;
}

export function updateEvidenceStatus(
  state: SystemStateRecord,
  requirementId: string,
  status: EvidenceStatus,
  userId = state.currentUserId,
): SystemStateRecord {
  if (getUserRecord(state, userId).role !== "professional") {
    return state;
  }

  const nextState = cloneSystemState(state);
  const requirement = nextState.evidenceRequirements.find((entry) => entry.id === requirementId);

  if (!requirement) {
    return state;
  }

  const beforeState = getStageDetail(nextState, requirement.stageId);
  const existing = nextState.evidence.find((entry) => entry.requirementId === requirementId);

  if (existing) {
    existing.status = status;
    existing.submittedAt = nowIso();
  } else {
    nextState.evidence.push({
      id: randomId("evidence"),
      stageId: requirement.stageId,
      type: requirement.type,
      status,
      requirementId,
      name: requirement.label,
      submittedAt: nowIso(),
    });
  }

  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "evidence_updated",
    "evidence",
    requirementId,
    beforeState,
    getStageDetail(nextState, requirement.stageId),
  );
  return nextState;
}

export function addEvidence(
  state: SystemStateRecord,
  stageId: string,
  type: EvidenceType,
  title: string,
  userId = state.currentUserId,
): SystemStateRecord {
  const actor = getUserRecord(state, userId);

  if (!["contractor", "professional", "commercial", "subcontractor"].includes(actor.role)) {
    return state;
  }

  if (!title.trim()) {
    return state;
  }

  const nextState = cloneSystemState(state);
  const beforeState = getStageDetail(nextState, stageId);
  const requiredRequirement = nextState.evidenceRequirements.find(
    (entry) =>
      entry.stageId === stageId &&
      entry.type === type &&
      !nextState.evidence.some((evidence) => evidence.requirementId === entry.id),
  );
  const requirementId = requiredRequirement?.id ?? randomId("requirement");

  if (!requiredRequirement) {
    nextState.evidenceRequirements.push({
      id: requirementId,
      stageId,
      label: title.trim(),
      type,
      required: false,
    });
  }

  nextState.evidence.push({
    id: randomId("evidence"),
    stageId,
    type,
    status: "pending",
    requirementId,
    name: title.trim(),
    submittedAt: nowIso(),
  });

  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "evidence_updated",
    "evidence",
    requirementId,
    beforeState,
    getStageDetail(nextState, stageId),
  );
  return nextState;
}

export function openDispute(
  state: SystemStateRecord,
  stageId: string,
  title: string,
  reason: string,
  disputedAmount: number,
  userId = state.currentUserId,
): SystemStateRecord {
  const actor = getUserRecord(state, userId);
  const stage = state.stages.find((entry) => entry.id === stageId);

  if (!stage || !["contractor", "commercial"].includes(actor.role) || !title.trim() || !reason.trim() || disputedAmount <= 0) {
    return state;
  }

  const remainingValue = Math.max(stage.requiredAmount - stage.releasedAmount, 0);
  const availableToFreeze = Math.max(remainingValue - getFrozenValue(stage), 0);

  if (availableToFreeze <= 0) {
    return state;
  }

  const nextState = cloneSystemState(state);
  const beforeState = getStageDetail(nextState, stageId);
  const nextStage = nextState.stages.find((entry) => entry.id === stageId);

  if (!nextStage) {
    return state;
  }

  nextStage.disputes = [
    ...(nextStage.disputes ?? []),
    {
      id: randomId("dispute"),
      stageId,
      title: title.trim(),
      reason: reason.trim(),
      disputedAmount: Math.min(disputedAmount, availableToFreeze),
      status: "open",
      openedBy: userId,
      openedAt: nowIso(),
    },
  ];

  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "dispute_opened",
    "dispute",
    nextStage.disputes[nextStage.disputes.length - 1].id,
    beforeState,
    getStageDetail(nextState, stageId),
  );
  return nextState;
}

export function resolveDispute(
  state: SystemStateRecord,
  stageId: string,
  disputeId: string,
  userId = state.currentUserId,
): SystemStateRecord {
  const actor = getUserRecord(state, userId);

  if (!["commercial", "treasury"].includes(actor.role)) {
    return state;
  }

  const nextState = cloneSystemState(state);
  const stage = nextState.stages.find((entry) => entry.id === stageId);

  if (!stage) {
    return state;
  }

  const dispute = (stage.disputes ?? []).find((entry) => entry.id === disputeId && entry.status === "open");

  if (!dispute) {
    return state;
  }

  const beforeState = getStageDetail(nextState, stageId);
  dispute.status = "resolved";
  dispute.resolvedBy = userId;
  dispute.resolvedAt = nowIso();

  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "dispute_resolved",
    "dispute",
    disputeId,
    beforeState,
    getStageDetail(nextState, stageId),
  );
  return nextState;
}

export function createVariation(
  state: SystemStateRecord,
  stageId: string,
  title: string,
  reason: string,
  amountDelta: number,
  userId = state.currentUserId,
): SystemStateRecord {
  const actor = getUserRecord(state, userId);

  if (!["contractor", "commercial"].includes(actor.role) || !title.trim() || !reason.trim() || amountDelta === 0) {
    return state;
  }

  const nextState = cloneSystemState(state);
  const stage = nextState.stages.find((entry) => entry.id === stageId);

  if (!stage) {
    return state;
  }

  const beforeState = getStageDetail(nextState, stageId);
  stage.variations = [
    ...(stage.variations ?? []),
    {
      id: randomId("variation"),
      stageId,
      title: title.trim(),
      reason: reason.trim(),
      amountDelta,
      status: "pending",
      createdBy: userId,
      createdAt: nowIso(),
    },
  ];

  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "variation_created",
    "variation",
    stage.variations[stage.variations.length - 1].id,
    beforeState,
    getStageDetail(nextState, stageId),
  );
  return nextState;
}

export function reviewVariation(
  state: SystemStateRecord,
  stageId: string,
  variationId: string,
  decision: "approved" | "rejected",
  userId = state.currentUserId,
): SystemStateRecord {
  const actor = getUserRecord(state, userId);

  if (!["commercial", "treasury"].includes(actor.role)) {
    return state;
  }

  const nextState = cloneSystemState(state);
  const stage = nextState.stages.find((entry) => entry.id === stageId);

  if (!stage) {
    return state;
  }

  const variation = (stage.variations ?? []).find((entry) => entry.id === variationId && entry.status === "pending");

  if (!variation) {
    return state;
  }

  const beforeState = getStageDetail(nextState, stageId);

  if (decision === "rejected") {
    variation.status = "rejected";
  } else if (actor.role === "commercial") {
    variation.commercialApprovedBy = userId;
    variation.commercialApprovedAt = nowIso();
  } else {
    if (!variation.commercialApprovedAt) {
      return state;
    }
    variation.treasuryApprovedBy = userId;
    variation.treasuryApprovedAt = nowIso();
    variation.status = "approved";
  }

  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    decision === "approved" ? "variation_approved" : "variation_rejected",
    "variation",
    variationId,
    beforeState,
    getStageDetail(nextState, stageId),
  );
  return nextState;
}

export function activateVariation(
  state: SystemStateRecord,
  stageId: string,
  variationId: string,
  userId = state.currentUserId,
): SystemStateRecord {
  if (getUserRecord(state, userId).role !== "treasury") {
    return state;
  }

  const nextState = cloneSystemState(state);
  const stage = nextState.stages.find((entry) => entry.id === stageId);

  if (!stage) {
    return state;
  }

  const variation = (stage.variations ?? []).find((entry) => entry.id === variationId && entry.status === "approved");

  if (!variation) {
    return state;
  }

  const proposedRequiredAmount = stage.requiredAmount + variation.amountDelta;
  if (proposedRequiredAmount < stage.releasedAmount) {
    return state;
  }

  const projectAccount = getProjectAccount(nextState, stage.projectId);
  const projectReserve = getProjectRecord(nextState, stage.projectId).reserveBuffer;
  const confirmedFunding = getStageAccount(nextState, stageId).balance + Math.max(projectAccount.balance - projectReserve, 0);
  const proposedStage = { ...stage, requiredAmount: proposedRequiredAmount };

  if (variation.amountDelta > 0 && confirmedFunding < getPayableValue(proposedStage)) {
    return state;
  }

  const beforeState = getStageDetail(nextState, stageId);
  stage.requiredAmount = proposedRequiredAmount;
  variation.status = "active";
  variation.activatedBy = userId;
  variation.activatedAt = nowIso();

  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "variation_activated",
    "variation",
    variationId,
    beforeState,
    getStageDetail(nextState, stageId),
  );
  return nextState;
}

export function decideApproval(
  state: SystemStateRecord,
  stageId: string,
  role: FundingApprovalRole,
  decision: Extract<FundingApprovalStatus, "approved" | "rejected">,
  userId = state.currentUserId,
): SystemStateRecord {
  const actor = getUserRecord(state, userId);
  const stage = state.stages.find((entry) => entry.id === stageId);
  const stageStatus = stage ? getDerivedStageStatus(state, stage) : null;

  if (
    !stage ||
    actor.role !== role ||
    !["ready", "partially_approved", "disputed"].includes(stageStatus ?? "") ||
    !canApprovalRoleAct(state, stage, role)
  ) {
    return state;
  }

  const nextState = cloneSystemState(state);
  const beforeState = getStageDetail(nextState, stageId);
  const approval = nextState.approvals.find((entry) => entry.stageId === stageId && entry.role === role);

  if (!approval) {
    return state;
  }

  approval.status = decision;
  if (decision === "approved") {
    approval.approvedAt = nowIso();
    approval.approvedBy = userId;
    approval.rejectedAt = undefined;
    approval.rejectedBy = undefined;
  } else {
    approval.rejectedAt = nowIso();
    approval.rejectedBy = userId;
    approval.approvedAt = undefined;
    approval.approvedBy = undefined;
  }
  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "approval_given",
    "approval",
    approval.id,
    beforeState,
    getStageDetail(nextState, stageId),
  );
  return nextState;
}

export function giveApproval(
  state: SystemStateRecord,
  stageId: string,
  role: FundingApprovalRole,
  userId = state.currentUserId,
): SystemStateRecord {
  return decideApproval(state, stageId, role, "approved", userId);
}

export function rejectApproval(
  state: SystemStateRecord,
  stageId: string,
  role: FundingApprovalRole,
  userId = state.currentUserId,
): SystemStateRecord {
  return decideApproval(state, stageId, role, "rejected", userId);
}

export function applyOverride(
  state: SystemStateRecord,
  stageId: string,
  reason: string,
  userId = state.currentUserId,
): SystemStateRecord {
  if (getUserRecord(state, userId).role !== "treasury" || !reason.trim()) {
    return state;
  }

  const nextState = cloneSystemState(state);
  const beforeState = getStageDetail(nextState, stageId);
  nextState.stages = nextState.stages.map((stage) =>
    stage.id === stageId
        ? {
          ...stage,
          overrideActive: true,
          override: {
            active: true,
            reason: reason.trim(),
            userId,
            timestamp: nowIso(),
            overriddenBlockers: beforeState.blockers.map((blocker) => blocker.label),
          },
        }
      : stage,
  );
  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "override_applied",
    "stage",
    stageId,
    beforeState,
    getStageDetail(nextState, stageId),
  );
  return nextState;
}

export function releaseStage(
  state: SystemStateRecord,
  stageId: string,
  userId = state.currentUserId,
): SystemStateRecord {
  if (getUserRecord(state, userId).role !== "treasury") {
    return state;
  }

  const nextState = cloneSystemState(state);
  const decision = getReleaseDecisions(nextState).find((entry) => entry.stageId === stageId);
  const stage = nextState.stages.find((entry) => entry.id === stageId);

  if (!decision || !stage || !decision.releasable) {
    return state;
  }

  const beforeState = getStageDetail(nextState, stageId);
  const stageAccountBalance = getStageAccount(nextState, stageId).balance;
  const releaseAmount = Math.min(stageAccountBalance, getPayableValue(stage));

  if (releaseAmount <= 0) {
    return state;
  }

  nextState.ledgerEntries.push({
    id: randomId("entry"),
    accountId: getStageAccount(nextState, stageId).id,
    amount: -releaseAmount,
    type: "release",
    reference: decision.overridden ? `Override release ${stage.name}` : `Release ${stage.name}`,
    timestamp: nowIso(),
    stageId,
    restrictedUse: Boolean(stage.override?.active),
  });
  nextState.stages = nextState.stages.map((entry) =>
    entry.id === stageId
      ? {
          ...entry,
          releasedAmount: Math.min(entry.releasedAmount + releaseAmount, entry.requiredAmount),
        }
      : entry,
  );
  reconcileSystemState(nextState, userId);
  appendAuditLog(
    nextState,
    userId,
    "USER_ACTION",
    "stage_released",
    "stage",
    stageId,
    beforeState,
    getStageDetail(nextState, stageId),
  );
  return nextState;
}
