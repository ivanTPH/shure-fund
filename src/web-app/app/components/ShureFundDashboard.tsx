"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import {
  activateVariation,
  addEvidence,
  allocateStageFunds,
  applyOverride,
  createVariation,
  approveRequest,
  createLastActionOutcome,
  type DerivedActionDescriptor,
  depositFunds,
  getActionQueue,
  getDashboardDecisionPack,
  getFundingSummary,
  getFundingSummarySentence,
  getLedgerTransactions,
  getOperationalSummary,
  getProjectActivitySummary,
  getProjectStageCurrentSteps,
  getPrimaryActionForRole,
  getProjectWorkspaceSummary,
  getRequestDecisionState,
  getResponsibilityCue,
  getReleaseDecisions,
  getLastActionOutcome,
  getRoleInboxItems,
  getRoleJourneySummary,
  getStageBlockers,
  getStageDetail,
  getUserFacingRoleLabel,
  giveApproval,
  openDispute,
  rejectRequest,
  rejectApproval,
  releaseStage,
  recordLastActionOutcome,
  resolveDispute,
  requestInfo,
  type StageDetailModel,
  reviewVariation,
  updateEvidenceStatus,
  type DashboardAudienceMode,
  type StageDetailSectionKey,
} from "@/lib/systemState";
import type {
  EvidenceStatus,
  EvidenceType,
  FundingSourceType,
  SystemStateRecord,
} from "@/lib/shureFundModels";
import type { WorkspaceDecisionCue } from "@/lib/systemState";
import ApprovalPanel from "./ApprovalPanel";
import EvidencePanel from "./EvidencePanel";
import JourneySummaryCard from "./JourneySummaryCard";
import LedgerSummaryCard from "./LedgerSummaryCard";
import LedgerTransactionsList from "./LedgerTransactionsList";
import StageDetailPanel from "./StageDetailPanel";
import { useShureFundShellState, type AppSection } from "./ShureFundAppShell";
import { activeControl, disabledControl, hiddenControl, isControlActive, shouldShowControl, uiControlChecklist } from "./uiCapability";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const priorityStyles = {
  critical: "bg-slate-900 text-white",
  high: "bg-teal-100 text-teal-900",
  medium: "bg-cyan-100 text-cyan-900",
} as const;

const statusStyles = {
  blocked: "bg-slate-200 text-slate-900",
  in_review: "bg-cyan-100 text-cyan-900",
  ready: "bg-teal-100 text-teal-900",
  partially_approved: "bg-teal-50 text-teal-900",
  approved: "bg-cyan-50 text-cyan-900",
  partially_released: "bg-cyan-100 text-cyan-900",
  released: "bg-slate-950 text-white",
  disputed: "bg-slate-100 text-slate-900",
  on_hold: "bg-teal-50 text-teal-900",
} as const;

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-slate-200/70 bg-white/96 p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.35)]">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

const sectionMeta: Record<AppSection, { title: string; subtitle: string }> = {
  actions: {
    title: "Notifications",
    subtitle: "Background notifications open the relevant project stage and take you straight to the next governed step.",
  },
  summary: {
    title: "Project summary",
    subtitle: "Current project position, the next control to clear, and the project stages that need attention now.",
  },
  payments: {
    title: "Payments",
    subtitle: "Funding status, payment readiness, and value ready for payment or held back by live controls.",
  },
  packages: {
    title: "Projects",
    subtitle: "Follow the live commercial journey for the current project: Project, Project stage, Assigned roles, Funding status, Supporting information, Approval path, and Payment.",
  },
  activity: {
    title: "Activity",
    subtitle: "Recent governed actions, audit history, and outstanding payment work.",
  },
  settings: {
    title: "Account",
    subtitle: "Account, organisation, invitations, and platform configuration entry points.",
  },
};


function ExpandableSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  open,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  return (
    <details
      open={open ?? defaultOpen}
      onToggle={(event) => onToggle?.((event.currentTarget as HTMLDetailsElement).open)}
      className="rounded-[28px] border border-slate-200/70 bg-slate-50/75 p-5 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.3)]"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">Details</span>
        </div>
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}

function RequestStepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.35)]">
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{title}</p>
        {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function formatRelativeTime(timestamp?: string | null) {
  if (!timestamp) {
    return "No recent activity";
  }

  const deltaMs = Math.max(Date.now() - new Date(timestamp).getTime(), 0);
  const minutes = Math.round(deltaMs / 60000);
  const hours = Math.round(deltaMs / 3600000);
  const days = Math.round(deltaMs / 86400000);

  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatReadOnlyDate(timestamp?: string | null) {
  if (!timestamp) {
    return "Not carried in this prototype";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function getActionButtonClass(descriptor: DerivedActionDescriptor, disabled: boolean, primary = false) {
  if (primary) {
    return disabled
      ? "w-full rounded-2xl bg-slate-300 px-4 py-4 text-left text-sm font-medium text-white"
      : descriptor.confidence === "high"
        ? "w-full rounded-2xl bg-slate-950 px-4 py-4 text-left text-sm font-medium text-white"
        : "w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-left text-sm font-medium text-slate-950";
  }

  return disabled
    ? "w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-400"
    : "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900";
}

function getStageSurfaceActionLabel(detail: StageDetailModel, hasRequest: boolean) {
  if (detail.actionReadiness.release.isAvailable && detail.releaseDecision.releasable) {
    return detail.actionDescriptorMap["release"]?.label ?? "Release payment";
  }

  if (detail.actionReadiness.fundStage.isAvailable && detail.funding.gapToRequiredCover > 0) {
    return detail.actionDescriptorMap["fund-stage"]?.label ?? "Allocate funds";
  }

  if (hasRequest) {
    return "Open stage";
  }

  return "Open project stage";
}

function getOutcomeHeadline(outcome: { actionId: string; summary: string } | null | undefined) {
  if (!outcome) return "";
  if (outcome.actionId === "release:execute") return "Payment sent";
  if (outcome.actionId.includes(":approve") || outcome.actionId === "review-variation-approve") return "Approved";
  if (outcome.actionId.includes(":reject") || outcome.actionId.includes("-rejected")) return "Rejected";
  if (outcome.actionId.includes("requires_more")) return "Information requested";
  if (outcome.actionId === "dispute:open") return "Dispute opened";
  if (outcome.actionId.includes("dispute:") && outcome.actionId.endsWith(":resolve")) return "Dispute resolved";
  if (outcome.actionId === "funding:allocate") return "Funds allocated";
  if (outcome.actionId === "evidence:add") return "Information added";
  return outcome.summary;
}

function getOutcomeTrustLine(outcome: { actionId: string } | null | undefined, detail: StageDetailModel) {
  if (!outcome) return "Recorded just now.";
  if (outcome.actionId === "release:execute") return "Recorded just now. All actions are logged.";
  if (outcome.actionId === "funding:allocate") return "Funds secured. Recorded just now.";
  if (outcome.actionId.includes(":approve") || outcome.actionId === "review-variation-approve") {
    return "Approval recorded. All actions are logged.";
  }
  if (outcome.actionId.includes(":reject") || outcome.actionId.includes("requires_more")) {
    return "Reason recorded. All actions are logged.";
  }
  return detail.releaseDecision.releasable
    ? "Funds secured. All actions are logged."
    : "Recorded just now. All actions are logged.";
}

export default function ShureFundDashboard({
  section,
  workflowOnly = false,
}: {
  section: AppSection;
  workflowOnly?: boolean;
}) {
  const {
    state,
    setState,
    audienceMode,
    setAudienceMode,
    selectedProjectId,
    setSelectedProjectId,
    selectedStageId,
    setSelectedStageId,
    selectedStageSection,
    setSelectedStageSection,
    activeRequestId,
    setActiveRequestId,
    showStageDetail,
    setShowStageDetail,
    selectedWorkspaceCue,
    setSelectedWorkspaceCue,
  } = useShureFundShellState();
  const router = useRouter();
  const pathname = usePathname();
  const [depositAmount, setDepositAmount] = useState("50000");
  const [fundingSource, setFundingSource] = useState<FundingSourceType | "">("");
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [showFundingCalculation, setShowFundingCalculation] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("file");
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeAmount, setDisputeAmount] = useState("15000");
  const [variationTitle, setVariationTitle] = useState("");
  const [variationReason, setVariationReason] = useState("");
  const [variationAmount, setVariationAmount] = useState("10000");
  const [approvalRejectReasons, setApprovalRejectReasons] = useState<Record<string, string>>({});
  const [evidenceReviewReasons, setEvidenceReviewReasons] = useState<Record<string, string>>({});
  const [variationRejectReasons, setVariationRejectReasons] = useState<Record<string, string>>({});
  const [activeDecisionComposerId, setActiveDecisionComposerId] = useState<string | null>(null);
  const [requestFinalConfirmation, setRequestFinalConfirmation] = useState<{ action: "approve" | "reject"; consequence: string } | null>(null);
  const [lockedRequestReceipt, setLockedRequestReceipt] = useState<{
    requestId: string;
    projectName: string;
    stageName: string;
    title: string;
    outcomeHeadline: string;
    outcomeLine: string;
  } | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [requestDecisionNote, setRequestDecisionNote] = useState("");
  const project = state.projects.find((entry) => entry.id === selectedProjectId) ?? state.projects[0];
  const currentUser = state.users.find((entry) => entry.id === state.currentUserId)!;
  const projectStages = useMemo(() => state.stages.filter((stage) => stage.projectId === project.id), [state, project.id]);
  const activeStageId = projectStages.some((stage) => stage.id === selectedStageId)
    ? selectedStageId
    : projectStages[0]?.id ?? selectedStageId;
  const fundingSummary = useMemo(() => getFundingSummary(state, project.id), [state, project.id]);
  const actionQueue = useMemo(() => getActionQueue(state, project.id), [state, project.id]);
  const releaseDecisions = useMemo(() => getReleaseDecisions(state, project.id), [state, project.id]);
  const controlSummary = useMemo(() => getOperationalSummary(state, project.id), [state, project.id]);
  const stageDetail = useMemo(() => getStageDetail(state, activeStageId), [state, activeStageId]);
  const lastActionOutcome = useMemo(() => getLastActionOutcome(state, activeStageId), [state, activeStageId]);
  const stageBlockers = useMemo(() => getStageBlockers(state, activeStageId), [state, activeStageId]);
  const ledgerTransactions = useMemo(() => getLedgerTransactions(state, project.id), [state, project.id]);
  const journey = useMemo(() => getRoleJourneySummary(state, project.id, currentUser.role), [state, project.id, currentUser.role]);
  const decisionPack = useMemo(() => getDashboardDecisionPack(state, project.id), [state, project.id]);
  const projectActivity = useMemo(() => getProjectActivitySummary(state, project.id), [state, project.id]);
  const currentProjectInbox = useMemo(() => getRoleInboxItems(state, currentUser.role, project.id), [state, currentUser.role, project.id]);
  const allProjectInbox = useMemo(() => getRoleInboxItems(state, currentUser.role), [state, currentUser.role]);
  const shortfallActive = fundingSummary.shortfall > 0;
  const fundingSummarySentence = getFundingSummarySentence(fundingSummary);
  const crossProjectAttentionCount = allProjectInbox.filter((item) => item.projectId !== project.id).length;
  const projectDirectory = useMemo(
    () =>
      state.projects.map((entry) => ({
        projectId: entry.id,
        projectName: entry.name,
        workspaceSummary: getProjectWorkspaceSummary(state, entry.id),
        requestCount: getRoleInboxItems(state, currentUser.role, entry.id).length,
        fundingSummary: getFundingSummary(state, entry.id),
        isCurrent: entry.id === project.id,
      })),
    [state, currentUser.role, project.id],
  );
  const projectStageCurrentSteps = useMemo(() => getProjectStageCurrentSteps(state, project.id), [state, project.id]);
  const nextRequiredAction = projectStageCurrentSteps[0] ?? null;

  const selectedDecision = releaseDecisions.find((entry) => entry.stageId === activeStageId)!;
  const primaryAction = useMemo(() => getPrimaryActionForRole(state, project.id, currentUser.role), [state, project.id, currentUser.role]);
  const projectLeadAction = actionQueue[0] ?? null;
  const primaryResponsibilityCue = primaryAction
    ? getResponsibilityCue(primaryAction.primaryAction.actionableBy, primaryAction.primaryAction.actionType)
    : null;
  const blockerSummaryText =
    stageBlockers.length === 0
      ? "No active blockers."
      : stageBlockers.length === 1
        ? stageBlockers[0].label
        : `${stageBlockers[0].label} + ${stageBlockers.length - 1} more blocker${stageBlockers.length - 1 === 1 ? "" : "s"}.`;
  const parsedDepositAmount = Number(depositAmount);
  const parsedDisputeAmount = Number(disputeAmount);
  const parsedVariationAmount = Number(variationAmount);
  const canAddFunds =
    !isAddingFunds &&
    Number.isFinite(parsedDepositAmount) &&
    parsedDepositAmount > 0 &&
    (fundingSource === "funder" || fundingSource === "contractor");
  const canApplyOverride = stageDetail.actionReadiness.applyOverride.isAvailable && overrideReason.trim().length > 0;
  const canFundStage = stageDetail.actionReadiness.fundStage.isAvailable && stageDetail.funding.gapToRequiredCover > 0;
  const canReleaseStage = stageDetail.actionReadiness.release.isAvailable && stageDetail.releaseDecision.releasable;
  const canOpenDispute =
    stageDetail.actionReadiness.openDispute.isAvailable &&
    disputeTitle.trim().length > 0 &&
    disputeReason.trim().length > 0 &&
    Number.isFinite(parsedDisputeAmount) &&
    parsedDisputeAmount > 0;
  const canCreateVariation =
    stageDetail.actionReadiness.createVariation.isAvailable &&
    variationTitle.trim().length > 0 &&
    variationReason.trim().length > 0 &&
    Number.isFinite(parsedVariationAmount) &&
    parsedVariationAmount !== 0;
  const addFundsHelperText = isAddingFunds
    ? "Adding funds."
    : depositAmount.trim() === ""
      ? "Enter an amount to add funds."
      : !Number.isFinite(parsedDepositAmount)
        ? "Enter a valid number."
        : parsedDepositAmount <= 0
          ? "Amount must be greater than zero."
          : fundingSource !== "funder" && fundingSource !== "contractor"
            ? "Select a funding source."
            : "Funder only.";
  const urgencyTone = (urgency: WorkspaceDecisionCue["decisionUrgency"]) =>
    urgency === "immediate"
      ? "bg-red-50 text-red-700"
      : urgency === "active"
        ? "bg-amber-50 text-amber-700"
        : urgency === "outcome"
          ? "bg-slate-100 text-slate-700"
          : "bg-blue-50 text-blue-700";
  const urgencyLabel = (urgency: WorkspaceDecisionCue["decisionUrgency"]) =>
    urgency === "immediate"
      ? "Act now"
      : urgency === "active"
        ? "Active"
        : urgency === "outcome"
          ? "Outcome"
          : "Monitor";
  const focusHintLabel = (hint: WorkspaceDecisionCue["detailFocusHint"]) =>
    hint === "approval"
      ? "Sign-off"
      : hint === "evidence"
        ? "Supporting information"
        : hint === "funding"
          ? "Amount status"
          : hint === "release"
            ? "Payment"
            : hint === "exception"
              ? "Under review"
              : hint === "handoff"
                ? "Waiting on"
                : hint === "outcome"
                  ? "Outcome"
                  : "Overview";
  const visibleActionItems = currentProjectInbox.slice(0, 4);
  const hiddenActionCount = Math.max(currentProjectInbox.length - visibleActionItems.length, 0);
  const topUrgency = currentProjectInbox[0]?.decisionCue.decisionUrgency ?? null;
  const bannerTone =
    topUrgency === "immediate"
      ? "border-slate-950 bg-slate-950 text-white"
      : topUrgency === "active"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-teal-200 bg-teal-50 text-teal-950";
  const bannerLabel =
    currentProjectInbox.length === 0
      ? "All items up to date"
      : topUrgency === "immediate"
        ? currentProjectInbox[0]?.decisionCue.primaryCue ?? `${currentProjectInbox.length} items need your action`
        : topUrgency === "active"
          ? `${currentProjectInbox.length} item${currentProjectInbox.length === 1 ? "" : "s"} need attention`
          : `${currentProjectInbox.length} item${currentProjectInbox.length === 1 ? "" : "s"} to monitor`;
  const taskAlertLines = [
    stageDetail.releaseSummary.blockingConditionLabel,
    stageDetail.exceptionPath.hasActiveExceptionPath ? stageDetail.exceptionPath.exceptionReasonLabel : null,
    stageDetail.evidenceSummary.blockingConditionLabel,
    stageDetail.approvalSummary.blockingConditionLabel,
  ].filter((line, index, array): line is string => Boolean(line) && array.indexOf(line) === index).slice(0, 2);

  useEffect(() => {
    if (projectStages.some((stage) => stage.id === selectedStageId)) {
      return;
    }

    const nextStageId = projectStages[0]?.id ?? "";
    if (nextStageId && nextStageId !== selectedStageId) {
      setSelectedStageId(nextStageId);
    }
    setSelectedStageSection("overview");
    setSelectedWorkspaceCue(null);
  }, [projectStages, selectedStageId]);

  useEffect(() => {
    setActiveRequestId(null);
  }, [project.id]);

  useEffect(() => {
    if (selectedWorkspaceCue && selectedWorkspaceCue.stageId !== activeStageId) {
      setSelectedWorkspaceCue(null);
    }
  }, [activeStageId, selectedWorkspaceCue]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedProjectId = params.get("project");
    const requestedStageId = params.get("stage");
    const requestedSection = params.get("section") as StageDetailSectionKey | null;
    const validSections: StageDetailSectionKey[] = ["overview", "funding", "approvals", "evidence", "dispute", "variation", "release"];

    if (requestedProjectId && state.projects.some((entry) => entry.id === requestedProjectId) && requestedProjectId !== selectedProjectId) {
      setSelectedProjectId(requestedProjectId);
    }

    const scopedProjectId =
      requestedProjectId && state.projects.some((entry) => entry.id === requestedProjectId)
        ? requestedProjectId
        : selectedProjectId;
    const scopedStages = state.stages.filter((stage) => stage.projectId === scopedProjectId);

    if (requestedStageId && scopedStages.some((stage) => stage.id === requestedStageId) && requestedStageId !== selectedStageId) {
      setSelectedStageId(requestedStageId);
      setShowStageDetail(true);
    }

    if (requestedSection && validSections.includes(requestedSection) && requestedSection !== selectedStageSection) {
      setSelectedStageSection(requestedSection);
    }
  }, [state.projects, state.stages, selectedProjectId, selectedStageId, selectedStageSection]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const currentProject = params.get("project") ?? "";
    const currentStage = params.get("stage") ?? "";
    const currentSection = params.get("section") ?? "";
    const nextProject = project.id;
    const nextStage = activeStageId ?? "";
    const nextSection = selectedStageSection ?? "";

    if (currentProject === nextProject && currentStage === nextStage && currentSection === nextSection) {
      return;
    }

    syncRequestLocation(nextProject, nextStage || undefined, nextSection || undefined);
  }, [project.id, activeStageId, selectedStageSection]);

  function syncRequestLocation(projectId: string, stageId?: string, stageSection?: StageDetailSectionKey) {
    const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
    params.set("project", projectId);
    if (stageId) {
      params.set("stage", stageId);
    } else {
      params.delete("stage");
    }
    if (stageSection) {
      params.set("section", stageSection);
    } else {
      params.delete("section");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function openStageContext(
    stageId: string,
    stageSection: StageDetailSectionKey = "overview",
    cue?: WorkspaceDecisionCue | null,
    projectIdOverride?: string,
  ) {
    setSelectedStageId(stageId);
    setSelectedStageSection(stageSection);
    setSelectedWorkspaceCue(cue ? { stageId, cue } : null);
    setShowStageDetail(true);
    syncRequestLocation(projectIdOverride ?? project.id, stageId, stageSection);
  }

  function handleWorkspaceItemSelect(item: (typeof currentProjectInbox)[number]) {
    setLockedRequestReceipt(null);
    setRequestFinalConfirmation(null);
    setActiveDecisionComposerId(null);
    setRequestDecisionNote("");
    setActiveRequestId(item.id);
    const nextProjectId = item.deepLinkTarget?.projectId ?? project.id;
    if (nextProjectId !== project.id) {
      setSelectedProjectId(nextProjectId);
    }

    if (item.deepLinkTarget?.stageId) {
      openStageContext(item.deepLinkTarget.stageId, item.deepLinkTarget?.section ?? "overview", item.decisionCue, nextProjectId);
      return;
    }

    const nextSection = item.deepLinkTarget?.section ?? "overview";
    setSelectedStageSection(nextSection);
    setShowStageDetail(true);
    syncRequestLocation(nextProjectId, undefined, nextSection);
  }

  function pulsePendingAction(actionId: string) {
    setPendingActionId(actionId);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setPendingActionId((current) => (current === actionId ? null : current));
      }, 450);
    }
  }

  function commit(updater: (current: SystemStateRecord) => SystemStateRecord) {
    setState((current) => updater(current));
  }

  function runStageAction(
    actionId: string,
    stageId: string,
    section: StageDetailSectionKey,
    updater: (current: SystemStateRecord) => SystemStateRecord,
  ) {
    setState((current) => {
      const beforeDetail = getStageDetail(current, stageId);
      const next = updater(current);
      const resolvedNext = next === current ? structuredClone(current) : next;
      const nextDetail = next === current ? beforeDetail : getStageDetail(next, stageId);
      const outcome = createLastActionOutcome({
        actionId,
        section,
        before: beforeDetail,
        after: nextDetail,
      });

      recordLastActionOutcome(resolvedNext, stageId, outcome);
      return resolvedNext;
    });
  }

  function runRequestMutation(
    actionId: string,
    mutate: (current: SystemStateRecord) => SystemStateRecord,
  ) {
    if (!selectedTask?.id || !activeRequestState) {
      return;
    }

    pulsePendingAction(actionId);
    const requestId = selectedTask.id;
    const stageId = activeRequestState.detail.stage.id;
    const requestSection = activeRequestState.section;
    let receipt: {
      requestId: string;
      projectName: string;
      stageName: string;
      title: string;
      outcomeHeadline: string;
      outcomeLine: string;
    } | null = null;

    setState((current) => {
      const beforeDecisionState = getRequestDecisionState(current, requestId);
      if (!beforeDecisionState) {
        return current;
      }

      const beforeDetail = beforeDecisionState.detail;
      const next = mutate(current);
      const resolvedNext = next === current ? structuredClone(current) : next;
      const nextDetail = getStageDetail(resolvedNext, stageId);
      const outcome = createLastActionOutcome({
        actionId,
        section: requestSection,
        before: beforeDetail,
        after: nextDetail,
      });

      recordLastActionOutcome(resolvedNext, stageId, outcome);
      receipt = {
        requestId,
        projectName: beforeDecisionState.request.projectName,
        stageName: beforeDecisionState.detail.stage.name,
        title: beforeDecisionState.request.title,
        outcomeHeadline: getOutcomeHeadline(outcome),
        outcomeLine: "Decision recorded - audit log updated.",
      };
      return resolvedNext;
    });

    setRequestDecisionNote("");
    setActiveDecisionComposerId(null);
    setRequestFinalConfirmation(null);
    setLockedRequestReceipt(receipt);
  }

  function handleDeposit() {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0 || (fundingSource !== "funder" && fundingSource !== "contractor")) {
      return;
    }
    setIsAddingFunds(true);
    try {
      commit((current) =>
        depositFunds(
          current,
          project.id,
          amount,
          fundingSource,
          fundingSource === "contractor" ? activeStageId : undefined,
        ),
      );
    } finally {
      setIsAddingFunds(false);
    }
  }

  function handleEvidenceUpdate(requirementId: string, status: EvidenceStatus, reason?: string) {
    runStageAction(
      `evidence:${requirementId}:${status}`,
      activeStageId,
      "evidence",
      (current) => updateEvidenceStatus(current, requirementId, status, { reason }),
    );
    if (status === "rejected" || status === "requires_more") {
      setEvidenceReviewReasons((current) => ({ ...current, [requirementId]: "" }));
    }
  }

  function handleAddEvidence() {
    runStageAction(
      "evidence:add",
      activeStageId,
      "evidence",
      (current) => addEvidence(current, activeStageId, evidenceType, evidenceTitle),
    );
    setEvidenceTitle("");
  }

  function handleOpenDispute() {
    runStageAction(
      "dispute:open",
      activeStageId,
      "dispute",
      (current) => openDispute(current, activeStageId, disputeTitle, disputeReason, Number(disputeAmount)),
    );
    setDisputeTitle("");
    setDisputeReason("");
  }

  function handleCreateVariation() {
    runStageAction(
      "variation:create",
      activeStageId,
      "variation",
      (current) => createVariation(current, activeStageId, variationTitle, variationReason, Number(variationAmount)),
    );
    setVariationTitle("");
    setVariationReason("");
  }

  function requiresDecisionReason(descriptor: DerivedActionDescriptor | null | undefined) {
    if (!descriptor) return false;
    return (
      descriptor.actionId.endsWith("-reject") ||
      descriptor.actionId.endsWith("-rejected") ||
      descriptor.actionId.endsWith("-requires_more")
    );
  }

  function getDecisionConfirmationLine(descriptor: DerivedActionDescriptor | null | undefined) {
    if (!descriptor) return "Complete this governed action.";
    switch (descriptor.actionId) {
      case "release":
        return "Release payment now.";
      case "review-variation-approve":
        return "Approve variation and move this project stage forward.";
      case "review-variation-reject":
        return "Reject variation and record your reason.";
      case "approval-professional-approve":
      case "approval-commercial-approve":
      case "approval-treasury-approve":
        return "Approve and move this project stage forward.";
      case "approval-professional-reject":
      case "approval-commercial-reject":
      case "approval-treasury-reject":
        return "Reject request and record your reason.";
      default:
        if (descriptor.actionId.endsWith("-requires_more")) {
          return "Request more information and return this for update.";
        }
        if (descriptor.actionId.endsWith("-rejected")) {
          return "Reject request and record your reason.";
        }
        if (descriptor.actionId === "resolve-dispute") {
          return "Resolve this dispute and update the payment position.";
        }
        return descriptor.sideEffects?.[0] ?? descriptor.outcomeLabel;
    }
  }

  function getDecisionReasonPlaceholder(descriptor: DerivedActionDescriptor | null | undefined) {
    if (!descriptor) return "Add a reason";
    if (descriptor.actionId.endsWith("-requires_more")) {
      return "What needs to be updated before this can continue?";
    }
    if (descriptor.actionId.includes("variation")) {
      return "Why should this variation be rejected?";
    }
    if (descriptor.actionId.includes("approval-")) {
      return "Why are you rejecting this request?";
    }
    return "Why are you taking this action?";
  }

  function getRequestConsequenceLine(action: "approve" | "reject") {
    if (!activeRequestState) {
      return "This decision will be recorded in the audit log.";
    }

    const { detail, section } = activeRequestState;

    if (action === "approve") {
      if (section === "release") {
        return `${currency.format(detail.releaseDecision.releasableAmount)} will be released from ringfenced funds.`;
      }
      if (section === "funding") {
        return `${currency.format(detail.funding.gapToRequiredCover)} will be allocated to required cover.`;
      }
      if (section === "approvals") {
        return detail.approvalSummary.nextApprovalStepLabel ?? "This approval will move the project stage to the next governed step.";
      }
      if (section === "evidence") {
        return "Supporting information will be accepted and the stage will move toward sign-off.";
      }
      if (section === "variation") {
        return taskDescriptorSet?.primary?.outcomeLabel ?? "This variation will move to the next governed step.";
      }
      if (section === "dispute") {
        return "This dispute will be resolved and the governed payment path will resume.";
      }
      return detail.operationalStatus.nextStep;
    }

    if (section === "approvals") {
      return "This stage will be rejected and payment blocked.";
    }
    if (section === "evidence") {
      return "This supporting information will be rejected and payment blocked.";
    }
    if (section === "variation") {
      return "This variation will be rejected and the current scope will remain in place.";
    }

    return "This decision will be rejected and the governed flow will remain blocked.";
  }

  function getApprovalRoleFromDescriptor(descriptor: DerivedActionDescriptor) {
    const match = descriptor.actionId.match(/^approval-(professional|commercial|treasury)-/);
    return match?.[1] as "professional" | "commercial" | "treasury" | undefined;
  }

  function getVariationIdFromDescriptor(descriptor: DerivedActionDescriptor) {
    return descriptor.actionId.startsWith("review-variation") ? taskDescriptorSet?.variationId : undefined;
  }

  function getEvidenceIdFromDescriptor(descriptor: DerivedActionDescriptor) {
    return descriptor.actionId.startsWith("evidence-") ? taskDescriptorSet?.evidenceId : undefined;
  }

  function getDescriptorReasonDraft(descriptor: DerivedActionDescriptor | null | undefined) {
    if (!descriptor) return "";
    const approvalRole = getApprovalRoleFromDescriptor(descriptor);
    if (approvalRole) return approvalRejectReasons[approvalRole] ?? "";
    const evidenceId = getEvidenceIdFromDescriptor(descriptor);
    if (evidenceId) return evidenceReviewReasons[evidenceId] ?? "";
    const variationId = getVariationIdFromDescriptor(descriptor);
    if (variationId) return variationRejectReasons[variationId] ?? "";
    return "";
  }

  function setDescriptorReasonDraft(descriptor: DerivedActionDescriptor | null | undefined, value: string) {
    if (!descriptor) return;
    const approvalRole = getApprovalRoleFromDescriptor(descriptor);
    if (approvalRole) {
      setApprovalRejectReasons((current) => ({ ...current, [approvalRole]: value }));
      return;
    }
    const evidenceId = getEvidenceIdFromDescriptor(descriptor);
    if (evidenceId) {
      setEvidenceReviewReasons((current) => ({ ...current, [evidenceId]: value }));
      return;
    }
    const variationId = getVariationIdFromDescriptor(descriptor);
    if (variationId) {
      setVariationRejectReasons((current) => ({ ...current, [variationId]: value }));
    }
  }

  function handleFundStage() {
    runStageAction(
      "funding:allocate",
      stageDetail.stage.id,
      "funding",
      (current) => allocateStageFunds(current, stageDetail.stage.id),
    );
  }

  function handleReleaseStage() {
    runStageAction(
      "release:execute",
      stageDetail.stage.id,
      "release",
      (current) => releaseStage(current, stageDetail.stage.id),
    );
  }

  function handleApplyOverride() {
    runStageAction(
      "release:override",
      stageDetail.stage.id,
      "release",
      (current) => applyOverride(current, stageDetail.stage.id, overrideReason),
    );
    setOverrideReason("");
  }

  function handleFundStageFor(stageId: string) {
    runStageAction(
      "funding:allocate",
      stageId,
      "funding",
      (current) => allocateStageFunds(current, stageId),
    );
  }

  function handleReleaseStageFor(stageId: string) {
    runStageAction(
      "release:execute",
      stageId,
      "release",
      (current) => releaseStage(current, stageId),
    );
  }

  async function handleShareDecision() {
    const shareTitle = `${project.name} decision pack`;
    const shareText = [
      `${selectedDecision.explanation.label} · ${currency.format(selectedDecision.releasableAmount)} releasable`,
      selectedDecision.explanation.reason,
      fundingSummarySentence,
      `Next action: ${primaryAction?.primaryAction.title ?? "No immediate action required."}`,
    ].join("\n");

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
        return;
      } catch {
        // Fall back to print if share is cancelled or unavailable.
      }
    }

    window.print();
  }

  const modeTitle =
    audienceMode === "operations"
      ? "Delivery"
      : audienceMode === "treasury"
        ? "Funder"
        : "Executive";
  const modeSummary =
    audienceMode === "operations"
      ? "Focus on payment hold-ups, sign-offs, supporting information, and the next step to get a project stage paid."
      : audienceMode === "treasury"
        ? "Focus on amounts ready to pay, amounts on hold, funder sign-off, and payment conditions."
        : "Focus on payment status, exposure, on-hold value, and concise project stage updates.";
  const selectedTask =
    (activeRequestId ? currentProjectInbox.find((item) => item.id === activeRequestId) : null) ??
    currentProjectInbox.find(
      (item) =>
        item.stageId === activeStageId &&
        (item.deepLinkTarget?.section ?? "overview") === selectedStageSection,
    ) ??
    currentProjectInbox.find((item) => item.stageId === activeStageId) ??
    null;
  const stageCurrentStep = projectStageCurrentSteps.find((step) => step.stageId === activeStageId) ?? null;
  const lockedRequestActive = Boolean(lockedRequestReceipt && lockedRequestReceipt.requestId === activeRequestId && !selectedTask);
  const activeRequestState = selectedTask ? getRequestDecisionState(state, selectedTask.id) : null;
  const selectedTaskUpdatedLabel = formatRelativeTime(activeRequestState?.detail.lastUpdatedAt ?? stageDetail.lastUpdatedAt);
  const primaryTaskCount = currentProjectInbox.length;
  const sectionHeading = sectionMeta[section];
  const showAudienceControls = section === "payments" || section === "packages" || section === "activity";
  const showPrintAction = section === "summary" || section === "payments" || section === "packages";
  const approvalPathItems = stageDetail.approvals.map((approval) => {
    const stateLabel =
      approval.status === "approved"
        ? "Completed"
        : approval.readiness.isAvailable
          ? "Awaiting"
          : approval.sequenceBlocked || approval.readiness.readinessState === "waiting_on_prerequisite"
            ? "Blocked"
            : "Awaiting";

    return {
      id: approval.id,
      roleLabel: getUserFacingRoleLabel(approval.role),
      stateLabel,
      isCurrent: approval.readiness.isAvailable,
      toneClass:
        stateLabel === "Completed"
          ? "border-teal-200 bg-teal-50 text-teal-950"
          : stateLabel === "Blocked"
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-cyan-200 bg-cyan-50 text-cyan-950",
      reason: approval.unavailableReason,
    };
  });
  const approvalOutcomeLine =
    stageDetail.approvalSummary.approvalState === "approved" && stageDetail.releaseDecision.releasableAmount > 0
      ? `On final approval: ${currency.format(stageDetail.releaseDecision.releasableAmount)} will be released for this stage.`
      : "Payment blocked until all approvals complete.";
  const stageNotificationLinks = currentProjectInbox.filter((item) => (item.stageId ?? item.deepLinkTarget?.stageId) === activeStageId).slice(0, 4);
  const paymentActionDescriptor = stageDetail.actionDescriptorMap["release"];
  const fundingActionDescriptor = stageDetail.actionDescriptorMap["fund-stage"];
  const overrideActionDescriptor = stageDetail.actionDescriptorMap["apply-override"];

  useEffect(() => {
    if (pathname !== "/requests" || currentProjectInbox.length === 0) {
      return;
    }

    if (lockedRequestReceipt?.requestId === activeRequestId && !currentProjectInbox.some((item) => item.id === activeRequestId)) {
      return;
    }

    const matchesCurrentTask = activeRequestId ? currentProjectInbox.some((item) => item.id === activeRequestId) : false;
    if (matchesCurrentTask) {
      return;
    }

    handleWorkspaceItemSelect(currentProjectInbox[0]);
  }, [pathname, currentProjectInbox, activeRequestId, lockedRequestReceipt]);

  const getTaskDescriptorSet = (
    detail: StageDetailModel,
    task: {
      deepLinkTarget?: {
        section?: StageDetailSectionKey;
      };
    } | null,
  ) => {
    const approvalCandidate =
      detail.approvals.find((approval) => approval.readiness.readinessState === "available") ??
      detail.approvals.find((approval) => approval.readiness.readinessState !== "complete") ??
      detail.approvals[0];
    const evidenceCandidate =
      detail.evidence.find((item) => item.actionDescriptors.accepted) ??
      detail.evidence[0];
    const openDisputeItem = detail.disputes.find((item) => item.status === "open") ?? detail.disputes[0];
    const pendingVariation =
      detail.variations.find((item) => item.status === "pending") ??
      detail.variations.find((item) => item.status === "approved") ??
      detail.variations[0];
    const focusSection = task?.deepLinkTarget?.section ?? selectedStageSection;

    switch (focusSection) {
      case "funding":
        return {
          primary: detail.actionDescriptorMap["fund-stage"],
          secondary: [] as DerivedActionDescriptor[],
        };
      case "release":
        return {
          primary: detail.actionDescriptorMap["release"],
          secondary: detail.actionDescriptorMap["apply-override"] ? [detail.actionDescriptorMap["apply-override"]] : [],
        };
      case "approvals":
        return {
          primary: approvalCandidate?.approveAction ?? detail.actionDescriptors.find((descriptor) => descriptor.isPrimary) ?? null,
          secondary: approvalCandidate?.rejectAction ? [approvalCandidate.rejectAction] : [],
          approvalRole: approvalCandidate?.role,
        };
      case "evidence":
        if (detail.actionReadiness.addEvidence.isAvailable || detail.evidenceSummary.evidenceState === "missing") {
          return {
            primary: detail.actionDescriptorMap["add-evidence"],
            secondary: [] as DerivedActionDescriptor[],
          };
        }
        return {
          primary: evidenceCandidate?.actionDescriptors.accepted ?? detail.actionDescriptorMap["review-evidence"],
          secondary: [
            evidenceCandidate?.actionDescriptors.requires_more,
            evidenceCandidate?.actionDescriptors.rejected,
          ].filter(Boolean) as DerivedActionDescriptor[],
          evidenceId: evidenceCandidate?.id,
        };
      case "dispute":
        return openDisputeItem?.resolveAction
          ? {
              primary: openDisputeItem.resolveAction,
              secondary: [] as DerivedActionDescriptor[],
              disputeId: openDisputeItem.id,
            }
          : {
              primary: detail.actionDescriptorMap["open-dispute"],
              secondary: [] as DerivedActionDescriptor[],
            };
      case "variation":
        if (pendingVariation?.activateAction && pendingVariation.status === "approved") {
          return {
            primary: pendingVariation.activateAction,
            secondary: [] as DerivedActionDescriptor[],
            variationId: pendingVariation.id,
          };
        }
        if (pendingVariation?.approveAction && pendingVariation.status === "pending") {
          return {
            primary: pendingVariation.approveAction,
            secondary: pendingVariation.rejectAction ? [pendingVariation.rejectAction] : [],
            variationId: pendingVariation.id,
          };
        }
        return {
          primary: detail.actionDescriptorMap["create-variation"],
          secondary: [] as DerivedActionDescriptor[],
        };
      default:
        return {
          primary: detail.actionDescriptors.find((descriptor) => descriptor.isPrimary) ?? detail.actionDescriptors[0] ?? null,
          secondary: detail.actionDescriptors.filter((descriptor) => !descriptor.isPrimary).slice(0, 2),
        };
    }
  };

  const taskDescriptorSet = selectedTask ? getTaskDescriptorSet(stageDetail, selectedTask) : null;
  const stageActionDescriptors = [
    taskDescriptorSet?.primary,
    ...(taskDescriptorSet?.secondary ?? []),
  ].filter(Boolean) as DerivedActionDescriptor[];
  const activeStageComposerDescriptor =
    activeDecisionComposerId && activeDecisionComposerId !== "reject" && activeDecisionComposerId !== "request-info"
      ? stageActionDescriptors.find((descriptor) => descriptor.actionId === activeDecisionComposerId) ?? null
      : null;

  const isDescriptorDisabled = (descriptor: DerivedActionDescriptor | null | undefined) => {
    if (!descriptor) return true;
    if (descriptor.actionId === "fund-stage") return !stageDetail.actionReadiness.fundStage.isAvailable || stageDetail.funding.gapToRequiredCover <= 0;
    if (descriptor.actionId === "release") return !stageDetail.actionReadiness.release.isAvailable || !stageDetail.releaseDecision.releasable;
    if (descriptor.actionId === "apply-override") return !canApplyOverride;
    if (descriptor.actionId === "add-evidence") return !(stageDetail.actionReadiness.addEvidence.isAvailable && evidenceTitle.trim().length > 0);
    if (descriptor.actionId === "open-dispute") return !canOpenDispute;
    if (descriptor.actionId === "create-variation") return !canCreateVariation;
    if (requiresDecisionReason(descriptor) && getDescriptorReasonDraft(descriptor).trim().length === 0) return true;
    return descriptor.confidence === "blocked";
  };

  const canEditPrimaryActionFields = (descriptor: DerivedActionDescriptor | null | undefined) => {
    if (!descriptor) return false;
    if (descriptor.actionId === "add-evidence") return stageDetail.actionReadiness.addEvidence.isAvailable;
    if (descriptor.actionId === "open-dispute") return stageDetail.actionReadiness.openDispute.isAvailable;
    if (descriptor.actionId === "create-variation") return stageDetail.actionReadiness.createVariation.isAvailable;
    if (descriptor.actionId === "apply-override") return stageDetail.actionReadiness.applyOverride.isAvailable;
    if (requiresDecisionReason(descriptor)) return descriptor.confidence !== "blocked";
    return descriptor.confidence !== "blocked";
  };
  const requestPrimaryActionControl = !taskDescriptorSet?.primary
    ? hiddenControl("No direct action is available in this request.")
    : isDescriptorDisabled(taskDescriptorSet.primary)
      ? disabledControl(taskDescriptorSet.primary.blockerSummary ?? stageDetail.operationalStatus.reason)
      : activeControl(taskDescriptorSet.primary.outcomeLabel);

  useEffect(() => {
    if (!selectedTask) {
      setActiveDecisionComposerId(null);
      return;
    }

    const availableActionIds = [
      taskDescriptorSet?.primary?.actionId,
      ...(taskDescriptorSet?.secondary.map((descriptor) => descriptor.actionId) ?? []),
    ].filter(Boolean);

    if (activeDecisionComposerId && !availableActionIds.includes(activeDecisionComposerId)) {
      setActiveDecisionComposerId(null);
    }
  }, [activeDecisionComposerId, selectedTask, taskDescriptorSet]);

  const runDescriptorAction = (descriptor: DerivedActionDescriptor | null | undefined) => {
    if (!descriptor) return;
    pulsePendingAction(descriptor.actionId);

    switch (descriptor.actionId) {
      case "fund-stage":
        handleFundStage();
        setActiveDecisionComposerId(null);
        return;
      case "release":
        handleReleaseStage();
        setActiveDecisionComposerId(null);
        return;
      case "apply-override":
        handleApplyOverride();
        setActiveDecisionComposerId(null);
        return;
      case "add-evidence":
        handleAddEvidence();
        setActiveDecisionComposerId(null);
        return;
      case "approval-professional-approve":
        onApproveTask("professional");
        setActiveDecisionComposerId(null);
        return;
      case "approval-commercial-approve":
        onApproveTask("commercial");
        setActiveDecisionComposerId(null);
        return;
      case "approval-treasury-approve":
        onApproveTask("treasury");
        setActiveDecisionComposerId(null);
        return;
      case "approval-professional-reject":
        onRejectTask("professional", approvalRejectReasons.professional ?? "");
        setActiveDecisionComposerId(null);
        return;
      case "approval-commercial-reject":
        onRejectTask("commercial", approvalRejectReasons.commercial ?? "");
        setActiveDecisionComposerId(null);
        return;
      case "approval-treasury-reject":
        onRejectTask("treasury", approvalRejectReasons.treasury ?? "");
        setActiveDecisionComposerId(null);
        return;
      case "resolve-dispute":
        if (taskDescriptorSet?.disputeId) {
          runStageAction(`dispute:${taskDescriptorSet.disputeId}:resolve`, stageDetail.stage.id, "dispute", (current) =>
            resolveDispute(current, stageDetail.stage.id, taskDescriptorSet.disputeId!),
          );
        }
        setActiveDecisionComposerId(null);
        return;
      case "open-dispute":
        handleOpenDispute();
        setActiveDecisionComposerId(null);
        return;
      case "create-variation":
        handleCreateVariation();
        setActiveDecisionComposerId(null);
        return;
      case "activate-variation":
        if (taskDescriptorSet?.variationId) {
          runStageAction(`variation:${taskDescriptorSet.variationId}:activate`, stageDetail.stage.id, "variation", (current) =>
            activateVariation(current, stageDetail.stage.id, taskDescriptorSet.variationId!),
          );
        }
        setActiveDecisionComposerId(null);
        return;
      case "review-variation-approve":
        if (taskDescriptorSet?.variationId) {
          runStageAction(`variation:${taskDescriptorSet.variationId}:approve`, stageDetail.stage.id, "variation", (current) =>
            reviewVariation(current, stageDetail.stage.id, taskDescriptorSet.variationId!, "approved"),
          );
        }
        setActiveDecisionComposerId(null);
        return;
      case "review-variation-reject":
        if (taskDescriptorSet?.variationId) {
          runStageAction(`variation:${taskDescriptorSet.variationId}:reject`, stageDetail.stage.id, "variation", (current) =>
            reviewVariation(current, stageDetail.stage.id, taskDescriptorSet.variationId!, "rejected", {
              reason: variationRejectReasons[taskDescriptorSet.variationId!] ?? "",
            }),
          );
          setVariationRejectReasons((current) => ({ ...current, [taskDescriptorSet.variationId!]: "" }));
        }
        setActiveDecisionComposerId(null);
        return;
      default:
        if (descriptor.actionId.startsWith("evidence-") && taskDescriptorSet?.evidenceId) {
          if (descriptor.actionId.endsWith("-accepted")) handleEvidenceUpdate(taskDescriptorSet.evidenceId, "accepted");
          if (descriptor.actionId.endsWith("-rejected")) {
            handleEvidenceUpdate(taskDescriptorSet.evidenceId, "rejected", evidenceReviewReasons[taskDescriptorSet.evidenceId] ?? "");
          }
          if (descriptor.actionId.endsWith("-requires_more")) {
            handleEvidenceUpdate(taskDescriptorSet.evidenceId, "requires_more", evidenceReviewReasons[taskDescriptorSet.evidenceId] ?? "");
          }
          if (descriptor.actionId.endsWith("-pending")) handleEvidenceUpdate(taskDescriptorSet.evidenceId, "pending");
        }
        setActiveDecisionComposerId(null);
    }
  };

  function onApproveTask(role: "professional" | "commercial" | "treasury") {
    runStageAction(`approval:${role}:approve`, stageDetail.stage.id, "approvals", (current) => giveApproval(current, stageDetail.stage.id, role));
  }

  function onRejectTask(role: "professional" | "commercial" | "treasury", reason: string) {
    runStageAction(`approval:${role}:reject`, stageDetail.stage.id, "approvals", (current) => rejectApproval(current, stageDetail.stage.id, role, reason));
    setApprovalRejectReasons((current) => ({ ...current, [role]: "" }));
  }

  const stageDetailSurface = (
    <StageDetailPanel
      detail={stageDetail}
      focusedSection={selectedStageSection}
      lastActionOutcome={lastActionOutcome}
      entryCue={selectedWorkspaceCue?.stageId === stageDetail.stage.id ? selectedWorkspaceCue.cue : stageDetail.entryOrientation}
      overrideReason={overrideReason}
      evidenceTitle={evidenceTitle}
      evidenceType={evidenceType}
      fundingSource={fundingSource}
      disputeTitle={disputeTitle}
      disputeReason={disputeReason}
      disputeAmount={disputeAmount}
      variationTitle={variationTitle}
      variationReason={variationReason}
      variationAmount={variationAmount}
      approvalRejectReasons={approvalRejectReasons}
      evidenceReviewReasons={evidenceReviewReasons}
      variationRejectReasons={variationRejectReasons}
      onOverrideReasonChange={setOverrideReason}
      onEvidenceTitleChange={setEvidenceTitle}
      onEvidenceTypeChange={setEvidenceType}
      onDisputeTitleChange={setDisputeTitle}
      onDisputeReasonChange={setDisputeReason}
      onDisputeAmountChange={setDisputeAmount}
      onVariationTitleChange={setVariationTitle}
      onVariationReasonChange={setVariationReason}
      onVariationAmountChange={setVariationAmount}
      onApprovalRejectReasonChange={(role, value) => setApprovalRejectReasons((current) => ({ ...current, [role]: value }))}
      onEvidenceReviewReasonChange={(evidenceId, value) => setEvidenceReviewReasons((current) => ({ ...current, [evidenceId]: value }))}
      onVariationRejectReasonChange={(variationId, value) => setVariationRejectReasons((current) => ({ ...current, [variationId]: value }))}
      onAddEvidence={handleAddEvidence}
      onUpdateEvidenceStatus={handleEvidenceUpdate}
      onApprove={(role) => runStageAction(`approval:${role}:approve`, stageDetail.stage.id, "approvals", (current) => giveApproval(current, stageDetail.stage.id, role))}
      onReject={(role, reason) => {
        runStageAction(`approval:${role}:reject`, stageDetail.stage.id, "approvals", (current) => rejectApproval(current, stageDetail.stage.id, role, reason));
        setApprovalRejectReasons((current) => ({ ...current, [role]: "" }));
      }}
      onFundStage={handleFundStage}
      onApplyOverride={handleApplyOverride}
      onRelease={handleReleaseStage}
      onOpenDispute={handleOpenDispute}
      onResolveDispute={(disputeId) => runStageAction(`dispute:${disputeId}:resolve`, stageDetail.stage.id, "dispute", (current) => resolveDispute(current, stageDetail.stage.id, disputeId))}
      onCreateVariation={handleCreateVariation}
      onApproveVariation={(variationId) =>
        runStageAction(`variation:${variationId}:approve`, stageDetail.stage.id, "variation", (current) => reviewVariation(current, stageDetail.stage.id, variationId, "approved"))
      }
      onRejectVariation={(variationId) => {
        runStageAction(`variation:${variationId}:reject`, stageDetail.stage.id, "variation", (current) => reviewVariation(current, stageDetail.stage.id, variationId, "rejected", { reason: variationRejectReasons[variationId] ?? "" }));
        setVariationRejectReasons((current) => ({ ...current, [variationId]: "" }));
      }}
      onActivateVariation={(variationId) => runStageAction(`variation:${variationId}:activate`, stageDetail.stage.id, "variation", (current) => activateVariation(current, stageDetail.stage.id, variationId))}
    />
  );

  if (workflowOnly) {
    return (
      <main className="flex flex-col gap-6 text-slate-900">
        <SectionCard
          title="Project + location"
          subtitle="Choose a project, then stay in one selected-stage workflow surface."
        >
          <div className="grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-[16rem]">
                <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500" htmlFor="workflow-project-select">
                  Project
                </label>
                <select
                  id="workflow-project-select"
                  className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                  value={project.id}
                  onChange={(event) => {
                    setSelectedProjectId(event.target.value);
                    setSelectedWorkspaceCue(null);
                    setActiveRequestId(null);
                  }}
                >
                  {state.projects.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Location</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{project.location}</p>
                <p className="mt-1 text-sm text-slate-500">{project.status}</p>
              </div>
            </div>

            {stageNotificationLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stageNotificationLinks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleWorkspaceItemSelect(item)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    <span className="font-semibold text-slate-900">{item.title}</span>
                    <span className="ml-2 text-slate-500">{item.decisionCue.primaryCue}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No additional notifications are active for this selected stage.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Stage title/value/dates/description"
          subtitle={`${stageDetail.stage.name} is the default selected stage for ${project.name}.`}
        >
          <div className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">{stageDetail.stage.name}</h2>
                <p className="mt-2 text-sm text-slate-600">{stageDetail.stageDescription}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[stageDetail.stage.status]}`}>
                {stageDetail.stage.status.replaceAll("_", " ")}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Stage value</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{currency.format(stageDetail.stage.requiredAmount)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Start date</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{formatReadOnlyDate(stageDetail.plannedStartDate)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">End date</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{formatReadOnlyDate(stageDetail.plannedEndDate)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Last updated</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{formatRelativeTime(stageDetail.lastUpdatedAt)}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Assigned roles"
          subtitle="Everyone attached to this selected stage, without mode switches or separate role views."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Contractor</p>
              <p className="mt-2 text-sm font-medium text-slate-950">{stageDetail.stage.contractorName ?? "Not assigned"}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Subcontractor</p>
              <p className="mt-2 text-sm font-medium text-slate-950">{stageDetail.stage.subcontractorName ?? "Not assigned"}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current role in view</p>
              <p className="mt-2 text-sm font-medium text-slate-950">{stageDetail.actingRole.label}</p>
            </article>
            {approvalPathItems.map((item) => (
              <article key={item.id} className={`rounded-2xl border p-4 ${item.toneClass}`}>
                <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">{item.roleLabel}</p>
                <p className="mt-2 text-sm font-medium">{item.stateLabel}</p>
                <p className="mt-1 text-xs opacity-80">{item.reason}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Stage files / supporting information"
          subtitle={stageDetail.evidenceSummary.headline}
        >
          <div className="grid gap-4">
            <div className="grid gap-3">
              {stageDetail.evidence.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-950">{item.label}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.record?.name ?? "No file or form submitted yet."}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {item.record?.status ?? (item.required ? "required" : "optional")}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <EvidencePanel
              detail={stageDetail}
              evidenceTitle={evidenceTitle}
              evidenceType={evidenceType}
              evidenceReviewReasons={evidenceReviewReasons}
              onEvidenceTitleChange={setEvidenceTitle}
              onEvidenceTypeChange={setEvidenceType}
              onEvidenceReviewReasonChange={(evidenceId, value) => setEvidenceReviewReasons((current) => ({ ...current, [evidenceId]: value }))}
              onAddEvidence={handleAddEvidence}
              onUpdateEvidenceStatus={handleEvidenceUpdate}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="What happens next"
          subtitle={selectedTask ? `Notification received: ${selectedTask.title}` : `${project.name} · ${stageDetail.stage.name}`}
        >
          <div className="grid gap-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-lg font-semibold text-slate-950">{stageCurrentStep?.stepLabel ?? stageDetail.operationalStatus.label}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{stageCurrentStep?.assuranceLine ?? stageDetail.operationalStatus.reason}</p>
              <p className="mt-2 text-sm text-slate-600">
                {selectedTask?.decisionCue.primaryCue ?? stageCurrentStep?.supportingSentence ?? stageDetail.operationalStatus.nextStep}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next owner</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{stageDetail.sectionGuidance[selectedStageSection].ownerLabel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Recommended action</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{stageDetail.sectionGuidance[selectedStageSection].recommendedAction}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current focus</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{focusHintLabel(selectedTask?.decisionCue.detailFocusHint ?? "general")}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Approval path"
          subtitle={approvalOutcomeLine}
        >
          <ApprovalPanel
            detail={stageDetail}
            approvalRejectReasons={approvalRejectReasons}
            onApprovalRejectReasonChange={(role, value) => setApprovalRejectReasons((current) => ({ ...current, [role]: value }))}
            onApprove={(role) => runStageAction(`approval:${role}:approve`, stageDetail.stage.id, "approvals", (current) => giveApproval(current, stageDetail.stage.id, role))}
            onReject={(role, reason) => {
              runStageAction(`approval:${role}:reject`, stageDetail.stage.id, "approvals", (current) => rejectApproval(current, stageDetail.stage.id, role, reason));
              setApprovalRejectReasons((current) => ({ ...current, [role]: "" }));
            }}
          />
        </SectionCard>

        <SectionCard
          title="Payment status / action"
          subtitle={stageDetail.releaseSummary.headline}
        >
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Payment status</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{stageDetail.releaseDecision.explanation.label}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Ready to pay</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{currency.format(stageDetail.releaseDecision.releasableAmount)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">On hold</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{currency.format(stageDetail.releaseDecision.frozenAmount)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Blocked</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{currency.format(stageDetail.releaseDecision.blockedAmount)}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {paymentActionDescriptor ? (
                <button
                  type="button"
                  onClick={handleReleaseStage}
                  disabled={!canReleaseStage}
                  className={getActionButtonClass(paymentActionDescriptor, !canReleaseStage, true)}
                >
                  <span className="block text-base font-semibold">{paymentActionDescriptor.label}</span>
                  <span className="mt-1 block text-sm opacity-85">{paymentActionDescriptor.outcomeLabel}</span>
                </button>
              ) : null}
              {fundingActionDescriptor ? (
                <button
                  type="button"
                  onClick={handleFundStage}
                  disabled={!canFundStage}
                  className={getActionButtonClass(fundingActionDescriptor, !canFundStage)}
                >
                  <span className="block">{fundingActionDescriptor.label}</span>
                  <span className="mt-1 block text-xs opacity-80">{fundingActionDescriptor.outcomeLabel}</span>
                </button>
              ) : null}
              {overrideActionDescriptor ? (
                <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
                  <p className="text-sm font-medium text-teal-950">Funder override</p>
                  <textarea
                    className="mt-3 min-h-24 w-full rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm"
                    placeholder="Override reason"
                    value={overrideReason}
                    disabled={!stageDetail.availableActions.applyOverride}
                    onChange={(event) => setOverrideReason(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleApplyOverride}
                    disabled={!canApplyOverride}
                    className={`mt-3 ${getActionButtonClass(overrideActionDescriptor, !canApplyOverride)}`}
                  >
                    <span className="block">{overrideActionDescriptor.label}</span>
                    <span className="mt-1 block text-xs opacity-80">{overrideActionDescriptor.outcomeLabel}</span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              {stageDetail.releaseDecision.reasons.map((reason, index) => (
                <p key={`${reason.type}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <span className="font-medium capitalize text-slate-900">{reason.type.replaceAll("_", " ")}:</span> {reason.message}
                </p>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Recorded activity"
          subtitle={`Last activity ${formatRelativeTime(projectActivity.lastActivityAt)}.`}
        >
          <div className="grid gap-3">
            {stageDetail.timelineEntries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{entry.headline}</p>
                    {entry.detail ? <p className="mt-1 text-sm text-slate-500">{entry.detail}</p> : null}
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {entry.effect.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{entry.actorLabel ?? "System"} · {entry.timestampLabel}</p>
              </article>
            ))}
            {stageDetail.timelineEntries.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No governed stage activity recorded yet.</p>
            ) : null}
          </div>
        </SectionCard>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-8 text-slate-900">

        <section className="print-only hidden">
          <div className="mx-auto max-w-5xl text-slate-950">
            <div className="border-b border-slate-200 pb-6">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Shure.Fund Payment Summary</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em]">{project.name}</h1>
              <p className="mt-2 text-sm text-slate-500">Prepared {new Date().toLocaleString("en-GB")}</p>
            </div>

            <section className="print-section mt-8">
              <h2 className="text-lg font-semibold text-slate-950">Payment status</h2>
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">{stageDetail.stage.name}</p>
                <div className="mt-2 flex items-end justify-between gap-6">
                  <div>
                    <p className="text-3xl font-semibold tracking-[-0.02em]">{selectedDecision.explanation.label}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{selectedDecision.explanation.reason}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-xs text-slate-500">Ready to pay now</p>
                    <p className="mt-1 text-3xl font-semibold tracking-[-0.02em]">{currency.format(selectedDecision.releasableAmount)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Principal blocker</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{blockerSummaryText}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Next step</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{primaryAction?.primaryAction.title ?? "No immediate action required."}</p>
                    <p className="mt-1 text-xs text-slate-500">Who needs to act: {primaryResponsibilityCue ?? "None"}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="print-section mt-8">
              <h2 className="text-lg font-semibold text-slate-950">Amount status</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Balance</p>
                  <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.projectBalance)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">WIP</p>
                  <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.wipTotal)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">{shortfallActive ? "Shortfall" : "Surplus"}</p>
                  <p className="mt-2 text-2xl font-semibold">{currency.format(shortfallActive ? fundingSummary.shortfall : fundingSummary.surplusCash)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Ready to pay</p>
                  <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.releasableFunds)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">On hold</p>
                  <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.frozenFunds)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">{fundingSummarySentence}</p>
            </section>

            <section className="print-section mt-8">
              <h2 className="text-lg font-semibold text-slate-950">Payment blockers and confidence</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Principal blocker theme</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.blockerThemeLine.replace("Principal blocker theme: ", "")}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Funder and payment confidence</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.treasuryConfidenceLine}</p>
                </div>
              </div>
            </section>

            <section className="print-section mt-8">
              <h2 className="text-lg font-semibold text-slate-950">Selected project stage</h2>
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Project stage status</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{stageDetail.operationalStatus.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Payment status</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{stageDetail.releaseDecision.explanation.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Funder readiness</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{stageDetail.treasuryReadiness.label}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">WIP</p>
                    <p className="mt-2 text-xl font-semibold">{currency.format(stageDetail.releaseDecision.releasableAmount + stageDetail.releaseDecision.frozenAmount + stageDetail.releaseDecision.blockedAmount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Ready to pay</p>
                    <p className="mt-2 text-xl font-semibold">{currency.format(stageDetail.releaseDecision.releasableAmount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">On hold</p>
                    <p className="mt-2 text-xl font-semibold">{currency.format(stageDetail.releaseDecision.frozenAmount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">In progress</p>
                    <p className="mt-2 text-xl font-semibold">{currency.format(stageDetail.releaseDecision.blockedAmount)}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Principal blocker</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{stageDetail.blockers[0]?.label ?? "No active blocker."}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Recent activity</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{stageDetail.recentEvents[0]?.summary ?? "No recent activity recorded."}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        <div className="no-print flex flex-col gap-8 pb-28">
          {section === "actions" && currentProjectInbox.length > 0 ? (
            <div className={`mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-[22px] border px-4 py-3 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.35)] ${bannerTone}`}>
              <div className="min-w-0">
                <p className={`text-[11px] uppercase tracking-[0.18em] ${topUrgency === "immediate" ? "text-white/70" : "text-current/70"}`}>Requests inbox</p>
                <p className="truncate text-sm font-semibold">{bannerLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (currentProjectInbox[0]) {
                    setActiveRequestId(currentProjectInbox[0].id);
                    handleWorkspaceItemSelect(currentProjectInbox[0]);
                  }
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  topUrgency === "immediate"
                    ? "bg-white text-slate-950"
                    : "bg-white/85 text-slate-950"
                }`}
              >
                Open request
              </button>
            </div>
          ) : null}
          {section === "actions" ? (
            <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-[28px] border border-slate-200/80 bg-white/92 px-5 py-5 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.35)]">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{sectionHeading.title}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">This is where work happens</h2>
                <p className="mt-2 text-sm text-slate-600">{sectionHeading.subtitle}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {project.name} · Acting as {getUserFacingRoleLabel(currentUser.role)}
                </p>
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-4 rounded-[30px] border border-slate-200/80 bg-white/90 px-6 py-5 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.35)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{sectionHeading.title}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">{project.name}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-600">{sectionHeading.subtitle}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Acting as {getUserFacingRoleLabel(currentUser.role)} in this project. Changing role changes which governed actions are available here.
                  </p>
                </div>
                {(showAudienceControls || showPrintAction) ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {showAudienceControls ? (
                      <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                        {(["operations", "treasury", "executive"] as DashboardAudienceMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setAudienceMode(mode)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              audienceMode === mode ? "bg-slate-950 text-white" : "text-slate-600"
                            }`}
                          >
                            {mode === "operations" ? "Delivery" : mode === "treasury" ? "Funder" : "Executive"}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {showPrintAction ? (
                      <button
                        type="button"
                        onClick={handleShareDecision}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Print payment summary
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {showAudienceControls ? <p className="text-sm text-slate-500">{modeTitle} view. {modeSummary}</p> : null}
            </section>
          )}
        {section === "actions" ? (
        <>
        <div className="mx-auto grid w-full max-w-3xl gap-4">
          {nextRequiredAction ? (
            <RequestStepCard title="Next required action" subtitle={`${nextRequiredAction.projectName} · ${nextRequiredAction.stageName}`}>
              <div className="grid gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-slate-950">{nextRequiredAction.stepLabel}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{nextRequiredAction.assuranceLine}</p>
                    <p className="mt-2 text-sm text-slate-600">{nextRequiredAction.supportingSentence}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    Current step
                  </span>
                </div>
                {nextRequiredAction.requestId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const matchingRequest = currentProjectInbox.find((item) => item.id === nextRequiredAction.requestId);
                      if (matchingRequest) {
                        setActiveRequestId(matchingRequest.id);
                        handleWorkspaceItemSelect(matchingRequest);
                      }
                    }}
                    className="min-h-12 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {nextRequiredAction.ctaLabel}
                  </button>
                ) : null}
              </div>
            </RequestStepCard>
          ) : null}
          <RequestStepCard
            title="Requests"
            subtitle={primaryTaskCount > 0 ? `${primaryTaskCount} waiting in ${project.name}.` : "All requests up to date."}
          >
            {currentProjectInbox.length > 0 ? (
              <div className="grid gap-2">
                {visibleActionItems.map((item) => {
                  const selected = item.id === selectedTask?.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveRequestId(item.id);
                        handleWorkspaceItemSelect(item);
                      }}
                      className={`flex items-center justify-between gap-4 rounded-[24px] border px-4 py-4 text-left transition ${
                        selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`truncate text-base font-semibold ${selected ? "text-white" : "text-slate-950"}`}>{item.title}</p>
                        <p className={`mt-1 truncate text-sm ${selected ? "text-slate-300" : "text-slate-600"}`}>{item.stageName ?? stageDetail.stage.name}</p>
                        <p className={`mt-2 truncate text-sm ${selected ? "text-slate-200" : "text-slate-500"}`}>{item.reason}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${selected ? "text-slate-300" : "text-slate-500"}`}>
                          {urgencyLabel(item.decisionCue.decisionUrgency)}
                        </div>
                        <div className={`text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>
                          {formatRelativeTime(getStageDetail(state, item.stageId ?? activeStageId).lastUpdatedAt)}
                        </div>
                        <ChevronRight size={18} className={selected ? "text-white" : "text-slate-400"} />
                      </div>
                    </button>
                  );
                })}
                {hiddenActionCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextItem = currentProjectInbox[visibleActionItems.length];
                      if (!nextItem) return;
                      setActiveRequestId(nextItem.id);
                      handleWorkspaceItemSelect(nextItem);
                    }}
                    className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                  >
                    +{hiddenActionCount} more request{hiddenActionCount === 1 ? "" : "s"}
                  </button>
                ) : null}
                {crossProjectAttentionCount > 0 ? (
                <p className="px-1 text-xs text-slate-500">
                    {crossProjectAttentionCount} additional item{crossProjectAttentionCount === 1 ? "" : "s"} need attention in other projects.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[24px] border border-teal-200 bg-[linear-gradient(180deg,rgba(240,253,250,1)_0%,rgba(249,250,251,1)_100%)] px-5 py-5">
                <p className="text-base font-semibold text-teal-950">All requests up to date</p>
                <p className="mt-2 text-sm text-teal-900">No requests waiting in this project.</p>
              </div>
            )}
          </RequestStepCard>

        {selectedTask || lockedRequestActive ? (
          <>
            <RequestStepCard title="Project stage record">
              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">Project</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{stageDetail.projectName}</h2>
                    <p className="mt-2 text-sm text-slate-600">Location: {stageDetail.projectLocation}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${selectedTask ? urgencyTone(selectedTask.decisionCue.decisionUrgency) : "bg-teal-100 text-teal-900"}`}>
                    {selectedTask ? urgencyLabel(selectedTask.decisionCue.decisionUrgency) : "Recorded"}
                  </span>
                </div>
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Stage title</p>
                    <p className="mt-2 text-base font-semibold text-slate-950">{stageDetail.stage.name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Stage description</p>
                    <p className="mt-2 text-sm text-slate-600">{stageDetail.stageDescription}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Stage value</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{currency.format(stageDetail.stage.requiredAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Start date</p>
                      <p className="mt-2 text-sm text-slate-600">{formatReadOnlyDate(stageDetail.plannedStartDate)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">End date</p>
                      <p className="mt-2 text-sm text-slate-600">{formatReadOnlyDate(stageDetail.plannedEndDate)}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current stage action</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{selectedTask?.title ?? lockedRequestReceipt?.title ?? "Stage action recorded"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Updated {selectedTask ? selectedTaskUpdatedLabel : "just now"}
                    </p>
                  </div>
                </div>
              </div>
            </RequestStepCard>

            <RequestStepCard title="Stage context">
              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Assigned sign-off roles</p>
                  <div className="mt-3 grid gap-2">
                    {stageDetail.approvals.map((approval) => (
                      <div key={approval.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{getUserFacingRoleLabel(approval.role)}</p>
                          <p className="mt-1 text-xs text-slate-500">{approval.unavailableReason}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                          {approval.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Attached stage files</p>
                  <div className="mt-3 grid gap-2">
                    {stageDetail.evidence.length > 0 ? (
                      stageDetail.evidence.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{item.record?.name ?? item.label}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.type === "file" ? "File" : "Form"} · {item.required ? "Required" : "Optional"}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                            {item.record?.status?.replaceAll("_", " ") ?? "missing"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">No stage files recorded.</p>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Stage action history</p>
                  <div className="mt-3 grid gap-2">
                    {stageDetail.timelineEntries.length > 0 ? (
                      stageDetail.timelineEntries.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-950">{entry.headline}</p>
                              {entry.detail ? <p className="mt-1 text-xs text-slate-500">{entry.detail}</p> : null}
                            </div>
                            <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-500">{entry.timestampLabel}</span>
                          </div>
                          {entry.actorLabel ? <p className="mt-2 text-xs text-slate-500">{entry.actorLabel}</p> : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">No stage action history recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            </RequestStepCard>

            <RequestStepCard title="Actions" subtitle="Every button below records a real state change.">
              <div className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Approval path</p>
                      <p className="mt-1 text-sm text-slate-600">Read-only control chain for this project stage.</p>
                    </div>
                    {approvalPathItems.find((item) => item.isCurrent) ? (
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                        Current approver
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {approvalPathItems.map((item, index) => (
                      <div key={item.id} className="grid gap-2">
                        <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${item.toneClass} ${item.isCurrent ? "ring-2 ring-slate-950/20" : ""}`}>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{item.roleLabel}</p>
                            <p className="mt-1 text-xs opacity-80">{item.reason}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            {item.isCurrent ? <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Current</p> : null}
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em]">{item.stateLabel}</p>
                          </div>
                        </div>
                        {index < approvalPathItems.length - 1 ? (
                          <div className="mx-auto h-3 w-px bg-slate-300" aria-hidden />
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-700">{approvalOutcomeLine}</p>
                </div>
                {selectedTask ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Action against this stage</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{selectedTask.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedTask.decisionCue.primaryCue}</p>
                  </div>
                ) : null}
                {lockedRequestActive ? (
                  <div className="rounded-[24px] border border-teal-200 bg-[linear-gradient(180deg,rgba(240,253,250,1)_0%,rgba(236,253,245,0.92)_100%)] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Locked</p>
                    <p className="mt-2 text-base font-semibold text-slate-950">{lockedRequestReceipt?.outcomeHeadline ?? "Decision recorded"}</p>
                    <p className="mt-2 text-sm text-slate-600">{lockedRequestReceipt?.outcomeLine ?? "Decision recorded - audit log updated."}</p>
                    <p className="mt-2 text-sm text-slate-600">This decision cannot be undone here.</p>
                  </div>
                ) : lastActionOutcome ? (
                  <div className={`rounded-[24px] border px-4 py-4 ${
                    lastActionOutcome.result === "advanced" || lastActionOutcome.result === "released"
                      ? "border-teal-200 bg-[linear-gradient(180deg,rgba(240,253,250,1)_0%,rgba(236,253,245,0.92)_100%)]"
                      : lastActionOutcome.result === "exception" || lastActionOutcome.result === "blocked"
                        ? "border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,1)_0%,rgba(254,243,199,0.62)_100%)]"
                        : "border-slate-200 bg-slate-50"
                  }`}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Done</p>
                    <p className="mt-2 text-base font-semibold text-slate-950">{getOutcomeHeadline(lastActionOutcome)}</p>
                    <p className="mt-2 text-sm text-slate-600">Decision recorded. Funds / stage updated.</p>
                  </div>
                ) : null}

                {activeRequestState ? (
                  <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${
                      activeRequestState.approveAvailable || activeRequestState.rejectAvailable || activeRequestState.requestInfoAvailable
                        ? "border-teal-200 bg-white text-slate-900"
                        : "border-amber-200 bg-amber-50 text-amber-950"
                    }`}>
                      {activeRequestState.approveAvailable || activeRequestState.rejectAvailable || activeRequestState.requestInfoAvailable
                        ? "All actions are logged."
                        : activeRequestState.noActionReason}
                    </div>

                    {activeDecisionComposerId ? (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <textarea
                          className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          placeholder={activeDecisionComposerId === "request-info" ? "What information is needed?" : "Reason for this decision"}
                          value={requestDecisionNote}
                          onChange={(event) => setRequestDecisionNote(event.target.value)}
                        />
                        {(activeDecisionComposerId === "reject" || activeDecisionComposerId === "request-info") ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            {activeDecisionComposerId === "reject"
                              ? getRequestConsequenceLine("reject")
                              : "This request will be returned for update and the audit log will record your note."}
                          </div>
                        ) : null}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedTask?.id) return;
                              if (activeDecisionComposerId === "reject") {
                                runRequestMutation(`request:${selectedTask?.id}:reject`, (current) => rejectRequest(current, selectedTask!.id, requestDecisionNote));
                                return;
                              }
                              runRequestMutation(`request:${selectedTask?.id}:request_info`, (current) => requestInfo(current, selectedTask!.id, requestDecisionNote));
                            }}
                            disabled={requestDecisionNote.trim().length === 0 || pendingActionId !== null}
                            className={getActionButtonClass({ actionId: activeDecisionComposerId, label: "Confirm", outcomeLabel: "", stateTransitionPreview: { fromState: "", toState: "" }, confidence: "high", isPrimary: false }, requestDecisionNote.trim().length === 0 || pendingActionId !== null)}
                          >
                            <span className="block">
                              {pendingActionId !== null ? "Recording..." : activeDecisionComposerId === "reject" ? "Confirm rejection" : "Confirm"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDecisionComposerId(null);
                              setRequestFinalConfirmation(null);
                              setRequestDecisionNote("");
                            }}
                            className="min-h-12 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {requestFinalConfirmation ? (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          {requestFinalConfirmation.consequence}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedTask?.id) return;
                              runRequestMutation(`request:${selectedTask?.id}:approve`, (current) => approveRequest(current, selectedTask!.id));
                            }}
                            disabled={pendingActionId === `request:${selectedTask?.id}:approve`}
                            className={getActionButtonClass(
                              {
                                actionId: `request:${selectedTask?.id}:approve`,
                                label: "Confirm decision",
                                outcomeLabel: "",
                                stateTransitionPreview: { fromState: "", toState: "" },
                                confidence: "high",
                                isPrimary: true,
                              },
                              pendingActionId === `request:${selectedTask?.id}:approve`,
                              true,
                            )}
                          >
                            <span className="block text-base font-semibold">
                              {pendingActionId === `request:${selectedTask?.id}:approve` ? "Recording..." : "Confirm decision"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRequestFinalConfirmation(null)}
                            className="min-h-12 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {activeRequestState.approveAvailable || activeRequestState.rejectAvailable || activeRequestState.requestInfoAvailable ? (
                      <div className="mt-4 grid gap-3">
                        {activeRequestState.approveAvailable ? (
                          <button
                            type="button"
                            aria-label={uiControlChecklist.requestPrimaryAction.label}
                            onClick={() => setRequestFinalConfirmation({ action: "approve", consequence: getRequestConsequenceLine("approve") })}
                            disabled={pendingActionId === `request:${selectedTask?.id}:approve` || requestFinalConfirmation !== null}
                            className={getActionButtonClass(
                              {
                                actionId: `request:${selectedTask?.id}:approve`,
                                label: activeRequestState.primaryActionLabel,
                                outcomeLabel: "",
                                stateTransitionPreview: { fromState: "", toState: "" },
                                confidence: "high",
                                isPrimary: true,
                              },
                              pendingActionId === `request:${selectedTask?.id}:approve` || requestFinalConfirmation !== null,
                              true,
                            )}
                          >
                            <span className="block text-base font-semibold">
                              {requestFinalConfirmation?.action === "approve" ? "Awaiting confirmation" : pendingActionId === `request:${selectedTask?.id}:approve` ? "Recording..." : activeRequestState.primaryActionLabel}
                            </span>
                            <span className="mt-1 block text-sm opacity-85">Final confirmation required.</span>
                          </button>
                        ) : null}

                        {activeRequestState.rejectAvailable ? (
                          <button
                            type="button"
                            aria-label={uiControlChecklist.requestSecondaryAction.label}
                            onClick={() => {
                              setRequestFinalConfirmation(null);
                              setActiveDecisionComposerId("reject");
                            }}
                            className={getActionButtonClass({ actionId: "reject", label: "Reject", outcomeLabel: "", stateTransitionPreview: { fromState: "", toState: "" }, confidence: "medium", isPrimary: false }, false)}
                          >
                            <span className="block">Reject</span>
                          </button>
                        ) : null}

                        {activeRequestState.requestInfoAvailable ? (
                          <button
                            type="button"
                            aria-label={uiControlChecklist.requestSecondaryAction.label}
                            onClick={() => {
                              setRequestFinalConfirmation(null);
                              setActiveDecisionComposerId("request-info");
                            }}
                            className={getActionButtonClass({ actionId: "request-info", label: "Request more information", outcomeLabel: "", stateTransitionPreview: { fromState: "", toState: "" }, confidence: "medium", isPrimary: false }, false)}
                          >
                            <span className="block">Request more information</span>
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    No action available.
                  </div>
                )}
              </div>
            </RequestStepCard>
          </>
        ) : null}
        </div>
        </>
        ) : null}

        {section === "summary" ? (
        <>
        <SectionCard
          title={currentUser.role === "executive" ? "Exceptions Overview" : "What Needs Your Attention"}
          subtitle={
            currentUser.role === "executive"
              ? "Important project stage issues to understand now."
              : "Project stages that currently need attention in this project."
          }
        >
          <div className="grid gap-3">
            {currentProjectInbox.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleWorkspaceItemSelect(item)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{item.stageName ?? item.projectName}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{item.decisionCue.primaryCue}</p>
                    {item.decisionCue.secondaryCue ? (
                      <p className="mt-1 text-sm text-slate-500">{item.decisionCue.secondaryCue}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[item.priority]}`}>
                      {item.priority}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${urgencyTone(item.decisionCue.decisionUrgency)}`}>
                      {urgencyLabel(item.decisionCue.decisionUrgency)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-slate-500">Open in</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{item.decisionCue.entryOrientationLabel ?? "Overview"}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-slate-500">Who acts</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{item.handoff?.toRoleLabel ?? item.ownerLabel}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-slate-500">Focus</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{focusHintLabel(item.decisionCue.detailFocusHint)}</p>
                  </div>
                </div>
              </button>
            ))}
            {currentProjectInbox.length === 0 ? (
              <p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">
                {currentUser.role === "executive"
                  ? "No material issue needs executive attention in the selected project."
                  : `No immediate ${getUserFacingRoleLabel(currentUser.role).toLowerCase()} task is waiting in this project.`}
              </p>
            ) : null}
          </div>
          {crossProjectAttentionCount > 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              {crossProjectAttentionCount} additional item{crossProjectAttentionCount === 1 ? "" : "s"} need attention in other projects.
            </p>
          ) : null}
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <SectionCard title="Payment status">
            <div
              className={`rounded-[28px] border p-6 ${
                selectedDecision.explanation.tone === "positive"
                  ? "border-teal-200 bg-[linear-gradient(180deg,rgba(240,253,250,1)_0%,rgba(236,253,245,0.92)_100%)]"
                  : selectedDecision.explanation.tone === "warning"
                    ? "border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,1)_0%,rgba(254,243,199,0.62)_100%)]"
                    : "border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,1)_0%,rgba(241,245,249,0.92)_100%)]"
              }`}
            >
              <p className="text-sm text-slate-500">{stageDetail.stage.name}</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-3xl font-semibold tracking-[-0.02em] text-slate-950">{selectedDecision.explanation.label}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{selectedDecision.explanation.reason}</p>
                </div>
                <div className="rounded-3xl bg-white/88 px-5 py-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)]">
                  <p className="text-xs text-slate-500">Ready to pay now</p>
                  <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-slate-950">{currency.format(selectedDecision.releasableAmount)}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-xs text-slate-500">Holding payment up</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">{blockerSummaryText}</p>
                </div>
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-xs text-slate-500">What happens next</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">{stageDetail.operationalStatus.nextStep}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Next action">
            {primaryAction ? (
              <div className="rounded-[28px] border border-slate-200/80 bg-slate-50 p-6">
                <p className="text-sm text-slate-500">{primaryAction.stageName}</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">{primaryAction.primaryAction.title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{primaryAction.primaryAction.detail}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs text-slate-500">Who needs to act</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{primaryResponsibilityCue}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs text-slate-500">What happens next</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{primaryAction.operationalStatus.nextStep}</p>
                  </div>
                </div>
              </div>
            ) : projectLeadAction ? (
              <div className="rounded-[28px] border border-slate-200/80 bg-slate-50 p-6">
                <p className="text-sm text-slate-500">{projectLeadAction.stageName}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">No direct action for {getUserFacingRoleLabel(currentUser.role)}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{projectLeadAction.primaryAction.title}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs text-slate-500">Who needs to act</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">
                      {getResponsibilityCue(projectLeadAction.primaryAction.actionableBy, projectLeadAction.primaryAction.actionType)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs text-slate-500">Why you are read-only</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">This role can monitor the payment position but cannot complete the next governed step.</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">No immediate action is required.</p>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Amount status">
          <div className="rounded-[28px] border border-slate-200/80 bg-slate-50 p-5">
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl bg-white/95 p-4">
                <p className="text-sm text-slate-500">Balance</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(fundingSummary.projectBalance)}</p>
              </div>
              <div className="rounded-2xl bg-white/95 p-4">
                <p className="text-sm text-slate-500">WIP</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(fundingSummary.wipTotal)}</p>
              </div>
              <div className="rounded-2xl bg-white/95 p-4">
                <p className="text-sm text-slate-500">{shortfallActive ? "Shortfall" : "Surplus"}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {currency.format(shortfallActive ? fundingSummary.shortfall : fundingSummary.surplusCash)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/95 p-4">
                <p className="text-sm text-slate-500">Ready to pay</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(fundingSummary.releasableFunds)}</p>
              </div>
              <div className="rounded-2xl bg-white/95 p-4">
                <p className="text-sm text-slate-500">On hold</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(fundingSummary.frozenFunds)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{fundingSummarySentence}</p>
          </div>
        </SectionCard>
        </>
        ) : null}

        {(section === "payments" || section === "packages") ? (
        <div className={`grid gap-6 ${section === "packages" ? "xl:grid-cols-1" : "xl:grid-cols-[1.3fr_0.9fr]"}`}>
          <div className="grid gap-6">
            {lastActionOutcome ? (
              <SectionCard
                title="Recent update"
                subtitle={`${project.name} · ${stageDetail.stage.name}`}
              >
                <div className={`rounded-[24px] border px-4 py-4 ${
                  lastActionOutcome.result === "advanced" || lastActionOutcome.result === "released"
                    ? "border-teal-200 bg-[linear-gradient(180deg,rgba(240,253,250,1)_0%,rgba(236,253,245,0.92)_100%)]"
                    : lastActionOutcome.result === "exception" || lastActionOutcome.result === "blocked"
                      ? "border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,1)_0%,rgba(254,243,199,0.62)_100%)]"
                      : "border-slate-200 bg-slate-50"
                }`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">What changed</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{getOutcomeHeadline(lastActionOutcome)}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Ready to pay {currency.format(stageDetail.releaseDecision.releasableAmount)} · On hold {currency.format(stageDetail.releaseDecision.frozenAmount)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{getOutcomeTrustLine(lastActionOutcome, stageDetail)}</p>
                </div>
              </SectionCard>
            ) : null}

            {section === "packages" ? (
            <SectionCard
              title="My projects"
              subtitle="Select a project to view its live stage record, assigned roles, funding status, supporting information, approval path, and payment position."
            >
              <div className="grid gap-3">
                {projectDirectory.map((entry) => (
                  <button
                    key={entry.projectId}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(entry.projectId);
                      setSelectedWorkspaceCue(null);
                      setShowStageDetail(false);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      entry.isCurrent
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-base font-semibold ${entry.isCurrent ? "text-white" : "text-slate-950"}`}>{entry.projectName}</p>
                        <p className={`mt-1 text-sm ${entry.isCurrent ? "text-slate-300" : "text-slate-600"}`}>{entry.workspaceSummary.postureLabel}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${entry.isCurrent ? "bg-white text-slate-950" : entry.requestCount > 0 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>
                        {entry.requestCount > 0 ? `${entry.requestCount} notification${entry.requestCount === 1 ? "" : "s"}` : "No notifications waiting"}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm ${entry.isCurrent ? "text-slate-300" : "text-slate-500"}`}>{entry.workspaceSummary.postureReason}</p>
                    <div className={`mt-3 flex flex-wrap gap-2 text-xs ${entry.isCurrent ? "text-slate-300" : "text-slate-500"}`}>
                      <span>Ready to pay {currency.format(entry.fundingSummary.releasableFunds)}</span>
                      <span aria-hidden="true">•</span>
                      <span>On hold {currency.format(entry.fundingSummary.frozenFunds)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>
            ) : null}

            {section === "packages" ? (
            <SectionCard
              title="Project stages and contracts"
              subtitle={
                audienceMode === "executive"
                  ? "Concise project stage status and the key hold-ups in the commercial sequence."
                  : "Select a project stage to view assigned roles, funding status, supporting information, approval path, and payment conditions."
              }
            >
              <div className="grid gap-3">
                {fundingSummary.stageSummaries.map((summary) => {
                  const detail = getStageDetail(state, summary.stageId);
                  const stageRequest = currentProjectInbox.find((item) => item.stageId === summary.stageId) ?? null;
                  const stageActionLabel = getStageSurfaceActionLabel(detail, Boolean(stageRequest));
                  return (
                    <button
                      key={summary.stageId}
                      type="button"
                      onClick={() => {
                        openStageContext(summary.stageId, stageRequest?.deepLinkTarget?.section ?? "overview", stageRequest?.decisionCue ?? null);
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${
                        activeStageId === summary.stageId
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{summary.stageName}</p>
                        <div className="flex items-center gap-2">
                          {detail.notificationCue ? (
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                detail.notificationCue.tone === "positive"
                                  ? "bg-teal-50 text-teal-900"
                                  : detail.notificationCue.tone === "warning"
                                    ? "bg-amber-50 text-amber-900"
                                    : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {detail.notificationCue.label}
                            </span>
                          ) : null}
                          <span className="text-sm">{detail.releaseSummary.decisionLabel ?? detail.operationalStatus.label}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm opacity-80">
                        {detail.blockers[0]?.label ?? detail.operationalStatus.reason}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        {detail.treasuryReadiness.label} · Ready to pay {currency.format(detail.releaseDecision.releasableAmount)} · On hold {currency.format(detail.disputeSummary.frozenValue)}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs opacity-60">Updated {formatRelativeTime(detail.lastUpdatedAt)}</p>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${activeStageId === summary.stageId ? "bg-white text-slate-950" : "bg-slate-950 text-white"}`}>
                          {stageActionLabel}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {fundingSummary.stageSummaries.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No additional project stages need action in this project.
                  </div>
                ) : null}
              </div>
            </SectionCard>
            ) : null}

            {section === "payments" && audienceMode === "treasury" ? <LedgerTransactionsList transactions={ledgerTransactions} /> : null}
          </div>

          {section === "payments" ? (
          <div className="grid gap-6">
            <ExpandableSection
              title="Status summary"
              subtitle={
                audienceMode === "executive"
                  ? "Project stage counts by payment status."
                  : "Current project stage counts across payment, sign-off, review, and on-hold states."
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-700">Payment blocked</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.blocked}</p>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-900">Under review</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.in_review}</p>
                </div>
                <div className="rounded-2xl bg-teal-50 p-4">
                  <p className="text-sm text-teal-900">Ready</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.ready}</p>
                </div>
                <div className="rounded-2xl bg-teal-50 p-4">
                  <p className="text-sm text-teal-900">Partly signed off</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.partially_approved}</p>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-900">Signed off</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.approved}</p>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-900">Part paid</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.partially_released}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-700">Paid</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.released}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">Disputed</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.disputed}</p>
                </div>
                <div className="rounded-2xl bg-teal-50 p-4">
                  <p className="text-sm text-teal-900">On Hold</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.on_hold}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-teal-50 p-4">
                  <p className="text-sm text-teal-900">Ready to pay</p>
                  <p className="mt-2 text-2xl font-semibold text-teal-950">{controlSummary.releasable}</p>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-900">Payment-ready value</p>
                  <p className="mt-2 text-2xl font-semibold text-cyan-950">{currency.format(journey.payableValue)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">On-hold value</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(journey.frozenValue)}</p>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection
              title="Payment conditions"
              subtitle={
                audienceMode === "executive"
                  ? "Concise project stage payment-readiness summaries."
                  : "Payment is allowed only when funding, supporting information, and sign-off are complete unless a funder override is active. On-hold value remains outside payable amount."
              }
              >
                <div className="grid gap-3">
                {(audienceMode === "executive" ? releaseDecisions.slice(0, 3) : releaseDecisions).map((decision) => (
                  <article key={decision.stageId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    {(() => {
                      const detail = getStageDetail(state, decision.stageId);
                      const stageRequest = currentProjectInbox.find((item) => item.stageId === decision.stageId) ?? null;
                      const stageActionLabel = getStageSurfaceActionLabel(detail, Boolean(stageRequest));
                      const canReleaseFromList = detail.actionReadiness.release.isAvailable && detail.releaseDecision.releasable;
                      const canFundFromList = detail.actionReadiness.fundStage.isAvailable && detail.funding.gapToRequiredCover > 0;

                      return (
                        <>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{decision.stageName}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[decision.status]}`}>
                        {decision.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div
                      className={`mt-3 rounded-2xl border px-3 py-3 ${
                        decision.explanation.tone === "positive"
                          ? "border-teal-200 bg-teal-50"
                          : decision.explanation.tone === "warning"
                            ? "border-amber-200 bg-amber-50"
                            : "border-slate-300 bg-slate-100"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          decision.explanation.tone === "positive"
                            ? "text-teal-950"
                            : decision.explanation.tone === "warning"
                              ? "text-amber-950"
                              : "text-slate-900"
                        }`}
                      >
                        {decision.explanation.label}
                      </p>
                      <p
                        className={`mt-1 text-sm ${
                          decision.explanation.tone === "positive"
                            ? "text-teal-900"
                            : decision.explanation.tone === "warning"
                              ? "text-amber-900"
                              : "text-slate-700"
                        }`}
                      >
                        {decision.explanation.reason}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Ready to pay {currency.format(decision.releasableAmount)} · On hold {currency.format(decision.frozenAmount)} · In progress {currency.format(decision.blockedAmount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Payment basis: {decision.explanation.decisionBasis}</p>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {decision.reasons.map((reason, index) => (
                        <p key={`${decision.stageId}-${reason.type}-${index}`} className="text-sm text-slate-600">
                          <span className="font-medium capitalize text-slate-800">{reason.type.replaceAll("_", " ")}:</span> {reason.message}
                        </p>
                      ))}
                    </div>
                    {decision.overridden ? (
                      <p className="mt-2 text-xs font-medium text-teal-900">
                        Override active. Payment proceeds by override, not through the normal payment path.
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (canReleaseFromList) {
                            handleReleaseStageFor(decision.stageId);
                            openStageContext(decision.stageId, "release");
                            return;
                          }

                          if (canFundFromList) {
                            handleFundStageFor(decision.stageId);
                            openStageContext(decision.stageId, "funding");
                            return;
                          }

                          if (stageRequest) {
                            handleWorkspaceItemSelect(stageRequest);
                            return;
                          }

                          openStageContext(decision.stageId, "overview");
                        }}
                        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        {stageActionLabel}
                      </button>
                      {!canReleaseFromList && !canFundFromList ? (
                        <span className="inline-flex items-center rounded-full bg-white px-3 py-2 text-xs text-slate-500">
                          {stageRequest
                            ? `Reason: ${stageRequest.reason}`
                            : detail.actionDescriptorMap["release"]?.blockerSummary ?? detail.operationalStatus.reason}
                        </span>
                      ) : null}
                    </div>
                        </>
                      );
                    })()}
                  </article>
                ))}
                {releaseDecisions.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No payment action required in this project right now.
                  </div>
                ) : null}
              </div>
            </ExpandableSection>
          </div>
          ) : null}
        </div>
        ) : null}

        {section === "packages" ? (
        <div className="grid gap-6">
          <SectionCard
            title="What happens next"
            subtitle={`${project.name} · ${stageDetail.stage.name}`}
          >
            <div className="grid gap-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-slate-950">{stageCurrentStep?.stepLabel ?? stageDetail.operationalStatus.label}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{stageCurrentStep?.assuranceLine ?? stageDetail.operationalStatus.reason}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedTask?.decisionCue.primaryCue ?? stageCurrentStep?.supportingSentence ?? stageDetail.operationalStatus.nextStep}
                    </p>
                    {selectedTask ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Notification received: {selectedTask.title}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    Live stage step
                  </span>
                </div>
              </div>

              {lockedRequestActive ? (
                <div className="rounded-[24px] border border-teal-200 bg-[linear-gradient(180deg,rgba(240,253,250,1)_0%,rgba(236,253,245,0.92)_100%)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Recorded</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{lockedRequestReceipt?.outcomeHeadline ?? "Decision recorded"}</p>
                  <p className="mt-2 text-sm text-slate-600">{lockedRequestReceipt?.outcomeLine ?? "Decision recorded - audit log updated."}</p>
                  <p className="mt-2 text-sm text-slate-600">This stage step has been completed and cannot be undone here.</p>
                </div>
              ) : lastActionOutcome ? (
                <div className={`rounded-[24px] border px-4 py-4 ${
                  lastActionOutcome.result === "advanced" || lastActionOutcome.result === "released"
                    ? "border-teal-200 bg-[linear-gradient(180deg,rgba(240,253,250,1)_0%,rgba(236,253,245,0.92)_100%)]"
                    : lastActionOutcome.result === "exception" || lastActionOutcome.result === "blocked"
                      ? "border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,1)_0%,rgba(254,243,199,0.62)_100%)]"
                      : "border-slate-200 bg-slate-50"
                }`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Latest outcome</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{getOutcomeHeadline(lastActionOutcome)}</p>
                  <p className="mt-2 text-sm text-slate-600">Decision recorded. Funds / stage updated.</p>
                </div>
              ) : null}

              {activeRequestState ? (
                <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${
                    activeRequestState.approveAvailable || activeRequestState.rejectAvailable || activeRequestState.requestInfoAvailable
                      ? "border-teal-200 bg-white text-slate-900"
                      : "border-amber-200 bg-amber-50 text-amber-950"
                  }`}>
                    {activeRequestState.approveAvailable || activeRequestState.rejectAvailable || activeRequestState.requestInfoAvailable
                      ? "This is the current governed step for this project stage."
                      : activeRequestState.noActionReason}
                  </div>

                  {activeDecisionComposerId ? (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <textarea
                        className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        placeholder={activeDecisionComposerId === "request-info" ? "What information is needed?" : "Reason for this decision"}
                        value={requestDecisionNote}
                        onChange={(event) => setRequestDecisionNote(event.target.value)}
                      />
                      {(activeDecisionComposerId === "reject" || activeDecisionComposerId === "request-info") ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          {activeDecisionComposerId === "reject"
                            ? getRequestConsequenceLine("reject")
                            : "This stage will be returned for update and the audit log will record your note."}
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedTask?.id) return;
                            if (activeDecisionComposerId === "reject") {
                              runRequestMutation(`request:${selectedTask?.id}:reject`, (current) => rejectRequest(current, selectedTask!.id, requestDecisionNote));
                              return;
                            }
                            runRequestMutation(`request:${selectedTask?.id}:request_info`, (current) => requestInfo(current, selectedTask!.id, requestDecisionNote));
                          }}
                          disabled={requestDecisionNote.trim().length === 0 || pendingActionId !== null}
                          className={getActionButtonClass({ actionId: activeDecisionComposerId, label: "Confirm", outcomeLabel: "", stateTransitionPreview: { fromState: "", toState: "" }, confidence: "high", isPrimary: false }, requestDecisionNote.trim().length === 0 || pendingActionId !== null)}
                        >
                          <span className="block">
                            {pendingActionId !== null ? "Recording..." : activeDecisionComposerId === "reject" ? "Confirm rejection" : "Confirm"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDecisionComposerId(null);
                            setRequestFinalConfirmation(null);
                            setRequestDecisionNote("");
                          }}
                          className="min-h-12 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {requestFinalConfirmation ? (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {requestFinalConfirmation.consequence}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedTask?.id) return;
                            runRequestMutation(`request:${selectedTask?.id}:approve`, (current) => approveRequest(current, selectedTask!.id));
                          }}
                          disabled={pendingActionId === `request:${selectedTask?.id}:approve`}
                          className={getActionButtonClass(
                            {
                              actionId: `request:${selectedTask?.id}:approve`,
                              label: "Confirm decision",
                              outcomeLabel: "",
                              stateTransitionPreview: { fromState: "", toState: "" },
                              confidence: "high",
                              isPrimary: true,
                            },
                            pendingActionId === `request:${selectedTask?.id}:approve`,
                            true,
                          )}
                        >
                          <span className="block text-base font-semibold">
                            {pendingActionId === `request:${selectedTask?.id}:approve` ? "Recording..." : "Confirm decision"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestFinalConfirmation(null)}
                          className="min-h-12 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {activeRequestState.approveAvailable || activeRequestState.rejectAvailable || activeRequestState.requestInfoAvailable ? (
                    <div className="mt-4 grid gap-3">
                      {activeRequestState.approveAvailable ? (
                        <button
                          type="button"
                          aria-label={uiControlChecklist.requestPrimaryAction.label}
                          onClick={() => setRequestFinalConfirmation({ action: "approve", consequence: getRequestConsequenceLine("approve") })}
                          disabled={pendingActionId === `request:${selectedTask?.id}:approve` || requestFinalConfirmation !== null}
                          className={getActionButtonClass(
                            {
                              actionId: `request:${selectedTask?.id}:approve`,
                              label: activeRequestState.primaryActionLabel,
                              outcomeLabel: "",
                              stateTransitionPreview: { fromState: "", toState: "" },
                              confidence: "high",
                              isPrimary: true,
                            },
                            pendingActionId === `request:${selectedTask?.id}:approve` || requestFinalConfirmation !== null,
                            true,
                          )}
                        >
                          <span className="block text-base font-semibold">
                            {requestFinalConfirmation?.action === "approve" ? "Awaiting confirmation" : pendingActionId === `request:${selectedTask?.id}:approve` ? "Recording..." : activeRequestState.primaryActionLabel}
                          </span>
                          <span className="mt-1 block text-sm opacity-85">Final confirmation required.</span>
                        </button>
                      ) : null}

                      {activeRequestState.rejectAvailable ? (
                        <button
                          type="button"
                          aria-label={uiControlChecklist.requestSecondaryAction.label}
                          onClick={() => {
                            setRequestFinalConfirmation(null);
                            setActiveDecisionComposerId("reject");
                          }}
                          className={getActionButtonClass({ actionId: "reject", label: "Reject", outcomeLabel: "", stateTransitionPreview: { fromState: "", toState: "" }, confidence: "medium", isPrimary: false }, false)}
                        >
                          <span className="block">Reject</span>
                        </button>
                      ) : null}

                      {activeRequestState.requestInfoAvailable ? (
                        <button
                          type="button"
                          aria-label={uiControlChecklist.requestSecondaryAction.label}
                          onClick={() => {
                            setRequestFinalConfirmation(null);
                            setActiveDecisionComposerId("request-info");
                          }}
                          className={getActionButtonClass({ actionId: "request-info", label: "Request more information", outcomeLabel: "", stateTransitionPreview: { fromState: "", toState: "" }, confidence: "medium", isPrimary: false }, false)}
                        >
                          <span className="block">Request more information</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : taskDescriptorSet?.primary ? (
                <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm text-slate-900">
                    This is the current live step for this project stage.
                  </div>

                  {taskDescriptorSet.primary.actionId === "add-evidence" ? (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <input
                        className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        placeholder="Supporting information title"
                        value={evidenceTitle}
                        disabled={!canEditPrimaryActionFields(taskDescriptorSet.primary)}
                        onChange={(event) => setEvidenceTitle(event.target.value)}
                      />
                      <select
                        className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        value={evidenceType}
                        disabled={!canEditPrimaryActionFields(taskDescriptorSet.primary)}
                        onChange={(event) => setEvidenceType(event.target.value as EvidenceType)}
                      >
                        <option value="file">File</option>
                        <option value="form">Form</option>
                      </select>
                    </div>
                  ) : null}

                  {activeStageComposerDescriptor ? (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <textarea
                        className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        placeholder={getDecisionReasonPlaceholder(activeStageComposerDescriptor)}
                        value={getDescriptorReasonDraft(activeStageComposerDescriptor)}
                        disabled={!canEditPrimaryActionFields(activeStageComposerDescriptor)}
                        onChange={(event) => setDescriptorReasonDraft(activeStageComposerDescriptor, event.target.value)}
                      />
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {getDecisionConfirmationLine(activeStageComposerDescriptor)}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => runDescriptorAction(activeStageComposerDescriptor)}
                          disabled={isDescriptorDisabled(activeStageComposerDescriptor) || pendingActionId === activeStageComposerDescriptor.actionId}
                          className={getActionButtonClass(activeStageComposerDescriptor, isDescriptorDisabled(activeStageComposerDescriptor) || pendingActionId === activeStageComposerDescriptor.actionId)}
                        >
                          <span className="block">{pendingActionId === activeStageComposerDescriptor.actionId ? "Recording..." : activeStageComposerDescriptor.label}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveDecisionComposerId(null)}
                          className="min-h-12 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3">
                    <button
                      type="button"
                      aria-label={uiControlChecklist.requestPrimaryAction.label}
                      onClick={() => {
                        if (requiresDecisionReason(taskDescriptorSet.primary)) {
                          setActiveDecisionComposerId(taskDescriptorSet.primary.actionId);
                          return;
                        }
                        runDescriptorAction(taskDescriptorSet.primary);
                      }}
                      disabled={!shouldShowControl(requestPrimaryActionControl) || !isControlActive(requestPrimaryActionControl) || pendingActionId === taskDescriptorSet.primary.actionId}
                      className={getActionButtonClass(taskDescriptorSet.primary, !shouldShowControl(requestPrimaryActionControl) || !isControlActive(requestPrimaryActionControl) || pendingActionId === taskDescriptorSet.primary.actionId, true)}
                    >
                      <span className="block text-base font-semibold">
                        {pendingActionId === taskDescriptorSet.primary.actionId ? "Recording..." : taskDescriptorSet.primary.label}
                      </span>
                      <span className="mt-1 block text-sm opacity-85">{getDecisionConfirmationLine(taskDescriptorSet.primary)}</span>
                    </button>

                    {taskDescriptorSet.secondary.map((descriptor) => (
                      <button
                        key={descriptor.actionId}
                        type="button"
                        aria-label={uiControlChecklist.requestSecondaryAction.label}
                        onClick={() => {
                          if (requiresDecisionReason(descriptor)) {
                            setActiveDecisionComposerId(descriptor.actionId);
                            return;
                          }
                          runDescriptorAction(descriptor);
                        }}
                        disabled={isDescriptorDisabled(descriptor) || pendingActionId === descriptor.actionId}
                        className={getActionButtonClass(descriptor, isDescriptorDisabled(descriptor) || pendingActionId === descriptor.actionId)}
                      >
                        <span className="block">{pendingActionId === descriptor.actionId ? "Recording..." : descriptor.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  No action available for this project stage right now.
                </div>
              )}
            </div>
          </SectionCard>

          {audienceMode !== "executive" ? (
          <ExpandableSection title="Funding status" subtitle="Funding position, payment cover, and any top-up needed for the selected project stage.">
            <div className="rounded-2xl border border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowFundingCalculation((current) => !current)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                    <span className="text-sm font-semibold text-slate-900">How this funding status is calculated</span>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {showFundingCalculation ? "Hide" : "Show"}
                </span>
              </button>
              {showFundingCalculation ? (
                <div className="border-t border-slate-200 px-4 py-4">
                  <div className="grid gap-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-4">
                      <span>Balance</span>
                      <span className="font-medium text-slate-950">{currency.format(fundingSummary.projectBalance)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Less WIP</span>
                      <span className="font-medium text-slate-950">-{currency.format(fundingSummary.wipTotal)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-200 pt-3 text-base">
                      <span className="font-semibold text-slate-900">{shortfallActive ? "Shortfall" : "Surplus"}</span>
                      <span className={`font-semibold ${shortfallActive ? "text-amber-950" : "text-teal-950"}`}>
                        {currency.format(shortfallActive ? fundingSummary.shortfall : fundingSummary.surplusCash)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4 pt-1 text-sm">
                      <span>In progress</span>
                      <span className="font-medium text-slate-950">{currency.format(fundingSummary.inProgressFunds)}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-4">
              <LedgerSummaryCard
                fundingSummary={fundingSummary}
                depositAmount={depositAmount}
                fundingSource={fundingSource}
                selectedProjectStageName={stageDetail.stage.name}
                onDepositAmountChange={setDepositAmount}
                onFundingSourceChange={setFundingSource}
                onAddFunds={handleDeposit}
                canAddFunds={canAddFunds}
                addFundsHelperText={addFundsHelperText}
              />
            </div>
          </ExpandableSection>
          ) : null}

          <ExpandableSection
            title="Project stage record"
            subtitle="Read the live stage record in the same sequence used to control commercial progress and payment."
            open={showStageDetail}
            onToggle={setShowStageDetail}
          >
            {stageDetailSurface}
          </ExpandableSection>
        </div>
        ) : null}

        {section === "activity" ? (
        <div className="grid gap-6">
          <ExpandableSection title="Audit History" subtitle={`Last activity ${formatRelativeTime(projectActivity.lastActivityAt)}.`}>
            <div className="grid gap-3 lg:grid-cols-2">
              {projectActivity.recentEvents.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">{entry.summary}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {(entry.actor ?? "system").toString()} · {entry.stageName ?? project.name}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {entry.eventType} · {new Date(entry.timestamp).toLocaleString("en-GB")}
                  </p>
                </article>
              ))}
              {projectActivity.recentEvents.length === 0 ? <p className="text-sm text-slate-500">No actions recorded yet.</p> : null}
            </div>
          </ExpandableSection>

          <ExpandableSection title="Full task list" subtitle="All remaining actions, ordered by urgency and payment impact.">
            <div className="grid gap-3">
              {actionQueue.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.stageName}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.operationalStatus.label}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="mt-3 rounded-2xl bg-white p-3">
                    <p className="text-sm font-medium text-slate-900">{item.primaryAction.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.primaryAction.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-50 px-3 py-1">
                        Responsibility: {getResponsibilityCue(item.primaryAction.actionableBy, item.primaryAction.actionType)}
                      </span>
                      <span className="rounded-full bg-slate-50 px-3 py-1">Next step: {item.operationalStatus.nextStep}</span>
                    </div>
                  </div>
                </article>
              ))}
              {actionQueue.length === 0 ? <p className="text-sm text-slate-500">No pending actions.</p> : null}
            </div>
          </ExpandableSection>
        </div>
        ) : null}

        {section === "settings" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Profile and account" subtitle="Current user identity and prototype truth state.">
            <div className="grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Name</p>
                <p className="mt-1 text-sm font-medium text-slate-950">{currentUser.name}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Current project</p>
                <p className="mt-1 text-sm font-medium text-slate-950">{project.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {currentProjectInbox.length > 0
                    ? `${currentProjectInbox.length} notification${currentProjectInbox.length === 1 ? "" : "s"} waiting in this project.`
                    : "No notifications waiting in this project."}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Acting as</p>
                <p className="mt-1 text-sm font-medium text-slate-950">{getUserFacingRoleLabel(currentUser.role)}</p>
                <p className="mt-1 text-xs text-slate-500">Role context stays secondary to the selected project and changes which governed actions are available.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                Not yet available in this prototype. Account editing and notification preferences are intentionally read-only here.
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Organisation and access" subtitle="Prototype truth state for organisation controls.">
            <div className="grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Organisation</p>
                <p className="mt-1 text-sm font-medium text-slate-950">Shure.Fund organisation</p>
                <p className="mt-1 text-xs text-slate-500">Read-only in this prototype.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Invitations and team access</p>
                <p className="mt-1 text-sm font-medium text-slate-950">Available in a later prototype phase.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                Organisation editing, invitations, and configuration are not yet available in this prototype.
              </div>
            </div>
          </SectionCard>
        </div>
        ) : null}
        </div>
      <style jsx global>{`
        @media print {
          @page {
            margin: 16mm;
          }

          body {
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .print-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          details {
            display: none !important;
          }

          main {
            background: #ffffff !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
