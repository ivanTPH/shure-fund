"use client";

/**
 * Contractor portal — /contractor
 *
 * Cross-project summary for the logged-in contractor:
 *  - Portfolio totals: total contracted, released, outstanding, actions required
 *  - Stages grouped by project with status, value, and action CTAs
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../components/AppShell";
import { Skeleton } from "../components/Skeleton";

// ── Types ──────────────────────────────────────────────────────────────────

type Stage = {
  id: string;
  name: string;
  value: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

type Contract = {
  id: string;
  status: string;
  stages: Stage[];
};

type Project = {
  id: string;
  name: string;
  address: string;
  status: string;
  contracts: Contract[];
};

type Totals = {
  totalValue: number;
  paidValue: number;
  pendingValue: number;
  actionRequired: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const STATUS_COLOR: Record<string, string> = {
  draft:                "#94a3b8",
  sent:                 "#2563eb",
  accepted:             "#7c3aed",
  in_progress:          "#d97706",
  awaiting_approval:    "#7c3aed",
  returned:             "#ea580c",
  disputed:             "#dc2626",
  available_to_release: "#059669",
  released:             "#16a34a",
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#94a3b8";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: color + "18", color }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function StatCard({ label, value, color, isCount }: { label: string; value: number; color: string; isCount?: boolean }) {
  return (
    <div
      className="rounded-[18px] px-4 py-4"
      style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>
        {label}
      </p>
      <p className="text-xl font-bold leading-tight" style={{ color }}>
        {isCount ? value : gbp.format(value)}
      </p>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ContractorPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [totals, setTotals]     = useState<Totals | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/contractor/summary")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setProjects(d.projects ?? []);
        setTotals(d.totals ?? null);
      })
      .catch(() => setError("Network error loading your work."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-4xl mx-auto">
        <Skeleton.Dashboard />
      </div>
    </AppShell>
  );

  if (error) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    </AppShell>
  );

  const allStages = projects.flatMap((p) =>
    p.contracts.flatMap((c) => c.stages.map((s) => ({ ...s, projectId: p.id, contractId: c.id }))),
  );
  const actionStages = allStages.filter((s) => s.status === "in_progress" || s.status === "returned");
  const reviewStages = allStages.filter((s) => s.status === "awaiting_approval");

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>My work</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
            All your stages across every project.
          </p>
        </div>

        {/* Stat strip */}
        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard label="Total contracted" value={totals.totalValue}     color="var(--brand-navy, #0D1144)" />
            <StatCard label="Released to you"  value={totals.paidValue}      color="#059669" />
            <StatCard label="Outstanding"       value={totals.pendingValue}   color={totals.pendingValue > 0 ? "#d97706" : "#059669"} />
            <StatCard label="Actions required"  value={totals.actionRequired} color={totals.actionRequired > 0 ? "#dc2626" : "#059669"} isCount />
          </div>
        )}

        {/* Action required banner */}
        {actionStages.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#dc2626" }}>
              Action required
            </p>
            <div className="space-y-2">
              {actionStages.map((s) => {
                const isReturned    = s.status === "returned";
                const bg            = isReturned ? "rgba(234,88,12,0.06)" : "rgba(251,191,36,0.06)";
                const border        = isReturned ? "rgba(234,88,12,0.2)"  : "rgba(251,191,36,0.25)";
                const labelColor    = isReturned ? "#ea580c" : "#d97706";
                const actionLabel   = isReturned ? "Evidence returned — resubmit" : "Upload completion evidence";
                return (
                  <Link
                    key={s.id}
                    href={`/projects/${s.projectId}/stages/${s.id}/action`}
                    className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:opacity-80"
                    style={{ backgroundColor: bg, border: `1px solid ${border}` }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: labelColor }}>{actionLabel}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.value)}</p>
                      <p className="text-[10px]" style={{ color: labelColor }}>→</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Under review */}
        {reviewStages.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#7c3aed" }}>
              Under review
            </p>
            <div className="space-y-2">
              {reviewStages.map((s) => (
                <Link
                  key={s.id}
                  href={`/projects/${s.projectId}/stages/${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:opacity-80"
                  style={{ backgroundColor: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.18)" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#7c3aed" }}>Awaiting approval — no action needed</p>
                  </div>
                  <p className="text-sm font-bold shrink-0" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.value)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Projects list */}
        {projects.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>
              No contracts assigned to you yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((p) => {
              const stages = p.contracts.flatMap((c) => c.stages);
              const releasedCount = stages.filter((s) => s.status === "released").length;
              return (
                <div
                  key={p.id}
                  className="rounded-[20px] overflow-hidden"
                  style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                >
                  {/* Project header */}
                  <div
                    className="px-5 py-4 flex items-start justify-between gap-3"
                    style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.015)" }}
                  >
                    <div>
                      <Link
                        href={`/projects/${p.id}`}
                        className="font-semibold text-sm transition hover:opacity-70"
                        style={{ color: "var(--brand-navy, #0D1144)" }}
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(13,17,68,0.45)" }}>{p.address}</p>
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: "rgba(13,17,68,0.4)" }}>
                      {releasedCount}/{stages.length} released
                    </span>
                  </div>

                  {/* Stages */}
                  {stages.map((s, i) => {
                    const color      = STATUS_COLOR[s.status] ?? "#94a3b8";
                    const isReleased = s.status === "released";
                    return (
                      <Link
                        key={s.id}
                        href={`/projects/${p.id}/stages/${s.id}`}
                        className="flex items-center justify-between px-5 py-3 transition hover:bg-neutral-50"
                        style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: isReleased ? "rgba(13,17,68,0.5)" : "var(--brand-navy, #0D1144)" }}
                            >
                              {s.name}
                            </p>
                            <StatusPill status={s.status} />
                          </div>
                        </div>
                        <p
                          className="shrink-0 ml-3 text-sm font-bold"
                          style={{ color: isReleased ? "#16a34a" : "var(--brand-navy, #0D1144)" }}
                        >
                          {gbp.format(s.value)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
