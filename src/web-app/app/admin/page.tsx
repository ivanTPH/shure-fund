"use client";

/**
 * /admin — Platform overview dashboard
 *
 * Cross-project view for admins showing:
 *   • Platform-wide financial totals
 *   • Alert counters (approvals, disputes, variations, AML, KYC)
 *   • Per-project health table
 *   • Recent audit activity
 *
 * Accessible to: admin only.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { Skeleton } from "@/app/components/Skeleton";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectRow = {
  id: string;
  name: string;
  address: string;
  status: string;
  wallet: { balance: number; available: number; ringfenced: number };
  stages: {
    total: number; inProgress: number; awaitingApproval: number;
    disputed: number; released: number; fundingGap: number;
  };
  financials: { contracted: number; released: number };
  alerts: { pendingApprovals: number; activeDisputes: number; pendingVariations: number };
};

type ActivityItem = {
  id: string;
  eventType: string;
  description: string | null;
  createdAt: string;
  projectId: string | null;
  projectName: string | null;
};

type Overview = {
  totals: {
    projects: number;
    walletBalance: number;
    walletAvailable: number;
    totalContracted: number;
    totalReleased: number;
    pendingApprovals: number;
    activeDisputes: number;
    pendingVariations: number;
    amlFlags: number;
    pendingKyc: number;
  };
  projects: ProjectRow[];
  recentActivity: ActivityItem[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp  = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const navy  = "var(--brand-navy, #0D1144)";
const muted = "rgba(13,17,68,0.45)";
const card  = { border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" } as const;

const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return fmt.format(new Date(iso));
}

function AlertBadge({ count, color }: { count: number; color: string }) {
  if (!count) return null;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold min-w-[20px]"
      style={{ backgroundColor: color + "18", color, border: `1px solid ${color}33` }}
    >
      {count}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminOverviewPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const role = getRole(user);
      if (role !== "admin") { router.push("/projects"); return; }
    });

    fetch("/api/admin/overview")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setOverview(d);
      })
      .catch(() => setError("Network error loading overview."))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 md:px-8 py-8 max-w-5xl mx-auto" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
          <Skeleton.Dashboard />
        </div>
      </AppShell>
    );
  }

  if (error || !overview) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
          <div className="rounded-2xl px-5 py-4 max-w-lg" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{error ?? "Overview unavailable."}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const { totals, projects, recentActivity } = overview;
  const totalAlerts = totals.pendingApprovals + totals.activeDisputes + totals.pendingVariations + totals.amlFlags + totals.pendingKyc;
  const projectsWithAlerts = projects.filter(p =>
    p.alerts.pendingApprovals + p.alerts.activeDisputes + p.alerts.pendingVariations > 0
  );

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: navy }}>Platform overview</h1>
              <p className="mt-0.5 text-sm" style={{ color: muted }}>
                {totals.projects} project{totals.projects !== 1 ? "s" : ""} · all values live
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Users", href: "/admin/users" },
                { label: "Compliance", href: "/admin/compliance" },
                { label: "Company", href: "/admin/company" },
                { label: "Audit log", href: "/audit-log" },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-2xl px-3 py-2 text-xs font-semibold transition hover:opacity-80"
                  style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: muted }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Financial totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Funds in escrow",    value: gbp.format(totals.walletBalance),    color: "#059669" },
              { label: "Available in wallets", value: gbp.format(totals.walletAvailable), color: "#2563eb" },
              { label: "Total contracted",   value: gbp.format(totals.totalContracted),  color: navy },
              { label: "Total released",     value: gbp.format(totals.totalReleased),    color: "#16a34a" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl px-4 py-4" style={card}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>{label}</p>
                <p className="mt-1.5 text-xl font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Alert strip */}
          {totalAlerts > 0 && (
            <div className="rounded-[20px] overflow-hidden" style={card}>
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.02)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Platform alerts</p>
                <AlertBadge count={totalAlerts} color="#dc2626" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
                {[
                  { label: "Pending approvals",  count: totals.pendingApprovals,  color: "#7c3aed", href: "/approvals" },
                  { label: "Active disputes",     count: totals.activeDisputes,    color: "#dc2626", href: "/approvals" },
                  { label: "Pending variations",  count: totals.pendingVariations, color: "#d97706", href: "/approvals" },
                  { label: "AML flags",           count: totals.amlFlags,          color: "#dc2626", href: "/admin/compliance" },
                  { label: "KYC pending review",  count: totals.pendingKyc,        color: "#2563eb", href: "/admin/compliance" },
                ].map(({ label, count, color, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="px-5 py-4 flex flex-col gap-1 transition hover:bg-neutral-50"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>{label}</p>
                    <p className="text-2xl font-bold" style={{ color: count > 0 ? color : "rgba(13,17,68,0.2)" }}>
                      {count}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Projects needing attention */}
          {projectsWithAlerts.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>
                Projects needing attention
              </p>
              <div className="space-y-2">
                {projectsWithAlerts.map(p => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between rounded-[20px] px-5 py-4 transition hover:bg-neutral-50"
                    style={card}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: navy }}>{p.name}</p>
                      <p className="text-xs truncate" style={{ color: muted }}>{p.address}</p>
                    </div>
                    <div className="ml-4 flex items-center gap-2 shrink-0">
                      {p.alerts.pendingApprovals > 0 && <AlertBadge count={p.alerts.pendingApprovals} color="#7c3aed" />}
                      {p.alerts.activeDisputes > 0    && <AlertBadge count={p.alerts.activeDisputes}    color="#dc2626" />}
                      {p.alerts.pendingVariations > 0 && <AlertBadge count={p.alerts.pendingVariations} color="#d97706" />}
                      <span style={{ color: "rgba(13,17,68,0.25)" }}>›</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All projects table */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>
              All projects
            </p>
            <div className="rounded-[20px] overflow-hidden" style={card}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs" style={{ color: muted, borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}>
                      <th className="px-5 py-3 font-medium">Project</th>
                      <th className="px-4 py-3 font-medium text-right">Wallet</th>
                      <th className="px-4 py-3 font-medium text-right">Contracted</th>
                      <th className="px-4 py-3 font-medium text-right">Released</th>
                      <th className="px-4 py-3 font-medium text-center">Stages</th>
                      <th className="px-4 py-3 font-medium text-center">Alerts</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => {
                      const hasAlert = p.alerts.pendingApprovals + p.alerts.activeDisputes + p.alerts.pendingVariations > 0;
                      const hasFundingGap = p.stages.fundingGap > 0;
                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderTop: "1px solid var(--surface-border, #e4e7f0)",
                            backgroundColor: hasFundingGap ? "rgba(220,38,38,0.02)" : undefined,
                          }}
                        >
                          <td className="px-5 py-3">
                            <p className="font-semibold" style={{ color: navy }}>{p.name}</p>
                            <p className="text-xs truncate max-w-[180px]" style={{ color: muted }}>{p.address}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-semibold" style={{ color: p.wallet.available < 0 ? "#dc2626" : "#059669" }}>
                              {gbp.format(p.wallet.available)}
                            </p>
                            <p className="text-[10px]" style={{ color: muted }}>available</p>
                          </td>
                          <td className="px-4 py-3 text-right font-medium" style={{ color: navy }}>
                            {gbp.format(p.financials.contracted)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium" style={{ color: "#16a34a" }}>
                            {gbp.format(p.financials.released)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {p.stages.inProgress > 0 && (
                                <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5" style={{ backgroundColor: "rgba(37,99,235,0.1)", color: "#2563eb" }}>
                                  {p.stages.inProgress} WIP
                                </span>
                              )}
                              {p.stages.awaitingApproval > 0 && (
                                <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5" style={{ backgroundColor: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>
                                  {p.stages.awaitingApproval} approval
                                </span>
                              )}
                              {p.stages.fundingGap > 0 && (
                                <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5" style={{ backgroundColor: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
                                  {p.stages.fundingGap} gap
                                </span>
                              )}
                              {p.stages.total === 0 && (
                                <span className="text-[10px]" style={{ color: "rgba(13,17,68,0.25)" }}>—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {!hasAlert && <span className="text-[10px]" style={{ color: "rgba(13,17,68,0.2)" }}>—</span>}
                              {p.alerts.pendingApprovals > 0 && <AlertBadge count={p.alerts.pendingApprovals} color="#7c3aed" />}
                              {p.alerts.activeDisputes > 0    && <AlertBadge count={p.alerts.activeDisputes}    color="#dc2626" />}
                              {p.alerts.pendingVariations > 0 && <AlertBadge count={p.alerts.pendingVariations} color="#d97706" />}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/projects/${p.id}`}
                              className="text-xs font-semibold transition hover:opacity-70"
                              style={{ color: muted }}
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                    <tr className="text-sm font-bold" style={{ backgroundColor: "rgba(13,17,68,0.02)" }}>
                      <td className="px-5 py-3" style={{ color: muted }}>Platform total</td>
                      <td className="px-4 py-3 text-right" style={{ color: "#059669" }}>{gbp.format(totals.walletAvailable)}</td>
                      <td className="px-4 py-3 text-right" style={{ color: navy }}>{gbp.format(totals.totalContracted)}</td>
                      <td className="px-4 py-3 text-right" style={{ color: "#16a34a" }}>{gbp.format(totals.totalReleased)}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          {recentActivity.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Recent activity</p>
                <Link href="/audit-log" className="text-xs font-semibold transition hover:opacity-70" style={{ color: muted }}>
                  Full audit log →
                </Link>
              </div>
              <div className="rounded-[20px] overflow-hidden" style={card}>
                <div className="divide-y" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
                  {recentActivity.map(e => (
                    <div key={e.id} className="flex items-start justify-between gap-4 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate" style={{ color: navy }}>
                          {e.description ?? e.eventType.replace(/_/g, " ")}
                        </p>
                        {e.projectName && (
                          <p className="text-[11px] truncate" style={{ color: muted }}>{e.projectName}</p>
                        )}
                      </div>
                      <p className="shrink-0 text-[11px]" style={{ color: muted }}>{relTime(e.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No projects */}
          {projects.length === 0 && (
            <div className="rounded-[20px] px-6 py-12 text-center" style={card}>
              <p className="text-sm font-semibold" style={{ color: navy }}>No projects yet</p>
              <p className="mt-1 text-xs" style={{ color: muted }}>Create a project to get started.</p>
              <Link
                href="/projects/new"
                className="mt-4 inline-block rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: navy }}
              >
                New project
              </Link>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
