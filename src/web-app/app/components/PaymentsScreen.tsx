"use client";

import React from "react";
import type { ReleaseStageDecision } from "@/lib/systemState";
import type { AuditLogEntry, StageRecord } from "@/lib/stageStore";

type PaymentsScreenProps = {
  activeProjectId: string;
  paymentReadyItems: ReleaseStageDecision[];
  paymentBlockedItems: ReleaseStageDecision[];
  releasedPaymentHistory: AuditLogEntry[];
  getStageById: (stageId: string) => StageRecord | null;
  formatGBP: (value: number) => string;
  formatTimestamp: (timestamp: string) => string;
  onOpenStageWorkspace: (projectId: string, stageId?: string | null, view?: "projects" | "payments") => void;
};

export default function PaymentsScreen({
  activeProjectId,
  paymentReadyItems,
  paymentBlockedItems,
  releasedPaymentHistory,
  getStageById,
  formatGBP,
  formatTimestamp,
  onOpenStageWorkspace,
}: PaymentsScreenProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-semibold text-slate-900">Ready for release</h2>
        <div className="mt-4 space-y-3">
          {paymentReadyItems.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Nothing is ready for release yet.</div>
          ) : paymentReadyItems.map((decision) => (
            <button
              key={decision.stage.id}
              type="button"
              onClick={() => onOpenStageWorkspace(activeProjectId, decision.stage.id, "projects")}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-all duration-150 ease-out hover:border-slate-300 hover:bg-white"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{decision.stage.name}</div>
                <div className="mt-1 text-sm text-slate-500">{formatGBP(decision.stage.value)} ready to release</div>
              </div>
              <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Approved</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-semibold text-slate-900">Blocked releases</h2>
        <div className="mt-4 space-y-3">
          {paymentBlockedItems.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No releases are blocked right now.</div>
          ) : paymentBlockedItems.map((decision) => (
            <button
              key={decision.stage.id}
              type="button"
              onClick={() => onOpenStageWorkspace(activeProjectId, decision.stage.id, "projects")}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-all duration-150 ease-out hover:border-slate-300 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">{decision.stage.name}</div>
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Blocked</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {decision.blockers.slice(0, 3).map((reason) => (
                  <span key={reason.code} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">{reason.label}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900">Released</h3>
          <div className="mt-3 space-y-2">
            {releasedPaymentHistory.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Nothing has been released yet.</div>
            ) : releasedPaymentHistory.map((entry) => (
              <div key={entry.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">{entry.stageId ? getStageById(entry.stageId)?.name ?? entry.stageId : "Payment record"}</div>
                <div className="mt-1 text-sm text-slate-500">{entry.message}</div>
                <div className="mt-1 text-xs text-slate-500">{formatTimestamp(entry.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
