"use client";

import { useEffect, useMemo, useState } from "react";

import { initialSystemState } from "@/lib/demoData";
import {
  activateVariation,
  addEvidence,
  allocateStageFunds,
  applyOverride,
  createVariation,
  depositFunds,
  getActionQueue,
  getBlockerResponsibilityCue,
  getDashboardDecisionPack,
  getDashboardDecisionSnapshot,
  getDashboardSummaryStrip,
  getFundingSummary,
  getFundingSummarySentence,
  getLedgerTransactions,
  getOperationalSummary,
  getProjectActivitySummary,
  getPrimaryActionForRole,
  getProjectWorkspaceSummary,
  getResponsibilityCue,
  getReleaseDecisions,
  getRoleInboxItems,
  getRoleJourneySummary,
  getStageActionOutcomeSummary,
  getStageBlockers,
  getStageDetail,
  getUserFacingRoleLabel,
  giveApproval,
  initializeSystemState,
  openDispute,
  rejectApproval,
  releaseStage,
  resolveDispute,
  reviewVariation,
  setCurrentUser,
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
import StageDetailPanel from "./StageDetailPanel";

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

export default function ShureFundDashboard() {
  const [state, setState] = useState<SystemStateRecord>(() => initializeSystemState(initialSystemState));
  const [audienceMode, setAudienceMode] = useState<DashboardAudienceMode>("operations");
  const [selectedProjectId, setSelectedProjectId] = useState(initialSystemState.projects[0]?.id ?? "");
  const [selectedStageId, setSelectedStageId] = useState("stage-foundation");
  const [selectedStageSection, setSelectedStageSection] = useState<"overview" | "funding" | "approvals" | "evidence" | "dispute" | "variation" | "release">("overview");
  const [depositAmount, setDepositAmount] = useState("50000");
  const [fundingSource, setFundingSource] = useState<FundingSourceType | "">("");
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [showFundingCalculation, setShowFundingCalculation] = useState(false);
  const [showStageDetail, setShowStageDetail] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("file");
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeAmount, setDisputeAmount] = useState("15000");
  const [variationTitle, setVariationTitle] = useState("");
  const [variationReason, setVariationReason] = useState("");
  const [variationAmount, setVariationAmount] = useState("10000");
  const [selectedWorkspaceCue, setSelectedWorkspaceCue] = useState<{ stageId: string; cue: WorkspaceDecisionCue } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    stageId: string;
    section: "overview" | "funding" | "approvals" | "evidence" | "dispute" | "variation" | "release";
    tone: "success" | "warning";
    title: string;
    detail: string;
    resultType: "advanced" | "released" | "waiting" | "blocked" | "exception" | "no_change";
    resultTypeLabel: string;
    resultHeadline: string;
    resultSubline: string | null;
    resultTone: "success" | "info" | "warning" | "neutral";
    emphasis: "strong" | "normal" | "subtle";
    progressionStatus: "advanced" | "ready_for_next_decision" | "waiting_on_other_role" | "still_blocked";
    stateNowLabel: string;
    stateNowDetail: string;
    whatChanged: string[];
    unlockedItems: string[];
    remainingBlockers: string[];
    nextOwner: string | null;
    nextActionLabel: string | null;
  } | null>(null);

  const project = state.projects.find((entry) => entry.id === selectedProjectId) ?? state.projects[0];
  const currentUser = state.users.find((entry) => entry.id === state.currentUserId)!;
  const roleSwitchUsers = useMemo(
    () => state.users.filter((entry) => ["contractor", "commercial", "professional", "treasury", "executive"].includes(entry.role)),
    [state.users],
  );
  const projectStages = useMemo(() => state.stages.filter((stage) => stage.projectId === project.id), [state, project.id]);
  const activeStageId = projectStages.some((stage) => stage.id === selectedStageId)
    ? selectedStageId
    : projectStages[0]?.id ?? selectedStageId;
  const fundingSummary = useMemo(() => getFundingSummary(state, project.id), [state, project.id]);
  const actionQueue = useMemo(() => getActionQueue(state, project.id), [state, project.id]);
  const releaseDecisions = useMemo(() => getReleaseDecisions(state, project.id), [state, project.id]);
  const controlSummary = useMemo(() => getOperationalSummary(state, project.id), [state, project.id]);
  const stageDetail = useMemo(() => getStageDetail(state, activeStageId), [state, activeStageId]);
  const stageBlockers = useMemo(() => getStageBlockers(state, activeStageId), [state, activeStageId]);
  const ledgerTransactions = useMemo(() => getLedgerTransactions(state, project.id), [state, project.id]);
  const journey = useMemo(() => getRoleJourneySummary(state, project.id, currentUser.role), [state, project.id, currentUser.role]);
  const summaryStrip = useMemo(() => getDashboardSummaryStrip(state, project.id), [state, project.id]);
  const decisionPack = useMemo(() => getDashboardDecisionPack(state, project.id), [state, project.id]);
  const decisionSnapshot = useMemo(() => getDashboardDecisionSnapshot(state, project.id), [state, project.id]);
  const projectActivity = useMemo(() => getProjectActivitySummary(state, project.id), [state, project.id]);
  const activeProjectSummary = useMemo(() => getProjectWorkspaceSummary(state, project.id), [state, project.id]);
  const currentProjectInbox = useMemo(() => getRoleInboxItems(state, currentUser.role, project.id), [state, currentUser.role, project.id]);
  const allProjectInbox = useMemo(() => getRoleInboxItems(state, currentUser.role), [state, currentUser.role]);
  const portfolioProjects = useMemo(
    () => state.projects.map((entry) => getProjectWorkspaceSummary(state, entry.id)),
    [state],
  );
  const shortfallActive = fundingSummary.shortfall > 0;
  const fundingSummarySentence = getFundingSummarySentence(fundingSummary);
  const crossProjectAttentionCount = allProjectInbox.filter((item) => item.projectId !== project.id).length;

  const selectedDecision = releaseDecisions.find((entry) => entry.stageId === activeStageId)!;
  const primaryAction = useMemo(() => getPrimaryActionForRole(state, project.id, currentUser.role), [state, project.id, currentUser.role]);
  const projectLeadAction = actionQueue[0] ?? null;
  const primaryActionDetail = useMemo(
    () => (primaryAction ? getStageDetail(state, primaryAction.stageId) : null),
    [primaryAction, state],
  );
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
  const canAddFunds =
    !isAddingFunds &&
    Number.isFinite(parsedDepositAmount) &&
    parsedDepositAmount > 0 &&
    (fundingSource === "funder" || fundingSource === "contractor");
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
            : "Treasury only.";
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
      ? "Approval"
      : hint === "evidence"
        ? "Evidence"
        : hint === "funding"
          ? "Funding"
          : hint === "release"
            ? "Release"
            : hint === "exception"
              ? "Exception"
              : hint === "handoff"
                ? "Handoff"
                : hint === "outcome"
                  ? "Outcome"
                  : "Overview";

  useEffect(() => {
    if (projectStages.some((stage) => stage.id === selectedStageId)) {
      return;
    }

    const nextStageId = projectStages[0]?.id ?? "";
    if (nextStageId && nextStageId !== selectedStageId) {
      setSelectedStageId(nextStageId);
    }
    setSelectedStageSection("overview");
    setActionFeedback(null);
    setSelectedWorkspaceCue(null);
  }, [projectStages, selectedStageId]);

  useEffect(() => {
    if (selectedWorkspaceCue && selectedWorkspaceCue.stageId !== activeStageId) {
      setSelectedWorkspaceCue(null);
    }
  }, [activeStageId, selectedWorkspaceCue]);

  function handleWorkspaceItemSelect(item: (typeof currentProjectInbox)[number]) {
    if (item.deepLinkTarget?.projectId && item.deepLinkTarget.projectId !== project.id) {
      setSelectedProjectId(item.deepLinkTarget.projectId);
    }

    if (item.deepLinkTarget?.stageId) {
      setSelectedStageId(item.deepLinkTarget.stageId);
      setSelectedWorkspaceCue(item.decisionCue ? { stageId: item.deepLinkTarget.stageId, cue: item.decisionCue } : null);
    }

    setSelectedStageSection(item.deepLinkTarget?.section ?? "overview");
    setShowStageDetail(true);
  }

  function commit(updater: (current: SystemStateRecord) => SystemStateRecord) {
    setState((current) => updater(current));
  }

  function runStageAction(
    stageId: string,
    section: StageDetailSectionKey,
    successTitle: string,
    updater: (current: SystemStateRecord) => SystemStateRecord,
    blockedTitle: string,
  ) {
    let nextFeedback: typeof actionFeedback = null;

    setState((current) => {
      const beforeDetail = getStageDetail(current, stageId);
      const next = updater(current);

      if (next === current) {
        const fallbackOutcome = getStageActionOutcomeSummary(beforeDetail, beforeDetail, section);
        nextFeedback = {
          ...fallbackOutcome,
          stageId,
          tone: "warning",
          title: blockedTitle,
          detail: beforeDetail.operationalStatus.nextStep,
          whatChanged: [beforeDetail.sectionGuidance[section].summary],
          unlockedItems: [],
        };
        return current;
      }

      const nextDetail = getStageDetail(next, stageId);
      nextFeedback = {
        ...getStageActionOutcomeSummary(beforeDetail, nextDetail, section),
        stageId,
      };
      if (!nextFeedback.title) {
        nextFeedback.title = successTitle;
      }

      return next;
    });

    setActionFeedback(nextFeedback);
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

  function handleEvidenceUpdate(requirementId: string, status: EvidenceStatus) {
    runStageAction(
      activeStageId,
      "evidence",
      "Evidence updated.",
      (current) => updateEvidenceStatus(current, requirementId, status),
      "Evidence status did not change.",
    );
  }

  function handleAddEvidence() {
    runStageAction(
      activeStageId,
      "evidence",
      "Evidence added.",
      (current) => addEvidence(current, activeStageId, evidenceType, evidenceTitle),
      "Evidence item could not be added.",
    );
    setEvidenceTitle("");
  }

  function handleOpenDispute() {
    runStageAction(
      activeStageId,
      "dispute",
      "Dispute raised.",
      (current) => openDispute(current, activeStageId, disputeTitle, disputeReason, Number(disputeAmount)),
      "Dispute could not be raised.",
    );
    setDisputeTitle("");
    setDisputeReason("");
  }

  function handleCreateVariation() {
    runStageAction(
      activeStageId,
      "variation",
      "Variation proposed.",
      (current) => createVariation(current, activeStageId, variationTitle, variationReason, Number(variationAmount)),
      "Variation could not be proposed.",
    );
    setVariationTitle("");
    setVariationReason("");
  }

  function handleFundStage() {
    runStageAction(
      stageDetail.stage.id,
      "funding",
      "Funding transferred.",
      (current) => allocateStageFunds(current, stageDetail.stage.id),
      "Funding could not be transferred.",
    );
  }

  function handleReleaseStage() {
    runStageAction(
      stageDetail.stage.id,
      "release",
      "Release completed.",
      (current) => releaseStage(current, stageDetail.stage.id),
      "Release could not proceed.",
    );
  }

  function handleApplyOverride() {
    runStageAction(
      stageDetail.stage.id,
      "release",
      "Override applied.",
      (current) => applyOverride(current, stageDetail.stage.id, overrideReason),
      "Override could not be applied.",
    );
    setOverrideReason("");
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
      ? "Operations"
      : audienceMode === "treasury"
        ? "Treasury"
        : "Executive";
  const modeSummary =
    audienceMode === "operations"
      ? "Focus on actions, blockers, approvals, evidence, and the shortest path to release."
      : audienceMode === "treasury"
        ? "Focus on releasable, frozen, and blocked value with treasury readiness and decision basis."
        : "Focus on balance, WIP, surplus capacity, frozen value, releasable value, and concise release confidence.";
  const postureToneClass =
    activeProjectSummary.postureLabel === "Healthy / releasable"
      ? "bg-teal-300/20 text-teal-100"
      : activeProjectSummary.postureLabel === "Blocked by approvals"
        ? "bg-amber-300/20 text-amber-100"
        : "bg-white/12 text-slate-100";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.08),_transparent_28%),linear-gradient(180deg,#fbfcfc_0%,#f8fafc_44%,#f1f5f4_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="no-print rounded-[36px] bg-slate-950 px-6 py-7 text-white shadow-[0_28px_80px_-48px_rgba(15,23,42,0.75)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-teal-300">Shure.Fund</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em]">{project.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Rules-based construction funding control with synthetic ledger visibility, supporting information,
                approval gating, dispute freezing, variation control, controlled drawdown, and immutable audit logging.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span className={`rounded-full px-3 py-1 font-medium ${postureToneClass}`}>{activeProjectSummary.postureLabel}</span>
                <span>Last activity {formatRelativeTime(projectActivity.lastActivityAt)}</span>
                <span>{modeTitle} mode</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl bg-white/8 p-3 text-sm">
                <span className="mb-2 block text-slate-300">Acting Role</span>
                <select
                  className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-white"
                  value={state.currentUserId}
                  onChange={(event) => commit((current) => setCurrentUser(current, event.target.value))}
                >
                  {roleSwitchUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserFacingRoleLabel(user.role)} · {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl bg-white/8 p-3 text-sm">
                <span className="mb-2 block text-slate-300">Active Context</span>
                <p className="rounded-xl bg-white/10 px-3 py-3 font-medium">{getUserFacingRoleLabel(currentUser.role)} · {project.name}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {(["operations", "treasury", "executive"] as DashboardAudienceMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAudienceMode(mode)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  audienceMode === mode ? "bg-white text-slate-950" : "bg-white/8 text-slate-200"
                }`}
              >
                {mode === "operations" ? "Operations" : mode === "treasury" ? "Treasury" : "Executive"}
              </button>
            ))}
            <button
              type="button"
              onClick={handleShareDecision}
              className="rounded-full bg-teal-300 px-4 py-2 text-sm font-medium text-slate-950"
            >
              Share Decision
            </button>
            <p className="text-sm text-slate-300">{modeTitle} view. {modeSummary}</p>
          </div>
        </section>

        <section className="print-only hidden">
          <div className="mx-auto max-w-5xl text-slate-950">
            <div className="border-b border-slate-200 pb-6">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Shure.Fund Decision Pack</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em]">{project.name}</h1>
              <p className="mt-2 text-sm text-slate-500">Prepared {new Date().toLocaleString("en-GB")}</p>
            </div>

            <section className="print-section mt-8">
              <h2 className="text-lg font-semibold text-slate-950">Decision Summary</h2>
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">{stageDetail.stage.name}</p>
                <div className="mt-2 flex items-end justify-between gap-6">
                  <div>
                    <p className="text-3xl font-semibold tracking-[-0.02em]">{selectedDecision.explanation.label}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{selectedDecision.explanation.reason}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-xs text-slate-500">Releasable now</p>
                    <p className="mt-1 text-3xl font-semibold tracking-[-0.02em]">{currency.format(selectedDecision.releasableAmount)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Principal blocker</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{blockerSummaryText}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Next action</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{primaryAction?.primaryAction.title ?? "No immediate action required."}</p>
                    <p className="mt-1 text-xs text-slate-500">Responsible role: {primaryResponsibilityCue ?? "None"}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="print-section mt-8">
              <h2 className="text-lg font-semibold text-slate-950">Funding Snapshot</h2>
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
                  <p className="text-sm text-slate-500">Releasable</p>
                  <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.releasableFunds)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Frozen</p>
                  <p className="mt-2 text-2xl font-semibold">{currency.format(fundingSummary.frozenFunds)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">{fundingSummarySentence}</p>
            </section>

            <section className="print-section mt-8">
              <h2 className="text-lg font-semibold text-slate-950">Key Blockers And Confidence</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Principal blocker theme</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.blockerThemeLine.replace("Principal blocker theme: ", "")}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Treasury and release confidence</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.treasuryConfidenceLine}</p>
                </div>
              </div>
            </section>

            <section className="print-section mt-8">
              <h2 className="text-lg font-semibold text-slate-950">Selected Work Package</h2>
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Operational status</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{stageDetail.operationalStatus.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Release status</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{stageDetail.releaseDecision.explanation.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Treasury readiness</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{stageDetail.treasuryReadiness.label}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">WIP</p>
                    <p className="mt-2 text-xl font-semibold">{currency.format(stageDetail.releaseDecision.releasableAmount + stageDetail.releaseDecision.frozenAmount + stageDetail.releaseDecision.blockedAmount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Releasable</p>
                    <p className="mt-2 text-xl font-semibold">{currency.format(stageDetail.releaseDecision.releasableAmount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Frozen</p>
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

        <div className="no-print grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <SectionCard title="Projects" subtitle="Switch the active project workspace without changing the shared controls logic.">
            <div className="grid gap-3">
              {portfolioProjects.map((entry) => {
                const selected = entry.projectId === project.id;
                return (
                  <button
                    key={entry.projectId}
                    type="button"
                    onClick={() => setSelectedProjectId(entry.projectId)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{entry.projectName}</p>
                        <p className={`mt-1 text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>{entry.postureLabel}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        selected ? "bg-white/15 text-white" : "bg-white text-slate-600"
                      }`}>
                        {entry.releaseReadyCount} ready
                      </span>
                    </div>
                    <p className={`mt-2 text-sm ${selected ? "text-slate-200" : "text-slate-600"}`}>{entry.postureReason}</p>
                    <div className={`mt-3 flex flex-wrap gap-2 text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>
                      <span>Blocked {entry.blockedCount}</span>
                      <span>Frozen {currency.format(entry.frozenValue)}</span>
                      <span>Releasable {currency.format(entry.releasableNow)}</span>
                    </div>
                    <p className={`mt-2 text-xs ${selected ? "text-slate-400" : "text-slate-400"}`}>
                      Updated {formatRelativeTime(entry.lastActivityAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Workspace" subtitle="Active project orientation for the current decision context.">
            <div className="grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Project</p>
                <p className="mt-1 text-sm font-medium text-slate-950">{project.name}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Operational posture</p>
                <p className="mt-1 text-sm font-medium text-slate-950">{activeProjectSummary.postureLabel}</p>
                <p className="mt-1 text-xs text-slate-500">{activeProjectSummary.postureReason}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Release-ready</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{summaryStrip.releaseReadyPackages}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Blocked packages</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{summaryStrip.blockedPackages}</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </aside>

        <div className="flex flex-col gap-8">
        <SectionCard
          title={currentUser.role === "executive" ? "Exceptions Overview" : "What Needs Your Attention"}
          subtitle={
            currentUser.role === "executive"
              ? "Read-only exceptions for the current decision context."
              : "Role-aware inbox for the current project, with cross-project attention shown quietly."
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
                    <p className="text-xs text-slate-500">Orientation</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{item.decisionCue.entryOrientationLabel ?? "Overview"}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-slate-500">Owner</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{item.handoff?.toRoleLabel ?? item.ownerLabel}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-slate-500">Open to</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{focusHintLabel(item.decisionCue.detailFocusHint)}</p>
                  </div>
                </div>
              </button>
            ))}
            {currentProjectInbox.length === 0 ? (
              <p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">
                {currentUser.role === "executive"
                  ? "No material exception needs executive attention in the selected project."
                  : `No immediate ${getUserFacingRoleLabel(currentUser.role).toLowerCase()} task is waiting in this project.`}
              </p>
            ) : null}
          </div>
          {crossProjectAttentionCount > 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              {crossProjectAttentionCount} additional attention item{crossProjectAttentionCount === 1 ? "" : "s"} sit in other projects.
            </p>
          ) : null}
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <SectionCard title="Decision" subtitle="What can you do right now, why, and what happens next.">
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
                  <p className="text-xs text-slate-500">Releasable now</p>
                  <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-slate-950">{currency.format(selectedDecision.releasableAmount)}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-xs text-slate-500">Why</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">{blockerSummaryText}</p>
                </div>
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-xs text-slate-500">What next</p>
                  <p className="mt-1 text-sm font-medium text-slate-950">{stageDetail.operationalStatus.nextStep}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Primary Action" subtitle="The single most important next step.">
            {primaryAction ? (
              <div className="rounded-[28px] border border-slate-200/80 bg-slate-50 p-6">
                <p className="text-sm text-slate-500">{primaryAction.stageName}</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">{primaryAction.primaryAction.title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{primaryAction.primaryAction.detail}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs text-slate-500">Responsible role</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{primaryResponsibilityCue}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs text-slate-500">Next step</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{primaryAction.operationalStatus.nextStep}</p>
                  </div>
                </div>
              </div>
            ) : projectLeadAction ? (
              <div className="rounded-[28px] border border-slate-200/80 bg-slate-50 p-6">
                <p className="text-sm text-slate-500">{projectLeadAction.stageName}</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">No direct action in {getUserFacingRoleLabel(currentUser.role)}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{projectLeadAction.primaryAction.title}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs text-slate-500">Action owner</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">
                      {getResponsibilityCue(projectLeadAction.primaryAction.actionableBy, projectLeadAction.primaryAction.actionType)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs text-slate-500">Why you are read-only</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">This role can monitor the decision but cannot execute the governed next step.</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">No immediate action is required.</p>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Funding" subtitle="Single funding view for the current project position.">
          <div className="rounded-[28px] border border-slate-200/80 bg-slate-50 p-5">
            <p className="text-sm leading-6 text-slate-600">{fundingSummarySentence}</p>
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
                <p className="text-sm text-slate-500">Releasable</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(fundingSummary.releasableFunds)}</p>
              </div>
              <div className="rounded-2xl bg-white/95 p-4">
                <p className="text-sm text-slate-500">Frozen</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(fundingSummary.frozenFunds)}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="grid gap-6">
            <SectionCard
              title={audienceMode === "executive" ? "Package Decisions" : "Work Packages"}
              subtitle={
                audienceMode === "executive"
                  ? "Concise package-level release and block status."
                  : "Select a Work Package to inspect funding, supporting information, approvals, disputes, variations, and drawdown status."
              }
            >
              <div className="grid gap-3">
                {fundingSummary.stageSummaries.map((summary) => {
                  const detail = getStageDetail(state, summary.stageId);
                  return (
                    <button
                      key={summary.stageId}
                      type="button"
                      onClick={() => {
                        setSelectedStageId(summary.stageId);
                        setSelectedStageSection("overview");
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
                          <span className="text-sm">{detail.operationalStatus.label}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm opacity-80">
                        {detail.operationalStatus.reason}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        {detail.treasuryReadiness.label} · Releasable {currency.format(detail.releaseDecision.releasableAmount)} · Frozen {currency.format(detail.disputeSummary.frozenValue)}
                      </p>
                      <p className="mt-1 text-xs opacity-60">Updated {formatRelativeTime(detail.lastUpdatedAt)}</p>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            {audienceMode === "treasury" ? <LedgerTransactionsList transactions={ledgerTransactions} /> : null}
          </div>

          <div className="grid gap-6">
            <ExpandableSection
              title={audienceMode === "executive" ? "Executive Controls" : "Control Summary"}
              subtitle={
                audienceMode === "executive"
                  ? "Blocked and release-ready package counts in one concise control view."
                  : "Workflow states recomputed from funding, supporting information, approvals, disputes, variations, and release records."
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-700">Blocked</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.blocked}</p>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-900">In Review</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.in_review}</p>
                </div>
                <div className="rounded-2xl bg-teal-50 p-4">
                  <p className="text-sm text-teal-900">Ready</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.ready}</p>
                </div>
                <div className="rounded-2xl bg-teal-50 p-4">
                  <p className="text-sm text-teal-900">Partially Approved</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.partially_approved}</p>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-900">Approved</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.approved}</p>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-900">Partially Released</p>
                  <p className="mt-2 text-2xl font-semibold">{controlSummary.partially_released}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-700">Released</p>
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
                  <p className="text-sm text-teal-900">Drawdown Eligible</p>
                  <p className="mt-2 text-2xl font-semibold text-teal-950">{controlSummary.releasable}</p>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-4">
                  <p className="text-sm text-cyan-900">Payable Value</p>
                  <p className="mt-2 text-2xl font-semibold text-cyan-950">{currency.format(journey.payableValue)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">Frozen Value</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(journey.frozenValue)}</p>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection
              title={audienceMode === "executive" ? "Release Confidence" : "Drawdown Decisions"}
              subtitle={
                audienceMode === "executive"
                  ? "Concise decision summaries for current release confidence."
                  : "Drawdown is allowed only when funding, supporting information, and approvals are complete unless treasury override is active. Frozen value remains outside payable drawdown."
              }
              >
                <div className="grid gap-3">
                {(audienceMode === "executive" ? releaseDecisions.slice(0, 3) : releaseDecisions).map((decision) => (
                  <article key={decision.stageId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                        Releasable {currency.format(decision.releasableAmount)} · Frozen {currency.format(decision.frozenAmount)} · In progress {currency.format(decision.blockedAmount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Decision basis: {decision.explanation.decisionBasis}</p>
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
                        Override active. Drawdown proceeds as an override, not as a normal clear release.
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </ExpandableSection>
          </div>
        </div>

        {audienceMode !== "executive" && (
        <div className="grid gap-6">
          <ExpandableSection title="Funding Breakdown" subtitle="Expanded funding math and top-up controls.">
            <div className="rounded-2xl border border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowFundingCalculation((current) => !current)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">How this is calculated</span>
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
                selectedWorkPackageName={stageDetail.stage.name}
                onDepositAmountChange={setDepositAmount}
                onFundingSourceChange={setFundingSource}
                onAddFunds={handleDeposit}
                canAddFunds={canAddFunds}
                addFundsHelperText={addFundsHelperText}
              />
            </div>
          </ExpandableSection>

          <ExpandableSection
            title="Selected Work Package"
            subtitle={
              actionFeedback?.stageId === stageDetail.stage.id
                ? `${actionFeedback.resultHeadline}${actionFeedback.resultSubline ? ` · ${actionFeedback.resultSubline}` : ""}`
                : "Detailed controls, evidence, approvals, disputes, and release actions."
            }
            open={showStageDetail}
            onToggle={setShowStageDetail}
          >
            {actionFeedback?.stageId === stageDetail.stage.id ? (
              <div
                className={`mb-4 rounded-2xl border px-4 py-3 ${
                  actionFeedback.resultTone === "success"
                    ? "border-teal-200 bg-teal-50"
                    : actionFeedback.resultTone === "warning"
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Latest governed action</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{actionFeedback.resultHeadline}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {actionFeedback.resultSubline ?? actionFeedback.whatChanged[0] ?? actionFeedback.detail}
                    </p>
                    {actionFeedback.nextOwner ? (
                      <p className="mt-1 text-xs text-slate-500">{actionFeedback.nextOwner} acts next.</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                    {actionFeedback.resultTypeLabel}
                  </span>
                </div>
              </div>
            ) : null}
            <StageDetailPanel
              detail={stageDetail}
              focusedSection={selectedStageSection}
              actionFeedback={actionFeedback?.stageId === stageDetail.stage.id ? {
                section: actionFeedback.section,
                tone: actionFeedback.tone,
                title: actionFeedback.title,
                detail: actionFeedback.detail,
                resultType: actionFeedback.resultType,
                resultTypeLabel: actionFeedback.resultTypeLabel,
                resultHeadline: actionFeedback.resultHeadline,
                resultSubline: actionFeedback.resultSubline,
                resultTone: actionFeedback.resultTone,
                emphasis: actionFeedback.emphasis,
                progressionStatus: actionFeedback.progressionStatus,
                stateNowLabel: actionFeedback.stateNowLabel,
                stateNowDetail: actionFeedback.stateNowDetail,
                whatChanged: actionFeedback.whatChanged,
                unlockedItems: actionFeedback.unlockedItems,
                remainingBlockers: actionFeedback.remainingBlockers,
                nextOwner: actionFeedback.nextOwner,
                nextActionLabel: actionFeedback.nextActionLabel,
              } : null}
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
              onOverrideReasonChange={setOverrideReason}
              onEvidenceTitleChange={setEvidenceTitle}
              onEvidenceTypeChange={setEvidenceType}
              onDisputeTitleChange={setDisputeTitle}
              onDisputeReasonChange={setDisputeReason}
              onDisputeAmountChange={setDisputeAmount}
              onVariationTitleChange={setVariationTitle}
              onVariationReasonChange={setVariationReason}
              onVariationAmountChange={setVariationAmount}
              onAddEvidence={handleAddEvidence}
              onUpdateEvidenceStatus={handleEvidenceUpdate}
              onApprove={(role) => runStageAction(stageDetail.stage.id, "approvals", "Approval recorded.", (current) => giveApproval(current, stageDetail.stage.id, role), "Approval could not be recorded.")}
              onReject={(role) => runStageAction(stageDetail.stage.id, "approvals", "Rejection recorded.", (current) => rejectApproval(current, stageDetail.stage.id, role), "Rejection could not be recorded.")}
              onFundStage={handleFundStage}
              onApplyOverride={handleApplyOverride}
              onRelease={handleReleaseStage}
              onOpenDispute={handleOpenDispute}
              onResolveDispute={(disputeId) => runStageAction(stageDetail.stage.id, "dispute", "Dispute resolved.", (current) => resolveDispute(current, stageDetail.stage.id, disputeId), "Dispute could not be resolved.")}
              onCreateVariation={handleCreateVariation}
              onApproveVariation={(variationId) =>
                runStageAction(stageDetail.stage.id, "variation", "Variation approved.", (current) => reviewVariation(current, stageDetail.stage.id, variationId, "approved"), "Variation could not be approved.")
              }
              onRejectVariation={(variationId) =>
                runStageAction(stageDetail.stage.id, "variation", "Variation rejected.", (current) => reviewVariation(current, stageDetail.stage.id, variationId, "rejected"), "Variation could not be rejected.")
              }
              onActivateVariation={(variationId) => runStageAction(stageDetail.stage.id, "variation", "Variation activated.", (current) => activateVariation(current, stageDetail.stage.id, variationId), "Variation could not be activated.")}
            />
          </ExpandableSection>

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

          <ExpandableSection title="Full Action Queue" subtitle="All remaining actions, ordered by urgency and release impact.">
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
        )}
        </div>
      </div>
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
