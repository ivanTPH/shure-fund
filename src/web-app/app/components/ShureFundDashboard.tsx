"use client";

import { useMemo, useState } from "react";

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
  getResponsibilityCue,
  getReleaseDecisions,
  getRoleJourneySummary,
  getStageBlockers,
  getStageDetail,
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
} from "@/lib/systemState";
import type {
  EvidenceStatus,
  EvidenceType,
  FundingSourceType,
  SystemStateRecord,
} from "@/lib/shureFundModels";
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
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
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

export default function ShureFundDashboard() {
  const [state, setState] = useState<SystemStateRecord>(() => initializeSystemState(initialSystemState));
  const [audienceMode, setAudienceMode] = useState<DashboardAudienceMode>("operations");
  const [selectedStageId, setSelectedStageId] = useState("stage-foundation");
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

  const project = state.projects[0];
  const currentUser = state.users.find((entry) => entry.id === state.currentUserId)!;
  const fundingSummary = useMemo(() => getFundingSummary(state, project.id), [state, project.id]);
  const actionQueue = useMemo(() => getActionQueue(state, project.id), [state, project.id]);
  const releaseDecisions = useMemo(() => getReleaseDecisions(state, project.id), [state, project.id]);
  const controlSummary = useMemo(() => getOperationalSummary(state, project.id), [state, project.id]);
  const stageDetail = useMemo(() => getStageDetail(state, selectedStageId), [state, selectedStageId]);
  const stageBlockers = useMemo(() => getStageBlockers(state, selectedStageId), [state, selectedStageId]);
  const ledgerTransactions = useMemo(() => getLedgerTransactions(state, project.id), [state, project.id]);
  const journey = useMemo(() => getRoleJourneySummary(state, project.id, currentUser.role), [state, project.id, currentUser.role]);
  const summaryStrip = useMemo(() => getDashboardSummaryStrip(state, project.id), [state, project.id]);
  const decisionPack = useMemo(() => getDashboardDecisionPack(state, project.id), [state, project.id]);
  const decisionSnapshot = useMemo(() => getDashboardDecisionSnapshot(state, project.id), [state, project.id]);
  const projectActivity = useMemo(() => getProjectActivitySummary(state, project.id), [state, project.id]);
  const shortfallActive = fundingSummary.shortfall > 0;
  const fundingSummarySentence = getFundingSummarySentence(fundingSummary);

  const selectedDecision = releaseDecisions.find((entry) => entry.stageId === selectedStageId)!;
  const primaryAction = actionQueue[0] ?? null;
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

  function commit(updater: (current: SystemStateRecord) => SystemStateRecord) {
    setState((current) => updater(current));
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
          fundingSource === "contractor" ? selectedStageId : undefined,
        ),
      );
    } finally {
      setIsAddingFunds(false);
    }
  }

  function handleEvidenceUpdate(requirementId: string, status: EvidenceStatus) {
    commit((current) => updateEvidenceStatus(current, requirementId, status));
  }

  function handleAddEvidence() {
    commit((current) => addEvidence(current, selectedStageId, evidenceType, evidenceTitle));
    setEvidenceTitle("");
  }

  function handleOpenDispute() {
    commit((current) => openDispute(current, selectedStageId, disputeTitle, disputeReason, Number(disputeAmount)));
    setDisputeTitle("");
    setDisputeReason("");
  }

  function handleCreateVariation() {
    commit((current) => createVariation(current, selectedStageId, variationTitle, variationReason, Number(variationAmount)));
    setVariationTitle("");
    setVariationReason("");
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.14),_transparent_30%),linear-gradient(180deg,#f9fbfc_0%,#f8fafc_46%,#eef5f6_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] bg-slate-950 px-5 py-6 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.8)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-teal-300">Shure.Fund</p>
              <h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Rules-based construction funding control with synthetic ledger visibility, supporting information,
                approval gating, dispute freezing, variation control, controlled drawdown, and immutable audit logging.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl bg-white/8 p-3 text-sm">
                <span className="mb-2 block text-slate-300">Acting User</span>
                <select
                  className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-white"
                  value={state.currentUserId}
                  onChange={(event) => commit((current) => setCurrentUser(current, event.target.value))}
                >
                  {state.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {user.role}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl bg-white/8 p-3 text-sm">
                <span className="mb-2 block text-slate-300">Current Capability</span>
                <p className="rounded-xl bg-white/10 px-3 py-3 font-medium capitalize">{currentUser.role}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {(["operations", "treasury", "executive"] as DashboardAudienceMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAudienceMode(mode)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  audienceMode === mode ? "bg-white text-slate-950" : "bg-white/10 text-white"
                }`}
              >
                {mode === "operations" ? "Operations" : mode === "treasury" ? "Treasury" : "Executive"}
              </button>
            ))}
            <p className="text-sm text-slate-300">{modeTitle} view. {modeSummary}</p>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Release-ready</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summaryStrip.releaseReadyPackages}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Partially blocked</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summaryStrip.partiallyBlockedPackages}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Treasury ready</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summaryStrip.treasuryReadyPackages}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Treasury review</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summaryStrip.treasuryReviewRequiredPackages}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Frozen value</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(summaryStrip.frozenValue)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Releasable now</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(summaryStrip.releasableNow)}</p>
          </div>
        </div>

        <SectionCard
          title="Recent Changes"
          subtitle={`Last activity ${formatRelativeTime(projectActivity.lastActivityAt)}.`}
        >
          <div className="grid gap-3 lg:grid-cols-5">
            {projectActivity.recentEvents.map((event) => (
              <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{event.summary}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
                    {event.eventType}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {(event.actor ?? "system").toString()} · {event.stageName ?? project.name}
                </p>
                <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(event.timestamp)}</p>
              </article>
            ))}
            {projectActivity.recentEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No recent changes recorded.</p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Decision Pack"
          subtitle={
            audienceMode === "executive"
              ? "Report-safe summary of current funding, release posture, and control confidence."
              : "Shareable decision summary derived directly from the live operating state."
          }
        >
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Formal Reporting View</p>
              <h3 className="text-xl font-semibold text-slate-950">Current Decision Pack</h3>
              <p className="text-sm text-slate-600">Prepared from the same live funding, release, blocker, and activity state shown elsewhere in the dashboard.</p>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Narrative Summary</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <p>{decisionPack.fundingPositionLine}</p>
                  <p>{decisionPack.releasePostureLine}</p>
                  <p>{decisionPack.blockerThemeLine}</p>
                  <p>{decisionPack.treasuryConfidenceLine}</p>
                  <p>{decisionPack.disputeExposureLine}</p>
                  <p>{decisionPack.latestMaterialActivityLine}</p>
                </div>
                <p className="mt-4 text-xs text-slate-500">Key decision basis: {decisionSnapshot.keyDecisionBasis}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Decision Snapshot</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{currency.format(decisionSnapshot.balance)}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-slate-500">WIP</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{currency.format(decisionSnapshot.wip)}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-slate-500">{decisionSnapshot.shortfall > 0 ? "Shortfall" : "Surplus"}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {currency.format(decisionSnapshot.shortfall > 0 ? decisionSnapshot.shortfall : decisionSnapshot.surplus)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-slate-500">Releasable</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{currency.format(decisionSnapshot.releasable)}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-slate-500">Frozen</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{currency.format(decisionSnapshot.frozen)}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-slate-500">In progress</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{currency.format(decisionSnapshot.inProgress)}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-slate-500">Release-ready</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{decisionSnapshot.releaseReadyCount}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-slate-500">Blocked</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{decisionSnapshot.blockedCount}</p>
                </div>
              </div>
                <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Principal blocker</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.blockerThemeLine.replace("Principal blocker theme: ", "")}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Treasury confidence</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.treasuryConfidenceLine}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {audienceMode === "operations" ? <JourneySummaryCard journey={journey} /> : null}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr_1fr]">
          {audienceMode !== "treasury" ? (
          <SectionCard
            title={audienceMode === "executive" ? "Executive Summary" : "Primary Next Action"}
            subtitle={
              audienceMode === "executive"
                ? "A concise sponsor view of release confidence and cash position."
                : "The single action most likely to move work forward next."
            }
          >
            {primaryAction ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">
                      {audienceMode === "executive" ? `${summaryStrip.releaseReadyPackages} ready · ${summaryStrip.blockedPackages} blocked` : primaryAction.stageName}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {audienceMode === "executive" ? `Releasable now ${currency.format(summaryStrip.releasableNow)}` : primaryAction.primaryAction.title}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {audienceMode === "executive"
                        ? selectedDecision.explanation.reason
                        : primaryAction.primaryAction.detail}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Decision basis: {audienceMode === "executive"
                        ? selectedDecision.explanation.decisionBasis
                        : primaryActionDetail?.releaseDecision.explanation.decisionBasis ?? "Based on current control state."}
                    </p>
                  </div>
                  {audienceMode !== "executive" ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[primaryAction.priority]}`}>
                      {primaryAction.priority}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {audienceMode === "executive" ? (
                    <>
                      <span className="rounded-full bg-white px-3 py-1">WIP: {currency.format(fundingSummary.wipTotal)}</span>
                      <span className="rounded-full bg-white px-3 py-1">Frozen: {currency.format(summaryStrip.frozenValue)}</span>
                      <span className="rounded-full bg-white px-3 py-1">{shortfallActive ? "Shortfall" : "Surplus"}: {currency.format(shortfallActive ? fundingSummary.shortfall : fundingSummary.surplusCash)}</span>
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-white px-3 py-1">Responsibility: {primaryResponsibilityCue}</span>
                      <span className="rounded-full bg-white px-3 py-1">{primaryAction.operationalStatus.label}</span>
                      <span className="rounded-full bg-white px-3 py-1">Next step: {primaryAction.operationalStatus.nextStep}</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">No immediate action is required.</p>
            )}
          </SectionCard>
          ) : null}

          <SectionCard title="Release Decision" subtitle="Operational release state for the selected Work Package.">
            <div
              className={`rounded-2xl border p-4 ${
                selectedDecision.explanation.tone === "positive"
                  ? "border-teal-200 bg-teal-50"
                  : selectedDecision.explanation.tone === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-300 bg-slate-100"
              }`}
            >
              <p className="text-sm text-slate-500">{stageDetail.stage.name}</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{selectedDecision.explanation.label}</p>
              <p className="mt-2 text-sm text-slate-600">{selectedDecision.explanation.reason}</p>
              <p className="mt-2 text-xs text-slate-500">
                Releasable {currency.format(selectedDecision.releasableAmount)} · Frozen {currency.format(selectedDecision.frozenAmount)} · In progress {currency.format(selectedDecision.blockedAmount)}
              </p>
              <p className="mt-2 text-xs text-slate-500">Updated {formatRelativeTime(stageDetail.lastUpdatedAt)}</p>
              <p className="mt-2 text-xs text-slate-500">Decision basis: {selectedDecision.explanation.decisionBasis}</p>
              <p className="mt-2 text-xs text-slate-500">Next step: {stageDetail.operationalStatus.nextStep}</p>
            </div>
          </SectionCard>

          <SectionCard
            title={audienceMode === "treasury" ? "Control Confidence" : audienceMode === "executive" ? "Release Confidence" : "Blocker Summary"}
            subtitle={
              audienceMode === "treasury"
                ? "Treasury and control confidence for the selected Work Package."
                : audienceMode === "executive"
                  ? "Concise confidence cues for sponsor review."
                  : "Current blockers and operational ownership for the selected Work Package."
            }
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{stageDetail.treasuryReadiness.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{blockerSummaryText}</p>
              <p className="mt-2 text-sm text-slate-600">{stageDetail.treasuryReadiness.reason}</p>
              <p className="mt-2 text-xs text-slate-500">Decision basis: {selectedDecision.explanation.decisionBasis}</p>
              {stageBlockers[0] ? (
                <p className="mt-2 text-xs text-slate-500">Responsibility: {getBlockerResponsibilityCue(stageBlockers[0].code)}</p>
              ) : null}
            </div>
          </SectionCard>

          {audienceMode === "treasury" ? (
            <SectionCard title="Primary Next Action" subtitle="The single action most likely to move treasury controls forward next.">
              {primaryAction ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{primaryAction.stageName}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{primaryAction.primaryAction.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{primaryAction.primaryAction.detail}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Decision basis: {primaryActionDetail?.releaseDecision.explanation.decisionBasis ?? "Based on current control state."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-3 py-1">Responsibility: {primaryResponsibilityCue}</span>
                    <span className="rounded-full bg-white px-3 py-1">{primaryAction.operationalStatus.label}</span>
                    <span className="rounded-full bg-white px-3 py-1">Next step: {primaryAction.operationalStatus.nextStep}</span>
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">No immediate treasury action is required.</p>
              )}
            </SectionCard>
          ) : null}
        </div>

        <SectionCard
          title="Funding Position"
          subtitle={
            audienceMode === "operations"
              ? "Funding remains visible, but operational progression and blockers stay primary."
              : audienceMode === "treasury"
                ? "Treasury control position for total cash, WIP, surplus capacity, frozen value, and releasable value."
                : "Executive balance view across total cash, WIP, surplus capacity, frozen value, and releasable value."
          }
        >
          <p className="mb-3 text-xs text-slate-500">Updated {formatRelativeTime(projectActivity.lastActivityAt)}</p>
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
              shortfallActive
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-teal-200 bg-teal-50 text-teal-950"
            }`}
          >
            {fundingSummarySentence}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Balance</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(fundingSummary.projectBalance)}</p>
              <p className="mt-2 text-xs text-slate-500">Cash held in trust</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">WIP</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(fundingSummary.wipTotal)}</p>
              <p className="mt-2 text-xs text-slate-500">Committed work this period</p>
            </div>
            <div
              className={`rounded-2xl border p-4 ${
                shortfallActive ? "border-slate-200 bg-slate-50" : "border-teal-200 bg-teal-50"
              }`}
            >
              <p className={`text-sm ${shortfallActive ? "text-slate-500" : "text-teal-900"}`}>{shortfallActive ? "Shortfall" : "Surplus"}</p>
              <p className={`mt-2 text-2xl font-semibold ${shortfallActive ? "text-slate-950" : "text-teal-950"}`}>
                {currency.format(shortfallActive ? fundingSummary.shortfall : fundingSummary.surplusCash)}
              </p>
              <p className={`mt-2 text-xs ${shortfallActive ? "text-slate-500" : "text-teal-900"}`}>
                {shortfallActive ? "Cash below current WIP" : "Cash not yet committed to WIP"}
              </p>
            </div>
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
              <p className="text-sm text-teal-900">Releasable</p>
              <p className="mt-2 text-2xl font-semibold text-teal-950">{currency.format(fundingSummary.releasableFunds)}</p>
              <p className="mt-2 text-xs text-teal-900">Approved value within WIP</p>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4">
              <p className="text-sm text-slate-700">Frozen</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{currency.format(fundingSummary.frozenFunds)}</p>
              <p className="mt-2 text-xs text-slate-700">Disputed value within WIP</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(fundingSummary.inProgressFunds)}</p>
              <p className="mt-2 text-xs text-slate-500">Committed work not yet approved</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
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
                    <span>WIP breakdown</span>
                    <span className="font-medium text-slate-950">{currency.format(fundingSummary.wipTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm text-slate-700">
                    <span>Releasable</span>
                    <span className="font-medium text-slate-950">{currency.format(fundingSummary.releasableFunds)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm text-slate-700">
                    <span>Frozen</span>
                    <span className="font-medium text-slate-950">{currency.format(fundingSummary.frozenFunds)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm text-slate-700">
                    <span>In progress</span>
                    <span className="font-medium text-slate-950">{currency.format(fundingSummary.inProgressFunds)}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="grid gap-6">
            {audienceMode !== "executive" ? (
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
            ) : null}

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
                      onClick={() => setSelectedStageId(summary.stageId)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selectedStageId === summary.stageId
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

            {audienceMode !== "executive" ? (
            <SectionCard
              title="Action Queue"
              subtitle={
                audienceMode === "treasury"
                  ? "One clear next control step per Work Package, sorted by treasury impact and urgency."
                  : "One clear next step per Work Package, sorted by release impact and urgency."
              }
            >
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
                        {item.groupedActions.length > 1 ? (
                          <span className="rounded-full bg-slate-50 px-3 py-1">+{item.groupedActions.length - 1} supporting action{item.groupedActions.length - 1 === 1 ? "" : "s"}</span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
                {actionQueue.length === 0 ? <p className="text-sm text-slate-500">No pending actions.</p> : null}
              </div>
            </SectionCard>
            ) : null}
          </div>

          <div className="grid gap-6">
            <SectionCard
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
            </SectionCard>

            <SectionCard
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
            </SectionCard>
          </div>
        </div>

        {audienceMode !== "executive" ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <StageDetailPanel
            detail={stageDetail}
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
            onApprove={(role) => commit((current) => giveApproval(current, stageDetail.stage.id, role))}
            onReject={(role) => commit((current) => rejectApproval(current, stageDetail.stage.id, role))}
            onFundStage={() => commit((current) => allocateStageFunds(current, stageDetail.stage.id))}
            onApplyOverride={() => {
              commit((current) => applyOverride(current, stageDetail.stage.id, overrideReason));
              setOverrideReason("");
            }}
            onRelease={() => commit((current) => releaseStage(current, stageDetail.stage.id))}
            onOpenDispute={handleOpenDispute}
            onResolveDispute={(disputeId) => commit((current) => resolveDispute(current, stageDetail.stage.id, disputeId))}
            onCreateVariation={handleCreateVariation}
            onApproveVariation={(variationId) =>
              commit((current) => reviewVariation(current, stageDetail.stage.id, variationId, "approved"))
            }
            onRejectVariation={(variationId) =>
              commit((current) => reviewVariation(current, stageDetail.stage.id, variationId, "rejected"))
            }
            onActivateVariation={(variationId) => commit((current) => activateVariation(current, stageDetail.stage.id, variationId))}
          />

          <SectionCard title="Work Package Blockers" subtitle="Shared blocker and control state for the selected Work Package.">
            <div className="grid gap-3">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Shortest path</p>
                <p className="mt-1 font-medium text-slate-900">{stageDetail.operationalStatus.nextStep}</p>
              </article>
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Complete</p>
                  <div className="mt-2 grid gap-2 text-sm text-slate-700">
                    <p>{stageDetail.fundingStatusLabel === "Covered by balance" ? "Balance covers current WIP" : "Balance is below current WIP"}</p>
                    <p>{stageDetail.evidenceState === "accepted" ? "Evidence ready" : "Evidence pending"}</p>
                    <p>{stageDetail.approvalState === "approved" ? "Approval ready" : "Approval pending"}</p>
                  </div>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Blocking now</p>
                  <p className="mt-2 text-sm text-slate-700">{blockerSummaryText}</p>
                  {stageBlockers[0] ? (
                    <p className="mt-2 text-xs text-slate-500">Responsibility: {getBlockerResponsibilityCue(stageBlockers[0].code)}</p>
                  ) : null}
                </article>
              </div>
              {stageBlockers.map((blocker) => (
                <article key={blocker.code} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{blocker.label}</p>
                      <p className="mt-1 text-sm text-slate-500 capitalize">{blocker.code}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[blocker.priority]}`}>
                      {blocker.priority}
                    </span>
                  </div>
                </article>
              ))}
              {stageBlockers.length === 0 ? (
                <p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">No blockers. This Work Package can proceed.</p>
              ) : null}
              {selectedDecision.overriddenBlockers.length > 0 ? (
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                  <p className="text-sm font-semibold text-teal-950">Overridden blockers</p>
                  <div className="mt-2 grid gap-2">
                    {selectedDecision.overriddenBlockers.map((blocker) => (
                      <p key={`override-${blocker.code}-${blocker.label}`} className="text-sm text-teal-900">
                        {blocker.label}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-900">Audit Trail</h3>
              <div className="mt-3 grid gap-3">
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
            </div>
          </SectionCard>
        </div>
        ) : null}
      </div>
    </main>
  );
}
