"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlobalAuditEvent = {
  id: string;
  projectId: string;
  projectName: string;
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
  if (!value) return <span style={{ color: "rgba(13,17,68,0.35)" }}>—</span>;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs"
      style={{ backgroundColor: "#f7f8fc", border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.65)" }}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

const ACTION_COLORS: Record<string, string> = {
  stage_status_changed: "#2563eb",
  evidence_submitted: "#059669",
  evidence_reviewed: "#16a34a",
  approval_given: "#059669",
  approval_rejected: "#dc2626",
  approval_returned: "#d97706",
  all_approvals_complete: "#16a34a",
  release_initiated: "#7c3aed",
  release_completed: "#6d28d9",
  release_failed: "#dc2626",
  dispute_opened: "#ea580c",
  dispute_resolved: "#c2410c",
  variation_requested: "#0284c7",
  variation_approved: "#059669",
  variation_activated: "#16a34a",
  wallet_funded: "#0284c7",
  wallet_allocated: "#0369a1",
  override_applied:       "#9333ea",
  kyc_approved:           "#059669",
  kyc_rejected:           "#dc2626",
  compliance_approved:    "#059669",
  compliance_rejected:    "#dc2626",
  compliance_escalated:   "#7c3aed",
};

const ROLE_LABELS: Record<string, string> = {
  funder:            "Funder",
  developer:         "Project Owner",
  contractor:        "Contractor",
  commercial:        "Commercial",
  consultant:        "Consultant",
  professional:      "Consultant",           // DB approval_role value
  treasury:          "Funder / Project Owner", // DB approval_role value
  subcontractor:     "Contractor",
  quantity_surveyor: "Quantity Surveyor",
  admin:             "Admin",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GlobalAuditClient({
  initialEvents,
}: {
  initialEvents: GlobalAuditEvent[];
}) {
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const projects = useMemo(() => {
    const seen = new Map<string, string>();
    for (const ev of initialEvents) seen.set(ev.projectId, ev.projectName);
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
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return initialEvents.filter((ev) => {
      if (projectFilter !== "all" && ev.projectId !== projectFilter) return false;
      if (actionFilter !== "all" && ev.action !== actionFilter) return false;
      if (roleFilter !== "all" && ev.actor?.role !== roleFilter) return false;
      const evTs = new Date(ev.createdAt).getTime();
      if (fromTs !== null && evTs < fromTs) return false;
      if (toTs !== null && evTs > toTs) return false;
      return true;
    });
  }, [initialEvents, projectFilter, actionFilter, roleFilter, dateFrom, dateTo]);

  function clearFilters() {
    setProjectFilter("all");
    setActionFilter("all");
    setRoleFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  const hasFilters =
    projectFilter !== "all" ||
    actionFilter !== "all" ||
    roleFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  function exportCSV() {
    const header = ["id", "date", "project", "action", "stage", "from_state", "to_state", "actor", "role", "notes"];
    const rows = filtered.map((ev) => [
      ev.id,
      formatTs(ev.createdAt),
      ev.projectName,
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
    a.download = `global-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectClass =
    "rounded-xl px-3 py-2 text-xs outline-none";
  const selectStyle = {
    border: "1px solid var(--surface-border, #e4e7f0)",
    backgroundColor: "#fff",
    color: "var(--brand-navy, #0D1144)",
  };

  return (
    <div className="min-h-screen px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--brand-navy, #0D1144)" }}>
          Global audit trail
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
          Immutable record of every governed event across all projects.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={selectClass} style={selectStyle}>
          <option value="all">All projects</option>
          {projects.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={selectClass} style={selectStyle}>
          <option value="all">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>{actionLabel(action)}</option>
          ))}
        </select>

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClass} style={selectStyle}>
          <option value="all">All roles</option>
          {roles.map((role) => (
            <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={selectClass}
          style={selectStyle}
          title="From date"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={selectClass}
          style={selectStyle}
          title="To date"
        />

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl px-3 py-2 text-xs transition hover:opacity-70"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "rgba(13,17,68,0.55)" }}
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto self-center text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>

        <button
          type="button"
          onClick={exportCSV}
          className="rounded-xl px-3 py-2 text-xs font-semibold transition hover:opacity-80"
          style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
        >
          Export CSV
        </button>
      </div>

      {/* Events */}
      {filtered.length === 0 ? (
        <div
          className="rounded-[20px] px-6 py-8 text-center"
          style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
        >
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No events match the current filters.</p>
          {initialEvents.length === 0 && (
            <p className="mt-2 text-xs" style={{ color: "rgba(13,17,68,0.3)" }}>
              Audit events appear here as actions are taken on projects.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ev) => {
            const dotColor = ACTION_COLORS[ev.action] ?? "#64748b";
            return (
              <div
                key={ev.id}
                className="rounded-[18px] px-4 py-4"
                style={{
                  border: "1px solid var(--surface-border, #e4e7f0)",
                  backgroundColor: "#fff",
                }}
              >
                {/* Top row: action | role pill | timestamp */}
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
                        style={{ backgroundColor: "#f7f8fc", color: "rgba(13,17,68,0.5)", border: "1px solid var(--surface-border, #e4e7f0)" }}
                      >
                        {ROLE_LABELS[ev.actor.role] ?? ev.actor.role}
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>{formatTs(ev.createdAt)}</span>
                </div>

                {/* Project link */}
                <p className="mt-1.5 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                  Project:{" "}
                  <Link
                    href={`/projects/${ev.projectId}`}
                    className="font-medium hover:underline"
                    style={{ color: "var(--brand-navy, #0D1144)" }}
                  >
                    {ev.projectName}
                  </Link>
                </p>

                {/* Actor */}
                {ev.actor && (
                  <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                    By: <span className="font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{ev.actor.full_name}</span>
                  </p>
                )}

                {/* Stage name */}
                {ev.stageName && (
                  <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                    Stage: <span className="font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{ev.stageName}</span>
                  </p>
                )}

                {/* State transition */}
                {(ev.fromState || ev.toState) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
                    {stateChip(ev.fromState)}
                    <span>→</span>
                    {stateChip(ev.toState)}
                  </div>
                )}

                {/* Metadata notes */}
                {ev.metadata?.reason !== undefined && (
                  <p className="mt-2 text-xs italic" style={{ color: "rgba(13,17,68,0.5)" }}>
                    &ldquo;{String(ev.metadata.reason)}&rdquo;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
