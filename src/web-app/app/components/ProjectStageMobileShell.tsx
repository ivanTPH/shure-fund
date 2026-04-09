"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  addEvidence,
  allocateStageFunds,
  applyOverride,
  createLastActionOutcome,
  depositFunds,
  getFundingSummary,
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
  FundingSourceType,
  SystemStateRecord,
} from "@/lib/shureFundModels";
import {
  badgePatterns,
  buttonPatterns,
  inputPatterns,
  layoutPatterns,
  surfacePatterns,
  typographyScale,
} from "@/lib/designSystem";

import { useShureFundShellState } from "./ShureFundAppShell";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

type MobileTab = "notifications" | "projects" | "account" | "funds";
type ProjectScreen = "summary" | "stages" | "stage";

const navItems: Array<{ key: MobileTab; label: string; icon: string }> = [
  { key: "notifications", label: "Notifications", icon: "/brand/icons/Notifications.svg" },
  { key: "projects", label: "Projects", icon: "/brand/icons/Contracts.svg" },
  { key: "account", label: "Account", icon: "/brand/icons/Account.svg" },
  { key: "funds", label: "Funds", icon: "/brand/icons/Funds.svg" },
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

function toneClass(tone: "success" | "warning" | "info" | "neutral") {
  if (tone === "success") return "border-green-700 bg-green-950/35 text-green-200";
  if (tone === "warning") return "border-amber-700 bg-amber-950/35 text-amber-200";
  if (tone === "info") return "border-blue-700 bg-blue-950/30 text-blue-200";
  return "border-neutral-700 bg-neutral-900 text-neutral-200";
}

function statusClass(status: string) {
  if (status === "approved" || status === "released" || status === "accepted") return "border-green-700 bg-green-950/35 text-green-200";
  if (status === "blocked" || status === "rejected" || status === "disputed" || status === "requires_more") return "border-amber-700 bg-amber-950/35 text-amber-200";
  return "border-neutral-700 bg-neutral-900 text-neutral-200";
}

function MobileSection({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className={`${surfacePatterns.shell} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={typographyScale.overline}>{title}</p>
        </div>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ProjectStageMobileShell() {
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

  const [activeTab, setActiveTab] = useState<MobileTab>("projects");
  const [projectScreen, setProjectScreen] = useState<ProjectScreen>("summary");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("file");
  const [approvalRejectReasons, setApprovalRejectReasons] = useState<Record<string, string>>({});
  const [evidenceReviewReasons, setEvidenceReviewReasons] = useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = useState("");
  const [depositAmount, setDepositAmount] = useState("50000");
  const [fundingSource, setFundingSource] = useState<FundingSourceType | "">("");

  const project = state.projects.find((entry) => entry.id === selectedProjectId) ?? state.projects[0];
  const currentUser = state.users.find((entry) => entry.id === state.currentUserId) ?? state.users[0];
  const projectStages = useMemo(() => state.stages.filter((stage) => stage.projectId === project.id), [state.stages, project.id]);
  const activeStageId = projectStages.some((stage) => stage.id === selectedStageId) ? selectedStageId : projectStages[0]?.id ?? "";
  const stageDetail = useMemo(() => getStageDetail(state, activeStageId), [state, activeStageId]);
  const fundingSummary = useMemo(() => getFundingSummary(state, project.id), [state, project.id]);
  const projectSteps = useMemo(() => getProjectStageCurrentSteps(state, project.id), [state, project.id]);
  const stageStep = projectSteps.find((step) => step.stageId === activeStageId) ?? null;
  const notifications = useMemo(() => getRoleInboxItems(state, currentUser.role, project.id), [state, currentUser.role, project.id]);
  const selectedStageNotifications = notifications.filter((item) => (item.stageId ?? item.deepLinkTarget?.stageId) === activeStageId);

  useEffect(() => {
    if (projectStages.some((stage) => stage.id === selectedStageId)) {
      return;
    }
    const nextStageId = projectStages[0]?.id ?? "";
    if (nextStageId) {
      setSelectedStageId(nextStageId);
    }
  }, [projectStages, selectedStageId, setSelectedStageId]);

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

  const canAddEvidence = stageDetail.actionReadiness.addEvidence.isAvailable && evidenceTitle.trim().length > 0;
  const canFundStage = stageDetail.actionReadiness.fundStage.isAvailable && stageDetail.funding.gapToRequiredCover > 0;
  const canReleaseStage = stageDetail.actionReadiness.release.isAvailable && stageDetail.releaseDecision.releasable;
  const canApplyOverride = stageDetail.actionReadiness.applyOverride.isAvailable && overrideReason.trim().length > 0;
  const parsedDepositAmount = Number(depositAmount);
  const canDeposit =
    Number.isFinite(parsedDepositAmount) &&
    parsedDepositAmount > 0 &&
    (fundingSource === "funder" || fundingSource === "contractor");

  function openStage(stageId: string, section: StageDetailSectionKey = "overview") {
    setSelectedStageId(stageId);
    setSelectedStageSection(section);
    setProjectScreen("stage");
    setActiveTab("projects");
  }

  function renderNotificationsScreen() {
    return (
      <div className="space-y-4">
        <div className="px-1">
          <h1 className={typographyScale.pageTitle}>Notifications</h1>
          <p className={typographyScale.helper}>Role-routed stage actions surfaced as compact mobile tasks.</p>
        </div>
        <MobileSection title="Action queue" aside={<span className={badgePatterns.neutral}>{notifications.length} item(s)</span>}>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="rounded-2xl bg-neutral-950/80 px-4 py-4 text-sm text-neutral-400">No notifications are waiting for this role.</div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openStage(item.stageId ?? activeStageId, item.deepLinkTarget?.section ?? "overview")}
                  className={`${surfacePatterns.interactive} w-full px-4 py-4 text-left`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-neutral-100">{item.title}</div>
                      <div className="mt-1 text-lg font-black tracking-tight text-neutral-50">{item.stageName}</div>
                      <div className="mt-2 text-sm text-neutral-400">{item.decisionCue.primaryCue}</div>
                    </div>
                    <span className={badgePatterns.neutral}>{item.priority}</span>
                  </div>
                  <div className={layoutPatterns.cardFooterRow}>
                    <span>{item.reason}</span>
                    <span>{formatRelativeTime(getStageDetail(state, item.stageId ?? activeStageId).lastUpdatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </MobileSection>
      </div>
    );
  }

  function renderProjectSummaryScreen() {
    const nextStage = projectStages[0] ?? null;

    return (
      <div className="space-y-4">
        <div className="px-1">
          <h1 className={typographyScale.pageTitle}>{project.name}</h1>
          <p className={typographyScale.helper}>{project.location} · mobile project summary</p>
        </div>

        <MobileSection title="Project summary">
          <div className={`${surfacePatterns.interactive} px-4 py-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-neutral-100">{project.name}</div>
                <div className="mt-1 text-2xl font-black tracking-tight text-neutral-50">{currency.format(fundingSummary.releasableFunds)}</div>
                <div className="mt-1 text-sm text-neutral-400">Ready to release across current stages</div>
              </div>
              <span className={`${badgePatterns.base} ${fundingSummary.frozenFunds > 0 ? "border-amber-700 bg-amber-950/35 text-amber-200" : "border-green-700 bg-green-950/35 text-green-200"}`}>
                {fundingSummary.frozenFunds > 0 ? "Attention" : "Healthy"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl bg-neutral-950/80 px-3 py-3">
                <div className="text-neutral-500">WIP</div>
                <div className="mt-1 font-semibold text-neutral-100">{currency.format(fundingSummary.wipTotal)}</div>
              </div>
              <div className="rounded-2xl bg-neutral-950/80 px-3 py-3">
                <div className="text-neutral-500">On hold</div>
                <div className="mt-1 font-semibold text-neutral-100">{currency.format(fundingSummary.frozenFunds)}</div>
              </div>
              <div className="rounded-2xl bg-neutral-950/80 px-3 py-3">
                <div className="text-neutral-500">Stages</div>
                <div className="mt-1 font-semibold text-neutral-100">{projectStages.length}</div>
              </div>
            </div>
            <div className={layoutPatterns.cardFooterRow}>
              <span>{stageStep?.stepLabel ?? stageDetail.operationalStatus.label}</span>
              <button className={buttonPatterns.primary} onClick={() => setProjectScreen("stages")}>Open contracts</button>
            </div>
          </div>
        </MobileSection>

        {nextStage ? (
          <MobileSection title="Current focus">
            <button
              type="button"
              onClick={() => openStage(nextStage.id, "overview")}
              className={`${surfacePatterns.interactive} w-full px-4 py-4 text-left`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-100">{nextStage.name}</div>
                  <div className="mt-1 text-sm text-neutral-400">{nextStage.description}</div>
                </div>
                <span className={`${badgePatterns.base} ${statusClass(nextStage.status)}`}>{nextStage.status.replaceAll("_", " ")}</span>
              </div>
              <div className={layoutPatterns.cardFooterRow}>
                <span>{currency.format(nextStage.requiredAmount)}</span>
                <span>{formatReadOnlyDate(nextStage.plannedEndDate)}</span>
              </div>
            </button>
          </MobileSection>
        ) : null}
      </div>
    );
  }

  function renderStagesScreen() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className={typographyScale.pageTitle}>Contracts</h1>
            <p className={typographyScale.helper}>Dark branded stage cards mapped from the selected project.</p>
          </div>
          <button className={buttonPatterns.subtle} onClick={() => setProjectScreen("summary")}>Back</button>
        </div>
        <div className="space-y-3">
          {projectStages.map((stage) => {
            const detail = getStageDetail(state, stage.id);
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => openStage(stage.id, "overview")}
                className={`${surfacePatterns.interactive} w-full px-4 py-4 text-left`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">{stage.name}</div>
                    <div className="mt-1 text-lg font-black tracking-tight text-neutral-50">{currency.format(stage.requiredAmount)}</div>
                    <div className="mt-1 text-sm text-neutral-400">{stage.contractorName ?? "Contractor pending"} · {stage.subcontractorName ?? "Subcontractor pending"}</div>
                  </div>
                  <span className={`${badgePatterns.base} ${statusClass(stage.status)}`}>{stage.status.replaceAll("_", " ")}</span>
                </div>
                <div className="mt-3 rounded-2xl bg-neutral-950/80 px-3 py-3 text-sm text-neutral-300">
                  {detail.operationalStatus.reason}
                </div>
                <div className={layoutPatterns.cardFooterRow}>
                  <span>{formatReadOnlyDate(stage.plannedStartDate)} to {formatReadOnlyDate(stage.plannedEndDate)}</span>
                  <span>{detail.releaseSummary.decisionLabel ?? detail.releaseDecision.explanation.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStageScreen() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className={typographyScale.pageTitle}>{stageDetail.stage.name}</h1>
            <p className={typographyScale.helper}>{project.name} · {project.location}</p>
          </div>
          <button className={buttonPatterns.subtle} onClick={() => setProjectScreen("stages")}>Back</button>
        </div>

        <MobileSection title="Stage">
          <div className="space-y-3">
            <div className="text-sm text-neutral-300">{stageDetail.stageDescription}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-neutral-950/80 px-3 py-3">
                <div className="text-neutral-500">Value</div>
                <div className="mt-1 font-semibold text-neutral-100">{currency.format(stageDetail.stage.requiredAmount)}</div>
              </div>
              <div className="rounded-2xl bg-neutral-950/80 px-3 py-3">
                <div className="text-neutral-500">Dates</div>
                <div className="mt-1 font-semibold text-neutral-100">{formatReadOnlyDate(stageDetail.plannedStartDate)} to {formatReadOnlyDate(stageDetail.plannedEndDate)}</div>
              </div>
            </div>
          </div>
        </MobileSection>

        <MobileSection title="Assigned role sign-off">
          <div className="space-y-3">
            {stageDetail.approvals.map((approval) => (
              <div key={approval.id} className={`${surfacePatterns.interactive} px-4 py-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">{getUserFacingRoleLabel(approval.role)}</div>
                    <div className="mt-1 text-sm text-neutral-400">{approval.readiness.reasonLabel}</div>
                  </div>
                  <span className={`${badgePatterns.base} ${statusClass(approval.status)}`}>{approval.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => runStageAction(`approval:${approval.role}:approve`, activeStageId, "approvals", (current) => giveApproval(current, activeStageId, approval.role))}
                    disabled={!approval.canAct}
                    className={buttonPatterns.primary}
                  >
                    {approval.approveAction.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = approvalRejectReasons[approval.role] ?? "";
                      if (!reason.trim().length) return;
                      runStageAction(`approval:${approval.role}:reject`, activeStageId, "approvals", (current) => rejectApproval(current, activeStageId, approval.role, reason));
                      setApprovalRejectReasons((current) => ({ ...current, [approval.role]: "" }));
                    }}
                    disabled={!(approvalRejectReasons[approval.role] ?? "").trim().length}
                    className={buttonPatterns.subtle}
                  >
                    {approval.rejectAction.label}
                  </button>
                </div>
                <textarea
                  className="mt-3 min-h-20 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-100"
                  placeholder="Reason if rejecting"
                  value={approvalRejectReasons[approval.role] ?? ""}
                  onChange={(event) => setApprovalRejectReasons((current) => ({ ...current, [approval.role]: event.target.value }))}
                />
              </div>
            ))}
          </div>
        </MobileSection>

        <MobileSection title="Stage files / evidence">
          <div className="space-y-3">
            {stageDetail.evidence.map((item) => (
              <div key={item.id} className={`${surfacePatterns.interactive} px-4 py-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">{item.label}</div>
                    <div className="mt-1 text-sm text-neutral-400">{item.record?.name ?? "Awaiting submission"}</div>
                  </div>
                  <span className={`${badgePatterns.base} ${statusClass(item.record?.status ?? "pending")}`}>
                    {item.record?.status ?? (item.required ? "required" : "optional")}
                  </span>
                </div>
                {(item.actionDescriptors.requires_more || item.actionDescriptors.rejected) ? (
                  <textarea
                    className="mt-3 min-h-20 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-100"
                    placeholder="Reason if asking for more or rejecting"
                    value={evidenceReviewReasons[item.id] ?? ""}
                    onChange={(event) => setEvidenceReviewReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                  />
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.actionDescriptors.accepted ? (
                    <button
                      type="button"
                      className={buttonPatterns.primary}
                      onClick={() => runStageAction(`evidence:${item.id}:accepted`, activeStageId, "evidence", (current) => updateEvidenceStatus(current, item.id, "accepted"))}
                    >
                      {item.actionDescriptors.accepted.label}
                    </button>
                  ) : null}
                  {item.actionDescriptors.requires_more ? (
                    <button
                      type="button"
                      className={buttonPatterns.subtle}
                      disabled={!(evidenceReviewReasons[item.id] ?? "").trim().length}
                      onClick={() =>
                        runStageAction(`evidence:${item.id}:requires_more`, activeStageId, "evidence", (current) =>
                          updateEvidenceStatus(current, item.id, "requires_more", { reason: evidenceReviewReasons[item.id] ?? "" }),
                        )
                      }
                    >
                      {item.actionDescriptors.requires_more.label}
                    </button>
                  ) : null}
                  {item.actionDescriptors.rejected ? (
                    <button
                      type="button"
                      className={buttonPatterns.subtle}
                      disabled={!(evidenceReviewReasons[item.id] ?? "").trim().length}
                      onClick={() =>
                        runStageAction(`evidence:${item.id}:rejected`, activeStageId, "evidence", (current) =>
                          updateEvidenceStatus(current, item.id, "rejected", { reason: evidenceReviewReasons[item.id] ?? "" }),
                        )
                      }
                    >
                      {item.actionDescriptors.rejected.label}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}

            <div className={`${surfacePatterns.inner} px-4 py-4`}>
              <div className="text-sm font-semibold text-neutral-100">Add stage evidence</div>
              <div className="mt-3 space-y-3">
                <input
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-100"
                  placeholder="Evidence title"
                  value={evidenceTitle}
                  onChange={(event) => setEvidenceTitle(event.target.value)}
                  disabled={!stageDetail.availableActions.addEvidence}
                />
                <select
                  className={inputPatterns.mobileSelect}
                  value={evidenceType}
                  onChange={(event) => setEvidenceType(event.target.value as EvidenceType)}
                  disabled={!stageDetail.availableActions.addEvidence}
                >
                  <option value="file">File</option>
                  <option value="form">Form</option>
                </select>
                <button
                  type="button"
                  className={buttonPatterns.primary}
                  disabled={!canAddEvidence}
                  onClick={() => {
                    runStageAction("evidence:add", activeStageId, "evidence", (current) => addEvidence(current, activeStageId, evidenceType, evidenceTitle));
                    setEvidenceTitle("");
                  }}
                >
                  Add evidence
                </button>
              </div>
            </div>
          </div>
        </MobileSection>

        <MobileSection title="What happens next" aside={<span className={`${badgePatterns.base} ${toneClass(stageDetail.attentionReason.tone)}`}>{stageDetail.sectionGuidance[selectedStageSection].status}</span>}>
          <div className={`${surfacePatterns.interactive} px-4 py-4`}>
            <div className="text-sm font-semibold text-neutral-100">{stageStep?.stepLabel ?? stageDetail.operationalStatus.label}</div>
            <div className="mt-2 text-sm text-neutral-400">{stageStep?.supportingSentence ?? stageDetail.sectionGuidance[selectedStageSection].nextStep}</div>
          </div>
        </MobileSection>

        <MobileSection title="Approval path">
          <div className="space-y-2">
            {stageDetail.approvals.map((approval) => (
              <div key={`path-${approval.id}`} className="rounded-2xl bg-neutral-950/80 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-neutral-100">{getUserFacingRoleLabel(approval.role)}</span>
                  <span className={`${badgePatterns.base} ${statusClass(approval.status)}`}>{approval.status}</span>
                </div>
              </div>
            ))}
          </div>
        </MobileSection>

        <MobileSection title="Payment status / action">
          <div className="space-y-3">
            <div className={`${surfacePatterns.interactive} px-4 py-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-100">{stageDetail.releaseDecision.explanation.label}</div>
                  <div className="mt-1 text-sm text-neutral-400">{stageDetail.releaseSummary.headline}</div>
                </div>
                <span className={`${badgePatterns.base} ${stageDetail.blockingRelease ? "border-amber-700 bg-amber-950/35 text-amber-200" : "border-green-700 bg-green-950/35 text-green-200"}`}>
                  {stageDetail.blockingRelease ? "Blocked" : "Ready"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-neutral-950/80 px-3 py-3">
                  <div className="text-neutral-500">Ready</div>
                  <div className="mt-1 font-semibold text-neutral-100">{currency.format(stageDetail.releaseDecision.releasableAmount)}</div>
                </div>
                <div className="rounded-2xl bg-neutral-950/80 px-3 py-3">
                  <div className="text-neutral-500">Hold</div>
                  <div className="mt-1 font-semibold text-neutral-100">{currency.format(stageDetail.releaseDecision.frozenAmount)}</div>
                </div>
                <div className="rounded-2xl bg-neutral-950/80 px-3 py-3">
                  <div className="text-neutral-500">Progress</div>
                  <div className="mt-1 font-semibold text-neutral-100">{currency.format(stageDetail.releaseDecision.blockedAmount)}</div>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              {stageDetail.actionDescriptorMap["fund-stage"] ? (
                <button type="button" className={buttonPatterns.subtle} disabled={!canFundStage} onClick={() => runStageAction("funding:allocate", activeStageId, "funding", (current) => allocateStageFunds(current, activeStageId))}>
                  {stageDetail.actionDescriptorMap["fund-stage"].label}
                </button>
              ) : null}
              {stageDetail.actionDescriptorMap["release"] ? (
                <button type="button" className={buttonPatterns.primary} disabled={!canReleaseStage} onClick={() => runStageAction("release:execute", activeStageId, "release", (current) => releaseStage(current, activeStageId))}>
                  {stageDetail.actionDescriptorMap["release"].label}
                </button>
              ) : null}
            </div>
            {stageDetail.actionDescriptorMap["apply-override"] ? (
              <div className={`${surfacePatterns.inner} px-4 py-4`}>
                <div className="text-sm font-semibold text-neutral-100">Override</div>
                <textarea
                  className="mt-3 min-h-20 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-100"
                  placeholder="Override reason"
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                />
                <button type="button" className={`mt-3 ${buttonPatterns.subtle}`} disabled={!canApplyOverride} onClick={() => {
                  runStageAction("release:override", activeStageId, "release", (current) => applyOverride(current, activeStageId, overrideReason));
                  setOverrideReason("");
                }}>
                  {stageDetail.actionDescriptorMap["apply-override"].label}
                </button>
              </div>
            ) : null}
          </div>
        </MobileSection>

        <MobileSection title="Recorded activity">
          <div className="space-y-3">
            {stageDetail.timelineEntries.map((entry) => (
              <div key={entry.id} className={`${surfacePatterns.interactive} px-4 py-4`}>
                <div className="text-sm font-semibold text-neutral-100">{entry.headline}</div>
                {entry.detail ? <div className="mt-1 text-sm text-neutral-400">{entry.detail}</div> : null}
                <div className={layoutPatterns.cardFooterRow}>
                  <span>{entry.actorLabel ?? "System"}</span>
                  <span>{entry.timestampLabel}</span>
                </div>
              </div>
            ))}
            {stageDetail.timelineEntries.length === 0 ? (
              <div className="rounded-2xl bg-neutral-950/80 px-4 py-4 text-sm text-neutral-400">No stage activity recorded yet.</div>
            ) : null}
          </div>
        </MobileSection>
      </div>
    );
  }

  function renderFundsScreen() {
    return (
      <div className="space-y-4">
        <div className="px-1">
          <h1 className={typographyScale.pageTitle}>Funds</h1>
          <p className={typographyScale.helper}>Project-level funds remapped into compact mobile finance blocks.</p>
        </div>
        <MobileSection title="Project funds">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-neutral-950/80 px-4 py-4">
              <div className="text-neutral-500">Balance</div>
              <div className="mt-1 text-lg font-semibold text-neutral-100">{currency.format(fundingSummary.projectBalance)}</div>
            </div>
            <div className="rounded-2xl bg-neutral-950/80 px-4 py-4">
              <div className="text-neutral-500">Ready</div>
              <div className="mt-1 text-lg font-semibold text-neutral-100">{currency.format(fundingSummary.releasableFunds)}</div>
            </div>
            <div className="rounded-2xl bg-neutral-950/80 px-4 py-4">
              <div className="text-neutral-500">On hold</div>
              <div className="mt-1 text-lg font-semibold text-neutral-100">{currency.format(fundingSummary.frozenFunds)}</div>
            </div>
            <div className="rounded-2xl bg-neutral-950/80 px-4 py-4">
              <div className="text-neutral-500">In progress</div>
              <div className="mt-1 text-lg font-semibold text-neutral-100">{currency.format(fundingSummary.inProgressFunds)}</div>
            </div>
          </div>
        </MobileSection>
        <MobileSection title="Add funds">
          <div className="space-y-3">
            <input
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-neutral-100"
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
              inputMode="numeric"
              placeholder="Amount"
            />
            <select
              className={inputPatterns.mobileSelect}
              value={fundingSource}
              onChange={(event) => setFundingSource(event.target.value as FundingSourceType | "")}
            >
              <option value="">Select source</option>
              <option value="funder">Funder</option>
              <option value="contractor">Contractor</option>
            </select>
            <button
              type="button"
              className={buttonPatterns.primary}
              disabled={!canDeposit}
              onClick={() => {
                const amount = Number(depositAmount);
                if (!Number.isFinite(amount) || amount <= 0 || (fundingSource !== "funder" && fundingSource !== "contractor")) return;
                setState((current) => depositFunds(current, project.id, amount, fundingSource, fundingSource === "contractor" ? activeStageId : undefined));
              }}
            >
              Add funds
            </button>
          </div>
        </MobileSection>
      </div>
    );
  }

  function renderAccountScreen() {
    return (
      <div className="space-y-4">
        <div className="px-1">
          <h1 className={typographyScale.pageTitle}>Account</h1>
          <p className={typographyScale.helper}>Compact role and project context view for the mobile shell.</p>
        </div>
        <MobileSection title="Current account">
          <div className={`${surfacePatterns.interactive} px-4 py-4`}>
            <div className="text-sm font-semibold text-neutral-100">{currentUser.name}</div>
            <div className="mt-1 text-lg font-black tracking-tight text-neutral-50">{getUserFacingRoleLabel(currentUser.role)}</div>
            <div className="mt-2 text-sm text-neutral-400">Project context: {project.name}</div>
            <div className={layoutPatterns.cardFooterRow}>
              <span>{project.location}</span>
              <span>{stageDetail.stage.name}</span>
            </div>
          </div>
        </MobileSection>
      </div>
    );
  }

  let screenContent: React.ReactNode;
  if (activeTab === "notifications") {
    screenContent = renderNotificationsScreen();
  } else if (activeTab === "funds") {
    screenContent = renderFundsScreen();
  } else if (activeTab === "account") {
    screenContent = renderAccountScreen();
  } else if (projectScreen === "stages") {
    screenContent = renderStagesScreen();
  } else if (projectScreen === "stage") {
    screenContent = renderStageScreen();
  } else {
    screenContent = renderProjectSummaryScreen();
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gradient-to-b from-neutral-950 via-neutral-925 to-black px-4 pb-24 pt-5 text-neutral-100">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">Shure.Fund</div>
          <div className="mt-1 text-sm text-neutral-400">Mobile workflow shell</div>
        </div>
        <select
          className="rounded-2xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
          value={project.id}
          onChange={(event) => {
            setSelectedProjectId(event.target.value);
            setProjectScreen("summary");
            setActiveTab("projects");
          }}
        >
          {state.projects.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.name}</option>
          ))}
        </select>
      </div>

      {screenContent}

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-neutral-800 bg-neutral-950/95 px-3 py-3 backdrop-blur">
        <div className="grid grid-cols-4 gap-2">
          {navItems.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveTab(item.key);
                  if (item.key === "projects" && projectScreen === "stage") {
                    setProjectScreen("summary");
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium ${
                  active ? "bg-blue-700 text-white" : "text-neutral-400"
                }`}
              >
                <div className="relative">
                  <Image src={item.icon} alt="" width={16} height={16} className="h-4 w-4" aria-hidden />
                  {item.key === "notifications" && notifications.length > 0 ? (
                    <span className="absolute -right-2 -top-2 rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
                      {notifications.length}
                    </span>
                  ) : null}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
