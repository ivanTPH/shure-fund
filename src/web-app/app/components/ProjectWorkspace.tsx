"use client";

import React from "react";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import type { ActionQueueItem, PaymentBlockingReason, ProjectWorkspaceModel, WorkflowProgressLabel } from "@/lib/systemState";

type ProjectWorkspaceProps = {
  projectName: string;
  workspace: ProjectWorkspaceModel;
  onSelectStage: (stageId: string) => void;
  onOpenEvidenceReview: (stageId: string) => void;
  onOpenStageReview: (stageId: string) => void;
  onHandleAction: (action: ActionQueueItem) => void;
  actionQueue: ActionQueueItem[];
  formatGBP: (value: number) => string;
  formatRequiredRole: (role?: PaymentBlockingReason["nextRequiredRole"]) => string | null;
};

function stateTone(label: WorkflowProgressLabel) {
  switch (label) {
    case "Approved":
    case "Ready for approval":
    case "Ready for release":
    case "Released":
      return "border-green-200 bg-green-50 text-green-700";
    case "Blocked":
      return "border-red-200 bg-red-50 text-red-700";
    case "Waiting":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "In review":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function renderStateBadge(label: WorkflowProgressLabel, compact = false) {
  return (
    <span className={`rounded-full border px-2 py-1 font-medium ${compact ? "text-[11px]" : "text-xs"} ${stateTone(label)}`}>
      {label}
    </span>
  );
}

export default function ProjectWorkspace({
  projectName,
  workspace,
  onSelectStage,
  onOpenEvidenceReview,
  onOpenStageReview,
  onHandleAction,
  actionQueue,
  formatGBP,
  formatRequiredRole,
}: ProjectWorkspaceProps) {
  const selected = workspace.selectedStage;
  const primaryAction = selected?.releaseDecision.nextAction
    ? actionQueue.find(
        (action) =>
          action.stageId === selected.stage.id && action.actionKey === selected.releaseDecision.nextAction?.nextRecommendedAction,
      ) ?? null
    : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
      <section className="rounded-3xl bg-white px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Stages</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a stage to see what it needs next.</p>
          </div>
          <span className="text-xs text-slate-500">{workspace.stages.length} total</span>
        </div>
        <div className="space-y-2">
          {workspace.stages.map((stage) => {
            const isSelected = stage.id === selected?.stage.id;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onSelectStage(stage.id)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition-all duration-150 ease-out ${
                  isSelected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-900"}`}>{stage.name}</div>
                  </div>
                  {stage.isReady ? (
                    <CheckCircle2 size={16} className={isSelected ? "text-green-300" : "text-green-600"} />
                  ) : stage.hasWarning ? (
                    <AlertCircle size={16} className={isSelected ? "text-amber-300" : "text-amber-600"} />
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {renderStateBadge(stage.workflowState, true)}
                  {renderStateBadge(stage.evidenceState, true)}
                  {renderStateBadge(stage.approvalState, true)}
                  {renderStateBadge(stage.fundingState, true)}
                  {renderStateBadge(stage.releaseState, true)}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Selected stage</div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{selected.stage.name}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {renderStateBadge(selected.workflowState)}
                  {renderStateBadge(selected.releaseState)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <div className="text-sm text-slate-500">Stage value</div>
                <div className="mt-1 text-3xl font-semibold text-slate-950">{formatGBP(selected.stage.value)}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">Summary</div>
                <div className="mt-2 text-sm text-slate-600">
                  {selected.stage.plannedStart} to {selected.stage.plannedEnd} · Progress {selected.stage.progressPercent}%
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  Workflow {selected.workflowState} · Evidence {selected.evidenceState} · Approval {selected.approvalState}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">Contract context</div>
                <div className="mt-2 space-y-2 text-sm text-slate-600">
                  {selected.commercialContext.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">Evidence</div>
                <div className="mt-3 space-y-2">
                  {selected.evidenceItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{item.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.type}{item.required ? " · Required" : ""}</div>
                      </div>
                      {renderStateBadge(
                        item.status === "accepted"
                          ? "Approved"
                          : item.status === "rejected"
                          ? "Blocked"
                          : item.status === "missing"
                          ? "Waiting"
                          : "In review",
                        true,
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">Approvals</div>
                <div className="mt-3 space-y-2">
                  {selected.approvals.map((approval) => (
                    <div key={approval.role} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3">
                      <div className="text-sm font-medium capitalize text-slate-900">{approval.role}</div>
                      {renderStateBadge(approval.status, true)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">Funding cover</div>
                <div className="mt-2 text-sm text-slate-600">
                  {selected.fundingSummary
                    ? `${formatGBP(selected.fundingSummary.allocated)} in place · ${formatGBP(selected.fundingSummary.remainingRequirement)} still needed`
                    : "Funding details are not ready yet for this stage."}
                </div>
                <div className="mt-3">{renderStateBadge(selected.fundingState)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">Release summary</div>
                {selected.releaseDecision.blockers.length === 0 ? (
                  <div className="mt-2 text-sm text-slate-600">This stage is ready to move forward.</div>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    {selected.releaseDecision.blockers.map((reason) => (
                      <li key={reason.code}>
                        {reason.label}
                        {reason.nextRequiredRole ? ` · Owner: ${formatRequiredRole(reason.nextRequiredRole)}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Select a stage to continue in {projectName}.</div>
        )}
      </section>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Action panel</div>
          {selected ? (
            <>
              <div className="mt-3 text-lg font-semibold text-slate-950">Next step</div>
              <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-base font-semibold text-slate-900">{selected.releaseDecision.nextAction?.label ?? "Nothing needed right now"}</div>
                <div className="mt-1 text-sm text-slate-500">
                  Owner: {selected.releaseDecision.nextAction?.nextRequiredRole ? formatRequiredRole(selected.releaseDecision.nextAction.nextRequiredRole) : "None"}
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
                <div className="font-semibold text-slate-900">What is in the way</div>
                {selected.releaseDecision.blockers.length === 0 ? (
                  <div className="mt-2 text-sm text-slate-600">Nothing is in the way.</div>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    {selected.releaseDecision.blockers.map((reason) => (
                      <li key={reason.code}>{reason.label}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {primaryAction ? (
                  <button type="button" className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" onClick={() => onHandleAction(primaryAction)}>
                    {primaryAction.title}
                  </button>
                ) : (
                  <button type="button" className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" onClick={() => onOpenStageReview(selected.stage.id)}>
                    Open review
                  </button>
                )}
                <button type="button" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => onOpenEvidenceReview(selected.stage.id)}>
                  Check evidence
                </button>
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Select a stage to see its next action, owner, blockers, and CTAs.</div>
          )}
        </section>
      </aside>
    </div>
  );
}
