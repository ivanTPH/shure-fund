import type { ActionType } from "./actionConfig";
import type { PriorityKey } from "./priorityConfig";
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

export type Role = Exclude<UserRole, "admin"> | "All";

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

export function deriveFundingSummaryMetrics(funding: FundingPosition): FundingSummaryMetric[] {
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

export function getActionQueue({
  stages,
  project,
  calculateFundingPosition,
}: ActionQueueInput): ActionQueueItem[] {
  const funding = calculateFundingPosition(project);
  return deriveReleaseControlModel(stages as StageRecord[], funding).actionQueue;
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
