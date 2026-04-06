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
  getFundingSummary,
  getLedgerTransactions,
  getOperationalSummary,
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

export default function ShureFundDashboard() {
  const [state, setState] = useState<SystemStateRecord>(() => initializeSystemState(initialSystemState));
  const [selectedStageId, setSelectedStageId] = useState("stage-foundation");
  const [depositAmount, setDepositAmount] = useState("50000");
  const [fundingSource, setFundingSource] = useState<FundingSourceType>("funder");
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

  const selectedDecision = releaseDecisions.find((entry) => entry.stageId === selectedStageId)!;

  function commit(updater: (current: SystemStateRecord) => SystemStateRecord) {
    setState((current) => updater(current));
  }

  function handleDeposit() {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount)) {
      return;
    }
    commit((current) =>
      depositFunds(
        current,
        project.id,
        amount,
        fundingSource,
        fundingSource === "contractor" ? selectedStageId : undefined,
      ),
    );
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
        </section>

        <JourneySummaryCard journey={journey} />

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="grid gap-6">
            <LedgerSummaryCard
              fundingSummary={fundingSummary}
              depositAmount={depositAmount}
              fundingSource={fundingSource}
              selectedWorkPackageName={stageDetail.stage.name}
              onDepositAmountChange={setDepositAmount}
              onFundingSourceChange={setFundingSource}
              onAddFunds={handleDeposit}
              canAddFunds={stageDetail.availableActions.fundStage}
            />

            <SectionCard title="Work Packages" subtitle="Select a Work Package to inspect funding, supporting information, approvals, disputes, variations, and drawdown status.">
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
                        <span className="text-sm">Shortfall {currency.format(summary.gapToRequiredCover)}</span>
                      </div>
                      <p className="mt-2 text-sm opacity-80">
                        Payable {currency.format(detail.payableValue)} · Frozen {currency.format(detail.frozenValue)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <LedgerTransactionsList transactions={ledgerTransactions} />

            <SectionCard title="Action Queue" subtitle="System-driven actions grouped by Work Package, with counts and priority.">
              <div className="grid gap-3">
                {actionQueue.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.stageName}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.actionCount} grouped action(s)</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[item.priority]}`}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {item.groupedActions.map((group) => (
                        <div key={`${item.id}-${group.actionType}-${group.actionableBy}`} className="rounded-2xl bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{group.title}</p>
                              <p className="mt-1 text-sm text-slate-500">{group.detail}</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">x{group.count}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-50 px-3 py-1">Owner: {group.actionableBy}</span>
                            <span className="rounded-full bg-slate-50 px-3 py-1">{group.actionType.replaceAll("_", " ")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
                {actionQueue.length === 0 ? <p className="text-sm text-slate-500">No pending actions.</p> : null}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6">
            <SectionCard title="Control Summary" subtitle="Workflow states recomputed from funding, supporting information, approvals, disputes, variations, and release records.">
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

            <SectionCard title="Drawdown Decisions" subtitle="Drawdown is allowed only when funding, supporting information, and approvals are complete unless treasury override is active. Frozen value remains outside payable drawdown.">
              <div className="grid gap-3">
                {releaseDecisions.map((decision) => (
                  <article key={decision.stageId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{decision.stageName}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[decision.status]}`}>
                        {decision.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {decision.releasable && !decision.overridden ? (
                        <p className="text-sm text-slate-600">Eligible for controlled drawdown.</p>
                      ) : null}
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

          <SectionCard title="Work Package Blockers" subtitle="Clear release blockers derived from central control logic.">
            <div className="grid gap-3">
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
              <h3 className="text-sm font-semibold text-slate-900">Immutable Audit Log</h3>
              <div className="mt-3 grid gap-3">
                {state.auditLog.map((entry) => (
                  <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-medium text-slate-900">{entry.action.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {entry.user} · {entry.entity} · {entry.entityId}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {entry.eventType} · {new Date(entry.timestamp).toLocaleString("en-GB")}
                    </p>
                  </article>
                ))}
                {state.auditLog.length === 0 ? <p className="text-sm text-slate-500">No actions recorded yet.</p> : null}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
