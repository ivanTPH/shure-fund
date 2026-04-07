"use client";

import { useEffect, useMemo, useState } from "react";

import {
  activateVariation,
  addEvidence,
  allocateStageFunds,
  applyOverride,
  createVariation,
  createLastActionOutcome,
  depositFunds,
  getActionQueue,
  getDashboardDecisionPack,
  getFundingSummary,
  getFundingSummarySentence,
  getLedgerTransactions,
  getOperationalSummary,
  getProjectActivitySummary,
  getPrimaryActionForRole,
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
  overview: {
    title: "Overview",
    subtitle: "Current payment position, the next hold-up to clear, and the work packages that need attention now.",
  },
  payments: {
    title: "Payments",
    subtitle: "Funding position, payment readiness, and value that is ready to pay or on hold.",
  },
  packages: {
    title: "Work packages",
    subtitle: "Selectable payment units within the current project, with live payment detail for the active work package.",
  },
  activity: {
    title: "Activity",
    subtitle: "Recent governed actions, audit history, and outstanding payment work.",
  },
  settings: {
    title: "Settings",
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

  function handleEvidenceUpdate(requirementId: string, status: EvidenceStatus) {
    runStageAction(
      `evidence:${requirementId}:${status}`,
      activeStageId,
      "evidence",
      (current) => updateEvidenceStatus(current, requirementId, status),
    );
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
      ? "Focus on payment hold-ups, sign-offs, supporting information, and the next step to get a work package paid."
      : audienceMode === "treasury"
        ? "Focus on amounts ready to pay, amounts on hold, funder sign-off, and payment conditions."
        : "Focus on payment status, exposure, on-hold value, and concise work package updates.";
  const sectionHeading = sectionMeta[section];
  const showAudienceControls = section === "payments" || section === "packages" || section === "activity";
  const showPrintAction = section === "overview" || section === "payments" || section === "packages";

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
              <h2 className="text-lg font-semibold text-slate-950">Selected work package</h2>
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Work package status</p>
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

        <div className="no-print flex flex-col gap-8">
          <section className="flex flex-col gap-4 rounded-[30px] border border-slate-200/80 bg-white/90 px-6 py-5 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{sectionHeading.title}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">{project.name}</h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">{sectionHeading.subtitle}</p>
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
        {section === "overview" ? (
        <>
        <SectionCard
          title={currentUser.role === "executive" ? "Exceptions Overview" : "What Needs Your Attention"}
          subtitle={
            currentUser.role === "executive"
              ? "Important work package issues to understand now."
              : "Work packages that currently need attention in this project."
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
            {section === "packages" ? (
            <SectionCard
              title="Work packages"
              subtitle={
                audienceMode === "executive"
                  ? "Concise work package payment status and key hold-ups."
                  : "Select a work package to see payment status, supporting information, sign-offs, review items, and payment conditions."
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
                          <span className="text-sm">{detail.releaseSummary.decisionLabel ?? detail.operationalStatus.label}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm opacity-80">
                        {detail.blockers[0]?.label ?? detail.operationalStatus.reason}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        {detail.treasuryReadiness.label} · Ready to pay {currency.format(detail.releaseDecision.releasableAmount)} · On hold {currency.format(detail.disputeSummary.frozenValue)}
                      </p>
                      <p className="mt-1 text-xs opacity-60">Updated {formatRelativeTime(detail.lastUpdatedAt)}</p>
                    </button>
                  );
                })}
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
                  ? "Work package counts by payment status."
                  : "Current work package counts across payment, sign-off, review, and on-hold states."
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
                  ? "Concise work package payment-readiness summaries."
                  : "Payment is allowed only when funding, supporting information, and sign-off are complete unless a funder override is active. On-hold value remains outside payable amount."
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
                  </article>
                ))}
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
                selectedWorkPackageName={stageDetail.stage.name}
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
            title="Selected work package"
            subtitle="Detailed payment checks, supporting information, sign-offs, review items, and payment actions."
            open={showStageDetail}
            onToggle={setShowStageDetail}
          >
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
              onApprove={(role) => runStageAction(`approval:${role}:approve`, stageDetail.stage.id, "approvals", (current) => giveApproval(current, stageDetail.stage.id, role))}
              onReject={(role) => runStageAction(`approval:${role}:reject`, stageDetail.stage.id, "approvals", (current) => rejectApproval(current, stageDetail.stage.id, role))}
              onFundStage={handleFundStage}
              onApplyOverride={handleApplyOverride}
              onRelease={handleReleaseStage}
              onOpenDispute={handleOpenDispute}
              onResolveDispute={(disputeId) => runStageAction(`dispute:${disputeId}:resolve`, stageDetail.stage.id, "dispute", (current) => resolveDispute(current, stageDetail.stage.id, disputeId))}
              onCreateVariation={handleCreateVariation}
              onApproveVariation={(variationId) =>
                runStageAction(`variation:${variationId}:approve`, stageDetail.stage.id, "variation", (current) => reviewVariation(current, stageDetail.stage.id, variationId, "approved"))
              }
              onRejectVariation={(variationId) =>
                runStageAction(`variation:${variationId}:reject`, stageDetail.stage.id, "variation", (current) => reviewVariation(current, stageDetail.stage.id, variationId, "rejected"))
              }
              onActivateVariation={(variationId) => runStageAction(`variation:${variationId}:activate`, stageDetail.stage.id, "variation", (current) => activateVariation(current, stageDetail.stage.id, variationId))}
            />
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
          <SectionCard title="Profile and account" subtitle="A clear home for user profile and account controls.">
            <div className="grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Name</p>
                <p className="mt-1 text-sm font-medium text-slate-950">{currentUser.name}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Current role</p>
                <p className="mt-1 text-sm font-medium text-slate-950">{getUserFacingRoleLabel(currentUser.role)}</p>
                <p className="mt-1 text-xs text-slate-500">Role context remains visible across the workspace, but stays secondary to the selected project.</p>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Profile settings, notification preferences, and personal security controls can live here.
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Organisation and access" subtitle="A clear product home for settings, invitations, and configuration.">
            <div className="grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Organisation</p>
                <p className="mt-1 text-sm font-medium text-slate-950">Shure.Fund workspace</p>
                <p className="mt-1 text-xs text-slate-500">Configuration, commercial defaults, and connected payment controls can live here.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Invitations and team access</p>
                <p className="mt-1 text-sm font-medium text-slate-950">Manage who can access projects and which role they hold.</p>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                This shell now gives settings, organisation controls, invitations, and configuration a durable product home.
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
