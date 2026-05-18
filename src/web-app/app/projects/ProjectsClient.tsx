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
  totalValue: number;
  walletBalance: number;
  walletAvailable: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: "Active",    color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  on_hold:   { label: "On hold",   color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  completed: { label: "Completed", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  archived:  { label: "Archived",  color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const ALL_STATUSES = ["active", "on_hold", "completed", "archived"];

export default function ProjectsClient({
  projects,
  canCreateProject,
}: {
  projects: Project[];
  canCreateProject: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

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

        {/* Project cards */}
        {filtered.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
              No projects match the current filter.
            </p>
          </div>
        ) : (
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
                    border: "1px solid var(--surface-border, #e4e7f0)",
                    backgroundColor: "#fff",
                  }}
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
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
                          style={{ width: `${progress}%`, backgroundColor: "#34d399" }}
                        />
                      </div>
                    </div>

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
                          Wallet available
                        </p>
                        <p
                          className="mt-0.5 text-sm font-bold"
                          style={{
                            color: project.walletAvailable > 0 ? "#059669" : "#dc2626",
                          }}
                        >
                          {gbp.format(project.walletAvailable)}
                        </p>
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
