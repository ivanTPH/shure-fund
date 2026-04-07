"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import type { HomeTaskItem } from "@/lib/systemState";

type TaskListPanelProps = {
  title: string;
  description: string;
  items: HomeTaskItem[];
  emptyMessage: string;
  onSelect?: (item: HomeTaskItem) => void;
  ctaLabel?: string;
  emphasis?: "primary" | "secondary";
  maxVisible?: number;
  onViewAll?: () => void;
  viewAllLabel?: string;
};

export default function TaskListPanel({
  title,
  description,
  items,
  emptyMessage,
  onSelect,
  ctaLabel = "Open",
  emphasis = "secondary",
  maxVisible = items.length,
  onViewAll,
  viewAllLabel = "View all",
}: TaskListPanelProps) {
  const priorityTone = (priority: HomeTaskItem["priority"]) => {
    switch (priority) {
      case "critical":
        return "border-red-200 bg-red-50 text-red-700";
      case "high":
        return "border-amber-200 bg-amber-50 text-amber-700";
      case "medium":
        return "border-blue-200 bg-blue-50 text-blue-700";
      default:
        return "border-slate-200 bg-slate-50 text-slate-700";
    }
  };

  const priorityLabel = (priority: HomeTaskItem["priority"]) => {
    switch (priority) {
      case "critical":
        return "Urgent";
      case "high":
        return "Priority";
      default:
        return null;
    }
  };

  const isFinancialAction = (item: HomeTaskItem) =>
    item.actionType === "funding" || item.actionType === "approval";

  const visibleItems = items.slice(0, maxVisible);

  return (
    <section className={`rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${emphasis === "primary" ? "border border-slate-200" : ""}`}>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
          {items.length > maxVisible && onViewAll ? (
            <button type="button" className="text-sm font-semibold text-slate-700 hover:text-slate-950" onClick={onViewAll}>
              {viewAllLabel}
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item)}
              className={`grid w-full gap-4 rounded-2xl bg-white px-4 text-left shadow-sm ring-1 ring-slate-200 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md hover:ring-slate-300 md:grid-cols-[minmax(0,1.8fr)_minmax(180px,0.8fr)_auto] md:items-center ${
                emphasis === "primary" ? "py-4" : "py-3"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-950">
                    {item.projectName}
                    {item.stageName ? ` / ${item.stageName}` : ""}
                  </span>
                  {priorityLabel(item.priority) ? (
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${priorityTone(item.priority)}`}>
                      {priorityLabel(item.priority)}
                    </span>
                  ) : null}
                  {item.issueCount && item.issueCount > 1 ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {item.issueCount} issues
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-base font-semibold text-slate-950">{item.title}</div>
                <div className="mt-1 text-sm text-slate-600">
                  <div><strong>{item.exceptionPath?.hasActiveExceptionPath ? "Exception path:" : item.exitState?.isClosedOrComplete ? "Current outcome:" : "Why surfaced:"}</strong> {item.exceptionPath?.headline ?? item.exitState?.headline ?? item.attentionReason?.reasonLabel ?? item.summary}</div>
                  <div className="mt-1 text-slate-500">
                    <strong>
                      {item.exceptionPath?.hasActiveExceptionPath
                        ? "Return to path:"
                        : item.exitState?.isClosedOrComplete
                        ? "Exception path:"
                        : item.attentionReason?.requiresMyAction
                        ? "Needs your action:"
                        : item.attentionReason?.headline ?? "What happens next:"}
                    </strong>{" "}
                    {item.exceptionPath?.returnPathLabel ?? item.exitState?.reopenPathLabel ?? item.attentionReason?.supportingDetails[1] ?? item.nextActionLabel ?? item.summary}
                  </div>
                </div>
                {item.exceptionPath?.hasActiveExceptionPath ? (
                  <div className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <div><strong>Owner:</strong> {item.exceptionPath.ownerLabel ?? "Next owner"}</div>
                    {item.exceptionPath.requiredDecisionLabel ? (
                      <div className="mt-1"><strong>Decision:</strong> {item.exceptionPath.requiredDecisionLabel}</div>
                    ) : null}
                  </div>
                ) : null}
                {item.handoff?.isWaitingOnAnotherRole ? (
                  <div className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <div><strong>Waiting on:</strong> {item.handoff.toRoleLabel ?? "Next owner"}</div>
                    {item.handoff.expectedActionLabel ? (
                      <div className="mt-1"><strong>Expected action:</strong> {item.handoff.expectedActionLabel}</div>
                    ) : null}
                    {item.handoff.unlockOutcomeLabel ? (
                      <div className="mt-1 text-slate-500"><strong>Unlocks:</strong> {item.handoff.unlockOutcomeLabel}</div>
                    ) : null}
                  </div>
                ) : null}
                {isFinancialAction(item) && typeof item.amount === "number" ? (
                  <div className="mt-2 text-sm font-semibold text-slate-900">Amount: {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(item.amount)}</div>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Driver</div>
                  <div className="mt-1 font-medium text-slate-800">{item.handoff?.toRoleLabel ?? item.attentionReason?.driverLabel ?? item.ownerLabel}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</div>
                  <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.exceptionPath?.exceptionType.replaceAll("_", " ") ?? item.exitState?.outcomeLabel ?? item.attentionReason?.headline ?? item.statusLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center md:justify-end">
                <span className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 ease-out group-active:scale-[0.98]">
                  {item.nextActionLabel ?? item.attentionReason?.supportingDetails[1] ?? ctaLabel}
                  <ChevronRight size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
