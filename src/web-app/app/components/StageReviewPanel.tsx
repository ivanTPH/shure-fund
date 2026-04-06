"use client";

import React, { useState } from "react";
import { statusConfig, StatusKey } from "@/lib/statusConfig";
import { systemIcons } from "@/lib/icons";
import {
  canActOnApproval,
  getStagePaymentDecision,
  isStageFundingEligible,
  type ApprovalDecision,
  type ApprovalRole,
  type StageRecord,
  updateStage,
  updateStageApproval,
  useStageStore,
} from "@/lib/stageStore";

type StageReviewPanelProps = {
  stage: StageRecord | null;
  onClose: () => void;
};

const reviewTabs = ["overview", "evidence", "approvals", "blockers", "audit"] as const;

function StageReviewPanel({ stage, onClose }: StageReviewPanelProps) {
  const [tab, setTab] = useState<(typeof reviewTabs)[number]>("overview");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const { stages } = useStageStore();
  if (!stage) return null;

  const currentStage = stages.find((entry) => entry.id === stage.id) ?? stage;

  const config = statusConfig[currentStage.status as StatusKey] ?? statusConfig.pending;
  const Icon = systemIcons[config.icon];

  const paymentDecision = getStagePaymentDecision(currentStage);
  const fundingGate = currentStage.fundingGate;
  const blockers = paymentDecision.reasons;
  const fundingEligible = isStageFundingEligible(currentStage);
  const recommendedAction = paymentDecision.releasable ? 'Move to approval' : blockers.length ? 'Clear blockers' : 'Review stage';

  const handleAction = (
    action: string,
    updates: Partial<StageRecord> & {
      status: StatusKey;
      blockers: string[];
      fundingGate: boolean;
    },
  ) => {
    updateStage(stage.id, updates);
    setActionMessage(`Stage marked as: ${action.replace(/stage/i, "").trim()}`);
    setTimeout(() => setActionMessage(null), 2000);
  };

  const handleApprovalAction = (role: ApprovalRole, decision: ApprovalDecision) => {
    const result = updateStageApproval(stage.id, role, decision);
    setActionMessage(result.message);
    setTimeout(() => setActionMessage(null), 2500);
  };

  const approvalLabel = (decision: ApprovalDecision) => decision.charAt(0).toUpperCase() + decision.slice(1);
  const approvalTone = (decision: ApprovalDecision) => {
    if (decision === "approved") return "text-green-300";
    if (decision === "rejected") return "text-red-300";
    return "text-amber-300";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-950/95 via-neutral-900/95 to-neutral-950/90 shadow-2xl p-0 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-8 pt-7 pb-3 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            {Icon && <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-900/60 border border-blue-700 shadow-inner"><Icon size={22} className="text-blue-300" /></span>}
            <div>
              <h3 className="text-2xl font-extrabold text-neutral-100 tracking-tight leading-tight drop-shadow-sm">Stage details</h3>
              <div className="text-sm text-neutral-400 font-medium mt-0.5">{stage.name}</div>
            </div>
          </div>
          <button
            className="text-neutral-400 hover:text-white transition-colors text-2xl font-light px-2 py-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-700"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Status Row */}
        <div className="flex flex-wrap items-center gap-3 px-8 pt-5 pb-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${config.badgeClass} ${config.borderClass ?? ''}`}>{Icon && <Icon size={15} className="mr-1" />}{config.label}</span>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${paymentDecision.releasable ? 'bg-green-800/80 text-green-100 border border-green-700' : 'bg-red-900/80 text-red-200 border border-red-700'}`}>{paymentDecision.releasable ? 'Ready for release' : 'Blocked'}</span>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${fundingGate ? 'bg-blue-900/80 text-blue-100 border border-blue-700' : 'bg-red-900/80 text-red-200 border border-red-700'}`}>{fundingGate ? 'Funding in place' : 'Funding blocked'}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-8 pt-2 border-b border-neutral-800 bg-neutral-950/70">
          {reviewTabs.map((t) => (
            <button
              key={t}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors duration-150 ${tab === t ? 'bg-neutral-900 text-blue-300 shadow' : 'text-neutral-400 hover:text-blue-200'}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-8 py-6 min-h-[120px] bg-neutral-950/80">
          {tab === 'overview' && (
            <div className="space-y-3 text-base text-neutral-200">
              <div className="flex items-center gap-2"><span className="font-semibold text-neutral-400">Status:</span> <span className="font-bold text-neutral-100">{config.label}</span></div>
              <div className="flex items-center gap-2"><span className="font-semibold text-neutral-400">Evidence:</span> <span className="font-bold text-neutral-100 capitalize">{currentStage.evidenceStatus}</span></div>
              <div className="flex items-center gap-2"><span className="font-semibold text-neutral-400">Funding:</span> <span className={fundingEligible ? "font-bold text-green-300" : "font-bold text-amber-300"}>{fundingEligible ? "Ready" : "Waiting"}</span></div>
              <div className="flex items-center gap-2"><span className="font-semibold text-neutral-400">Release:</span> <span className={paymentDecision.releasable ? 'font-bold text-green-300' : 'font-bold text-red-300'}>{paymentDecision.releasable ? 'Ready for release' : 'Blocked'}</span></div>
              <div className="flex items-center gap-2"><span className="font-semibold text-neutral-400">Funding gate:</span> <span className={fundingGate ? 'font-bold text-blue-300' : 'font-bold text-red-300'}>{fundingGate ? 'Open' : 'Blocked'}</span></div>
              <div className="flex items-center gap-2"><span className="font-semibold text-neutral-400">Next step:</span> <span className="font-bold text-blue-300">{recommendedAction}</span></div>
            </div>
          )}
          {tab === 'evidence' && (
            <div className="text-neutral-400 text-base">Open the evidence panel to check files for this stage.</div>
          )}
          {tab === 'approvals' && (
            <div className="space-y-4 text-base text-neutral-200">
              {([
                { role: "professional", label: "Professional" },
                { role: "commercial", label: "Commercial" },
                { role: "treasury", label: "Treasury" },
              ] as Array<{ role: ApprovalRole; label: string }>).map(({ role, label }) => {
                const decision = currentStage.approvals[role];
                const canAct = canActOnApproval(currentStage, role);

                return (
                  <div key={role} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-400">{label}:</span>
                        <span className={`font-bold ${approvalTone(decision)}`}>{approvalLabel(decision)}</span>
                      </div>
                      {!canAct ? (
                        <span className="text-xs font-medium text-amber-300">
                          {role === "commercial"
                            ? "Waiting for Professional"
                            : "Waiting for Professional and Commercial"}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-green-700/90 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800/90 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleApprovalAction(role, "approved")}
                        disabled={!canAct || decision === "approved"}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-full bg-red-700/90 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800/90 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleApprovalAction(role, "rejected")}
                        disabled={!canAct || decision === "rejected"}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {tab === 'blockers' && (
            <div className="text-base">
              {blockers.length === 0 ? (
                <span className="text-green-400 font-semibold">Nothing is blocking this stage.</span>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {blockers.map((b, i) => (
                    <li key={i} className="text-red-300 font-semibold">{b}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {tab === 'audit' && (
            <div className="text-neutral-400 text-base">A full history for this stage will appear here.</div>
          )}
        </div>

        {/* CTA actions */}
        <div className="px-8 pb-7 flex flex-wrap gap-3 bg-neutral-950/80 border-t border-neutral-800">
          <button
            className="rounded-full bg-amber-600/90 px-6 py-2 text-white font-semibold text-sm shadow hover:bg-amber-700/90 focus:outline-none focus:ring-2 focus:ring-amber-700 transition-colors"
            onClick={() => handleAction('Held stage', { status: 'pending', blockers: ['Stage placed on hold pending review'], fundingGate: false })}
            disabled={currentStage.status === 'pending' && currentStage.blockers.includes('Stage placed on hold pending review')}
          >
            Put on hold
          </button>
          <button
            className="rounded-full border border-neutral-700 px-6 py-2 text-neutral-200 font-semibold text-sm shadow hover:bg-neutral-800/80 focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors"
            onClick={() => handleAction('Requested more information', { status: 'at-risk', blockers: ['Additional information requested before approval'], fundingGate: false })}
            disabled={currentStage.status === 'at-risk' && currentStage.blockers.includes('Additional information requested before approval')}
          >
            Ask for more information
          </button>
        </div>
        {actionMessage && (
          <div className="px-8 pb-4 text-center text-blue-300 text-base font-semibold">{actionMessage}</div>
        )}
      </div>
    </div>
  );
}

export default StageReviewPanel;
