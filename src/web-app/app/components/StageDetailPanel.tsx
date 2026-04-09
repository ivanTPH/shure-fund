"use client";

import { useEffect, useRef, useState } from "react";

import type { ApprovalRole, EvidenceStatus, EvidenceType, FundingSourceType } from "@/lib/shureFundModels";
import {
  type DerivedActionDescriptor,
  type LastActionOutcome,
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

function InlineActionConfirmation({
  outcome,
  stateNowLabel,
  stateNowReason,
}: {
  outcome: LastActionOutcome;
  stateNowLabel: string;
  stateNowReason: string;
}) {
  const containerClass =
    outcome.result === "released" || outcome.result === "advanced"
      ? "border-teal-200 bg-teal-50/85"
      : outcome.result === "exception" || outcome.result === "blocked"
        ? "border-amber-200 bg-amber-50/85"
        : "border-slate-200 bg-slate-50/90";
  const badgeClass =
    outcome.result === "released" || outcome.result === "advanced"
      ? "bg-teal-950 text-white"
      : outcome.result === "exception" || outcome.result === "blocked"
        ? "bg-amber-100 text-amber-950"
        : "bg-slate-200 text-slate-800";
  const badgeLabel =
    outcome.result === "released"
      ? "Payment sent"
      : outcome.result === "advanced"
        ? "Project stage updated"
        : outcome.result === "exception"
          ? "Under review"
          : outcome.result === "waiting"
            ? "Waiting on next role"
            : "Action blocked";
  const areaLabels = outcome.affectedAreas
    .map((area) =>
      area === "stage_state"
        ? "Stage state"
        : area === "funding"
          ? "Amount status"
          : area === "approvals"
            ? "Sign-offs"
            : "Supporting information",
    )
    .slice(0, 3);

  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)] ${containerClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Recent action result</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{outcome.summary}</p>
          <p className="mt-1 text-xs text-slate-600">
            {stateNowLabel} · {stateNowReason}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>
      {areaLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
          {areaLabels.map((label) => (
            <span key={label} className="rounded-full bg-white/90 px-2 py-1">
              Updated: {label}
            </span>
          ))}
        </div>
      ) : null}
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payment summary</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{summary.statusLabel}</p>
          <p className="mt-1 text-sm text-slate-600">{summary.actionabilityLabel}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {summary.releaseReadinessLabel}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next payment decision</p>
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Holding payment up</p>
          <div className="mt-1 grid gap-1">
            {summary.blockerSummary.length > 0 ? (
              summary.blockerSummary.map((blocker, index) => (
                <p key={`summary-blocker-${index}`} className="text-sm text-slate-900">{blocker}</p>
              ))
            ) : (
              <p className="text-sm text-slate-900">No active blocker is holding this project stage.</p>
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
      ? "Payment blocked"
      : health.overallStatus === "at_risk"
        ? "At risk"
        : "Ready";

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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Why this project stage needs attention</p>
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payment position</p>
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
          <p className="mt-1 text-sm text-slate-900">{handoff.unlockOutcomeLabel ?? "This moves the project stage to the next payment step."}</p>
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Under review</p>
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
          <p className="mt-1 text-sm text-slate-900">{exceptionPath.requiredDecisionLabel ?? "Review what is holding payment up."}</p>
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payment position</p>
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Paid</p>
          <p className="mt-1 text-sm text-slate-900">{releaseSummary.releasedAmountLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Still held</p>
          <p className="mt-1 text-sm text-slate-900">{releaseSummary.remainingHeldLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next payment step</p>
          <p className="mt-1 text-sm text-slate-900">{releaseSummary.nextReleaseStepLabel ?? "No further payment step is currently required."}</p>
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Under review</p>
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Supporting information</p>
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">What is holding payment up</p>
          <p className="mt-1 text-sm text-slate-900">{evidenceSummary.blockingConditionLabel}</p>
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next owner</p>
          <p className="mt-1 text-sm text-slate-900">{evidenceSummary.ownerLabel ?? "No active owner"}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next supporting information step</p>
          <p className="mt-1 text-sm text-slate-900">{evidenceSummary.nextEvidenceStepLabel ?? "No further supporting information step is required."}</p>
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Sign-off status</p>
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Review path</p>
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
          <p className="mt-1 text-sm text-slate-900">{casePathSummary.requiredDecisionLabel ?? "No review decision required."}</p>
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
          <p className="mt-1 text-sm font-semibold text-slate-900">Recent project stage changes</p>
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
        {entries.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No governed project stage changes recorded yet.</p> : null}
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
        ? "Not available"
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
          {effectiveConfidence === "blocked" ? `Not available: ${reason}` : reason}
        </p>
      ) : null}
    </div>
  );
}

function SupportingDetailsDisclosure({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="rounded-[24px] border border-slate-200 bg-white/90 p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{summary}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
            Supporting detail
          </span>
        </div>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

type StageDetailPanelProps = {
  detail: StageDetailModel;
  focusedSection: "overview" | "funding" | "approvals" | "evidence" | "dispute" | "variation" | "release";
  entryCue: WorkspaceDecisionCue;
  lastActionOutcome: LastActionOutcome | null;
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
  approvalRejectReasons: Record<string, string>;
  evidenceReviewReasons: Record<string, string>;
  variationRejectReasons: Record<string, string>;
  onOverrideReasonChange: (value: string) => void;
  onEvidenceTitleChange: (value: string) => void;
  onEvidenceTypeChange: (value: EvidenceType) => void;
  onDisputeTitleChange: (value: string) => void;
  onDisputeReasonChange: (value: string) => void;
  onDisputeAmountChange: (value: string) => void;
  onVariationTitleChange: (value: string) => void;
  onVariationReasonChange: (value: string) => void;
  onVariationAmountChange: (value: string) => void;
  onApprovalRejectReasonChange: (role: ApprovalRole, value: string) => void;
  onEvidenceReviewReasonChange: (evidenceId: string, value: string) => void;
  onVariationRejectReasonChange: (variationId: string, value: string) => void;
  onAddEvidence: () => void;
  onUpdateEvidenceStatus: (requirementId: string, status: EvidenceStatus, reason?: string) => void;
  onApprove: (role: ApprovalRole) => void;
  onReject: (role: ApprovalRole, reason: string) => void;
  onFundStage: () => void;
  onApplyOverride: () => void;
  onRelease: () => void;
  onOpenDispute: () => void;
  onResolveDispute: (disputeId: string) => void;
  onCreateVariation: () => void;
  onApproveVariation: (variationId: string) => void;
  onRejectVariation: (variationId: string, reason: string) => void;
  onActivateVariation: (variationId: string) => void;
};

export default function StageDetailPanel({
  detail,
  focusedSection,
  entryCue,
  lastActionOutcome,
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
  approvalRejectReasons,
  evidenceReviewReasons,
  variationRejectReasons,
  onOverrideReasonChange,
  onEvidenceTitleChange,
  onEvidenceTypeChange,
  onDisputeTitleChange,
  onDisputeReasonChange,
  onDisputeAmountChange,
  onVariationTitleChange,
  onVariationReasonChange,
  onVariationAmountChange,
  onApprovalRejectReasonChange,
  onEvidenceReviewReasonChange,
  onVariationRejectReasonChange,
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
  const overviewRef = useRef<HTMLElement | null>(null);
  const fundingRef = useRef<HTMLDivElement | null>(null);
  const releaseRef = useRef<HTMLDivElement | null>(null);
  const evidenceRef = useRef<HTMLDivElement | null>(null);
  const approvalsRef = useRef<HTMLDivElement | null>(null);
  const disputeRef = useRef<HTMLDivElement | null>(null);
  const variationRef = useRef<HTMLDivElement | null>(null);
  const [visibleOutcomeTimestamp, setVisibleOutcomeTimestamp] = useState<number | null>(null);
  const [highlightTimestamp, setHighlightTimestamp] = useState<number | null>(null);
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
  const topModeLabel =
    topSurface.primaryMode === "action"
      ? "Action now"
      : topSurface.primaryMode === "review"
        ? "Review now"
        : topSurface.primaryMode === "waiting"
          ? "Waiting"
          : topSurface.primaryMode === "exception"
            ? "Under review"
            : topSurface.primaryMode === "outcome"
              ? "Current outcome"
              : "Overview";
  const focusedGuidance = detail.sectionGuidance[focusedSection];
  const focusLabel =
    focusedSection === "funding"
      ? "Funding status"
      : focusedSection === "release"
        ? "Payment"
        : focusedSection === "evidence"
          ? "Supporting information"
          : focusedSection === "approvals"
            ? "Approval path"
            : focusedSection === "dispute"
              ? "Dispute"
              : focusedSection === "variation"
                ? "Variation"
                : "Stage overview";
  const shouldOpenSupport = (...sections: typeof focusedSection[]) => sections.includes(focusedSection);

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

  useEffect(() => {
    if (!lastActionOutcome) {
      return;
    }

    setVisibleOutcomeTimestamp(lastActionOutcome.timestamp);
    setHighlightTimestamp(lastActionOutcome.timestamp);

    const dismissTimer = window.setTimeout(() => {
      setVisibleOutcomeTimestamp((current) => (current === lastActionOutcome.timestamp ? null : current));
    }, 5000);
    const highlightTimer = window.setTimeout(() => {
      setHighlightTimestamp((current) => (current === lastActionOutcome.timestamp ? null : current));
    }, 1600);

    return () => {
      window.clearTimeout(dismissTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [lastActionOutcome]);

  function getSectionClass(section: typeof focusedSection) {
    return focusedSection === section
      ? "scroll-mt-28 rounded-2xl ring-2 ring-teal-200/80 transition"
      : "scroll-mt-28";
  }

  const visibleOutcome =
    lastActionOutcome && visibleOutcomeTimestamp === lastActionOutcome.timestamp ? lastActionOutcome : null;
  const getAreaHighlightClass = (area: LastActionOutcome["affectedAreas"][number]) =>
    highlightTimestamp === lastActionOutcome?.timestamp && lastActionOutcome.affectedAreas.includes(area)
      ? "ring-2 ring-teal-200/80 bg-teal-50/40 transition-all duration-700"
      : "";

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
            label="Amount status"
            title={detail.fundingExplanation.coverageLabel}
            detail={detail.fundingExplanation.blockingConditionLabel ?? detail.fundingExplanation.nextFinancialStepLabel ?? detail.fundingExplanation.headline}
            tone={detail.fundingExplanation.tone}
          />
        );
      case "evidence":
        return (
          <CompactSignalCard
            label="Supporting information"
            title={detail.evidenceSummary.sufficiencyLabel}
            detail={detail.evidenceSummary.blockingConditionLabel ?? detail.evidenceSummary.nextEvidenceStepLabel ?? detail.evidenceSummary.reviewStatusLabel}
            tone={detail.evidenceSummary.tone}
          />
        );
      case "approval":
        return (
          <CompactSignalCard
            label="Sign-off status"
            title={detail.approvalSummary.approvalProgressLabel}
            detail={detail.approvalSummary.blockingConditionLabel ?? detail.approvalSummary.nextApprovalStepLabel ?? detail.approvalSummary.activeApprovalLabel}
            tone={detail.approvalSummary.tone}
          />
        );
      case "attention":
        return (
          <CompactSignalCard
            label="Why it matters"
            title={detail.attentionReason.reasonLabel}
            detail={detail.attentionReason.supportingDetails[0] ?? null}
            tone={detail.attentionReason.tone}
          />
        );
      case "case_path":
        return (
          <CompactSignalCard
            label="Review path"
            title={detail.casePathSummary.activePathLabel ?? detail.casePathSummary.headline}
            detail={detail.casePathSummary.requiredDecisionLabel ?? detail.casePathSummary.returnToProgressionLabel}
            tone={detail.casePathSummary.tone}
          />
        );
      case "handoff":
        return (
          <CompactSignalCard
            label="Waiting on"
            title={detail.roleHandoff.handoffHeadline}
            detail={detail.roleHandoff.expectedActionLabel ?? detail.roleHandoff.blockingConditionLabel}
            tone={detail.roleHandoff.tone}
          />
        );
      case "exception":
        return (
          <CompactSignalCard
            label="Under review"
            title={detail.exceptionPath.headline}
            detail={detail.exceptionPath.requiredDecisionLabel ?? detail.exceptionPath.returnPathLabel}
            tone={detail.exceptionPath.tone}
          />
        );
      case "outcome":
        return (
          <CompactSignalCard
            label="Current outcome"
            title={detail.exitState.outcomeLabel}
            detail={detail.exitState.valueOutcomeLabel ?? detail.exitState.reopenPathLabel}
            tone={detail.exitState.tone}
          />
        );
      case "release":
        return (
          <CompactSignalCard
            label="Payment"
            title={detail.releaseSummary.decisionLabel ?? detail.releaseSummary.headline}
            detail={detail.releaseSummary.blockingConditionLabel ?? detail.releaseSummary.nextReleaseStepLabel ?? detail.releaseSummary.eligibleAmountLabel}
            tone={detail.releaseSummary.tone}
          />
        );
      case "decision":
        return (
          <CompactSignalCard
            label="Payment status"
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
      <div className="grid gap-6">
        <section className={stageSurfaceHierarchy.primary}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Project / stage header</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{detail.projectName} · {detail.stage.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{detail.operationalStatus.label} · {detail.releaseDecision.explanation.label}</p>
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

          <div className={`mt-4 ${getAreaHighlightClass("stage_state")}`}>
            <StageHealthStrip health={detail.healthDescriptor} />
          </div>

          {visibleOutcome ? (
            <InlineActionConfirmation
              outcome={visibleOutcome}
              stateNowLabel={detail.decisionSummary.statusLabel}
              stateNowReason={detail.healthDescriptor.primaryReason}
            />
          ) : null}
        </section>

        <section className={stageSurfaceHierarchy.tertiaryPanel}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">What happens next</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{focusedGuidance.nextStep}</h3>
          <p className="mt-2 text-sm text-slate-600">{focusedGuidance.recommendedAction}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className={stageSurfaceHierarchy.secondaryCard}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Decision focus</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{focusLabel}</p>
              <p className="mt-1 text-xs text-slate-500">{focusedGuidance.summary}</p>
            </div>
            <div className={stageSurfaceHierarchy.secondaryCard}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Owner</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{focusedGuidance.ownerLabel}</p>
              <p className="mt-1 text-xs text-slate-500">{focusedGuidance.status}</p>
            </div>
            <div className={stageSurfaceHierarchy.secondaryCard}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current payment position</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{detail.releaseSummary.decisionLabel ?? detail.releaseDecision.explanation.label}</p>
              <p className="mt-1 text-xs text-slate-500">{detail.releaseSummary.blockingConditionLabel ?? detail.releaseSummary.nextReleaseStepLabel ?? detail.releaseSummary.eligibleAmountLabel}</p>
            </div>
          </div>
        </section>

        <section className={stageSurfaceHierarchy.tertiaryPanel}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Why this is required</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{detail.attentionReason.headline}</h3>
          <p className="mt-2 text-sm text-slate-600">{detail.attentionReason.reasonLabel}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={stageSurfaceHierarchy.secondaryCard}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Governance condition</p>
              <p className="mt-1 text-sm text-slate-900">{detail.attentionReason.reasonCategory}</p>
              <p className="mt-1 text-xs text-slate-500">{detail.attentionReason.driverLabel}</p>
            </div>
            <div className={stageSurfaceHierarchy.secondaryCard}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">What is holding progress</p>
              <p className="mt-1 text-sm text-slate-900">{detail.attentionReason.supportingDetails[0] ?? detail.healthDescriptor.primaryReason}</p>
              <p className="mt-1 text-xs text-slate-500">
                {detail.releaseSummary.blockingConditionLabel ?? detail.fundingExplanation.blockingConditionLabel ?? "No extra blocker detail is recorded."}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {detail.releaseDecision.reasons.slice(0, 3).map((reason, index) => (
              <p key={`${reason.type}-${index}`} className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
                <span className="font-medium text-slate-900">{reason.type.replaceAll("_", " ")}:</span> {reason.message}
              </p>
            ))}
            {detail.blockers.slice(0, 3).map((blocker) => (
              <p key={blocker.code} className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
                <span className="font-medium text-slate-900">{blocker.label}:</span> {blocker.priority}
              </p>
            ))}
          </div>
        </section>

        <section className={`${stageSurfaceHierarchy.tertiaryPanel} ${getAreaHighlightClass("funding")} ${getAreaHighlightClass("release")} ${getAreaHighlightClass("evidence")} ${getAreaHighlightClass("approvals")}`}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Do this now</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{focusedGuidance.recommendedAction}</h3>
          <p className="mt-2 text-sm text-slate-600">{focusedGuidance.summary}</p>

          {!detail.actingRole.readOnly ? (
            <div className="mt-4 grid gap-3">
              {releaseDescriptor ? (
                <ActionControlCard
                  descriptor={releaseDescriptor}
                  owner="Funder"
                  disabled={!canReleaseStage}
                  onClick={onRelease}
                />
              ) : null}
              {fundDescriptor ? (
                <ActionControlCard
                  descriptor={fundDescriptor}
                  owner="Funder"
                  disabled={!canFundStage}
                  onClick={onFundStage}
                />
              ) : null}
              {overrideDescriptor ? (
                <ActionControlCard
                  descriptor={overrideDescriptor}
                  owner="Funder"
                  disabled={!canApplyOverride}
                  formRequirementLabel={
                    detail.actionReadiness.applyOverride.isAvailable && overrideReason.trim().length === 0
                      ? "Enter an override reason in the supporting details below."
                      : undefined
                  }
                  onClick={onApplyOverride}
                />
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {detail.actingRole.label} view is read-only. The current decision focus is visible here, while controlled actions remain in the supporting details and activity record.
            </div>
          )}

          <div className="mt-5 grid gap-4">
            <div ref={fundingRef} className={getSectionClass("funding")}>
              <SupportingDetailsDisclosure
                title="Funding and payment detail"
                summary={`${detail.fundingExplanation.headline} ${detail.releaseSummary.blockingConditionLabel ?? detail.releaseSummary.nextReleaseStepLabel ?? ""}`.trim()}
                defaultOpen={shouldOpenSupport("funding", "release")}
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={stageSurfaceHierarchy.secondaryCard}>
                    <p className="text-sm text-slate-500">WIP</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(stageWipTotal)}</p>
                  </div>
                  <div className={stageSurfaceHierarchy.secondaryCard}>
                    <p className="text-sm text-slate-500">Ready to pay</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.releaseDecision.releasableAmount)}</p>
                  </div>
                  <div className={stageSurfaceHierarchy.secondaryCard}>
                    <p className="text-sm text-slate-500">On hold</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.disputeSummary.frozenValue)}</p>
                  </div>
                  <div className={stageSurfaceHierarchy.secondaryCard}>
                    <p className="text-sm text-slate-500">Blocked</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.releaseDecision.blockedAmount)}</p>
                  </div>
                </div>
                <div ref={releaseRef} className="mt-4 grid gap-2 text-sm text-slate-600">
                  <p>{detail.releaseSummary.headline}</p>
                  <p>{detail.releaseSummary.eligibleAmountLabel}. {detail.releaseSummary.releasedAmountLabel}. {detail.releaseSummary.remainingHeldLabel}.</p>
                  <p>Payment basis: {detail.releaseDecision.explanation.decisionBasis}</p>
                  {detail.releaseDecision.overridden ? (
                    <p className="rounded-2xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">
                      Funder override is active and clearly flagged. Payment proceeds by override, not through the normal payment path.
                    </p>
                  ) : null}
                  {detail.blockingRelease ? (
                    <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
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
                <div className="mt-4 rounded-2xl border border-dashed border-teal-200 bg-teal-50/80 p-4">
                  <p className="text-sm font-medium text-teal-950">Funder override</p>
                  <p className="mt-1 text-xs text-teal-900">Funding source in view: {fundingSource || "not selected"}</p>
                  <textarea
                    className="mt-3 min-h-24 w-full rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm"
                    placeholder="Override reason"
                    value={overrideReason}
                    disabled={!detail.availableActions.applyOverride}
                    onChange={(event) => onOverrideReasonChange(event.target.value)}
                  />
                </div>
              </SupportingDetailsDisclosure>
            </div>

            <div ref={evidenceRef} className={getSectionClass("evidence")}>
              <SupportingDetailsDisclosure
                title="Supporting information"
                summary={detail.evidenceSummary.blockingConditionLabel ?? detail.evidenceSummary.nextEvidenceStepLabel ?? detail.evidenceSummary.headline}
                defaultOpen={shouldOpenSupport("evidence")}
              >
                <EvidencePanel
                  detail={detail}
                  evidenceTitle={evidenceTitle}
                  evidenceType={evidenceType}
                  evidenceReviewReasons={evidenceReviewReasons}
                  onEvidenceTitleChange={onEvidenceTitleChange}
                  onEvidenceTypeChange={onEvidenceTypeChange}
                  onEvidenceReviewReasonChange={onEvidenceReviewReasonChange}
                  onAddEvidence={onAddEvidence}
                  onUpdateEvidenceStatus={onUpdateEvidenceStatus}
                />
              </SupportingDetailsDisclosure>
            </div>

            <div ref={approvalsRef} className={getSectionClass("approvals")}>
              <SupportingDetailsDisclosure
                title="Approval path"
                summary={detail.approvalSummary.blockingConditionLabel ?? detail.approvalSummary.nextApprovalStepLabel ?? detail.approvalSummary.headline}
                defaultOpen={shouldOpenSupport("approvals")}
              >
                <ApprovalPanel
                  detail={detail}
                  approvalRejectReasons={approvalRejectReasons}
                  onApprovalRejectReasonChange={onApprovalRejectReasonChange}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              </SupportingDetailsDisclosure>
            </div>

            <div ref={disputeRef} className={getSectionClass("dispute")}>
              <SupportingDetailsDisclosure
                title="Dispute detail"
                summary={detail.casePathSummary.activePathLabel === "Dispute path" ? detail.casePathSummary.headline : detail.disputeSummary.reason}
                defaultOpen={shouldOpenSupport("dispute")}
              >
                <div className="grid gap-3">
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
                    placeholder="On-hold amount"
                    value={disputeAmount}
                    disabled={!detail.availableActions.openDispute}
                    onChange={(event) => onDisputeAmountChange(event.target.value)}
                  />
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
                  <div className="grid gap-3">
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
                            <div className="grid min-w-[15rem] gap-2">
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
                      <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No dispute items recorded for this project stage.</p>
                    ) : null}
                  </div>
                </div>
              </SupportingDetailsDisclosure>
            </div>

            <div ref={variationRef} className={getSectionClass("variation")}>
              <SupportingDetailsDisclosure
                title="Variation detail"
                summary={detail.casePathSummary.activePathLabel === "Variation path" ? detail.casePathSummary.headline : detail.variationSummary.reason}
                defaultOpen={shouldOpenSupport("variation")}
              >
                <div className="grid gap-3">
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
                  <div className="grid gap-3">
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
                                  <textarea
                                    className="min-h-20 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                                    placeholder="Reason for rejecting this variation"
                                    value={variationRejectReasons[variation.id] ?? ""}
                                    onChange={(event) => onVariationRejectReasonChange(variation.id, event.target.value)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => onRejectVariation(variation.id, variationRejectReasons[variation.id] ?? "")}
                                    disabled={!variation.canReject || !(variationRejectReasons[variation.id] ?? "").trim().length}
                                    className={`disabled:cursor-not-allowed min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
                                      variation.canReject && (variationRejectReasons[variation.id] ?? "").trim().length
                                        ? "border-slate-300 bg-white text-slate-900"
                                        : "border-slate-200 bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    <span className="block">{variation.rejectAction.label}</span>
                                    <span className="mt-1 block text-xs opacity-80">{variation.rejectAction.outcomeLabel}</span>
                                  </button>
                                  <p className="text-xs text-slate-500">
                                    {variation.canReject && (variationRejectReasons[variation.id] ?? "").trim().length
                                      ? variation.rejectAction.outcomeLabel
                                      : variation.canReject
                                        ? "Enter a reason before rejecting this variation."
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
                      <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No variations recorded for this project stage.</p>
                    ) : null}
                  </div>
                </div>
              </SupportingDetailsDisclosure>
            </div>
          </div>
        </section>

        <section className={stageSurfaceHierarchy.tertiaryPanel}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Recorded activity</p>
          <div className="mt-4">
            <StageTimelineCard entries={detail.timelineEntries} />
          </div>
        </section>
      </div>
    </section>
  );
}
