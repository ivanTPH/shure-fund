"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  addEvidence,
  allocateStageFunds,
  applyOverride,
  createLastActionOutcome,
  getFundingSummary,
  getLastActionOutcome,
  getProjectStageCurrentSteps,
  getProjectWorkspaceSummary,
  getRoleInboxItems,
  getStageDetail,
  getUserFacingRoleLabel,
  giveApproval,
  recordLastActionOutcome,
  releaseStage,
  rejectApproval,
  setCurrentUser,
  updateEvidenceStatus,
  type StageDetailSectionKey,
} from "@/lib/systemState";
import { buttonPatterns, spacingScale, surfacePatterns, typographyScale } from "@/lib/designSystem";
import type { ApprovalRole, EvidenceType, SystemStateRecord } from "@/lib/shureFundModels";

import { useMobileAppState } from "./MobileAppState";
import AuthUserBadge, { SignOutButton } from "./AuthUserBadge";
import type { TransitionAction } from "@/lib/workflow/stateMachine";
import EvidenceUpload from "./evidence/EvidenceUpload";
import FundingBanner from "./FundingBanner";
import VariationList from "./VariationList";
import NotificationBell from "./notifications/NotificationBell";
import DisputeList from "./DisputeList";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const workflowSectionOrder: StageDetailSectionKey[] = [
  "evidence",
  "approvals",
  "funding",
  "release",
  "dispute",
  "variation",
  "overview",
];

function formatReadOnlyDate(timestamp?: string | null) {
  if (!timestamp) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatRelativeTime(timestamp?: string | null) {
  if (!timestamp) return "No recent activity";
  const deltaMs = Math.max(Date.now() - new Date(timestamp).getTime(), 0);
  const minutes = Math.round(deltaMs / 60000);
  const hours = Math.round(deltaMs / 3600000);
  const days = Math.round(deltaMs / 86400000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getWorkflowSectionLabel(section: StageDetailSectionKey) {
  switch (section) {
    case "evidence":
      return "Supporting information";
    case "approvals":
      return "Approval decision";
    case "funding":
      return "Funding decision";
    case "release":
      return "Payment decision";
    case "dispute":
      return "Dispute review";
    case "variation":
      return "Variation review";
    default:
      return "Stage requirement";
  }
}

function getPrimaryWorkflowSection(detail: ReturnType<typeof getStageDetail>): StageDetailSectionKey {
  const actionable = workflowSectionOrder.find((section) => detail.sectionGuidance[section].state === "act_now");
  if (actionable) return actionable;
  const waiting = workflowSectionOrder.find((section) => detail.sectionGuidance[section].state === "waiting");
  if (waiting) return waiting;
  const blocked = workflowSectionOrder.find((section) => detail.sectionGuidance[section].state === "blocked");
  if (blocked) return blocked;
  return "overview";
}

function statusToneClass(status: string) {
  if (status === "approved" || status === "released" || status === "accepted" || status === "ready") return "border-teal-400/30 bg-teal-500/10 text-teal-100";
  if (status === "blocked" || status === "rejected" || status === "disputed" || status === "requires_more" || status === "on_hold") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-white/10 bg-white/5 text-neutral-100";
}

function guidanceToneClass(state: "act_now" | "waiting" | "blocked" | "clear") {
  if (state === "act_now") return "border-teal-400/30 bg-teal-500/10 text-teal-100";
  if (state === "blocked") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-white/10 bg-white/5 text-neutral-100";
}

function MobileFlowLayout({
  title,
  subtitle,
  eyebrow,
  backHref,
  backLabel = "Back",
  headerAccessory,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  headerAccessory?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mobile-app-viewport text-neutral-100">
      <main className="mobile-app-frame flex flex-col">
        <header className="mb-7 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-5 py-5 shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-aqua)]">{eyebrow ?? "Shure.Fund"}</p>
              <h1 className="mt-3 text-[1.95rem] font-black tracking-tight text-white">{title}</h1>
              <p className="mt-2 max-w-[32ch] text-sm leading-6 text-neutral-300">{subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerAccessory}
              {backHref ? (
                <Link href={backHref} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-neutral-100">
                  {backLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <div className={`flex-1 ${spacingScale.section} flex flex-col`}>{children}</div>
      </main>

      {footer ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#060b1bcc]/90 backdrop-blur">
          <div className="mobile-app-bottom-nav">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

function ScreenPanel({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${surfacePatterns.shell} rounded-[28px] border-white/10 bg-black/20 p-4`}>
      {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">{eyebrow}</p> : null}
      <p className={`${eyebrow ? "mt-2" : ""} text-base font-semibold text-white`}>{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricStrip({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-xs text-neutral-400">{item.label}</p>
          <p className={`mt-2 text-lg font-bold tracking-tight ${item.tone ?? "text-white"}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function PrimaryFooterLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href} className="block rounded-[22px] bg-white px-4 py-3 text-center text-sm font-semibold text-[#071125]">
      {label}
    </Link>
  );
}

function getFundingVisualModel(detail: ReturnType<typeof getStageDetail>) {
  const controlBlocked = detail.blockers.some((blocker) => ["approvals", "evidence", "disputed"].includes(blocker.code));
  const releasedValue = detail.stage.releasedAmount;
  const availableValue = detail.releaseDecision.releasable ? detail.releaseDecision.releasableAmount : 0;
  const blockedValue = detail.releaseDecision.frozenAmount + (controlBlocked && !detail.releaseDecision.releasable ? detail.releaseDecision.blockedAmount : 0);
  const inProgressValue = Math.max(detail.stage.requiredAmount - releasedValue - availableValue - blockedValue, 0);

  return {
    totalValue: detail.stage.requiredAmount,
    segments: [
      {
        key: "released",
        label: "Released",
        value: releasedValue,
        color: "var(--brand-aqua)",
        toneClass: "text-[var(--brand-aqua)]",
        description: "Already paid",
      },
      {
        key: "available",
        label: "Available to release",
        value: availableValue,
        color: "#d6fff4",
        toneClass: "text-teal-50",
        description: "Ready to pay",
      },
      {
        key: "in_progress",
        label: "In progress",
        value: inProgressValue,
        color: "#3f67ff",
        toneClass: "text-blue-300",
        description: "Work still moving",
      },
      {
        key: "blocked",
        label: "Disputed / blocked",
        value: blockedValue,
        color: "#f6c36a",
        toneClass: "text-amber-300",
        description: "Held back",
      },
    ],
  };
}

type FundingSegmentKey = ReturnType<typeof getFundingVisualModel>["segments"][number]["key"];

function FundingPositionRing({
  detail,
  activeSegment,
  onSelectSegment,
}: {
  detail: ReturnType<typeof getStageDetail>;
  activeSegment: FundingSegmentKey;
  onSelectSegment: (segment: FundingSegmentKey) => void;
}) {
  const model = getFundingVisualModel(detail);
  const total = Math.max(model.totalValue, 1);
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  let offsetCursor = 0;
  const selectedSegment = model.segments.find((segment) => segment.key === activeSegment) ?? model.segments[1] ?? model.segments[0];
  const primaryStatus = `${currency.format(selectedSegment.value)} ${selectedSegment.label.toLowerCase()}`;

  return (
    <div className="w-full rounded-[32px] border border-white/10 bg-white/5 px-4 py-6 text-left shadow-[0_28px_70px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Contract position</p>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-neutral-200">Tap a segment</span>
      </div>

      <div className="mt-5 flex flex-col items-center gap-6">
        <div className="relative flex h-[248px] w-[248px] items-center justify-center">
          <svg viewBox="0 0 248 248" className="h-[248px] w-[248px] -rotate-90">
            <circle cx="124" cy="124" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="24" />
            {model.segments.map((segment) => {
              const segmentLength = total > 0 ? (segment.value / total) * circumference : 0;
              const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;
              const strokeDashoffset = -offsetCursor;
              offsetCursor += segmentLength;

              if (segment.value <= 0) {
                return null;
              }

              return (
                <circle
                  key={segment.key}
                  cx="124"
                  cy="124"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={segment.key === activeSegment ? 28 : 24}
                  strokeLinecap="butt"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="cursor-pointer transition-opacity duration-150"
                  opacity={activeSegment === segment.key ? 1 : 0.58}
                  onClick={() => onSelectSegment(segment.key)}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Scheduled</p>
            <p className="mt-2 text-[2rem] font-black tracking-tight text-white">{currency.format(model.totalValue)}</p>
            <p className="mt-3 max-w-[12rem] text-sm font-semibold leading-5 text-neutral-100">{primaryStatus}</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2">
          {model.segments.map((segment) => (
            <button
              key={segment.key}
              type="button"
              onClick={() => onSelectSegment(segment.key)}
              className={`rounded-2xl border px-3 py-3 text-left ${
                activeSegment === segment.key ? "border-white/20 bg-white/10" : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{segment.label}</p>
              </div>
              <p className={`mt-2 text-sm font-bold ${segment.toneClass}`}>{currency.format(segment.value)}</p>
              <p className="mt-1 text-xs text-neutral-500">{segment.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FundingAllocationDrawer({
  open,
  onClose,
  projectStages,
  state,
}: {
  open: boolean;
  onClose: () => void;
  projectStages: ReturnType<typeof useProjectContext>["projectStages"];
  state: SystemStateRecord;
}) {
  const rows = useMemo(
    () =>
      projectStages.map((stage) => {
        const detail = getStageDetail(state, stage.id);
        const model = getFundingVisualModel(detail);
        const packageLabel = stage.subcontractorName ?? stage.contractorName ?? stage.name;
        const status =
          detail.frozenValue > 0
            ? "disputed"
            : detail.stage.releasedAmount >= detail.stage.requiredAmount
              ? "complete"
              : "in progress";

        return {
          id: stage.id,
          label: packageLabel,
          stageName: stage.name,
          status,
          total: model.totalValue,
          bankAccountBalance: detail.funding.allocatedFunds,
          proofOfFunds: detail.funding.requiredFunds,
          released: model.segments[0].value,
          available: model.segments[1].value,
          inProgress: model.segments[2].value,
          blocked: model.segments[3].value,
        };
      }),
    [projectStages, state],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close allocation drawer" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative mx-auto w-full max-w-[420px] rounded-t-[32px] border border-white/10 bg-[#081126] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-20px_60px_rgba(0,0,0,0.35)]">
        <div className="mx-auto h-1.5 w-14 rounded-full bg-white/15" aria-hidden />
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Allocation drawer</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-white">Package contract position</h2>
            <p className="mt-2 text-sm text-neutral-300">Each package shows what is scheduled, released, available to release, in progress, or disputed / blocked, using the current proof of funds and bank account balance already in the model.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-neutral-100">
            Close
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{row.label}</p>
                  <p className="mt-1 text-sm text-neutral-400">{row.stageName}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    row.status === "complete"
                      ? "border-teal-400/30 bg-teal-500/10 text-teal-100"
                      : row.status === "disputed"
                        ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
                        : "border-blue-400/30 bg-blue-500/10 text-blue-100"
                  }`}
                >
                  {row.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <p className="text-xs text-neutral-400">Scheduled</p>
                  <p className="mt-1 text-sm font-bold text-white">{currency.format(row.total)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <p className="text-xs text-neutral-400">Bank account balance</p>
                  <p className="mt-1 text-sm font-bold text-white">{currency.format(row.bankAccountBalance)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <p className="text-xs text-neutral-400">Proof of funds</p>
                  <p className="mt-1 text-sm font-bold text-white">{currency.format(row.proofOfFunds)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <p className="text-xs text-neutral-400">Released</p>
                  <p className="mt-1 text-sm font-bold text-[var(--brand-aqua)]">{currency.format(row.released)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <p className="text-xs text-neutral-400">Available to release</p>
                  <p className="mt-1 text-sm font-bold text-teal-50">{currency.format(row.available)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <p className="text-xs text-neutral-400">In progress</p>
                  <p className="mt-1 text-sm font-bold text-blue-300">{currency.format(row.inProgress)}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <p className="text-xs text-neutral-400">Disputed / blocked</p>
                  <p className="mt-1 text-sm font-bold text-amber-300">{currency.format(row.blocked)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function useProjectContext(routeProjectId?: string) {
  const {
    state,
    setState,
    selectedProjectId,
    setSelectedProjectId,
    selectedStageId,
    setSelectedStageId,
    selectedStageSection,
    setSelectedStageSection,
    isLoading,
    loadError,
  } = useMobileAppState();

  useEffect(() => {
    if (routeProjectId && routeProjectId !== selectedProjectId && state.projects.some((entry) => entry.id === routeProjectId)) {
      setSelectedProjectId(routeProjectId);
    }
  }, [routeProjectId, selectedProjectId, setSelectedProjectId, state.projects]);

  const project = state.projects.find((entry) => entry.id === (routeProjectId ?? selectedProjectId)) ?? state.projects[0];
  const currentUser = state.users.find((entry) => entry.id === state.currentUserId) ?? state.users[0];
  const projectStages = useMemo(() => state.stages.filter((stage) => stage.projectId === project.id), [project.id, state.stages]);

  return {
    state,
    setState,
    project,
    currentUser,
    projectStages,
    setSelectedProjectId,
    selectedStageId,
    setSelectedStageId,
    selectedStageSection,
    setSelectedStageSection,
    isLoading,
    loadError,
  };
}

function useWorkflowContext(routeProjectId?: string, routeStageId?: string) {
  const {
    state,
    setState,
    project,
    currentUser,
    projectStages,
    selectedStageId,
    setSelectedStageId,
    selectedStageSection,
    setSelectedStageSection,
    isLoading,
    loadError,
  } = useProjectContext(routeProjectId);

  const activeStageId = projectStages.some((stage) => stage.id === (routeStageId ?? selectedStageId))
    ? (routeStageId ?? selectedStageId)
    : projectStages[0]?.id ?? "";

  useEffect(() => {
    if (activeStageId && activeStageId !== selectedStageId) {
      setSelectedStageId(activeStageId);
    }
  }, [activeStageId, selectedStageId, setSelectedStageId]);

  const stageDetail = useMemo(() => getStageDetail(state, activeStageId), [activeStageId, state]);
  const lastActionOutcome = useMemo(() => getLastActionOutcome(state, activeStageId), [activeStageId, state]);
  const fundingSummary = useMemo(() => getFundingSummary(state, project.id), [project.id, state]);
  const stageSteps = useMemo(() => getProjectStageCurrentSteps(state, project.id), [project.id, state]);
  const stageStep = stageSteps.find((step) => step.stageId === activeStageId) ?? stageSteps[0] ?? null;
  const notifications = useMemo(() => getRoleInboxItems(state, currentUser.role, project.id), [currentUser.role, project.id, state]);
  const workflowSection = getPrimaryWorkflowSection(stageDetail);
  const workflowGuidance = stageDetail.sectionGuidance[workflowSection];

  return {
    state,
    setState,
    project,
    currentUser,
    projectStages,
    activeStageId,
    stageDetail,
    lastActionOutcome,
    fundingSummary,
    stageStep,
    notifications,
    selectedStageSection,
    setSelectedStageSection,
    workflowSection,
    workflowGuidance,
    isLoading,
    loadError,
  };
}

function runStageActionWithOutcome(params: {
  setState: React.Dispatch<React.SetStateAction<SystemStateRecord>>;
  stageId: string;
  section: StageDetailSectionKey;
  actionId: string;
  updater: (current: SystemStateRecord) => SystemStateRecord;
  onAfter?: (nextSection: StageDetailSectionKey, receipt: { headline: string; detail: string; nextStep: string; nextOwner: string }) => void;
}) {
  const { setState, stageId, section, actionId, updater, onAfter } = params;

  let nextSection: StageDetailSectionKey = section;
  let nextReceipt: { headline: string; detail: string; nextStep: string; nextOwner: string } | null = null;

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
    nextSection = getPrimaryWorkflowSection(nextDetail);
    nextReceipt = {
      headline: outcome.summary,
      detail: nextDetail.operationalStatus.reason,
      nextStep: nextDetail.sectionGuidance[nextSection].nextStep,
      nextOwner: nextDetail.sectionGuidance[nextSection].ownerLabel,
    };
    return resolvedNext;
  });

  if (nextReceipt) {
    onAfter?.(nextSection, nextReceipt);
  }
}

/**
 * Calls the server-side transition API for a given stage.
 * Errors are logged but never thrown — the prototype in-memory state
 * always updates immediately. Once real DB IDs are in use, this
 * persists every transition with a full audit trail.
 */
async function callTransitionAPI(
  stageId: string,
  action: TransitionAction,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/stages/${stageId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok) {
      console.warn(`[transition] ${action} on ${stageId} → ${response.status}:`, data.error);
      return { ok: false, error: data.error };
    }
    return { ok: true };
  } catch (err) {
    // Network or parse error — non-fatal, prototype continues
    console.warn("[transition] API call failed:", err);
    return { ok: false, error: "Network error" };
  }
}

export function ProjectSummaryRouteScreen() {
  const { state, setState, project, currentUser, projectStages, setSelectedProjectId, isLoading, loadError } = useProjectContext();
  const workspaceSummary = useMemo(() => getProjectWorkspaceSummary(state, project.id), [project.id, state]);
  const fundingSummary = useMemo(() => getFundingSummary(state, project.id), [project.id, state]);
  const nextStageStep = useMemo(() => getProjectStageCurrentSteps(state, project.id)[0] ?? null, [project.id, state]);
  const inbox = useMemo(() => getRoleInboxItems(state, currentUser.role, project.id), [currentUser.role, project.id, state]);
  const switchableUsers = state.users.filter((user) => ["contractor", "commercial", "professional", "treasury", "executive", "funder"].includes(user.role));

  if (loadError) {
    return (
      <MobileFlowLayout title="Unable to load" subtitle="There was a problem fetching project data from the server.">
        <ScreenPanel eyebrow="Data error" title="Project data unavailable">
          <p className={typographyScale.helper}>{loadError}</p>
          <p className="mt-3 text-sm text-neutral-400">Check your Supabase environment variables and database connection, then reload the page.</p>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  if (isLoading) {
    return (
      <MobileFlowLayout title="Loading…" subtitle="Fetching live project data.">
        <ScreenPanel title="One moment">
          <p className={typographyScale.helper}>Connecting to Shure.Fund data. This takes just a second.</p>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  if (state.projects.length === 0) {
    return (
      <MobileFlowLayout title="No projects" subtitle="No active projects are available in this account.">
        <ScreenPanel title="Nothing here yet">
          <p className={typographyScale.helper}>Create a project in the Shure.Fund dashboard to get started.</p>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  return (
    <MobileFlowLayout
      title={project.name}
      subtitle={`${project.location}. One project summary, one next governed move, one consistent mobile flow.`}
      footer={<PrimaryFooterLink href={`/projects/${project.id}`} label="Open stage list" />}
      headerAccessory={
        <>
          <select
            className="max-w-[8.5rem] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            value={state.currentUserId}
            onChange={(event) => setState((current) => setCurrentUser(current, event.target.value))}
            aria-label="Switch acting role"
          >
            {switchableUsers.map((user) => (
              <option key={user.id} value={user.id}>{getUserFacingRoleLabel(user.role)}</option>
            ))}
          </select>
          <NotificationBell />
        </>
      }
    >
      <ScreenPanel title="Project posture">
        <p className={typographyScale.heroMetric}>{currency.format(workspaceSummary.releasableNow)}</p>
        <p className={`mt-2 ${typographyScale.helper}`}>{workspaceSummary.postureReason}</p>
        <div className="mt-4">
          <MetricStrip
            items={[
              { label: "Stages", value: String(projectStages.length) },
              { label: "Ready now", value: String(workspaceSummary.releaseReadyCount) },
              { label: "Frozen", value: currency.format(workspaceSummary.frozenValue), tone: "text-amber-200" },
              { label: "Project funds", value: currency.format(fundingSummary.projectBalance) },
            ]}
          />
        </div>
      </ScreenPanel>

      <FundingBanner projectId={project.id} />

      <ScreenPanel title="Current path">
        <p className={typographyScale.sectionTitle}>{nextStageStep?.stepLabel ?? "Review the current project package."}</p>
        <p className={`mt-2 ${typographyScale.helper}`}>{nextStageStep?.supportingSentence ?? "Continue into the stage list to progress the next governed step."}</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <AuthUserBadge variant="dark" />
            <SignOutButton variant="dark" />
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Prototype role</p>
          <p className="mt-2 text-base font-semibold text-white">{currentUser.name}</p>
          <p className="mt-1 text-sm text-neutral-300">{getUserFacingRoleLabel(currentUser.role)}</p>
        </div>
      </ScreenPanel>

      <ScreenPanel title="Next action">
        <div className="space-y-3">
          {inbox.slice(0, 2).map((item) => (
            <Link key={item.id} href={`/projects/${project.id}/stages/${item.stageId ?? projectStages[0]?.id ?? ""}/action`} className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-sm text-neutral-300">{item.reason}</p>
            </Link>
          ))}
          {inbox.length === 0 ? <p className={typographyScale.helper}>No action is waiting right now. The stage list is still the next place to continue.</p> : null}
        </div>
      </ScreenPanel>

      <ScreenPanel title="Project switch">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">Selected project</span>
          <select
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            value={project.id}
            onChange={(event) => setSelectedProjectId(event.target.value)}
          >
            {state.projects.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
      </ScreenPanel>

      <Link
        href={`/projects/${project.id}/audit`}
        className="flex items-center justify-between rounded-[20px] px-4 py-3 text-sm transition-colors hover:bg-white/5"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="font-medium text-neutral-300">Audit trail</span>
        <span className="text-xs text-neutral-500">Full event history →</span>
      </Link>
    </MobileFlowLayout>
  );
}

export function StageListRouteScreen({
  routeProjectId,
}: {
  routeProjectId?: string;
}) {
  const { state, project, projectStages, isLoading, loadError } = useProjectContext(routeProjectId);

  if (loadError) {
    return (
      <MobileFlowLayout title="Unable to load" subtitle="There was a problem fetching stage data." backHref="/">
        <ScreenPanel eyebrow="Data error" title="Stage list unavailable">
          <p className={typographyScale.helper}>{loadError}</p>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  if (isLoading) {
    return (
      <MobileFlowLayout title="Loading…" subtitle="Fetching stage list." backHref="/">
        <ScreenPanel title="One moment">
          <p className={typographyScale.helper}>Loading stages for this project.</p>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  if (projectStages.length === 0) {
    return (
      <MobileFlowLayout title="No stages" subtitle={`${project.name} has no stages configured yet.`} backHref="/">
        <ScreenPanel title="Nothing here yet">
          <p className={typographyScale.helper}>Add contract stages in the Shure.Fund dashboard to begin the workflow.</p>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  return (
    <MobileFlowLayout
      title="Stage list"
      subtitle={`${project.name}. Choose one stage and continue the same mobile route flow.`}
      backHref="/"
      footer={<PrimaryFooterLink href="/" label="Back to project summary" />}
    >
      <FundingBanner projectId={project.id} />
      {projectStages.map((stage) => {
        const detail = getStageDetail(state, stage.id);
        const nextSection = getPrimaryWorkflowSection(detail);
        return (
          <Link key={stage.id} href={`/projects/${project.id}/stages/${stage.id}`} className={`${surfacePatterns.interactive} block rounded-[28px] border-white/10 bg-white/5 p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={typographyScale.cardTitle}>{stage.name}</p>
                <p className="mt-1 text-lg font-black tracking-tight text-white">{currency.format(stage.requiredAmount)}</p>
                <p className={`mt-2 ${typographyScale.helper}`}>{detail.sectionGuidance[nextSection].summary}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusToneClass(stage.status)}`}>
                {stage.status.replaceAll("_", " ")}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-neutral-500">
              <span>{formatReadOnlyDate(stage.plannedStartDate)} to {formatReadOnlyDate(stage.plannedEndDate)}</span>
              <span>{getWorkflowSectionLabel(nextSection)}</span>
            </div>
          </Link>
        );
      })}
    </MobileFlowLayout>
  );
}

export function StageDetailRouteScreen({
  routeProjectId,
  routeStageId,
}: {
  routeProjectId: string;
  routeStageId: string;
}) {
  const { state, project, projectStages, stageDetail, lastActionOutcome, workflowSection, workflowGuidance, stageStep, setSelectedStageSection, isLoading, loadError } = useWorkflowContext(routeProjectId, routeStageId);

  if (loadError) {
    return (
      <MobileFlowLayout title="Unable to load" subtitle="There was a problem fetching stage data." backHref="/">
        <ScreenPanel eyebrow="Data error" title="Stage unavailable">
          <p className={typographyScale.helper}>{loadError}</p>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  if (isLoading) {
    return (
      <MobileFlowLayout title="Loading…" subtitle="Fetching stage detail." backHref="/">
        <ScreenPanel title="One moment">
          <p className={typographyScale.helper}>Loading stage data from Shure.Fund.</p>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  if (!project || project.id !== routeProjectId || !projectStages.length || !projectStages.some((stage) => stage.id === routeStageId)) {
    return (
      <MobileFlowLayout
        title="Stage not found"
        subtitle="The requested stage is not available in the active prototype state."
        backHref="/"
      >
        <ScreenPanel eyebrow="Route fallback" title="No stage matched this route">
          <p className={typographyScale.helper}>
            Check the stage link or reopen the package from the project flow. The prototype is rendering, but this route does not map to a visible stage.
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Next action</p>
            <p className="mt-2 text-sm font-medium text-white">Return to project workflow</p>
            <p className="mt-1 text-sm text-neutral-300">Open the project stage list again and select a live package from the current mock state.</p>
          </div>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  const [activeFundingState, setActiveFundingState] = useState<FundingSegmentKey>("available");
  const acceptedEvidence = stageDetail.evidence.filter((item) => item.record?.status === "accepted").length;
  const requiredEvidence = stageDetail.evidence.filter((item) => item.required).length;
  const approvedCount = stageDetail.approvals.filter((item) => item.status === "approved").length;
  const fundingModel = getFundingVisualModel(stageDetail);
  const packageRows = projectStages.map((stage) => {
    const detail = getStageDetail(state, stage.id);
    const stageFunding = getFundingVisualModel(detail);
    const matchingTags = stageFunding.segments.filter((segment) => segment.value > 0).map((segment) => segment.key);
    return {
      id: stage.id,
      title: stage.subcontractorName ?? stage.contractorName ?? stage.name,
      subtitle: stage.name,
      value: currency.format(stage.requiredAmount),
      status: detail.operationalStatus.label,
      progress: stage.requiredAmount > 0 ? Math.min((stage.releasedAmount + detail.releaseDecision.releasableAmount) / stage.requiredAmount, 1) : 0,
      tags: (matchingTags.length > 0 ? matchingTags : ["in_progress"]) as FundingSegmentKey[],
      href: `/projects/${project.id}/stages/${stage.id}`,
      isCurrent: stage.id === routeStageId,
      hasNotification: Boolean(detail.notificationCue) || detail.sectionGuidance[getPrimaryWorkflowSection(detail)].state === "act_now",
    };
  });
  const visibleRows = packageRows.filter((row) => row.tags.includes(activeFundingState));

  return (
    <MobileFlowLayout
      title={stageDetail.stage.name}
      subtitle={`${project.name}. Financial position first, then the workflow context supporting it.`}
      backHref={`/projects/${project.id}`}
      headerAccessory={<NotificationBell />}
    >
      <FundingPositionRing detail={stageDetail} activeSegment={activeFundingState} onSelectSegment={setActiveFundingState} />

      <section className="rounded-[30px] border border-white/10 bg-[#081126]/95 p-4 shadow-[0_28px_70px_rgba(0,0,0,0.24)]">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Open a package</p>
          <p className="text-xs text-neutral-400">{visibleRows.length} package(s)</p>
        </div>

        <div className="space-y-2">
          {visibleRows.map((row) => {
            const rowContent = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{row.title}</p>
                      {row.hasNotification ? <span className="h-2 w-2 rounded-full bg-[var(--brand-aqua)]" aria-hidden /> : null}
                    </div>
                    <p className="mt-1 text-sm text-neutral-400">{row.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{row.value}</p>
                      <p className="mt-1 max-w-[8.5rem] text-xs text-neutral-500">{row.status}</p>
                    </div>
                    <span className="text-lg leading-none text-neutral-500">›</span>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--brand-aqua)] via-white to-[#3f67ff]"
                    style={{ width: `${Math.max(8, Math.round(row.progress * 100))}%` }}
                  />
                </div>
              </>
            );

            const rowClassName = `block rounded-[24px] border border-white/10 px-4 py-4 transition-colors ${
              row.isCurrent ? "bg-white/12 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" : row.tags.includes(activeFundingState) ? "bg-white/7" : "bg-white/4"
            }`;

            return (
              <Link
                key={row.id}
                href={row.href}
                className={rowClassName}
              >
                {rowContent}
              </Link>
            );
          })}
        </div>

        <div className="mt-2 pl-3">
          <div className="rounded-[28px] border border-white/10 bg-[#0b1530] px-4 py-4 shadow-[0_18px_44px_rgba(0,0,0,0.24)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">Selected stage</p>
                <p className="mt-2 text-base font-semibold text-white">{stageDetail.stage.name}</p>
                <p className="mt-1 text-sm text-neutral-400">{project.name}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusToneClass(stageDetail.stage.status)}`}>
                {stageDetail.operationalStatus.label}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">Stage summary</p>
                <p className="text-sm font-bold text-white">{currency.format(stageDetail.stage.requiredAmount)}</p>
              </div>
              <p className="mt-2 text-sm text-neutral-400">
                {formatReadOnlyDate(stageDetail.plannedStartDate)} to {formatReadOnlyDate(stageDetail.plannedEndDate)} · {workflowGuidance.summary}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-xs text-neutral-500">Evidence</p>
                <p className="mt-1 text-sm font-bold text-white">{acceptedEvidence}/{requiredEvidence || stageDetail.evidence.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-xs text-neutral-500">Approvals</p>
                <p className="mt-1 text-sm font-bold text-white">{approvedCount}/{stageDetail.approvals.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-xs text-neutral-500">Funding</p>
                <p className="mt-1 text-sm font-bold text-white">{currency.format(fundingModel.segments.find((segment) => segment.key === activeFundingState)?.value ?? 0)}</p>
              </div>
            </div>

            <Link
              href={`/projects/${project.id}/stages/${routeStageId}/action`}
              className="mt-3 block rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
              onClick={() => setSelectedStageSection("evidence")}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">Checklist / evidence</p>
                  <p className="mt-1 text-sm text-neutral-400">{acceptedEvidence}/{requiredEvidence || stageDetail.evidence.length} ready · {stageDetail.evidenceSummary.reviewStatusLabel}</p>
                </div>
                <span className="text-lg leading-none text-neutral-500">›</span>
              </div>
            </Link>

            <Link
              href={`/projects/${project.id}/stages/${routeStageId}/action`}
              className="mt-3 block rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
              onClick={() => setSelectedStageSection(workflowSection)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">Comments / messages</p>
                  <p className="mt-1 text-sm text-neutral-400">{lastActionOutcome?.summary ?? stageStep?.supportingSentence ?? "Open the latest package activity"}</p>
                </div>
                <span className="text-lg leading-none text-neutral-500">›</span>
              </div>
            </Link>

            <Link
              href={`/projects/${project.id}/stages/${routeStageId}/action`}
              className="mt-3 block rounded-2xl border border-white/10 bg-white px-3 py-3 text-[#071125]"
              onClick={() => setSelectedStageSection(workflowSection)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Completion / payment</p>
                  <p className="mt-1 text-sm text-[#2d3656]">{workflowGuidance.recommendedAction}</p>
                </div>
                <span className="text-lg leading-none text-[#2d3656]">›</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Variations</h2>
        <VariationList stageId={routeStageId} projectId={routeProjectId} />
      </section>

      <section className="px-4 pb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Disputes</h2>
        <DisputeList stageId={routeStageId} projectId={routeProjectId} />
      </section>
    </MobileFlowLayout>
  );
}

export function StageActionRouteScreen({
  routeProjectId,
  routeStageId,
}: {
  routeProjectId: string;
  routeStageId: string;
}) {
  const { setState, project, stageDetail, workflowSection, workflowGuidance, setSelectedStageSection, isLoading, loadError } = useWorkflowContext(routeProjectId, routeStageId);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("file");
  const [overrideReason, setOverrideReason] = useState("");
  const [approvalRejectReasons, setApprovalRejectReasons] = useState<Record<string, string>>({});
  const [evidenceReviewReasons, setEvidenceReviewReasons] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<{ headline: string; detail: string; nextStep: string; nextOwner: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  if (loadError) {
    return (
      <MobileFlowLayout title="Unable to load" subtitle="There was a problem fetching stage data." backHref={`/projects/${routeProjectId}/stages/${routeStageId}`}>
        <ScreenPanel eyebrow="Data error" title="Action unavailable">
          <p className={typographyScale.helper}>{loadError}</p>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  if (isLoading) {
    return (
      <MobileFlowLayout title="Loading…" subtitle="Fetching stage action." backHref={`/projects/${routeProjectId}/stages/${routeStageId}`}>
        <ScreenPanel title="One moment">
          <p className={typographyScale.helper}>Loading action data from Shure.Fund.</p>
        </ScreenPanel>
      </MobileFlowLayout>
    );
  }

  const activeApproval =
    stageDetail.approvals.find((approval) => approval.readiness.isAvailable) ??
    stageDetail.approvals.find((approval) => approval.status !== "approved") ??
    null;
  const activeEvidence =
    stageDetail.evidence.find((item) => item.actionDescriptors.accepted || item.actionDescriptors.requires_more || item.actionDescriptors.rejected) ??
    stageDetail.evidence.find((item) => !item.record && item.required) ??
    null;

  const canAddEvidence = stageDetail.actionReadiness.addEvidence.isAvailable && evidenceTitle.trim().length > 0;
  const canFundStage = stageDetail.actionReadiness.fundStage.isAvailable && stageDetail.funding.gapToRequiredCover > 0;
  const canReleaseStage = stageDetail.actionReadiness.release.isAvailable && stageDetail.releaseDecision.releasable;
  const canApplyOverride = stageDetail.actionReadiness.applyOverride.isAvailable && overrideReason.trim().length > 0;

  function onAfterAction(nextSection: StageDetailSectionKey, nextReceipt: { headline: string; detail: string; nextStep: string; nextOwner: string }) {
    setSelectedStageSection(nextSection);
    setReceipt(nextReceipt);
  }

  return (
    <MobileFlowLayout
      title={getWorkflowSectionLabel(workflowSection)}
      subtitle={`${project.name}. This is the single action surface for the current governed decision.`}
      backHref={`/projects/${project.id}/stages/${routeStageId}`}
      footer={<PrimaryFooterLink href={`/projects/${project.id}/stages/${routeStageId}`} label="Return to stage detail" />}
    >
      <ScreenPanel title="Action brief">
        <p className={typographyScale.sectionTitle}>{workflowGuidance.recommendedAction}</p>
        <p className={`mt-2 ${typographyScale.helper}`}>{workflowGuidance.nextStep}</p>
      </ScreenPanel>

      <ScreenPanel title="Decision input">
        {workflowSection === "evidence" ? (
          <div className="space-y-4">
            {/* Real evidence upload — replaces the stub form */}
            <EvidenceUpload
              stageId={routeStageId}
              canUpload={stageDetail.actionReadiness.addEvidence.isAvailable}
            />

            {/* Review interface for approvers (accept / requires_more / reject) */}
            {activeEvidence ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-sm font-medium text-white">{activeEvidence.label}</p>
                  <p className={`mt-1 ${typographyScale.helper}`}>{activeEvidence.record?.name ?? "Submitted item awaiting review"}</p>
                </div>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                  placeholder="Reason if asking for more information or rejecting"
                  value={evidenceReviewReasons[activeEvidence.id] ?? ""}
                  onChange={(event) => setEvidenceReviewReasons((current) => ({ ...current, [activeEvidence.id]: event.target.value }))}
                />
                <div className="grid gap-2">
                  {activeEvidence.actionDescriptors.accepted ? (
                    <button
                      type="button"
                      onClick={() =>
                        runStageActionWithOutcome({
                          setState,
                          stageId: routeStageId,
                          section: "evidence",
                          actionId: `evidence:${activeEvidence.id}:accepted`,
                          updater: (current) => updateEvidenceStatus(current, activeEvidence.id, "accepted"),
                          onAfter: onAfterAction,
                        })
                      }
                      className={`${buttonPatterns.primary} flex min-h-12 w-full items-center justify-center rounded-2xl`}
                    >
                      {activeEvidence.actionDescriptors.accepted.label}
                    </button>
                  ) : null}
                  {activeEvidence.actionDescriptors.requires_more ? (
                    <button
                      type="button"
                      onClick={() =>
                        runStageActionWithOutcome({
                          setState,
                          stageId: routeStageId,
                          section: "evidence",
                          actionId: `evidence:${activeEvidence.id}:requires_more`,
                          updater: (current) => updateEvidenceStatus(current, activeEvidence.id, "requires_more", { reason: evidenceReviewReasons[activeEvidence.id] ?? "" }),
                          onAfter: onAfterAction,
                        })
                      }
                      disabled={!(evidenceReviewReasons[activeEvidence.id] ?? "").trim().length}
                      className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:text-neutral-500"
                    >
                      {activeEvidence.actionDescriptors.requires_more.label}
                    </button>
                  ) : null}
                  {activeEvidence.actionDescriptors.rejected ? (
                    <button
                      type="button"
                      onClick={() =>
                        runStageActionWithOutcome({
                          setState,
                          stageId: routeStageId,
                          section: "evidence",
                          actionId: `evidence:${activeEvidence.id}:rejected`,
                          updater: (current) => updateEvidenceStatus(current, activeEvidence.id, "rejected", { reason: evidenceReviewReasons[activeEvidence.id] ?? "" }),
                          onAfter: onAfterAction,
                        })
                      }
                      disabled={!(evidenceReviewReasons[activeEvidence.id] ?? "").trim().length}
                      className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:text-neutral-500"
                    >
                      {activeEvidence.actionDescriptors.rejected.label}
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {workflowSection === "approvals" && activeApproval ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-sm font-medium text-white">{getUserFacingRoleLabel(activeApproval.role)}</p>
              <p className={`mt-1 ${typographyScale.helper}`}>{activeApproval.readiness.reasonLabel}</p>
            </div>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              placeholder="Reason if rejecting"
              value={approvalRejectReasons[activeApproval.role] ?? ""}
              onChange={(event) => setApprovalRejectReasons((current) => ({ ...current, [activeApproval.role]: event.target.value }))}
            />
            <button
              type="button"
              onClick={async () => {
                setApiError(null);
                runStageActionWithOutcome({
                  setState,
                  stageId: routeStageId,
                  section: "approvals",
                  actionId: `approval:${activeApproval.role}:approve`,
                  updater: (current) => giveApproval(current, routeStageId, activeApproval.role as ApprovalRole),
                  onAfter: onAfterAction,
                });
                // After each approval, ask the server if all approvals are now
                // complete. If so, it transitions the stage to available_to_release.
                // The server validates — a partial-approval response is not an error.
                const result = await callTransitionAPI(routeStageId, "complete_approvals");
                if (!result.ok && result.error && !result.error.includes("not yet granted")) {
                  setApiError(result.error);
                }
              }}
              disabled={!activeApproval.canAct}
              className={`${buttonPatterns.primary} flex min-h-12 w-full items-center justify-center rounded-2xl disabled:cursor-not-allowed disabled:bg-neutral-600`}
            >
              {activeApproval.approveAction.label}
            </button>
            <button
              type="button"
              onClick={() =>
                runStageActionWithOutcome({
                  setState,
                  stageId: routeStageId,
                  section: "approvals",
                  actionId: `approval:${activeApproval.role}:reject`,
                  updater: (current) => rejectApproval(current, routeStageId, activeApproval.role as ApprovalRole, approvalRejectReasons[activeApproval.role] ?? ""),
                  onAfter: onAfterAction,
                })
              }
              disabled={!(approvalRejectReasons[activeApproval.role] ?? "").trim().length}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:text-neutral-500"
            >
              {activeApproval.rejectAction.label}
            </button>
          </div>
        ) : null}

        {workflowSection === "funding" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-sm text-neutral-400">Funding still needed</p>
              <p className="mt-2 text-xl font-semibold text-white">{currency.format(stageDetail.funding.gapToRequiredCover)}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setApiError(null);
                runStageActionWithOutcome({
                  setState,
                  stageId: routeStageId,
                  section: "funding",
                  actionId: "funding:allocate",
                  updater: (current) => allocateStageFunds(current, routeStageId),
                  onAfter: onAfterAction,
                });
                const result = await callTransitionAPI(routeStageId, "allocate_funding");
                if (!result.ok && result.error) setApiError(result.error);
              }}
              disabled={!canFundStage}
              className={`${buttonPatterns.primary} flex min-h-12 w-full items-center justify-center rounded-2xl disabled:cursor-not-allowed disabled:bg-neutral-600`}
            >
              Allocate funding
            </button>
          </div>
        ) : null}

        {workflowSection === "release" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-sm text-neutral-400">Ready to pay now</p>
              <p className="mt-2 text-xl font-semibold text-white">{currency.format(stageDetail.releaseDecision.releasableAmount)}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setApiError(null);
                const result = await callTransitionAPI(routeStageId, "release");
                if (!result.ok) {
                  // Surface the server's gate reason — do NOT update in-memory state
                  // if the server rejects the release (approval or wallet gate failed)
                  setApiError(result.error ?? "Release was blocked by the server.");
                  return;
                }
                runStageActionWithOutcome({
                  setState,
                  stageId: routeStageId,
                  section: "release",
                  actionId: "release:execute",
                  updater: (current) => releaseStage(current, routeStageId),
                  onAfter: onAfterAction,
                });
              }}
              disabled={!canReleaseStage}
              className={`${buttonPatterns.primary} flex min-h-12 w-full items-center justify-center rounded-2xl disabled:cursor-not-allowed disabled:bg-neutral-600`}
            >
              Send payment
            </button>
            {stageDetail.actionDescriptorMap["apply-override"] ? (
              <>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                  placeholder="Override reason"
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() =>
                    runStageActionWithOutcome({
                      setState,
                      stageId: routeStageId,
                      section: "release",
                      actionId: "release:override",
                      updater: (current) => applyOverride(current, routeStageId, overrideReason),
                      onAfter: onAfterAction,
                    })
                  }
                  disabled={!canApplyOverride}
                  className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:text-neutral-500"
                >
                  Apply override
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {workflowSection !== "evidence" && workflowSection !== "approvals" && workflowSection !== "funding" && workflowSection !== "release" ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <p className={typographyScale.helper}>This requirement is waiting on another step. The next responsible user is {workflowGuidance.ownerLabel}.</p>
          </div>
        ) : null}
      </ScreenPanel>

      <ScreenPanel title="Action outcome">
        {apiError ? (
          <div className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">Server gate blocked</p>
            <p className="mt-1 text-sm text-amber-100">{apiError}</p>
          </div>
        ) : null}
        <p className="text-sm font-medium text-white">{receipt?.headline ?? "No new outcome recorded yet."}</p>
        <p className={`mt-2 ${typographyScale.helper}`}>{receipt?.detail ?? "Complete the current governed action to record the result."}</p>
        <p className="mt-3 text-sm text-neutral-300">Next owner: {receipt?.nextOwner ?? workflowGuidance.ownerLabel}</p>
      </ScreenPanel>
    </MobileFlowLayout>
  );
}
