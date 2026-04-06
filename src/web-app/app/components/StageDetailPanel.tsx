"use client";

import { useEffect, useRef } from "react";

import type { ApprovalRole, EvidenceStatus, EvidenceType, FundingSourceType } from "@/lib/shureFundModels";
import { getStageDecisionPack, type StageDetailModel } from "@/lib/systemState";

import ApprovalPanel from "./ApprovalPanel";
import EvidencePanel from "./EvidencePanel";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

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

function SectionActionHeader({
  title,
  guidance,
}: {
  title: string;
  guidance: StageDetailModel["sectionGuidance"][keyof StageDetailModel["sectionGuidance"]];
}) {
  const toneClass =
    guidance.state === "act_now"
      ? "border-teal-200 bg-teal-50 text-teal-950"
      : guidance.state === "waiting"
        ? "border-slate-200 bg-slate-100 text-slate-900"
        : guidance.state === "blocked"
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-slate-200 bg-white text-slate-900";

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{guidance.summary}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
          {guidance.status}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">What happens next</p>
          <p className="mt-1 text-sm font-medium text-slate-950">{guidance.nextStep}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Recommended next action</p>
          <p className="mt-1 text-sm font-medium text-slate-950">{guidance.recommendedAction}</p>
          <p className="mt-1 text-xs text-slate-500">Owned by {guidance.ownerLabel}</p>
        </div>
      </div>
    </div>
  );
}

function getActionButtonClass(kind: "primary" | "secondary" | "warning", disabled: boolean) {
  if (kind === "primary") {
    return disabled
      ? "min-h-12 rounded-2xl bg-slate-300 px-4 py-3 text-sm font-medium text-white"
      : "min-h-12 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white";
  }

  if (kind === "warning") {
    return disabled
      ? "min-h-12 rounded-2xl bg-teal-200 px-4 py-3 text-sm font-medium text-white"
      : "min-h-12 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white";
  }

  return disabled
    ? "min-h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-400"
    : "min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900";
}

function getActionPriorityTone(priority: "Primary action" | "Secondary action" | "Unavailable") {
  if (priority === "Primary action") {
    return "bg-slate-900 text-white";
  }

  if (priority === "Secondary action") {
    return "bg-slate-100 text-slate-700";
  }

  return "bg-slate-50 text-slate-500";
}

function ActionControlCard({
  label,
  priority,
  reason,
  owner,
  disabled,
  kind,
  onClick,
}: {
  label: string;
  priority: "Primary action" | "Secondary action" | "Unavailable";
  reason: string;
  owner?: string;
  disabled: boolean;
  kind: "primary" | "secondary" | "warning";
  onClick: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        priority === "Primary action"
          ? "border-slate-900/10 bg-slate-50"
          : priority === "Unavailable"
            ? "border-slate-200 bg-slate-50/80"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getActionPriorityTone(priority)}`}
        >
          {priority}
        </p>
        {owner ? <p className="text-xs text-slate-500">Owned by {owner}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`mt-3 w-full disabled:cursor-not-allowed ${getActionButtonClass(kind, disabled)}`}
      >
        {label}
      </button>
      <p className="mt-2 text-sm text-slate-600">{reason}</p>
    </div>
  );
}

type StageDetailPanelProps = {
  detail: StageDetailModel;
  focusedSection: "overview" | "funding" | "approvals" | "evidence" | "dispute" | "variation" | "release";
  actionFeedback: {
    tone: "success" | "warning";
    title: string;
    detail: string;
  } | null;
  overrideReason: string;
  evidenceTitle: string;
  evidenceType: EvidenceType;
  fundingSource: FundingSourceType | "";
  disputeTitle: string;
  disputeReason: string;
  disputeAmount: string;
  variationTitle: string;
  variationReason: string;
  variationAmount: string;
  onOverrideReasonChange: (value: string) => void;
  onEvidenceTitleChange: (value: string) => void;
  onEvidenceTypeChange: (value: EvidenceType) => void;
  onDisputeTitleChange: (value: string) => void;
  onDisputeReasonChange: (value: string) => void;
  onDisputeAmountChange: (value: string) => void;
  onVariationTitleChange: (value: string) => void;
  onVariationReasonChange: (value: string) => void;
  onVariationAmountChange: (value: string) => void;
  onAddEvidence: () => void;
  onUpdateEvidenceStatus: (requirementId: string, status: EvidenceStatus) => void;
  onApprove: (role: ApprovalRole) => void;
  onReject: (role: ApprovalRole) => void;
  onFundStage: () => void;
  onApplyOverride: () => void;
  onRelease: () => void;
  onOpenDispute: () => void;
  onResolveDispute: (disputeId: string) => void;
  onCreateVariation: () => void;
  onApproveVariation: (variationId: string) => void;
  onRejectVariation: (variationId: string) => void;
  onActivateVariation: (variationId: string) => void;
};

export default function StageDetailPanel({
  detail,
  focusedSection,
  actionFeedback,
  overrideReason,
  evidenceTitle,
  evidenceType,
  fundingSource,
  disputeTitle,
  disputeReason,
  disputeAmount,
  variationTitle,
  variationReason,
  variationAmount,
  onOverrideReasonChange,
  onEvidenceTitleChange,
  onEvidenceTypeChange,
  onDisputeTitleChange,
  onDisputeReasonChange,
  onDisputeAmountChange,
  onVariationTitleChange,
  onVariationReasonChange,
  onVariationAmountChange,
  onAddEvidence,
  onUpdateEvidenceStatus,
  onApprove,
  onReject,
  onFundStage,
  onApplyOverride,
  onRelease,
  onOpenDispute,
  onResolveDispute,
  onCreateVariation,
  onApproveVariation,
  onRejectVariation,
  onActivateVariation,
}: StageDetailPanelProps) {
  const decisionPack = getStageDecisionPack(detail);
  const overviewRef = useRef<HTMLElement | null>(null);
  const fundingRef = useRef<HTMLDivElement | null>(null);
  const releaseRef = useRef<HTMLDivElement | null>(null);
  const evidenceRef = useRef<HTMLDivElement | null>(null);
  const approvalsRef = useRef<HTMLDivElement | null>(null);
  const disputeRef = useRef<HTMLElement | null>(null);
  const variationRef = useRef<HTMLElement | null>(null);
  const stageWipTotal = detail.releaseDecision.releasableAmount + detail.releaseDecision.frozenAmount + detail.releaseDecision.blockedAmount;
  const parsedDisputeAmount = Number(disputeAmount);
  const parsedVariationAmount = Number(variationAmount);
  const canFundStage = detail.availableActions.fundStage && detail.funding.gapToRequiredCover > 0;
  const canReleaseStage = detail.availableActions.release && detail.releaseDecision.releasable;
  const canApplyOverride = detail.availableActions.applyOverride && overrideReason.trim().length > 0;
  const canOpenDispute =
    detail.availableActions.openDispute &&
    disputeTitle.trim().length > 0 &&
    disputeReason.trim().length > 0 &&
    Number.isFinite(parsedDisputeAmount) &&
    parsedDisputeAmount > 0;
  const canCreateVariation =
    detail.availableActions.createVariation &&
    variationTitle.trim().length > 0 &&
    variationReason.trim().length > 0 &&
    Number.isFinite(parsedVariationAmount) &&
    parsedVariationAmount !== 0;
  const fundReason = canFundStage
    ? "Allocates the remaining amount and updates this work package immediately."
    : detail.availableActions.fundStage
      ? detail.sectionGuidance.funding.recommendedAction
      : detail.availableActions.fundStageReason;
  const releaseReason = canReleaseStage
    ? "Releases the approved value and updates drawdown, blockers, and history immediately."
    : detail.availableActions.release
      ? detail.sectionGuidance.release.recommendedAction
      : detail.availableActions.releaseReason;
  const overrideReasonText = canApplyOverride
    ? "Applies a governed treasury override with the reason recorded in the audit trail."
    : overrideReason.trim().length === 0
      ? "Enter an override reason before this control can be used."
      : detail.availableActions.applyOverrideReason;
  const openDisputeReasonText = canOpenDispute
    ? "Raises a dispute and freezes only the affected value."
    : detail.availableActions.openDispute
      ? detail.sectionGuidance.dispute.recommendedAction
      : detail.availableActions.openDisputeReason;
  const createVariationReasonText = canCreateVariation
    ? "Records the proposal and updates variation review state immediately."
    : detail.availableActions.createVariation
      ? detail.sectionGuidance.variation.recommendedAction
      : detail.availableActions.createVariationReason;

  useEffect(() => {
    const refMap = {
      overview: overviewRef,
      funding: fundingRef,
      release: releaseRef,
      evidence: evidenceRef,
      approvals: approvalsRef,
      dispute: disputeRef,
      variation: variationRef,
    } as const;

    refMap[focusedSection]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [detail.stage.id, focusedSection]);

  function getSectionClass(section: typeof focusedSection) {
    return focusedSection === section
      ? "scroll-mt-28 rounded-2xl ring-2 ring-teal-200/80 transition"
      : "scroll-mt-28";
  }

  return (
    <section ref={overviewRef} className={`rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] ${getSectionClass("overview")}`}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Work Package Detail</h2>
        <p className="mt-1 text-sm text-slate-500">{detail.projectName} · {detail.stage.name}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
          <span>Acting role {detail.actingRole.label}</span>
          {detail.notificationCue ? (
            <span
              className={`rounded-full px-2 py-1 font-semibold ${
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
          <span>Updated {formatRelativeTime(detail.lastUpdatedAt)}</span>
          <span>Last decision {formatRelativeTime(detail.lastDecisionAt)}</span>
        </div>
      </div>

      {actionFeedback ? (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 ${
            actionFeedback.tone === "success"
              ? "border-teal-200 bg-teal-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className={`text-sm font-medium ${actionFeedback.tone === "success" ? "text-teal-950" : "text-amber-950"}`}>
            {actionFeedback.title}
          </p>
          <p className={`mt-1 text-xs ${actionFeedback.tone === "success" ? "text-teal-900" : "text-amber-900"}`}>
            {actionFeedback.detail}
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">WIP</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{currency.format(stageWipTotal)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Releasable</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{currency.format(detail.releaseDecision.releasableAmount)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Frozen</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{currency.format(detail.disputeSummary.frozenValue)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Workflow Status</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{detail.operationalStatus.label}</p>
          <p className="mt-1 text-xs text-slate-500">{detail.operationalStatus.reason}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Balance</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {detail.fundingStatusLabel}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Evidence</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {detail.evidenceState === "accepted" ? "Ready" : "Awaiting evidence"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Approval</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {detail.approvalState === "approved" ? "Ready" : "Awaiting approval"}
          </p>
        </div>
      </div>

      <div ref={fundingRef} className={`mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 ${getSectionClass("funding")}`}>
        <SectionActionHeader title="Funding" guidance={detail.sectionGuidance.funding} />
        <p className="text-sm font-semibold text-slate-900">Control Summary</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Approvals</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.approvalState === "approved" ? "Ready" : "Awaiting approval"}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Evidence</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.evidenceState === "accepted" ? "Ready" : "Awaiting evidence"}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Balance</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.fundingStatusLabel}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Dispute</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.disputeSummary.status}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Variation</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.variationSummary.status}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Treasury</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.treasuryReadiness.label}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mini Decision Pack</p>
          <p className="text-sm font-semibold text-slate-900">Stage Report Card</p>
          <p className="text-sm text-slate-600">Compact operational and treasury summary for this selected Work Package.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Status</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.status}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Treasury readiness</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.treasuryReadiness}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Release status</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.releaseStatus}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Next owner</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.nextActionOwner}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Releasable</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{currency.format(decisionPack.releasable)}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Frozen</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{currency.format(decisionPack.frozen)}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">In progress</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{currency.format(decisionPack.inProgress)}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Principal blocker</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.principalBlocker}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Decision basis</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.decisionBasis}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Latest activity</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.latestActivity}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Shortest Path Forward</p>
          <p className="mt-2 text-sm text-slate-600">{detail.operationalStatus.nextStep}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Release Decision</p>
          <p className="mt-2 text-sm font-medium text-slate-950">{detail.releaseDecision.explanation.label}</p>
          <p className="mt-1 text-sm text-slate-600">{detail.releaseDecision.explanation.reason}</p>
          <p className="mt-2 text-xs text-slate-500">
            Releasable {currency.format(detail.releaseDecision.releasableAmount)} · Frozen {currency.format(detail.releaseDecision.frozenAmount)} · In progress {currency.format(detail.releaseDecision.blockedAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Decision basis: {detail.releaseDecision.explanation.decisionBasis}</p>
          <p className="mt-1 text-xs text-slate-500">{detail.treasuryReadiness.label} · {detail.treasuryReadiness.reason}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <SectionActionHeader title="Funding Position" guidance={detail.sectionGuidance.funding} />
        <h3 className="text-sm font-semibold text-slate-900">Funding</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">WIP</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(stageWipTotal)}</p>
            <p className="mt-1 text-xs text-slate-500">Committed work still sitting in this Work Package.</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Releasable</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.releaseDecision.releasableAmount)}</p>
            <p className="mt-1 text-xs text-slate-500">Approved value within WIP.</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Frozen</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.disputeSummary.frozenValue)}</p>
            <p className="mt-1 text-xs text-slate-500">Disputed value within WIP.</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">In progress</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.releaseDecision.blockedAmount)}</p>
            <p className="mt-1 text-xs text-slate-500">Committed work not yet approved for release.</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Balance position</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{detail.fundingStatusLabel}</p>
            <p className="mt-1 text-xs text-slate-500">Based on total project balance against current WIP.</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Blocking Release</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{detail.blockingRelease ? "Yes" : "No"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {detail.blockingRelease
                ? "One or more current blockers in the release decision are stopping drawdown."
                : "This Work Package is not currently blocked from drawdown."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Dispute Position</p>
            <p className="mt-2 text-sm text-slate-600">{detail.disputeSummary.reason}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>Disputed value: {currency.format(detail.disputeSummary.disputedValue)}</p>
              <p>Frozen value: {currency.format(detail.disputeSummary.frozenValue)}</p>
              <p>Undisputed value: {currency.format(detail.disputeSummary.undisputedValue)}</p>
              <p>Releasable value: {currency.format(detail.disputeSummary.releasableValue)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Variation Position</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{detail.variationSummary.status}</p>
            <p className="mt-1 text-sm text-slate-600">{detail.variationSummary.reason}</p>
          </div>
        </div>

        {!detail.actingRole.readOnly ? (
          <div className="mt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Funding control</p>
            <ActionControlCard
              label="Fund Work Package"
              priority={detail.sectionGuidance.funding.state === "act_now" ? "Primary action" : canFundStage ? "Secondary action" : "Unavailable"}
              reason={fundReason}
              owner="Treasury"
              disabled={!canFundStage}
              kind={detail.sectionGuidance.funding.state === "act_now" ? "primary" : "secondary"}
              onClick={onFundStage}
            />
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Activity</p>
            <p className="text-xs text-slate-500">Last updated {formatRelativeTime(detail.lastUpdatedAt)}</p>
          </div>
          <div className="mt-3 grid gap-3">
            {detail.recentEvents.map((event) => (
              <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{event.summary}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600">{event.eventType}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{(event.actor ?? "system").toString()} · {formatRelativeTime(event.timestamp)}</p>
              </article>
            ))}
            {detail.recentEvents.length === 0 ? <p className="text-sm text-slate-500">No recent activity recorded.</p> : null}
          </div>
        </div>

        {detail.blockingRelease ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Current blockers</p>
            <div className="mt-2 grid gap-2">
              {detail.releaseDecision.reasons.map((reason, index) => (
                <p key={`release-blocker-${reason.type}-${index}`} className="text-sm text-amber-900">
                  {reason.message}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div ref={releaseRef} className={`mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 ${getSectionClass("release")}`}>
        <SectionActionHeader title="Release" guidance={detail.sectionGuidance.release} />
        <p className="text-sm font-semibold text-slate-900">Drawdown Decision</p>
        <div className="mt-2 grid gap-2">
          <p className="text-sm text-slate-600">{detail.releaseDecision.explanation.reason}</p>
          <p className="text-sm text-slate-600">
            {detail.releaseDecision.isPartialRelease
              ? `Only ${currency.format(detail.releaseDecision.releasableAmount)} can release now. ${currency.format(detail.releaseDecision.frozenAmount)} remains frozen.`
              : `Release amount available now: ${currency.format(detail.releaseDecision.releasableAmount)}.`}
          </p>
          <p className="text-sm text-slate-600">Decision basis: {detail.releaseDecision.explanation.decisionBasis}</p>
          {detail.releaseDecision.overridden ? (
            <p className="rounded-2xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">
              Treasury override is active and clearly flagged. Drawdown proceeds as an override, not a normal release.
            </p>
          ) : null}
          {detail.releaseDecision.reasons.map((reason, index) => (
            <p key={`${reason.type}-${index}`} className="text-sm text-slate-600">
              <span className="font-medium capitalize text-slate-800">{reason.type.replaceAll("_", " ")}:</span> {reason.message}
            </p>
          ))}
        </div>
        {!detail.actingRole.readOnly ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Release controls</p>
            </div>
            <ActionControlCard
              label="Release Funds"
              priority={detail.sectionGuidance.release.state === "act_now" ? "Primary action" : canReleaseStage ? "Secondary action" : "Unavailable"}
              reason={releaseReason}
              owner="Treasury"
              disabled={!canReleaseStage}
              kind="primary"
              onClick={onRelease}
            />
            <ActionControlCard
              label="Apply Override"
              priority={canApplyOverride ? "Secondary action" : "Unavailable"}
              reason={overrideReasonText}
              owner="Treasury"
              disabled={!canApplyOverride}
              kind="warning"
              onClick={onApplyOverride}
            />
          </div>
        ) : (
          <div className="sm:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {detail.actingRole.label} view is read-only. Treasury and control actions remain visible through the decision and audit summaries only.
          </div>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-dashed border-teal-200 bg-teal-50 p-4">
        <p className="text-sm font-semibold text-teal-950">Treasury Override</p>
        <p className="mt-1 text-xs text-teal-900">Funding source in view: {fundingSource || "not selected"}</p>
        <textarea
          className="mt-3 min-h-24 w-full rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm"
          placeholder="Override reason"
          value={overrideReason}
          disabled={!detail.availableActions.applyOverride}
          onChange={(event) => onOverrideReasonChange(event.target.value)}
        />
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <div ref={evidenceRef} className={getSectionClass("evidence")}>
          <SectionActionHeader title="Evidence" guidance={detail.sectionGuidance.evidence} />
          <EvidencePanel
            detail={detail}
            evidenceTitle={evidenceTitle}
            evidenceType={evidenceType}
            onEvidenceTitleChange={onEvidenceTitleChange}
            onEvidenceTypeChange={onEvidenceTypeChange}
            onAddEvidence={onAddEvidence}
            onUpdateEvidenceStatus={onUpdateEvidenceStatus}
          />
        </div>
        <div ref={approvalsRef} className={getSectionClass("approvals")}>
          <SectionActionHeader title="Approvals" guidance={detail.sectionGuidance.approvals} />
          <ApprovalPanel detail={detail} onApprove={onApprove} onReject={onReject} />
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <section ref={disputeRef} className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${getSectionClass("dispute")}`}>
          <SectionActionHeader title="Dispute" guidance={detail.sectionGuidance.dispute} />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Disputes</h3>
            <p className="mt-1 text-sm text-slate-500">Freeze only the affected value while undisputed value can continue through control checks.</p>
          </div>
          <div className="mt-3 grid gap-3">
            <input
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Dispute title"
              value={disputeTitle}
              disabled={!detail.availableActions.openDispute}
              onChange={(event) => onDisputeTitleChange(event.target.value)}
            />
            <textarea
              className="min-h-24 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Reason for dispute"
              value={disputeReason}
              disabled={!detail.availableActions.openDispute}
              onChange={(event) => onDisputeReasonChange(event.target.value)}
            />
            <input
              inputMode="numeric"
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Frozen value amount"
              value={disputeAmount}
              disabled={!detail.availableActions.openDispute}
              onChange={(event) => onDisputeAmountChange(event.target.value)}
            />
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Dispute control</p>
              <ActionControlCard
                label="Raise Dispute"
                priority={detail.sectionGuidance.dispute.state === "act_now" ? "Primary action" : canOpenDispute ? "Secondary action" : "Unavailable"}
                reason={openDisputeReasonText}
                owner={detail.sectionGuidance.dispute.ownerLabel}
                disabled={!canOpenDispute}
                kind="primary"
                onClick={onOpenDispute}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {detail.disputes.map((dispute) => (
              <article key={dispute.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{dispute.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{dispute.reason}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Disputed {currency.format(dispute.disputedAmount)} · {dispute.status}
                    </p>
                  </div>
                  {dispute.status === "open" ? (
                    <div className="grid gap-2 min-w-[15rem]">
                      <ActionControlCard
                        label="Resolve Dispute"
                        priority={dispute.canResolve ? "Primary action" : "Unavailable"}
                        reason={dispute.canResolve ? "Resolves the dispute and restores a cleaner payment position." : detail.availableActions.resolveDisputeReason}
                        owner="Commercial"
                        disabled={!dispute.canResolve}
                        kind="secondary"
                        onClick={() => onResolveDispute(dispute.id)}
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
            {detail.disputes.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No dispute items recorded for this Work Package.</p>
            ) : null}
          </div>
        </section>

        <section ref={variationRef} className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${getSectionClass("variation")}`}>
          <SectionActionHeader title="Variation" guidance={detail.sectionGuidance.variation} />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Variations</h3>
            <p className="mt-1 text-sm text-slate-500">Variations must be reviewed and funding-confirmed before activation.</p>
          </div>
          <div className="mt-3 grid gap-3">
            <input
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Variation title"
              value={variationTitle}
              disabled={!detail.availableActions.createVariation}
              onChange={(event) => onVariationTitleChange(event.target.value)}
            />
            <textarea
              className="min-h-24 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Reason for variation"
              value={variationReason}
              disabled={!detail.availableActions.createVariation}
              onChange={(event) => onVariationReasonChange(event.target.value)}
            />
            <input
              inputMode="numeric"
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Variation amount delta"
              value={variationAmount}
              disabled={!detail.availableActions.createVariation}
              onChange={(event) => onVariationAmountChange(event.target.value)}
            />
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Variation control</p>
              <ActionControlCard
                label="Propose Variation"
                priority={detail.sectionGuidance.variation.state === "act_now" ? "Primary action" : canCreateVariation ? "Secondary action" : "Unavailable"}
                reason={createVariationReasonText}
                owner={detail.sectionGuidance.variation.ownerLabel}
                disabled={!canCreateVariation}
                kind="primary"
                onClick={onCreateVariation}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {detail.variations.map((variation) => (
              <article key={variation.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{variation.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{variation.reason}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Delta {currency.format(variation.amountDelta)} · {variation.operationalStatusLabel}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:flex">
                    {variation.status === "pending" ? (
                      <>
                        <div className="grid gap-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            {variation.canApprove ? "Primary action" : "Unavailable"}
                          </p>
                          <button
                            type="button"
                            onClick={() => onApproveVariation(variation.id)}
                            disabled={!variation.canApprove}
                            className={`disabled:cursor-not-allowed ${getActionButtonClass("primary", !variation.canApprove)}`}
                          >
                            Approve Variation
                          </button>
                          <p className="text-xs text-slate-500">
                            {variation.canApprove ? "Approves the variation and moves it toward activation." : detail.availableActions.reviewVariationReason}
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            {variation.canReject ? "Secondary action" : "Unavailable"}
                          </p>
                          <button
                            type="button"
                            onClick={() => onRejectVariation(variation.id)}
                            disabled={!variation.canReject}
                            className={`disabled:cursor-not-allowed ${getActionButtonClass("secondary", !variation.canReject)}`}
                          >
                            Reject
                          </button>
                          {!variation.canReject ? (
                            <p className="text-xs text-slate-500">{detail.availableActions.reviewVariationReason}</p>
                          ) : (
                            <p className="text-xs text-slate-500">Rejects the variation and leaves the current scope unchanged.</p>
                          )}
                        </div>
                      </>
                    ) : null}
                    {variation.status === "approved" ? (
                      <div className="grid gap-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          {variation.canActivate ? "Primary action" : "Unavailable"}
                        </p>
                        <button
                          type="button"
                          onClick={() => onActivateVariation(variation.id)}
                          disabled={!variation.canActivate}
                          className={`disabled:cursor-not-allowed ${getActionButtonClass("warning", !variation.canActivate)}`}
                        >
                          Activate
                        </button>
                        <p className="text-xs text-slate-500">
                          {variation.canActivate ? "Activates the approved change into the live payment controls." : detail.availableActions.activateVariationReason}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
            {detail.variations.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No variations recorded for this Work Package.</p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-900">Blockers</h3>
        <div className="mt-3 grid gap-3">
          {detail.blockers.map((blocker) => (
            <article key={blocker.code} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">{blocker.label}</p>
              <p className="mt-1 text-sm text-slate-500">{blocker.priority}</p>
            </article>
          ))}
          {detail.blockers.length === 0 ? (
            <p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">No blockers recorded for this Work Package.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
