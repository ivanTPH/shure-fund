"use client";

/**
 * /projects/[id]/funding
 *
 * Live funding assurance dashboard for a project.
 * Accessible to: funder, developer, admin.
 *
 * Displays the assurance engine state (funded / warning / gap),
 * wallet breakdown, active WIP stages, upcoming stages, and
 * a visual coverage bar.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import type { FundingPosition, FundingState } from "@/lib/funding/assuranceEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WalletSummary = {
  balance: number;
  ringfenced: number;
  available: number;
};

type PositionResponse = FundingPosition & {
  projectId: string;
  wallet: WalletSummary;
};

type DashboardSummary = {
  totalCommitted: number;
  totalDrawn: number;
  totalRemaining: number;
  projectedDraw30d: number;
  fundingGapWarning: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const navy = "var(--brand-navy, #0D1144)";
const muted = "rgba(13,17,68,0.45)";
const card = { border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" } as const;

const STATE_STYLES: Record<FundingState, { bg: string; border: string; text: string; label: string; desc: string }> = {
  funded: {
    bg: "rgba(5,150,105,0.06)", border: "rgba(5,150,105,0.25)", text: "#059669",
    label: "Funded",
    desc: "Wallet covers all active work with adequate buffer.",
  },
  warning: {
    bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.3)", text: "#d97706",
    label: "Warning",
    desc: "Wallet covers active WIP but buffer is thin — monitor closely.",
  },
  gap: {
    bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.2)", text: "#dc2626",
    label: "Funding gap",
    desc: "Wallet cannot cover active WIP. Stage progression is blocked.",
  },
};

const STAGE_STATUS_COLOR: Record<string, string> = {
  in_progress:          "#2563eb",
  awaiting_approval:    "#7c3aed",
  returned:             "#ea580c",
  disputed:             "#dc2626",
  accepted:             "#64748b",
  part_funded:          "#d97706",
  funding_gap:          "#dc2626",
};

function StatusPill({ status }: { status: string }) {
  const color = STAGE_STATUS_COLOR[status] ?? "#94a3b8";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: color + "18", color, border: `1px solid ${color}33` }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Coverage bar
// ---------------------------------------------------------------------------

function CoverageBar({ available, wip }: { available: number; wip: number }) {
  if (wip === 0) {
    return (
      <div className="mt-2">
        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(13,17,68,0.06)" }}>
          <div className="h-full rounded-full" style={{ width: "100%", backgroundColor: "#059669" }} />
        </div>
        <p className="mt-1.5 text-xs" style={{ color: muted }}>No active work — full wallet available.</p>
      </div>
    );
  }
  const pct = Math.min((available / wip) * 100, 100);
  const over = available >= wip;
  const barColor = over ? "#059669" : "#dc2626";
  return (
    <div className="mt-2">
      <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(13,17,68,0.06)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: muted }}>
        <span style={{ color: barColor }}>{gbp.format(available)} available</span>
        <span>{gbp.format(wip)} WIP commitment</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FundingPositionPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [role, setRole]               = useState<AppRole | null>(null);
  const [position, setPosition]       = useState<PositionResponse | null>(null);
  const [summary, setSummary]         = useState<DashboardSummary | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [posRes, dashRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/funding-position`),
        fetch(`/api/projects/${projectId}/dashboard`),
      ]);

      if (!posRes.ok) {
        const d = await posRes.json();
        setError(d.error ?? "Failed to load funding position.");
        return;
      }
      if (!dashRes.ok) {
        const d = await dashRes.json();
        setError(d.error ?? "Failed to load project data.");
        return;
      }

      const [posData, dashData] = await Promise.all([posRes.json(), dashRes.json()]);
      setPosition(posData);
      setSummary(dashData.summary);
      setProjectName(dashData.project?.name ?? "");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setRole(getRole(user));
    });
    load();
  }, [load]);

  const canTopUp = role === "funder" || role === "admin";

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
          <p className="text-sm" style={{ color: muted }}>Loading funding position…</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
          <Link href={`/projects/${projectId}`} className="text-xs font-medium hover:opacity-70" style={{ color: muted }}>
            Back to project
          </Link>
          <div className="mt-6 rounded-2xl px-5 py-4" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>Error</p>
            <p className="mt-1 text-sm" style={{ color: "#b91c1c" }}>{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!position) return null;

  const s = STATE_STYLES[position.state];

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Back nav */}
          <Link href={`/projects/${projectId}`} className="text-xs font-medium hover:opacity-70" style={{ color: muted }}>
            {`\u2190 ${projectName || "Project"}`}
          </Link>

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: navy }}>Funding position</h1>
              <p className="mt-0.5 text-sm" style={{ color: muted }}>Live assurance status · updated on every page load</p>
            </div>
            {canTopUp && (
              <Link
                href={`/projects/${projectId}/wallet`}
                className="inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: navy }}
              >
                Wallet &amp; top-up
              </Link>
            )}
          </div>

          {/* State banner */}
          <div
            className="rounded-[20px] px-5 py-4"
            style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="inline-block rounded-full px-3 py-1 text-sm font-bold"
                style={{ backgroundColor: s.text + "22", color: s.text, border: `1px solid ${s.text}44` }}
              >
                {s.label}
              </span>
              <p className="text-sm" style={{ color: navy }}>{s.desc}</p>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: muted }}>
                Wallet coverage vs active WIP
              </p>
              <CoverageBar available={position.walletBalance} wip={position.projectedWip} />
            </div>
          </div>

          {/* Metric strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Wallet available",
                value: gbp.format(position.wallet.available),
                color: position.state === "gap" ? "#dc2626" : "#059669",
              },
              {
                label: "Active WIP",
                value: gbp.format(position.projectedWip),
                color: position.projectedWip > 0 ? "#2563eb" : muted,
              },
              {
                label: "Ringfenced",
                value: gbp.format(position.wallet.ringfenced),
                color: "#7c3aed",
              },
              {
                label: position.shortfall > 0 ? "Shortfall" : "Buffer above WIP",
                value: position.shortfall > 0
                  ? gbp.format(position.shortfall)
                  : position.coveragePct !== null
                  ? `${(position.coveragePct - 100).toFixed(0)}%`
                  : "—",
                color: position.shortfall > 0 ? "#dc2626" : "#059669",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl px-4 py-4" style={card}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>{label}</p>
                <p className="mt-1.5 text-xl font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Shortfall CTA */}
          {position.state === "gap" && canTopUp && (
            <div
              className="rounded-[20px] px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
              style={{ backgroundColor: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: "#dc2626" }}>
                  Funding shortfall: {gbp.format(position.shortfall)}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: muted }}>
                  Stage progression is blocked until the wallet is topped up.
                </p>
              </div>
              <Link
                href={`/projects/${projectId}/wallet`}
                className="shrink-0 rounded-2xl px-4 py-2 text-sm font-bold transition hover:opacity-90"
                style={{ backgroundColor: "#dc2626", color: "#fff" }}
              >
                Add funds
              </Link>
            </div>
          )}

          {/* Warning CTA */}
          {position.state === "warning" && canTopUp && (
            <div
              className="rounded-[20px] px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
              style={{ backgroundColor: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.25)" }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: "#d97706" }}>Buffer below 15% — consider topping up</p>
                <p className="mt-0.5 text-xs" style={{ color: muted }}>
                  Current coverage: {position.coveragePct?.toFixed(1) ?? "—"}% · Minimum recommended: 115%
                </p>
              </div>
              <Link
                href={`/projects/${projectId}/wallet`}
                className="shrink-0 rounded-2xl px-4 py-2 text-sm font-bold transition hover:opacity-90"
                style={{ backgroundColor: "#d97706", color: "#fff" }}
              >
                Add funds
              </Link>
            </div>
          )}

          {/* Programme summary */}
          {summary && (
            <div className="rounded-[20px] overflow-hidden" style={card}>
              <div
                className="px-5 py-3"
                style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.02)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Programme summary</p>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
                {[
                  { label: "Total contracted", value: gbp.format(summary.totalCommitted), color: navy },
                  { label: "Released to date", value: gbp.format(summary.totalDrawn), color: "#059669" },
                  { label: "Remaining to release", value: gbp.format(summary.totalRemaining), color: "#2563eb" },
                  {
                    label: "Projected draw — next 30 days",
                    value: gbp.format(summary.projectedDraw30d),
                    color: summary.fundingGapWarning ? "#dc2626" : navy,
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm" style={{ color: muted }}>{label}</p>
                    <p className="text-sm font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active WIP stages */}
          {position.activeStages.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>
                Active WIP — {position.activeStages.length} stage{position.activeStages.length !== 1 ? "s" : ""} contributing to commitment
              </p>
              <div className="rounded-[20px] overflow-hidden" style={card}>
                <div className="divide-y" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
                  {position.activeStages.map((stage) => (
                    <div key={stage.stageId} className="flex items-center justify-between px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: navy }}>{stage.stageName}</p>
                        <div className="mt-0.5">
                          <StatusPill status={stage.status} />
                        </div>
                      </div>
                      <p className="ml-4 shrink-0 text-sm font-bold" style={{ color: "#2563eb" }}>
                        {gbp.format(stage.value)}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  className="flex items-center justify-between px-5 py-3 text-sm font-bold"
                  style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.02)" }}
                >
                  <span style={{ color: muted }}>Total active WIP</span>
                  <span style={{ color: "#2563eb" }}>{gbp.format(position.projectedWip)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming stages */}
          {position.upcomingStages.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>
                Upcoming — {position.upcomingStages.length} stage{position.upcomingStages.length !== 1 ? "s" : ""} not yet in WIP
              </p>
              <div className="rounded-[20px] overflow-hidden" style={card}>
                <div className="divide-y" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
                  {position.upcomingStages.map((stage) => (
                    <div key={stage.stageId} className="flex items-center justify-between px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: navy }}>{stage.stageName}</p>
                        <div className="mt-0.5">
                          <StatusPill status={stage.status} />
                        </div>
                      </div>
                      <p className="ml-4 shrink-0 text-sm font-bold" style={{ color: muted }}>
                        {gbp.format(stage.value)}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  className="flex items-center justify-between px-5 py-3 text-sm font-bold"
                  style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.02)" }}
                >
                  <span style={{ color: muted }}>Upcoming total</span>
                  <span style={{ color: muted }}>{gbp.format(position.upcomingWip)}</span>
                </div>
              </div>
            </div>
          )}

          {/* All clear */}
          {position.activeStages.length === 0 && position.upcomingStages.length === 0 && (
            <div className="rounded-[20px] px-6 py-10 text-center" style={card}>
              <p className="text-3xl mb-2">&#10003;</p>
              <p className="text-sm font-semibold" style={{ color: navy }}>No active or upcoming stages</p>
              <p className="mt-1 text-xs" style={{ color: muted }}>
                All work is either released or not yet started. Funding assurance is clear.
              </p>
            </div>
          )}

          {/* Quick links */}
          <div className="rounded-[20px] overflow-hidden" style={card}>
            <div className="divide-y" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
              {[
                { href: `/projects/${projectId}`, label: "Project overview", desc: "Stage register and programme" },
                { href: `/projects/${projectId}/wallet`, label: "Wallet & transactions", desc: "Balance, top-up, and transaction history" },
                { href: `/projects/${projectId}/audit`, label: "Audit log", desc: "Immutable activity trail" },
              ].map(({ href, label, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between px-5 py-3.5 transition hover:bg-neutral-50"
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: navy }}>{label}</p>
                    <p className="text-xs" style={{ color: muted }}>{desc}</p>
                  </div>
                  <span style={{ color: "rgba(13,17,68,0.25)" }}>&#8250;</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
