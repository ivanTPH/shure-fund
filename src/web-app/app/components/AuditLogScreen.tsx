"use client";

import React from "react";
import type { AuditLogEntry } from "@/lib/stageStore";

type AuditLogScreenProps = {
  filteredAuditLog: AuditLogEntry[];
  auditLog: AuditLogEntry[];
  auditStageFilter: string;
  auditActionTypeFilter: string;
  auditRoleFilter: string;
  auditStageOptions: Array<{ value: string; label: string }>;
  auditActionTypeOptions: string[];
  actionTypeLabels: Record<string, string>;
  formatTimestamp: (timestamp: string) => string;
  formatAuditState: (state: AuditLogEntry["newState"]) => string;
  getStageLabel: (stageId: string | null) => string;
  onUpdateAuditFilters: (nextFilters: { stage?: string; actionType?: string; role?: string }) => void;
};

export default function AuditLogScreen({
  filteredAuditLog,
  auditLog,
  auditStageFilter,
  auditActionTypeFilter,
  auditRoleFilter,
  auditStageOptions,
  auditActionTypeOptions,
  actionTypeLabels,
  formatTimestamp,
  formatAuditState,
  getStageLabel,
  onUpdateAuditFilters,
}: AuditLogScreenProps) {
  const visibleEntries = filteredAuditLog.length === 0 ? auditLog : filteredAuditLog;

  return (
    <section className="rounded-3xl bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm text-slate-600">
          Filter by stage
          <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900" value={auditStageFilter} onChange={(e) => onUpdateAuditFilters({ stage: e.target.value })}>
            <option value="all">All stages</option>
            {auditStageOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Filter by action
          <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900" value={auditActionTypeFilter} onChange={(e) => onUpdateAuditFilters({ actionType: e.target.value })}>
            <option value="all">All actions</option>
            {auditActionTypeOptions.map((actionType) => (
              <option key={actionType} value={actionType}>{actionTypeLabels[actionType] ?? actionType}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Filter by role
          <select className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900" value={auditRoleFilter} onChange={(e) => onUpdateAuditFilters({ role: e.target.value })}>
            <option value="all">All roles</option>
            <option value="professional">Professional</option>
            <option value="commercial">Commercial</option>
            <option value="treasury">Treasury</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {visibleEntries.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">{getStageLabel(entry.stageId)}</div>
              <div className="text-xs text-slate-500">{formatTimestamp(entry.timestamp)}</div>
            </div>
            <div className="mt-2 text-sm text-slate-600">{entry.message}</div>
            <div className="mt-2 text-xs text-slate-500">{formatAuditState(entry.newState)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
