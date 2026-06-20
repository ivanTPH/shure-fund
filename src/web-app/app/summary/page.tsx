"use client";

/**
 * /summary — Cross-project financial portfolio summary
 *
 * Shows the current user's aggregated financial position across all projects:
 * committed value, drawn funds, available wallet balance, PoF coverage,
 * and per-project snapshots with funding gap indicators.
 *
 * Roles: funder, developer, admin (others redirect to /projects)
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { Skeleton } from "@/app/components/Skeleton";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectSnapshot = {
  projectId: string;
  projectName: string | null;
  projectAddress: string | null;
  projectStatus: string;
  walletBalance: number;
  walletAvailable: number;
  totalCommitted: number;
  totalDrawn: number;
  totalRingfenced: number;
  pofTotal: number;
  hasFundingGap: boolean;
  stageCount: number;
  releasedCount: number;
  awaitingCount: number;
};

type PortfolioSummary = {
  totalProjects: number;
  totalCommitted: number;
  totalDrawn: number;
  totalAvailable: number;
  totalPof: number;
  fundingGaps: number;
  awaitingApproval: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const pct = (num: number, denom: number) =>
  denom > 0 ? Math.round((num / denom) * 100) : 0;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MiniBar({ value, total, color }: { value: number; total: number; color: string }) {
  const w = pct(value, total);
  return (
    <div className="mt-1 h-1.5 w-full rounded-full" style={{ backgroundColor: "var(--surface-border, #e4e7f0)" }}>
      <div className="h-1.5 rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}

function ProjectCard({ snap }: { snap: ProjectSnapshot }) {
  return (
    <div
      className="rounded-[20px] px-5 py-4"
      style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
            {snap.projectAddress ?? "—"}
          </p>
          <p className="mt-0.5 font-bold" style={{ color: "#0D1144" }}>
            {snap.projectName ?? "Unknown project"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {snap.hasFundingGap && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: "rgba(220,38,38,0.09)", color: "#dc2626" }}
            >
              Funding gap
            </span>
          )}
          {snap.awaitingCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: "rgba(124,58,237,0.09)", color: "#7c3aed" }}
            >
              {snap.awaitingCount} awaiting
            </span>
          )}
          <Link
            href={`/projects/${snap.projectId}`}
            className="text-[11px] font-medium hover:underline"
            style={{ color: "#2563eb" }}
          >
            View →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Committed</p>
          <p className="text-sm font-semibold" style={{ color: "#0D1144" }}>{gbp.format(snap.totalCommitted)}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Drawn</p>
          <p className="text-sm font-semibold" style={{ color: "#059669" }}>
            {gbp.format(snap.totalDrawn)}
            {snap.totalCommitted > 0 && (
              <span className="ml-1 text-xs font-normal" style={{ color: "rgba(13,17,68,0.4)" }}>
                ({pct(snap.totalDrawn, snap.totalCommitted)}%)
              </span>
            )}
          </p>
          <MiniBar value={snap.totalDrawn} total={snap.totalCommitted} color="#059669" />
        </div>
        <div>
          <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Wallet (available)</p>
          <p className="text-sm font-semibold" style={{ color: snap.hasFundingGap ? "#dc2626" : "#0D1144" }}>
            {gbp.format(snap.walletAvailable)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Tier 2 PoF</p>
          <p className="text-sm font-semibold" style={{ color: "#0D1144" }}>{gbp.format(snap.pofTotal)}</p>
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
        <span>{snap.stageCount} stages</span>
        <span>{snap.releasedCount} released</span>
        <span
          className="capitalize px-1.5 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: "rgba(13,17,68,0.06)" }}
        >
          {snap.projectStatus}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SummaryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [projects, setProjects] = useState<ProjectSnapshot[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/portfolio");
    if (res.status === 401) { router.replace("/auth/login"); return; }
    if (res.status === 403) { router.replace("/projects"); return; }
    const data = await res.json() as { summary: PortfolioSummary; projects: ProjectSnapshot[] };
    setSummary(data.summary);
    setProjects(data.projects ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }
      const r = getRole(user) as AppRole;
      if (!["funder", "developer", "admin"].includes(r)) { router.replace("/projects"); return; }
      await load();
    };
    init();
  }, [load, router]);

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0D1144" }}>
            Portfolio summary
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
            Aggregated financial position across all your projects.
          </p>
        </div>

        {loading ? (
          <Skeleton.Dashboard />
        ) : summary && (
          <>
            {/* Summary strip */}
            <div
              className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-[20px] px-5 py-4"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Projects</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: "#0D1144" }}>{summary.totalProjects}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Total committed</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: "#0D1144" }}>{gbp.format(summary.totalCommitted)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Total drawn</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: "#059669" }}>{gbp.format(summary.totalDrawn)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Available (Tier 1)</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: "#0D1144" }}>{gbp.format(summary.totalAvailable)}</p>
              </div>
            </div>

            {/* Secondary strip */}
            <div className="mb-5 flex flex-wrap gap-4">
              <div
                className="flex-1 min-w-[120px] rounded-[16px] px-4 py-3"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
              >
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Tier 2 PoF total</p>
                <p className="mt-0.5 text-lg font-bold" style={{ color: "#0D1144" }}>{gbp.format(summary.totalPof)}</p>
              </div>
              <div
                className="flex-1 min-w-[120px] rounded-[16px] px-4 py-3"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
              >
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Awaiting approval</p>
                <p className="mt-0.5 text-lg font-bold" style={{ color: summary.awaitingApproval > 0 ? "#7c3aed" : "#0D1144" }}>
                  {summary.awaitingApproval}
                </p>
              </div>
              {summary.fundingGaps > 0 && (
                <div
                  className="flex-1 min-w-[120px] rounded-[16px] px-4 py-3"
                  style={{ border: "1px solid rgba(220,38,38,0.25)", backgroundColor: "rgba(220,38,38,0.04)" }}
                >
                  <p className="text-xs" style={{ color: "#dc2626" }}>Funding gaps</p>
                  <p className="mt-0.5 text-lg font-bold" style={{ color: "#dc2626" }}>{summary.fundingGaps}</p>
                </div>
              )}
            </div>

            {/* Per-project list */}
            {projects.length === 0 ? (
              <div
                className="rounded-[20px] px-6 py-10 text-center"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
              >
                <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No projects found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((snap) => (
                  <ProjectCard key={snap.projectId} snap={snap} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
