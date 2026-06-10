"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "../components/AppShell";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

type Project = {
  id: string;
  name: string;
  address: string;
  status: string;
  createdAt: string;
  totalStages: number;
  completedStages: number;
  activeStages: number;
  totalValue: number;
  walletBalance: number;
  walletAvailable: number;
  pofTotal: number;
  hasFundingGap: boolean;
};

export type AttentionItems = {
  stagesReadyToRelease: Array<{
    stageId: string;
    stageName: string;
    projectId: string;
    projectName: string;
    value: number;
  }>;
  disputesNeedingAction: Array<{
    disputeId: string;
    stageId: string;
    stageName: string;
    projectId: string;
    projectName: string;
    status: string;
    reason: string;
  }>;
};

// ---------------------------------------------------------------------------
// Attention panel — funder view
// ---------------------------------------------------------------------------
function AttentionPanel({ items }: { items: AttentionItems }) {
  const total = items.stagesReadyToRelease.length + items.disputesNeedingAction.length;
  if (total === 0) return null;

  return (
    <div
      className="mb-6 rounded-[20px] overflow-hidden"
      style={{ border: "1px solid rgba(251,191,36,0.35)", backgroundColor: "rgba(251,191,36,0.05)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(251,191,36,0.2)", backgroundColor: "rgba(251,191,36,0.08)" }}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: "#d97706" }}
        >
          {total}
        </span>
        <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
          {total === 1 ? "1 item needs your attention" : `${total} items need your attention`}
        </p>
      </div>

      <div className="divide-y" style={{ borderColor: "rgba(251,191,36,0.15)" }}>
        {/* Payments ready to release */}
        {items.stagesReadyToRelease.map((s) => (
          <Link
            key={s.stageId}
            href={`/projects/${s.projectId}/stages/${s.stageId}`}
            className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-amber-50/60"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white"
              style={{ backgroundColor: "#059669" }}
            >
              £
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: "#0D1144" }}>
                Payment ready to release — {gbp.format(s.value)}
              </p>
              <p className="text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
                {s.stageName} · {s.projectName}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold" style={{ color: "#059669" }}>
              Release →
            </span>
          </Link>
        ))}

        {/* Disputes needing review */}
        {items.disputesNeedingAction.map((d) => (
          <Link
            key={d.disputeId}
            href={`/projects/${d.projectId}/stages/${d.stageId}/disputes/${d.disputeId}`}
            className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-amber-50/60"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white"
              style={{ backgroundColor: "#dc2626" }}
            >
              !
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: "#0D1144" }}>
                Dispute {d.status === "raised" ? "raised" : "under review"} — {d.stageName}
              </p>
              <p className="truncate text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
                {d.reason} · {d.projectName}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold" style={{ color: "#dc2626" }}>
              Review →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portfolio summary strip
// ---------------------------------------------------------------------------
function PortfolioSummary({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;

  const totalCommitted   = projects.reduce((s, p) => s + p.totalValue, 0);
  const totalWallet      = projects.reduce((s, p) => s + p.walletBalance, 0);
  const totalPof         = projects.reduce((s, p) => s + p.pofTotal, 0);
  const fundingGapCount  = projects.filter((p) => p.hasFundingGap).length;
  const activeCount      = projects.filter((p) => p.status === "active").length;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "Total committed",  value: gbp.format(totalCommitted),  color: "var(--brand-navy, #0D1144)", sub: `${activeCount} active project${activeCount !== 1 ? "s" : ""}` },
        { label: "Tier 1 — wallet",  value: gbp.format(totalWallet),     color: "#2563eb",  sub: "In trust" },
        { label: "Tier 2 — bank PoF", value: gbp.format(totalPof),        color: "#64748b",  sub: "Uncommitted" },
        { label: "Funding gaps",      value: String(fundingGapCount),     color: fundingGapCount > 0 ? "#dc2626" : "#059669", sub: fundingGapCount > 0 ? "projects underfunded" : "All covered" },
      ].map(({ label, value, color, sub }) => (
        <div
          key={label}
          className="rounded-[20px] px-4 py-4"
          style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
          <p className="text-lg font-bold leading-tight" style={{ color }}>{value}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(13,17,68,0.4)" }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: "Active",    color: "#059669", bg: "rgba(5,150,105,0.08)"   },
  on_hold:   { label: "On hold",   color: "#d97706", bg: "rgba(217,119,6,0.08)"   },
  completed: { label: "Completed", color: "#2563eb", bg: "rgba(37,99,235,0.08)"   },
  archived:  { label: "Archived",  color: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

const ALL_STATUSES = ["active", "on_hold", "completed", "archived"];

export default function ProjectsClient({
  projects,
  canCreateProject,
  attentionItems,
}: {
  projects: Project[];
  canCreateProject: boolean;
  attentionItems?: AttentionItems | null;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [tableView, setTableView] = useState(false);

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!p.name.toLowerCase().includes(q) && !p.address.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [projects, statusFilter, search],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Portfolio summary strip */}
        <PortfolioSummary projects={projects} />

        {/* Funder attention panel */}
        {attentionItems && <AttentionPanel items={attentionItems} />}

        {/* Page heading + actions */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--brand-navy, #0D1144)" }}
            >
              Projects
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
              {projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTableView((v) => !v)}
              className="rounded-xl px-3 py-2 text-xs font-medium transition"
              style={{
                border: "1px solid var(--surface-border, #e4e7f0)",
                backgroundColor: tableView ? "var(--brand-navy, #0D1144)" : "#fff",
                color: tableView ? "#fff" : "rgba(13,17,68,0.6)",
              }}
            >
              {tableView ? "Card view" : "Table view"}
            </button>
            {canCreateProject && (
              <Link
                href="/projects/new"
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
              >
                + New project
              </Link>
            )}
          </div>
        </div>

        {/* Search + status filter */}
        <div className="mb-5 flex flex-wrap gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              border: "1px solid var(--surface-border, #e4e7f0)",
              backgroundColor: "#fff",
              color: "var(--brand-navy, #0D1144)",
              minWidth: 200,
            }}
          />

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setStatusFilter("all")}
              className="rounded-xl px-3 py-2 text-xs font-medium transition"
              style={{
                border: "1px solid var(--surface-border, #e4e7f0)",
                backgroundColor: statusFilter === "all" ? "var(--brand-navy, #0D1144)" : "#fff",
                color: statusFilter === "all" ? "#fff" : "rgba(13,17,68,0.6)",
              }}
            >
              All
            </button>
            {ALL_STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s];
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="rounded-xl px-3 py-2 text-xs font-medium transition"
                  style={{
                    border: `1px solid ${isActive ? cfg.color + "66" : "var(--surface-border, #e4e7f0)"}`,
                    backgroundColor: isActive ? cfg.bg : "#fff",
                    color: isActive ? cfg.color : "rgba(13,17,68,0.6)",
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Project list — card or table view */}
        {filtered.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
              No projects match the current filter.
            </p>
          </div>
        ) : tableView ? (
          /* ── Table view ─────────────────────────────────────────────── */
          <div className="rounded-[20px] overflow-hidden" style={{ border: "1px solid var(--surface-border, #e4e7f0)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-widest" style={{ backgroundColor: "rgba(13,17,68,0.03)", borderBottom: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.45)" }}>
                    <th className="px-5 py-3">Project</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Committed</th>
                    <th className="px-5 py-3 text-right">Wallet</th>
                    <th className="px-5 py-3 text-right">Tier 2 PoF</th>
                    <th className="px-5 py-3 text-center">Stages</th>
                    <th className="px-5 py-3 text-center">Active</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const cfg = STATUS_CONFIG[p.status] ?? { label: p.status, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
                    return (
                      <tr key={p.id} style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}>
                        <td className="px-5 py-3">
                          <p className="font-semibold truncate max-w-[200px]" style={{ color: "var(--brand-navy, #0D1144)" }}>{p.name}</p>
                          {p.address && <p className="text-xs truncate max-w-[200px]" style={{ color: "rgba(13,17,68,0.45)" }}>{p.address}</p>}
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(p.totalValue)}</td>
                        <td className="px-5 py-3 text-right font-semibold" style={{ color: p.hasFundingGap ? "#dc2626" : p.walletAvailable > 0 ? "#059669" : "rgba(13,17,68,0.4)" }}>
                          {gbp.format(p.walletAvailable)}
                          {p.hasFundingGap && <span className="ml-1 text-[9px] font-bold uppercase" style={{ color: "#dc2626" }}>gap</span>}
                        </td>
                        <td className="px-5 py-3 text-right" style={{ color: p.pofTotal > 0 ? "#64748b" : "rgba(13,17,68,0.25)" }}>{p.pofTotal > 0 ? gbp.format(p.pofTotal) : "—"}</td>
                        <td className="px-5 py-3 text-center text-xs" style={{ color: "rgba(13,17,68,0.6)" }}>{p.completedStages}/{p.totalStages}</td>
                        <td className="px-5 py-3 text-center">
                          {p.activeStages > 0 && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(37,99,235,0.1)", color: "#2563eb" }}>{p.activeStages}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/projects/${p.id}`} className="text-xs font-semibold transition hover:opacity-70" style={{ color: "#2563eb" }}>Open →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Card view ──────────────────────────────────────────────── */
          <div className="space-y-3">
            {filtered.map((project) => {
              const cfg = STATUS_CONFIG[project.status] ?? { label: project.status, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
              const progress = project.totalStages > 0
                ? Math.round((project.completedStages / project.totalStages) * 100)
                : 0;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-[20px] p-5 transition hover:shadow-md"
                  style={{
                    border: project.hasFundingGap
                      ? "1px solid rgba(220,38,38,0.25)"
                      : "1px solid var(--surface-border, #e4e7f0)",
                    backgroundColor: "#fff",
                  }}
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-2">
                      <div className="min-w-0">
                        <h2
                          className="truncate text-base font-semibold"
                          style={{ color: "var(--brand-navy, #0D1144)" }}
                        >
                          {project.name}
                        </h2>
                        {project.address && (
                          <p className="mt-0.5 truncate text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
                            {project.address}
                          </p>
                        )}
                      </div>
                      {project.hasFundingGap && (
                        <span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
                          Funding gap
                        </span>
                      )}
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    {/* Stage progress */}
                    <div className="flex-1 min-w-[140px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                          Stages complete
                        </span>
                        <span className="text-xs font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                          {project.completedStages}/{project.totalStages}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "rgba(13,17,68,0.08)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progress}%`, backgroundColor: "#059669" }}
                        />
                      </div>
                    </div>

                    {/* Active stages */}
                    {project.activeStages > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Active</p>
                        <p className="mt-0.5 text-sm font-bold" style={{ color: "#2563eb" }}>{project.activeStages} stage{project.activeStages !== 1 ? "s" : ""}</p>
                      </div>
                    )}

                    {/* Total value */}
                    {project.totalValue > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                          Committed
                        </p>
                        <p className="mt-0.5 text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                          {gbp.format(project.totalValue)}
                        </p>
                      </div>
                    )}

                    {/* Wallet available */}
                    {project.walletBalance > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                          Tier 1 wallet
                        </p>
                        <p
                          className="mt-0.5 text-sm font-bold"
                          style={{ color: project.hasFundingGap ? "#dc2626" : project.walletAvailable > 0 ? "#059669" : "rgba(13,17,68,0.4)" }}
                        >
                          {gbp.format(project.walletAvailable)}
                        </p>
                      </div>
                    )}

                    {/* Tier 2 PoF */}
                    {project.pofTotal > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Tier 2 PoF</p>
                        <p className="mt-0.5 text-sm font-bold" style={{ color: "#64748b" }}>{gbp.format(project.pofTotal)}</p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
