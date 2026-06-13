"use client";

/**
 * /funding — Funding hub
 *
 * Consolidated view of Tier 1 (trust wallet) and Tier 2 (bank PoF) funding
 * health across all projects for funders, developers, and admins.
 *
 * Uses GET /api/portfolio for data.
 * Funders see their own project wallets; admin sees everything.
 *
 * Roles: funder, developer, admin (others → /projects)
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types (from /api/portfolio)
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

function CoverageBar({ tier1, tier2, committed }: { tier1: number; tier2: number; committed: number }) {
  const total = Math.max(committed, tier1 + tier2, 1);
  const t1Pct = Math.min((tier1 / total) * 100, 100);
  const t2Pct = Math.min((tier2 / total) * 100, 100 - t1Pct);
  return (
    <div className="mt-2 h-2 w-full rounded-full overflow-hidden flex" style={{ backgroundColor: "var(--surface-border, #e4e7f0)" }}>
      <div className="h-full" style={{ width: `${t1Pct}%`, backgroundColor: "#059669" }} />
      <div className="h-full" style={{ width: `${t2Pct}%`, backgroundColor: "#2563eb", opacity: 0.5 }} />
    </div>
  );
}

function ProjectFundingCard({ snap }: { snap: ProjectSnapshot }) {
  const tier1and2 = snap.walletBalance + snap.pofTotal;
  return (
    <div
      className="rounded-[20px] px-5 py-4"
      style={{
        border: snap.hasFundingGap
          ? "1px solid rgba(220,38,38,0.3)"
          : "1px solid var(--surface-border, #e4e7f0)",
        backgroundColor: "#fff",
      }}
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
          <Link
            href={`/projects/${snap.projectId}/proof-of-funds`}
            className="text-[11px] font-medium hover:underline"
            style={{ color: "#2563eb" }}
          >
            Manage PoF →
          </Link>
        </div>
      </div>

      {/* Tier blocks */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-3">
        <div>
          <p className="text-xs font-medium" style={{ color: "rgba(13,17,68,0.45)" }}>Tier 1 — Trust wallet</p>
          <p className="mt-0.5 text-sm font-bold" style={{ color: "#059669" }}>
            {gbp.format(snap.walletAvailable)}
            <span className="ml-1 text-xs font-normal" style={{ color: "rgba(13,17,68,0.4)" }}>
              available
            </span>
          </p>
          <p className="text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
            {gbp.format(snap.walletBalance)} balance · {gbp.format(snap.totalRingfenced)} ringfenced
          </p>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: "rgba(13,17,68,0.45)" }}>Tier 2 — Bank PoF</p>
          <p className="mt-0.5 text-sm font-bold" style={{ color: "#2563eb" }}>
            {gbp.format(snap.pofTotal)}
          </p>
          <p className="text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>uncommitted</p>
        </div>
      </div>

      {/* Combined coverage bar */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>
          <span>Combined coverage</span>
          <span className="font-semibold" style={{ color: "#0D1144" }}>{gbp.format(tier1and2)}</span>
        </div>
        <CoverageBar tier1={snap.walletAvailable} tier2={snap.pofTotal} committed={snap.totalCommitted} />
        <div className="flex gap-3 mt-1 text-[10px]" style={{ color: "rgba(13,17,68,0.4)" }}>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#059669" }} />
            Tier 1
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#2563eb", opacity: 0.5 }} />
            Tier 2
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FundingPage() {
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
            Funding overview
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
            Tier 1 (trust wallet) and Tier 2 (bank PoF) coverage across all your projects.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading…</p>
          </div>
        ) : summary && (
          <>
            {/* Platform totals strip */}
            <div
              className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-[20px] px-5 py-4"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Total Tier 1</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: "#059669" }}>{gbp.format(summary.totalAvailable)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Total Tier 2</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: "#2563eb" }}>{gbp.format(summary.totalPof)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Combined</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: "#0D1144" }}>{gbp.format(summary.totalAvailable + summary.totalPof)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Funding gaps</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: summary.fundingGaps > 0 ? "#dc2626" : "#0D1144" }}>
                  {summary.fundingGaps}
                </p>
              </div>
            </div>

            {/* Total drawn */}
            <div
              className="mb-5 flex items-center justify-between rounded-[16px] px-5 py-3"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Total committed value</p>
                <p className="font-bold" style={{ color: "#0D1144" }}>{gbp.format(summary.totalCommitted)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Total drawn to date</p>
                <p className="font-bold" style={{ color: "#059669" }}>{gbp.format(summary.totalDrawn)}</p>
              </div>
            </div>

            {/* Per-project cards */}
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
                  <ProjectFundingCard key={snap.projectId} snap={snap} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
