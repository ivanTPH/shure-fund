"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditEvent = {
  id: string;
  stageId: string | null;
  stageName: string | null;
  action: string;
  fromState: string | null;
  toState: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: { full_name: string; role: string } | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTs(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function actionLabel(action: string) {
  return action.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function stateChip(value: string | null) {
  if (!value) return <span className="text-neutral-500">—</span>;
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
      {value.replaceAll("_", " ")}
    </span>
  );
}

const ACTION_COLORS: Record<string, string> = {
  stage_status_changed: "#60a5fa",
  evidence_submitted: "#4ade80",
  evidence_reviewed: "#86efac",
  approval_given: "#34d399",
  approval_rejected: "#f87171",
  approval_returned: "#fbbf24",
  all_approvals_complete: "#a3e635",
  release_initiated: "#c084fc",
  release_completed: "#a855f7",
  release_failed: "#ef4444",
  dispute_opened: "#f97316",
  dispute_resolved: "#fb923c",
  variation_requested: "#38bdf8",
  variation_approved: "#34d399",
  variation_activated: "#a3e635",
  wallet_funded: "#38bdf8",
  wallet_allocated: "#7dd3fc",
  override_applied: "#e879f9",
};

const ROLE_LABELS: Record<string, string> = {
  funder: "Funder",
  developer: "Developer",
  contractor: "Contractor",
  commercial: "Commercial",
  consultant: "Consultant",
  admin: "Admin",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditClient({
  projectId,
  initialEvents,
}: {
  projectId: string;
  initialEvents: AuditEvent[];
}) {
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Build unique stage / action / role lists from data
  const stages = useMemo(() => {
    const seen = new Map<string, string>();
    for (const ev of initialEvents) {
      if (ev.stageId && ev.stageName) seen.set(ev.stageId, ev.stageName);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [initialEvents]);

  const actions = useMemo(() => {
    const seen = new Set<string>();
    for (const ev of initialEvents) seen.add(ev.action);
    return Array.from(seen).sort();
  }, [initialEvents]);

  const roles = useMemo(() => {
    const seen = new Set<string>();
    for (const ev of initialEvents) if (ev.actor?.role) seen.add(ev.actor.role);
    return Array.from(seen).sort();
  }, [initialEvents]);

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    // dateTo is a date (no time) — treat it as end of that day
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return initialEvents.filter((ev) => {
      if (stageFilter !== "all" && ev.stageId !== stageFilter) return false;
      if (actionFilter !== "all" && ev.action !== actionFilter) return false;
      if (roleFilter !== "all" && ev.actor?.role !== roleFilter) return false;
      const evTs = new Date(ev.createdAt).getTime();
      if (fromTs !== null && evTs < fromTs) return false;
      if (toTs !== null && evTs > toTs) return false;
      return true;
    });
  }, [initialEvents, stageFilter, actionFilter, roleFilter, dateFrom, dateTo]);

  function clearFilters() {
    setStageFilter("all");
    setActionFilter("all");
    setRoleFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  const hasFilters =
    stageFilter !== "all" || actionFilter !== "all" || roleFilter !== "all" || dateFrom !== "" || dateTo !== "";

  function exportCSV() {
    const header = ["id", "date", "action", "stage", "from_state", "to_state", "actor", "role", "notes"];
    const rows = filtered.map((ev) => [
      ev.id,
      formatTs(ev.createdAt),
      ev.action,
      ev.stageName ?? "",
      ev.fromState ?? "",
      ev.toState ?? "",
      ev.actor?.full_name ?? "",
      ev.actor?.role ?? "",
      ev.metadata?.reason !== undefined ? String(ev.metadata.reason) : "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${projectId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectClass =
    "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none";
  const inputClass =
    "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none";

  return (
    <AppShell>
    <div className="min-h-screen px-4 py-6" style={{ backgroundColor: "#0d1144" }}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 hover:text-neutral-300"
        >
          ← Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
          Audit trail
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Immutable record of every governed event on this project.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* Stage */}
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={selectClass}>
          <option value="all">All stages</option>
          {stages.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        {/* Action */}
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={selectClass}>
          <option value="all">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>{actionLabel(action)}</option>
          ))}
        </select>

        {/* Role */}
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClass}>
          <option value="all">All roles</option>
          {roles.map((role) => (
            <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>
          ))}
        </select>

        {/* Date from */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={inputClass}
          title="From date"
          style={{ colorScheme: "dark" }}
        />

        {/* Date to */}
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={inputClass}
          title="To date"
          style={{ colorScheme: "dark" }}
        />

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-400 hover:text-white"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto self-center text-xs text-neutral-500">
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>

        <button
          type="button"
          onClick={exportCSV}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-400 hover:text-white"
        >
          Export CSV
        </button>
      </div>

      {/* Events */}
      {filtered.length === 0 ? (
        <div
          className="rounded-[20px] px-6 py-8 text-center"
          style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-sm text-neutral-400">No events match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ev) => {
            const dotColor = ACTION_COLORS[ev.action] ?? "#94a3b8";
            return (
              <div
                key={ev.id}
                className="rounded-[18px] px-4 py-4"
                style={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}
              >
                {/* Top row: timestamp | action | role pill */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="text-sm font-semibold" style={{ color: dotColor }}>
                      {actionLabel(ev.action)}
                    </span>
                    {ev.actor?.role && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
                      >
                        {ROLE_LABELS[ev.actor.role] ?? ev.actor.role}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500">{formatTs(ev.createdAt)}</span>
                </div>

                {/* Actor */}
                {ev.actor && (
                  <p className="mt-1.5 text-xs text-neutral-500">
                    <span className="font-medium text-neutral-300">{ev.actor.full_name}</span>
                  </p>
                )}

                {/* Stage name */}
                {ev.stageName && (
                  <p className="mt-1 text-xs text-neutral-400">
                    Stage: <span className="font-medium text-neutral-200">{ev.stageName}</span>
                  </p>
                )}

                {/* State transition */}
                {(ev.fromState || ev.toState) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    {stateChip(ev.fromState)}
                    <span>→</span>
                    {stateChip(ev.toState)}
                  </div>
                )}

                {/* Metadata notes */}
                {ev.metadata?.reason !== undefined && (
                  <p className="mt-2 text-xs italic text-neutral-500">
                    &ldquo;{String(ev.metadata.reason)}&rdquo;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </AppShell>
  );
}
