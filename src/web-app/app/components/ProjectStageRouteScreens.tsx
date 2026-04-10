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
  getRoleInboxItems,
  getStageDetail,
  getUserFacingRoleLabel,
  giveApproval,
  recordLastActionOutcome,
  releaseStage,
  rejectApproval,
  updateEvidenceStatus,
  type StageDetailSectionKey,
} from "@/lib/systemState";
import type {
  ApprovalRole,
  EvidenceStatus,
  EvidenceType,
  SystemStateRecord,
} from "@/lib/shureFundModels";

import { useShureFundShellState } from "./ShureFundAppShell";

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
  if (!timestamp) return "Not carried in this prototype";
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

function statusToneClass(status: string) {
  if (status === "approved" || status === "released" || status === "accepted") return "border-teal-200 bg-teal-50 text-teal-950";
  if (status === "blocked" || status === "rejected" || status === "disputed" || status === "requires_more") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

function guidanceToneClass(state: "act_now" | "waiting" | "blocked" | "clear") {
  if (state === "act_now") return "border-teal-200 bg-teal-50 text-teal-950";
  if (state === "blocked") return "border-amber-200 bg-amber-50 text-amber-950";
  if (state === "waiting") return "border-slate-200 bg-slate-100 text-slate-900";
  return "border-slate-200 bg-white text-slate-900";
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

function MobileScreen({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 bg-neutral-950 px-4 py-5 text-neutral-100">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">Shure.Fund</p>
          <h1 className="mt-2 text-[1.75rem] font-black tracking-tight text-neutral-50">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-neutral-400">{subtitle}</p> : null}
        </div>
        {backHref ? (
          <Link href={backHref} className="rounded-full border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200">
            {backLabel}
          </Link>
        ) : null}
      </header>
      {children}
    </main>
  );
}

function ScreenCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-neutral-800 bg-neutral-900/80 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.22)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function useWorkflowContext(routeProjectId?: string, routeStageId?: string) {
  const {
    state,
    setState,
    selectedProjectId,
    setSelectedProjectId,
    selectedStageId,
    setSelectedStageId,
    selectedStageSection,
    setSelectedStageSection,
  } = useShureFundShellState();

  useEffect(() => {
    if (routeProjectId && routeProjectId !== selectedProjectId && state.projects.some((entry) => entry.id === routeProjectId)) {
      setSelectedProjectId(routeProjectId);
    }
  }, [routeProjectId, selectedProjectId, setSelectedProjectId, state.projects]);

  const project = state.projects.find((entry) => entry.id === (routeProjectId ?? selectedProjectId)) ?? state.projects[0];
  const currentUser = state.users.find((entry) => entry.id === state.currentUserId) ?? state.users[0];
  const projectStages = useMemo(() => state.stages.filter((stage) => stage.projectId === project.id), [state.stages, project.id]);
  const activeStageId = projectStages.some((stage) => stage.id === (routeStageId ?? selectedStageId))
    ? (routeStageId ?? selectedStageId)
    : projectStages[0]?.id ?? "";

  useEffect(() => {
    if (activeStageId && activeStageId !== selectedStageId) {
      setSelectedStageId(activeStageId);
    }
  }, [activeStageId, selectedStageId, setSelectedStageId]);

  const stageDetail = useMemo(() => getStageDetail(state, activeStageId), [state, activeStageId]);
  const lastActionOutcome = useMemo(() => getLastActionOutcome(state, activeStageId), [state, activeStageId]);
  const fundingSummary = useMemo(() => getFundingSummary(state, project.id), [state, project.id]);
  const stageSteps = useMemo(() => getProjectStageCurrentSteps(state, project.id), [state, project.id]);
  const stageStep = stageSteps.find((step) => step.stageId === activeStageId) ?? null;
  const notifications = useMemo(() => getRoleInboxItems(state, currentUser.role, project.id), [state, currentUser.role, project.id]);
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

export function ProjectSummaryRouteScreen() {
  const { project, fundingSummary, projectStages, stageStep, notifications } = useWorkflowContext();
  const firstStage = projectStages[0] ?? null;

  return (
    <MobileScreen title={project.name} subtitle={`${project.location}. One selected project, one next step.`}>
      <ScreenCard title="Project summary">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-4">
          <p className="text-sm font-semibold text-neutral-100">Current project position</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-neutral-50">{currency.format(fundingSummary.releasableFunds)}</p>
          <p className="mt-1 text-sm text-neutral-400">Ready to pay across the selected project.</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-neutral-900 px-3 py-3">
              <p className="text-neutral-500">Stages</p>
              <p className="mt-1 font-semibold text-neutral-100">{projectStages.length}</p>
            </div>
            <div className="rounded-2xl bg-neutral-900 px-3 py-3">
              <p className="text-neutral-500">On hold</p>
              <p className="mt-1 font-semibold text-neutral-100">{currency.format(fundingSummary.frozenFunds)}</p>
            </div>
            <div className="rounded-2xl bg-neutral-900 px-3 py-3">
              <p className="text-neutral-500">In progress</p>
              <p className="mt-1 font-semibold text-neutral-100">{currency.format(fundingSummary.inProgressFunds)}</p>
            </div>
          </div>
        </div>
      </ScreenCard>

      <ScreenCard title="What happens next">
        <p className="text-base font-semibold text-neutral-100">{stageStep?.stepLabel ?? "Open the current stage"}</p>
        <p className="mt-2 text-sm text-neutral-400">{stageStep?.supportingSentence ?? "Review the selected project stages to continue."}</p>
      </ScreenCard>

      <ScreenCard title="Primary action">
        <Link
          href={`/projects/${project.id}`}
          className="flex min-h-12 items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
        >
          Open project stages
        </Link>
      </ScreenCard>

      <ScreenCard title="Notifications">
        <div className="space-y-2">
          {notifications.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href={`/projects/${project.id}/stages/${item.stageId ?? firstStage?.id ?? ""}/action`}
              className="block rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3"
            >
              <p className="text-sm font-medium text-neutral-100">{item.title}</p>
              <p className="mt-1 text-sm text-neutral-400">{item.reason}</p>
            </Link>
          ))}
          {notifications.length === 0 ? <p className="text-sm text-neutral-400">No notifications are waiting for this project.</p> : null}
        </div>
      </ScreenCard>
    </MobileScreen>
  );
}

export function StageListRouteScreen({
  routeProjectId,
}: {
  routeProjectId?: string;
}) {
  const { state, project, projectStages } = useWorkflowContext(routeProjectId);

  return (
    <MobileScreen title="Stage list" subtitle={`${project.name}. Choose one stage to continue.`} backHref="/">
      <div className="space-y-3">
        {projectStages.map((stage) => {
          const detail = getStageDetail(state, stage.id);
          const nextSection = getPrimaryWorkflowSection(detail);
          return (
            <Link
              key={stage.id}
              href={`/projects/${project.id}/stages/${stage.id}`}
              className="block rounded-[28px] border border-neutral-800 bg-neutral-900/80 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.22)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-100">{stage.name}</p>
                  <p className="mt-1 text-lg font-black tracking-tight text-neutral-50">{currency.format(stage.requiredAmount)}</p>
                  <p className="mt-2 text-sm text-neutral-400">{detail.sectionGuidance[nextSection].summary}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusToneClass(stage.status)}`}>
                  {stage.status.replaceAll("_", " ")}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-800 pt-3 text-xs text-neutral-500">
                <span>{formatReadOnlyDate(stage.plannedStartDate)} to {formatReadOnlyDate(stage.plannedEndDate)}</span>
                <span>{getWorkflowSectionLabel(nextSection)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </MobileScreen>
  );
}

export function StageDetailRouteScreen({
  routeProjectId,
  routeStageId,
}: {
  routeProjectId: string;
  routeStageId: string;
}) {
  const {
    project,
    stageDetail,
    lastActionOutcome,
    workflowSection,
    workflowGuidance,
  } = useWorkflowContext(routeProjectId, routeStageId);

  return (
    <MobileScreen
      title={stageDetail.stage.name}
      subtitle={`${project.name}. Review the current requirement, then continue to the decision screen.`}
      backHref={`/projects/${project.id}`}
    >
      <ScreenCard title="Stage detail">
        <p className="text-sm text-neutral-300">{stageDetail.stageDescription}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-neutral-950/70 px-3 py-3">
            <p className="text-neutral-500">Value</p>
            <p className="mt-1 font-semibold text-neutral-100">{currency.format(stageDetail.stage.requiredAmount)}</p>
          </div>
          <div className="rounded-2xl bg-neutral-950/70 px-3 py-3">
            <p className="text-neutral-500">Dates</p>
            <p className="mt-1 font-semibold text-neutral-100">{formatReadOnlyDate(stageDetail.plannedStartDate)} to {formatReadOnlyDate(stageDetail.plannedEndDate)}</p>
          </div>
        </div>
      </ScreenCard>

      <ScreenCard title="Current requirement">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${guidanceToneClass(workflowGuidance.state)}`}>
          {getWorkflowSectionLabel(workflowSection)}
        </span>
        <p className="mt-3 text-lg font-semibold text-neutral-100">{workflowGuidance.summary}</p>
        <p className="mt-2 text-sm text-neutral-400">{workflowGuidance.nextStep}</p>
        <p className="mt-3 text-sm text-neutral-300">Next responsible user: {workflowGuidance.ownerLabel}</p>
      </ScreenCard>

      <ScreenCard title="Recorded outcome">
        <p className="text-sm font-medium text-neutral-100">{lastActionOutcome?.summary ?? "No recent decision recorded."}</p>
        <p className="mt-2 text-sm text-neutral-400">{lastActionOutcome ? "The last governed action is already recorded for this stage." : "Continue to the action screen to record the next governed step."}</p>
      </ScreenCard>

      <ScreenCard title="Primary action">
        <Link
          href={`/projects/${project.id}/stages/${routeStageId}/action`}
          className="flex min-h-12 items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
        >
          Continue to current decision
        </Link>
      </ScreenCard>
    </MobileScreen>
  );
}

export function StageActionRouteScreen({
  routeProjectId,
  routeStageId,
}: {
  routeProjectId: string;
  routeStageId: string;
}) {
  const {
    state,
    setState,
    project,
    stageDetail,
    workflowSection,
    workflowGuidance,
    setSelectedStageSection,
  } = useWorkflowContext(routeProjectId, routeStageId);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("file");
  const [overrideReason, setOverrideReason] = useState("");
  const [approvalRejectReasons, setApprovalRejectReasons] = useState<Record<string, string>>({});
  const [evidenceReviewReasons, setEvidenceReviewReasons] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<{ headline: string; detail: string; nextStep: string; nextOwner: string } | null>(null);

  const activeApproval = stageDetail.approvals.find((approval) => approval.readiness.isAvailable) ?? stageDetail.approvals.find((approval) => approval.status !== "approved") ?? null;
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
    <MobileScreen
      title={getWorkflowSectionLabel(workflowSection)}
      subtitle={`${project.name}. Complete the current governed step only.`}
      backHref={`/projects/${project.id}/stages/${routeStageId}`}
    >
      <ScreenCard title="Current requirement">
        <p className="text-lg font-semibold text-neutral-100">{workflowGuidance.recommendedAction}</p>
        <p className="mt-2 text-sm text-neutral-400">{workflowGuidance.nextStep}</p>
      </ScreenCard>

      <ScreenCard title="Decision">
        {workflowSection === "evidence" ? (
          <div className="space-y-4">
            {stageDetail.actionReadiness.addEvidence.isAvailable ? (
              <>
                <input
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-100"
                  placeholder="Supporting information title"
                  value={evidenceTitle}
                  onChange={(event) => setEvidenceTitle(event.target.value)}
                />
                <select
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-100"
                  value={evidenceType}
                  onChange={(event) => setEvidenceType(event.target.value as EvidenceType)}
                >
                  <option value="file">File</option>
                  <option value="form">Form</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    runStageActionWithOutcome({
                      setState,
                      stageId: routeStageId,
                      section: "evidence",
                      actionId: "evidence:add",
                      updater: (current) => addEvidence(current, routeStageId, evidenceType, evidenceTitle),
                      onAfter: onAfterAction,
                    })
                  }
                  disabled={!canAddEvidence}
                  className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                  Add supporting information
                </button>
              </>
            ) : activeEvidence ? (
              <>
                <div className="rounded-2xl bg-neutral-950/70 px-4 py-4">
                  <p className="text-sm font-medium text-neutral-100">{activeEvidence.label}</p>
                  <p className="mt-1 text-sm text-neutral-400">{activeEvidence.record?.name ?? "Submitted item awaiting review"}</p>
                </div>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-100"
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
                      className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
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
                      className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500"
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
                      className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500"
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
            <div className="rounded-2xl bg-neutral-950/70 px-4 py-4">
              <p className="text-sm font-medium text-neutral-100">{getUserFacingRoleLabel(activeApproval.role)}</p>
              <p className="mt-1 text-sm text-neutral-400">{activeApproval.readiness.reasonLabel}</p>
            </div>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-100"
              placeholder="Reason if rejecting"
              value={approvalRejectReasons[activeApproval.role] ?? ""}
              onChange={(event) => setApprovalRejectReasons((current) => ({ ...current, [activeApproval.role]: event.target.value }))}
            />
            <button
              type="button"
              onClick={() =>
                runStageActionWithOutcome({
                  setState,
                  stageId: routeStageId,
                  section: "approvals",
                  actionId: `approval:${activeApproval.role}:approve`,
                  updater: (current) => giveApproval(current, routeStageId, activeApproval.role),
                  onAfter: onAfterAction,
                })
              }
              disabled={!activeApproval.canAct}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-500"
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
                  updater: (current) => rejectApproval(current, routeStageId, activeApproval.role, approvalRejectReasons[activeApproval.role] ?? ""),
                  onAfter: onAfterAction,
                })
              }
              disabled={!(approvalRejectReasons[activeApproval.role] ?? "").trim().length}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500"
            >
              {activeApproval.rejectAction.label}
            </button>
          </div>
        ) : null}

        {workflowSection === "funding" ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-neutral-950/70 px-4 py-4">
              <p className="text-sm text-neutral-500">Funding still needed</p>
              <p className="mt-2 text-xl font-semibold text-neutral-100">{currency.format(stageDetail.funding.gapToRequiredCover)}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                runStageActionWithOutcome({
                  setState,
                  stageId: routeStageId,
                  section: "funding",
                  actionId: "funding:allocate",
                  updater: (current) => allocateStageFunds(current, routeStageId),
                  onAfter: onAfterAction,
                })
              }
              disabled={!canFundStage}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              Allocate funding
            </button>
          </div>
        ) : null}

        {workflowSection === "release" ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-neutral-950/70 px-4 py-4">
              <p className="text-sm text-neutral-500">Ready to pay now</p>
              <p className="mt-2 text-xl font-semibold text-neutral-100">{currency.format(stageDetail.releaseDecision.releasableAmount)}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                runStageActionWithOutcome({
                  setState,
                  stageId: routeStageId,
                  section: "release",
                  actionId: "release:execute",
                  updater: (current) => releaseStage(current, routeStageId),
                  onAfter: onAfterAction,
                })
              }
              disabled={!canReleaseStage}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              Send payment
            </button>
            {stageDetail.actionDescriptorMap["apply-override"] ? (
              <>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-100"
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
                  className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500"
                >
                  Apply override
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {workflowSection !== "evidence" && workflowSection !== "approvals" && workflowSection !== "funding" && workflowSection !== "release" ? (
          <div className="rounded-2xl bg-neutral-950/70 px-4 py-4">
            <p className="text-sm text-neutral-400">This requirement is waiting on another step. The next responsible user is {workflowGuidance.ownerLabel}.</p>
          </div>
        ) : null}
      </ScreenCard>

      <ScreenCard title="Recorded outcome">
        <p className="text-sm font-medium text-neutral-100">{receipt?.headline ?? "No new outcome recorded yet."}</p>
        <p className="mt-2 text-sm text-neutral-400">{receipt?.detail ?? "Complete the current governed action to record the result."}</p>
      </ScreenCard>

      <ScreenCard title="What happens next">
        <p className="text-base font-semibold text-neutral-100">{receipt?.nextStep ?? workflowGuidance.nextStep}</p>
        <p className="mt-2 text-sm text-neutral-400">Next responsible user: {receipt?.nextOwner ?? workflowGuidance.ownerLabel}</p>
      </ScreenCard>

      <ScreenCard title="Primary action">
        <Link
          href={`/projects/${project.id}/stages/${routeStageId}`}
          className="flex min-h-12 items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
        >
          Return to stage
        </Link>
      </ScreenCard>
    </MobileScreen>
  );
}
