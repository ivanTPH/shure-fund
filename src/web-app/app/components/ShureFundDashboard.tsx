"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import {
  activateVariation,
  addEvidence,
  allocateStageFunds,
  applyOverride,
  createVariation,
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
  getPrimaryActionForRole,
  getProjectWorkspaceSummary,
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
  rejectApproval,
  releaseStage,
  recordLastActionOutcome,
  resolveDispute,
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
import JourneySummaryCard from "./JourneySummaryCard";
import LedgerSummaryCard from "./LedgerSummaryCard";
import LedgerTransactionsList from "./LedgerTransactionsList";
import { useShureFundShellState, type AppSection } from "./ShureFundAppShell";
import StageDetailPanel from "./StageDetailPanel";
import { activeControl, disabledControl, hiddenControl, isControlActive, shouldShowControl, uiControlChecklist } from "./uiCapability";

type RequestDetailSheetKey = "payment" | "supporting" | "approval" | "history";

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
    title: "Requests",
    subtitle: "Open the next request, inspect only what matters, and complete the governed step without working through a dashboard first.",
  },
  summary: {
    title: "Overview",
    subtitle: "Current payment position, the next hold-up to clear, and the project stages that need attention now.",
  },
  payments: {
    title: "Payments",
    subtitle: "Funding position, payment readiness, and value that is ready to pay or on hold.",
  },
  packages: {
    title: "Projects",
    subtitle: "Selectable payment stages within the current project, with live payment detail for the active project stage.",
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

function RequestDetailSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[82vh] rounded-t-[30px] border border-slate-200 bg-white shadow-[0_-28px_60px_-26px_rgba(15,23,42,0.45)] md:inset-y-0 md:right-0 md:left-auto md:w-[32rem] md:max-w-[92vw] md:rounded-none md:rounded-l-[30px]">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Request details</p>
            <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
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
    return "Open request";
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
}: {
  section: AppSection;
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
  const [requestDetailSheet, setRequestDetailSheet] = useState<RequestDetailSheetKey | null>(null);
  const [activeDecisionComposerId, setActiveDecisionComposerId] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
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
    if (selectedWorkspaceCue && selectedWorkspaceCue.stageId !== activeStageId) {
      setSelectedWorkspaceCue(null);
    }
  }, [activeStageId, selectedWorkspaceCue]);

  useEffect(() => {
    setRequestDetailSheet(null);
  }, [activeStageId, selectedStageSection]);

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
    currentProjectInbox.find(
      (item) =>
        item.stageId === activeStageId &&
        (item.deepLinkTarget?.section ?? "overview") === selectedStageSection,
    ) ??
    currentProjectInbox.find((item) => item.stageId === activeStageId) ??
    currentProjectInbox[0] ??
    null;
  const selectedTaskUpdatedLabel = formatRelativeTime(stageDetail.lastUpdatedAt);
  const primaryTaskCount = currentProjectInbox.length;
  const sectionHeading = sectionMeta[section];
  const showAudienceControls = section === "payments" || section === "packages" || section === "activity";
  const showPrintAction = section === "summary" || section === "payments" || section === "packages";

  useEffect(() => {
    if (section !== "actions" || currentProjectInbox.length === 0) {
      return;
    }

    const matchesCurrentTask = currentProjectInbox.some((item) => item.stageId === activeStageId);
    if (matchesCurrentTask) {
      return;
    }

    handleWorkspaceItemSelect(currentProjectInbox[0]);
  }, [section, currentProjectInbox, activeStageId]);

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

  const requestDetailSheetMeta =
    requestDetailSheet === "payment"
      ? {
          title: "Payment position",
          subtitle: `${project.name} · ${stageDetail.stage.name}`,
          content: (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Ready to pay</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{currency.format(stageDetail.releaseDecision.releasableAmount)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">On hold</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{currency.format(stageDetail.releaseDecision.frozenAmount)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">In progress</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{currency.format(stageDetail.releaseDecision.blockedAmount)}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-950">{stageDetail.releaseSummary.headline}</p>
                <p className="mt-2 text-sm text-slate-600">{stageDetail.releaseDecision.explanation.reason}</p>
                {stageDetail.releaseSummary.blockingConditionLabel ? (
                  <p className="mt-3 text-sm text-slate-600">Holding payment up: {stageDetail.releaseSummary.blockingConditionLabel}</p>
                ) : null}
              </div>
            </div>
          ),
        }
      : requestDetailSheet === "supporting"
        ? {
            title: "Supporting information",
            subtitle: `${project.name} · ${stageDetail.stage.name}`,
            content: (
              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-950">{stageDetail.evidenceSummary.sufficiencyLabel}</p>
                  <p className="mt-2 text-sm text-slate-600">{stageDetail.evidenceSummary.reviewStatusLabel}</p>
                  {stageDetail.evidenceSummary.blockingConditionLabel ? (
                    <p className="mt-3 text-sm text-slate-600">{stageDetail.evidenceSummary.blockingConditionLabel}</p>
                  ) : null}
                </div>
                {stageDetail.evidence.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-950">{item.label}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700">
                        {item.record?.status ?? "missing"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{item.type === "file" ? "Document" : "Information"}</p>
                  </div>
                ))}
                {stageDetail.evidence.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No supporting information has been added to this project stage yet.
                  </div>
                ) : null}
              </div>
            ),
          }
        : requestDetailSheet === "approval"
          ? {
              title: "Approval / sign-off position",
              subtitle: `${project.name} · ${stageDetail.stage.name}`,
              content: (
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-950">{stageDetail.approvalSummary.approvalProgressLabel}</p>
                    <p className="mt-2 text-sm text-slate-600">{stageDetail.approvalSummary.headline}</p>
                  </div>
                  {stageDetail.approvals.map((approval) => (
                    <div key={approval.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-950">{getUserFacingRoleLabel(approval.role)}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700">
                          {approval.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{approval.readiness.nextConditionLabel ?? approval.approveAction.outcomeLabel}</p>
                    </div>
                  ))}
                </div>
              ),
            }
          : requestDetailSheet === "history"
            ? {
                title: "History",
                subtitle: `${project.name} · ${stageDetail.stage.name}`,
                content: (
                  <div className="grid gap-3">
                  {stageDetail.timelineEntries.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-medium text-slate-950">{entry.headline}</p>
                      <p className="mt-2 text-sm text-slate-600">{entry.detail}</p>
                      <p className="mt-2 text-xs text-slate-500">{entry.actorLabel ?? "System"} · {entry.timestampLabel}</p>
                    </div>
                  ))}
                  {stageDetail.timelineEntries.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      No governed events have been recorded for this project stage yet.
                    </div>
                  ) : null}
                </div>
              ),
            }
            : null;

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
          {section === "actions" ? (
            <div className={`sticky top-24 z-10 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-[22px] border px-4 py-3 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.35)] backdrop-blur ${bannerTone}`}>
              <div className="min-w-0">
                <p className={`text-[11px] uppercase tracking-[0.18em] ${topUrgency === "immediate" ? "text-white/70" : "text-current/70"}`}>Requests inbox</p>
                <p className="truncate text-sm font-semibold">{bannerLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (currentProjectInbox[0]) {
                    handleWorkspaceItemSelect(currentProjectInbox[0]);
                  }
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  currentProjectInbox.length === 0
                    ? "bg-white/80 text-teal-950"
                    : topUrgency === "immediate"
                      ? "bg-white text-slate-950"
                      : "bg-white/85 text-slate-950"
                }`}
              >
                {currentProjectInbox.length === 0 ? "View summary" : "Open request"}
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
          <RequestStepCard
            title="Requests"
            subtitle={primaryTaskCount > 0 ? `${primaryTaskCount} waiting in ${project.name}.` : "All requests up to date."}
          >
            {currentProjectInbox.length > 0 ? (
              <div className="grid gap-2">
                {visibleActionItems.map((item) => {
                  const selected =
                    item.stageId === selectedTask?.stageId &&
                    (item.deepLinkTarget?.section ?? "overview") === (selectedTask?.deepLinkTarget?.section ?? "overview");
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleWorkspaceItemSelect(item)}
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
                    onClick={() => handleWorkspaceItemSelect(currentProjectInbox[visibleActionItems.length])}
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
                <button
                  type="button"
                  onClick={() => router.push("/summary")}
                  className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 shadow-sm"
                >
                  View summary
                </button>
              </div>
            )}
          </RequestStepCard>

        {selectedTask ? (
          <>
            <RequestStepCard title="Request summary">
              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">{project.name}</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{selectedTask.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">Project stage: {selectedTask.stageName ?? stageDetail.stage.name}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${urgencyTone(selectedTask.decisionCue.decisionUrgency)}`}>
                    {urgencyLabel(selectedTask.decisionCue.decisionUrgency)}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Action owner</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{selectedTask.handoff?.toRoleLabel ?? selectedTask.ownerLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Updated</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{selectedTaskUpdatedLabel}</p>
                  </div>
                </div>
              </div>
            </RequestStepCard>

            <RequestStepCard title="Decision context">
              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Reason</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{selectedTask.decisionCue.primaryCue}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">What happens next</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{selectedTask.nextStep ?? stageDetail.operationalStatus.nextStep}</p>
                </div>
                {taskAlertLines.length > 0 ? (
                  <div className="grid gap-2">
                    {taskAlertLines.map((line) => (
                      <div key={line} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </RequestStepCard>

            <RequestStepCard
              title="Primary action area"
              subtitle={
                shouldShowControl(requestPrimaryActionControl)
                  ? isControlActive(requestPrimaryActionControl)
                    ? "Review it. Decide. Move on."
                    : requestPrimaryActionControl.reason
                  : "No direct action is available in this request."
              }
            >
              <div className="grid gap-4">
                {lastActionOutcome ? (
                  <div className={`rounded-[24px] border px-4 py-4 ${
                    lastActionOutcome.result === "advanced" || lastActionOutcome.result === "released"
                      ? "border-teal-200 bg-[linear-gradient(180deg,rgba(240,253,250,1)_0%,rgba(236,253,245,0.92)_100%)]"
                      : lastActionOutcome.result === "exception" || lastActionOutcome.result === "blocked"
                        ? "border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,1)_0%,rgba(254,243,199,0.62)_100%)]"
                        : "border-slate-200 bg-slate-50"
                  }`}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Done</p>
                    <p className="mt-2 text-base font-semibold text-slate-950">{getOutcomeHeadline(lastActionOutcome)}</p>
                    <p className="mt-2 text-sm text-slate-600">{getOutcomeTrustLine(lastActionOutcome, stageDetail)}</p>
                  </div>
                ) : null}

                {shouldShowControl(requestPrimaryActionControl) && taskDescriptorSet?.primary ? (
                  <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${
                      !isControlActive(requestPrimaryActionControl)
                        ? "border-amber-200 bg-amber-50 text-amber-950"
                        : "border-teal-200 bg-white text-slate-900"
                    }`}>
                      {!isControlActive(requestPrimaryActionControl)
                        ? `This role cannot act here. ${requestPrimaryActionControl.reason ?? `Action owner: ${selectedTask.handoff?.toRoleLabel ?? selectedTask.ownerLabel}.`}`
                        : taskDescriptorSet.primary.sideEffects?.[0] ?? taskDescriptorSet.primary.outcomeLabel}
                    </div>

                    {taskDescriptorSet.primary.actionId === "add-evidence" ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem]">
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
                          <option value="file">Document</option>
                          <option value="form">Information</option>
                        </select>
                      </div>
                    ) : null}

                    {taskDescriptorSet.primary.actionId === "open-dispute" ? (
                      <div className="mt-4 grid gap-3">
                        <input
                          className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          placeholder="Dispute title"
                          value={disputeTitle}
                          disabled={!canEditPrimaryActionFields(taskDescriptorSet.primary)}
                          onChange={(event) => setDisputeTitle(event.target.value)}
                        />
                        <textarea
                          className="min-h-24 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          placeholder="Why payment should be held"
                          value={disputeReason}
                          disabled={!canEditPrimaryActionFields(taskDescriptorSet.primary)}
                          onChange={(event) => setDisputeReason(event.target.value)}
                        />
                        <input
                          inputMode="numeric"
                          className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          placeholder="Disputed amount"
                          value={disputeAmount}
                          disabled={!canEditPrimaryActionFields(taskDescriptorSet.primary)}
                          onChange={(event) => setDisputeAmount(event.target.value)}
                        />
                      </div>
                    ) : null}

                    {taskDescriptorSet.primary.actionId === "create-variation" ? (
                      <div className="mt-4 grid gap-3">
                        <input
                          className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          placeholder="Variation title"
                          value={variationTitle}
                          disabled={!canEditPrimaryActionFields(taskDescriptorSet.primary)}
                          onChange={(event) => setVariationTitle(event.target.value)}
                        />
                        <textarea
                          className="min-h-24 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          placeholder="What is changing"
                          value={variationReason}
                          disabled={!canEditPrimaryActionFields(taskDescriptorSet.primary)}
                          onChange={(event) => setVariationReason(event.target.value)}
                        />
                        <input
                          inputMode="numeric"
                          className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          placeholder="Variation amount"
                          value={variationAmount}
                          disabled={!canEditPrimaryActionFields(taskDescriptorSet.primary)}
                          onChange={(event) => setVariationAmount(event.target.value)}
                        />
                      </div>
                    ) : null}

                    {taskDescriptorSet.primary.actionId === "apply-override" ? (
                      <div className="mt-4">
                        <textarea
                          className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          placeholder="Override reason"
                          value={overrideReason}
                          disabled={!canEditPrimaryActionFields(taskDescriptorSet.primary)}
                          onChange={(event) => setOverrideReason(event.target.value)}
                        />
                      </div>
                    ) : null}

                    {requiresDecisionReason(taskDescriptorSet.primary) ? (
                      <div className="mt-4">
                        <textarea
                          className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          placeholder={getDecisionReasonPlaceholder(taskDescriptorSet.primary)}
                          value={getDescriptorReasonDraft(taskDescriptorSet.primary)}
                          disabled={!canEditPrimaryActionFields(taskDescriptorSet.primary)}
                          onChange={(event) => setDescriptorReasonDraft(taskDescriptorSet.primary, event.target.value)}
                        />
                      </div>
                    ) : null}

                    <div className="sticky bottom-20 z-10 mt-4 rounded-[24px] border border-slate-950 bg-slate-950 px-4 py-4 text-white shadow-[0_24px_50px_-30px_rgba(15,23,42,0.65)] md:bottom-6">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Ready</p>
                      <p className="mt-2 text-lg font-semibold">{taskDescriptorSet.primary.label}</p>
                      <p className="mt-2 text-sm text-slate-200">{getDecisionConfirmationLine(taskDescriptorSet.primary)}</p>
                      <p className="mt-2 text-xs text-slate-400">All actions are logged.</p>
                      <button
                        type="button"
                        aria-label={uiControlChecklist.requestPrimaryAction.label}
                        onClick={() => runDescriptorAction(taskDescriptorSet.primary)}
                        disabled={isDescriptorDisabled(taskDescriptorSet.primary) || pendingActionId === taskDescriptorSet.primary.actionId}
                        className={getActionButtonClass(
                          taskDescriptorSet.primary,
                          isDescriptorDisabled(taskDescriptorSet.primary) || pendingActionId === taskDescriptorSet.primary.actionId,
                          true,
                        )}
                      >
                        <span className="block text-base font-semibold">
                          {pendingActionId === taskDescriptorSet.primary.actionId ? "Recording..." : taskDescriptorSet.primary.label}
                        </span>
                        <span className="mt-1 block text-sm opacity-85">
                          {pendingActionId === taskDescriptorSet.primary.actionId ? "Recorded just now" : getDecisionConfirmationLine(taskDescriptorSet.primary)}
                        </span>
                      </button>
                    </div>

                    {taskDescriptorSet.secondary.length > 0 ? (
                      <div className="mt-4 grid gap-3">
                        {taskDescriptorSet.secondary.map((descriptor) => {
                          const disabled = isDescriptorDisabled(descriptor);
                          const composerOpen = activeDecisionComposerId === descriptor.actionId;
                          const needsReason = requiresDecisionReason(descriptor);

                          return (
                            <div key={descriptor.actionId} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-950">{descriptor.label}</p>
                                  <p className="mt-1 text-sm text-slate-600">{getDecisionConfirmationLine(descriptor)}</p>
                                </div>
                                {needsReason ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveDecisionComposerId(descriptor.actionId)}
                                    aria-label={uiControlChecklist.requestSecondaryAction.label}
                                    disabled={descriptor.confidence === "blocked"}
                                    className={getActionButtonClass(descriptor, descriptor.confidence === "blocked")}
                                  >
                                    <span className="block">{descriptor.label}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => runDescriptorAction(descriptor)}
                                    aria-label={uiControlChecklist.requestSecondaryAction.label}
                                    disabled={disabled || pendingActionId === descriptor.actionId}
                                    className={getActionButtonClass(descriptor, disabled || pendingActionId === descriptor.actionId)}
                                  >
                                    <span className="block">{pendingActionId === descriptor.actionId ? "Recording..." : descriptor.label}</span>
                                  </button>
                                )}
                              </div>

                              {composerOpen ? (
                                <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-sm font-medium text-slate-900">{getDecisionConfirmationLine(descriptor)}</p>
                                  <textarea
                                    className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                                    placeholder={getDecisionReasonPlaceholder(descriptor)}
                                    value={getDescriptorReasonDraft(descriptor)}
                                    disabled={descriptor.confidence === "blocked"}
                                    onChange={(event) => setDescriptorReasonDraft(descriptor, event.target.value)}
                                  />
                                  <div className="flex flex-col gap-2 sm:flex-row">
                                    <button
                                      type="button"
                                      onClick={() => runDescriptorAction(descriptor)}
                                      disabled={disabled || pendingActionId === descriptor.actionId}
                                      className={getActionButtonClass(descriptor, disabled || pendingActionId === descriptor.actionId)}
                                    >
                                      {pendingActionId === descriptor.actionId ? "Recording..." : `Confirm ${descriptor.label.toLowerCase()}`}
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

                              {!composerOpen ? (
                                <p className="mt-3 text-xs text-slate-500">
                                  {disabled
                                    ? descriptor.blockerSummary ?? descriptor.outcomeLabel
                                    : descriptor.stateTransitionPreview.fromState + " → " + descriptor.stateTransitionPreview.toState}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    This request is informative for your role. The governed action remains assigned to {selectedTask.handoff?.toRoleLabel ?? selectedTask.ownerLabel}.
                  </div>
                )}
              </div>
            </RequestStepCard>

            <div className="grid gap-3">
              {[
                {
                  key: "payment" as const,
                  title: "Payment position",
                  summary: `${currency.format(stageDetail.releaseDecision.releasableAmount)} ready to pay · ${currency.format(stageDetail.releaseDecision.frozenAmount)} on hold`,
                },
                {
                  key: "supporting" as const,
                  title: "Supporting information",
                  summary: stageDetail.evidenceSummary.reviewStatusLabel,
                },
                {
                  key: "approval" as const,
                  title: "Approval / sign-off position",
                  summary: stageDetail.approvalSummary.approvalProgressLabel,
                },
                {
                  key: "history" as const,
                  title: "History",
                  summary: stageDetail.timelineEntries[0]?.headline ?? "No recent governed events recorded.",
                },
              ].map((detailCard) => (
                <RequestStepCard key={detailCard.key} title={detailCard.title}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">{detailCard.summary}</p>
                    <button
                      type="button"
                      onClick={() => setRequestDetailSheet(detailCard.key)}
                      aria-label={uiControlChecklist.requestDetailReveal.label}
                      className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      View details
                    </button>
                  </div>
                </RequestStepCard>
              ))}

              <RequestStepCard title="Full project stage detail" subtitle="Open the full stage view when you need the complete governed context for this project stage.">
                <button
                  type="button"
                  onClick={() => openStageContext(stageDetail.stage.id, selectedStageSection)}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                >
                  Open full stage detail
                </button>
              </RequestStepCard>
            </div>
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
              subtitle="Switch project context, see what needs attention, and enter the current working project."
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
                        {entry.requestCount > 0 ? `${entry.requestCount} request${entry.requestCount === 1 ? "" : "s"}` : "No requests waiting"}
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
              title="Project stages"
              subtitle={
                audienceMode === "executive"
                  ? "Concise project stage payment status and key hold-ups."
                  : "Select a project stage to see payment status, supporting information, sign-offs, review items, and payment conditions."
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
          {audienceMode !== "executive" ? (
          <ExpandableSection title="Amount breakdown" subtitle="Expanded payment math and funding top-ups.">
            <div className="rounded-2xl border border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowFundingCalculation((current) => !current)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                    <span className="text-sm font-semibold text-slate-900">How this amount view is calculated</span>
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
            title="Selected project stage"
            subtitle="Detailed payment checks, supporting information, sign-offs, review items, and payment actions."
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
                    ? `${currentProjectInbox.length} request${currentProjectInbox.length === 1 ? "" : "s"} waiting in this project.`
                    : "No requests waiting in this project."}
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
      {section === "actions" && requestDetailSheetMeta ? (
        <RequestDetailSheet
          open={Boolean(requestDetailSheetMeta)}
          title={requestDetailSheetMeta.title}
          subtitle={requestDetailSheetMeta.subtitle}
          onClose={() => setRequestDetailSheet(null)}
        >
          {requestDetailSheetMeta.content}
        </RequestDetailSheet>
      ) : null}
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
