"use client";

/**
 * /admin/analytics — Platform analytics dashboard
 *
 * Consumes GET /api/admin/analytics and displays:
 *   - Stage status distribution
 *   - Evidence review rates
 *   - Approval throughput by role
 *   - Funding health (wallet vs proof-of-funds)
 *   - Contract + project status breakdown
 *
 * Admin only — non-admins are redirected to /projects.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";

const navy  = "var(--brand-navy, #0D1144)";
const muted = "rgba(13,17,68,0.45)";
const card  = { border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" } as const;
const gbp   = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const pct   = (n: number) => `${(n * 100).toFixed(1)}%`;

const STATUS_COLORS: Record<string, string> = {
  draft:               "#64748b",
  sent:                "#2563eb",
  accepted:            "#0891b2",
  in_progress:         "#2563eb",
  awaiting_approval:   "#7c3aed",
  available_to_release:"#d97706",
  released:            "#16a34a",
  funding_gap:         "#dc2626",
  active:              "#059669",
  inactive:            "#64748b",
  completed:           "#16a34a",
  cancelled:           "#dc2626",
  pending:             "#64748b",
  accepted_evidence:   "#059669",
  rejected:            "#dc2626",
  requires_more:       "#ea580c",
  approved:            "#059669",
  returned:            "#ea580c",
};

type Analytics = {
  stages: {
    distribution: Record<string, number>;
    totalCount: number;
    totalValue: number;
    releasedValue: number;
    releaseRate: number;
  };
  evidence: {
    distribution: Record<string, number>;
    totalCount: number;
    pendingCount: number;
    reviewedCount: number;
  };
  approvals: {
    byRole: Record<string, Record<string, number>>;
    totalCount: number;
  };
  funding: {
    totalWalletBalance: number;
    totalWalletAvailable: number;
    activePofTotal: number;
    tier1AndTier2Total: number;
  };
  contracts: {
    distribution: Record<string, number>;
    totalCount: number;
  };
  projects: {
    distribution: Record<string, number>;
    totalCount: number;
  };
};

function DistributionBar({ distribution, total }: { distribution: Record<string, number>; total: number }) {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  if (total === 0) return <p className="text-xs" style={{ color: muted }}>No data</p>;
  return (
    <div className="space-y-2">
      {entries.map(([status, count]) => (
        <div key={status}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs capitalize" style={{ color: muted }}>
              {status.replace(/_/g, " ")}
            </span>
            <span className="text-xs font-semibold" style={{ color: STATUS_COLORS[status] ?? navy }}>
              {count} ({pct(count / total)})
            </span>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: "rgba(13,17,68,0.06)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(count / total) * 100}%`,
                backgroundColor: STATUS_COLORS[status] ?? navy,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [data, setData]       = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const role = getRole(user);
      if (role !== "admin") { router.push("/projects"); return; }
    });

    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d: Analytics & { error?: string }) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError("Network error loading analytics."))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
          <p className="text-sm" style={{ color: muted }}>Loading analytics…</p>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
          <div className="rounded-2xl px-5 py-4 max-w-lg" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{error ?? "Analytics unavailable."}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const reviewRate = data.evidence.totalCount > 0
    ? data.evidence.reviewedCount / data.evidence.totalCount
    : 0;

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Link href="/admin" className="text-xs font-semibold transition hover:opacity-70" style={{ color: muted }}>
                ← Platform overview
              </Link>
              <h1 className="mt-3 text-2xl font-bold" style={{ color: navy }}>Analytics</h1>
              <p className="mt-0.5 text-sm" style={{ color: muted }}>
                Platform-wide metrics across {data.projects.totalCount} project{data.projects.totalCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/admin/invite"
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: navy }}
            >
              Invite user
            </Link>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total stages",      value: String(data.stages.totalCount),        color: navy },
              { label: "Release rate",      value: pct(data.stages.releaseRate),           color: "#16a34a" },
              { label: "Evidence reviewed", value: pct(reviewRate),                        color: "#2563eb" },
              { label: "Approvals logged",  value: String(data.approvals.totalCount),      color: "#7c3aed" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl px-4 py-4" style={card}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>{label}</p>
                <p className="mt-1.5 text-2xl font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Funding health */}
          <div className="rounded-[20px] px-6 py-5" style={card}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: muted }}>
              Funding health (Tier 1 + Tier 2)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Wallet balance (T1)",   value: gbp.format(data.funding.totalWalletBalance),   color: "#059669" },
                { label: "Wallet available",       value: gbp.format(data.funding.totalWalletAvailable), color: "#2563eb" },
                { label: "Active PoF (T2)",        value: gbp.format(data.funding.activePofTotal),        color: "#d97706" },
                { label: "Combined T1+T2",         value: gbp.format(data.funding.tier1AndTier2Total),    color: navy },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>{label}</p>
                  <p className="mt-1 text-lg font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stage + Contract distributions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[20px] px-6 py-5" style={card}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: muted }}>
                Stage status distribution ({data.stages.totalCount})
              </p>
              <DistributionBar distribution={data.stages.distribution} total={data.stages.totalCount} />
            </div>
            <div className="rounded-[20px] px-6 py-5" style={card}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: muted }}>
                Contract status distribution ({data.contracts.totalCount})
              </p>
              <DistributionBar distribution={data.contracts.distribution} total={data.contracts.totalCount} />
            </div>
          </div>

          {/* Evidence + Projects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[20px] px-6 py-5" style={card}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: muted }}>
                Evidence review ({data.evidence.totalCount} submissions)
              </p>
              <DistributionBar distribution={data.evidence.distribution} total={data.evidence.totalCount} />
              <div className="mt-4 flex gap-6">
                <div>
                  <p className="text-[10px] uppercase font-semibold" style={{ color: muted }}>Pending</p>
                  <p className="text-xl font-bold" style={{ color: data.evidence.pendingCount > 0 ? "#d97706" : "#059669" }}>
                    {data.evidence.pendingCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold" style={{ color: muted }}>Reviewed</p>
                  <p className="text-xl font-bold" style={{ color: "#059669" }}>
                    {data.evidence.reviewedCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[20px] px-6 py-5" style={card}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: muted }}>
                Project status ({data.projects.totalCount} total)
              </p>
              <DistributionBar distribution={data.projects.distribution} total={data.projects.totalCount} />
            </div>
          </div>

          {/* Approval throughput by role */}
          {Object.keys(data.approvals.byRole).length > 0 && (
            <div className="rounded-[20px] px-6 py-5" style={card}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: muted }}>
                Approval throughput by role ({data.approvals.totalCount} total)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {Object.entries(data.approvals.byRole).map(([approvalRole, decisions]) => {
                  const total = Object.values(decisions).reduce((s, v) => s + v, 0);
                  return (
                    <div key={approvalRole}>
                      <p className="text-xs font-semibold capitalize mb-2" style={{ color: navy }}>
                        {approvalRole.replace(/_/g, " ")}
                      </p>
                      <DistributionBar distribution={decisions} total={total} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stage value breakdown */}
          <div className="rounded-[20px] px-6 py-5" style={card}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: muted }}>
              Stage value breakdown
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Total contracted value", value: gbp.format(data.stages.totalValue),    color: navy },
                { label: "Released to date",        value: gbp.format(data.stages.releasedValue), color: "#16a34a" },
                { label: "Outstanding",             value: gbp.format(Math.max(0, data.stages.totalValue - data.stages.releasedValue)), color: "#d97706" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>{label}</p>
                  <p className="mt-1 text-xl font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
