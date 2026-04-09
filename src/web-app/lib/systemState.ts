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
  SystemEventRecord,
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
  attentionReason?: StageAttentionReason;
  handoff?: StageRoleHandoff;
  exitState?: StageExitState;
  exceptionPath?: StageExceptionPath;
  deepLinkTarget?: {
    projectId: string;
    stageId?: string;
    section?: StageDetailSectionKey;
  };
  roleCueLabel?: string;
  roleViewMode?: StageRoleViewMode;
  decisionCue?: WorkspaceDecisionCue;
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
      label: "Supporting information review requested",
      nextRequiredRole: "delivery",
      nextRecommendedAction: "review-evidence",
      priority: "high",
    };
  }

  return {
    code: "evidence-incomplete",
    category: "evidence",
    label: "Supporting information not fully accepted",
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
        attentionReason: primary.attentionReason,
        roleCueLabel: primary.roleCueLabel,
        roleViewMode: primary.roleViewMode,
        decisionCue: primary.decisionCue,
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
      const attentionReason = getAttentionReasonFromActionTask({
        summary: action.blockerLabel ?? action.detail,
        nextActionLabel: action.title,
        ownerLabel: formatRoleLabel(action.requiredRole ?? role),
        actionKey: action.actionKey,
        statusLabel: stage ? deriveWorkflowProgressLabel(stage, project.funding.position) : "In review",
      });
      const handoff = getTaskRoleHandoff({
        ownerLabel: formatRoleLabel(action.requiredRole ?? role),
        attentionReason,
        nextActionLabel: action.title,
        summary: action.blockerLabel ?? action.detail,
      });
      const deepLinkSection = getStageDetailSectionForActionCategory(action.type);
      const roleCue = getHomeTaskRoleCue({
        role,
        actionType: action.type,
        attentionReason,
        handoff,
      });
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
        attentionReason,
        handoff,
        roleCueLabel: roleCue.label,
        roleViewMode: roleCue.mode,
        decisionCue: getTaskDecisionCue({
          summary: action.blockerLabel ?? action.detail,
          nextStep: action.title,
          nextActionLabel: action.title,
          readinessState: "actionable",
          roleRelevance: "direct",
          attentionReason,
          handoff,
          deepLinkSection,
        }),
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
      const item = mapActionToTask(action);
      item.attentionReason = getAttentionReasonFromActionTask({
        ...item,
        nextActionLabel: undefined,
      });
      item.handoff = getTaskRoleHandoff({
        ownerLabel: item.ownerLabel,
        attentionReason: item.attentionReason,
        nextActionLabel: undefined,
        summary: item.summary,
      });
      item.decisionCue = getTaskDecisionCue({
        summary: item.summary,
        nextStep: item.nextActionLabel,
        readinessState: "watch",
        roleRelevance: "indirect",
        attentionReason: item.attentionReason,
        handoff: item.handoff,
        deepLinkSection: getStageDetailSectionForActionCategory(action.type),
      });
      waitingOnOthers.push(item);
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
    title: "Groundworks Contract",
    totalValue: 400000,
    allocatedFunding: 350000,
    status: "active"
  },
  {
    id: "c2",
    projectId: "p1",
    title: "Superstructure Contract",
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
  wipTotal: number;
  frozenFunds: number;
  inProgressFunds: number;
  surplusCash: number;
  releasableFunds: number;
  shortfall: number;
  availableProjectFunds: number;
  stageSummaries: FundingStageSummary[];
}

export interface FundingSummaryMetrics {
  projectBalance: number;
  allocatedFunds: number;
  wipTotal: number;
  frozenFunds: number;
  inProgressFunds: number;
  surplusCash: number;
  releasableFunds: number;
  shortfall: number;
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

export interface ReleaseDecisionExplanation {
  label: "Can release" | "Partially blocked" | "Cannot release";
  reason: string;
  tone: "positive" | "warning" | "blocked";
  decisionBasis: string;
}

export interface TreasuryReadinessSummary {
  label: "Funder ready" | "Funder review required" | "Funder blocked";
  reason: string;
  tone: "positive" | "warning" | "blocked";
}

export type DashboardAudienceMode = "operations" | "treasury" | "executive";

export interface OperationalStageStatus {
  label:
    | "Ready"
    | "Awaiting sign-off"
    | "Supporting information required"
    | "Funding shortfall"
    | "On hold"
    | "Ready for payment"
    | "Paid";
  reason: string;
  nextStep: string;
  tone: "positive" | "warning" | "blocked" | "neutral";
}

export interface ReleaseDecisionCard {
  projectId: string;
  stageId: string;
  stageName: string;
  status: SystemStageRecord["status"];
  releasable: boolean;
  releasableAmount: number;
  frozenAmount: number;
  undisputedAmount: number;
  isPartialRelease: boolean;
  overridden: boolean;
  blockedAmount: number;
  treasuryReadiness: TreasuryReadinessSummary;
  explanation: ReleaseDecisionExplanation;
  reasons: ReleaseDecisionReason[];
  overriddenBlockers: StageBlocker[];
}

export interface DisputeOperationalSummary {
  status: "No dispute" | "Partially releasable" | "Blocked by dispute";
  disputedValue: number;
  frozenValue: number;
  undisputedValue: number;
  releasableValue: number;
  reason: string;
}

export interface VariationOperationalSummary {
  status: "No variation" | "Pending review" | "Approved variation" | "Disputed variation";
  reason: string;
  blocking: boolean;
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
  operationalStatus: OperationalStageStatus;
  primaryAction: FundingActionGroup;
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

export interface DashboardSummaryStrip {
  releaseReadyPackages: number;
  partiallyBlockedPackages: number;
  blockedPackages: number;
  frozenValue: number;
  releasableNow: number;
  treasuryReadyPackages: number;
  treasuryReviewRequiredPackages: number;
  treasuryBlockedPackages: number;
}

export interface DashboardDecisionPack {
  fundingPositionLine: string;
  releasePostureLine: string;
  blockerThemeLine: string;
  treasuryConfidenceLine: string;
  disputeExposureLine: string;
  latestMaterialActivityLine: string;
  keyDecisionBasis: string;
}

export interface ActivityCue {
  label: "New" | "Updated" | "Ready now" | "New blocker";
  tone: "positive" | "warning" | "neutral";
}

export interface ActivityEventView extends SystemEventRecord {
  stageName?: string;
}

export interface ProjectActivitySummary {
  recentEvents: ActivityEventView[];
  lastActivityAt: string | null;
}

export interface ProjectWorkspaceSummary {
  projectId: string;
  projectName: string;
  postureLabel: "Payment ready" | "Waiting on sign-off" | "On hold / funder constrained";
  postureReason: string;
  releaseReadyCount: number;
  blockedCount: number;
  releasableNow: number;
  frozenValue: number;
  lastActivityAt: string | null;
}

export interface AttentionTaskItem {
  id: string;
  projectId: string;
  projectName: string;
  stageId?: string;
  stageName?: string;
  title: string;
  reason: string;
  nextStep: string;
  priority: ActionPriority;
  ownerLabel: string;
  attentionReason?: StageAttentionReason;
  handoff?: StageRoleHandoff;
  exitState?: StageExitState;
  exceptionPath?: StageExceptionPath;
  readinessState: "actionable" | "watch";
  roleRelevance: "direct" | "indirect" | "read_only";
  decisionCue: WorkspaceDecisionCue;
  deepLinkTarget?: {
    projectId: string;
    stageId?: string;
    section: "overview" | "funding" | "approvals" | "evidence" | "dispute" | "variation" | "release";
  };
}

export interface WorkspaceDecisionCue {
  primaryCue: string;
  secondaryCue: string | null;
  decisionUrgency: "immediate" | "active" | "monitor" | "outcome";
  entryOrientationLabel: string | null;
  detailFocusHint: "release" | "funding" | "approval" | "evidence" | "exception" | "handoff" | "outcome" | "general";
}

export interface StageAttentionReason {
  headline: string;
  reasonCategory: "funding" | "approval" | "evidence" | "dispute" | "variation" | "release" | "general";
  reasonLabel: string;
  requiresMyAction: boolean;
  ownerLabel: string | null;
  nextOwnerLabel: string | null;
  driverLabel: string;
  supportingDetails: string[];
  tone: "success" | "info" | "warning" | "neutral";
}

export function getUserFacingRoleLabel(role: FundingUserRole) {
  if (role === "contractor") return "Project Manager";
  if (role === "commercial") return "Commercial";
  if (role === "professional") return "Certifier";
  if (role === "treasury") return "Funder";
  if (role === "executive") return "Executive";
  if (role === "subcontractor") return "Subcontractor";
  return "Funder";
}

function getActingRoleSummary(role: FundingUserRole): ActingRoleSummary {
  return {
    key: role,
    label: getUserFacingRoleLabel(role),
    readOnly: role === "executive" || role === "funder" || role === "subcontractor",
  };
}

function getPermissionReason(enabled: boolean, requiredRoleLabel: string, enabledMessage: string) {
  return enabled ? enabledMessage : `${requiredRoleLabel} role required.`;
}

function reorderSignals(base: StageTopSignalKey[], priorityKeys: StageTopSignalKey[]) {
  const priority = priorityKeys.filter((key, index) => priorityKeys.indexOf(key) === index);
  const rest = base.filter((key) => !priority.includes(key));
  return [...priority, ...rest];
}

function getStageRoleViewGuidance(params: {
  actingRole: ActingRoleSummary;
  decisionSummary: StageDecisionSummary;
  attentionReason: StageAttentionReason;
  roleHandoff: StageRoleHandoff;
  exitState: StageExitState;
  exceptionPath: StageExceptionPath;
  releaseSummary: StageReleaseDecisionSummary;
  evidenceSummary: StageEvidenceSummary;
  approvalSummary: StageApprovalSummary;
  casePathSummary: StageCasePathSummary;
  fundingExplanation: StageFundingExplanation;
}): StageRoleViewGuidance {
  const {
    actingRole,
    decisionSummary,
    attentionReason,
    roleHandoff,
    exitState,
    exceptionPath,
    releaseSummary,
    evidenceSummary,
    approvalSummary,
    casePathSummary,
    fundingExplanation,
  } = params;

  let viewMode: StageRoleViewMode = "action_led";
  let primarySignals: StageTopSignalKey[] = ["decision", "release", "attention", "handoff"];
  let secondarySignals: StageTopSignalKey[] = ["evidence", "approval", "funding", "exception", "case_path", "outcome"];
  let contextualSignals: StageTopSignalKey[] = ["timeline"];
  let primaryWorkspaceLabel = "Payment progress";
  let workspaceHintLabel = "Next step";

  switch (actingRole.key) {
    case "treasury":
      viewMode = "funding_led";
      primarySignals = ["release", "funding", "decision", "exception", "handoff"];
      secondarySignals = ["case_path", "approval", "evidence", "outcome", "attention"];
      primaryWorkspaceLabel = "Payment and funding";
      workspaceHintLabel = "Funder sign-off";
      break;
    case "commercial":
      viewMode = "review_led";
      primarySignals = ["approval", "case_path", "exception", "decision", "attention"];
      secondarySignals = ["evidence", "handoff", "release", "funding", "outcome"];
      primaryWorkspaceLabel = "Commercial sign-off";
      workspaceHintLabel = "Review payment hold-up";
      break;
    case "professional":
      viewMode = "review_led";
      primarySignals = ["evidence", "approval", "decision", "attention", "handoff"];
      secondarySignals = ["exception", "case_path", "release", "funding", "outcome"];
      primaryWorkspaceLabel = "Supporting information";
      workspaceHintLabel = "Review supporting information";
      break;
    case "funder":
      viewMode = "funding_led";
      primarySignals = ["funding", "release", "exception", "decision", "outcome"];
      secondarySignals = ["case_path", "attention", "handoff", "evidence", "approval"];
      primaryWorkspaceLabel = "Payment exposure";
      workspaceHintLabel = "Financial oversight";
      break;
    case "executive":
      viewMode = "oversight_led";
      primarySignals = ["decision", "outcome", "release", "exception", "timeline"];
      secondarySignals = ["funding", "case_path", "attention", "handoff", "evidence", "approval"];
      contextualSignals = [];
      primaryWorkspaceLabel = "Outcome and risk";
      workspaceHintLabel = "Executive oversight";
      break;
    default:
      viewMode = "action_led";
      primarySignals = ["decision", "attention", "handoff", "evidence", "approval"];
      secondarySignals = ["release", "exception", "case_path", "funding", "outcome"];
      primaryWorkspaceLabel = "Project stage progress";
      workspaceHintLabel = "Next step";
      break;
  }

  const dynamicPriority: StageTopSignalKey[] = [];

  if (exceptionPath.hasActiveExceptionPath) {
    viewMode = "exception_led";
    dynamicPriority.push("exception", "case_path");
  }
  if (exitState.isClosedOrComplete) {
    dynamicPriority.push("outcome");
  }
  if (roleHandoff.isWaitingOnAnotherRole && !actingRole.readOnly) {
    dynamicPriority.push("handoff");
  }
  if (attentionReason.requiresMyAction && !actingRole.readOnly) {
    dynamicPriority.push("attention");
  }
  if (releaseSummary.tone === "warning" || fundingExplanation.tone === "warning") {
    dynamicPriority.push("release", "funding");
  }
  if (approvalSummary.tone === "warning") {
    dynamicPriority.push("approval");
  }
  if (evidenceSummary.tone === "warning") {
    dynamicPriority.push("evidence");
  }
  if (decisionSummary.tone === "warning") {
    dynamicPriority.push("decision");
  }

  return {
    viewMode,
    primarySignals: reorderSignals(primarySignals, dynamicPriority),
    secondarySignals: reorderSignals(secondarySignals, dynamicPriority),
    contextualSignals: reorderSignals(contextualSignals, dynamicPriority),
    primaryWorkspaceLabel,
    workspaceHintLabel,
  };
}

function getHomeTaskRoleCue(params: {
  role: Role;
  actionType?: ActionType;
  attentionReason?: StageAttentionReason;
  exceptionPath?: StageExceptionPath;
  handoff?: StageRoleHandoff;
}): { label: string; mode: StageRoleViewMode } {
  const { role, actionType, attentionReason, exceptionPath, handoff } = params;

  if (exceptionPath?.hasActiveExceptionPath) {
    return {
      label: role === "funder" ? "Exception oversight" : "Governed exception",
      mode: "exception_led",
    };
  }

  if (role === "treasury") {
    return {
      label: actionType === "approval" ? "Release control" : "Funding and release",
      mode: "funding_led",
    };
  }

  if (role === "commercial") {
    return {
      label: actionType === "approval" ? "Approval decision" : "Case review",
      mode: "review_led",
    };
  }

  if (role === "professional") {
    return {
      label: "Evidence review",
      mode: "review_led",
    };
  }

  if (role === "funder") {
    return {
      label: "Financial exposure",
      mode: "funding_led",
    };
  }

  if (handoff?.isWaitingOnAnotherRole) {
    return {
      label: "Progress handoff",
      mode: "action_led",
    };
  }

  return {
    label: attentionReason?.reasonCategory === "evidence" ? "Delivery evidence" : "Stage progression",
    mode: "action_led",
  };
}

function mapSectionToFocusHint(section?: StageDetailSectionKey): WorkspaceDecisionCue["detailFocusHint"] {
  if (section === "release") return "release";
  if (section === "funding") return "funding";
  if (section === "approvals") return "approval";
  if (section === "evidence") return "evidence";
  if (section === "dispute" || section === "variation") return "exception";
  return "general";
}

function getTaskDecisionCue(params: {
  summary: string;
  nextStep?: string;
  nextActionLabel?: string;
  readinessState: "actionable" | "watch";
  roleRelevance: "direct" | "indirect" | "read_only";
  attentionReason?: StageAttentionReason;
  handoff?: StageRoleHandoff;
  exitState?: StageExitState;
  exceptionPath?: StageExceptionPath;
  deepLinkSection?: StageDetailSectionKey;
}): WorkspaceDecisionCue {
  const {
    summary,
    nextStep,
    nextActionLabel,
    readinessState,
    roleRelevance,
    attentionReason,
    handoff,
    exitState,
    exceptionPath,
    deepLinkSection,
  } = params;

  if (exitState?.isClosedOrComplete) {
    return {
      primaryCue: exitState.outcomeLabel,
      secondaryCue: exitState.valueOutcomeLabel ?? exitState.reopenPathLabel,
      decisionUrgency: "outcome",
      entryOrientationLabel: "Governed outcome",
      detailFocusHint: "outcome",
    };
  }

  if (exceptionPath?.hasActiveExceptionPath) {
    return {
      primaryCue: exceptionPath.headline,
      secondaryCue: exceptionPath.requiredDecisionLabel ?? exceptionPath.returnPathLabel,
      decisionUrgency: roleRelevance === "direct" ? "immediate" : "active",
      entryOrientationLabel: "Under review",
      detailFocusHint: "exception",
    };
  }

  if (handoff?.isWaitingOnAnotherRole) {
    return {
      primaryCue: handoff.handoffHeadline,
      secondaryCue: handoff.expectedActionLabel ?? handoff.unlockOutcomeLabel,
      decisionUrgency: roleRelevance === "direct" ? "active" : "monitor",
      entryOrientationLabel: "Waiting on handoff",
      detailFocusHint: "handoff",
    };
  }

  if (readinessState === "actionable") {
    return {
      primaryCue: attentionReason?.reasonLabel ?? summary,
      secondaryCue: nextActionLabel ?? nextStep ?? attentionReason?.supportingDetails[0] ?? null,
      decisionUrgency: roleRelevance === "read_only" ? "monitor" : "immediate",
      entryOrientationLabel: roleRelevance === "read_only" ? "Monitor now" : "Act now",
      detailFocusHint: mapSectionToFocusHint(deepLinkSection),
    };
  }

  return {
    primaryCue: attentionReason?.reasonLabel ?? summary,
    secondaryCue:
      attentionReason?.supportingDetails[0] ??
      nextStep ??
      nextActionLabel ??
      null,
    decisionUrgency: roleRelevance === "read_only" ? "outcome" : "monitor",
    entryOrientationLabel: roleRelevance === "read_only" ? "Oversight" : "Monitor",
    detailFocusHint: mapSectionToFocusHint(deepLinkSection),
  };
}

function getStageEntryOrientation(detail: Pick<
  StageDetailModel,
  | "attentionReason"
  | "roleHandoff"
  | "exitState"
  | "exceptionPath"
  | "releaseSummary"
  | "fundingExplanation"
  | "evidenceSummary"
  | "approvalSummary"
  | "sectionGuidance"
  | "roleViewGuidance"
>): WorkspaceDecisionCue {
  if (detail.exitState.isClosedOrComplete) {
    return {
      primaryCue: detail.exitState.outcomeLabel,
      secondaryCue: detail.exitState.valueOutcomeLabel ?? detail.exitState.reopenPathLabel,
      decisionUrgency: "outcome",
      entryOrientationLabel: "Governed outcome",
      detailFocusHint: "outcome",
    };
  }

  if (detail.exceptionPath.hasActiveExceptionPath) {
    return {
      primaryCue: detail.exceptionPath.headline,
      secondaryCue: detail.exceptionPath.requiredDecisionLabel ?? detail.exceptionPath.returnPathLabel,
      decisionUrgency: "immediate",
      entryOrientationLabel: "Under review",
      detailFocusHint: "exception",
    };
  }

  if (detail.roleHandoff.isWaitingOnAnotherRole) {
    return {
      primaryCue: detail.roleHandoff.handoffHeadline,
      secondaryCue: detail.roleHandoff.expectedActionLabel ?? detail.roleHandoff.unlockOutcomeLabel,
      decisionUrgency: "monitor",
      entryOrientationLabel: "Waiting on handoff",
      detailFocusHint: "handoff",
    };
  }

  const primarySignal = detail.roleViewGuidance.primarySignals[0];

  if (primarySignal === "release") {
    return {
      primaryCue: detail.releaseSummary.decisionLabel ?? detail.releaseSummary.headline,
      secondaryCue: detail.releaseSummary.blockingConditionLabel ?? detail.releaseSummary.nextReleaseStepLabel,
      decisionUrgency: detail.releaseSummary.isReleaseEligible ? "immediate" : "active",
      entryOrientationLabel: detail.releaseSummary.isReleaseEligible ? "Payment review" : "Payment status",
      detailFocusHint: "release",
    };
  }

  if (primarySignal === "funding") {
    return {
      primaryCue: detail.fundingExplanation.coverageLabel,
      secondaryCue: detail.fundingExplanation.blockingConditionLabel ?? detail.fundingExplanation.nextFinancialStepLabel,
      decisionUrgency: detail.fundingExplanation.tone === "warning" ? "active" : "monitor",
      entryOrientationLabel: "Funding position",
      detailFocusHint: "funding",
    };
  }

  if (primarySignal === "evidence") {
    return {
      primaryCue: detail.evidenceSummary.sufficiencyLabel,
      secondaryCue: detail.evidenceSummary.blockingConditionLabel ?? detail.evidenceSummary.nextEvidenceStepLabel,
      decisionUrgency: detail.evidenceSummary.tone === "warning" ? "active" : "monitor",
      entryOrientationLabel: "Evidence review",
      detailFocusHint: "evidence",
    };
  }

  if (primarySignal === "approval") {
    return {
      primaryCue: detail.approvalSummary.approvalProgressLabel,
      secondaryCue: detail.approvalSummary.blockingConditionLabel ?? detail.approvalSummary.nextApprovalStepLabel,
      decisionUrgency: detail.approvalSummary.tone === "warning" ? "active" : "monitor",
      entryOrientationLabel: "Approval review",
      detailFocusHint: "approval",
    };
  }

  return {
    primaryCue: detail.attentionReason.reasonLabel,
    secondaryCue: detail.attentionReason.supportingDetails[0] ?? detail.sectionGuidance.overview.nextStep,
    decisionUrgency: detail.attentionReason.requiresMyAction ? "immediate" : "active",
    entryOrientationLabel: detail.attentionReason.requiresMyAction ? "Act now" : "Review now",
    detailFocusHint: mapSectionToFocusHint(detail.sectionGuidance.overview.key),
  };
}

function getStageTopSurfaceGuidance(detail: Pick<
  StageDetailModel,
  | "decisionSummary"
  | "attentionReason"
  | "actionReadiness"
  | "roleHandoff"
  | "exceptionPath"
  | "exitState"
  | "releaseSummary"
  | "fundingExplanation"
  | "evidenceSummary"
  | "approvalSummary"
  | "casePathSummary"
  | "roleViewGuidance"
  | "entryOrientation"
>): StageTopSurfaceGuidance {
  const visiblePrimary = detail.roleViewGuidance.primarySignals.filter((signal, index, list) => list.indexOf(signal) === index);
  const visibleSecondary = detail.roleViewGuidance.secondarySignals.filter((signal, index, list) => list.indexOf(signal) === index);
  const visibleSupport = detail.roleViewGuidance.contextualSignals.filter((signal, index, list) => list.indexOf(signal) === index);

  let primaryMode: StageTopSurfaceGuidance["primaryMode"] =
    detail.roleViewGuidance.viewMode === "review_led"
      ? "review"
      : detail.roleViewGuidance.viewMode === "oversight_led"
        ? "oversight"
        : "action";

  if (detail.exitState.isClosedOrComplete) {
    primaryMode = "outcome";
  } else if (detail.exceptionPath.hasActiveExceptionPath) {
    primaryMode = "exception";
  } else if (detail.roleHandoff.isWaitingOnAnotherRole && !detail.attentionReason.requiresMyAction) {
    primaryMode = "waiting";
  }

  const elevatedPrimary: StageTopSignalKey[] =
    primaryMode === "outcome"
      ? ["outcome", "decision", "release"]
      : primaryMode === "exception"
        ? ["exception", "case_path", "decision"]
        : primaryMode === "waiting"
          ? ["handoff", "decision", "release"]
          : primaryMode === "review"
            ? visiblePrimary.slice(0, 3)
            : primaryMode === "oversight"
              ? ["decision", "release", "outcome"]
              : visiblePrimary.slice(0, 3);

  const prioritizedSignals: StageTopSignalKey[] = [
    detail.entryOrientation.detailFocusHint === "release"
      ? "release"
      : detail.entryOrientation.detailFocusHint === "funding"
        ? "funding"
        : detail.entryOrientation.detailFocusHint === "approval"
          ? "approval"
          : detail.entryOrientation.detailFocusHint === "evidence"
            ? "evidence"
            : detail.entryOrientation.detailFocusHint === "exception"
              ? "exception"
              : detail.entryOrientation.detailFocusHint === "handoff"
                ? "handoff"
                : detail.entryOrientation.detailFocusHint === "outcome"
                  ? "outcome"
                  : "decision",
    ...elevatedPrimary,
  ];
  const primarySignalKeys = reorderSignals(visiblePrimary, prioritizedSignals).slice(
    0,
    primaryMode === "action" || primaryMode === "review" ? 2 : 3,
  );

  const secondarySignalKeys = visibleSecondary.filter((signal) => !primarySignalKeys.includes(signal));
  const supportSignalKeys = visibleSupport.filter((signal) => !primarySignalKeys.includes(signal) && !secondarySignalKeys.includes(signal));

  const topHeadlineLabel =
    primaryMode === "outcome"
      ? detail.exitState.outcomeLabel
      : primaryMode === "exception"
        ? detail.exceptionPath.headline
        : primaryMode === "waiting"
          ? detail.roleHandoff.handoffHeadline
          : detail.entryOrientation.primaryCue;

  const topSublineLabel =
    primaryMode === "outcome"
      ? detail.exitState.valueOutcomeLabel ?? detail.exitState.reopenPathLabel
      : primaryMode === "exception"
        ? detail.exceptionPath.requiredDecisionLabel ?? detail.exceptionPath.normalPathPausedLabel
        : primaryMode === "waiting"
          ? detail.roleHandoff.expectedActionLabel ?? detail.roleHandoff.handoffReasonLabel
          : detail.entryOrientation.secondaryCue ?? detail.decisionSummary.primaryDecisionLabel ?? detail.decisionSummary.actionabilityLabel;

  return {
    primaryMode,
    primarySignalKeys,
    secondarySignalKeys,
    supportSignalKeys,
    topHeadlineLabel,
    topSublineLabel,
    shouldCompactSecondarySignals: primaryMode !== "action" && primaryMode !== "review",
    shouldElevateException: detail.exceptionPath.hasActiveExceptionPath,
    shouldElevateOutcome: detail.exitState.isClosedOrComplete,
    shouldElevateRelease:
      detail.releaseSummary.isReleaseEligible ||
      detail.releaseSummary.tone === "warning" ||
      detail.roleViewGuidance.primarySignals.slice(0, 2).includes("release"),
  };
}

export interface DashboardDecisionSnapshot {
  balance: number;
  wip: number;
  frozen: number;
  releasable: number;
  inProgress: number;
  surplus: number;
  shortfall: number;
  releaseReadyCount: number;
  blockedCount: number;
  keyDecisionBasis: string;
}

export interface StageDecisionPack {
  status: string;
  treasuryReadiness: string;
  releaseStatus: string;
  releasable: number;
  frozen: number;
  inProgress: number;
  principalBlocker: string;
  nextActionOwner: string;
  decisionBasis: string;
  latestActivity: string;
}

export interface StageDecisionSummary {
  statusLabel: string;
  actionabilityLabel: string;
  primaryDecisionLabel: string | null;
  currentOwnerLabel: string | null;
  nextOwnerLabel: string | null;
  blockerSummary: string[];
  releaseReadinessLabel: string;
  tone: "success" | "info" | "warning" | "neutral";
}

export interface StageFundingExplanation {
  headline: string;
  coverageState: "covered" | "buffer_at_risk" | "underfunded" | "releasable" | "released" | "not_ready";
  coverageLabel: string;
  ringfencedLabel: string;
  requiredCoverLabel: string;
  reserveLabel: string;
  releasableLabel: string;
  shortfallLabel: string;
  blockingConditionLabel: string | null;
  nextFinancialStepLabel: string | null;
  supportingLines: string[];
  tone: "success" | "info" | "warning" | "neutral";
}

export interface StageActionOutcomeSummary {
  section: StageDetailSectionKey;
  tone: "success" | "warning";
  title: string;
  detail: string;
  resultType: "advanced" | "released" | "waiting" | "blocked" | "exception" | "no_change";
  resultTypeLabel: string;
  resultHeadline: string;
  resultSubline: string | null;
  resultTone: "success" | "info" | "warning" | "neutral";
  emphasis: "strong" | "normal" | "subtle";
  whatChanged: string[];
  unlockedItems: string[];
  remainingBlockers: string[];
  nextOwner: string | null;
  nextActionLabel: string | null;
  progressionStatus: "advanced" | "ready_for_next_decision" | "waiting_on_other_role" | "still_blocked";
  stateNowLabel: string;
  stateNowDetail: string;
}

export interface LastActionOutcome {
  actionId: string;
  timestamp: number;
  result: "advanced" | "blocked" | "waiting" | "exception" | "released";
  summary: string;
  affectedAreas: string[];
}

export interface StageRoleHandoff {
  isWaitingOnAnotherRole: boolean;
  fromRoleLabel: string | null;
  toRoleLabel: string | null;
  handoffHeadline: string;
  handoffReasonLabel: string;
  expectedActionLabel: string | null;
  unlockOutcomeLabel: string | null;
  blockingConditionLabel: string | null;
  tone: "success" | "info" | "warning" | "neutral";
}

export interface StageExitState {
  isClosedOrComplete: boolean;
  exitState: "complete" | "released" | "withheld" | "in_dispute" | "varied" | "superseded" | "still_active";
  headline: string;
  outcomeLabel: string;
  finalActionLabel: string | null;
  valueOutcomeLabel: string | null;
  remainingExposureLabel: string | null;
  reopenPathLabel: string | null;
  supportingLines: string[];
  tone: "success" | "info" | "warning" | "neutral";
}

export interface StageExceptionPath {
  hasActiveExceptionPath: boolean;
  exceptionType: "dispute" | "variation" | "override" | "withheld_release" | "other";
  headline: string;
  exceptionReasonLabel: string;
  normalPathPausedLabel: string | null;
  ownerLabel: string | null;
  requiredDecisionLabel: string | null;
  returnPathLabel: string | null;
  outcomeRiskLabel: string | null;
  supportingLines: string[];
  tone: "success" | "info" | "warning" | "neutral";
}

export interface StageReleaseDecisionSummary {
  isReleaseEligible: boolean;
  releaseState: "eligible" | "partially_eligible" | "withheld" | "blocked" | "released" | "not_ready";
  headline: string;
  eligibleAmountLabel: string;
  releasedAmountLabel: string;
  remainingHeldLabel: string;
  decisionLabel: string | null;
  blockingConditionLabel: string | null;
  exceptionInteractionLabel: string | null;
  nextReleaseStepLabel: string | null;
  supportingLines: string[];
  tone: "success" | "info" | "warning" | "neutral";
}

export interface StageEvidenceSummary {
  evidenceState: "missing" | "submitted" | "under_review" | "accepted" | "partially_accepted" | "rejected" | "not_required";
  headline: string;
  sufficiencyLabel: string;
  reviewStatusLabel: string;
  blockingConditionLabel: string | null;
  nextEvidenceStepLabel: string | null;
  ownerLabel: string | null;
  acceptedCountLabel: string;
  pendingCountLabel: string;
  rejectedCountLabel: string;
  supportingLines: string[];
  tone: "success" | "info" | "warning" | "neutral";
}

export interface StageApprovalSummary {
  approvalState: "not_started" | "in_progress" | "approved" | "partially_approved" | "blocked" | "not_ready";
  headline: string;
  approvalProgressLabel: string;
  activeApprovalLabel: string | null;
  nextApproverLabel: string | null;
  completedApprovals: string[];
  pendingApprovals: string[];
  blockingConditionLabel: string | null;
  nextApprovalStepLabel: string | null;
  supportingLines: string[];
  tone: "success" | "info" | "warning" | "neutral";
}

export interface StageHealthDescriptor {
  overallStatus: "healthy" | "at_risk" | "blocked";
  primaryReason: string;
  secondarySignals: string[];
  fundingStatus?: "ok" | "shortfall";
  approvalStatus?: "complete" | "pending";
  evidenceStatus?: "accepted" | "missing" | "rejected";
  releaseStatus?: "ready" | "not_ready";
}

export interface StageCasePathSummary {
  caseState: "none" | "dispute_active" | "variation_active" | "dispute_resolved" | "variation_resolved" | "blocked_by_case";
  headline: string;
  activePathLabel: string | null;
  ownerLabel: string | null;
  requiredDecisionLabel: string | null;
  normalPathImpactLabel: string | null;
  returnToProgressionLabel: string | null;
  riskLabel: string | null;
  supportingLines: string[];
  tone: "success" | "info" | "warning" | "neutral";
}

export type StageRoleViewMode = "action_led" | "review_led" | "funding_led" | "exception_led" | "oversight_led";

export type StageTopSignalKey =
  | "decision"
  | "outcome"
  | "release"
  | "exception"
  | "handoff"
  | "funding"
  | "evidence"
  | "approval"
  | "case_path"
  | "attention"
  | "timeline";

export interface StageRoleViewGuidance {
  viewMode: StageRoleViewMode;
  primarySignals: StageTopSignalKey[];
  secondarySignals: StageTopSignalKey[];
  contextualSignals: StageTopSignalKey[];
  primaryWorkspaceLabel: string;
  workspaceHintLabel: string;
}

export interface StageTopSurfaceGuidance {
  primaryMode: "action" | "review" | "waiting" | "exception" | "outcome" | "oversight";
  primarySignalKeys: StageTopSignalKey[];
  secondarySignalKeys: StageTopSignalKey[];
  supportSignalKeys: StageTopSignalKey[];
  topHeadlineLabel: string | null;
  topSublineLabel: string | null;
  shouldCompactSecondarySignals: boolean;
  shouldElevateException: boolean;
  shouldElevateOutcome: boolean;
  shouldElevateRelease: boolean;
}

export interface StageTimelineEntry {
  id: string;
  timestampLabel: string;
  headline: string;
  detail: string | null;
  actorLabel: string | null;
  changeType: "funding" | "approval" | "evidence" | "dispute" | "variation" | "release" | "status" | "audit";
  effect: "progressed" | "blocked" | "paused" | "updated";
  tone: "success" | "info" | "warning" | "neutral";
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
  unavailableReason: string;
  readiness: StageActionReadiness;
  approveAction: DerivedActionDescriptor;
  rejectAction: DerivedActionDescriptor;
}

export interface ActingRoleSummary {
  key: FundingUserRole;
  label: string;
  readOnly: boolean;
}

export type StageDetailSectionKey =
  | "overview"
  | "funding"
  | "approvals"
  | "evidence"
  | "dispute"
  | "variation"
  | "release";

export interface StageSectionGuidance {
  key: StageDetailSectionKey;
  status: string;
  summary: string;
  nextStep: string;
  recommendedAction: string;
  ownerLabel: string;
  state: "act_now" | "waiting" | "blocked" | "clear";
}

export interface StageDetailModel {
  projectName: string;
  projectLocation: string;
  stageDescription: string;
  plannedStartDate: string;
  plannedEndDate: string;
  stage: SystemStageRecord;
  blockers: StageBlocker[];
  decisionSummary: StageDecisionSummary;
  fundingExplanation: StageFundingExplanation;
  roleHandoff: StageRoleHandoff;
  exitState: StageExitState;
  exceptionPath: StageExceptionPath;
  releaseSummary: StageReleaseDecisionSummary;
  evidenceSummary: StageEvidenceSummary;
  approvalSummary: StageApprovalSummary;
  healthDescriptor: StageHealthDescriptor;
  casePathSummary: StageCasePathSummary;
  attentionReason: StageAttentionReason;
  roleViewGuidance: StageRoleViewGuidance;
  entryOrientation: WorkspaceDecisionCue;
  topSurfaceGuidance: StageTopSurfaceGuidance;
  operationalStatus: OperationalStageStatus;
  releaseDecision: ReleaseDecisionCard;
  treasuryReadiness: TreasuryReadinessSummary;
  funding: FundingStageSummary;
  fundingStatusLabel: "Covered by balance" | "Overcommitted";
  blockingRelease: boolean;
  lastUpdatedAt: string | null;
  lastDecisionAt: string | null;
  notificationCue: ActivityCue | null;
  recentEvents: ActivityEventView[];
  timelineEntries: StageTimelineEntry[];
  certifiedValue: number;
  payableValue: number;
  frozenValue: number;
  disputeSummary: DisputeOperationalSummary;
  variationSummary: VariationOperationalSummary;
  evidenceState: DerivedEvidenceState;
  approvalState: "blocked" | "ready" | "partially_approved" | "approved" | "rejected";
  disputes: Array<
    DisputeRecord & {
      canResolve: boolean;
      resolveAction: DerivedActionDescriptor;
    }
  >;
  variations: Array<
    VariationRecord & {
      canApprove: boolean;
      canReject: boolean;
      canActivate: boolean;
      operationalStatusLabel: VariationOperationalSummary["status"];
      approveAction: DerivedActionDescriptor;
      rejectAction: DerivedActionDescriptor;
      activateAction: DerivedActionDescriptor;
    }
  >;
  evidence: Array<
    EvidenceRequirementRecord & {
      record: EvidenceRecord | null;
      actionDescriptors: Partial<Record<EvidenceStatus, DerivedActionDescriptor>>;
    }
  >;
  approvals: ApprovalPanelItem[];
  actionDescriptors: DerivedActionDescriptor[];
  actionDescriptorMap: Record<string, DerivedActionDescriptor>;
  actionReadiness: {
    fundStage: StageActionReadiness;
    release: StageActionReadiness;
    applyOverride: StageActionReadiness;
    addEvidence: StageActionReadiness;
    reviewEvidence: StageActionReadiness;
    openDispute: StageActionReadiness;
    resolveDispute: StageActionReadiness;
    createVariation: StageActionReadiness;
    reviewVariation: StageActionReadiness;
    activateVariation: StageActionReadiness;
  };
  ledgerTransactions: LedgerTransactionItem[];
  actingRole: ActingRoleSummary;
  sectionGuidance: Record<StageDetailSectionKey, StageSectionGuidance>;
  availableActions: {
    addEvidence: boolean;
    addEvidenceReason: string;
    reviewEvidence: boolean;
    reviewEvidenceReason: string;
    fundStage: boolean;
    fundStageReason: string;
    applyOverride: boolean;
    applyOverrideReason: string;
    release: boolean;
    releaseReason: string;
    openDispute: boolean;
    openDisputeReason: string;
    resolveDispute: boolean;
    resolveDisputeReason: string;
    createVariation: boolean;
    createVariationReason: string;
    reviewVariation: boolean;
    reviewVariationReason: string;
    activateVariation: boolean;
    activateVariationReason: string;
  };
}

export interface StageActionReadiness {
  actionKey: string;
  label: string;
  isAvailable: boolean;
  readinessState: "available" | "waiting_on_prerequisite" | "waiting_on_other_role" | "not_permitted" | "complete";
  reasonLabel: string;
  missingPrerequisites: string[];
  nextConditionLabel: string | null;
  nextOwnerLabel: string | null;
  tone: "success" | "info" | "warning" | "neutral";
}

export interface DerivedActionDescriptor {
  actionId: string;
  label: string;
  outcomeLabel: string;
  stateTransitionPreview: {
    fromState: string;
    toState: string;
  };
  sideEffects?: string[];
  confidence: "high" | "medium" | "blocked";
  blockerSummary?: string;
  impactSummary?: string;
  isPrimary: boolean;
}

function getQueueRequestTitle(actionType: QueueActionType) {
  switch (actionType) {
    case "review_dispute":
      return "Resolve dispute";
    case "review_variation":
      return "Review variation";
    case "review_evidence":
      return "Review supporting information";
    case "approve_stage":
      return "Approve payment";
    case "activate_variation":
      return "Apply approved variation";
    case "release_funding":
      return "Release payment";
    case "resolve_blockers":
      return "Review payment hold-up";
    case "fund_stage":
      return "Allocate funds";
    default:
      return "Open request";
  }
}

function getContractorRequestTitle(detail: StageDetailModel) {
  if (detail.availableActions.addEvidence || detail.evidenceSummary.evidenceState === "missing") {
    return "Provide supporting information";
  }

  if (detail.availableActions.openDispute || detail.disputeSummary.frozenValue > 0 || detail.blockers.some((blocker) => blocker.code === "disputed")) {
    return "Raise dispute";
  }

  if (detail.availableActions.createVariation || detail.variationSummary.blocking) {
    return "Review variation";
  }

  if (detail.roleHandoff.isWaitingOnAnotherRole) {
    return `Track ${detail.roleHandoff.toRoleLabel ?? "next response"}`;
  }

  if (detail.blockers.length > 0) {
    return "Review payment hold-up";
  }

  return "Review project stage";
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

function sortEventsNewestFirst<T extends { timestamp: string }>(events: T[]) {
  return [...events].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

function appendSystemEvent(
  state: SystemStateRecord,
  event: Omit<SystemEventRecord, "id">,
) {
  state.eventHistory = sortEventsNewestFirst([
    {
      id: randomId("event"),
      ...event,
    },
    ...(state.eventHistory ?? []),
  ]);
}

function getStageIdFromSnapshot(snapshot: unknown): string | undefined {
  if (!snapshot || typeof snapshot !== "object") {
    return undefined;
  }

  if ("stageId" in snapshot && typeof snapshot.stageId === "string") {
    return snapshot.stageId;
  }

  if ("stage" in snapshot && snapshot.stage && typeof snapshot.stage === "object" && "id" in snapshot.stage && typeof snapshot.stage.id === "string") {
    return snapshot.stage.id;
  }

  return undefined;
}

function getProjectIdFromSnapshot(snapshot: unknown): string | undefined {
  if (!snapshot || typeof snapshot !== "object") {
    return undefined;
  }

  if ("projectId" in snapshot && typeof snapshot.projectId === "string") {
    return snapshot.projectId;
  }

  if ("stage" in snapshot && snapshot.stage && typeof snapshot.stage === "object" && "projectId" in snapshot.stage && typeof snapshot.stage.projectId === "string") {
    return snapshot.stage.projectId;
  }

  return undefined;
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

function buildInitialEventHistory(state: SystemStateRecord): SystemEventRecord[] {
  const accountById = Object.fromEntries(state.ledgerAccounts.map((account) => [account.id, account]));
  const stageById = Object.fromEntries(state.stages.map((stage) => [stage.id, stage]));
  const userById = Object.fromEntries(state.users.map((user) => [user.id, user]));
  const events: SystemEventRecord[] = [];

  state.ledgerEntries.forEach((entry) => {
    if (entry.type === "allocation_out") {
      return;
    }

    const stage = entry.stageId ? stageById[entry.stageId] : undefined;
    const account = accountById[entry.accountId];
    const projectId = account?.projectId ?? stage?.projectId;
    const summary =
      entry.type === "release"
        ? `${stage?.name ?? "Project stage"} released.`
        : entry.type === "allocation_in"
          ? `Funding allocated to ${stage?.name ?? "Project stage"}.`
          : "Project funding added.";

    events.push({
      id: `seed-ledger-${entry.id}`,
      timestamp: entry.timestamp,
      stageId: entry.stageId,
      eventType: entry.type === "release" ? "release" : "funding",
      actor: undefined,
      summary,
      details: {
        amount: Math.abs(entry.amount),
        projectId: projectId ?? null,
      },
    });
  });

  state.evidence.forEach((entry) => {
    const stage = stageById[entry.stageId];
    events.push({
      id: `seed-evidence-${entry.id}`,
      timestamp: entry.submittedAt ?? nowIso(),
      stageId: entry.stageId,
      eventType: "evidence",
      actor: undefined,
      summary: `Evidence updated for ${stage?.name ?? "Project stage"}.`,
      details: {
        projectId: stage?.projectId ?? null,
        status: entry.status,
        evidenceName: entry.name,
      },
    });
  });

  state.approvals.forEach((entry) => {
    const timestamp = entry.approvedAt ?? entry.rejectedAt;
    const actorId = entry.approvedBy ?? entry.rejectedBy;
    const stage = stageById[entry.stageId];

    if (!timestamp) {
      return;
    }

    events.push({
      id: `seed-approval-${entry.id}`,
      timestamp,
      stageId: entry.stageId,
      eventType: "approval",
      actor: actorId ? userById[actorId]?.role : undefined,
      summary: `${entry.role[0].toUpperCase()}${entry.role.slice(1)} approval ${entry.status} for ${stage?.name ?? "Project stage"}.`,
      details: {
        projectId: stage?.projectId ?? null,
        role: entry.role,
        decision: entry.status,
      },
    });
  });

  state.stages.forEach((stage) => {
    (stage.disputes ?? []).forEach((dispute) => {
      events.push({
        id: `seed-dispute-open-${dispute.id}`,
        timestamp: dispute.openedAt,
        stageId: stage.id,
        eventType: "dispute",
        actor: userById[dispute.openedBy]?.role,
        summary: `Dispute raised for ${stage.name}.`,
        details: {
          projectId: stage.projectId,
          amount: dispute.disputedAmount,
          status: dispute.status,
        },
      });

      if (dispute.resolvedAt) {
        events.push({
          id: `seed-dispute-resolved-${dispute.id}`,
          timestamp: dispute.resolvedAt,
          stageId: stage.id,
          eventType: "dispute",
          actor: dispute.resolvedBy ? userById[dispute.resolvedBy]?.role : undefined,
          summary: `Dispute resolved for ${stage.name}.`,
          details: {
            projectId: stage.projectId,
            amount: dispute.disputedAmount,
            status: "resolved",
          },
        });
      }
    });

    (stage.variations ?? []).forEach((variation) => {
      events.push({
        id: `seed-variation-created-${variation.id}`,
        timestamp: variation.createdAt,
        stageId: stage.id,
        eventType: "variation",
        actor: userById[variation.createdBy]?.role,
        summary: `Variation created for ${stage.name}.`,
        details: {
          projectId: stage.projectId,
          amountDelta: variation.amountDelta,
          status: variation.status,
        },
      });

      if (variation.commercialApprovedAt) {
        events.push({
          id: `seed-variation-commercial-${variation.id}`,
          timestamp: variation.commercialApprovedAt,
          stageId: stage.id,
          eventType: "variation",
          actor: variation.commercialApprovedBy ? userById[variation.commercialApprovedBy]?.role : undefined,
          summary: `Variation approved by commercial for ${stage.name}.`,
          details: {
            projectId: stage.projectId,
            status: variation.status,
          },
        });
      }

      if (variation.treasuryApprovedAt) {
        events.push({
          id: `seed-variation-treasury-${variation.id}`,
          timestamp: variation.treasuryApprovedAt,
          stageId: stage.id,
          eventType: "variation",
          actor: variation.treasuryApprovedBy ? userById[variation.treasuryApprovedBy]?.role : undefined,
          summary: `Variation approved by treasury for ${stage.name}.`,
          details: {
            projectId: stage.projectId,
            status: variation.status,
          },
        });
      }

      if (variation.activatedAt) {
        events.push({
          id: `seed-variation-activated-${variation.id}`,
          timestamp: variation.activatedAt,
          stageId: stage.id,
          eventType: "variation",
          actor: variation.activatedBy ? userById[variation.activatedBy]?.role : undefined,
          summary: `Variation activated for ${stage.name}.`,
          details: {
            projectId: stage.projectId,
            status: "active",
          },
        });
      }
    });
  });

  return sortEventsNewestFirst(events);
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

function getApprovedVariations(stage: SystemStageRecord) {
  return (stage.variations ?? []).filter((entry) => entry.status === "approved" || entry.status === "active");
}

function getRejectedVariations(stage: SystemStageRecord) {
  return (stage.variations ?? []).filter((entry) => entry.status === "rejected");
}

function getFrozenValue(stage: SystemStageRecord) {
  const remainingValue = Math.max(stage.requiredAmount - stage.releasedAmount, 0);
  const disputedValue = getOpenDisputes(stage).reduce((total, dispute) => total + dispute.disputedAmount, 0);
  return Math.min(disputedValue, remainingValue);
}

function getWipValue(stage: SystemStageRecord) {
  return Math.max(stage.requiredAmount - stage.releasedAmount, 0);
}

function getApprovedReleasableValue(state: SystemStateRecord, stage: SystemStageRecord) {
  return approvalsComplete(state, stage) && getEvidenceState(state, stage.id) === "accepted"
    ? Math.max(getWipValue(stage) - getFrozenValue(stage), 0)
    : 0;
}

function getInProgressValue(state: SystemStateRecord, stage: SystemStageRecord) {
  return Math.max(getWipValue(stage) - getApprovedReleasableValue(state, stage) - getFrozenValue(stage), 0);
}

function getPayableValue(stage: SystemStageRecord) {
  const remainingValue = getWipValue(stage);
  return Math.max(remainingValue - getFrozenValue(stage), 0);
}

function getDisputeOperationalSummary(state: SystemStateRecord, stage: SystemStageRecord): DisputeOperationalSummary {
  const remainingValue = getWipValue(stage);
  const disputedValue = Math.min(
    getOpenDisputes(stage).reduce((total, dispute) => total + dispute.disputedAmount, 0),
    remainingValue,
  );
  const frozenValue = getFrozenValue(stage);
  const undisputedValue = Math.max(remainingValue - disputedValue, 0);
  const releasableValue = getApprovedReleasableValue(state, stage);

  if (frozenValue <= 0) {
    return {
      status: "No dispute",
      disputedValue,
      frozenValue,
      undisputedValue,
      releasableValue,
      reason: "No disputed value is currently freezing payment.",
    };
  }

  if (releasableValue > 0) {
    return {
      status: "Partially releasable",
      disputedValue,
      frozenValue,
      undisputedValue,
      releasableValue,
      reason: "Undisputed approved value can still move while the disputed amount stays frozen.",
    };
  }

  return {
    status: "Blocked by dispute",
    disputedValue,
    frozenValue,
    undisputedValue,
    releasableValue,
    reason: "The remaining value is fully frozen by dispute.",
  };
}

function getVariationOperationalSummary(stage: SystemStageRecord): VariationOperationalSummary {
  const pendingVariations = getPendingVariations(stage);
  const approvedVariations = getApprovedVariations(stage);
  const rejectedVariations = getRejectedVariations(stage);

  if (pendingVariations.length > 0) {
    return {
      status: "Pending review",
      reason: "Variation review is holding the stage until the proposed change is decided.",
      blocking: true,
    };
  }

  if (approvedVariations.length > 0) {
    return {
      status: "Approved variation",
      reason: approvedVariations.some((variation) => variation.status === "approved")
        ? "An approved variation is waiting for activation."
        : "An approved variation has already been activated.",
      blocking: false,
    };
  }

  if (rejectedVariations.length > 0) {
    return {
      status: "Disputed variation",
      reason: "A proposed variation has been rejected and is not changing the current release path.",
      blocking: false,
    };
  }

  return {
    status: "No variation",
      reason: "No variation is currently affecting this project stage.",
    blocking: false,
  };
}

function getTreasuryReadinessSummary({
  blockers,
  releasableAmount,
  frozenAmount,
  overridden,
}: {
  blockers: StageBlocker[];
  releasableAmount: number;
  frozenAmount: number;
  overridden: boolean;
}): TreasuryReadinessSummary {
  if (overridden) {
    return {
      label: "Funder review required",
      reason: "Funder override is active and must be treated as an under-review decision.",
      tone: "warning",
    };
  }

  if (blockers.some((blocker) => blocker.code === "funding" || blocker.code === "disputed" || blocker.code === "variation")) {
    return {
      label: "Funder blocked",
      reason: blockers[0]?.label ?? "Funder requirements are not yet satisfied.",
      tone: "blocked",
    };
  }

  if (blockers.some((blocker) => blocker.code === "evidence" || blocker.code === "approvals" || blocker.code === "on_hold")) {
    return {
      label: "Funder review required",
      reason: blockers[0]?.label ?? "Funder sign-off is waiting on upstream checks.",
      tone: "warning",
    };
  }

  if (releasableAmount > 0 || frozenAmount > 0) {
    return {
      label: "Funder ready",
      reason: "Based on approvals, evidence acceptance, and the current WIP position.",
      tone: "positive",
    };
  }

  return {
    label: "Funder review required",
    reason: "Funder sign-off is required for the next payment step.",
    tone: "warning",
  };
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

function getOperationalStageStatus(state: SystemStateRecord, stage: SystemStageRecord): OperationalStageStatus {
  const releaseDecision = getReleaseDecisions(state, stage.projectId).find((entry) => entry.stageId === stage.id);
  const evidenceState = getEvidenceState(state, stage.id);
  const approvalState = getApprovalStateSummary(state, stage);
  const frozenValue = getFrozenValue(stage);
  const variationSummary = getVariationOperationalSummary(stage);

  if (stage.releasedAmount >= stage.requiredAmount) {
    return {
      label: "Paid",
      reason: "This project stage has already been paid.",
      nextStep: "No action needed.",
      tone: "neutral",
    };
  }

  if (frozenValue > 0 && getPayableValue(stage) === 0) {
    return {
      label: "On hold",
      reason: "Value is on hold due to dispute.",
      nextStep: "Resolve the dispute before payment can continue.",
      tone: "blocked",
    };
  }

  if (variationSummary.blocking) {
    return {
      label: "Awaiting sign-off",
      reason: variationSummary.reason,
      nextStep: "Complete the variation review before payment can continue.",
      tone: "warning",
    };
  }

  if (evidenceState !== "accepted") {
    return {
      label: "Supporting information required",
      reason: "Supporting information is incomplete.",
      nextStep: evidenceState === "missing" ? "Add the missing supporting information." : "Finish the supporting information review.",
      tone: "warning",
    };
  }

  if (approvalState !== "approved") {
    return {
      label: "Awaiting sign-off",
      reason: "Sign-off is incomplete.",
      nextStep: "Complete the remaining sign-offs.",
      tone: "warning",
    };
  }

  if (releaseDecision?.releasable) {
    return {
      label: "Ready for payment",
      reason: releaseDecision.explanation.reason,
      nextStep: "Send the payment now.",
      tone: "positive",
    };
  }

  if (releaseDecision?.explanation.label === "Partially blocked") {
    return {
      label: "Ready",
      reason: releaseDecision.explanation.reason,
      nextStep: releaseDecision.reasons[0]?.message ?? "Review the current blockers.",
      tone: "warning",
    };
  }

  return {
    label: "Ready",
    reason: "Work can move forward to the next control step.",
    nextStep: "Review the next required action.",
    tone: "neutral",
  };
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
  nextState.eventHistory = nextState.eventHistory ?? [];
  nextState.lastActionOutcomes = nextState.lastActionOutcomes ?? {};
  nextState.stages = nextState.stages.map((stage) => {
    const parentProject = nextState.projects.find((project) => project.id === stage.projectId);
    return {
      ...stage,
      projectName: stage.projectName ?? parentProject?.name ?? "Unknown project",
      projectLocation: stage.projectLocation ?? parentProject?.location ?? "Unknown location",
      description: stage.description ?? `${stage.name} stage record`,
      plannedStartDate: stage.plannedStartDate ?? new Date().toISOString().slice(0, 10),
      plannedEndDate: stage.plannedEndDate ?? new Date().toISOString().slice(0, 10),
    };
  });
  reconcileSystemState(nextState);
  if (nextState.eventHistory.length === 0) {
    nextState.eventHistory = buildInitialEventHistory(nextState);
  }
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
  const wipTotal = projectStages.reduce((total, stage) => total + getWipValue(stage), 0);
  const releasableFunds = projectStages.reduce((total, stage) => total + getApprovedReleasableValue(state, stage), 0);
  const frozenFunds = projectStages.reduce((total, stage) => total + getFrozenValue(stage), 0);
  const inProgressFunds = Math.max(wipTotal - releasableFunds - frozenFunds, 0);
  const surplusCash = Math.max(0, projectBalance - wipTotal);
  const shortfall = Math.max(0, wipTotal - projectBalance);

  return {
    projectBalance,
    allocatedFunds,
    wipTotal,
    frozenFunds,
    inProgressFunds,
    surplusCash,
    releasableFunds,
    shortfall,
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
    wipTotal: metrics.wipTotal,
    frozenFunds: metrics.frozenFunds,
    inProgressFunds: metrics.inProgressFunds,
    surplusCash: metrics.surplusCash,
    releasableFunds: metrics.releasableFunds,
    shortfall: metrics.shortfall,
    availableProjectFunds,
    stageSummaries,
  };
}

const dashboardCurrency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function getFundingSummarySentence(fundingSummary: FundingSummary) {
  const balanceDelta = fundingSummary.shortfall > 0 ? fundingSummary.shortfall : fundingSummary.surplusCash;
  const balanceDeltaLabel = fundingSummary.shortfall > 0 ? "shortfall" : "surplus";

  return `${dashboardCurrency.format(fundingSummary.wipTotal)} of work this period: ${dashboardCurrency.format(fundingSummary.releasableFunds)} ready to release, ${dashboardCurrency.format(fundingSummary.frozenFunds)} disputed, ${dashboardCurrency.format(fundingSummary.inProgressFunds)} in progress. ${dashboardCurrency.format(fundingSummary.projectBalance)} cash held, ${dashboardCurrency.format(balanceDelta)} ${balanceDeltaLabel}.`;
}

function getStageFundingExplanation({
  stage,
  funding,
  projectFunding,
  reserveBuffer,
  releaseDecision,
}: {
  stage: SystemStageRecord;
  funding: FundingStageSummary;
  projectFunding: FundingSummary;
  reserveBuffer: number;
  releaseDecision: ReleaseDecisionCard;
}): StageFundingExplanation {
  const reserveShortfall = Math.max(reserveBuffer - projectFunding.availableProjectFunds, 0);
  const stageFullyReleased = stage.releasedAmount >= stage.requiredAmount;
  const coverageState: StageFundingExplanation["coverageState"] =
    stageFullyReleased
      ? "released"
      : releaseDecision.releasable
        ? "releasable"
        : funding.gapToRequiredCover > 0
          ? "underfunded"
          : reserveShortfall > 0
            ? "buffer_at_risk"
            : releaseDecision.releasableAmount === 0
              ? "not_ready"
              : "covered";

  const coverageLabel =
    coverageState === "released"
      ? "Paid"
      : coverageState === "releasable"
        ? "Ready to pay now"
        : coverageState === "underfunded"
          ? "Underfunded against required cover"
          : coverageState === "buffer_at_risk"
            ? "Covered, but reserve buffer is at risk"
            : coverageState === "covered"
              ? "Covered by ringfenced funds"
              : "Covered, but not yet eligible for payment";

  const blockingConditionLabel =
    coverageState === "underfunded"
      ? `Required cover exceeds ringfenced funds by ${dashboardCurrency.format(funding.gapToRequiredCover)}.`
      : coverageState === "buffer_at_risk"
        ? `Project reserve buffer is short by ${dashboardCurrency.format(reserveShortfall)}.`
        : releaseDecision.frozenAmount > 0 && releaseDecision.releasableAmount === 0
          ? "On-hold disputed value is preventing payment."
          : releaseDecision.releasableAmount > 0 && !releaseDecision.releasable
            ? releaseDecision.explanation.reason
            : releaseDecision.releasableAmount === 0 && releaseDecision.blockedAmount > 0
              ? "No approved value within current WIP is yet eligible for payment."
              : null;

  const nextFinancialStepLabel =
    coverageState === "underfunded"
      ? "Allocate funds until ringfenced value meets required cover."
      : coverageState === "buffer_at_risk"
        ? "Top up project cash to restore the reserve buffer."
        : coverageState === "releasable"
          ? "Funder can approve payment of the ready value now."
          : releaseDecision.frozenAmount > 0 && releaseDecision.releasableAmount === 0
            ? "Resolve the dispute or clear the on-hold amount before payment."
            : releaseDecision.releasableAmount === 0
              ? "Keep funds allocated until sign-off, supporting information, or the dispute position produces value ready to pay."
              : null;

  const supportingLines = [
    `${dashboardCurrency.format(projectFunding.projectBalance)} cash held against ${dashboardCurrency.format(projectFunding.wipTotal)} WIP, leaving ${dashboardCurrency.format(projectFunding.shortfall > 0 ? projectFunding.shortfall : projectFunding.surplusCash)} ${projectFunding.shortfall > 0 ? "shortfall" : "surplus"}.`,
    `${dashboardCurrency.format(releaseDecision.releasableAmount)} ready to pay, ${dashboardCurrency.format(releaseDecision.frozenAmount)} on hold, ${dashboardCurrency.format(releaseDecision.blockedAmount)} still in progress within this stage.`,
    releaseDecision.explanation.decisionBasis,
  ];

  return {
    headline:
      coverageState === "released"
        ? "This project stage has already paid its current payable value."
        : coverageState === "releasable"
          ? "Allocated funds and sign-offs have produced value ready to pay."
          : coverageState === "underfunded"
            ? "Ringfenced funds do not yet meet required cover for this stage."
            : coverageState === "buffer_at_risk"
              ? "Stage cover is in place, but the project reserve buffer is below target."
              : coverageState === "covered"
                ? "Required cover is in place, with funds still waiting for release conditions."
                : "Required cover is in place, but this stage is not yet financially ready to release.",
    coverageState,
    coverageLabel,
    ringfencedLabel: `Ringfenced to this stage: ${dashboardCurrency.format(funding.allocatedFunds)}`,
    requiredCoverLabel: `Required cover for current WIP: ${dashboardCurrency.format(funding.requiredFunds)}`,
    reserveLabel: `Project reserve buffer: ${dashboardCurrency.format(reserveBuffer)}`,
    releasableLabel:
      releaseDecision.releasableAmount > 0
        ? `Releasable now: ${dashboardCurrency.format(releaseDecision.releasableAmount)}`
        : "Releasable now: £0",
    shortfallLabel:
      funding.gapToRequiredCover > 0
        ? `Shortfall to required cover: ${dashboardCurrency.format(funding.gapToRequiredCover)}`
        : "Shortfall to required cover: £0",
    blockingConditionLabel,
    nextFinancialStepLabel,
    supportingLines,
    tone:
      coverageState === "released" || coverageState === "releasable"
        ? "success"
        : coverageState === "covered" || coverageState === "not_ready"
          ? "info"
          : coverageState === "buffer_at_risk" || coverageState === "underfunded"
            ? "warning"
            : "neutral",
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
  const evidenceState = getEvidenceState(state, stage.id);
  const pendingApprovals = getPendingApprovalRoles(state, stage);
  const hasRejectedApproval = approvalRejected(state, stage);
  const disputeSummary = getDisputeOperationalSummary(state, stage);
  const variationSummary = getVariationOperationalSummary(stage);

  if (stage.onHold) {
    blockers.push({
      code: "on_hold",
      label: "Project stage is on hold and cannot progress.",
      priority: "critical",
    });
  }

  if (disputeSummary.frozenValue > 0 && disputeSummary.releasableValue === 0) {
    blockers.push({
      code: "disputed",
      label: "Funds frozen due to dispute.",
      priority: "critical",
    });
  }

  if (variationSummary.blocking) {
    blockers.push({
      code: "variation",
      label: "Variation review is holding the stage.",
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

function getReleaseDecisionExplanation({
  blockers,
  releasableAmount,
  overridden,
  disputeSummary,
  variationSummary,
}: {
  blockers: StageBlocker[];
  releasableAmount: number;
  overridden: boolean;
  disputeSummary: DisputeOperationalSummary;
  variationSummary: VariationOperationalSummary;
}): ReleaseDecisionExplanation {
  const hasDisputeBlocker = blockers.some((blocker) => blocker.code === "disputed");
  const hasVariationBlocker = blockers.some((blocker) => blocker.code === "variation");
  const hasEvidenceBlocker = blockers.some((blocker) => blocker.code === "evidence");
  const hasApprovalBlocker = blockers.some((blocker) => blocker.code === "approvals");
  const hasBlockingConditions = blockers.length > 0;

  if (overridden && blockers.length > 0) {
    return {
      label: "Partially blocked",
      reason: "Treasury override applied while blockers remain.",
      tone: "warning",
      decisionBasis: "Based on treasury override over existing blockers.",
    };
  }

  if (releasableAmount > 0 && disputeSummary.frozenValue > 0) {
    return {
      label: "Partially blocked",
      reason: "Undisputed approved value can release while the disputed amount stays frozen.",
      tone: "warning",
      decisionBasis: "Partially releasable; disputed amount remains held.",
    };
  }

  if (releasableAmount > 0 && !hasBlockingConditions) {
    return {
      label: "Can release",
      reason: "Approved value within WIP is ready to release.",
      tone: "positive",
      decisionBasis: "Based on approvals, evidence acceptance, and approved value within WIP.",
    };
  }

  if (releasableAmount > 0) {
    return {
      label: "Partially blocked",
      reason: blockers[0]?.label ?? "Release needs one more control step.",
      tone: "warning",
      decisionBasis: "Approved value exists within WIP, but another control step still blocks release.",
    };
  }

  if (hasDisputeBlocker) {
    return {
      label: "Cannot release",
      reason: "Funds frozen due to dispute.",
      tone: "blocked",
      decisionBasis: "Blocked by frozen disputed value.",
    };
  }

  if (hasVariationBlocker) {
    return {
      label: "Cannot release",
      reason: variationSummary.reason,
      tone: "blocked",
      decisionBasis: "Variation review is holding the release position.",
    };
  }

  if (hasEvidenceBlocker && hasApprovalBlocker) {
    return {
      label: "Cannot release",
      reason: "Evidence and approvals still need to clear.",
      tone: "blocked",
      decisionBasis: "Release is blocked until evidence acceptance and approvals are complete.",
    };
  }

  if (hasEvidenceBlocker) {
    return {
      label: "Cannot release",
      reason: "Evidence incomplete.",
      tone: "blocked",
      decisionBasis: "Release is blocked until evidence acceptance is complete.",
    };
  }

  if (hasApprovalBlocker) {
    return {
      label: "Cannot release",
      reason: "Approval incomplete.",
      tone: "blocked",
      decisionBasis: "Release is blocked until approvals are complete.",
    };
  }

  return {
    label: "Cannot release",
    reason: blockers[0]?.label ?? "No approved value is ready to release within WIP.",
    tone: "blocked",
    decisionBasis: "No approved value is currently releasable within WIP.",
  };
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
      const disputeSummary = getDisputeOperationalSummary(state, stage);
      const variationSummary = getVariationOperationalSummary(stage);
      const advisoryReasons: ReleaseDecisionReason[] = disputeSummary.frozenValue > 0
        ? [
            {
              type: "disputed",
              message: `Frozen value of £${disputeSummary.frozenValue.toLocaleString("en-GB")} remains outside payable drawdown.`,
            },
          ]
        : [];
      const releasableAmount = disputeSummary.releasableValue;
      const releasable = (releasableAmount > 0 && blockers.length === 0) || overridden;
      const blockedAmount = getInProgressValue(state, stage);
      const treasuryReadiness = getTreasuryReadinessSummary({
        blockers,
        releasableAmount,
        frozenAmount: disputeSummary.frozenValue,
        overridden,
      });

      return {
        projectId: stage.projectId,
        stageId: stage.id,
        stageName: stage.name,
        status: getDerivedStageStatus(state, stage),
        releasable,
        releasableAmount,
        frozenAmount: disputeSummary.frozenValue,
        undisputedAmount: disputeSummary.undisputedValue,
        isPartialRelease: releasableAmount > 0 && disputeSummary.frozenValue > 0,
        overridden,
        blockedAmount,
        treasuryReadiness,
        explanation: getReleaseDecisionExplanation({
          blockers,
          releasableAmount,
          overridden,
          disputeSummary,
          variationSummary,
        }),
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

function getActionPriorityRank(priority: ActionPriority) {
  const priorityOrder: Record<ActionPriority, number> = { critical: 0, high: 1, medium: 2 };
  return priorityOrder[priority];
}

function getPrimaryGroupedAction(groupedActions: FundingActionGroup[]) {
  return [...groupedActions].sort((left, right) => {
    const priorityDelta = getActionPriorityRank(left.priority) - getActionPriorityRank(right.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.title.localeCompare(right.title);
  })[0];
}

function canRoleActionGroup(role: FundingUserRole, action: FundingActionGroup) {
  if (role === "executive" || role === "funder" || role === "subcontractor") {
    return false;
  }

  if (action.actionableBy === "system") {
    return false;
  }

  if (action.actionType === "review_evidence") {
    return role === "professional";
  }

  if (action.actionType === "fund_stage" || action.actionType === "release_funding" || action.actionType === "activate_variation") {
    return role === "treasury";
  }

  if (action.actionType === "approve_stage") {
    return role === action.actionableBy;
  }

  if (action.actionType === "review_dispute" || action.actionType === "review_variation") {
    return role === "commercial" || role === "treasury";
  }

  return false;
}

function getStageDetailSectionForBlocker(blocker?: StageBlocker["code"]) {
  if (blocker === "evidence") return "evidence" as const;
  if (blocker === "approvals") return "approvals" as const;
  if (blocker === "disputed") return "dispute" as const;
  if (blocker === "variation") return "variation" as const;
  if (blocker === "funding") return "funding" as const;
  if (blocker === "on_hold") return "overview" as const;
  return "release" as const;
}

function getStageDetailSectionForAction(actionType: QueueActionType) {
  if (actionType === "fund_stage") return "funding" as const;
  if (actionType === "review_evidence") return "evidence" as const;
  if (actionType === "approve_stage") return "approvals" as const;
  if (actionType === "release_funding") return "release" as const;
  if (actionType === "review_dispute") return "dispute" as const;
  if (actionType === "review_variation" || actionType === "activate_variation") return "variation" as const;
  return "overview" as const;
}

function getStageDetailSectionForActionCategory(actionType: ActionType) {
  if (actionType === "funding") return "funding" as const;
  if (actionType === "evidence") return "evidence" as const;
  if (actionType === "approval") return "approvals" as const;
  if (actionType === "dispute") return "dispute" as const;
  if (actionType === "variation") return "variation" as const;
  return "overview" as const;
}

function getStageSectionGuidance({
  state,
  stage,
  user,
  funding,
  operationalStatus,
  releaseDecision,
  disputeSummary,
  variationSummary,
  evidenceState,
  approvalState,
  approvals,
  availableActions,
}: {
  state: SystemStateRecord;
  stage: SystemStageRecord;
  user: UserRecord;
  funding: FundingStageSummary;
  operationalStatus: StageDetailModel["operationalStatus"];
  releaseDecision: ReleaseDecisionCard;
  disputeSummary: DisputeOperationalSummary;
  variationSummary: VariationOperationalSummary;
  evidenceState: DerivedEvidenceState;
  approvalState: StageDetailModel["approvalState"];
  approvals: Array<Omit<ApprovalPanelItem, "approveAction" | "rejectAction">>;
  availableActions: StageDetailModel["availableActions"];
}): Record<StageDetailSectionKey, StageSectionGuidance> {
  const nextPendingApproval = approvals.find((approval) => approval.status !== "approved");
  const actionableApproval = approvals.find((approval) => approval.canAct);
  const actionableVariation = (stage.variations ?? []).find((variation) =>
    variation.status === "pending"
      ? ((user.role === "commercial" && !variation.commercialApprovedAt) ||
          (user.role === "treasury" && Boolean(variation.commercialApprovedAt) && !variation.treasuryApprovedAt))
      : variation.status === "approved" && user.role === "treasury",
  );
  const hasOpenDispute = (stage.disputes ?? []).some((dispute) => dispute.status === "open");
  const openDispute = (stage.disputes ?? []).find((dispute) => dispute.status === "open");
  const firstBlocker = getStageBlockers(state, stage.id)[0];

  const fundingGuidance: StageSectionGuidance =
    funding.gapToRequiredCover > 0
      ? {
          key: "funding",
          status: availableActions.fundStage ? "Needs action now" : "Waiting on Funder",
          summary:
            funding.gapToRequiredCover > 0
              ? `This project stage is short of ${dashboardCurrency.format(funding.gapToRequiredCover)} against current WIP.`
              : "Funding is aligned to current WIP.",
          nextStep: funding.gapToRequiredCover > 0 ? "Allocate funds to align the project stage to WIP." : "No funding action is needed.",
          recommendedAction: availableActions.fundStage ? "Allocate the remaining funding." : availableActions.fundStageReason,
          ownerLabel: "Funder",
          state: availableActions.fundStage ? "act_now" : "waiting",
        }
      : {
          key: "funding",
          status: "Ready",
          summary: "Funding is aligned to the current WIP position.",
          nextStep: "No funding action is needed.",
          recommendedAction: "Monitor balance against changing WIP.",
          ownerLabel: "Funder",
          state: "clear",
        };

  const evidenceGuidance: StageSectionGuidance =
    evidenceState === "accepted"
      ? {
          key: "evidence",
          status: "Ready",
          summary: "Required supporting information has been accepted.",
          nextStep: "No supporting information action is needed.",
          recommendedAction: "Continue monitoring for any further submissions.",
          ownerLabel: "Supporting information",
          state: "clear",
        }
      : evidenceState === "missing"
        ? {
            key: "evidence",
            status: availableActions.addEvidence ? "Needs action now" : "Prerequisite missing",
            summary: "Required supporting information is still missing.",
            nextStep: "Add the missing supporting item before review can complete.",
            recommendedAction: availableActions.addEvidence ? "Add the missing supporting information." : availableActions.addEvidenceReason,
            ownerLabel: availableActions.addEvidence ? getUserFacingRoleLabel(user.role) : "Project Manager",
            state: availableActions.addEvidence ? "act_now" : "blocked",
          }
        : {
            key: "evidence",
            status: availableActions.reviewEvidence ? "Needs action now" : "Waiting on others",
            summary: "Supporting information has been submitted and is waiting for review.",
            nextStep: "Review the current supporting information submission.",
            recommendedAction: availableActions.reviewEvidence ? "Accept, reject, or request more information." : availableActions.reviewEvidenceReason,
            ownerLabel: "Certifier",
            state: availableActions.reviewEvidence ? "act_now" : "waiting",
          };

  const approvalsGuidance: StageSectionGuidance =
    approvalState === "approved"
      ? {
          key: "approvals",
          status: "Ready",
          summary: "All required sign-offs are complete.",
          nextStep: "No sign-off action is needed.",
          recommendedAction: "Proceed to the next control step.",
          ownerLabel: "Commercial",
          state: "clear",
        }
      : approvalState === "rejected"
        ? {
            key: "approvals",
            status: actionableApproval ? "Needs action now" : "Blocked",
            summary: "A required approval has been rejected.",
            nextStep: "Resolve the rejected sign-off before payment can proceed.",
            recommendedAction: actionableApproval ? `Record the ${getUserFacingRoleLabel(actionableApproval.role).toLowerCase()} sign-off decision.` : firstBlocker?.label ?? "Resolve the sign-off blocker.",
            ownerLabel: actionableApproval ? getUserFacingRoleLabel(actionableApproval.role) : (nextPendingApproval ? getUserFacingRoleLabel(nextPendingApproval.role) : "Commercial"),
            state: actionableApproval ? "act_now" : "blocked",
          }
        : actionableApproval
          ? {
              key: "approvals",
              status: "Needs action now",
              summary: `${getUserFacingRoleLabel(actionableApproval.role)} sign-off is ready for decision.`,
              nextStep: "Approve or reject the current sign-off step.",
              recommendedAction: `Record the ${getUserFacingRoleLabel(actionableApproval.role).toLowerCase()} sign-off.`,
              ownerLabel: getUserFacingRoleLabel(actionableApproval.role),
              state: "act_now",
            }
          : {
              key: "approvals",
              status: approvalState === "blocked" ? "Prerequisite missing" : "Waiting on others",
              summary:
                approvalState === "blocked"
                  ? "Sign-offs cannot progress until supporting information is accepted."
                  : `Sign-off is waiting on ${nextPendingApproval ? getUserFacingRoleLabel(nextPendingApproval.role) : "the next reviewer"}.`,
              nextStep:
                approvalState === "blocked"
                  ? "Complete the supporting information step before sign-offs can continue."
                  : "Wait for the next sign-off step to complete.",
              recommendedAction:
                approvalState === "blocked"
                  ? "Clear the supporting information prerequisite first."
                  : `${nextPendingApproval ? getUserFacingRoleLabel(nextPendingApproval.role) : "The next reviewer"} must act.`,
              ownerLabel: nextPendingApproval ? getUserFacingRoleLabel(nextPendingApproval.role) : "Commercial",
              state: approvalState === "blocked" ? "blocked" : "waiting",
            };

  const disputeGuidance: StageSectionGuidance =
    !hasOpenDispute
      ? {
          key: "dispute",
          status: "No dispute",
          summary: "No disputed value is currently freezing payment.",
          nextStep: "No dispute action is needed.",
          recommendedAction: "Monitor for new dispute activity only if the position changes.",
          ownerLabel: "Commercial",
          state: "clear",
        }
      : {
          key: "dispute",
          status: availableActions.resolveDispute ? "Needs action now" : "Waiting on others",
          summary: disputeSummary.reason,
          nextStep: "Resolve the open dispute to restore a cleaner payment position.",
          recommendedAction: availableActions.resolveDispute ? `Resolve ${openDispute?.title ?? "the open dispute"}.` : availableActions.resolveDisputeReason,
          ownerLabel: "Commercial",
          state: availableActions.resolveDispute ? "act_now" : "waiting",
        };

  const variationGuidance: StageSectionGuidance =
    variationSummary.status === "No variation"
      ? {
          key: "variation",
          status: "No variation",
          summary: "No variation is currently affecting this project stage.",
          nextStep: "No variation action is needed.",
          recommendedAction: availableActions.createVariation ? "Only propose a variation if the scope changes." : availableActions.createVariationReason,
          ownerLabel: "Commercial",
          state: "clear",
        }
      : actionableVariation
        ? {
            key: "variation",
            status: "Needs action now",
            summary: variationSummary.reason,
            nextStep:
              actionableVariation.status === "approved"
                ? "Activate the approved variation."
                : "Review the pending variation decision.",
            recommendedAction:
              actionableVariation.status === "approved"
                ? "Activate the approved variation."
                : "Approve or reject the pending variation.",
            ownerLabel: actionableVariation.status === "approved" ? "Funder" : getUserFacingRoleLabel(user.role),
            state: "act_now",
          }
        : variationSummary.blocking
          ? {
              key: "variation",
              status: "Waiting on others",
              summary: variationSummary.reason,
              nextStep: "Wait for the current variation review to complete.",
              recommendedAction: availableActions.reviewVariation ? "Review the pending variation." : availableActions.reviewVariationReason,
              ownerLabel: "Commercial",
              state: "waiting",
            }
          : {
              key: "variation",
              status: variationSummary.status,
              summary: variationSummary.reason,
              nextStep: "No immediate variation action is needed.",
              recommendedAction: "Monitor the active variation state.",
              ownerLabel: variationSummary.status === "Approved variation" ? "Funder" : "Commercial",
              state: "clear",
            };

  const releaseGuidance: StageSectionGuidance =
    releaseDecision.releasableAmount > 0
      ? {
          key: "release",
          status: availableActions.release ? "Needs action now" : "Waiting on Funder",
          summary: releaseDecision.explanation.reason,
          nextStep:
            releaseDecision.isPartialRelease
              ? "Pay the undisputed approved value and keep the on-hold amount held."
              : "Pay the approved value now.",
          recommendedAction: availableActions.release ? "Send the current payment." : availableActions.releaseReason,
          ownerLabel: "Funder",
          state: availableActions.release ? "act_now" : "waiting",
        }
      : {
          key: "release",
          status: "Blocked",
          summary: releaseDecision.explanation.reason,
          nextStep: operationalStatus.nextStep,
          recommendedAction: firstBlocker ? firstBlocker.label : "Clear the current blocker before payment can proceed.",
          ownerLabel: firstBlocker ? getBlockerResponsibilityCue(firstBlocker.code) : "Funder",
          state: "blocked",
        };

  return {
    overview: {
      key: "overview",
      status: operationalStatus.label,
      summary: operationalStatus.reason,
      nextStep: operationalStatus.nextStep,
      recommendedAction: operationalStatus.nextStep,
      ownerLabel: firstBlocker ? getBlockerResponsibilityCue(firstBlocker.code) : "Ops",
      state:
        operationalStatus.tone === "positive"
          ? "clear"
          : operationalStatus.tone === "blocked"
            ? "blocked"
            : "waiting",
    },
    funding: fundingGuidance,
    approvals: approvalsGuidance,
    evidence: evidenceGuidance,
    dispute: disputeGuidance,
    variation: variationGuidance,
    release: releaseGuidance,
  };
}

export function getPrimaryActionForRole(
  state: SystemStateRecord,
  projectId: string,
  role: FundingUserRole = getUserRecord(state).role,
) {
  const queue = getActionQueue(state, projectId) as FundingActionQueueItem[];
  return queue.find((item) => canRoleActionGroup(role, item.primaryAction)) ?? null;
}

export function getRoleInboxItems(
  state: SystemStateRecord,
  role: FundingUserRole = getUserRecord(state).role,
  projectId?: string,
): AttentionTaskItem[] {
  const scopedProjects = state.projects.filter((project) => !projectId || project.id === projectId);
  const items: AttentionTaskItem[] = [];

  scopedProjects.forEach((project) => {
    if (role === "executive") {
      const decisions = getReleaseDecisions(state, project.id)
        .filter((decision) => decision.explanation.label !== "Can release")
        .slice(0, 3);

      decisions.forEach((decision) => {
        const detail = getStageDetail(state, decision.stageId);
        items.push({
          id: `exec-${project.id}-${decision.stageId}`,
          projectId: project.id,
          projectName: project.name,
          stageId: decision.stageId,
          stageName: decision.stageName,
          title: "Review payment position",
          reason: decision.explanation.reason,
          nextStep: detail.operationalStatus.nextStep,
          priority: decision.explanation.label === "Cannot release" ? "critical" : "high",
          ownerLabel: detail.blockers[0] ? getBlockerResponsibilityCue(detail.blockers[0].code) : "Funder",
          attentionReason: detail.attentionReason,
          handoff: detail.roleHandoff,
          exitState: detail.exitState,
          exceptionPath: detail.exceptionPath,
          readinessState: "watch",
          roleRelevance: "read_only",
          decisionCue: getTaskDecisionCue({
            summary: decision.explanation.reason,
            nextStep: detail.operationalStatus.nextStep,
            readinessState: "watch",
            roleRelevance: "read_only",
            attentionReason: detail.attentionReason,
            handoff: detail.roleHandoff,
            exitState: detail.exitState,
            exceptionPath: detail.exceptionPath,
            deepLinkSection: getStageDetailSectionForBlocker(detail.blockers[0]?.code),
          }),
          deepLinkTarget: {
            projectId: project.id,
            stageId: decision.stageId,
            section: getStageDetailSectionForBlocker(detail.blockers[0]?.code),
          },
        });
      });

      return;
    }

    if (role === "contractor") {
      state.stages
        .filter((stage) => stage.projectId === project.id && stage.releasedAmount < stage.requiredAmount)
        .forEach((stage) => {
          const detail = getStageDetail(state, stage.id);

          if (detail.blockers.length === 0 && detail.operationalStatus.label === "Ready for payment") {
            return;
          }

          items.push({
            id: `pm-${project.id}-${stage.id}`,
            projectId: project.id,
            projectName: project.name,
            stageId: stage.id,
            stageName: stage.name,
            title: getContractorRequestTitle(detail),
            reason: detail.operationalStatus.reason,
            nextStep: detail.operationalStatus.nextStep,
            priority: detail.blockers[0]?.priority ?? "medium",
            ownerLabel: detail.blockers[0] ? getBlockerResponsibilityCue(detail.blockers[0].code) : "Delivery",
            attentionReason: detail.attentionReason,
            handoff: detail.roleHandoff,
            exitState: detail.exitState,
            exceptionPath: detail.exceptionPath,
            readinessState: detail.availableActions.addEvidence || detail.availableActions.openDispute || detail.availableActions.createVariation ? "actionable" : "watch",
            roleRelevance: detail.availableActions.addEvidence || detail.availableActions.openDispute || detail.availableActions.createVariation ? "direct" : "indirect",
            decisionCue: getTaskDecisionCue({
              summary: detail.operationalStatus.reason,
              nextStep: detail.operationalStatus.nextStep,
              readinessState: detail.availableActions.addEvidence || detail.availableActions.openDispute || detail.availableActions.createVariation ? "actionable" : "watch",
              roleRelevance: detail.availableActions.addEvidence || detail.availableActions.openDispute || detail.availableActions.createVariation ? "direct" : "indirect",
              attentionReason: detail.attentionReason,
              handoff: detail.roleHandoff,
              exitState: detail.exitState,
              exceptionPath: detail.exceptionPath,
              deepLinkSection: getStageDetailSectionForBlocker(detail.blockers[0]?.code),
            }),
            deepLinkTarget: {
              projectId: project.id,
              stageId: stage.id,
              section: getStageDetailSectionForBlocker(detail.blockers[0]?.code),
            },
          });
        });

      return;
    }

    const queue = getActionQueue(state, project.id) as FundingActionQueueItem[];
    queue
      .filter((item) => canRoleActionGroup(role, item.primaryAction))
      .forEach((item) => {
        const detail = getStageDetail(state, item.stageId);
        items.push({
          id: `queue-${item.id}-${role}`,
          projectId: item.projectId,
          projectName: item.projectName,
          stageId: item.stageId,
          stageName: item.stageName,
          title: getQueueRequestTitle(item.primaryAction.actionType),
          reason: item.primaryAction.detail,
          nextStep: item.operationalStatus.nextStep,
          priority: item.priority,
          ownerLabel: getUserFacingRoleLabel(role),
          attentionReason: detail.attentionReason,
          handoff: detail.roleHandoff,
          exitState: detail.exitState,
          exceptionPath: detail.exceptionPath,
          readinessState: "actionable",
          roleRelevance: "direct",
          decisionCue: getTaskDecisionCue({
            summary: item.primaryAction.detail,
            nextStep: item.operationalStatus.nextStep,
            nextActionLabel: item.primaryAction.title,
            readinessState: "actionable",
            roleRelevance: "direct",
            attentionReason: detail.attentionReason,
            handoff: detail.roleHandoff,
            exitState: detail.exitState,
            exceptionPath: detail.exceptionPath,
            deepLinkSection: getStageDetailSectionForAction(item.primaryAction.actionType),
          }),
          deepLinkTarget: {
            projectId: item.projectId,
            stageId: item.stageId,
            section: getStageDetailSectionForAction(item.primaryAction.actionType),
          },
        });
      });
  });

  return items.sort((left, right) => {
    const priorityDelta = getActionPriorityRank(left.priority) - getActionPriorityRank(right.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    if (left.projectName !== right.projectName) {
      return left.projectName.localeCompare(right.projectName);
    }

    return (left.stageName ?? left.title).localeCompare(right.stageName ?? right.title);
  });
}

function getInboxRequestForUser(
  state: SystemStateRecord,
  requestId: string,
  userId = state.currentUserId,
) {
  const role = getUserRecord(state, userId).role;
  return getRoleInboxItems(state, role).find((item) => item.id === requestId) ?? null;
}

export function getRequestDecisionState(
  state: SystemStateRecord,
  requestId: string,
  userId = state.currentUserId,
) {
  const request = getInboxRequestForUser(state, requestId, userId);
  if (!request?.stageId) return null;

  const actor = getUserRecord(state, userId);
  const detail = getStageDetail(state, request.stageId);
  const section = request.deepLinkTarget?.section ?? "overview";
  const pendingVariation = detail.variations.find((item) => item.status === "pending") ?? null;
  const approvedVariation = detail.variations.find((item) => item.status === "approved") ?? null;
  const openDispute = detail.disputes.find((item) => item.status === "open") ?? null;
  const reviewEvidence = detail.evidence.find((item) => item.record?.status !== "accepted") ?? detail.evidence[0] ?? null;
  const availableApproval = detail.approvals.find((approval) => approval.role === actor.role);

  let primaryActionLabel = "Approve";
  let approveAvailable = false;
  let rejectAvailable = false;
  let requestInfoAvailable = false;
  let noActionReason = "No action available.";

  if (section === "release") {
    primaryActionLabel = "Release payment";
    approveAvailable = detail.actionReadiness.release.isAvailable && detail.releaseDecision.releasable;
    noActionReason = detail.actionDescriptorMap["release"]?.blockerSummary ?? detail.operationalStatus.reason;
  } else if (section === "funding") {
    primaryActionLabel = "Allocate funds";
    approveAvailable = detail.actionReadiness.fundStage.isAvailable && detail.funding.gapToRequiredCover > 0;
    noActionReason = detail.actionDescriptorMap["fund-stage"]?.blockerSummary ?? detail.operationalStatus.reason;
  } else if (section === "approvals" && availableApproval) {
    primaryActionLabel = "Approve";
    approveAvailable = availableApproval.approveAction.confidence !== "blocked";
    rejectAvailable = availableApproval.rejectAction.confidence !== "blocked";
    noActionReason = availableApproval.approveAction.blockerSummary ?? detail.operationalStatus.reason;
  } else if (section === "evidence" && reviewEvidence) {
    primaryActionLabel = "Approve";
    approveAvailable = Boolean(reviewEvidence.actionDescriptors.accepted && reviewEvidence.actionDescriptors.accepted.confidence !== "blocked");
    rejectAvailable = Boolean(reviewEvidence.actionDescriptors.rejected && reviewEvidence.actionDescriptors.rejected.confidence !== "blocked");
    requestInfoAvailable = Boolean(reviewEvidence.actionDescriptors.requires_more && reviewEvidence.actionDescriptors.requires_more.confidence !== "blocked");
    noActionReason = reviewEvidence.actionDescriptors.accepted?.blockerSummary ?? detail.operationalStatus.reason;
  } else if (section === "variation" && (pendingVariation || approvedVariation)) {
    primaryActionLabel = approvedVariation ? "Apply approved variation" : "Approve";
    approveAvailable = approvedVariation
      ? detail.actionReadiness.activateVariation.isAvailable
      : Boolean(pendingVariation?.approveAction && pendingVariation.approveAction.confidence !== "blocked");
    rejectAvailable = Boolean(pendingVariation?.rejectAction && pendingVariation.rejectAction.confidence !== "blocked");
    noActionReason =
      pendingVariation?.approveAction?.blockerSummary ??
      detail.actionDescriptorMap["activate-variation"]?.blockerSummary ??
      detail.operationalStatus.reason;
  } else if (section === "dispute" && openDispute) {
    primaryActionLabel = "Resolve dispute";
    approveAvailable = Boolean(openDispute.resolveAction && openDispute.resolveAction.confidence !== "blocked");
    noActionReason = openDispute.resolveAction?.blockerSummary ?? detail.operationalStatus.reason;
  }

  return {
    request,
    detail,
    section,
    primaryActionLabel,
    approveAvailable,
    rejectAvailable,
    requestInfoAvailable,
    noActionReason,
  };
}

export type CommercialSequenceStepKey =
  | "quote_requested"
  | "quote_received"
  | "quote_decision_required"
  | "funding_required"
  | "funded_and_scheduled"
  | "evidence_required"
  | "approval_required"
  | "payment_ready"
  | "paid";

export interface ProjectStageCurrentStep {
  projectId: string;
  projectName: string;
  stageId: string;
  stageName: string;
  stepKey: CommercialSequenceStepKey;
  stepLabel: string;
  assuranceLine: string;
  supportingSentence: string;
  requestId: string | null;
  requestTitle: string | null;
  ctaLabel: string | null;
  section: StageDetailSectionKey | null;
  sortOrder: number;
}

function getCommercialSequenceStepOrder(stepKey: CommercialSequenceStepKey) {
  switch (stepKey) {
    case "quote_requested":
      return 0;
    case "quote_received":
      return 1;
    case "quote_decision_required":
      return 2;
    case "funding_required":
      return 3;
    case "funded_and_scheduled":
      return 4;
    case "evidence_required":
      return 5;
    case "approval_required":
      return 6;
    case "payment_ready":
      return 7;
    case "paid":
      return 8;
    default:
      return 99;
  }
}

export function getProjectStageCurrentSteps(
  state: SystemStateRecord,
  projectId: string,
  userId = state.currentUserId,
): ProjectStageCurrentStep[] {
  const role = getUserRecord(state, userId).role;
  const project = state.projects.find((entry) => entry.id === projectId);

  if (!project) {
    return [];
  }

  const inbox = getRoleInboxItems(state, role, projectId);

  return state.stages
    .filter((stage) => stage.projectId === projectId)
    .map((stage) => {
      const detail = getStageDetail(state, stage.id, userId);

      let stepKey: CommercialSequenceStepKey;
      let stepLabel: string;
      let assuranceLine: string;
      let supportingSentence: string;
      let preferredSection: StageDetailSectionKey | null = null;

      if (stage.requiredAmount > 0 && stage.releasedAmount >= stage.requiredAmount) {
        stepKey = "paid";
        stepLabel = "Paid";
        assuranceLine = detail.releaseSummary.releasedAmountLabel;
        supportingSentence = "Payment has already been sent for this project stage.";
      } else if (detail.releaseDecision.releasable && detail.releaseDecision.releasableAmount > 0) {
        stepKey = "payment_ready";
        stepLabel = "Payment ready";
        assuranceLine = `${detail.releaseSummary.eligibleAmountLabel} - ${detail.releaseDecision.explanation.label}`;
        supportingSentence = detail.releaseDecision.explanation.reason;
        preferredSection = "release";
      } else if (detail.funding.gapToRequiredCover > 0) {
        stepKey = "funding_required";
        stepLabel = "Funding required";
        assuranceLine = `${detail.fundingExplanation.ringfencedLabel.replace("Ringfenced to this stage: ", "")} of ${detail.fundingExplanation.requiredCoverLabel.replace("Required cover for current WIP: ", "")} required funds secured (30-day coverage)`;
        supportingSentence = detail.sectionGuidance.funding.summary;
        preferredSection = "funding";
      } else if (
        detail.evidenceSummary.evidenceState === "missing" ||
        detail.evidenceSummary.evidenceState === "rejected"
      ) {
        stepKey = "evidence_required";
        stepLabel = "Evidence required";
        assuranceLine = `${detail.evidenceSummary.reviewStatusLabel} - payment blocked`;
        supportingSentence = detail.sectionGuidance.evidence.summary;
        preferredSection = "evidence";
      } else if (detail.approvalState !== "approved") {
        stepKey = "approval_required";
        stepLabel = "Approval required";
        assuranceLine = `${detail.approvalSummary.approvalProgressLabel} - awaiting ${(detail.approvalSummary.nextApproverLabel ?? detail.sectionGuidance.approvals.ownerLabel).toLowerCase()}`;
        supportingSentence = detail.sectionGuidance.approvals.summary;
        preferredSection = "approvals";
      } else {
        stepKey = "funded_and_scheduled";
        stepLabel = "Funded and scheduled";
        assuranceLine =
          detail.fundingExplanation.coverageLabel === "Covered by ringfenced funds"
            ? `${detail.fundingExplanation.coverageLabel} - ${detail.releaseDecision.explanation.label.toLowerCase()}`
            : detail.fundingExplanation.coverageLabel;
        supportingSentence =
          detail.operationalStatus.label === "Ready"
            ? "Funding is in place and the project stage is moving through its governed checks."
            : detail.operationalStatus.reason;
      }

      const matchingRequest =
        inbox.find((item) => item.stageId === stage.id && (preferredSection ? item.deepLinkTarget?.section === preferredSection : true)) ??
        inbox.find((item) => item.stageId === stage.id) ??
        null;

      return {
        projectId,
        projectName: project.name,
        stageId: stage.id,
        stageName: stage.name,
        stepKey,
        stepLabel,
        assuranceLine,
        supportingSentence,
        requestId: matchingRequest?.id ?? null,
        requestTitle: matchingRequest?.title ?? null,
        ctaLabel: matchingRequest ? "Open request" : null,
        section: preferredSection,
        sortOrder: getCommercialSequenceStepOrder(stepKey),
      } satisfies ProjectStageCurrentStep;
    })
    .sort((left, right) => {
      const actionableDelta = Number(Boolean(left.requestId)) - Number(Boolean(right.requestId));
      if (actionableDelta !== 0) {
        return actionableDelta * -1;
      }

      const orderDelta = left.sortOrder - right.sortOrder;
      if (orderDelta !== 0) {
        return orderDelta;
      }

      return left.stageName.localeCompare(right.stageName);
    });
}

export function approveRequest(
  state: SystemStateRecord,
  requestId: string,
  userId = state.currentUserId,
): SystemStateRecord {
  const decisionState = getRequestDecisionState(state, requestId, userId);
  if (!decisionState) return state;

  const { detail, section } = decisionState;
  const actor = getUserRecord(state, userId);

  if (section === "release") return releaseStage(state, detail.stage.id, userId);
  if (section === "funding") return allocateStageFunds(state, detail.stage.id, userId);
  if (section === "approvals" && ["professional", "commercial", "treasury"].includes(actor.role)) {
    return giveApproval(state, detail.stage.id, actor.role as FundingApprovalRole, userId);
  }
  if (section === "evidence") {
    const reviewEvidence = detail.evidence.find((item) => item.record?.status !== "accepted") ?? detail.evidence[0];
    return reviewEvidence ? updateEvidenceStatus(state, reviewEvidence.id, "accepted", { userId }) : state;
  }
  if (section === "variation") {
    const approvedVariation = detail.variations.find((item) => item.status === "approved");
    if (approvedVariation) return activateVariation(state, detail.stage.id, approvedVariation.id, userId);
    const pendingVariation = detail.variations.find((item) => item.status === "pending");
    return pendingVariation ? reviewVariation(state, detail.stage.id, pendingVariation.id, "approved", { userId }) : state;
  }
  if (section === "dispute") {
    const openDispute = detail.disputes.find((item) => item.status === "open");
    return openDispute ? resolveDispute(state, detail.stage.id, openDispute.id, userId) : state;
  }

  return state;
}

export function rejectRequest(
  state: SystemStateRecord,
  requestId: string,
  reason: string,
  userId = state.currentUserId,
): SystemStateRecord {
  const decisionState = getRequestDecisionState(state, requestId, userId);
  if (!decisionState || !reason.trim()) return state;

  const { detail, section } = decisionState;
  const actor = getUserRecord(state, userId);

  if (section === "approvals" && ["professional", "commercial", "treasury"].includes(actor.role)) {
    return rejectApproval(state, detail.stage.id, actor.role as FundingApprovalRole, reason.trim(), userId);
  }
  if (section === "evidence") {
    const reviewEvidence = detail.evidence.find((item) => item.record?.status !== "accepted") ?? detail.evidence[0];
    return reviewEvidence ? updateEvidenceStatus(state, reviewEvidence.id, "rejected", { userId, reason: reason.trim() }) : state;
  }
  if (section === "variation") {
    const pendingVariation = detail.variations.find((item) => item.status === "pending");
    return pendingVariation ? reviewVariation(state, detail.stage.id, pendingVariation.id, "rejected", { userId, reason: reason.trim() }) : state;
  }

  return state;
}

export function requestInfo(
  state: SystemStateRecord,
  requestId: string,
  message: string,
  userId = state.currentUserId,
): SystemStateRecord {
  const decisionState = getRequestDecisionState(state, requestId, userId);
  if (!decisionState || !message.trim()) return state;

  const { detail, section } = decisionState;
  if (section !== "evidence") return state;

  const reviewEvidence = detail.evidence.find((item) => item.record?.status !== "accepted") ?? detail.evidence[0];
  return reviewEvidence ? updateEvidenceStatus(state, reviewEvidence.id, "requires_more", { userId, reason: message.trim() }) : state;
}

export function getResponsibilityCue(actionableBy: FundingActionGroup["actionableBy"], actionType: QueueActionType) {
  if (actionableBy === "treasury" || actionType === "fund_stage" || actionType === "release_funding" || actionType === "activate_variation") {
    return "Funder";
  }

  if (actionType === "review_evidence") {
    return "Evidence";
  }

  if (actionableBy === "commercial" || actionType === "review_dispute" || actionType === "review_variation") {
    return "Commercial";
  }

  return "Ops";
}

export function getBlockerResponsibilityCue(blockerCode: StageBlocker["code"]) {
  if (blockerCode === "funding") return "Funder";
  if (blockerCode === "disputed" || blockerCode === "variation" || blockerCode === "approvals") return "Commercial";
  if (blockerCode === "evidence") return "Evidence";
  return "Ops";
}

export function getDashboardSummaryStrip(state: SystemStateRecord, projectId?: string): DashboardSummaryStrip {
  const decisions = getReleaseDecisions(state, projectId);

  return decisions.reduce(
    (summary, decision) => {
      if (decision.explanation.label === "Can release") {
        summary.releaseReadyPackages += 1;
      }

      if (decision.explanation.label === "Partially blocked") {
        summary.partiallyBlockedPackages += 1;
      }

      if (decision.explanation.label === "Cannot release") {
        summary.blockedPackages += 1;
      }

      summary.frozenValue += decision.frozenAmount;
      summary.releasableNow += decision.releasableAmount;

      if (decision.treasuryReadiness.label === "Funder ready") {
        summary.treasuryReadyPackages += 1;
      } else if (decision.treasuryReadiness.label === "Funder review required") {
        summary.treasuryReviewRequiredPackages += 1;
      } else {
        summary.treasuryBlockedPackages += 1;
      }

      return summary;
    },
    {
      releaseReadyPackages: 0,
      partiallyBlockedPackages: 0,
      blockedPackages: 0,
      frozenValue: 0,
      releasableNow: 0,
      treasuryReadyPackages: 0,
      treasuryReviewRequiredPackages: 0,
      treasuryBlockedPackages: 0,
    } satisfies DashboardSummaryStrip,
  );
}

function eventBelongsToProject(state: SystemStateRecord, event: SystemEventRecord, projectId: string) {
  const eventProjectId = typeof event.details?.projectId === "string"
    ? event.details.projectId
    : event.stageId
      ? state.stages.find((stage) => stage.id === event.stageId)?.projectId
      : undefined;

  return eventProjectId === projectId;
}

function mapActivityEventView(state: SystemStateRecord, event: SystemEventRecord): ActivityEventView {
  return {
    ...event,
    stageName: event.stageId ? state.stages.find((stage) => stage.id === event.stageId)?.name : undefined,
  };
}

function formatTimelineTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getTimelineChangeType(event: ActivityEventView): StageTimelineEntry["changeType"] {
  if (event.eventType === "funding") return "funding";
  if (event.eventType === "approval") return "approval";
  if (event.eventType === "evidence") return "evidence";
  if (event.eventType === "dispute") return "dispute";
  if (event.eventType === "variation") return "variation";
  if (event.eventType === "release") return "release";
  return "audit";
}

function getTimelineEffect(event: ActivityEventView): StageTimelineEntry["effect"] {
  if (event.eventType === "approval") {
    const decision = event.details?.decision;
    return decision === "approved" ? "progressed" : decision === "rejected" ? "blocked" : "updated";
  }

  if (event.eventType === "evidence") {
    const status = event.details?.status;
    return status === "accepted"
      ? "progressed"
      : status === "rejected" || status === "requires_more"
        ? "blocked"
        : "updated";
  }

  if (event.eventType === "funding") {
    return event.summary.includes("allocated") ? "progressed" : "updated";
  }

  if (event.eventType === "dispute") {
    return event.summary.includes("resolved") ? "progressed" : "blocked";
  }

  if (event.eventType === "variation") {
    if (event.summary.includes("activated") || event.summary.includes("approved")) return "progressed";
    if (event.summary.includes("rejected")) return "blocked";
    return "paused";
  }

  if (event.eventType === "release") {
    return "progressed";
  }

  return "updated";
}

function getTimelineTone(effect: StageTimelineEntry["effect"]): StageTimelineEntry["tone"] {
  if (effect === "progressed") return "success";
  if (effect === "blocked") return "warning";
  if (effect === "paused") return "info";
  return "neutral";
}

function getTimelineDetail(event: ActivityEventView): string | null {
  if (event.eventType === "funding") {
    const amount = typeof event.details?.amount === "number" ? dashboardCurrency.format(Number(event.details.amount)) : null;
    return amount ? `${amount} moved through stage funding controls.` : "Funding position updated.";
  }

  if (event.eventType === "approval") {
    const role = typeof event.details?.role === "string" ? getUserFacingRoleLabel(event.details.role as FundingUserRole) : null;
    const decision = typeof event.details?.decision === "string" ? event.details.decision.replaceAll("_", " ") : null;
    return role && decision ? `${role} decision recorded as ${decision}.` : "Approval state updated.";
  }

  if (event.eventType === "evidence") {
    const status = typeof event.details?.status === "string" ? event.details.status.replaceAll("_", " ") : null;
    return status ? `Evidence review is now ${status}.` : "Evidence record updated.";
  }

  if (event.eventType === "dispute") {
    const amount = typeof event.details?.amount === "number" ? dashboardCurrency.format(Number(event.details.amount)) : null;
    return amount
      ? event.summary.includes("resolved")
        ? `${amount} is no longer frozen by dispute.`
        : `${amount} is now frozen pending dispute resolution.`
      : "Dispute position updated.";
  }

  if (event.eventType === "variation") {
    if (event.summary.includes("activated")) return "Approved change is now live in this stage.";
    if (event.summary.includes("approved")) return "Variation cleared review and can move toward activation.";
    if (event.summary.includes("rejected")) return "Variation will not change the current stage scope.";
    return "Variation is under governed review.";
  }

  if (event.eventType === "release") {
    const amount = typeof event.details?.amount === "number" ? dashboardCurrency.format(Number(event.details.amount)) : null;
    if (event.details?.override) return "Funder override is now part of the payment basis.";
    return amount ? `${amount} moved out of trust against this stage.` : "Release control state updated.";
  }

  return null;
}

export function getStageTimeline(state: SystemStateRecord, stageId: string, limit = 6): StageTimelineEntry[] {
  return getRecentStageEvents(state, stageId, limit).map((event) => {
    const effect = getTimelineEffect(event);
    return {
      id: event.id,
      timestampLabel: formatTimelineTimestamp(event.timestamp),
      headline: event.summary,
      detail: getTimelineDetail(event),
      actorLabel: event.actor ? getUserFacingRoleLabel(event.actor) : null,
      changeType: getTimelineChangeType(event),
      effect,
      tone: getTimelineTone(effect),
    };
  });
}

export function getRecentStageEvents(state: SystemStateRecord, stageId: string, limit = 5): ActivityEventView[] {
  return sortEventsNewestFirst((state.eventHistory ?? []).filter((event) => event.stageId === stageId))
    .slice(0, limit)
    .map((event) => mapActivityEventView(state, event));
}

export function getRecentProjectEvents(state: SystemStateRecord, projectId: string, limit = 5): ActivityEventView[] {
  return sortEventsNewestFirst((state.eventHistory ?? []).filter((event) => eventBelongsToProject(state, event, projectId)))
    .slice(0, limit)
    .map((event) => mapActivityEventView(state, event));
}

export function getStageLastUpdatedAt(state: SystemStateRecord, stageId: string) {
  return getRecentStageEvents(state, stageId, 1)[0]?.timestamp ?? null;
}

export function getStageLastDecisionAt(state: SystemStateRecord, stageId: string) {
  return getRecentStageEvents(state, stageId, 20)
    .find((event) => ["approval", "dispute", "variation", "release"].includes(event.eventType))?.timestamp ?? null;
}

export function getStageActivityCue(state: SystemStateRecord, stageId: string): ActivityCue | null {
  const latestEvent = getRecentStageEvents(state, stageId, 1)[0];

  if (!latestEvent) {
    return null;
  }

  const eventAgeMs = Date.now() - new Date(latestEvent.timestamp).getTime();
  if (eventAgeMs > 36 * 60 * 60 * 1000) {
    return null;
  }

  const releaseDecision = getReleaseDecisions(state).find((decision) => decision.stageId === stageId);
  const blockers = getStageBlockers(state, stageId);

  if (latestEvent.eventType === "dispute" && blockers.length > 0) {
    return { label: "New blocker", tone: "warning" };
  }

  if (releaseDecision?.releasable && ["approval", "evidence", "funding"].includes(latestEvent.eventType)) {
    return { label: "Ready now", tone: "positive" };
  }

  return { label: "Updated", tone: "neutral" };
}

export function getProjectActivitySummary(state: SystemStateRecord, projectId: string): ProjectActivitySummary {
  const recentEvents = getRecentProjectEvents(state, projectId, 5);
  return {
    recentEvents,
    lastActivityAt: recentEvents[0]?.timestamp ?? null,
  };
}

export function getProjectWorkspaceSummary(state: SystemStateRecord, projectId: string): ProjectWorkspaceSummary {
  const project = getProjectRecord(state, projectId);
  const summaryStrip = getDashboardSummaryStrip(state, projectId);
  const releaseDecisions = getReleaseDecisions(state, projectId);
  const fundingSummary = getFundingSummary(state, projectId);
  const projectActivity = getProjectActivitySummary(state, projectId);
  const blockedByApprovals = releaseDecisions.some(
    (decision) =>
      decision.explanation.label === "Cannot release" &&
      decision.explanation.reason === "Approval incomplete.",
  );

  let postureLabel: ProjectWorkspaceSummary["postureLabel"] = "Payment ready";
  let postureReason = "Approved value is available to pay with no dominant blocker.";

  if (fundingSummary.frozenFunds > 0 || summaryStrip.treasuryBlockedPackages > 0) {
    postureLabel = "On hold / funder constrained";
    postureReason =
      releaseDecisions.find((decision) => decision.frozenAmount > 0)?.explanation.reason ??
      "On-hold value or funder blockers are constraining payment.";
  } else if (blockedByApprovals || summaryStrip.blockedPackages > summaryStrip.releaseReadyPackages) {
    postureLabel = "Waiting on sign-off";
    postureReason =
      releaseDecisions.find((decision) => decision.explanation.reason === "Approval incomplete.")?.explanation.reason ??
      "Sign-off remains the principal gate before payment can progress.";
  }

  return {
    projectId,
    projectName: project.name,
    postureLabel,
    postureReason,
    releaseReadyCount: summaryStrip.releaseReadyPackages,
    blockedCount: summaryStrip.blockedPackages,
    releasableNow: summaryStrip.releasableNow,
    frozenValue: summaryStrip.frozenValue,
    lastActivityAt: projectActivity.lastActivityAt,
  };
}

export function getDashboardDecisionSnapshot(state: SystemStateRecord, projectId: string): DashboardDecisionSnapshot {
  const fundingSummary = getFundingSummary(state, projectId);
  const summaryStrip = getDashboardSummaryStrip(state, projectId);
  const releaseDecisions = getReleaseDecisions(state, projectId);
  const keyDecisionBasis =
    releaseDecisions.find((decision) => decision.explanation.label === "Cannot release")?.explanation.decisionBasis ??
    releaseDecisions.find((decision) => decision.explanation.label === "Partially blocked")?.explanation.decisionBasis ??
    releaseDecisions[0]?.explanation.decisionBasis ??
    "Based on current release controls.";

  return {
    balance: fundingSummary.projectBalance,
    wip: fundingSummary.wipTotal,
    frozen: fundingSummary.frozenFunds,
    releasable: fundingSummary.releasableFunds,
    inProgress: fundingSummary.inProgressFunds,
    surplus: fundingSummary.surplusCash,
    shortfall: fundingSummary.shortfall,
    releaseReadyCount: summaryStrip.releaseReadyPackages,
    blockedCount: summaryStrip.blockedPackages,
    keyDecisionBasis,
  };
}

export function getDashboardDecisionPack(state: SystemStateRecord, projectId: string): DashboardDecisionPack {
  const snapshot = getDashboardDecisionSnapshot(state, projectId);
  const summaryStrip = getDashboardSummaryStrip(state, projectId);
  const releaseDecisions = getReleaseDecisions(state, projectId);
  const fundingSummary = getFundingSummary(state, projectId);
  const projectActivity = getProjectActivitySummary(state, projectId);
  const topBlockedDecision = releaseDecisions.find((decision) => decision.explanation.label === "Cannot release");
  const topPartialDecision = releaseDecisions.find((decision) => decision.explanation.label === "Partially blocked");
  const topReadyDecision = releaseDecisions.find((decision) => decision.explanation.label === "Can release");

  const releasePostureLine =
    summaryStrip.releaseReadyPackages > 0
      ? `${summaryStrip.releaseReadyPackages} project stage${summaryStrip.releaseReadyPackages === 1 ? "" : "s"} are ready to pay with ${summaryStrip.partiallyBlockedPackages} partly blocked and ${summaryStrip.blockedPackages} blocked.`
      : `${summaryStrip.blockedPackages} project stage${summaryStrip.blockedPackages === 1 ? "" : "s"} remain blocked with no project stage currently ready to pay.`;

  const blockerThemeLine = topBlockedDecision
    ? `Principal blocker theme: ${topBlockedDecision.explanation.reason}`
    : topPartialDecision
      ? `Principal blocker theme: ${topPartialDecision.explanation.reason}`
      : "Principal blocker theme: No material blocker currently leads the position.";

  const treasuryConfidenceLine =
    summaryStrip.treasuryBlockedPackages > 0
      ? `${summaryStrip.treasuryBlockedPackages} project stage${summaryStrip.treasuryBlockedPackages === 1 ? "" : "s"} are funder blocked; confidence is constrained by current blockers.`
      : summaryStrip.treasuryReviewRequiredPackages > 0
        ? `${summaryStrip.treasuryReviewRequiredPackages} project stage${summaryStrip.treasuryReviewRequiredPackages === 1 ? "" : "s"} require funder review; checks are progressing but not fully clear.`
        : "Funder confidence is high; current payment decisions are supported by sign-off, supporting information acceptance, and approved value within WIP.";

  const disputeExposureLine =
    fundingSummary.frozenFunds > 0
      ? `Dispute exposure stands at ${fundingSummary.frozenFunds.toLocaleString("en-GB", {
          style: "currency",
          currency: "GBP",
          maximumFractionDigits: 0,
        })}, with undisputed value continuing through controls where permitted.`
      : "Dispute exposure is currently nil across the active project stage set.";

  const latestMaterialActivityLine = projectActivity.recentEvents[0]
    ? `Latest material activity: ${projectActivity.recentEvents[0].summary}`
    : "Latest material activity: No recent change recorded.";

  return {
    fundingPositionLine: getFundingSummarySentence(fundingSummary),
    releasePostureLine,
    blockerThemeLine,
    treasuryConfidenceLine,
    disputeExposureLine,
    latestMaterialActivityLine,
    keyDecisionBasis: topBlockedDecision?.explanation.decisionBasis ?? topReadyDecision?.explanation.decisionBasis ?? snapshot.keyDecisionBasis,
  };
}

export function getStageDecisionPack(detail: StageDetailModel): StageDecisionPack {
  return {
    status: detail.operationalStatus.label,
    treasuryReadiness: detail.treasuryReadiness.label,
    releaseStatus: detail.releaseDecision.explanation.label,
    releasable: detail.releaseDecision.releasableAmount,
    frozen: detail.releaseDecision.frozenAmount,
    inProgress: detail.releaseDecision.blockedAmount,
    principalBlocker: detail.blockers[0]?.label ?? "No active blocker.",
    nextActionOwner:
      detail.blockers[0] !== undefined
        ? getBlockerResponsibilityCue(detail.blockers[0].code)
        : "Funder",
    decisionBasis: detail.releaseDecision.explanation.decisionBasis,
    latestActivity: detail.recentEvents[0]?.summary ?? "No recent activity recorded.",
  };
}

function formatStateLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getNextActionOwner(detail: StageDetailModel) {
  const orderedSections: StageDetailSectionKey[] = ["funding", "evidence", "approvals", "dispute", "variation", "release"];
  const activeGuidance = orderedSections
    .map((section) => detail.sectionGuidance[section])
    .find((guidance) => guidance.state === "act_now" || guidance.state === "waiting" || guidance.state === "blocked");

  return activeGuidance?.ownerLabel ?? "No further action owner";
}

function getStageDecisionSummary(detail: Pick<
  StageDetailModel,
  "operationalStatus" | "releaseDecision" | "blockers" | "sectionGuidance"
>): StageDecisionSummary {
  const orderedSections: StageDetailSectionKey[] = ["funding", "evidence", "approvals", "dispute", "variation", "release"];
  const activeGuidance = orderedSections
    .map((section) => detail.sectionGuidance[section])
    .find((guidance) => guidance.state === "act_now" || guidance.state === "waiting" || guidance.state === "blocked");
  const queuedGuidance = orderedSections
    .map((section) => detail.sectionGuidance[section])
    .find((guidance) => guidance.ownerLabel !== activeGuidance?.ownerLabel && (guidance.state === "act_now" || guidance.state === "waiting"));

  const actionabilityLabel =
    activeGuidance?.state === "act_now"
      ? "Actionable now"
      : activeGuidance?.state === "waiting"
        ? `Waiting on ${activeGuidance.ownerLabel}`
        : activeGuidance?.state === "blocked"
          ? "Blocked by prerequisite"
          : detail.releaseDecision.releasableAmount > 0
            ? "Actionable now"
            : "No immediate action";

  const primaryDecisionLabel =
    activeGuidance?.recommendedAction ??
    (detail.releaseDecision.releasableAmount > 0 ? detail.releaseDecision.explanation.label : null);

  const currentOwnerLabel =
    activeGuidance?.ownerLabel ??
    (detail.releaseDecision.releasableAmount > 0 ? "Funder" : null);

  const nextOwnerLabel =
    queuedGuidance?.ownerLabel ??
    (detail.releaseDecision.releasableAmount > 0 ? "Funder" : currentOwnerLabel);

  const releaseReadinessLabel =
    detail.releaseDecision.releasableAmount > 0
      ? detail.releaseDecision.frozenAmount > 0
        ? "Partially releasable"
        : "Ready to pay"
      : detail.releaseDecision.explanation.label === "Cannot release"
        ? "Not yet eligible"
        : "Pending";

  const tone: StageDecisionSummary["tone"] =
    detail.releaseDecision.releasableAmount > 0
      ? "success"
      : activeGuidance?.state === "act_now"
        ? "info"
        : activeGuidance?.state === "waiting" || activeGuidance?.state === "blocked" || detail.blockers.length > 0
          ? "warning"
          : "neutral";

  return {
    statusLabel: detail.operationalStatus.label,
    actionabilityLabel,
    primaryDecisionLabel,
    currentOwnerLabel,
    nextOwnerLabel,
    blockerSummary: detail.blockers.map((blocker) => blocker.label),
    releaseReadinessLabel,
    tone,
  };
}

function getStageRoleHandoff(detail: Pick<
  StageDetailModel,
  "actingRole" | "sectionGuidance" | "decisionSummary" | "attentionReason" | "blockers" | "operationalStatus" | "releaseDecision"
>): StageRoleHandoff {
  const orderedSections: StageDetailSectionKey[] = ["funding", "evidence", "approvals", "dispute", "variation", "release"];
  const activeWaitingGuidance = orderedSections
    .map((section) => detail.sectionGuidance[section])
    .find((guidance) => guidance.state === "waiting");
  const queuedGuidance = orderedSections
    .map((section) => detail.sectionGuidance[section])
    .find((guidance) => guidance.key !== activeWaitingGuidance?.key && (guidance.state === "act_now" || guidance.state === "waiting"));

  if (!activeWaitingGuidance) {
    return {
      isWaitingOnAnotherRole: false,
      fromRoleLabel: null,
      toRoleLabel: null,
      handoffHeadline: "No active handoff",
      handoffReasonLabel: detail.attentionReason.reasonLabel,
      expectedActionLabel: null,
      unlockOutcomeLabel: null,
      blockingConditionLabel: detail.blockers[0]?.label ?? null,
      tone: "neutral",
    };
  }

  const toRoleLabel = activeWaitingGuidance.ownerLabel ?? detail.decisionSummary.nextOwnerLabel;
  const fromRoleLabel = detail.actingRole.label !== toRoleLabel ? detail.actingRole.label : detail.decisionSummary.currentOwnerLabel;
  const unlockOutcomeLabel =
    queuedGuidance?.summary ??
    (detail.releaseDecision.releasableAmount > 0
      ? "This will unlock the release decision."
      : detail.operationalStatus.nextStep);

  return {
    isWaitingOnAnotherRole: true,
    fromRoleLabel,
    toRoleLabel,
    handoffHeadline: `Waiting on ${toRoleLabel ?? "next owner"}`,
    handoffReasonLabel: activeWaitingGuidance.summary,
    expectedActionLabel: activeWaitingGuidance.recommendedAction,
    unlockOutcomeLabel,
    blockingConditionLabel: detail.blockers[0]?.label ?? null,
    tone: detail.blockers.length > 0 ? "warning" : "info",
  };
}

function getStageExitState(detail: Pick<
  StageDetailModel,
  "stage" | "operationalStatus" | "releaseDecision" | "disputeSummary" | "variationSummary" | "blockers" | "decisionSummary"
>): StageExitState {
  const fullyReleased = detail.stage.releasedAmount >= detail.stage.requiredAmount && detail.stage.requiredAmount > 0;
  const frozenOnly =
    detail.disputeSummary.frozenValue > 0 &&
    detail.releaseDecision.releasableAmount === 0 &&
    detail.releaseDecision.blockedAmount === 0;
  const cleanComplete =
    !fullyReleased &&
    detail.releaseDecision.releasableAmount === 0 &&
    detail.releaseDecision.blockedAmount === 0 &&
    detail.disputeSummary.frozenValue === 0 &&
    detail.blockers.length === 0;
  const supersededByVariation =
    !fullyReleased &&
    detail.variationSummary.status === "Approved variation" &&
    detail.releaseDecision.releasableAmount === 0 &&
    detail.releaseDecision.blockedAmount === 0 &&
    detail.blockers.length === 0;

  const exitState: StageExitState["exitState"] =
    fullyReleased
      ? detail.variationSummary.status === "Approved variation" ? "varied" : "released"
      : frozenOnly
        ? detail.disputeSummary.status === "Blocked by dispute" ? "in_dispute" : "withheld"
        : supersededByVariation
          ? "superseded"
          : cleanComplete
            ? "complete"
            : "still_active";

  const isClosedOrComplete = exitState !== "still_active";
  const releasedValue = dashboardCurrency.format(detail.stage.releasedAmount);
  const requiredValue = dashboardCurrency.format(detail.stage.requiredAmount);
  const frozenValue = dashboardCurrency.format(detail.disputeSummary.frozenValue);

  const outcomeLabel =
    exitState === "released"
      ? "Paid under current controls"
      : exitState === "varied"
        ? "Paid after agreed variation"
        : exitState === "complete"
          ? "No further action required"
          : exitState === "withheld"
            ? "Value withheld from payment"
            : exitState === "in_dispute"
              ? "On hold in dispute"
              : exitState === "superseded"
                ? "Superseded by variation review"
                : "Still active";

  const finalActionLabel =
    exitState === "released" || exitState === "varied"
      ? "Payment sent"
      : exitState === "withheld" || exitState === "in_dispute"
        ? "Dispute hold applied"
        : exitState === "superseded"
          ? "Variation moved this project stage out of the normal payment path"
          : exitState === "complete"
            ? "No additional action required"
            : null;

  const valueOutcomeLabel =
    exitState === "released" || exitState === "varied"
      ? `${releasedValue} released against ${requiredValue} required value.`
      : exitState === "withheld" || exitState === "in_dispute"
        ? `${frozenValue} remains withheld from release.`
        : exitState === "complete"
          ? `${releasedValue} released with no remaining payable value in active progression.`
          : exitState === "superseded"
            ? "Current value position is being carried through governed variation handling."
            : null;

  const remainingExposureLabel =
    exitState === "withheld" || exitState === "in_dispute"
      ? `${frozenValue} remains exposed through dispute.`
      : detail.releaseDecision.blockedAmount > 0
        ? `${dashboardCurrency.format(detail.releaseDecision.blockedAmount)} remains in progress outside current release.`
        : null;

  const reopenPathLabel =
    exitState === "released" || exitState === "varied" || exitState === "complete"
      ? "Can reopen only through a governed dispute, variation, or funder review path."
      : exitState === "withheld" || exitState === "in_dispute"
        ? "Can progress again once the dispute is resolved or an approved exception changes the hold."
        : exitState === "superseded"
          ? "Can return to active progression if the variation path is reversed or changed under governance."
          : null;

  return {
    isClosedOrComplete,
    exitState,
    headline:
      exitState === "released"
        ? "This stage has reached its released outcome."
        : exitState === "varied"
          ? "This stage has reached a governed release outcome through variation."
          : exitState === "complete"
            ? "This stage no longer needs active governed progression."
            : exitState === "withheld"
              ? "This stage is no longer progressing because value is being withheld."
              : exitState === "in_dispute"
                ? "This stage is currently held in dispute rather than active progression."
                : exitState === "superseded"
                  ? "This stage has moved out of normal progression into variation handling."
                  : detail.operationalStatus.reason,
    outcomeLabel,
    finalActionLabel,
    valueOutcomeLabel,
    remainingExposureLabel,
    reopenPathLabel,
    supportingLines: [
      detail.releaseDecision.explanation.reason,
      detail.variationSummary.status !== "No variation" ? detail.variationSummary.reason : null,
      detail.disputeSummary.status !== "No dispute" ? detail.disputeSummary.reason : null,
    ].filter((line): line is string => Boolean(line)),
    tone:
      exitState === "released" || exitState === "varied" || exitState === "complete"
        ? "success"
        : exitState === "withheld" || exitState === "in_dispute" || exitState === "superseded"
          ? "warning"
          : "neutral",
  };
}

function getStageExceptionPath(detail: Pick<
  StageDetailModel,
  "stage" | "releaseDecision" | "disputeSummary" | "variationSummary" | "blockers" | "roleHandoff" | "decisionSummary" | "operationalStatus"
>): StageExceptionPath {
  const hasOverride = Boolean(detail.stage.override?.active) || detail.releaseDecision.overridden;
  const hasDisputeException = detail.disputeSummary.status !== "No dispute";
  const hasVariationException = detail.variationSummary.status !== "No variation";
  const hasWithheldRelease =
    detail.releaseDecision.explanation.label === "Cannot release" &&
    detail.releaseDecision.releasableAmount > 0 &&
    !detail.releaseDecision.overridden;

  const exceptionType: StageExceptionPath["exceptionType"] =
    hasOverride
      ? "override"
      : hasDisputeException
        ? "dispute"
        : hasVariationException
          ? "variation"
          : hasWithheldRelease
            ? "withheld_release"
            : detail.blockers.length > 0 && detail.decisionSummary.actionabilityLabel.includes("Waiting")
              ? "other"
              : "other";

  const hasActiveExceptionPath =
    hasOverride ||
    hasDisputeException ||
    hasVariationException ||
    hasWithheldRelease;

  if (!hasActiveExceptionPath) {
    return {
      hasActiveExceptionPath: false,
      exceptionType: "other",
      headline: "No active review path",
      exceptionReasonLabel: detail.operationalStatus.reason,
      normalPathPausedLabel: null,
      ownerLabel: null,
      requiredDecisionLabel: null,
      returnPathLabel: null,
      outcomeRiskLabel: null,
      supportingLines: [],
      tone: "neutral",
    };
  }

  return {
    hasActiveExceptionPath: true,
    exceptionType,
    headline:
      exceptionType === "override"
        ? "Funder override is active"
        : exceptionType === "dispute"
          ? "Dispute handling has replaced the normal payment path"
          : exceptionType === "variation"
            ? "Variation handling has moved this project stage under review"
            : exceptionType === "withheld_release"
              ? "Payment is being withheld under review"
              : "A governed review path is active",
    exceptionReasonLabel:
      exceptionType === "override"
        ? detail.stage.override?.reason ?? detail.releaseDecision.explanation.reason
        : exceptionType === "dispute"
          ? detail.disputeSummary.reason
          : exceptionType === "variation"
            ? detail.variationSummary.reason
            : detail.releaseDecision.explanation.reason,
    normalPathPausedLabel:
      exceptionType === "override"
        ? "The normal blocked payment path is being bypassed under funder override."
        : exceptionType === "dispute"
          ? "The normal payment path is paused while disputed value remains on hold."
        : exceptionType === "variation"
            ? "The normal project stage path is paused until the variation review completes."
            : "The normal payment path is paused pending a review decision.",
    ownerLabel:
      exceptionType === "override"
        ? "Funder"
        : exceptionType === "dispute"
          ? detail.roleHandoff.toRoleLabel ?? "Commercial"
          : exceptionType === "variation"
            ? detail.roleHandoff.toRoleLabel ?? (detail.variationSummary.status === "Approved variation" ? "Funder" : "Commercial")
            : detail.roleHandoff.toRoleLabel ?? detail.decisionSummary.nextOwnerLabel,
    requiredDecisionLabel:
      exceptionType === "override"
        ? "Review or honour the recorded funder override decision."
        : exceptionType === "dispute"
          ? "Resolve the dispute or confirm the held position."
          : exceptionType === "variation"
            ? detail.variationSummary.status === "Approved variation"
              ? "Activate the approved variation or amend the review path."
              : "Review and decide the variation."
            : "Decide whether payment should remain withheld or return to the normal path.",
    returnPathLabel:
      exceptionType === "override"
        ? "Remove reliance on override by clearing the underlying blockers."
        : exceptionType === "dispute"
          ? "Resolve the dispute so undisputed value can return to the governed release path."
          : exceptionType === "variation"
            ? "Complete the variation path so the stage can return to governed forward progression."
            : "Clear the withholding condition so the normal release path can resume.",
    outcomeRiskLabel:
      exceptionType === "override"
        ? "Payment is proceeding under an exceptional approval."
        : exceptionType === "dispute"
          ? `${dashboardCurrency.format(detail.disputeSummary.frozenValue)} remains exposed through the dispute path.`
          : exceptionType === "variation"
            ? "Scope, value, or sequence may change before the normal payment path resumes."
            : "Approved value exists, but payment remains withheld until the review decision clears.",
    supportingLines: [
      detail.releaseDecision.explanation.decisionBasis,
      exceptionType === "override" ? `Override blockers: ${(detail.stage.override?.overriddenBlockers ?? detail.blockers.map((blocker) => blocker.label)).join(", ")}` : null,
      exceptionType === "dispute" ? `On-hold value ${dashboardCurrency.format(detail.disputeSummary.frozenValue)}; ready-to-pay value ${dashboardCurrency.format(detail.disputeSummary.releasableValue)}.` : null,
      exceptionType === "variation" ? detail.variationSummary.status : null,
    ].filter((line): line is string => Boolean(line)),
    tone: "warning",
  };
}

function getStageReleaseDecisionSummary(detail: Pick<
  StageDetailModel,
  "stage" | "releaseDecision" | "fundingExplanation" | "blockers" | "exceptionPath"
>): StageReleaseDecisionSummary {
  const releasedAmount = detail.stage.releasedAmount;
  const fullyReleased = releasedAmount >= detail.stage.requiredAmount && detail.stage.requiredAmount > 0;
  const hasHeldValue = detail.releaseDecision.frozenAmount > 0 || detail.releaseDecision.blockedAmount > 0;
  const releaseState: StageReleaseDecisionSummary["releaseState"] =
    fullyReleased
      ? "released"
      : detail.releaseDecision.releasable && detail.releaseDecision.frozenAmount > 0
        ? "partially_eligible"
        : detail.releaseDecision.releasable
          ? "eligible"
          : detail.releaseDecision.releasableAmount > 0
            ? "withheld"
            : detail.blockers.length > 0
              ? "blocked"
              : "not_ready";

  const heldAmount = detail.releaseDecision.frozenAmount + detail.releaseDecision.blockedAmount;

  return {
    isReleaseEligible: detail.releaseDecision.releasable,
    releaseState,
    headline:
      releaseState === "released"
        ? "Payment has already been sent for the current eligible value."
        : releaseState === "eligible"
          ? "Payment can be sent now under the normal governed path."
          : releaseState === "partially_eligible"
            ? "Part of the payment can proceed while some value remains on hold."
            : releaseState === "withheld"
              ? "Payment is being withheld even though approved value is present."
              : releaseState === "blocked"
                ? "Payment is currently blocked by a control condition."
                : "Payment is not yet ready because no value is currently eligible.",
    eligibleAmountLabel: `Ready to pay now: ${dashboardCurrency.format(detail.releaseDecision.releasableAmount)}`,
    releasedAmountLabel: `Paid to date: ${dashboardCurrency.format(releasedAmount)}`,
    remainingHeldLabel: `Still on hold: ${dashboardCurrency.format(heldAmount)}`,
    decisionLabel: detail.releaseDecision.explanation.label,
    blockingConditionLabel:
      releaseState === "withheld" || releaseState === "blocked" || releaseState === "not_ready"
        ? detail.releaseDecision.explanation.reason
        : null,
    exceptionInteractionLabel:
      detail.exceptionPath.hasActiveExceptionPath
        ? detail.exceptionPath.headline
        : detail.releaseDecision.overridden
          ? "Funder override is influencing this payment decision."
          : null,
    nextReleaseStepLabel:
      releaseState === "released"
        ? "No further payment decision is currently required."
        : releaseState === "eligible" || releaseState === "partially_eligible"
          ? "Funder can send the current payment."
          : detail.exceptionPath.hasActiveExceptionPath
            ? detail.exceptionPath.requiredDecisionLabel
            : detail.fundingExplanation.nextFinancialStepLabel ?? "Clear the blocking condition before payment can proceed.",
    supportingLines: [
      detail.releaseDecision.explanation.decisionBasis,
      detail.releaseDecision.overridden ? "This decision is proceeding through a governed funder override." : null,
      detail.releaseDecision.isPartialRelease
        ? `${dashboardCurrency.format(detail.releaseDecision.frozenAmount)} remains on hold while the eligible portion can progress.`
        : null,
    ].filter((line): line is string => Boolean(line)),
    tone:
      releaseState === "released" || releaseState === "eligible"
        ? "success"
        : releaseState === "partially_eligible" || releaseState === "not_ready"
          ? "info"
          : "warning",
  };
}

function getStageEvidenceSummary(detail: {
  evidence: Array<
    EvidenceRequirementRecord & {
      record: EvidenceRecord | null;
    }
  >;
  evidenceState: DerivedEvidenceState;
  sectionGuidance: Record<StageDetailSectionKey, StageSectionGuidance>;
  actionReadiness: StageDetailModel["actionReadiness"];
  blockers: StageBlocker[];
}): StageEvidenceSummary {
  const requiredEvidence = detail.evidence.filter((item) => item.required);
  const requiredCount = requiredEvidence.length;
  const acceptedCount = requiredEvidence.filter((item) => item.record?.status === "accepted").length;
  const rejectedCount = requiredEvidence.filter((item) => item.record?.status === "rejected" || item.record?.status === "requires_more").length;
  const pendingCount = requiredEvidence.filter((item) => item.record?.status === "pending").length;
  const missingCount = requiredEvidence.filter((item) => item.record === null).length;

  const evidenceState: StageEvidenceSummary["evidenceState"] =
    requiredCount === 0
      ? "not_required"
      : rejectedCount > 0
        ? "rejected"
        : detail.evidenceState === "accepted"
          ? "accepted"
          : missingCount === requiredCount
            ? "missing"
            : acceptedCount > 0
              ? "partially_accepted"
              : pendingCount > 0
                ? "under_review"
                : "submitted";

  return {
    evidenceState,
    headline:
      evidenceState === "accepted"
        ? "Required supporting information is accepted and no longer holding payment."
        : evidenceState === "missing"
          ? "Required supporting information is still missing."
          : evidenceState === "rejected"
            ? "The supporting information review outcome is holding payment."
            : evidenceState === "partially_accepted"
              ? "Some evidence is accepted, but the stage is still waiting on the remaining evidence outcome."
              : evidenceState === "under_review" || evidenceState === "submitted"
                ? "Supporting information is present but still under review."
                : "This project stage does not require supporting information to progress.",
    sufficiencyLabel:
      evidenceState === "accepted"
        ? "Supporting information sufficient"
        : evidenceState === "not_required"
          ? "No supporting information required"
          : evidenceState === "partially_accepted"
            ? "Supporting information partly sufficient"
            : "Supporting information not yet sufficient",
    reviewStatusLabel:
      evidenceState === "accepted"
        ? "Review complete"
        : evidenceState === "rejected"
          ? "Review outcome needs attention"
          : evidenceState === "under_review" || evidenceState === "submitted" || evidenceState === "partially_accepted"
            ? "Review in progress"
            : evidenceState === "missing"
              ? "Awaiting submission"
              : "No review required",
    blockingConditionLabel:
      detail.blockers.find((blocker) => blocker.code === "evidence")?.label ??
      (evidenceState === "rejected" ? "The current supporting information has not been accepted." : null),
    nextEvidenceStepLabel:
      evidenceState === "accepted" || evidenceState === "not_required"
        ? "No further supporting information step is required."
        : detail.sectionGuidance.evidence.nextStep,
    ownerLabel:
      detail.actionReadiness.reviewEvidence.isAvailable || detail.actionReadiness.reviewEvidence.readinessState === "waiting_on_other_role"
        ? detail.actionReadiness.reviewEvidence.nextOwnerLabel
        : detail.actionReadiness.addEvidence.nextOwnerLabel,
    acceptedCountLabel: `${acceptedCount} of ${requiredCount} required accepted`,
    pendingCountLabel: `${pendingCount + missingCount} awaiting information or review`,
    rejectedCountLabel: `${rejectedCount} rejected or needs more`,
    supportingLines: [
      detail.sectionGuidance.evidence.summary,
      detail.sectionGuidance.evidence.recommendedAction,
    ].filter((line, index, lines) => Boolean(line) && lines.indexOf(line) === index),
    tone:
      evidenceState === "accepted" || evidenceState === "not_required"
        ? "success"
        : evidenceState === "under_review" || evidenceState === "submitted" || evidenceState === "partially_accepted"
          ? "info"
          : "warning",
  };
}

function getStageApprovalSummary(detail: {
  approvals: Array<Omit<ApprovalPanelItem, "approveAction" | "rejectAction">>;
  approvalState: StageDetailModel["approvalState"];
  sectionGuidance: Record<StageDetailSectionKey, StageSectionGuidance>;
  blockers: StageBlocker[];
}): StageApprovalSummary {
  const completedApprovals = detail.approvals
    .filter((approval) => approval.status === "approved")
    .map((approval) => getUserFacingRoleLabel(approval.role));
  const pendingApprovals = detail.approvals
    .filter((approval) => approval.status !== "approved")
    .map((approval) => getUserFacingRoleLabel(approval.role));
  const activeApproval = detail.approvals.find((approval) => approval.readiness.readinessState === "available");
  const nextWaitingApproval = detail.approvals.find(
    (approval) =>
      approval.readiness.readinessState === "waiting_on_other_role" ||
      approval.readiness.readinessState === "waiting_on_prerequisite",
  );

  const approvalState: StageApprovalSummary["approvalState"] =
    detail.approvalState === "approved"
      ? "approved"
      : detail.approvalState === "partially_approved"
        ? "partially_approved"
        : detail.approvalState === "rejected"
          ? "blocked"
          : detail.approvalState === "blocked"
            ? "not_ready"
            : pendingApprovals.length > 0
              ? "in_progress"
              : "not_started";

  return {
    approvalState,
    headline:
      approvalState === "approved"
        ? "All required sign-offs are complete."
        : approvalState === "partially_approved"
          ? "The sign-off chain is in progress with some steps already complete."
          : approvalState === "blocked" || approvalState === "not_ready"
            ? "Sign-off progression is currently being held."
            : activeApproval
              ? "A sign-off decision can be recorded now."
              : "The sign-off chain is waiting for the next governed step.",
    approvalProgressLabel:
      completedApprovals.length === 0
        ? `0 of ${detail.approvals.length} sign-offs complete`
        : `${completedApprovals.length} of ${detail.approvals.length} sign-offs complete`,
    activeApprovalLabel: activeApproval ? getUserFacingRoleLabel(activeApproval.role) : null,
    nextApproverLabel:
      activeApproval
        ? getUserFacingRoleLabel(activeApproval.role)
        : nextWaitingApproval
          ? nextWaitingApproval.readiness.nextOwnerLabel ?? getUserFacingRoleLabel(nextWaitingApproval.role)
          : detail.sectionGuidance.approvals.ownerLabel,
    completedApprovals,
    pendingApprovals,
    blockingConditionLabel: detail.blockers.find((blocker) => blocker.code === "approvals" || blocker.code === "evidence")?.label ?? null,
    nextApprovalStepLabel: detail.sectionGuidance.approvals.nextStep,
    supportingLines: [
      detail.sectionGuidance.approvals.summary,
      detail.sectionGuidance.approvals.recommendedAction,
    ].filter((line, index, lines) => Boolean(line) && lines.indexOf(line) === index),
    tone:
      approvalState === "approved"
        ? "success"
        : approvalState === "partially_approved" || approvalState === "in_progress"
          ? "info"
          : "warning",
  };
}

function getStageHealthDescriptor(detail: {
  blockers: StageBlocker[];
  fundingExplanation: StageFundingExplanation;
  approvalSummary: StageApprovalSummary;
  evidenceSummary: StageEvidenceSummary;
  releaseSummary: StageReleaseDecisionSummary;
  exceptionPath: StageExceptionPath;
  exitState: StageExitState;
  roleHandoff: StageRoleHandoff;
}): StageHealthDescriptor {
  const fundingStatus: StageHealthDescriptor["fundingStatus"] =
    detail.fundingExplanation.coverageState === "underfunded" ? "shortfall" : "ok";
  const approvalStatus: StageHealthDescriptor["approvalStatus"] =
    detail.approvalSummary.approvalState === "approved" ? "complete" : "pending";
  const evidenceStatus: StageHealthDescriptor["evidenceStatus"] =
    detail.evidenceSummary.evidenceState === "accepted" || detail.evidenceSummary.evidenceState === "not_required"
      ? "accepted"
      : detail.evidenceSummary.evidenceState === "rejected"
        ? "rejected"
        : "missing";
  const releaseStatus: StageHealthDescriptor["releaseStatus"] =
    detail.releaseSummary.isReleaseEligible ? "ready" : "not_ready";

  const firstBlocker = detail.blockers[0];
  const hasHardBlocker =
    detail.blockers.length > 0 ||
    detail.fundingExplanation.coverageState === "underfunded" ||
    detail.evidenceSummary.evidenceState === "rejected" ||
    detail.approvalSummary.approvalState === "blocked" ||
    detail.approvalSummary.approvalState === "not_ready";

  if (hasHardBlocker) {
    const primaryReason =
      firstBlocker?.code === "funding"
        ? detail.fundingExplanation.blockingConditionLabel ?? detail.fundingExplanation.coverageLabel
        : firstBlocker?.code === "evidence"
          ? detail.evidenceSummary.blockingConditionLabel ?? detail.evidenceSummary.sufficiencyLabel
          : firstBlocker?.code === "approvals"
            ? detail.approvalSummary.blockingConditionLabel ?? detail.approvalSummary.approvalProgressLabel
            : firstBlocker?.code === "disputed" || detail.exceptionPath.hasActiveExceptionPath
              ? detail.exceptionPath.headline
              : firstBlocker?.label ??
                detail.releaseSummary.blockingConditionLabel ??
                detail.fundingExplanation.blockingConditionLabel ??
                detail.evidenceSummary.blockingConditionLabel ??
                detail.approvalSummary.blockingConditionLabel ??
                "Blocked by governed condition";

    return {
      overallStatus: "blocked",
      primaryReason,
      secondarySignals: [
        approvalStatus === "complete" ? "All sign-offs complete" : detail.approvalSummary.approvalProgressLabel,
        evidenceStatus === "accepted" ? "Supporting information accepted" : detail.evidenceSummary.reviewStatusLabel,
        releaseStatus === "ready" ? "Ready to pay" : detail.releaseSummary.remainingHeldLabel,
      ]
        .filter((line, index, lines) => Boolean(line) && lines.indexOf(line) === index && line !== primaryReason)
        .slice(0, 2),
      fundingStatus,
      approvalStatus,
      evidenceStatus,
      releaseStatus,
    };
  }

  const atRisk =
    detail.exceptionPath.hasActiveExceptionPath ||
    detail.roleHandoff.isWaitingOnAnotherRole ||
    detail.approvalSummary.approvalState === "in_progress" ||
    detail.approvalSummary.approvalState === "partially_approved" ||
    detail.evidenceSummary.evidenceState === "under_review" ||
    detail.evidenceSummary.evidenceState === "submitted" ||
    detail.evidenceSummary.evidenceState === "partially_accepted" ||
    detail.fundingExplanation.coverageState === "buffer_at_risk" ||
    detail.releaseSummary.releaseState === "not_ready" ||
    detail.releaseSummary.releaseState === "withheld";

  if (atRisk) {
    const primaryReason =
      detail.exceptionPath.hasActiveExceptionPath
        ? detail.exceptionPath.headline
        : detail.roleHandoff.isWaitingOnAnotherRole
          ? detail.roleHandoff.handoffHeadline
          : detail.approvalSummary.approvalState === "in_progress" || detail.approvalSummary.approvalState === "partially_approved"
            ? detail.approvalSummary.activeApprovalLabel
              ? `Awaiting ${detail.approvalSummary.activeApprovalLabel} sign-off`
              : detail.approvalSummary.approvalProgressLabel
            : detail.evidenceSummary.evidenceState === "under_review" || detail.evidenceSummary.evidenceState === "submitted" || detail.evidenceSummary.evidenceState === "partially_accepted"
              ? detail.evidenceSummary.reviewStatusLabel
              : detail.fundingExplanation.coverageState === "buffer_at_risk"
                ? detail.fundingExplanation.coverageLabel
                : detail.releaseSummary.blockingConditionLabel ?? detail.releaseSummary.headline;

    return {
      overallStatus: "at_risk",
      primaryReason,
      secondarySignals: [
        fundingStatus === "ok" ? "Funding sufficient" : detail.fundingExplanation.shortfallLabel,
        approvalStatus === "complete" ? "All sign-offs complete" : detail.approvalSummary.approvalProgressLabel,
        evidenceStatus === "accepted" ? "Supporting information accepted" : detail.evidenceSummary.reviewStatusLabel,
        detail.exitState.isClosedOrComplete ? detail.exitState.outcomeLabel : detail.releaseSummary.eligibleAmountLabel,
      ]
        .filter((line, index, lines) => Boolean(line) && lines.indexOf(line) === index && line !== primaryReason)
        .slice(0, 2),
      fundingStatus,
      approvalStatus,
      evidenceStatus,
      releaseStatus,
    };
  }

  return {
    overallStatus: "healthy",
    primaryReason:
      detail.exitState.isClosedOrComplete
        ? detail.exitState.outcomeLabel
        : detail.releaseSummary.isReleaseEligible
          ? "Ready for payment"
          : "Good to proceed",
    secondarySignals: [
      "All sign-offs complete",
      evidenceStatus === "accepted" ? "Supporting information accepted" : "No supporting information blocker",
      releaseStatus === "ready" ? detail.releaseSummary.eligibleAmountLabel : "No active blocker",
    ].slice(0, 2),
    fundingStatus,
    approvalStatus,
    evidenceStatus,
    releaseStatus,
  };
}

function getStageCasePathSummary(detail: Pick<
  StageDetailModel,
  "disputeSummary" | "variationSummary" | "blockers" | "roleHandoff" | "exceptionPath" | "sectionGuidance"
>): StageCasePathSummary {
  const disputeResolved = detail.disputeSummary.status === "No dispute";
  const variationResolved = detail.variationSummary.status === "No variation";
  const disputeActive = !disputeResolved;
  const variationActive = !variationResolved;
  const blockedByCase = detail.blockers.some((blocker) => blocker.code === "disputed" || blocker.code === "variation");

  const caseState: StageCasePathSummary["caseState"] =
    blockedByCase
      ? "blocked_by_case"
      : disputeActive
        ? "dispute_active"
        : variationActive
          ? "variation_active"
          : detail.exceptionPath.exceptionType === "dispute"
            ? "dispute_resolved"
            : detail.exceptionPath.exceptionType === "variation"
              ? "variation_resolved"
              : "none";

  if (caseState === "none") {
    return {
      caseState,
      headline: "No dispute or variation path is active.",
      activePathLabel: null,
      ownerLabel: null,
      requiredDecisionLabel: null,
      normalPathImpactLabel: null,
      returnToProgressionLabel: null,
      riskLabel: null,
      supportingLines: [],
      tone: "neutral",
    };
  }

  const disputeOwner = detail.roleHandoff.toRoleLabel ?? "Commercial";
  const variationOwner =
    detail.variationSummary.status === "Approved variation"
      ? "Treasury"
      : detail.roleHandoff.toRoleLabel ?? "Commercial";

  return {
    caseState,
    headline:
      caseState === "dispute_active" || caseState === "blocked_by_case" && disputeActive
        ? "Dispute handling is currently controlling payment progression."
        : caseState === "variation_active" || caseState === "blocked_by_case" && variationActive
          ? "Variation handling is currently controlling payment progression."
          : caseState === "dispute_resolved"
            ? "Dispute path has cleared."
            : "Variation path has cleared.",
    activePathLabel:
      disputeActive
        ? "Dispute path"
        : variationActive
          ? "Variation path"
          : "Resolved case path",
    ownerLabel:
      disputeActive
        ? disputeOwner
        : variationActive
          ? variationOwner
          : null,
    requiredDecisionLabel:
      disputeActive
        ? "Resolve the dispute or confirm the held value."
        : variationActive
          ? detail.variationSummary.status === "Approved variation"
            ? "Activate the approved variation."
            : "Review and decide the variation."
          : "No case decision is currently required.",
    normalPathImpactLabel:
      disputeActive
        ? "Normal payment progression is paused while disputed value remains on hold."
        : variationActive
          ? "Normal scope and payment progression are paused while the variation path is active."
          : "Normal progression can resume.",
    returnToProgressionLabel:
      disputeActive
        ? "Resolve the dispute so undisputed value can return to the governed forward path."
        : variationActive
          ? "Complete the variation decision path so the stage can return to governed forward progression."
          : "Forward progression is no longer being held by a case path.",
    riskLabel:
      disputeActive
        ? `${dashboardCurrency.format(detail.disputeSummary.frozenValue)} remains exposed through dispute handling.`
        : variationActive
          ? detail.variationSummary.reason
          : null,
    supportingLines: [
      disputeActive ? detail.disputeSummary.reason : null,
      variationActive ? detail.variationSummary.reason : null,
      disputeActive ? detail.sectionGuidance.dispute.recommendedAction : null,
      variationActive ? detail.sectionGuidance.variation.recommendedAction : null,
    ].filter((line, index, lines): line is string => Boolean(line) && lines.indexOf(line) === index),
    tone:
      disputeActive || variationActive || blockedByCase
        ? "warning"
        : "success",
  };
}

function getTaskRoleHandoff(task: Pick<HomeTaskItem, "ownerLabel" | "attentionReason" | "nextActionLabel" | "summary">): StageRoleHandoff | undefined {
  if (!task.attentionReason || task.attentionReason.headline !== "Waiting on another role") {
    return undefined;
  }

  return {
    isWaitingOnAnotherRole: true,
    fromRoleLabel: null,
    toRoleLabel: task.attentionReason.ownerLabel ?? task.ownerLabel,
    handoffHeadline: `Waiting on ${task.attentionReason.ownerLabel ?? task.ownerLabel}`,
    handoffReasonLabel: task.attentionReason.reasonLabel,
    expectedActionLabel: task.nextActionLabel ?? task.attentionReason.supportingDetails[1] ?? null,
    unlockOutcomeLabel: task.attentionReason.supportingDetails[0] ?? task.summary,
    blockingConditionLabel: task.attentionReason.driverLabel,
    tone: task.attentionReason.tone,
  };
}

function getReadinessTone(readinessState: StageActionReadiness["readinessState"]): StageActionReadiness["tone"] {
  if (readinessState === "available") return "info";
  if (readinessState === "complete") return "success";
  if (readinessState === "waiting_on_prerequisite" || readinessState === "waiting_on_other_role") return "warning";
  return "neutral";
}

function buildActionReadiness({
  actionKey,
  label,
  isAvailable,
  isComplete = false,
  isPermitted,
  permissionReason,
  guidance,
  missingPrerequisites = [],
  nextConditionLabel,
  nextOwnerLabel,
  availableReason,
  completeReason,
}: {
  actionKey: string;
  label: string;
  isAvailable: boolean;
  isComplete?: boolean;
  isPermitted: boolean;
  permissionReason: string;
  guidance: StageSectionGuidance;
  missingPrerequisites?: string[];
  nextConditionLabel?: string | null;
  nextOwnerLabel?: string | null;
  availableReason: string;
  completeReason: string;
}): StageActionReadiness {
  let readinessState: StageActionReadiness["readinessState"];
  let reasonLabel: string;

  if (isComplete) {
    readinessState = "complete";
    reasonLabel = completeReason;
  } else if (isAvailable) {
    readinessState = "available";
    reasonLabel = availableReason;
  } else if (!isPermitted) {
    readinessState = "not_permitted";
    reasonLabel = permissionReason;
  } else if (guidance.state === "waiting") {
    readinessState = "waiting_on_other_role";
    reasonLabel = guidance.summary;
  } else {
    readinessState = "waiting_on_prerequisite";
    reasonLabel = guidance.summary;
  }

  return {
    actionKey,
    label,
    isAvailable,
    readinessState,
    reasonLabel,
    missingPrerequisites,
    nextConditionLabel: nextConditionLabel ?? guidance.nextStep,
    nextOwnerLabel: nextOwnerLabel ?? guidance.ownerLabel,
    tone: getReadinessTone(readinessState),
  };
}

function getActionBlockerSummary(readiness: StageActionReadiness) {
  if (readiness.readinessState === "available") {
    return undefined;
  }

  if (readiness.readinessState === "complete") {
    return readiness.reasonLabel;
  }

  if (readiness.missingPrerequisites.length > 0) {
    return readiness.missingPrerequisites[0];
  }

  if (readiness.readinessState === "waiting_on_other_role" && readiness.nextOwnerLabel) {
    return `${readiness.nextOwnerLabel} must act first.`;
  }

  return readiness.nextConditionLabel ?? readiness.reasonLabel;
}

function getActionConfidence(
  actionId: string,
  readiness: StageActionReadiness,
): DerivedActionDescriptor["confidence"] {
  if (readiness.readinessState !== "available") {
    return "blocked";
  }

  if (
    actionId.includes("override") ||
    actionId.includes("reject") ||
    actionId.includes("dispute") ||
    actionId.includes("variation") ||
    actionId.endsWith("requires_more") ||
    actionId.endsWith("pending")
  ) {
    return "medium";
  }

  return "high";
}

function getCurrentStateLabelForAction(detail: {
  operationalStatus: OperationalStageStatus;
  releaseSummary: StageReleaseDecisionSummary;
  fundingExplanation: StageFundingExplanation;
  evidenceSummary: StageEvidenceSummary;
  approvalSummary: StageApprovalSummary;
  disputeSummary: DisputeOperationalSummary;
  variationSummary: VariationOperationalSummary;
  exceptionPath: StageExceptionPath;
}, actionId: string) {
  if (actionId === "release" || actionId === "apply-override") {
    return detail.releaseSummary.decisionLabel ?? detail.releaseSummary.headline;
  }

  if (actionId === "fund-stage") {
    return detail.fundingExplanation.coverageLabel;
  }

  if (actionId.startsWith("approval-")) {
    return detail.approvalSummary.activeApprovalLabel
      ? `Awaiting ${detail.approvalSummary.activeApprovalLabel} sign-off`
      : detail.approvalSummary.approvalProgressLabel;
  }

  if (actionId === "add-evidence" || actionId.startsWith("evidence-") || actionId === "review-evidence") {
    return detail.evidenceSummary.reviewStatusLabel;
  }

  if (actionId.includes("dispute")) {
    return detail.disputeSummary.status;
  }

  if (actionId.includes("variation")) {
    return detail.variationSummary.status;
  }

  if (detail.exceptionPath.hasActiveExceptionPath) {
    return detail.exceptionPath.headline;
  }

  return detail.operationalStatus.label;
}

function buildDerivedActionDescriptor(params: {
  actionId: string;
  label: string;
  outcomeLabel: string;
  fromState: string;
  toState: string;
  readiness: StageActionReadiness;
  sideEffects?: string[];
  impactSummary?: string;
}): DerivedActionDescriptor {
  const { actionId, label, outcomeLabel, fromState, toState, readiness, sideEffects, impactSummary } = params;

  return {
    actionId,
    label,
    outcomeLabel,
    stateTransitionPreview: {
      fromState,
      toState,
    },
    sideEffects: sideEffects?.slice(0, 2),
    confidence: getActionConfidence(actionId, readiness),
    blockerSummary: getActionBlockerSummary(readiness),
    impactSummary,
    isPrimary: false,
  };
}

function getPrimaryActionPreference(detail: {
  entryOrientation: WorkspaceDecisionCue;
  exceptionPath: StageExceptionPath;
  variationSummary: VariationOperationalSummary;
  disputes: Array<
    DisputeRecord & {
      canResolve: boolean;
    }
  >;
  approvals: Array<Omit<ApprovalPanelItem, "approveAction" | "rejectAction">>;
  evidence: Array<
    EvidenceRequirementRecord & {
      record: EvidenceRecord | null;
    }
  >;
}): string[] {
  if (detail.exceptionPath.hasActiveExceptionPath) {
    if (detail.disputes.some((dispute) => dispute.status === "open")) {
      return ["resolve-dispute"];
    }

    if (detail.variationSummary.status === "Pending review") {
      return ["review-variation-approve", "review-variation-reject"];
    }

    if (detail.variationSummary.status === "Approved variation") {
      return ["activate-variation"];
    }
  }

  if (detail.entryOrientation.detailFocusHint === "release") {
    return ["release", "apply-override"];
  }

  if (detail.entryOrientation.detailFocusHint === "funding") {
    return ["fund-stage"];
  }

  if (detail.entryOrientation.detailFocusHint === "approval") {
    const activeApproval = detail.approvals.find((approval) => approval.readiness.readinessState === "available");
    return activeApproval ? [`approval-${activeApproval.role}-approve`] : ["release"];
  }

  if (detail.entryOrientation.detailFocusHint === "evidence") {
    const pendingEvidence = detail.evidence.find((item) => (item.record?.status ?? "missing") === "pending");
    return pendingEvidence ? [`evidence-${pendingEvidence.id}-accepted`] : ["add-evidence", "review-evidence"];
  }

  return ["release", "fund-stage", "review-evidence", "add-evidence"];
}

function markPrimaryAction(
  descriptors: DerivedActionDescriptor[],
  preferredActionIds: string[],
): DerivedActionDescriptor[] {
  const availableDescriptors = descriptors.filter((descriptor) => descriptor.confidence !== "blocked");
  const blockedDescriptors = descriptors.filter((descriptor) => descriptor.confidence === "blocked");
  const candidatePool = availableDescriptors.length > 0 ? availableDescriptors : blockedDescriptors;

  if (candidatePool.length === 0) {
    return descriptors;
  }

  const preferred = preferredActionIds.find((actionId) =>
    candidatePool.some((descriptor) => descriptor.actionId === actionId || descriptor.actionId.startsWith(`${actionId}-`)),
  );

  const primaryDescriptor =
    (preferred
      ? candidatePool.find((descriptor) => descriptor.actionId === preferred || descriptor.actionId.startsWith(`${preferred}-`))
      : undefined) ??
    candidatePool.find((descriptor) => descriptor.confidence === "high") ??
    candidatePool[0];

  return descriptors.map((descriptor) => ({
    ...descriptor,
    isPrimary: descriptor.actionId === primaryDescriptor.actionId,
  }));
}

function getMissingPrerequisitesForSection(sectionKey: StageDetailSectionKey, detail: Pick<
  StageDetailModel,
  "blockers" | "approvalState" | "evidenceState" | "funding" | "releaseDecision" | "variationSummary" | "disputeSummary"
>): string[] {
  if (sectionKey === "funding") {
    return detail.funding.gapToRequiredCover > 0 ? [`Funding gap of ${dashboardCurrency.format(detail.funding.gapToRequiredCover)} remains.`] : [];
  }

  if (sectionKey === "approvals") {
    if (detail.evidenceState !== "accepted") {
      return ["Evidence must be accepted before approvals can complete."];
    }
    return detail.approvalState === "rejected" ? ["A required approval has been rejected."] : [];
  }

  if (sectionKey === "evidence") {
    return detail.evidenceState === "missing" ? ["Required evidence is missing."] : [];
  }

  if (sectionKey === "dispute") {
    return detail.disputeSummary.status !== "No dispute" ? ["Open disputed value remains frozen."] : [];
  }

  if (sectionKey === "variation") {
    return detail.variationSummary.blocking ? [detail.variationSummary.reason] : [];
  }

  if (sectionKey === "release") {
    return detail.blockers.map((blocker) => blocker.label);
  }

  return [];
}

function getStageActionReadinessModel(detail: Pick<
  StageDetailModel,
  | "availableActions"
  | "sectionGuidance"
  | "funding"
  | "releaseDecision"
  | "approvalState"
  | "evidenceState"
  | "blockers"
  | "variationSummary"
  | "disputeSummary"
>): StageDetailModel["actionReadiness"] {
  const fundingMissing = getMissingPrerequisitesForSection("funding", detail);
  const evidenceMissing = getMissingPrerequisitesForSection("evidence", detail);
  const approvalMissing = getMissingPrerequisitesForSection("approvals", detail);
  const disputeMissing = getMissingPrerequisitesForSection("dispute", detail);
  const variationMissing = getMissingPrerequisitesForSection("variation", detail);
  const releaseMissing = getMissingPrerequisitesForSection("release", detail);

  return {
    fundStage: buildActionReadiness({
      actionKey: "fundStage",
      label: "Allocate funds",
      isAvailable: detail.availableActions.fundStage && detail.funding.gapToRequiredCover > 0,
      isComplete: detail.funding.gapToRequiredCover === 0,
      isPermitted: detail.availableActions.fundStage,
      permissionReason: detail.availableActions.fundStageReason,
      guidance: detail.sectionGuidance.funding,
      missingPrerequisites: fundingMissing,
      availableReason: "Funder can allocate the remaining funding now.",
      completeReason: "Funding is already aligned to the current WIP position.",
    }),
    release: buildActionReadiness({
      actionKey: "release",
      label: "Send payment",
      isAvailable: detail.availableActions.release && detail.releaseDecision.releasable,
      isComplete: detail.releaseDecision.releasableAmount === 0 && detail.releaseDecision.blockedAmount === 0 && detail.releaseDecision.frozenAmount === 0,
      isPermitted: detail.availableActions.release,
      permissionReason: detail.availableActions.releaseReason,
      guidance: detail.sectionGuidance.release,
      missingPrerequisites: releaseMissing,
      availableReason: "Funder can send the current payment now.",
      completeReason: "No further payment is currently needed for this project stage.",
    }),
    applyOverride: buildActionReadiness({
      actionKey: "applyOverride",
      label: "Apply Override",
      isAvailable: detail.availableActions.applyOverride,
      isPermitted: detail.availableActions.applyOverride,
      permissionReason: detail.availableActions.applyOverrideReason,
      guidance: detail.sectionGuidance.release,
      missingPrerequisites: [],
      availableReason: "Funder can apply a governed override when required.",
      completeReason: "Override is not currently needed.",
    }),
    addEvidence: buildActionReadiness({
      actionKey: "addEvidence",
      label: "Add Item",
      isAvailable: detail.availableActions.addEvidence,
      isComplete: detail.evidenceState === "accepted",
      isPermitted: detail.availableActions.addEvidence,
      permissionReason: detail.availableActions.addEvidenceReason,
      guidance: detail.sectionGuidance.evidence,
      missingPrerequisites: evidenceMissing,
      availableReason: "Supporting information can be added in this role.",
      completeReason: "Required supporting information is already accepted.",
    }),
    reviewEvidence: buildActionReadiness({
      actionKey: "reviewEvidence",
      label: "Review Evidence",
      isAvailable: detail.availableActions.reviewEvidence,
      isComplete: detail.evidenceState === "accepted",
      isPermitted: detail.availableActions.reviewEvidence,
      permissionReason: detail.availableActions.reviewEvidenceReason,
      guidance: detail.sectionGuidance.evidence,
      missingPrerequisites: evidenceMissing,
      availableReason: "Supporting information can be reviewed and decided now.",
      completeReason: "Supporting information review is already complete.",
    }),
    openDispute: buildActionReadiness({
      actionKey: "openDispute",
      label: "Raise Dispute",
      isAvailable: detail.availableActions.openDispute,
      isPermitted: detail.availableActions.openDispute,
      permissionReason: detail.availableActions.openDisputeReason,
      guidance: detail.sectionGuidance.dispute,
      missingPrerequisites: disputeMissing,
      availableReason: "A dispute can be raised in this role.",
      completeReason: "No dispute action is currently needed.",
    }),
    resolveDispute: buildActionReadiness({
      actionKey: "resolveDispute",
      label: "Resolve Dispute",
      isAvailable: detail.availableActions.resolveDispute && detail.disputeSummary.status !== "No dispute",
      isComplete: detail.disputeSummary.status === "No dispute",
      isPermitted: detail.availableActions.resolveDispute,
      permissionReason: detail.availableActions.resolveDisputeReason,
      guidance: detail.sectionGuidance.dispute,
      missingPrerequisites: disputeMissing,
      availableReason: "The current dispute can be resolved in this role.",
      completeReason: "No open dispute remains to resolve.",
    }),
    createVariation: buildActionReadiness({
      actionKey: "createVariation",
      label: "Propose Variation",
      isAvailable: detail.availableActions.createVariation,
      isPermitted: detail.availableActions.createVariation,
      permissionReason: detail.availableActions.createVariationReason,
      guidance: detail.sectionGuidance.variation,
      missingPrerequisites: variationMissing,
      availableReason: "A variation can be proposed in this role.",
      completeReason: "No variation proposal is currently needed.",
    }),
    reviewVariation: buildActionReadiness({
      actionKey: "reviewVariation",
      label: "Review Variation",
      isAvailable: detail.availableActions.reviewVariation && detail.variationSummary.status === "Pending review",
      isComplete: detail.variationSummary.status === "No variation",
      isPermitted: detail.availableActions.reviewVariation,
      permissionReason: detail.availableActions.reviewVariationReason,
      guidance: detail.sectionGuidance.variation,
      missingPrerequisites: variationMissing,
      availableReason: "The pending variation can be reviewed now.",
      completeReason: "No pending variation review remains.",
    }),
    activateVariation: buildActionReadiness({
      actionKey: "activateVariation",
      label: "Activate Variation",
      isAvailable: detail.availableActions.activateVariation && detail.variationSummary.status === "Approved variation",
      isComplete: detail.variationSummary.status !== "Approved variation",
      isPermitted: detail.availableActions.activateVariation,
      permissionReason: detail.availableActions.activateVariationReason,
      guidance: detail.sectionGuidance.variation,
      missingPrerequisites: variationMissing,
      availableReason: "The approved variation can be activated now.",
      completeReason: "No approved variation is waiting for activation.",
    }),
  };
}

function getApprovalReadiness(
  approval: Pick<ApprovalPanelItem, "role" | "status" | "canAct" | "sequenceBlocked" | "unavailableReason">,
  detail: Pick<StageDetailModel, "sectionGuidance" | "approvalState" | "evidenceState">
): StageActionReadiness {
  const isComplete = approval.status === "approved";
  const readinessState: StageActionReadiness["readinessState"] =
    isComplete
      ? "complete"
      : approval.canAct
        ? "available"
        : approval.sequenceBlocked || detail.approvalState === "blocked"
          ? approval.sequenceBlocked
            ? "waiting_on_other_role"
            : "waiting_on_prerequisite"
          : "not_permitted";

  return {
    actionKey: `approval-${approval.role}`,
    label: `${getUserFacingRoleLabel(approval.role)} sign-off`,
    isAvailable: approval.canAct,
    readinessState,
    reasonLabel:
      readinessState === "complete"
        ? "Sign-off already completed."
        : readinessState === "available"
          ? `Record the ${getUserFacingRoleLabel(approval.role).toLowerCase()} sign-off now.`
          : approval.unavailableReason,
    missingPrerequisites:
      detail.approvalState === "blocked" && detail.evidenceState !== "accepted"
        ? ["Supporting information must be accepted before this sign-off can proceed."]
        : approval.sequenceBlocked
          ? ["An earlier approval step must complete first."]
          : [],
    nextConditionLabel:
      readinessState === "complete"
        ? null
        : approval.sequenceBlocked
          ? "Wait for the earlier approval step to complete."
          : detail.approvalState === "blocked"
            ? detail.sectionGuidance.approvals.nextStep
            : detail.sectionGuidance.approvals.nextStep,
    nextOwnerLabel:
      readinessState === "waiting_on_other_role"
        ? approval.sequenceBlocked
          ? "Commercial"
          : getUserFacingRoleLabel(approval.role)
        : getUserFacingRoleLabel(approval.role),
    tone: getReadinessTone(readinessState),
  };
}

function getApprovalOutcomeLabel(
  approvals: Array<Omit<ApprovalPanelItem, "approveAction" | "rejectAction">>,
  approvalRole: FundingApprovalRole,
  mode: "approve" | "reject",
) {
  if (mode === "reject") {
    return "Keeps payment on hold pending revised sign-off";
  }

  const pendingApprovals = approvals.filter((entry) => entry.status !== "approved");
  const currentIndex = pendingApprovals.findIndex((entry) => entry.role === approvalRole);
  const nextApproval = currentIndex >= 0 ? pendingApprovals[currentIndex + 1] : null;

  if (nextApproval) {
    return `Sent for ${getUserFacingRoleLabel(nextApproval.role)} sign-off`;
  }

  return "Sent for payment review";
}

function getEvidenceOutcomeLabel(status: EvidenceStatus) {
  if (status === "accepted") {
    return "Moves the project stage toward sign-off";
  }

  if (status === "rejected") {
    return "Keeps payment on hold pending supporting information correction";
  }

  if (status === "requires_more") {
    return "Requests more supporting information";
  }

  return "Keeps supporting information under review";
}

function getVariationOutcomeLabel(status: VariationRecord["status"], action: "approve" | "reject" | "activate") {
  if (action === "approve") {
    return "Moves the variation to activation control";
  }

  if (action === "reject") {
    return "Leaves the current scope and controls unchanged";
  }

  if (status === "approved") {
    return "Applies the approved variation to live controls";
  }

  return "No approved variation is waiting for activation";
}

function getVariationNextStateLabel(status: VariationRecord["status"], action: "approve" | "reject" | "activate") {
  if (action === "approve") {
    return "Approved variation";
  }

  if (action === "reject") {
    return "Scope unchanged";
  }

  if (status === "approved") {
    return "Variation active";
  }

  return "No variation pending";
}

function getStageDerivedActionDescriptors(detail: {
  entryOrientation: WorkspaceDecisionCue;
  operationalStatus: OperationalStageStatus;
  funding: FundingStageSummary;
  fundingExplanation: StageFundingExplanation;
  releaseDecision: ReleaseDecisionCard;
  releaseSummary: StageReleaseDecisionSummary;
  disputeSummary: DisputeOperationalSummary;
  variationSummary: VariationOperationalSummary;
  actionReadiness: StageDetailModel["actionReadiness"];
  evidenceSummary: StageEvidenceSummary;
  approvalSummary: StageApprovalSummary;
  approvals: Array<Omit<ApprovalPanelItem, "approveAction" | "rejectAction">>;
  evidence: Array<
    EvidenceRequirementRecord & {
      record: EvidenceRecord | null;
    }
  >;
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
      operationalStatusLabel: VariationOperationalSummary["status"];
    }
  >;
  exceptionPath: StageExceptionPath;
}): {
  actionDescriptors: DerivedActionDescriptor[];
  actionDescriptorMap: Record<string, DerivedActionDescriptor>;
  approvals: ApprovalPanelItem[];
  evidence: StageDetailModel["evidence"];
  disputes: StageDetailModel["disputes"];
  variations: StageDetailModel["variations"];
} {
  const baseDescriptors: DerivedActionDescriptor[] = [
    buildDerivedActionDescriptor({
      actionId: "fund-stage",
      label:
        detail.funding.gapToRequiredCover > 0
          ? `Allocate ${dashboardCurrency.format(detail.funding.gapToRequiredCover)}`
          : "Allocate funds",
      outcomeLabel: "Brings this project stage back into funded position",
      fromState: getCurrentStateLabelForAction(detail, "fund-stage"),
      toState: detail.funding.gapToRequiredCover > 0 ? "Funding aligned" : detail.fundingExplanation.coverageLabel,
      readiness: detail.actionReadiness.fundStage,
      sideEffects:
        detail.funding.gapToRequiredCover > 0
          ? [
              `${dashboardCurrency.format(detail.funding.gapToRequiredCover)} gap is covered`,
              "Project stage sits within the current WIP position",
            ]
          : undefined,
      impactSummary:
        detail.funding.gapToRequiredCover > 0
          ? `${dashboardCurrency.format(detail.funding.gapToRequiredCover)} gap is covered`
          : undefined,
    }),
    buildDerivedActionDescriptor({
      actionId: "release",
      label:
        detail.releaseDecision.releasableAmount > 0
          ? `Pay ${dashboardCurrency.format(detail.releaseDecision.releasableAmount)}`
          : "Send payment",
      outcomeLabel:
        detail.releaseDecision.releasableAmount > 0
          ? "Payment is sent immediately"
          : "Records the current payment decision",
      fromState: getCurrentStateLabelForAction(detail, "release"),
      toState: detail.releaseDecision.releasableAmount > 0 ? "Payment sent" : "Payment recorded",
      readiness: detail.actionReadiness.release,
      sideEffects:
        detail.releaseDecision.releasableAmount > 0
          ? [
              `${dashboardCurrency.format(detail.releaseDecision.releasableAmount)} is paid`,
              detail.releaseDecision.frozenAmount > 0
                ? `${dashboardCurrency.format(detail.releaseDecision.frozenAmount)} remains on hold`
                : "No held amount remains",
            ]
          : undefined,
      impactSummary:
        detail.releaseDecision.releasableAmount > 0
          ? `${dashboardCurrency.format(detail.releaseDecision.releasableAmount)} is paid`
          : undefined,
    }),
    buildDerivedActionDescriptor({
      actionId: "apply-override",
      label: "Apply payment override",
      outcomeLabel: "Moves payment through the governed override route",
      fromState: getCurrentStateLabelForAction(detail, "apply-override"),
      toState: "Override active",
      readiness: detail.actionReadiness.applyOverride,
      sideEffects: ["Normal payment path is paused"],
    }),
    buildDerivedActionDescriptor({
      actionId: "add-evidence",
      label: "Add supporting information",
      outcomeLabel: "Submits supporting information for review",
      fromState: getCurrentStateLabelForAction(detail, "add-evidence"),
      toState: "Review in progress",
      readiness: detail.actionReadiness.addEvidence,
      sideEffects: ["Supporting information enters review"],
    }),
    buildDerivedActionDescriptor({
      actionId: "review-evidence",
      label: "Review supporting information",
      outcomeLabel: "Records the supporting information review result",
      fromState: getCurrentStateLabelForAction(detail, "review-evidence"),
      toState: detail.evidenceSummary.reviewStatusLabel,
      readiness: detail.actionReadiness.reviewEvidence,
      sideEffects: ["Supporting information status updates immediately"],
    }),
    buildDerivedActionDescriptor({
      actionId: "open-dispute",
      label: "Raise dispute",
      outcomeLabel: "Places disputed value on hold and pauses normal payment",
      fromState: getCurrentStateLabelForAction(detail, "open-dispute"),
      toState: "Blocked by dispute",
      readiness: detail.actionReadiness.openDispute,
      sideEffects: ["Normal payment path pauses"],
    }),
    buildDerivedActionDescriptor({
      actionId: "resolve-dispute",
      label: "Resolve dispute",
      outcomeLabel: "Returns the project stage to the governed payment path",
      fromState: getCurrentStateLabelForAction(detail, "resolve-dispute"),
      toState: "Dispute resolved",
      readiness: detail.actionReadiness.resolveDispute,
      sideEffects:
        detail.disputeSummary.frozenValue > 0
          ? [
              `${dashboardCurrency.format(detail.disputeSummary.frozenValue)} leaves dispute hold`,
              "Governed payment path resumes",
            ]
          : ["Governed payment path resumes"],
      impactSummary:
        detail.disputeSummary.frozenValue > 0
          ? `${dashboardCurrency.format(detail.disputeSummary.frozenValue)} can leave the dispute hold`
          : undefined,
    }),
    buildDerivedActionDescriptor({
      actionId: "create-variation",
      label: "Propose variation",
      outcomeLabel: "Moves the project stage into variation review",
      fromState: getCurrentStateLabelForAction(detail, "create-variation"),
      toState: "Pending review",
      readiness: detail.actionReadiness.createVariation,
      sideEffects: ["Variation enters governed review"],
    }),
    buildDerivedActionDescriptor({
      actionId: "review-variation-approve",
      label: "Approve variation",
      outcomeLabel: "Moves the variation to activation review",
      fromState: getCurrentStateLabelForAction(detail, "review-variation-approve"),
      toState: "Approved variation",
      readiness: detail.actionReadiness.reviewVariation,
      sideEffects: ["Variation moves to activation control"],
    }),
    buildDerivedActionDescriptor({
      actionId: "review-variation-reject",
      label: "Reject variation",
      outcomeLabel: "Leaves the current scope and controls unchanged",
      fromState: getCurrentStateLabelForAction(detail, "review-variation-reject"),
      toState: "Scope unchanged",
      readiness: detail.actionReadiness.reviewVariation,
      sideEffects: ["Current stage controls remain unchanged"],
    }),
    buildDerivedActionDescriptor({
      actionId: "activate-variation",
      label: "Activate variation",
      outcomeLabel: "Applies the approved change to the live project stage",
      fromState: getCurrentStateLabelForAction(detail, "activate-variation"),
      toState: "Variation active",
      readiness: detail.actionReadiness.activateVariation,
      sideEffects: ["Live stage controls update immediately"],
    }),
  ];

  const approvals = detail.approvals.map((approval) => ({
    ...approval,
    approveAction: buildDerivedActionDescriptor({
      actionId: `approval-${approval.role}-approve`,
      label: "Approve project stage",
      outcomeLabel: getApprovalOutcomeLabel(detail.approvals, approval.role, "approve"),
      fromState: getCurrentStateLabelForAction(detail, `approval-${approval.role}-approve`),
      toState:
        getApprovalOutcomeLabel(detail.approvals, approval.role, "approve") === "Sent for payment review"
          ? "Ready for payment"
          : getApprovalOutcomeLabel(detail.approvals, approval.role, "approve").replace("Sent for ", ""),
      readiness: approval.readiness,
      sideEffects:
        getApprovalOutcomeLabel(detail.approvals, approval.role, "approve") === "Sent for payment review"
          ? ["Sign-off chain completes"]
          : [getApprovalOutcomeLabel(detail.approvals, approval.role, "approve")],
    }),
    rejectAction: buildDerivedActionDescriptor({
      actionId: `approval-${approval.role}-reject`,
      label: "Reject project stage",
      outcomeLabel: getApprovalOutcomeLabel(detail.approvals, approval.role, "reject"),
      fromState: getCurrentStateLabelForAction(detail, `approval-${approval.role}-reject`),
      toState: "Payment on hold",
      readiness: approval.readiness,
      sideEffects: ["Project stage remains on hold for sign-off rework"],
    }),
  }));

  const evidence = detail.evidence.map((item) => ({
    ...item,
    actionDescriptors: {
      pending: buildDerivedActionDescriptor({
        actionId: `evidence-${item.id}-pending`,
        label: "Keep under review",
        outcomeLabel: getEvidenceOutcomeLabel("pending"),
        fromState: item.record?.status ? item.record.status.replaceAll("_", " ") : "Missing",
        toState: "Under review",
        readiness: detail.actionReadiness.reviewEvidence,
        sideEffects: ["Supporting information remains under review"],
      }),
      accepted: buildDerivedActionDescriptor({
        actionId: `evidence-${item.id}-accepted`,
        label: "Accept information",
        outcomeLabel: getEvidenceOutcomeLabel("accepted"),
        fromState: item.record?.status ? item.record.status.replaceAll("_", " ") : "Missing",
        toState: "Accepted",
        readiness: detail.actionReadiness.reviewEvidence,
        sideEffects: ["Supporting information is accepted"],
      }),
      rejected: buildDerivedActionDescriptor({
        actionId: `evidence-${item.id}-rejected`,
        label: "Reject information",
        outcomeLabel: getEvidenceOutcomeLabel("rejected"),
        fromState: item.record?.status ? item.record.status.replaceAll("_", " ") : "Missing",
        toState: "Rejected",
        readiness: detail.actionReadiness.reviewEvidence,
        sideEffects: ["Payment remains on hold pending supporting information"],
      }),
      requires_more: buildDerivedActionDescriptor({
        actionId: `evidence-${item.id}-requires_more`,
        label: "Request more information",
        outcomeLabel: getEvidenceOutcomeLabel("requires_more"),
        fromState: item.record?.status ? item.record.status.replaceAll("_", " ") : "Missing",
        toState: "Supporting information required",
        readiness: detail.actionReadiness.reviewEvidence,
        sideEffects: ["Supporting information returns for resubmission"],
      }),
    },
  }));

  const disputes = detail.disputes.map((dispute) => ({
    ...dispute,
    resolveAction: buildDerivedActionDescriptor({
      actionId: `dispute-${dispute.id}-resolve`,
      label: "Resolve dispute",
      outcomeLabel: "Returns disputed value to governed progression",
      fromState: dispute.status === "open" ? "Blocked by dispute" : dispute.status,
      toState: "Dispute resolved",
      readiness: {
        ...detail.actionReadiness.resolveDispute,
        isAvailable: dispute.canResolve && detail.actionReadiness.resolveDispute.isAvailable,
        readinessState:
          dispute.canResolve && detail.actionReadiness.resolveDispute.isAvailable
            ? "available"
            : detail.actionReadiness.resolveDispute.readinessState,
      },
      sideEffects: [`${dashboardCurrency.format(dispute.disputedAmount)} leaves dispute control`],
      impactSummary: `${dashboardCurrency.format(dispute.disputedAmount)} leaves dispute control`,
    }),
  }));

  const variations = detail.variations.map((variation) => ({
    ...variation,
    approveAction: buildDerivedActionDescriptor({
      actionId: `variation-${variation.id}-approve`,
      label: "Approve variation",
      outcomeLabel: getVariationOutcomeLabel(variation.status, "approve"),
      fromState: variation.operationalStatusLabel,
      toState: getVariationNextStateLabel(variation.status, "approve"),
      readiness: {
        ...detail.actionReadiness.reviewVariation,
        isAvailable: variation.canApprove && detail.actionReadiness.reviewVariation.isAvailable,
        readinessState:
          variation.canApprove && detail.actionReadiness.reviewVariation.isAvailable
            ? "available"
            : detail.actionReadiness.reviewVariation.readinessState,
      },
      sideEffects: [`${dashboardCurrency.format(variation.amountDelta)} moves to activation control`],
      impactSummary: `${dashboardCurrency.format(variation.amountDelta)} moves to activation control`,
    }),
    rejectAction: buildDerivedActionDescriptor({
      actionId: `variation-${variation.id}-reject`,
      label: "Reject variation",
      outcomeLabel: getVariationOutcomeLabel(variation.status, "reject"),
      fromState: variation.operationalStatusLabel,
      toState: getVariationNextStateLabel(variation.status, "reject"),
      readiness: {
        ...detail.actionReadiness.reviewVariation,
        isAvailable: variation.canReject && detail.actionReadiness.reviewVariation.isAvailable,
        readinessState:
          variation.canReject && detail.actionReadiness.reviewVariation.isAvailable
            ? "available"
            : detail.actionReadiness.reviewVariation.readinessState,
      },
      sideEffects: ["Current scope remains in force"],
    }),
    activateAction: buildDerivedActionDescriptor({
      actionId: `variation-${variation.id}-activate`,
      label: "Activate variation",
      outcomeLabel: getVariationOutcomeLabel(variation.status, "activate"),
      fromState: variation.operationalStatusLabel,
      toState: getVariationNextStateLabel(variation.status, "activate"),
      readiness: {
        ...detail.actionReadiness.activateVariation,
        isAvailable: variation.canActivate && detail.actionReadiness.activateVariation.isAvailable,
        readinessState:
          variation.canActivate && detail.actionReadiness.activateVariation.isAvailable
            ? "available"
            : detail.actionReadiness.activateVariation.readinessState,
      },
      sideEffects: [`${dashboardCurrency.format(variation.amountDelta)} applies to live controls`],
      impactSummary: `${dashboardCurrency.format(variation.amountDelta)} applies to live controls`,
    }),
  }));

  const descriptors = markPrimaryAction(
    [
      ...baseDescriptors,
      ...approvals.flatMap((approval) => [approval.approveAction, approval.rejectAction]),
      ...evidence.flatMap((item) => Object.values(item.actionDescriptors)),
      ...disputes.map((dispute) => dispute.resolveAction),
      ...variations.flatMap((variation) => [variation.approveAction, variation.rejectAction, variation.activateAction]),
    ],
    getPrimaryActionPreference({
      entryOrientation: detail.entryOrientation,
      exceptionPath: detail.exceptionPath,
      variationSummary: detail.variationSummary,
      disputes: detail.disputes,
      approvals: detail.approvals,
      evidence: detail.evidence,
    }),
  );

  const descriptorMap = Object.fromEntries(descriptors.map((descriptor) => [descriptor.actionId, descriptor]));

  return {
    actionDescriptors: descriptors,
    actionDescriptorMap: descriptorMap,
    approvals: approvals.map((approval) => ({
      ...approval,
      approveAction: descriptorMap[approval.approveAction.actionId] ?? approval.approveAction,
      rejectAction: descriptorMap[approval.rejectAction.actionId] ?? approval.rejectAction,
    })),
    evidence: evidence.map((item) => ({
      ...item,
      actionDescriptors: Object.fromEntries(
        Object.entries(item.actionDescriptors).map(([status, descriptor]) => [
          status,
          descriptorMap[descriptor.actionId] ?? descriptor,
        ]),
      ) as Partial<Record<EvidenceStatus, DerivedActionDescriptor>>,
    })),
    disputes: disputes.map((dispute) => ({
      ...dispute,
      resolveAction: descriptorMap[dispute.resolveAction.actionId] ?? dispute.resolveAction,
    })),
    variations: variations.map((variation) => ({
      ...variation,
      approveAction: descriptorMap[variation.approveAction.actionId] ?? variation.approveAction,
      rejectAction: descriptorMap[variation.rejectAction.actionId] ?? variation.rejectAction,
      activateAction: descriptorMap[variation.activateAction.actionId] ?? variation.activateAction,
    })),
  };
}

function mapSectionToAttentionCategory(section: StageDetailSectionKey): StageAttentionReason["reasonCategory"] {
  if (section === "funding") return "funding";
  if (section === "approvals") return "approval";
  if (section === "evidence") return "evidence";
  if (section === "dispute") return "dispute";
  if (section === "variation") return "variation";
  if (section === "release") return "release";
  return "general";
}

function canActOnAttentionSection(detail: {
  availableActions: StageDetailModel["availableActions"];
  approvals: Array<Omit<ApprovalPanelItem, "approveAction" | "rejectAction">>;
  actingRole: ActingRoleSummary;
}, section: StageDetailSectionKey) {
  if (section === "funding") return detail.availableActions.fundStage;
  if (section === "approvals") return detail.approvals.some((approval) => approval.canAct);
  if (section === "evidence") return detail.availableActions.reviewEvidence || detail.availableActions.addEvidence;
  if (section === "dispute") return detail.availableActions.resolveDispute || detail.availableActions.openDispute;
  if (section === "variation") return detail.availableActions.reviewVariation || detail.availableActions.createVariation || detail.availableActions.activateVariation;
  if (section === "release") return detail.availableActions.release;
  return !detail.actingRole.readOnly;
}

export function getStageAttentionReason(detail: {
  sectionGuidance: Record<StageDetailSectionKey, StageSectionGuidance>;
  blockers: StageBlocker[];
  releaseDecision: ReleaseDecisionCard;
  decisionSummary: StageDecisionSummary;
  availableActions: StageDetailModel["availableActions"];
  approvals: Array<Omit<ApprovalPanelItem, "approveAction" | "rejectAction">>;
  actingRole: ActingRoleSummary;
}): StageAttentionReason {
  const orderedSections: StageDetailSectionKey[] = ["funding", "evidence", "approvals", "dispute", "variation", "release", "overview"];
  const surfacedGuidance = orderedSections
    .map((section) => detail.sectionGuidance[section])
    .find((guidance) => guidance.state === "act_now" || guidance.state === "waiting" || guidance.state === "blocked")
    ?? detail.sectionGuidance.overview;
  const queuedGuidance = orderedSections
    .map((section) => detail.sectionGuidance[section])
    .find((guidance) => guidance.key !== surfacedGuidance.key && (guidance.state === "act_now" || guidance.state === "waiting"));
  const requiresMyAction = surfacedGuidance.state === "act_now" && canActOnAttentionSection(detail, surfacedGuidance.key);
  const tone: StageAttentionReason["tone"] =
    requiresMyAction
      ? "info"
      : surfacedGuidance.state === "waiting" || surfacedGuidance.state === "blocked" || detail.blockers.length > 0
          ? "warning"
        : detail.releaseDecision.releasableAmount > 0
          ? "success"
          : "neutral";

  const headline =
    surfacedGuidance.state === "act_now"
      ? "Needs your action now"
      : surfacedGuidance.state === "waiting"
        ? "Waiting on another role"
        : surfacedGuidance.state === "blocked"
          ? "Blocked by prerequisite condition"
          : detail.releaseDecision.releasableAmount > 0
            ? "Ready-to-pay stage"
            : "Stage under watch";

  const driverLabel =
    surfacedGuidance.key === "overview"
      ? detail.decisionSummary.statusLabel
      : surfacedGuidance.status;

  const supportingDetails = [
    surfacedGuidance.summary,
    surfacedGuidance.nextStep,
    detail.releaseDecision.explanation.reason,
  ].filter((value, index, values) => value && values.indexOf(value) === index);

  return {
    headline,
    reasonCategory: mapSectionToAttentionCategory(surfacedGuidance.key),
    reasonLabel: surfacedGuidance.summary,
    requiresMyAction,
    ownerLabel: surfacedGuidance.ownerLabel ?? detail.decisionSummary.currentOwnerLabel,
    nextOwnerLabel: queuedGuidance?.ownerLabel ?? detail.decisionSummary.nextOwnerLabel,
    driverLabel,
    supportingDetails,
    tone,
  };
}

function getAttentionReasonFromActionTask(task: Pick<HomeTaskItem, "summary" | "ownerLabel" | "nextActionLabel" | "statusLabel" | "actionKey">): StageAttentionReason {
  const category: StageAttentionReason["reasonCategory"] =
    task.actionKey === "add-funds" || task.actionKey === "allocate-stage-funding" || task.actionKey === "adjust-buffer"
      ? "funding"
      : task.actionKey === "review-evidence"
        ? "evidence"
        : task.actionKey === "approve-professional" || task.actionKey === "approve-commercial" || task.actionKey === "approve-treasury"
          ? "approval"
          : task.actionKey === "review-dispute"
            ? "dispute"
            : task.actionKey === "review-variation"
              ? "variation"
              : task.actionKey === "release-funding"
                ? "release"
                : "general";

  const headline =
    task.statusLabel === "Blocked"
      ? "Blocked by prerequisite condition"
      : task.nextActionLabel
        ? "Needs your action now"
        : "Waiting on another role";

  return {
    headline,
    reasonCategory: category,
    reasonLabel: task.summary,
    requiresMyAction: Boolean(task.nextActionLabel),
    ownerLabel: task.ownerLabel,
    nextOwnerLabel: task.ownerLabel,
    driverLabel: task.statusLabel,
    supportingDetails: [task.summary, task.nextActionLabel ?? "Open the stage workspace for the next control step."],
    tone: task.statusLabel === "Blocked" ? "warning" : task.nextActionLabel ? "info" : "neutral",
  };
}

function getOutcomeState(detail: StageDetailModel): Pick<StageActionOutcomeSummary, "progressionStatus" | "stateNowLabel" | "stateNowDetail"> {
    if (detail.releaseDecision.releasableAmount > 0 && detail.releaseDecision.explanation.label !== "Cannot release") {
      return {
        progressionStatus: "advanced",
      stateNowLabel: "Ready to pay / advanced",
      stateNowDetail: detail.releaseDecision.explanation.reason,
    };
  }

  const actionableGuidance = Object.values(detail.sectionGuidance).find((guidance) => guidance.state === "act_now");
  if (actionableGuidance) {
    return {
      progressionStatus: "ready_for_next_decision",
      stateNowLabel: "Ready for next decision",
      stateNowDetail: actionableGuidance.nextStep,
    };
  }

  const waitingGuidance = Object.values(detail.sectionGuidance).find((guidance) => guidance.state === "waiting");
  if (waitingGuidance) {
    return {
      progressionStatus: "waiting_on_other_role",
      stateNowLabel: "Waiting on another role",
      stateNowDetail: `${waitingGuidance.ownerLabel} must act next.`,
    };
  }

  return {
    progressionStatus: "still_blocked",
    stateNowLabel: "Still blocked",
    stateNowDetail: detail.blockers[0]?.label ?? detail.operationalStatus.nextStep,
  };
}

function getOutcomeResultMeta(params: {
  before: StageDetailModel;
  after: StageDetailModel;
  section: StageDetailSectionKey;
  stateNow: Pick<StageActionOutcomeSummary, "progressionStatus" | "stateNowLabel" | "stateNowDetail">;
  nextOwner: string | null;
  releasedDelta: number;
  releasableDelta: number;
  defaultWhatChanged: string;
}): Pick<StageActionOutcomeSummary, "resultType" | "resultTypeLabel" | "resultHeadline" | "resultSubline" | "resultTone" | "emphasis"> {
  const { before, after, stateNow, nextOwner, releasedDelta, releasableDelta } = params;

  if (before === after) {
    return {
      resultType: "no_change",
      resultTypeLabel: "No change",
      resultHeadline: "No governed change recorded",
      resultSubline: after.sectionGuidance[params.section].nextStep,
      resultTone: "neutral",
      emphasis: "subtle",
    };
  }

  if (releasedDelta > 0) {
    return {
      resultType: "released",
      resultTypeLabel: "Payment sent",
      resultHeadline: `${dashboardCurrency.format(releasedDelta)} paid`,
      resultSubline: nextOwner ? `${nextOwner} now owns the next governed step.` : "No further release action is required now.",
      resultTone: "success",
      emphasis: "strong",
    };
  }

  if (!before.exceptionPath.hasActiveExceptionPath && after.exceptionPath.hasActiveExceptionPath) {
    return {
      resultType: "exception",
      resultTypeLabel: "Under review",
      resultHeadline: after.exceptionPath.headline,
      resultSubline: after.exceptionPath.normalPathPausedLabel ?? after.exceptionPath.returnPathLabel,
      resultTone: "warning",
      emphasis: "strong",
    };
  }

  if (stateNow.progressionStatus === "advanced") {
    return {
        resultType: "advanced",
        resultTypeLabel: releasableDelta > 0 ? "Payment available" : "Project stage updated",
        resultHeadline:
          releasableDelta > 0
            ? "Payment now available"
            : after.operationalStatus.label === "Ready for payment"
              ? "Project stage ready for payment"
              : `${after.stage.name} advanced`,
      resultSubline: releasableDelta > 0 ? after.releaseSummary.eligibleAmountLabel : stateNow.stateNowDetail,
      resultTone: "success",
      emphasis: "strong",
    };
  }

  if (stateNow.progressionStatus === "ready_for_next_decision") {
    return {
      resultType: "advanced",
      resultTypeLabel: "Ready for next decision",
      resultHeadline: "Ready for next decision",
      resultSubline: nextOwner ? `${nextOwner} can act next.` : stateNow.stateNowDetail,
      resultTone: "info",
      emphasis: "normal",
    };
  }

  if (stateNow.progressionStatus === "waiting_on_other_role") {
    return {
      resultType: "waiting",
      resultTypeLabel: nextOwner ? `Waiting on ${nextOwner}` : "Waiting on another role",
      resultHeadline: nextOwner ? `Awaiting ${nextOwner}` : "Awaiting another role",
      resultSubline: stateNow.stateNowDetail,
      resultTone: "neutral",
      emphasis: "subtle",
    };
  }

  return {
    resultType: "blocked",
    resultTypeLabel: "Still blocked",
    resultHeadline: after.blockers[0]?.label ? `Still blocked by ${after.blockers[0].label}` : "Still blocked",
    resultSubline: params.defaultWhatChanged,
    resultTone: "warning",
    emphasis: "subtle",
  };
}

function getActionOutcomeAffectedAreas(
  before: StageDetailModel,
  after: StageDetailModel,
  section: StageDetailSectionKey,
) {
  const affectedAreas = new Set<LastActionOutcome["affectedAreas"][number]>();

  if (
    before.decisionSummary.statusLabel !== after.decisionSummary.statusLabel ||
    before.operationalStatus.label !== after.operationalStatus.label ||
    before.healthDescriptor.primaryReason !== after.healthDescriptor.primaryReason
  ) {
    affectedAreas.add("stage_state");
  }

  if (
    before.releaseDecision.releasableAmount !== after.releaseDecision.releasableAmount ||
    before.releaseDecision.frozenAmount !== after.releaseDecision.frozenAmount ||
    before.releaseDecision.blockedAmount !== after.releaseDecision.blockedAmount ||
    before.fundingExplanation.headline !== after.fundingExplanation.headline ||
    section === "funding" ||
    section === "release" ||
    section === "dispute" ||
    section === "variation"
  ) {
    affectedAreas.add("funding");
  }

  if (
    before.approvalSummary.approvalProgressLabel !== after.approvalSummary.approvalProgressLabel ||
    before.approvalSummary.activeApprovalLabel !== after.approvalSummary.activeApprovalLabel ||
    section === "approvals"
  ) {
    affectedAreas.add("approvals");
  }

  if (
    before.evidenceSummary.reviewStatusLabel !== after.evidenceSummary.reviewStatusLabel ||
    before.evidenceSummary.sufficiencyLabel !== after.evidenceSummary.sufficiencyLabel ||
    section === "evidence"
  ) {
    affectedAreas.add("evidence");
  }

  return affectedAreas.size > 0 ? Array.from(affectedAreas) : (["stage_state"] as LastActionOutcome["affectedAreas"]);
}

export function getStageActionOutcomeSummary(
  before: StageDetailModel,
  after: StageDetailModel,
  section: StageDetailSectionKey,
): StageActionOutcomeSummary {
  const latestEvent = after.recentEvents[0];
  const blockerDelta = before.blockers.length - after.blockers.length;
  const releasableDelta = after.releaseDecision.releasableAmount - before.releaseDecision.releasableAmount;
  const frozenDelta = after.releaseDecision.frozenAmount - before.releaseDecision.frozenAmount;

  const defaultWhatChanged =
    latestEvent?.summary ??
    `${after.stage.name} moved to ${after.operationalStatus.label.toLowerCase()}.`;
  const stateNow = getOutcomeState(after);
  const nextStepGuidance = after.sectionGuidance[section];
  const nextOwner = getNextActionOwner(after);
  const releasedDelta = Math.max(after.stage.releasedAmount - before.stage.releasedAmount, 0);
  const resultMeta = getOutcomeResultMeta({
    before,
    after,
    section,
    stateNow,
    nextOwner: nextOwner === "No further action owner" ? null : nextOwner,
    releasedDelta,
    releasableDelta,
    defaultWhatChanged,
  });

  let whatChanged = [defaultWhatChanged];
  let unlockedItems = blockerDelta > 0 ? [`${blockerDelta} blocker${blockerDelta === 1 ? "" : "s"} cleared.`] : [];
  let nextActionLabel: string | null = nextStepGuidance.nextStep;

  if (section === "funding") {
    whatChanged = [
      after.funding.gapToRequiredCover === 0 && before.funding.gapToRequiredCover > 0
        ? "Funding is now aligned to the current WIP position."
        : `Funding gap is now ${dashboardCurrency.format(after.funding.gapToRequiredCover)} against WIP.`,
    ];
    unlockedItems =
      before.funding.gapToRequiredCover > 0 && after.funding.gapToRequiredCover === 0
        ? ["Funding no longer blocks this project stage."]
        : unlockedItems;
    nextActionLabel = after.sectionGuidance.funding.nextStep;
  } else if (section === "approvals") {
    whatChanged = [
      before.approvalState !== after.approvalState
        ? `Approval status moved from ${formatStateLabel(before.approvalState)} to ${formatStateLabel(after.approvalState)}.`
        : defaultWhatChanged,
    ];
    unlockedItems =
      before.approvalState !== "approved" && after.approvalState === "approved"
        ? [
            releasableDelta > 0
              ? "Approved value is now ready for payment."
              : "Approval is complete and the next control can continue.",
          ]
        : unlockedItems;
    nextActionLabel = after.sectionGuidance.approvals.nextStep;
  } else if (section === "evidence") {
    whatChanged = [
      before.evidenceState !== after.evidenceState
        ? `Supporting information status moved from ${formatStateLabel(before.evidenceState)} to ${formatStateLabel(after.evidenceState)}.`
        : defaultWhatChanged,
    ];
    unlockedItems =
      before.evidenceState !== "accepted" && after.evidenceState === "accepted"
        ? [
            after.approvalState === "blocked"
              ? "Supporting information is accepted, but another control still blocks progress."
              : "Supporting information is accepted and sign-offs can continue.",
          ]
        : unlockedItems;
    nextActionLabel = after.sectionGuidance.evidence.nextStep;
  } else if (section === "dispute") {
    whatChanged = [
      frozenDelta < 0
        ? `On-hold value reduced to ${dashboardCurrency.format(after.releaseDecision.frozenAmount)}.`
        : frozenDelta > 0
          ? `On-hold value increased to ${dashboardCurrency.format(after.releaseDecision.frozenAmount)}.`
          : defaultWhatChanged,
    ];
    unlockedItems =
      before.releaseDecision.frozenAmount > 0 && after.releaseDecision.frozenAmount === 0
        ? [
            releasableDelta > 0
              ? "Disputed value is cleared and approved value can now be paid."
              : "The dispute hold is cleared.",
          ]
        : unlockedItems;
    nextActionLabel = after.sectionGuidance.dispute.nextStep;
  } else if (section === "variation") {
    whatChanged = [
      before.variationSummary.status !== after.variationSummary.status
        ? `Variation moved from ${before.variationSummary.status.toLowerCase()} to ${after.variationSummary.status.toLowerCase()}.`
        : defaultWhatChanged,
    ];
    unlockedItems =
      before.variationSummary.status !== after.variationSummary.status && after.variationSummary.status === "Approved variation"
        ? ["The approved variation can now move toward activation."]
        : before.variationSummary.status !== after.variationSummary.status && after.variationSummary.status === "No variation"
          ? ["Variation review no longer blocks this project stage."]
          : unlockedItems;
    nextActionLabel = after.sectionGuidance.variation.nextStep;
  } else if (section === "release") {
    whatChanged = [
      releasedDelta > 0
        ? `${dashboardCurrency.format(releasedDelta)} has been paid from this project stage.`
        : defaultWhatChanged,
    ];
    unlockedItems =
      before.releaseDecision.explanation.label !== after.releaseDecision.explanation.label
        ? [`Payment status is now ${after.releaseDecision.explanation.label.toLowerCase()}.`]
        : before.releaseDecision.releasableAmount === 0 && after.releaseDecision.releasableAmount > 0
          ? ["Approved value is now ready to pay."]
          : unlockedItems;
    nextActionLabel = after.sectionGuidance.release.nextStep;
  }

  if (whatChanged.length === 0) {
    whatChanged = [defaultWhatChanged];
  }

  const remainingBlockers = after.blockers.map((blocker) => blocker.label);

  return {
    section,
    tone: after.blockers.length <= before.blockers.length ? "success" : "warning",
    title: resultMeta.resultHeadline,
    detail: resultMeta.resultSubline ?? after.operationalStatus.nextStep,
    resultType: resultMeta.resultType,
    resultTypeLabel: resultMeta.resultTypeLabel,
    resultHeadline: resultMeta.resultHeadline,
    resultSubline: resultMeta.resultSubline,
    resultTone: resultMeta.resultTone,
    emphasis: resultMeta.emphasis,
    whatChanged,
    unlockedItems,
    remainingBlockers,
    nextOwner: nextOwner === "No further action owner" ? null : nextOwner,
    nextActionLabel,
    progressionStatus: stateNow.progressionStatus,
    stateNowLabel: stateNow.stateNowLabel,
    stateNowDetail: stateNow.stateNowDetail,
  };
}

export function createLastActionOutcome(params: {
  actionId: string;
  section: StageDetailSectionKey;
  before: StageDetailModel;
  after: StageDetailModel;
}): LastActionOutcome {
  const outcome = getStageActionOutcomeSummary(params.before, params.after, params.section);

  return {
    actionId: params.actionId,
    timestamp: Date.now(),
    result:
      outcome.resultType === "released"
        ? "released"
        : outcome.resultType === "exception"
          ? "exception"
          : outcome.resultType === "waiting"
            ? "waiting"
            : outcome.resultType === "advanced"
              ? "advanced"
              : "blocked",
    summary: outcome.resultHeadline,
    affectedAreas: getActionOutcomeAffectedAreas(params.before, params.after, params.section),
  };
}

export function recordLastActionOutcome(state: SystemStateRecord, stageId: string, outcome: LastActionOutcome) {
  state.lastActionOutcomes = {
    ...(state.lastActionOutcomes ?? {}),
    [stageId]: outcome,
  };
}

export function getLastActionOutcome(state: SystemStateRecord, stageId: string): LastActionOutcome | null {
  return state.lastActionOutcomes?.[stageId] ?? null;
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
      const projectFunding = getFundingSummary(state, stage.projectId);
      const evidenceViews = getEvidenceViews(state, stage.id).filter((entry) => entry.required);
      const pendingEvidenceCount = evidenceViews.filter((entry) => entry.record?.status !== "accepted").length;
      const pendingApprovals = getPendingApprovalRoles(state, stage);
      const openDisputes = getOpenDisputes(stage);
      const pendingVariations = getPendingVariations(stage);
      const approvedVariations = getApprovedVariations(stage).filter((variation) => variation.status === "approved");
      const operationalStatus = getOperationalStageStatus(state, stage);
      const disputeSummary = getDisputeOperationalSummary(state, stage);
      const variationSummary = getVariationOperationalSummary(stage);

      if (openDisputes.length > 0 && disputeSummary.releasableValue === 0) {
        pushGroupedStageAction(groups, {
          actionType: "review_dispute",
          actionableBy: "commercial",
          priority: "critical",
          title: `Resolve dispute for ${stage.name}`,
          detail: "Funds frozen due to dispute.",
        });
      } else if (variationSummary.blocking) {
        const firstPendingVariation = pendingVariations[0];
        const actionableBy =
          firstPendingVariation && firstPendingVariation.commercialApprovedAt && !firstPendingVariation.treasuryApprovedAt
            ? "treasury"
            : "commercial";
        pushGroupedStageAction(groups, {
          actionType: "review_variation",
          actionableBy,
          priority: "critical",
          title: `Review variation for ${stage.name}`,
          detail: variationSummary.reason,
        });
      } else if (pendingEvidenceCount > 0) {
        pushGroupedStageAction(groups, {
          actionType: "review_evidence",
          actionableBy: "professional",
          priority: evidenceViews.some((entry) => entry.record === null) ? "critical" : "high",
          title: `Clear evidence for ${stage.name}`,
          detail: "Evidence incomplete.",
        });
      } else if (pendingApprovals.length > 0) {
        const nextRole = pendingApprovals[0];
        pushGroupedStageAction(groups, {
          actionType: "approve_stage",
          actionableBy: nextRole,
          priority: "high",
          title: `Approve ${stage.name}`,
          detail: "Approval incomplete.",
        });
      } else if (approvedVariations.length > 0) {
        pushGroupedStageAction(groups, {
          actionType: "activate_variation",
          actionableBy: "treasury",
          priority: "high",
          title: `Activate approved variation for ${stage.name}`,
          detail: "Approved variation is waiting for activation.",
        });
      } else if (blockers.length > 0) {
        pushGroupedStageAction(groups, {
          actionType: "resolve_blockers",
          actionableBy: "system",
          priority: blockers.some((blocker) => blocker.priority === "critical") ? "critical" : "medium",
          title: `Resolve blocker for ${stage.name}`,
          detail: blockers[0].label,
        });
      } else if (disputeSummary.releasableValue > 0) {
        pushGroupedStageAction(groups, {
          actionType: "release_funding",
          actionableBy: "treasury",
          priority: "high",
          title: `Release ${stage.name}`,
          detail: "Can release.",
        });
      }

      const groupedActions = Array.from(groups.values());

      if (groupedActions.length === 0) {
        return null;
      }

      const primaryAction = getPrimaryGroupedAction(groupedActions);
      const priority = groupedActions.reduce(
        (current, group) =>
          getActionPriorityRank(group.priority) < getActionPriorityRank(current) ? group.priority : current,
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
        operationalStatus,
        primaryAction,
        groupedActions,
      } satisfies FundingActionQueueItem;
    })
    .filter((item): item is FundingActionQueueItem => item !== null);

  return items.sort((left, right) => {
    const priorityDelta = getActionPriorityRank(left.priority) - getActionPriorityRank(right.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const blockedStagesFirst = Number(right.operationalStatus.tone === "blocked") - Number(left.operationalStatus.tone === "blocked");
    if (blockedStagesFirst !== 0) {
      return blockedStagesFirst;
    }

    return left.stageName.localeCompare(right.stageName);
  });
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
  const disputeSummary = getDisputeOperationalSummary(state, stage);
  const variationSummary = getVariationOperationalSummary(stage);
  const projectFunding = getFundingSummary(state, stage.projectId);
  const actingRole = getActingRoleSummary(user.role);
  const canAddEvidence = ["contractor", "commercial"].includes(user.role);
  const canReviewEvidence = user.role === "professional";
  const canFundStage = user.role === "treasury";
  const canApplyOverride = user.role === "treasury";
  const canRelease = user.role === "treasury";
  const canOpenDispute = ["contractor", "commercial"].includes(user.role);
  const canResolveDispute = ["commercial", "treasury"].includes(user.role);
  const canCreateVariation = ["contractor", "commercial"].includes(user.role);
  const canReviewVariation = ["commercial", "treasury"].includes(user.role);
  const canActivateVariation = user.role === "treasury";
  const availableActions = {
    addEvidence: canAddEvidence,
    addEvidenceReason: getPermissionReason(canAddEvidence, "Project Manager or Commercial", "Supporting items can be added in this role."),
    reviewEvidence: canReviewEvidence,
    reviewEvidenceReason: getPermissionReason(canReviewEvidence, "Evidence reviewer", "Evidence decisions can be recorded in this role."),
    fundStage: canFundStage,
    fundStageReason: getPermissionReason(canFundStage, "Funder", "Funder can allocate funds to this project stage."),
    applyOverride: canApplyOverride,
    applyOverrideReason: getPermissionReason(canApplyOverride, "Funder", "Funder can apply a governed override."),
    release: canRelease,
    releaseReason: getPermissionReason(canRelease, "Funder", "Funder can send payment when checks are clear."),
    openDispute: canOpenDispute,
    openDisputeReason: getPermissionReason(canOpenDispute, "Project Manager or Commercial", "A dispute can be raised in this role."),
    resolveDispute: canResolveDispute,
    resolveDisputeReason: getPermissionReason(canResolveDispute, "Commercial or Funder", "The dispute can be resolved in this role."),
    createVariation: canCreateVariation,
    createVariationReason: getPermissionReason(canCreateVariation, "Project Manager or Commercial", "A variation can be proposed in this role."),
    reviewVariation: canReviewVariation,
    reviewVariationReason: getPermissionReason(canReviewVariation, "Commercial or Funder", "Variation review is available in this role."),
    activateVariation: canActivateVariation,
    activateVariationReason: getPermissionReason(canActivateVariation, "Funder", "Funder can activate an approved variation."),
  };
  const approvals = stage.requiredApprovalRoles.map((role) => {
    const approval = state.approvals.find((entry) => entry.stageId === stageId && entry.role === role);
    const canAct = user.role === role && canApprovalRoleAct(state, stage, role) && approval?.status !== "approved";
    const sequenceBlocked = Boolean(stage.approvalSequence?.length) && !canApprovalRoleAct(state, stage, role);
    const placeholderReadinessState: StageActionReadiness["readinessState"] =
      canAct ? "available" : approval?.status === "approved" ? "complete" : "waiting_on_prerequisite";
    const placeholderTone: StageActionReadiness["tone"] =
      approval?.status === "approved" ? "success" : canAct ? "info" : "warning";

    return {
      id: approval?.id ?? `${stageId}-${role}`,
      role,
      status: approval?.status ?? "pending",
      canAct,
      sequenceBlocked,
      unavailableReason:
        approval?.status === "approved"
          ? "Approval already completed."
          : sequenceBlocked
            ? "Waiting for the earlier approval step."
            : canAct
              ? `${getUserFacingRoleLabel(role)} can act now.`
              : `${getUserFacingRoleLabel(role)} role required.`,
      readiness: {
        actionKey: `approval-${role}`,
        label: `${getUserFacingRoleLabel(role)} approval`,
        isAvailable: canAct,
        readinessState: placeholderReadinessState,
        reasonLabel:
          approval?.status === "approved"
            ? "Approval already completed."
            : sequenceBlocked
              ? "Waiting for the earlier approval step."
              : canAct
                ? `${getUserFacingRoleLabel(role)} can act now.`
                : `${getUserFacingRoleLabel(role)} role required.`,
        missingPrerequisites: [],
        nextConditionLabel: null,
        nextOwnerLabel: getUserFacingRoleLabel(role),
        tone: placeholderTone,
      },
    };
  });
  const approvalState = getApprovalStateSummary(state, stage);
  const evidenceState = getEvidenceState(state, stageId);
  const operationalStatus = getOperationalStageStatus(state, stage);
  const stageBlockers = getStageBlockers(state, stageId);
  const sectionGuidance = getStageSectionGuidance({
    state,
    stage,
    user,
    funding,
    operationalStatus,
    releaseDecision,
    disputeSummary,
    variationSummary,
    evidenceState,
    approvalState,
    approvals,
    availableActions,
  });
  const actionReadiness = getStageActionReadinessModel({
    availableActions,
    sectionGuidance,
    funding,
    releaseDecision,
    approvalState,
    evidenceState,
    blockers: stageBlockers,
    variationSummary,
    disputeSummary,
  });
  const hydratedApprovals = approvals.map((approval) => ({
    ...approval,
    readiness: getApprovalReadiness(approval, {
      sectionGuidance,
      approvalState,
      evidenceState,
    }),
  }));
  const evidenceViews = getEvidenceViews(state, stageId);

  if (!project) {
    throw new Error(`Unable to derive stage detail for ${stageId}`);
  }

  const decisionSummary = getStageDecisionSummary({
    operationalStatus,
    releaseDecision,
    blockers: stageBlockers,
    sectionGuidance,
  });
  const attentionReason = getStageAttentionReason({
    sectionGuidance,
    blockers: stageBlockers,
    releaseDecision,
    decisionSummary,
    availableActions,
    approvals: hydratedApprovals,
    actingRole,
  });
  const roleHandoff = getStageRoleHandoff({
    actingRole,
    sectionGuidance,
    decisionSummary,
    attentionReason,
    blockers: stageBlockers,
    operationalStatus,
    releaseDecision,
  });
  const exitState = getStageExitState({
    stage,
    operationalStatus,
    releaseDecision,
    disputeSummary,
    variationSummary,
    blockers: stageBlockers,
    decisionSummary,
  });
  const exceptionPath = getStageExceptionPath({
    stage,
    releaseDecision,
    disputeSummary,
    variationSummary,
    blockers: stageBlockers,
    roleHandoff,
    decisionSummary,
    operationalStatus,
  });
  const fundingExplanation = getStageFundingExplanation({
    stage,
    funding,
    projectFunding,
    reserveBuffer: project.reserveBuffer,
    releaseDecision,
  });
  const releaseSummary = getStageReleaseDecisionSummary({
    stage,
    releaseDecision,
    fundingExplanation,
    blockers: stageBlockers,
    exceptionPath,
  });
  const evidenceSummary = getStageEvidenceSummary({
    evidence: evidenceViews,
    evidenceState,
    sectionGuidance,
    actionReadiness,
    blockers: stageBlockers,
  });
  const approvalSummary = getStageApprovalSummary({
    approvals: hydratedApprovals,
    approvalState,
    sectionGuidance,
    blockers: stageBlockers,
  });
  const healthDescriptor = getStageHealthDescriptor({
    blockers: stageBlockers,
    fundingExplanation,
    approvalSummary,
    evidenceSummary,
    releaseSummary,
    exceptionPath,
    exitState,
    roleHandoff,
  });
  const casePathSummary = getStageCasePathSummary({
    disputeSummary,
    variationSummary,
    blockers: stageBlockers,
    roleHandoff,
    exceptionPath,
    sectionGuidance,
  });
  const roleViewGuidance = getStageRoleViewGuidance({
    actingRole,
    decisionSummary,
    attentionReason,
    roleHandoff,
    exitState,
    exceptionPath,
    releaseSummary,
    evidenceSummary,
    approvalSummary,
    casePathSummary,
    fundingExplanation,
  });
  const entryOrientation = getStageEntryOrientation({
    attentionReason,
    roleHandoff,
    exitState,
    exceptionPath,
    releaseSummary,
    fundingExplanation,
    evidenceSummary,
    approvalSummary,
    sectionGuidance,
    roleViewGuidance,
  });
  const topSurfaceGuidance = getStageTopSurfaceGuidance({
    decisionSummary,
    attentionReason,
    actionReadiness,
    roleHandoff,
    exceptionPath,
    exitState,
    releaseSummary,
    fundingExplanation,
    evidenceSummary,
    approvalSummary,
    casePathSummary,
    roleViewGuidance,
    entryOrientation,
  });
  const {
    actionDescriptors,
    actionDescriptorMap,
    approvals: approvalsWithDescriptors,
    evidence: evidenceWithDescriptors,
    disputes: disputesWithDescriptors,
    variations: variationsWithDescriptors,
  } = getStageDerivedActionDescriptors({
    entryOrientation,
    operationalStatus,
    funding,
    fundingExplanation,
    releaseDecision,
    releaseSummary,
    disputeSummary,
    variationSummary,
    actionReadiness,
    evidenceSummary,
    approvalSummary,
    approvals: hydratedApprovals,
    evidence: evidenceViews,
    disputes: (stage.disputes ?? []).map((dispute) => ({
      ...dispute,
      canResolve: dispute.status === "open" && canResolveDispute,
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
      operationalStatusLabel:
        variation.status === "pending"
          ? "Pending review"
          : variation.status === "approved" || variation.status === "active"
            ? "Approved variation"
            : "Disputed variation",
    })),
    exceptionPath,
  });

  return {
    projectName: project.name,
    projectLocation: stage.projectLocation,
    stageDescription: stage.description,
    plannedStartDate: stage.plannedStartDate,
    plannedEndDate: stage.plannedEndDate,
    stage,
    blockers: stageBlockers,
    decisionSummary,
    fundingExplanation,
    roleHandoff,
    exitState,
    exceptionPath,
    releaseSummary,
    evidenceSummary,
    approvalSummary,
    healthDescriptor,
    casePathSummary,
    attentionReason,
    roleViewGuidance,
    entryOrientation,
    topSurfaceGuidance,
    operationalStatus,
    releaseDecision,
    treasuryReadiness: releaseDecision.treasuryReadiness,
    funding,
    fundingStatusLabel:
      projectFunding.shortfall === 0 ? "Covered by balance" : "Overcommitted",
    blockingRelease: !releaseDecision.releasable,
    lastUpdatedAt: getStageLastUpdatedAt(state, stageId),
    lastDecisionAt: getStageLastDecisionAt(state, stageId),
    notificationCue: getStageActivityCue(state, stageId),
    recentEvents: getRecentStageEvents(state, stageId, 5),
    timelineEntries: getStageTimeline(state, stageId, 6),
    certifiedValue: stage.requiredAmount,
    payableValue: getPayableValue(stage),
    frozenValue: getFrozenValue(stage),
    disputeSummary,
    variationSummary,
    evidenceState,
    approvalState,
    disputes: disputesWithDescriptors,
    variations: variationsWithDescriptors,
    evidence: evidenceWithDescriptors,
    approvals: approvalsWithDescriptors,
    actionDescriptors,
    actionDescriptorMap,
    actionReadiness,
    ledgerTransactions: getLedgerTransactions(state, stage.projectId, stageId),
    actingRole,
    sectionGuidance,
    availableActions,
  };
}

export function deriveActionDescriptors(
  stage: SystemStageRecord,
  role: FundingUserRole,
  systemState: SystemStateRecord,
): DerivedActionDescriptor[] {
  const matchingUser = systemState.users.find((user) => user.role === role) ?? getUserRecord(systemState);
  return getStageDetail(systemState, stage.id, matchingUser.id).actionDescriptors;
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
        summary: `On-hold value ${detail.frozenValue.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} is under dispute.`,
        tone: "frozen",
      });
    }

    if (detail.releaseDecision.releasable && detail.payableValue > 0 && ["treasury", "funder", "commercial"].includes(role)) {
      stageItems.push({
        stageId: detail.stage.id,
        stageName: detail.stage.name,
        summary: `Ready-to-pay value ${detail.payableValue.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} is available for payment.`,
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
        ? "Funder payment journey"
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
  appendSystemEvent(nextState, {
    timestamp,
    stageId,
    eventType: "funding",
    actor: getUserRecord(nextState, userId).role,
    summary: stageId ? `Funding added for ${getStageDetail(nextState, stageId).stage.name}.` : "Project funding added.",
    details: {
      projectId,
      amount,
      sourceType,
    },
  });
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
  appendSystemEvent(nextState, {
    timestamp,
    stageId,
    eventType: "funding",
    actor: getUserRecord(nextState, userId).role,
    summary: `Funding allocated to ${stage.name}.`,
    details: {
      projectId: stage.projectId,
      amount: transferAmount,
    },
  });
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
  options?: {
    userId?: string;
    reason?: string;
  },
): SystemStateRecord {
  const userId = options?.userId ?? state.currentUserId;
  if (getUserRecord(state, userId).role !== "professional") {
    return state;
  }

  const decisionReason = options?.reason?.trim();
  if ((status === "rejected" || status === "requires_more") && !decisionReason) {
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
  appendSystemEvent(nextState, {
    timestamp: nowIso(),
    stageId: requirement.stageId,
    eventType: "evidence",
    actor: getUserRecord(nextState, userId).role,
    summary: `Evidence ${status.replaceAll("_", " ")} for ${getStageDetail(nextState, requirement.stageId).stage.name}.`,
    details: {
      projectId: getStageDetail(nextState, requirement.stageId).stage.projectId,
      requirementId,
      status,
      reason: decisionReason ?? null,
    },
  });
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
  appendSystemEvent(nextState, {
    timestamp: nowIso(),
    stageId,
    eventType: "evidence",
    actor: getUserRecord(nextState, userId).role,
    summary: `Evidence submitted for ${getStageDetail(nextState, stageId).stage.name}.`,
    details: {
      projectId: getStageDetail(nextState, stageId).stage.projectId,
      title: title.trim(),
      evidenceType: type,
    },
  });
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
  appendSystemEvent(nextState, {
    timestamp: nowIso(),
    stageId,
    eventType: "dispute",
    actor: getUserRecord(nextState, userId).role,
    summary: `Dispute raised for ${nextStage.name}.`,
    details: {
      projectId: nextStage.projectId,
      amount: Math.min(disputedAmount, availableToFreeze),
      title: title.trim(),
    },
  });
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
  appendSystemEvent(nextState, {
    timestamp: dispute.resolvedAt,
    stageId,
    eventType: "dispute",
    actor: getUserRecord(nextState, userId).role,
    summary: `Dispute resolved for ${stage.name}.`,
    details: {
      projectId: stage.projectId,
      amount: dispute.disputedAmount,
      disputeId,
    },
  });
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
  appendSystemEvent(nextState, {
    timestamp: nowIso(),
    stageId,
    eventType: "variation",
    actor: getUserRecord(nextState, userId).role,
    summary: `Variation created for ${stage.name}.`,
    details: {
      projectId: stage.projectId,
      amountDelta,
      title: title.trim(),
    },
  });
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
  options?: {
    userId?: string;
    reason?: string;
  },
): SystemStateRecord {
  const userId = options?.userId ?? state.currentUserId;
  const actor = getUserRecord(state, userId);
  const decisionReason = options?.reason?.trim();

  if (!["commercial", "treasury"].includes(actor.role)) {
    return state;
  }

  if (decision === "rejected" && !decisionReason) {
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
  appendSystemEvent(nextState, {
    timestamp: nowIso(),
    stageId,
    eventType: "variation",
    actor: getUserRecord(nextState, userId).role,
    summary:
      decision === "approved"
        ? `Variation approved for ${stage.name}.`
        : `Variation rejected for ${stage.name}.`,
    details: {
      projectId: stage.projectId,
      variationId,
      decision,
      reason: decisionReason ?? null,
    },
  });
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
  appendSystemEvent(nextState, {
    timestamp: variation.activatedAt,
    stageId,
    eventType: "variation",
    actor: getUserRecord(nextState, userId).role,
    summary: `Variation activated for ${stage.name}.`,
    details: {
      projectId: stage.projectId,
      variationId,
      amountDelta: variation.amountDelta,
    },
  });
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
  options?: {
    userId?: string;
    reason?: string;
  },
): SystemStateRecord {
  const userId = options?.userId ?? state.currentUserId;
  const actor = getUserRecord(state, userId);
  const stage = state.stages.find((entry) => entry.id === stageId);
  const stageStatus = stage ? getDerivedStageStatus(state, stage) : null;
  const decisionReason = options?.reason?.trim();

  if (
    !stage ||
    actor.role !== role ||
    !["ready", "partially_approved", "disputed"].includes(stageStatus ?? "") ||
    !canApprovalRoleAct(state, stage, role)
  ) {
    return state;
  }

  if (decision === "rejected" && !decisionReason) {
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
  appendSystemEvent(nextState, {
    timestamp: nowIso(),
    stageId,
    eventType: "approval",
    actor: getUserRecord(nextState, userId).role,
    summary: `${role[0].toUpperCase()}${role.slice(1)} approval ${decision} for ${getStageDetail(nextState, stageId).stage.name}.`,
    details: {
      projectId: getStageDetail(nextState, stageId).stage.projectId,
      role,
      decision,
      reason: decisionReason ?? null,
    },
  });
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
  return decideApproval(state, stageId, role, "approved", { userId });
}

export function rejectApproval(
  state: SystemStateRecord,
  stageId: string,
  role: FundingApprovalRole,
  reason: string,
  userId = state.currentUserId,
): SystemStateRecord {
  return decideApproval(state, stageId, role, "rejected", { userId, reason });
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
  appendSystemEvent(nextState, {
    timestamp: nextState.stages.find((stage) => stage.id === stageId)?.override?.timestamp ?? nowIso(),
    stageId,
    eventType: "release",
    actor: getUserRecord(nextState, userId).role,
    summary: `Funder override applied for ${getStageDetail(nextState, stageId).stage.name}.`,
    details: {
      projectId: getStageDetail(nextState, stageId).stage.projectId,
      reason: reason.trim(),
      override: true,
    },
  });
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
  const releaseAmount = Math.min(stageAccountBalance, decision.releasableAmount);

  if (releaseAmount <= 0) {
    return state;
  }

  nextState.ledgerEntries.push({
    id: randomId("entry"),
    accountId: getStageAccount(nextState, stageId).id,
    amount: -releaseAmount,
    type: "release",
    reference: decision.overridden
      ? `Override payment ${stage.name}`
      : decision.isPartialRelease
        ? `Part payment ${stage.name}`
        : `Payment ${stage.name}`,
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
  appendSystemEvent(nextState, {
    timestamp: nowIso(),
    stageId,
    eventType: "release",
    actor: getUserRecord(nextState, userId).role,
    summary: `Paid ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(releaseAmount)} for ${stage.name}.`,
    details: {
      projectId: stage.projectId,
      amount: releaseAmount,
      partialRelease: decision.isPartialRelease,
      override: decision.overridden,
    },
  });
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
