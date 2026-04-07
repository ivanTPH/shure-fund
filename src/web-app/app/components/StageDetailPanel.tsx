"use client";

import { useEffect, useRef } from "react";

import type { ApprovalRole, EvidenceStatus, EvidenceType, FundingSourceType } from "@/lib/shureFundModels";
import {
  getStageDecisionPack,
  type DerivedActionDescriptor,
  type StageDetailModel,
  type StageTopSignalKey,
  type WorkspaceDecisionCue,
} from "@/lib/systemState";

import ApprovalPanel from "./ApprovalPanel";
import EvidencePanel from "./EvidencePanel";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const stageSurfaceHierarchy = {
  primary: "rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,1)_0%,rgba(255,255,255,0.98)_100%)] p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)]",
  secondaryBand: "rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4",
  secondaryCard: "rounded-2xl border border-slate-200/80 bg-white/90 p-3",
  tertiaryPanel: "rounded-[24px] border border-slate-200 bg-slate-50/75 p-4",
  mutedPanel: "rounded-2xl border border-slate-200 bg-white p-4",
  mutedBlock: "rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4",
} as const;

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
    <div className="mb-3 rounded-2xl border border-slate-200/80 bg-white/85 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{guidance.summary}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
          {guidance.status}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next</p>
          <p className="mt-1 text-sm text-slate-900">{guidance.nextStep}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Action</p>
          <p className="mt-1 text-sm text-slate-900">{guidance.recommendedAction}</p>
          <p className="mt-1 text-xs text-slate-500">Owned by {guidance.ownerLabel}</p>
        </div>
      </div>
    </div>
  );
}

function SectionOutcomeNotice({
  feedback,
}: {
  feedback: {
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
  };
}) {
  const containerClass =
    feedback.emphasis === "strong"
      ? feedback.resultTone === "success"
        ? "border-teal-300 bg-teal-50/90"
        : "border-amber-300 bg-amber-50/90"
      : feedback.emphasis === "normal"
        ? "border-slate-300 bg-slate-50"
        : "border-slate-200 bg-slate-50/80";
  const resultToneClass =
    feedback.resultTone === "success"
      ? "bg-teal-950 text-white"
      : feedback.resultTone === "info"
        ? "bg-slate-900 text-white"
        : feedback.resultTone === "warning"
          ? "bg-amber-100 text-amber-950"
          : "bg-slate-100 text-slate-800";
  const stateToneClass =
    feedback.progressionStatus === "advanced"
      ? "bg-teal-950 text-white"
      : feedback.progressionStatus === "ready_for_next_decision"
        ? "bg-slate-900 text-white"
        : feedback.progressionStatus === "waiting_on_other_role"
          ? "bg-slate-100 text-slate-800"
          : "bg-amber-100 text-amber-950";

  return (
    <div
      className={`mb-4 rounded-2xl border-l-4 p-4 shadow-[0_10px_26px_-22px_rgba(15,23,42,0.45)] ${containerClass}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Recent action result</p>
          <p className={`mt-1 text-sm font-semibold ${feedback.tone === "success" ? "text-teal-950" : "text-amber-950"}`}>
            {feedback.resultHeadline}
          </p>
          {feedback.resultSubline ? (
            <p className={`mt-1 text-sm ${feedback.tone === "success" ? "text-teal-900" : "text-amber-900"}`}>
              {feedback.resultSubline}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${resultToneClass}`}>
            {feedback.resultTypeLabel}
          </span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${stateToneClass}`}>
            {feedback.stateNowLabel}
          </span>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">What changed</p>
          <div className="mt-1 grid gap-1">
            {feedback.whatChanged.slice(0, 2).map((item, index) => (
              <p key={`changed-${index}`} className="text-sm text-slate-900">{item}</p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">State now</p>
          <p className="mt-1 text-sm text-slate-900">{feedback.stateNowLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{feedback.stateNowDetail}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next step</p>
          <p className="mt-1 text-sm text-slate-900">{feedback.nextActionLabel ?? feedback.detail}</p>
          <p className="mt-1 text-xs text-slate-500">
            {feedback.nextOwner ? `${feedback.nextOwner} acts next.` : "No further owner is required."}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Unlocked / still blocked</p>
          {feedback.unlockedItems.length > 0 ? (
            <div className="mt-1 grid gap-1">
              {feedback.unlockedItems.slice(0, 2).map((item, index) => (
                <p key={`unlocked-${index}`} className="text-sm text-slate-900">{item}</p>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-900">
              {feedback.remainingBlockers.length > 0 ? feedback.remainingBlockers[0] : "No additional governed change was unlocked."}
            </p>
          )}
          {feedback.remainingBlockers.length > 1 ? (
            <p className="mt-1 text-xs text-slate-500">{`${feedback.remainingBlockers.length - 1} more blocker${feedback.remainingBlockers.length - 1 === 1 ? "" : "s"} remain.`}</p>
          ) : feedback.remainingBlockers.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">No active blocker remains.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StageDecisionSummaryCard({
  summary,
}: {
  summary: StageDetailModel["decisionSummary"];
}) {
  const toneClass =
    summary.tone === "success"
      ? "border-teal-200 bg-teal-50"
      : summary.tone === "info"
        ? "border-slate-200 bg-slate-50"
        : summary.tone === "warning"
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Stage decision summary</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{summary.statusLabel}</p>
          <p className="mt-1 text-sm text-slate-600">{summary.actionabilityLabel}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {summary.releaseReadinessLabel}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Primary next decision</p>
          <p className="mt-1 text-sm text-slate-900">{summary.primaryDecisionLabel ?? "No immediate decision required."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Owner / next owner</p>
          <p className="mt-1 text-sm text-slate-900">{summary.currentOwnerLabel ?? "No current owner assigned."}</p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.nextOwnerLabel ? `Next owner ${summary.nextOwnerLabel}` : "No further owner queued."}
          </p>
        </div>
        <div className="xl:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Blocking progression</p>
          <div className="mt-1 grid gap-1">
            {summary.blockerSummary.length > 0 ? (
              summary.blockerSummary.map((blocker, index) => (
                <p key={`summary-blocker-${index}`} className="text-sm text-slate-900">{blocker}</p>
              ))
            ) : (
              <p className="text-sm text-slate-900">No active blocker is holding this stage.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummarySupportList({
  lines,
  tone,
}: {
  lines: string[];
  tone: "success" | "info" | "warning" | "neutral";
}) {
  if (lines.length === 0) {
    return null;
  }

  const visibleLines = tone === "warning" ? lines.slice(0, 2) : lines.slice(0, 1);

  return (
    <div className="mt-3 grid gap-1">
      {visibleLines.map((line, index) => (
        <p key={`support-line-${index}`} className="text-sm text-slate-600">{line}</p>
      ))}
    </div>
  );
}

function StageHealthStrip({
  health,
}: {
  health: StageDetailModel["healthDescriptor"];
}) {
  const toneClass =
    health.overallStatus === "blocked"
      ? "border-amber-300 bg-amber-50"
      : health.overallStatus === "at_risk"
        ? "border-slate-300 bg-slate-100"
        : "border-teal-200 bg-teal-50";
  const badgeClass =
    health.overallStatus === "blocked"
      ? "bg-amber-100 text-amber-950"
      : health.overallStatus === "at_risk"
        ? "bg-slate-200 text-slate-800"
        : "bg-teal-100 text-teal-950";
  const label =
    health.overallStatus === "blocked"
      ? "Blocked"
      : health.overallStatus === "at_risk"
        ? "At risk"
        : "Healthy";

  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeClass}`}>
          {label}
        </span>
        <p className="text-sm font-semibold text-slate-950">{health.primaryReason}</p>
      </div>
      {health.secondarySignals.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {health.secondarySignals.slice(0, 2).map((signal, index) => (
            <span key={`health-signal-${index}`}>{signal}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StageAttentionReasonCard({
  reason,
}: {
  reason: StageDetailModel["attentionReason"];
}) {
  const toneClass =
    reason.tone === "success"
      ? "border-teal-200 bg-teal-50"
      : reason.tone === "info"
        ? "border-slate-200 bg-slate-50"
        : reason.tone === "warning"
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Why this stage needs attention</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{reason.headline}</p>
          <p className="mt-1 text-sm text-slate-600">{reason.reasonLabel}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {reason.driverLabel}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Governance condition</p>
          <p className="mt-1 text-sm text-slate-900">{reason.reasonCategory}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Actionability</p>
          <p className="mt-1 text-sm text-slate-900">
            {reason.requiresMyAction ? "Needs your action now" : "Waiting on another role or prerequisite"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Owner / next owner</p>
          <p className="mt-1 text-sm text-slate-900">{reason.ownerLabel ?? "No active owner"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {reason.nextOwnerLabel ? `Next owner ${reason.nextOwnerLabel}` : "No further owner queued."}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Supporting detail</p>
          <p className="mt-1 text-sm text-slate-900">{reason.supportingDetails[0] ?? "No further detail is required."}</p>
        </div>
      </div>
    </div>
  );
}

function StageFundingExplanationCard({
  explanation,
}: {
  explanation: StageDetailModel["fundingExplanation"];
}) {
  const toneClass =
    explanation.tone === "success"
      ? "border-teal-200 bg-teal-50"
      : explanation.tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : explanation.tone === "info"
          ? "border-slate-200 bg-slate-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Financial explanation</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{explanation.coverageLabel}</p>
          <p className="mt-1 text-sm text-slate-600">{explanation.headline}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {explanation.coverageState.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Required cover</p>
          <p className="mt-1 text-sm text-slate-900">{explanation.requiredCoverLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Ringfenced</p>
          <p className="mt-1 text-sm text-slate-900">{explanation.ringfencedLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Reserve</p>
          <p className="mt-1 text-sm text-slate-900">{explanation.reserveLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Release position</p>
          <p className="mt-1 text-sm text-slate-900">{explanation.releasableLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{explanation.shortfallLabel}</p>
        </div>
      </div>
      {explanation.blockingConditionLabel ? (
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Blocking financial condition</p>
          <p className="mt-1 text-sm text-slate-900">{explanation.blockingConditionLabel}</p>
        </div>
      ) : null}
      {explanation.nextFinancialStepLabel ? (
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next financial step</p>
          <p className="mt-1 text-sm text-slate-900">{explanation.nextFinancialStepLabel}</p>
        </div>
      ) : null}
      <SummarySupportList lines={explanation.supportingLines} tone={explanation.tone} />
    </div>
  );
}

function StageRoleHandoffCard({
  handoff,
}: {
  handoff: StageDetailModel["roleHandoff"];
}) {
  if (!handoff.isWaitingOnAnotherRole) {
    return null;
  }

  const toneClass =
    handoff.tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : handoff.tone === "info"
        ? "border-slate-200 bg-slate-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current handoff</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{handoff.handoffHeadline}</p>
          <p className="mt-1 text-sm text-slate-600">{handoff.handoffReasonLabel}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {handoff.toRoleLabel ?? "Next owner"}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Waiting on</p>
          <p className="mt-1 text-sm text-slate-900">{handoff.toRoleLabel ?? "Next owner"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {handoff.fromRoleLabel ? `Handed over from ${handoff.fromRoleLabel}` : "Awaiting the next governed owner."}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Expected action</p>
          <p className="mt-1 text-sm text-slate-900">{handoff.expectedActionLabel ?? "Open the next governed step."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Why waiting</p>
          <p className="mt-1 text-sm text-slate-900">{handoff.blockingConditionLabel ?? handoff.handoffReasonLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next outcome</p>
          <p className="mt-1 text-sm text-slate-900">{handoff.unlockOutcomeLabel ?? "This advances the next governed control step."}</p>
        </div>
      </div>
    </div>
  );
}

function StageExitStateCard({
  exitState,
}: {
  exitState: StageDetailModel["exitState"];
}) {
  if (!exitState.isClosedOrComplete) {
    return null;
  }

  const toneClass =
    exitState.tone === "success"
      ? "border-teal-200 bg-teal-50"
      : exitState.tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : exitState.tone === "info"
          ? "border-slate-200 bg-slate-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current outcome</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{exitState.outcomeLabel}</p>
          <p className="mt-1 text-sm text-slate-600">{exitState.headline}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {exitState.exitState.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Governed outcome</p>
          <p className="mt-1 text-sm text-slate-900">{exitState.finalActionLabel ?? "No further normal progression is active."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Value outcome</p>
          <p className="mt-1 text-sm text-slate-900">{exitState.valueOutcomeLabel ?? "No further value movement is active."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Remaining exposure</p>
          <p className="mt-1 text-sm text-slate-900">{exitState.remainingExposureLabel ?? "No active exposure remains under normal progression."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Exception path</p>
          <p className="mt-1 text-sm text-slate-900">{exitState.reopenPathLabel ?? "No reopen path is currently expected."}</p>
        </div>
      </div>
      {exitState.supportingLines.length > 0 ? (
        <div className="mt-3 grid gap-1">
          {exitState.supportingLines.map((line, index) => (
            <p key={`exit-support-${index}`} className="text-sm text-slate-600">{line}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StageExceptionPathCard({
  exceptionPath,
}: {
  exceptionPath: StageDetailModel["exceptionPath"];
}) {
  if (!exceptionPath.hasActiveExceptionPath) {
    return null;
  }

  const toneClass =
    exceptionPath.tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : exceptionPath.tone === "info"
        ? "border-slate-200 bg-slate-50"
        : exceptionPath.tone === "success"
          ? "border-teal-200 bg-teal-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Governed exception</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{exceptionPath.headline}</p>
          <p className="mt-1 text-sm text-slate-600">{exceptionPath.exceptionReasonLabel}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {exceptionPath.exceptionType.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Owner</p>
          <p className="mt-1 text-sm text-slate-900">{exceptionPath.ownerLabel ?? "No active owner"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Required decision</p>
          <p className="mt-1 text-sm text-slate-900">{exceptionPath.requiredDecisionLabel ?? "Review the exception path."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Normal path paused</p>
          <p className="mt-1 text-sm text-slate-900">{exceptionPath.normalPathPausedLabel ?? "Normal progression remains active."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Return path</p>
          <p className="mt-1 text-sm text-slate-900">{exceptionPath.returnPathLabel ?? "No return path is currently defined."}</p>
        </div>
      </div>
      {exceptionPath.outcomeRiskLabel ? (
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Outcome risk</p>
          <p className="mt-1 text-sm text-slate-900">{exceptionPath.outcomeRiskLabel}</p>
        </div>
      ) : null}
      <SummarySupportList lines={exceptionPath.supportingLines} tone={exceptionPath.tone} />
    </div>
  );
}

function StageReleaseSummaryCard({
  releaseSummary,
}: {
  releaseSummary: StageDetailModel["releaseSummary"];
}) {
  const toneClass =
    releaseSummary.tone === "success"
      ? "border-teal-200 bg-teal-50"
      : releaseSummary.tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : releaseSummary.tone === "info"
          ? "border-slate-200 bg-slate-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Release position</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{releaseSummary.decisionLabel ?? releaseSummary.releaseState.replaceAll("_", " ")}</p>
          <p className="mt-1 text-sm text-slate-600">{releaseSummary.headline}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {releaseSummary.releaseState.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Eligible now</p>
          <p className="mt-1 text-sm text-slate-900">{releaseSummary.eligibleAmountLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Released</p>
          <p className="mt-1 text-sm text-slate-900">{releaseSummary.releasedAmountLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Still held</p>
          <p className="mt-1 text-sm text-slate-900">{releaseSummary.remainingHeldLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next release step</p>
          <p className="mt-1 text-sm text-slate-900">{releaseSummary.nextReleaseStepLabel ?? "No further release step is currently required."}</p>
        </div>
      </div>
      {releaseSummary.blockingConditionLabel ? (
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Blocking condition</p>
          <p className="mt-1 text-sm text-slate-900">{releaseSummary.blockingConditionLabel}</p>
        </div>
      ) : null}
      {releaseSummary.exceptionInteractionLabel ? (
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Exception interaction</p>
          <p className="mt-1 text-sm text-slate-900">{releaseSummary.exceptionInteractionLabel}</p>
        </div>
      ) : null}
      <SummarySupportList lines={releaseSummary.supportingLines} tone={releaseSummary.tone} />
    </div>
  );
}

function StageEvidenceSummaryCard({
  evidenceSummary,
}: {
  evidenceSummary: StageDetailModel["evidenceSummary"];
}) {
  const toneClass =
    evidenceSummary.tone === "success"
      ? "border-teal-200 bg-teal-50"
      : evidenceSummary.tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : evidenceSummary.tone === "info"
          ? "border-slate-200 bg-slate-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Evidence position</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{evidenceSummary.sufficiencyLabel}</p>
          <p className="mt-1 text-sm text-slate-600">{evidenceSummary.headline}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {evidenceSummary.evidenceState.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Review status</p>
          <p className="mt-1 text-sm text-slate-900">{evidenceSummary.reviewStatusLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Accepted</p>
          <p className="mt-1 text-sm text-slate-900">{evidenceSummary.acceptedCountLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Pending</p>
          <p className="mt-1 text-sm text-slate-900">{evidenceSummary.pendingCountLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Rejected</p>
          <p className="mt-1 text-sm text-slate-900">{evidenceSummary.rejectedCountLabel}</p>
        </div>
      </div>
      {evidenceSummary.blockingConditionLabel ? (
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Blocking evidence condition</p>
          <p className="mt-1 text-sm text-slate-900">{evidenceSummary.blockingConditionLabel}</p>
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next owner</p>
          <p className="mt-1 text-sm text-slate-900">{evidenceSummary.ownerLabel ?? "No active owner"}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next evidence step</p>
          <p className="mt-1 text-sm text-slate-900">{evidenceSummary.nextEvidenceStepLabel ?? "No further evidence step is required."}</p>
        </div>
      </div>
      <SummarySupportList lines={evidenceSummary.supportingLines} tone={evidenceSummary.tone} />
    </div>
  );
}

function StageApprovalSummaryCard({
  approvalSummary,
}: {
  approvalSummary: StageDetailModel["approvalSummary"];
}) {
  const toneClass =
    approvalSummary.tone === "success"
      ? "border-teal-200 bg-teal-50"
      : approvalSummary.tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : approvalSummary.tone === "info"
          ? "border-slate-200 bg-slate-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Approval position</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{approvalSummary.approvalProgressLabel}</p>
          <p className="mt-1 text-sm text-slate-600">{approvalSummary.headline}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {approvalSummary.approvalState.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Active approval</p>
          <p className="mt-1 text-sm text-slate-900">{approvalSummary.activeApprovalLabel ?? "No active approval step"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next approver</p>
          <p className="mt-1 text-sm text-slate-900">{approvalSummary.nextApproverLabel ?? "No next approver queued"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Completed</p>
          <p className="mt-1 text-sm text-slate-900">{approvalSummary.completedApprovals.length > 0 ? approvalSummary.completedApprovals.join(", ") : "None yet"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Pending</p>
          <p className="mt-1 text-sm text-slate-900">{approvalSummary.pendingApprovals.length > 0 ? approvalSummary.pendingApprovals.join(", ") : "No pending approvals"}</p>
        </div>
      </div>
      {approvalSummary.blockingConditionLabel ? (
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Blocking condition</p>
          <p className="mt-1 text-sm text-slate-900">{approvalSummary.blockingConditionLabel}</p>
        </div>
      ) : null}
      <div className="mt-3 rounded-2xl bg-white/80 p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next approval step</p>
        <p className="mt-1 text-sm text-slate-900">{approvalSummary.nextApprovalStepLabel ?? "No further approval step is required."}</p>
      </div>
      <SummarySupportList lines={approvalSummary.supportingLines} tone={approvalSummary.tone} />
    </div>
  );
}

function StageCasePathSummaryCard({
  casePathSummary,
}: {
  casePathSummary: StageDetailModel["casePathSummary"];
}) {
  if (casePathSummary.caseState === "none") {
    return null;
  }

  const toneClass =
    casePathSummary.tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : casePathSummary.tone === "success"
        ? "border-teal-200 bg-teal-50"
        : casePathSummary.tone === "info"
          ? "border-slate-200 bg-slate-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Case path</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{casePathSummary.activePathLabel ?? "Resolved case path"}</p>
          <p className="mt-1 text-sm text-slate-600">{casePathSummary.headline}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {casePathSummary.caseState.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Owner</p>
          <p className="mt-1 text-sm text-slate-900">{casePathSummary.ownerLabel ?? "No active case owner"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Required decision</p>
          <p className="mt-1 text-sm text-slate-900">{casePathSummary.requiredDecisionLabel ?? "No case decision required."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Normal path impact</p>
          <p className="mt-1 text-sm text-slate-900">{casePathSummary.normalPathImpactLabel ?? "Normal progression remains active."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Return to progression</p>
          <p className="mt-1 text-sm text-slate-900">{casePathSummary.returnToProgressionLabel ?? "No return path is currently needed."}</p>
        </div>
      </div>
      {casePathSummary.riskLabel ? (
        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Risk</p>
          <p className="mt-1 text-sm text-slate-900">{casePathSummary.riskLabel}</p>
        </div>
      ) : null}
      <SummarySupportList lines={casePathSummary.supportingLines} tone={casePathSummary.tone} />
    </div>
  );
}

function StageTimelineCard({
  entries,
}: {
  entries: StageDetailModel["timelineEntries"];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Audit support</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Recent stage changes</p>
        </div>
        <p className="text-xs text-slate-500">Most recent first</p>
      </div>
      <div className="mt-3 grid gap-3">
        {entries.map((entry) => {
          const toneClass =
            entry.tone === "success"
              ? "border-teal-200 bg-teal-50"
              : entry.tone === "warning"
                ? "border-amber-200 bg-amber-50"
                : entry.tone === "info"
                  ? "border-slate-200 bg-slate-100"
                  : "border-slate-200 bg-white";

          return (
            <article key={entry.id} className={`rounded-2xl border p-3 ${toneClass}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{entry.headline}</p>
                  {entry.detail ? <p className="mt-1 text-sm text-slate-600">{entry.detail}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em]">
                  <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700">{entry.changeType}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700">{entry.effect.replaceAll("_", " ")}</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>{entry.actorLabel ?? "System"}</span>
                <span>{entry.timestampLabel}</span>
              </div>
            </article>
          );
        })}
        {entries.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No governed stage changes recorded yet.</p> : null}
      </div>
    </div>
  );
}

function CompactSignalCard({
  label,
  title,
  detail,
  tone = "neutral",
}: {
  label: string;
  title: string;
  detail?: string | null;
  tone?: "success" | "info" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "border-teal-200 bg-teal-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "info"
          ? "border-slate-200 bg-slate-100"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{title}</p>
      {detail ? <p className="mt-1 text-xs text-slate-600">{detail}</p> : null}
    </div>
  );
}

function ActionControlCard({
  descriptor,
  owner,
  disabled,
  formRequirementLabel,
  onClick,
}: {
  descriptor: DerivedActionDescriptor;
  owner?: string;
  disabled: boolean;
  formRequirementLabel?: string;
  onClick: () => void;
}) {
  const effectiveConfidence =
    disabled && descriptor.confidence !== "blocked" ? "blocked" : descriptor.confidence;
  const toneClass =
    effectiveConfidence === "high" && descriptor.isPrimary
      ? "border-slate-900/10 bg-slate-50"
      : effectiveConfidence === "blocked"
        ? "border-slate-200 bg-slate-50/80"
        : "border-slate-200 bg-white";
  const badgeClass =
    effectiveConfidence === "high" && descriptor.isPrimary
      ? "bg-slate-900 text-white"
      : effectiveConfidence === "medium"
        ? "bg-slate-100 text-slate-700"
        : "bg-slate-50 text-slate-500";
  const buttonClass =
    effectiveConfidence === "high" && descriptor.isPrimary
      ? disabled
        ? "min-h-12 rounded-2xl bg-slate-300 px-4 py-3 text-left text-sm font-medium text-white"
        : "min-h-12 rounded-2xl bg-slate-900 px-4 py-3 text-left text-sm font-medium text-white"
      : effectiveConfidence === "medium"
        ? disabled
          ? "min-h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-400"
          : "min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900"
        : "min-h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-400";
  const priorityLabel =
    effectiveConfidence === "high" && descriptor.isPrimary
      ? "Primary action"
      : effectiveConfidence === "blocked"
        ? "Blocked"
        : "Secondary action";
  const reason = formRequirementLabel ?? descriptor.blockerSummary;

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeClass}`}>
          {priorityLabel}
        </p>
        {owner ? <p className="text-xs text-slate-500">Owned by {owner}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`mt-3 w-full disabled:cursor-not-allowed ${buttonClass}`}
      >
        <span className="block">{descriptor.label}</span>
        <span className={`mt-1 block text-xs ${effectiveConfidence === "high" && descriptor.isPrimary ? "text-slate-200" : "text-inherit opacity-80"}`}>
          {descriptor.stateTransitionPreview.fromState} → {descriptor.stateTransitionPreview.toState}
        </span>
      </button>
      {descriptor.sideEffects?.[0] ? <p className="mt-2 text-xs text-slate-500">{descriptor.sideEffects[0]}</p> : null}
      {reason ? (
        <p className="mt-2 text-sm text-slate-600">
          {effectiveConfidence === "blocked" ? `Blocked: ${reason}` : reason}
        </p>
      ) : null}
    </div>
  );
}

type StageDetailPanelProps = {
  detail: StageDetailModel;
  focusedSection: "overview" | "funding" | "approvals" | "evidence" | "dispute" | "variation" | "release";
  entryCue: WorkspaceDecisionCue;
  actionFeedback: {
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
  entryCue,
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
  const canFundStage = detail.actionReadiness.fundStage.isAvailable && detail.funding.gapToRequiredCover > 0;
  const canReleaseStage = detail.actionReadiness.release.isAvailable && detail.releaseDecision.releasable;
  const canApplyOverride = detail.actionReadiness.applyOverride.isAvailable && overrideReason.trim().length > 0;
  const canOpenDispute = detail.actionReadiness.openDispute.isAvailable &&
    disputeTitle.trim().length > 0 &&
    disputeReason.trim().length > 0 &&
    Number.isFinite(parsedDisputeAmount) &&
    parsedDisputeAmount > 0;
  const canCreateVariation = detail.actionReadiness.createVariation.isAvailable &&
    variationTitle.trim().length > 0 &&
    variationReason.trim().length > 0 &&
    Number.isFinite(parsedVariationAmount) &&
    parsedVariationAmount !== 0;
  const showAttentionSummary =
    detail.attentionReason.requiresMyAction || detail.attentionReason.tone === "warning" || focusedSection === "overview";
  const showFundingSummary =
    detail.fundingExplanation.tone === "warning" || Boolean(detail.fundingExplanation.blockingConditionLabel) || focusedSection === "funding";
  const showEvidenceSummary =
    detail.evidenceSummary.tone !== "success" || Boolean(detail.evidenceSummary.blockingConditionLabel) || focusedSection === "evidence";
  const showApprovalSummary =
    detail.approvalSummary.tone !== "success" || Boolean(detail.approvalSummary.blockingConditionLabel) || focusedSection === "approvals";
  const topSurface = detail.topSurfaceGuidance;
  const visibleSignals: Record<StageTopSignalKey, boolean> = {
    decision: true,
    outcome: detail.exitState.isClosedOrComplete,
    release: true,
    exception: detail.exceptionPath.hasActiveExceptionPath,
    handoff: detail.roleHandoff.isWaitingOnAnotherRole,
    funding: showFundingSummary,
    evidence: showEvidenceSummary,
    approval: showApprovalSummary,
    case_path: detail.casePathSummary.caseState !== "none",
    attention: showAttentionSummary,
    timeline: detail.timelineEntries.length > 0,
  };
  const uniqueVisibleSignals = (signals: StageTopSignalKey[]) =>
    signals.filter((signal, index) => visibleSignals[signal] && signals.indexOf(signal) === index);
  const primarySignals = uniqueVisibleSignals(topSurface.primarySignalKeys);
  const secondarySignals = uniqueVisibleSignals(
    topSurface.secondarySignalKeys.filter((signal) => !primarySignals.includes(signal)),
  );
  const contextualSignals = uniqueVisibleSignals(
    topSurface.supportSignalKeys.filter(
      (signal) => !primarySignals.includes(signal) && !secondarySignals.includes(signal),
    ),
  );
  const getDescriptor = (actionId: string) => detail.actionDescriptorMap[actionId];
  const fundDescriptor = getDescriptor("fund-stage");
  const releaseDescriptor = getDescriptor("release");
  const overrideDescriptor = getDescriptor("apply-override");
  const openDisputeDescriptor = getDescriptor("open-dispute");
  const resolveDisputeDescriptor = getDescriptor("resolve-dispute");
  const createVariationDescriptor = getDescriptor("create-variation");
  const reviewVariationApproveDescriptor = getDescriptor("review-variation-approve");
  const reviewVariationRejectDescriptor = getDescriptor("review-variation-reject");
  const activateVariationDescriptor = getDescriptor("activate-variation");
  const entryCueTone =
    entryCue.decisionUrgency === "immediate"
      ? "bg-red-50 text-red-700"
      : entryCue.decisionUrgency === "active"
        ? "bg-amber-50 text-amber-700"
        : entryCue.decisionUrgency === "outcome"
          ? "bg-slate-100 text-slate-700"
          : "bg-blue-50 text-blue-700";

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

  function renderSectionFeedback(section: typeof focusedSection) {
    if (!actionFeedback || actionFeedback.section !== section) {
      return null;
    }

    return <SectionOutcomeNotice feedback={actionFeedback} />;
  }

  function renderTopSignalCard(signal: StageTopSignalKey) {
    switch (signal) {
      case "decision":
        return <StageDecisionSummaryCard summary={detail.decisionSummary} />;
      case "outcome":
        return <StageExitStateCard exitState={detail.exitState} />;
      case "release":
        return <StageReleaseSummaryCard releaseSummary={detail.releaseSummary} />;
      case "exception":
        return <StageExceptionPathCard exceptionPath={detail.exceptionPath} />;
      case "handoff":
        return <StageRoleHandoffCard handoff={detail.roleHandoff} />;
      case "funding":
        return showFundingSummary ? <StageFundingExplanationCard explanation={detail.fundingExplanation} /> : null;
      case "evidence":
        return showEvidenceSummary ? <StageEvidenceSummaryCard evidenceSummary={detail.evidenceSummary} /> : null;
      case "approval":
        return showApprovalSummary ? <StageApprovalSummaryCard approvalSummary={detail.approvalSummary} /> : null;
      case "case_path":
        return detail.casePathSummary.caseState !== "none" ? <StageCasePathSummaryCard casePathSummary={detail.casePathSummary} /> : null;
      case "attention":
        return showAttentionSummary ? <StageAttentionReasonCard reason={detail.attentionReason} /> : null;
      case "timeline":
        return <StageTimelineCard entries={detail.timelineEntries} />;
      default:
        return null;
    }
  }

  function renderCompactSignal(signal: StageTopSignalKey) {
    switch (signal) {
      case "funding":
        return (
          <CompactSignalCard
            label="Funding"
            title={detail.fundingExplanation.coverageLabel}
            detail={detail.fundingExplanation.blockingConditionLabel ?? detail.fundingExplanation.nextFinancialStepLabel ?? detail.fundingExplanation.headline}
            tone={detail.fundingExplanation.tone}
          />
        );
      case "evidence":
        return (
          <CompactSignalCard
            label="Evidence"
            title={detail.evidenceSummary.sufficiencyLabel}
            detail={detail.evidenceSummary.blockingConditionLabel ?? detail.evidenceSummary.nextEvidenceStepLabel ?? detail.evidenceSummary.reviewStatusLabel}
            tone={detail.evidenceSummary.tone}
          />
        );
      case "approval":
        return (
          <CompactSignalCard
            label="Approval"
            title={detail.approvalSummary.approvalProgressLabel}
            detail={detail.approvalSummary.blockingConditionLabel ?? detail.approvalSummary.nextApprovalStepLabel ?? detail.approvalSummary.activeApprovalLabel}
            tone={detail.approvalSummary.tone}
          />
        );
      case "attention":
        return (
          <CompactSignalCard
            label="Attention"
            title={detail.attentionReason.reasonLabel}
            detail={detail.attentionReason.supportingDetails[0] ?? null}
            tone={detail.attentionReason.tone}
          />
        );
      case "case_path":
        return (
          <CompactSignalCard
            label="Case path"
            title={detail.casePathSummary.activePathLabel ?? detail.casePathSummary.headline}
            detail={detail.casePathSummary.requiredDecisionLabel ?? detail.casePathSummary.returnToProgressionLabel}
            tone={detail.casePathSummary.tone}
          />
        );
      case "handoff":
        return (
          <CompactSignalCard
            label="Handoff"
            title={detail.roleHandoff.handoffHeadline}
            detail={detail.roleHandoff.expectedActionLabel ?? detail.roleHandoff.blockingConditionLabel}
            tone={detail.roleHandoff.tone}
          />
        );
      case "exception":
        return (
          <CompactSignalCard
            label="Exception"
            title={detail.exceptionPath.headline}
            detail={detail.exceptionPath.requiredDecisionLabel ?? detail.exceptionPath.returnPathLabel}
            tone={detail.exceptionPath.tone}
          />
        );
      case "outcome":
        return (
          <CompactSignalCard
            label="Outcome"
            title={detail.exitState.outcomeLabel}
            detail={detail.exitState.valueOutcomeLabel ?? detail.exitState.reopenPathLabel}
            tone={detail.exitState.tone}
          />
        );
      case "release":
        return (
          <CompactSignalCard
            label="Release"
            title={detail.releaseSummary.decisionLabel ?? detail.releaseSummary.headline}
            detail={detail.releaseSummary.blockingConditionLabel ?? detail.releaseSummary.nextReleaseStepLabel ?? detail.releaseSummary.eligibleAmountLabel}
            tone={detail.releaseSummary.tone}
          />
        );
      case "decision":
        return (
          <CompactSignalCard
            label="Decision"
            title={detail.decisionSummary.statusLabel}
            detail={detail.decisionSummary.primaryDecisionLabel ?? detail.decisionSummary.actionabilityLabel}
            tone={detail.decisionSummary.tone}
          />
        );
      case "timeline":
        return <StageTimelineCard entries={detail.timelineEntries} />;
      default:
        return null;
    }
  }

  return (
    <section ref={overviewRef} className={`rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] ${getSectionClass("overview")}`}>
      <div className={`mb-6 ${stageSurfaceHierarchy.primary}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{topSurface.primaryMode} surface</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{topSurface.topHeadlineLabel ?? "Work Package Detail"}</h2>
            <p className="mt-1 text-sm text-slate-600">{topSurface.topSublineLabel ?? `${detail.projectName} · ${detail.stage.name}`}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{detail.actingRole.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{detail.roleViewGuidance.primaryWorkspaceLabel}</span>
            {entryCue.entryOrientationLabel ? (
              <span className={`rounded-full px-2 py-1 font-semibold ${entryCueTone}`}>{entryCue.entryOrientationLabel}</span>
            ) : null}
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
          </div>
        </div>

        <StageHealthStrip health={detail.healthDescriptor} />

        {actionFeedback && actionFeedback.section === "overview" ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 ${
              actionFeedback.resultTone === "success"
                ? "border-teal-200 bg-teal-50"
                : actionFeedback.resultTone === "warning"
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Recent action result</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{actionFeedback.resultHeadline}</p>
            {actionFeedback.resultSubline ? <p className="mt-1 text-xs text-slate-600">{actionFeedback.resultSubline}</p> : null}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-3">
            {primarySignals.map((signal) => (
              <div key={`primary-signal-${signal}`}>{renderTopSignalCard(signal)}</div>
            ))}
          </div>
          <div className="grid gap-3 content-start">
            {secondarySignals.map((signal) => (
              <div key={`secondary-signal-${signal}`}>
                {topSurface.shouldCompactSecondarySignals ? renderCompactSignal(signal) : renderTopSignalCard(signal)}
              </div>
            ))}
          </div>
        </div>

        {contextualSignals.length > 0 ? (
          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="grid gap-3">
              {contextualSignals.map((signal) => (
                <div key={`contextual-signal-${signal}`}>{renderCompactSignal(signal)}</div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${stageSurfaceHierarchy.secondaryBand}`}>
        <div className={stageSurfaceHierarchy.secondaryCard}>
          <p className="text-sm text-slate-500">WIP</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(stageWipTotal)}</p>
        </div>
        <div className={stageSurfaceHierarchy.secondaryCard}>
          <p className="text-sm text-slate-500">Releasable</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.releaseDecision.releasableAmount)}</p>
        </div>
        <div className={stageSurfaceHierarchy.secondaryCard}>
          <p className="text-sm text-slate-500">Frozen</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.disputeSummary.frozenValue)}</p>
        </div>
        <div className={stageSurfaceHierarchy.secondaryCard}>
          <p className="text-sm text-slate-500">Workflow</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{detail.operationalStatus.label}</p>
          <p className="mt-1 text-xs text-slate-500">{detail.operationalStatus.reason}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className={stageSurfaceHierarchy.mutedBlock}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next governed move</p>
          <p className="mt-2 text-sm font-medium text-slate-950">{detail.operationalStatus.nextStep}</p>
        </div>
        <div className={stageSurfaceHierarchy.mutedBlock}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Release position</p>
          <p className="mt-2 text-sm font-medium text-slate-950">{detail.releaseSummary.decisionLabel ?? detail.releaseDecision.explanation.label}</p>
          <p className="mt-1 text-xs text-slate-500">{detail.releaseSummary.eligibleAmountLabel} · {detail.releaseSummary.remainingHeldLabel}</p>
        </div>
      </div>

      <div ref={fundingRef} className={`mt-8 ${stageSurfaceHierarchy.tertiaryPanel} ${getSectionClass("funding")}`}>
        <SectionActionHeader title="Funding" guidance={detail.sectionGuidance.funding} />
        {renderSectionFeedback("funding")}
      </div>

      <div className={`mt-6 ${stageSurfaceHierarchy.mutedBlock}`}>
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mini Decision Pack</p>
          <p className="text-sm font-medium text-slate-900">Stage report card</p>
          <p className="text-sm text-slate-600">Compact operational and treasury summary for this work package.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-xs text-slate-500">Status</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.status}</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-xs text-slate-500">Treasury readiness</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.treasuryReadiness}</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-xs text-slate-500">Release status</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.releaseStatus}</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-xs text-slate-500">Next owner</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.nextActionOwner}</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-xs text-slate-500">Releasable</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{currency.format(decisionPack.releasable)}</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-xs text-slate-500">Frozen</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{currency.format(decisionPack.frozen)}</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-xs text-slate-500">In progress</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{currency.format(decisionPack.inProgress)}</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-xs text-slate-500">Principal blocker</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.principalBlocker}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-xs text-slate-500">Decision basis</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.decisionBasis}</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-xs text-slate-500">Latest activity</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.latestActivity}</p>
          </div>
        </div>
      </div>

      <div className={`mt-6 ${stageSurfaceHierarchy.tertiaryPanel}`}>
        <SectionActionHeader title="Funding Position" guidance={detail.sectionGuidance.funding} />
        <h3 className="text-sm font-medium text-slate-900">Funding</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-sm text-slate-500">WIP</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(stageWipTotal)}</p>
            <p className="mt-1 text-xs text-slate-500">Committed work still sitting in this Work Package.</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-sm text-slate-500">Releasable</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.releaseDecision.releasableAmount)}</p>
            <p className="mt-1 text-xs text-slate-500">Approved value within WIP.</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-sm text-slate-500">Frozen</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.disputeSummary.frozenValue)}</p>
            <p className="mt-1 text-xs text-slate-500">Disputed value within WIP.</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-sm text-slate-500">In progress</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.releaseDecision.blockedAmount)}</p>
            <p className="mt-1 text-xs text-slate-500">Committed work not yet approved for release.</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
            <p className="text-sm text-slate-500">Balance position</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{detail.fundingStatusLabel}</p>
            <p className="mt-1 text-xs text-slate-500">Based on total project balance against current WIP.</p>
          </div>
          <div className={stageSurfaceHierarchy.secondaryCard}>
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
          <div className={stageSurfaceHierarchy.mutedPanel}>
            <p className="text-sm font-medium text-slate-900">Dispute Position</p>
            <p className="mt-2 text-sm text-slate-600">{detail.disputeSummary.reason}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>Disputed value: {currency.format(detail.disputeSummary.disputedValue)}</p>
              <p>Frozen value: {currency.format(detail.disputeSummary.frozenValue)}</p>
              <p>Undisputed value: {currency.format(detail.disputeSummary.undisputedValue)}</p>
              <p>Releasable value: {currency.format(detail.disputeSummary.releasableValue)}</p>
            </div>
          </div>
          <div className={stageSurfaceHierarchy.mutedPanel}>
            <p className="text-sm font-medium text-slate-900">Variation Position</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{detail.variationSummary.status}</p>
            <p className="mt-1 text-sm text-slate-600">{detail.variationSummary.reason}</p>
          </div>
        </div>

        {!detail.actingRole.readOnly ? (
          <div className="mt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Funding control</p>
            {fundDescriptor ? (
              <ActionControlCard
                descriptor={fundDescriptor}
                owner="Treasury"
                disabled={!canFundStage}
                onClick={onFundStage}
              />
            ) : null}
          </div>
        ) : null}

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

      {contextualSignals.map((signal) => (
        <div key={`contextual-signal-${signal}`} className="mt-4">
          {renderTopSignalCard(signal)}
        </div>
      ))}

      <div ref={releaseRef} className={`mt-8 ${stageSurfaceHierarchy.tertiaryPanel} ${getSectionClass("release")}`}>
        <SectionActionHeader title="Release" guidance={detail.sectionGuidance.release} />
        {renderSectionFeedback("release")}
        <p className="text-sm font-medium text-slate-900">Drawdown decision</p>
        <div className="mt-2 grid gap-2">
          <p className="text-sm text-slate-600">{detail.releaseSummary.headline}</p>
          <p className="text-sm text-slate-600">
            {detail.releaseSummary.eligibleAmountLabel}. {detail.releaseSummary.releasedAmountLabel}. {detail.releaseSummary.remainingHeldLabel}.
          </p>
          <p className="text-sm text-slate-600">Decision basis: {detail.releaseDecision.explanation.decisionBasis}</p>
          {detail.releaseSummary.blockingConditionLabel ? (
            <p className="text-sm text-slate-600">Blocking condition: {detail.releaseSummary.blockingConditionLabel}</p>
          ) : null}
          {detail.releaseSummary.exceptionInteractionLabel ? (
            <p className="text-sm text-slate-600">Exception interaction: {detail.releaseSummary.exceptionInteractionLabel}</p>
          ) : null}
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
            {releaseDescriptor ? (
              <ActionControlCard
                descriptor={releaseDescriptor}
                owner="Treasury"
                disabled={!canReleaseStage}
                onClick={onRelease}
              />
            ) : null}
            {overrideDescriptor ? (
              <ActionControlCard
                descriptor={overrideDescriptor}
                owner="Treasury"
                disabled={!canApplyOverride}
                formRequirementLabel={
                  detail.actionReadiness.applyOverride.isAvailable && overrideReason.trim().length === 0
                    ? "Enter an override reason."
                    : undefined
                }
                onClick={onApplyOverride}
              />
            ) : null}
          </div>
        ) : (
          <div className="sm:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {detail.actingRole.label} view is read-only. Treasury and control actions remain visible through the decision and audit summaries only.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-teal-200 bg-teal-50/80 p-4">
        <p className="text-sm font-medium text-teal-950">Treasury Override</p>
        <p className="mt-1 text-xs text-teal-900">Funding source in view: {fundingSource || "not selected"}</p>
        <textarea
          className="mt-3 min-h-24 w-full rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm"
          placeholder="Override reason"
          value={overrideReason}
          disabled={!detail.availableActions.applyOverride}
          onChange={(event) => onOverrideReasonChange(event.target.value)}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div ref={evidenceRef} className={getSectionClass("evidence")}>
          <SectionActionHeader title="Evidence" guidance={detail.sectionGuidance.evidence} />
          {renderSectionFeedback("evidence")}
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
          {renderSectionFeedback("approvals")}
          <ApprovalPanel detail={detail} onApprove={onApprove} onReject={onReject} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section ref={disputeRef} className={`${stageSurfaceHierarchy.tertiaryPanel} ${getSectionClass("dispute")}`}>
          <SectionActionHeader title="Dispute" guidance={detail.sectionGuidance.dispute} />
          {renderSectionFeedback("dispute")}
          <div>
            <h3 className="text-sm font-medium text-slate-900">Disputes</h3>
            <p className="mt-1 text-sm text-slate-500">
              {detail.casePathSummary.activePathLabel === "Dispute path"
                ? detail.casePathSummary.headline
                : "Freeze only the affected value while undisputed value can continue through control checks."}
            </p>
            {detail.casePathSummary.activePathLabel === "Dispute path" ? (
              <p className="mt-2 text-sm text-slate-600">{detail.casePathSummary.returnToProgressionLabel}</p>
            ) : null}
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
              {openDisputeDescriptor ? (
                <ActionControlCard
                  descriptor={openDisputeDescriptor}
                  owner={detail.sectionGuidance.dispute.ownerLabel}
                  disabled={!canOpenDispute}
                  formRequirementLabel={
                    detail.actionReadiness.openDispute.isAvailable &&
                    (!disputeTitle.trim().length ||
                      !disputeReason.trim().length ||
                      !Number.isFinite(parsedDisputeAmount) ||
                      parsedDisputeAmount <= 0)
                      ? "Enter dispute title, reason, and frozen value."
                      : undefined
                  }
                  onClick={onOpenDispute}
                />
              ) : null}
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
                      {dispute.resolveAction ? (
                        <ActionControlCard
                          descriptor={dispute.resolveAction}
                          owner="Commercial"
                          disabled={!dispute.canResolve}
                          onClick={() => onResolveDispute(dispute.id)}
                        />
                      ) : null}
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

        <section ref={variationRef} className={`${stageSurfaceHierarchy.tertiaryPanel} ${getSectionClass("variation")}`}>
          <SectionActionHeader title="Variation" guidance={detail.sectionGuidance.variation} />
          {renderSectionFeedback("variation")}
          <div>
            <h3 className="text-sm font-medium text-slate-900">Variations</h3>
            <p className="mt-1 text-sm text-slate-500">
              {detail.casePathSummary.activePathLabel === "Variation path"
                ? detail.casePathSummary.headline
                : "Variations must be reviewed and funding-confirmed before activation."}
            </p>
            {detail.casePathSummary.activePathLabel === "Variation path" ? (
              <p className="mt-2 text-sm text-slate-600">{detail.casePathSummary.returnToProgressionLabel}</p>
            ) : null}
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
              {createVariationDescriptor ? (
                <ActionControlCard
                  descriptor={createVariationDescriptor}
                  owner={detail.sectionGuidance.variation.ownerLabel}
                  disabled={!canCreateVariation}
                  formRequirementLabel={
                    detail.actionReadiness.createVariation.isAvailable &&
                    (!variationTitle.trim().length ||
                      !variationReason.trim().length ||
                      !Number.isFinite(parsedVariationAmount) ||
                      parsedVariationAmount === 0)
                      ? "Enter variation title, reason, and delta."
                      : undefined
                  }
                  onClick={onCreateVariation}
                />
              ) : null}
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
                          <button
                            type="button"
                            onClick={() => onApproveVariation(variation.id)}
                            disabled={!variation.canApprove}
                            className={`disabled:cursor-not-allowed min-h-12 rounded-2xl px-4 py-3 text-left text-sm font-medium ${
                              variation.approveAction.isPrimary && variation.approveAction.confidence === "high"
                                ? variation.canApprove
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-300 text-white"
                                : variation.canApprove
                                  ? "border border-slate-300 bg-white text-slate-900"
                                  : "border border-slate-200 bg-slate-100 text-slate-400"
                            }`}
                          >
                            <span className="block">{variation.approveAction.label}</span>
                            <span className="mt-1 block text-xs opacity-80">{variation.approveAction.outcomeLabel}</span>
                          </button>
                          <p className="text-xs text-slate-500">
                            {variation.canApprove
                              ? variation.approveAction.impactSummary ?? variation.approveAction.outcomeLabel
                              : variation.approveAction.blockerSummary}
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <button
                            type="button"
                            onClick={() => onRejectVariation(variation.id)}
                            disabled={!variation.canReject}
                            className={`disabled:cursor-not-allowed min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
                              variation.canReject
                                ? "border-slate-300 bg-white text-slate-900"
                                : "border-slate-200 bg-slate-100 text-slate-400"
                            }`}
                          >
                            <span className="block">{variation.rejectAction.label}</span>
                            <span className="mt-1 block text-xs opacity-80">{variation.rejectAction.outcomeLabel}</span>
                          </button>
                          <p className="text-xs text-slate-500">
                            {variation.canReject
                              ? variation.rejectAction.outcomeLabel
                              : variation.rejectAction.blockerSummary}
                          </p>
                        </div>
                      </>
                    ) : null}
                    {variation.status === "approved" ? (
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => onActivateVariation(variation.id)}
                          disabled={!variation.canActivate}
                          className={`disabled:cursor-not-allowed min-h-12 rounded-2xl px-4 py-3 text-left text-sm font-medium ${
                            variation.activateAction.isPrimary && variation.activateAction.confidence === "high"
                              ? variation.canActivate
                                ? "bg-slate-900 text-white"
                                : "bg-slate-300 text-white"
                              : variation.canActivate
                                ? "border border-slate-300 bg-white text-slate-900"
                                : "border border-slate-200 bg-slate-100 text-slate-400"
                          }`}
                        >
                          <span className="block">{variation.activateAction.label}</span>
                          <span className="mt-1 block text-xs opacity-80">{variation.activateAction.outcomeLabel}</span>
                        </button>
                        <p className="text-xs text-slate-500">
                          {variation.canActivate
                            ? variation.activateAction.impactSummary ?? variation.activateAction.outcomeLabel
                            : variation.activateAction.blockerSummary}
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

      <div className="mt-8">
        <h3 className="text-sm font-medium text-slate-900">Blockers</h3>
        <div className="mt-3 grid gap-3">
          {detail.blockers.map((blocker) => (
            <article key={blocker.code} className={stageSurfaceHierarchy.mutedBlock}>
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
