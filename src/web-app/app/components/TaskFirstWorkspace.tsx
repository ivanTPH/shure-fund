"use client";

import React from "react";
import { Clock3, ShieldCheck } from "lucide-react";
import ApprovalsQueueScreen from "./ApprovalsQueueScreen";
import AuditLogScreen from "./AuditLogScreen";
import AppSidebar, { type AppShellView } from "./AppSidebar";
import PaymentsScreen from "./PaymentsScreen";
import ProjectWorkspace from "./ProjectWorkspace";
import ProjectsIndexScreen from "./ProjectsIndexScreen";
import SettingsScreen from "./SettingsScreen";
import TaskListPanel from "./TaskListPanel";
import type { AuditLogEntry, ContractRecord, StageRecord } from "@/lib/stageStore";
import type {
  ActionQueueItem,
  DashboardStatusItem,
  HomeTaskItem,
  HomeTaskSections,
  PaymentBlockingReason,
  ProjectOverviewModel,
  ReleaseStageDecision,
  Role,
  WorkflowProgressLabel,
  ProjectWorkspaceModel,
  WorkflowStateSummary,
} from "@/lib/systemState";

type VerificationBadge = {
  label: string;
  className: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

type TaskFirstWorkspaceProps = {
  activeAppView: AppShellView;
  onChangeView: (view: AppShellView) => void;
  selectedRole: Role;
  onChangeRole: (role: Role) => void;
  roleOptions: Array<{ value: Role; label: string }>;
  currentRoleLabel: string;
  projectDetailMode?: boolean;
  activeProject: ProjectOverviewModel["project"];
  activeProjectModel: ProjectOverviewModel;
  portfolioOverview: { projects: ProjectOverviewModel[] };
  overviewStatusItems: DashboardStatusItem[];
  fundsVerification: VerificationBadge;
  controlsVerification: VerificationBadge;
  lastSyncLabel: string;
  actionMessage: string | null;
  isPageReady: boolean;
  isViewTransitioning: boolean;
  homeTaskSections: HomeTaskSections;
  recentCompletedItems: HomeTaskItem[];
  reviewItems: StageRecord[];
  approvalItems: ActionQueueItem[];
  paymentReadyItems: ReleaseStageDecision[];
  paymentBlockedItems: ReleaseStageDecision[];
  releasedPaymentHistory: AuditLogEntry[];
  selectedContractSummary: {
    contract: ContractRecord;
    stages: StageRecord[];
    totalStageValue: number;
    releasableStages: number;
    blockedStages: number;
  } | null;
  selectedContractForAdmin: ContractRecord | null;
  selectedAdminStage: StageRecord | null;
  selectedAdminStageDecision: ReleaseStageDecision | null;
  selectedAdminWorkflow: WorkflowStateSummary | null;
  projectWorkspace: ProjectWorkspaceModel;
  fundingAssurance: ProjectOverviewModel["funding"];
  funding: ProjectOverviewModel["funding"]["position"];
  filteredAuditLog: AuditLogEntry[];
  auditLog: AuditLogEntry[];
  auditStageFilter: string;
  auditActionTypeFilter: string;
  auditRoleFilter: string;
  auditStageOptions: Array<{ value: string; label: string }>;
  auditActionTypeOptions: string[];
  actionTypeLabels: Record<string, string>;
  onUpdateAuditFilters: (nextFilters: { stage?: string; actionType?: string; role?: string }) => void;
  onSelectProject: (projectId: string) => void;
  onSelectContract: (contractId: string) => void;
  onSelectStage: (stageId: string) => void;
  onOpenStageWorkspace: (projectId: string, stageId?: string | null, view?: AppShellView) => void;
  onOpenEvidenceReview: (stageId: string) => void;
  onOpenStageReview: (stage: StageRecord) => void;
  onHandleAction: (action: ActionQueueItem) => void;
  onFundingAction: (action: "add-funds" | "adjust-buffer" | "allocate", stageId?: string) => void;
  onApprovalReview: (stageId: string, role: "professional" | "commercial" | "treasury", action: "approve" | "reject" | "request-more") => void;
  getStageById: (stageId: string) => StageRecord | null;
  formatGBP: (value: number) => string;
  formatTimestamp: (timestamp: string) => string;
  formatAuditState: (state: AuditLogEntry["newState"]) => string;
  formatRequiredRole: (role?: PaymentBlockingReason["nextRequiredRole"]) => string | null;
  getGapDescriptor: (gapToRequiredCover: number, canProceed: boolean, hasFundingData?: boolean) => string;
  deriveWorkflowProgressTone: (label: WorkflowProgressLabel) => string;
};

export default function TaskFirstWorkspace({
  activeAppView,
  onChangeView,
  selectedRole,
  onChangeRole,
  roleOptions,
  currentRoleLabel,
  projectDetailMode = false,
  activeProject,
  activeProjectModel,
  portfolioOverview,
  overviewStatusItems,
  fundsVerification,
  controlsVerification,
  lastSyncLabel,
  actionMessage,
  isPageReady,
  isViewTransitioning,
  homeTaskSections,
  recentCompletedItems,
  reviewItems,
  approvalItems,
  paymentReadyItems,
  paymentBlockedItems,
  releasedPaymentHistory,
  selectedContractSummary,
  selectedContractForAdmin,
  selectedAdminStage,
  selectedAdminStageDecision,
  selectedAdminWorkflow,
  projectWorkspace,
  fundingAssurance,
  funding,
  filteredAuditLog,
  auditLog,
  auditStageFilter,
  auditActionTypeFilter,
  auditRoleFilter,
  auditStageOptions,
  auditActionTypeOptions,
  actionTypeLabels,
  onUpdateAuditFilters,
  onSelectProject,
  onSelectContract,
  onSelectStage,
  onOpenStageWorkspace,
  onOpenEvidenceReview,
  onOpenStageReview,
  onHandleAction,
  onFundingAction,
  onApprovalReview,
  getStageById,
  formatGBP,
  formatTimestamp,
  formatAuditState,
  formatRequiredRole,
  getGapDescriptor,
  deriveWorkflowProgressTone,
}: TaskFirstWorkspaceProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <AppSidebar activeView={activeAppView} onChange={onChangeView} />
        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${fundsVerification.className}`}>
                  <fundsVerification.Icon size={12} />
                  Funds verified
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${controlsVerification.className}`}>
                  <controlsVerification.Icon size={12} />
                  All controls active
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                  <Clock3 size={12} />
                  Last sync: {lastSyncLabel}
                </span>
              </div>
              <div className="text-xs text-slate-500">All actions are logged. Controlled release records update immediately.</div>
            </div>
          </header>

          <main className={`mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 transition-all duration-150 ease-out sm:px-6 ${
            isViewTransitioning ? "translate-y-1 opacity-90" : "translate-y-0 opacity-100"
          }`}>
            <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {activeAppView === "home"
                      ? "Home"
                      : activeAppView === "projects"
                      ? "Projects"
                      : activeAppView === "contracts"
                      ? "Contracts"
                      : activeAppView === "funding"
                      ? "Funding"
                      : activeAppView === "reviews"
                      ? "Reviews"
                      : activeAppView === "approvals"
                      ? "Approvals"
                      : activeAppView === "payments"
                      ? "Payments"
                      : activeAppView === "audit"
                      ? "Audit Log"
                      : "Settings"}
                  </div>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {activeAppView === "home"
                      ? "What needs your attention"
                      : activeAppView === "projects"
                      ? projectDetailMode
                        ? activeProject.name
                        : "Projects"
                      : activeAppView === "contracts"
                      ? "Contract setup and stage breakdown"
                      : activeAppView === "funding"
                      ? "Funding cover and cash control"
                      : activeAppView === "reviews"
                      ? "Evidence and review work"
                      : activeAppView === "approvals"
                      ? "Approval queue"
                      : activeAppView === "payments"
                      ? "Payment release control"
                      : activeAppView === "audit"
                      ? "Audit log"
                      : "Settings"}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    {activeAppView === "home"
                      ? "Start with what needs attention now, what is waiting for your sign-off, and what has already been finished."
                      : activeAppView === "projects"
                      ? projectDetailMode
                        ? "Open one stage at a time to see its status, what is holding it up, and what to do next."
                        : "Choose a project to open its workspace."
                      : activeAppView === "contracts"
                      ? "Review contracts, stage plans, and changes."
                      : activeAppView === "funding"
                      ? "Check ringfenced funds, cover needed, and any missing funding information."
                      : activeAppView === "reviews"
                      ? "Review the items holding work in review."
                      : activeAppView === "approvals"
                      ? "See only the approvals that need your decision."
                      : activeAppView === "payments"
                      ? "See what is ready to release, what is blocked, and what has already been paid."
                      : activeAppView === "audit"
                      ? "See a clear record of what changed and when."
                      : "Adjust your view and workspace settings."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-600">
                    Current role
                    <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900" value={selectedRole} onChange={(e) => onChangeRole(e.target.value as Role)}>
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-600">
                    Current project
                    <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900" value={activeProject.id} onChange={(e) => onSelectProject(e.target.value)}>
                      {portfolioOverview.projects.map((projectModel) => (
                        <option key={projectModel.project.id} value={projectModel.project.id}>{projectModel.project.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </section>

            {actionMessage ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck size={16} className="text-blue-600" />
                  {actionMessage}
                </div>
                <div className="mt-1 text-xs text-blue-700">Record updated. All changes are logged in the audit trail.</div>
              </div>
            ) : null}

            {activeAppView === "home" ? (
              <>
                <TaskListPanel
                  title="Needs my action now"
                  description="Start here. These items need action now."
                  items={homeTaskSections.needsMyActionNow}
                  emptyMessage="Nothing needs attention right now."
                  onSelect={(item) => onOpenStageWorkspace(item.projectId, item.stageId, "projects")}
                  ctaLabel="Open"
                  emphasis="primary"
                  maxVisible={4}
                  onViewAll={() => onChangeView("projects")}
                />

                <div className="grid gap-5">
                  <TaskListPanel
                    title="Waiting on others"
                    description="These items are moving, but someone else needs to act next."
                    items={homeTaskSections.waitingOnOthers}
                    emptyMessage="Nothing is waiting on someone else right now."
                    onSelect={(item) => onOpenStageWorkspace(item.projectId, item.stageId, "projects")}
                    ctaLabel="View"
                    maxVisible={4}
                    onViewAll={() => onChangeView("projects")}
                  />
                </div>

                <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">Recently completed</h2>
                    <p className="mt-1 text-sm text-slate-500">Latest approvals, fixes, and releases.</p>
                  </div>
                  {recentCompletedItems.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No completed activity has been recorded yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {recentCompletedItems.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onOpenStageWorkspace(item.projectId, item.stageId, "audit")}
                          className="flex w-full items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-all duration-150 ease-out hover:border-slate-300 hover:bg-white"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">{item.projectName}{item.stageName ? ` / ${item.stageName}` : ""}</div>
                            <div className="mt-1 text-sm text-slate-600">{item.summary}</div>
                            <div className="mt-2 text-xs text-slate-500">
                              Completed by {item.ownerLabel}
                              {item.amount ? ` · £${Math.round(item.amount).toLocaleString("en-GB")}` : ""}
                            </div>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-xs font-medium ${deriveWorkflowProgressTone(item.statusLabel)}`}>{item.statusLabel}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {recentCompletedItems.length > 4 ? (
                    <div className="mt-4">
                      <button type="button" className="text-sm font-semibold text-slate-700 hover:text-slate-950" onClick={() => onChangeView("audit")}>
                        View all
                      </button>
                    </div>
                  ) : null}
                </section>

                {isPageReady ? (
                  <section className="rounded-3xl bg-white px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="mr-2 text-sm font-semibold text-slate-900">Portfolio status</div>
                      {overviewStatusItems.map((item) => (
                        <div
                          key={item.label}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                            item.tone === "healthy"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : item.tone === "at-risk"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : item.tone === "blocked"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-blue-200 bg-blue-50 text-blue-700"
                          }`}
                        >
                          <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{item.label}</span>
                          <span className="font-semibold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}

            {activeAppView === "projects" ? (
              projectDetailMode ? (
                <ProjectWorkspace
                  projectName={activeProject.name}
                  workspace={projectWorkspace}
                  onSelectStage={onSelectStage}
                  onOpenEvidenceReview={onOpenEvidenceReview}
                  onOpenStageReview={(stageId) => {
                    const stage = getStageById(stageId);
                    if (stage) {
                      onOpenStageReview(stage);
                    }
                  }}
                  onHandleAction={onHandleAction}
                  actionQueue={activeProjectModel.actionQueue}
                  formatGBP={formatGBP}
                  formatRequiredRole={formatRequiredRole}
                />
              ) : (
                <ProjectsIndexScreen
                  projects={portfolioOverview.projects}
                  selectedRole={selectedRole}
                  onOpenProject={onSelectProject}
                  formatGBP={formatGBP}
                />
              )
            ) : null}

            {activeAppView === "contracts" ? (
              <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                <section className="rounded-3xl bg-white px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <h2 className="text-lg font-semibold text-slate-900">Contracts</h2>
                  <div className="mt-3 space-y-2">
                    {activeProjectModel.contractAdministration.summaries.map((summary) => (
                      <button key={summary.contract.id} type="button" onClick={() => onSelectContract(summary.contract.id)} className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left transition-all duration-150 ease-out hover:bg-white">
                        <div className="text-sm font-semibold text-slate-900">{summary.contract.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{formatGBP(summary.totalStageValue)} · {summary.stages.length} stages</div>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  {selectedContractSummary ? (
                    <>
                      <h2 className="text-2xl font-semibold text-slate-950">{selectedContractSummary.contract.title}</h2>
                      <p className="mt-2 text-sm text-slate-500">{selectedContractSummary.contract.summary}</p>
                      <div className="mt-5 space-y-2">
                        {selectedContractSummary.stages.map((stage) => (
                          <button key={stage.id} type="button" onClick={() => onOpenStageWorkspace(activeProject.id, stage.id, "projects")} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-all duration-150 ease-out hover:border-slate-300 hover:bg-white">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{stage.name}</div>
                              <div className="mt-1 text-sm text-slate-500">{formatGBP(stage.value)}</div>
                            </div>
                            <span className={`rounded-full border px-2 py-1 text-xs font-medium ${deriveWorkflowProgressTone("In review")}`}>In review</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </section>
              </div>
            ) : null}

            {activeAppView === "funding" ? (
              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <h2 className="text-xl font-semibold text-slate-900">Funding summary</h2>
                  {!fundingAssurance.hasFundingData ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">Funding information is missing. Check ringfenced funds before work moves on.</div>
                  ) : null}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-4"><div className="text-sm text-slate-500">Ringfenced funds</div><div className="mt-2 text-3xl font-semibold text-slate-950">{formatGBP(funding.available)}</div></div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-4"><div className="text-sm text-slate-500">Cover needed</div><div className="mt-2 text-3xl font-semibold text-slate-950">{formatGBP(funding.totalRequiredWithBuffer)}</div></div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-4"><div className="text-sm text-slate-500">Reserve buffer</div><div className="mt-2 text-3xl font-semibold text-slate-950">{formatGBP(funding.reserveBuffer)}</div></div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-4"><div className="text-sm text-slate-500">{funding.gapToRequiredCover > 0 ? "Gap to cover" : "Surplus"}</div><div className={`mt-2 text-3xl font-semibold ${funding.gapToRequiredCover > 0 ? "text-red-600" : "text-green-600"}`}>{formatGBP(funding.gapToRequiredCover > 0 ? funding.gapToRequiredCover : Math.max(funding.available - funding.totalRequiredWithBuffer, 0))}</div></div>
                  </div>
                  <div className="mt-4 text-sm text-slate-500">{getGapDescriptor(funding.gapToRequiredCover, funding.canProceed, fundingAssurance.hasFundingData)}</div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" onClick={() => onFundingAction("add-funds")}>Add funds</button>
                    <button type="button" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => onFundingAction("adjust-buffer")}>Adjust buffer</button>
                    <button type="button" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => onChangeView("payments")}>Open payments</button>
                  </div>
                </section>
                <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <h2 className="text-xl font-semibold text-slate-900">By stage</h2>
                  <div className="mt-4 space-y-2">
                    {fundingAssurance.stageForecasts.map((forecast) => (
                      <div key={forecast.stageId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{forecast.stageName}</div>
                            <div className="mt-1 text-sm text-slate-500">Need {formatGBP(forecast.remainingRequirement)} · In place {formatGBP(forecast.allocated)}</div>
                          </div>
                          {forecast.shortfall > 0 ? (
                            <button type="button" className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700" onClick={() => onFundingAction("allocate", forecast.stageId)}>Add cover</button>
                          ) : (
                            <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Ready</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {activeAppView === "reviews" ? (
              <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <section className="rounded-3xl bg-white px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <h2 className="text-lg font-semibold text-slate-900">Needs review</h2>
                  <div className="mt-3 space-y-2">
                    {reviewItems.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Nothing is waiting for review right now.</div>
                    ) : reviewItems.map((stage) => (
                      <button key={stage.id} type="button" onClick={() => onSelectStage(stage.id)} className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left transition-all duration-150 ease-out hover:bg-white">
                        <div className="text-sm font-semibold text-slate-900">{stage.name}</div>
                        <div className="mt-1 text-sm text-slate-500">Evidence {stage.evidenceStatus} · Completion {stage.completionState}</div>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  {selectedAdminStage ? (
                    <>
                      <h2 className="text-2xl font-semibold text-slate-950">{selectedAdminStage.name}</h2>
                      <p className="mt-2 text-sm text-slate-500">Evidence is {selectedAdminStage.evidenceStatus}. Open the review panel to approve, reject, or ask for more.</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button type="button" className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" onClick={() => onOpenEvidenceReview(selectedAdminStage.id)}>Check evidence</button>
                        <button type="button" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => onOpenStageReview(selectedAdminStage)}>Open stage</button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Select a review item to continue.</div>
                  )}
                </section>
              </div>
            ) : null}

            {activeAppView === "approvals" ? (
              <ApprovalsQueueScreen
                approvalItems={approvalItems}
                activeProjectName={activeProject.name}
                getStageById={getStageById}
                formatGBP={formatGBP}
                formatRequiredRole={formatRequiredRole}
                onHandleAction={onHandleAction}
                onApprovalReview={onApprovalReview}
              />
            ) : null}

            {activeAppView === "payments" ? (
              <PaymentsScreen
                activeProjectId={activeProject.id}
                paymentReadyItems={paymentReadyItems}
                paymentBlockedItems={paymentBlockedItems}
                releasedPaymentHistory={releasedPaymentHistory}
                getStageById={getStageById}
                formatGBP={formatGBP}
                formatTimestamp={formatTimestamp}
                onOpenStageWorkspace={onOpenStageWorkspace}
              />
            ) : null}

            {activeAppView === "audit" ? (
              <AuditLogScreen
                filteredAuditLog={filteredAuditLog}
                auditLog={auditLog}
                auditStageFilter={auditStageFilter}
                auditActionTypeFilter={auditActionTypeFilter}
                auditRoleFilter={auditRoleFilter}
                auditStageOptions={auditStageOptions}
                auditActionTypeOptions={auditActionTypeOptions}
                actionTypeLabels={actionTypeLabels}
                formatTimestamp={formatTimestamp}
                formatAuditState={formatAuditState}
                getStageLabel={(stageId) => (stageId ? getStageById(stageId)?.name ?? stageId : "System action")}
                onUpdateAuditFilters={onUpdateAuditFilters}
              />
            ) : null}

            {activeAppView === "settings" ? (
              <SettingsScreen
                currentRoleLabel={currentRoleLabel}
                selectedRole={selectedRole}
                roleOptions={roleOptions}
                onChangeRole={onChangeRole}
                onOpenContracts={() => onChangeView("contracts")}
                onOpenAudit={() => onChangeView("audit")}
              />
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
