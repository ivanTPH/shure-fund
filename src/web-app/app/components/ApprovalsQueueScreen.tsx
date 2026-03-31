"use client";

import React from "react";
import type { ActionQueueItem } from "@/lib/systemState";
import type { ApprovalRole, StageRecord } from "@/lib/stageStore";

type ApprovalsQueueScreenProps = {
  approvalItems: ActionQueueItem[];
  activeProjectName: string;
  getStageById: (stageId: string) => StageRecord | null;
  formatGBP: (value: number) => string;
  formatRequiredRole: (role?: ActionQueueItem["requiredRole"]) => string | null;
  onHandleAction: (action: ActionQueueItem) => void;
  onApprovalReview: (stageId: string, role: ApprovalRole, action: "approve" | "reject" | "request-more") => void;
};

export default function ApprovalsQueueScreen({
  approvalItems,
  activeProjectName,
  getStageById,
  formatGBP,
  formatRequiredRole,
  onHandleAction,
  onApprovalReview,
}: ApprovalsQueueScreenProps) {
  return (
    <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Approval queue</h2>
          <p className="mt-1 text-sm text-slate-500">See only the items waiting for your decision.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
          {approvalItems.length} waiting
        </span>
      </div>

      {approvalItems.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Nothing is waiting for your sign-off.</div>
      ) : (
        <div className="space-y-3">
          {approvalItems.map((action) => {
            const stage = action.stageId ? getStageById(action.stageId) : null;
            const role = action.requiredRole;

            return (
              <div key={action.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">{action.stageName ?? action.title}</div>
                <div className="mt-1 text-sm text-slate-500">{activeProjectName}{stage ? ` · ${stage.name}` : ""}</div>
                <div className="mt-1 text-sm text-slate-500">{stage ? formatGBP(stage.value) : ""}</div>
                <div className="mt-3 text-sm text-slate-700">{action.detail}</div>
                <div className="mt-2 text-xs text-slate-500">
                  Owner: {role ? formatRequiredRole(role) : action.owner}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => onHandleAction(action)}>
                    Approve
                  </button>
                  {stage && role && (role === "professional" || role === "commercial" || role === "treasury") ? (
                    <>
                      <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => onApprovalReview(stage.id, role, "reject")}>
                        Reject
                      </button>
                      <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => onApprovalReview(stage.id, role, "request-more")}>
                        Ask for changes
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
