"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  addEvidence,
  allocateStageFunds,
  applyOverride,
  createLastActionOutcome,
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

function WorkflowSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-slate-200/70 bg-white/96 p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.35)]">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function statusToneClass(status: string) {
  if (status === "approved" || status === "released") return "border-teal-200 bg-teal-50 text-teal-950";
  if (status === "blocked" || status === "rejected" || status === "disputed") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

export default function ProjectStageWorkflowScreen() {
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
  const router = useRouter();
  const pathname = usePathname();
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("file");
  const [overrideReason, setOverrideReason] = useState("");
  const [approvalRejectReasons, setApprovalRejectReasons] = useState<Record<string, string>>({});
  const [evidenceReviewReasons, setEvidenceReviewReasons] = useState<Record<string, string>>({});

  const project = state.projects.find((entry) => entry.id === selectedProjectId) ?? state.projects[0];
  const currentUser = state.users.find((entry) => entry.id === state.currentUserId) ?? state.users[0];
  const projectStages = useMemo(() => state.stages.filter((stage) => stage.projectId === project.id), [state.stages, project.id]);
  const activeStageId = projectStages.some((stage) => stage.id === selectedStageId)
    ? selectedStageId
    : projectStages[0]?.id ?? "";
  const stageDetail = useMemo(() => getStageDetail(state, activeStageId), [state, activeStageId]);
  const stageCurrentStep = useMemo(
    () => getProjectStageCurrentSteps(state, project.id).find((step) => step.stageId === activeStageId) ?? null,
    [state, project.id, activeStageId],
  );
  const stageNotifications = useMemo(
    () => getRoleInboxItems(state, currentUser.role, project.id).filter((item) => (item.stageId ?? item.deepLinkTarget?.stageId) === activeStageId).slice(0, 2),
    [state, currentUser.role, project.id, activeStageId],
  );

  useEffect(() => {
    if (projectStages.some((stage) => stage.id === selectedStageId)) {
      return;
    }
    const nextStageId = projectStages[0]?.id ?? "";
    if (nextStageId) {
      setSelectedStageId(nextStageId);
    }
  }, [projectStages, selectedStageId, setSelectedStageId]);

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
    }

    if (requestedSection && validSections.includes(requestedSection) && requestedSection !== selectedStageSection) {
      setSelectedStageSection(requestedSection);
    }
  }, [state.projects, state.stages, selectedProjectId, selectedStageId, selectedStageSection, setSelectedProjectId, setSelectedStageId, setSelectedStageSection]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    const currentProject = params.get("project") ?? "";
    const currentStage = params.get("stage") ?? "";
    const currentSection = params.get("section") ?? "";

    if (currentProject === project.id && currentStage === activeStageId && currentSection === selectedStageSection) {
      return;
    }

    params.set("project", project.id);
    if (activeStageId) params.set("stage", activeStageId);
    if (selectedStageSection) params.set("section", selectedStageSection);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [router, pathname, project.id, activeStageId, selectedStageSection]);

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

  function handleAddEvidence() {
    if (!stageDetail.actionReadiness.addEvidence.isAvailable || evidenceTitle.trim().length === 0) {
      return;
    }

    runStageAction(
      "evidence:add",
      activeStageId,
      "evidence",
      (current) => addEvidence(current, activeStageId, evidenceType, evidenceTitle),
    );
    setEvidenceTitle("");
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

  function handleApprove(role: ApprovalRole) {
    runStageAction(
      `approval:${role}:approve`,
      activeStageId,
      "approvals",
      (current) => giveApproval(current, activeStageId, role),
    );
  }

  function handleReject(role: ApprovalRole) {
    const reason = approvalRejectReasons[role] ?? "";
    if (!reason.trim().length) {
      return;
    }

    runStageAction(
      `approval:${role}:reject`,
      activeStageId,
      "approvals",
      (current) => rejectApproval(current, activeStageId, role, reason),
    );
    setApprovalRejectReasons((current) => ({ ...current, [role]: "" }));
  }

  function handleFundStage() {
    runStageAction(
      "funding:allocate",
      activeStageId,
      "funding",
      (current) => allocateStageFunds(current, activeStageId),
    );
  }

  function handleReleaseStage() {
    runStageAction(
      "release:execute",
      activeStageId,
      "release",
      (current) => releaseStage(current, activeStageId),
    );
  }

  function handleApplyOverride() {
    if (!overrideReason.trim().length) {
      return;
    }

    runStageAction(
      "release:override",
      activeStageId,
      "release",
      (current) => applyOverride(current, activeStageId, overrideReason),
    );
    setOverrideReason("");
  }

  const canAddEvidence = stageDetail.actionReadiness.addEvidence.isAvailable && evidenceTitle.trim().length > 0;
  const canFundStage = stageDetail.actionReadiness.fundStage.isAvailable && stageDetail.funding.gapToRequiredCover > 0;
  const canReleaseStage = stageDetail.actionReadiness.release.isAvailable && stageDetail.releaseDecision.releasable;
  const canApplyOverride = stageDetail.actionReadiness.applyOverride.isAvailable && overrideReason.trim().length > 0;

  return (
    <main className="flex flex-col gap-6 text-slate-900">
      <WorkflowSection title="Project name + location">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">{project.name}</h1>
        <p className="mt-2 text-base text-slate-600">{project.location}</p>
        {stageNotifications.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {stageNotifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedStageSection(item.deepLinkTarget?.section ?? "overview")}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
              >
                {item.title}
              </button>
            ))}
          </div>
        ) : null}
      </WorkflowSection>

      <WorkflowSection title="Stage title/description/value/dates">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{stageDetail.stage.name}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{stageDetail.stageDescription}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusToneClass(stageDetail.stage.status)}`}>
            {stageDetail.stage.status.replaceAll("_", " ")}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Stage value</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(stageDetail.stage.requiredAmount)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Start date</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{formatReadOnlyDate(stageDetail.plannedStartDate)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">End date</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{formatReadOnlyDate(stageDetail.plannedEndDate)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Last updated</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{formatRelativeTime(stageDetail.lastUpdatedAt)}</p>
          </div>
        </div>
      </WorkflowSection>

      <WorkflowSection title="Assigned role sign-off">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Contractor</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{stageDetail.stage.contractorName ?? "Not assigned"}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Subcontractor</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{stageDetail.stage.subcontractorName ?? "Not assigned"}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current acting role</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{getUserFacingRoleLabel(currentUser.role)}</p>
          </article>
          {stageDetail.approvals.map((approval) => (
            <article key={approval.id} className={`rounded-2xl border p-4 ${statusToneClass(approval.status)}`}>
              <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">{getUserFacingRoleLabel(approval.role)}</p>
              <p className="mt-2 text-sm font-medium">
                {approval.status === "approved" ? "Approved" : approval.readiness.isAvailable ? "Awaiting sign-off" : "Pending"}
              </p>
              <p className="mt-1 text-xs opacity-80">{approval.unavailableReason}</p>
            </article>
          ))}
        </div>
      </WorkflowSection>

      <WorkflowSection title="Stage files/evidence">
        <div className="grid gap-3">
          {stageDetail.evidence.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-950">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.record?.name ?? "No evidence submitted yet."}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusToneClass(item.record?.status ?? "pending")}`}>
                  {item.record?.status ?? (item.required ? "required" : "optional")}
                </span>
              </div>
              {item.record ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.actionDescriptors.accepted ? (
                    <button
                      type="button"
                      onClick={() => handleEvidenceUpdate(item.id, "accepted")}
                      disabled={!item.actionDescriptors.accepted || !stageDetail.actionReadiness.reviewEvidence.isAvailable}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {item.actionDescriptors.accepted.label}
                    </button>
                  ) : null}
                  {item.actionDescriptors.requires_more ? (
                    <button
                      type="button"
                      onClick={() => handleEvidenceUpdate(item.id, "requires_more", evidenceReviewReasons[item.id] ?? "")}
                      disabled={!(evidenceReviewReasons[item.id] ?? "").trim().length}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {item.actionDescriptors.requires_more.label}
                    </button>
                  ) : null}
                  {item.actionDescriptors.rejected ? (
                    <button
                      type="button"
                      onClick={() => handleEvidenceUpdate(item.id, "rejected", evidenceReviewReasons[item.id] ?? "")}
                      disabled={!(evidenceReviewReasons[item.id] ?? "").trim().length}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {item.actionDescriptors.rejected.label}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {(item.actionDescriptors.requires_more || item.actionDescriptors.rejected) ? (
                <textarea
                  className="mt-3 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  placeholder="Reason if asking for more or rejecting"
                  value={evidenceReviewReasons[item.id] ?? ""}
                  onChange={(event) => setEvidenceReviewReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                />
              ) : null}
            </article>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">Add evidence</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
            <input
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Evidence title"
              value={evidenceTitle}
              onChange={(event) => setEvidenceTitle(event.target.value)}
              disabled={!stageDetail.availableActions.addEvidence}
            />
            <select
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              value={evidenceType}
              onChange={(event) => setEvidenceType(event.target.value as EvidenceType)}
              disabled={!stageDetail.availableActions.addEvidence}
            >
              <option value="file">File</option>
              <option value="form">Form</option>
            </select>
            <button
              type="button"
              onClick={handleAddEvidence}
              disabled={!canAddEvidence}
              className="min-h-12 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Add evidence
            </button>
          </div>
        </div>
      </WorkflowSection>

      <WorkflowSection title="What happens next">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-lg font-semibold text-slate-950">{stageCurrentStep?.stepLabel ?? stageDetail.operationalStatus.label}</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{stageCurrentStep?.assuranceLine ?? stageDetail.operationalStatus.reason}</p>
          <p className="mt-2 text-sm text-slate-600">
            {stageCurrentStep?.supportingSentence ?? stageDetail.sectionGuidance[selectedStageSection].nextStep}
          </p>
        </div>
      </WorkflowSection>

      <WorkflowSection title="Approval path">
        <div className="grid gap-4">
          {stageDetail.approvals.map((approval) => (
            <article key={approval.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-950">{getUserFacingRoleLabel(approval.role)}</p>
                  <p className="mt-1 text-sm text-slate-500">{approval.readiness.reasonLabel}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusToneClass(approval.status)}`}>
                  {approval.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApprove(approval.role)}
                  disabled={!approval.canAct || !approval.approveAction}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {approval.approveAction.label}
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(approval.role)}
                  disabled={!approval.canAct || !(approvalRejectReasons[approval.role] ?? "").trim().length}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {approval.rejectAction.label}
                </button>
              </div>
              <textarea
                className="mt-3 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                placeholder="Reason if rejecting"
                value={approvalRejectReasons[approval.role] ?? ""}
                onChange={(event) => setApprovalRejectReasons((current) => ({ ...current, [approval.role]: event.target.value }))}
              />
            </article>
          ))}
        </div>
      </WorkflowSection>

      <WorkflowSection title="Payment status/action">
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Payment status</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{stageDetail.releaseDecision.explanation.label}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Ready to pay</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{currency.format(stageDetail.releaseDecision.releasableAmount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">On hold</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{currency.format(stageDetail.releaseDecision.frozenAmount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Blocked</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{currency.format(stageDetail.releaseDecision.blockedAmount)}</p>
            </div>
          </div>
          <div className="grid gap-3">
            {stageDetail.actionDescriptorMap["fund-stage"] ? (
              <button
                type="button"
                onClick={handleFundStage}
                disabled={!canFundStage}
                className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {stageDetail.actionDescriptorMap["fund-stage"].label}
              </button>
            ) : null}
            {stageDetail.actionDescriptorMap["release"] ? (
              <button
                type="button"
                onClick={handleReleaseStage}
                disabled={!canReleaseStage}
                className="min-h-12 rounded-2xl bg-slate-950 px-4 py-3 text-left text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {stageDetail.actionDescriptorMap["release"].label}
              </button>
            ) : null}
          </div>
          {stageDetail.actionDescriptorMap["apply-override"] ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
              <p className="text-sm font-medium text-teal-950">Funder override</p>
              <textarea
                className="mt-3 min-h-24 w-full rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm"
                placeholder="Override reason"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                disabled={!stageDetail.availableActions.applyOverride}
              />
              <button
                type="button"
                onClick={handleApplyOverride}
                disabled={!canApplyOverride}
                className="mt-3 min-h-12 rounded-2xl border border-teal-300 bg-white px-4 py-3 text-left text-sm font-medium text-teal-950 disabled:cursor-not-allowed disabled:border-teal-200 disabled:bg-teal-100 disabled:text-teal-700"
              >
                {stageDetail.actionDescriptorMap["apply-override"].label}
              </button>
            </div>
          ) : null}
          <div className="grid gap-2">
            {stageDetail.releaseDecision.reasons.map((reason, index) => (
              <p key={`${reason.type}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span className="font-medium capitalize text-slate-900">{reason.type.replaceAll("_", " ")}:</span> {reason.message}
              </p>
            ))}
          </div>
        </div>
      </WorkflowSection>

      <WorkflowSection title="Recorded activity">
        <div className="grid gap-3">
          {stageDetail.timelineEntries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{entry.headline}</p>
                  {entry.detail ? <p className="mt-1 text-sm text-slate-500">{entry.detail}</p> : null}
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {entry.effect.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{entry.actorLabel ?? "System"} · {entry.timestampLabel}</p>
            </article>
          ))}
          {stageDetail.timelineEntries.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No governed stage activity recorded yet.</p>
          ) : null}
        </div>
      </WorkflowSection>
    </main>
  );
}
