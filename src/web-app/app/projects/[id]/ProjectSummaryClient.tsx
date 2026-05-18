"use client";

/**
 * Role-aware project dashboard.
 *
 * Funder    — financial overview, stage-by-stage table, funding gap warnings
 * Developer — programme view with spend vs budget, pending evidence, variations
 * Contractor— only their stages, evidence CTAs, evidence status
 * Commercial/Consultant/Admin — same as developer (programme + approvals focus)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getRole, ROLE_LABELS } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import NotificationBell from "../../components/notifications/NotificationBell";
import AppShell from "../../components/AppShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stage = {
  id: string;
  contractId: string;
  name: string;
  value: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  certifiedAmount: number | null;
  variationImpact: number;
  pendingApprovals: number;
  pendingEvidence: number;
  pendingVariations: number;
  activeDisputes: number;
  activeDisputeId: string | null;
  nextAction: string;
};

type Contract = {
  id: string;
  contractorId: string;
  contractorName: string;
  totalValue: number;
  status: string;
  stages: Stage[];
};

type DashboardData = {
  project: { id: string; name: string; address: string; status: string };
  wallet: { balance: number; available: number; ringfenced: number };
  contracts: Contract[];
  summary: {
    totalCommitted: number;
    totalDrawn: number;
    totalRemaining: number;
    pendingApprovals: number;
    activeDisputes: number;
    pendingVariations: number;
    stagesInProgress: number;
    stagesAwaiting: number;
    pendingEvidence: number;
    projectedDraw30d: number;
    fundingGapWarning: boolean;
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const pct = (a: number, b: number) => b === 0 ? "—" : `${Math.round((a / b) * 100)}%`;

const STATUS_COLOR: Record<string, string> = {
  draft:                "#94a3b8",
  sent:                 "#60a5fa",
  accepted:             "#818cf8",
  in_progress:          "#fbbf24",
  awaiting_approval:    "#c084fc",
  returned:             "#fb923c",
  disputed:             "#f87171",
  available_to_release: "#34d399",
  released:             "#4ade80",
  funding_gap:          "#f87171",
  part_funded:          "#fbbf24",
};

const ROLE_COLOR: Record<string, string> = {
  funder:     "#34d399",
  developer:  "#60a5fa",
  contractor: "#fbbf24",
  commercial: "#a78bfa",
  consultant: "#fb923c",
  admin:      "#f87171",
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#94a3b8";
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: color + "22", color }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function MetricCard({ label, value, tone, sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tracking-tight ${tone ?? "text-white"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-600">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{title}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-600">{sub}</p>}
    </div>
  );
}

function Badge({ count, color = "#f87171" }: { count: number; color?: string }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function dateStr(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(d));
}

// ---------------------------------------------------------------------------
// Role-specific views
// ---------------------------------------------------------------------------

function FunderView({ data, projectId }: { data: DashboardData; projectId: string }) {
  const { wallet, summary, contracts } = data;
  const allStages = contracts.flatMap((c) =>
    c.stages.map((s) => ({ ...s, contractorName: c.contractorName })),
  );
  const firstAwaitingStage = allStages.find((s) => s.status === "awaiting_approval");
  const firstDisputedStage = allStages.find((s) => s.activeDisputes > 0);

  return (
    <div className="space-y-6">
      {/* Funding gap warning */}
      {summary.fundingGapWarning && (
        <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p className="text-xs font-bold uppercase tracking-wider text-red-400">Funding gap warning</p>
          <p className="mt-1 text-sm text-red-200">
            Wallet available ({gbp.format(wallet.available)}) is less than the projected 30-day draw ({gbp.format(summary.projectedDraw30d)}).
            Add funds to avoid blocking work.
          </p>
          <Link href={`/projects/${projectId}/wallet`} className="mt-2 inline-block text-xs font-semibold text-red-300 hover:text-red-100">
            Add funds →
          </Link>
        </div>
      )}

      {/* Mobile-only: metric cards + action buttons */}
      <div className="md:hidden space-y-6">
        <div>
          <SectionHeader title="Funding position" />
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Total committed" value={gbp.format(summary.totalCommitted)} />
            <MetricCard label="Total drawn" value={gbp.format(summary.totalDrawn)} tone="text-green-400" />
            <MetricCard label="Ringfenced" value={gbp.format(wallet.ringfenced)} tone="text-blue-400" sub="Allocated to active stages" />
            <MetricCard label="Available balance" value={gbp.format(wallet.available)} tone={wallet.available < summary.projectedDraw30d ? "text-red-400" : "text-white"} sub="Free in wallet" />
          </div>
        </div>
        <div>
          <SectionHeader title="Action required" />
          <div className="flex flex-wrap gap-2">
            {summary.pendingApprovals > 0 && (
              <Link
                href={`/projects/${projectId}/stages/${firstAwaitingStage?.id ?? ""}/approve`}
                className="inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "rgba(192,132,252,0.2)", border: "1px solid rgba(192,132,252,0.3)" }}
              >
                Pending approvals
                <Badge count={summary.pendingApprovals} color="#c084fc" />
              </Link>
            )}
            {summary.activeDisputes > 0 && (
              <Link
                href={`/projects/${projectId}/stages/${firstDisputedStage?.id ?? ""}/disputes`}
                className="inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.25)" }}
              >
                Active disputes
                <Badge count={summary.activeDisputes} color="#f87171" />
              </Link>
            )}
            <Link
              href={`/projects/${projectId}/wallet`}
              className="inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              Wallet & transactions
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop: stage register table + wallet sidebar */}
      <div className="md:flex md:gap-6 md:items-start">

        {/* Stage register */}
        <div className="flex-1 min-w-0">
          <SectionHeader title="Stage register" sub="All stages · contracted value · certified · next action" />

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-white/8">
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Contractor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Contracted</th>
                  <th className="px-4 py-3 font-medium text-right">Certified</th>
                  <th className="px-4 py-3 font-medium">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allStages.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => { window.location.href = `/projects/${projectId}/stages/${s.id}`; }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{s.name}</p>
                      {s.activeDisputes > 0 && s.activeDisputeId && (
                        <Link
                          href={`/projects/${projectId}/stages/${s.id}/disputes/${s.activeDisputeId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-bold text-red-400 underline underline-offset-2 hover:text-red-300"
                        >
                          ⚠ View dispute
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link
                        href={`/projects/${projectId}/contracts/${s.contractId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-neutral-400 hover:text-blue-300 transition underline-offset-2 hover:underline"
                      >
                        {s.contractorName}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-white">{gbp.format(s.value)}</td>
                    <td className="px-4 py-3 text-right">
                      {s.certifiedAmount !== null ? (
                        <span className={s.certifiedAmount === s.value ? "text-green-400 font-semibold" : "text-purple-300"}>
                          {gbp.format(s.certifiedAmount)}
                          {s.certifiedAmount === s.value && " ✓"}
                        </span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400 max-w-[180px]">{s.nextAction}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-white/10">
                <tr className="text-sm font-bold">
                  <td className="px-4 py-3 text-white" colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-right text-white">{gbp.format(summary.totalCommitted)}</td>
                  <td className="px-4 py-3 text-right text-green-400">{gbp.format(summary.totalDrawn)} drawn</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{gbp.format(summary.totalRemaining)} remaining</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="space-y-2 md:hidden">
            {allStages.map((s) => (
              <Link
                key={s.id}
                href={`/projects/${projectId}/stages/${s.id}`}
                className="flex items-start gap-3 rounded-2xl px-4 py-3 transition hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                  <p className="text-xs text-neutral-500">{s.contractorName}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <StatusPill status={s.status} />
                    {s.activeDisputes > 0 && s.activeDisputeId && (
                      <Link
                        href={`/projects/${projectId}/stages/${s.id}/disputes/${s.activeDisputeId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-bold text-red-400 underline underline-offset-2 hover:text-red-300"
                      >
                        ⚠ Dispute — tap to view
                      </Link>
                    )}
                    {s.activeDisputes > 0 && !s.activeDisputeId && (
                      <span className="text-[10px] font-bold text-red-400">⚠ Dispute</span>
                    )}
                    {s.pendingApprovals > 0 && <span className="text-[10px] font-bold text-purple-400">● Approval pending</span>}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{s.nextAction}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white">{gbp.format(s.value)}</p>
                  {s.certifiedAmount !== null && s.certifiedAmount !== s.value && (
                    <p className="text-xs text-purple-300">Cert: {gbp.format(s.certifiedAmount)}</p>
                  )}
                  {s.certifiedAmount !== null && s.certifiedAmount === s.value && (
                    <p className="text-xs text-green-400">Certified ✓</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop-only: wallet sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-72 md:shrink-0 gap-4 sticky top-6">
          {/* Wallet card */}
          <div className="rounded-2xl p-4 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Wallet</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Total committed</span>
                <span className="font-bold text-white">{gbp.format(summary.totalCommitted)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Drawn to date</span>
                <span className="font-bold text-green-400">{gbp.format(summary.totalDrawn)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Ringfenced</span>
                <span className="font-bold text-blue-400">{gbp.format(wallet.ringfenced)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                <span className="text-neutral-400">Available</span>
                <span className={`font-bold ${wallet.available < summary.projectedDraw30d ? "text-red-400" : "text-white"}`}>
                  {gbp.format(wallet.available)}
                </span>
              </div>
            </div>
            <Link
              href={`/projects/${projectId}/wallet`}
              className="block w-full text-center rounded-xl py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              Wallet & transactions
            </Link>
          </div>

          {/* Action buttons */}
          {(summary.pendingApprovals > 0 || summary.activeDisputes > 0) && (
            <div className="space-y-2">
              {summary.pendingApprovals > 0 && (
                <Link
                  href={`/projects/${projectId}/stages/${firstAwaitingStage?.id ?? ""}/approve`}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "rgba(192,132,252,0.2)", border: "1px solid rgba(192,132,252,0.3)" }}
                >
                  <span>Pending approvals</span>
                  <Badge count={summary.pendingApprovals} color="#c084fc" />
                </Link>
              )}
              {summary.activeDisputes > 0 && (
                <Link
                  href={`/projects/${projectId}/stages/${firstDisputedStage?.id ?? ""}/disputes`}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.25)" }}
                >
                  <span>Active disputes</span>
                  <Badge count={summary.activeDisputes} color="#f87171" />
                </Link>
              )}
            </div>
          )}

          {/* 30-day projection */}
          {summary.projectedDraw30d > 0 && (
            <div className="rounded-2xl px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
              <p className="text-xs text-neutral-500">Projected draw — next 30 days</p>
              <p className={`mt-1 text-lg font-bold ${summary.fundingGapWarning ? "text-red-400" : "text-white"}`}>
                {gbp.format(summary.projectedDraw30d)}
              </p>
              {summary.fundingGapWarning && (
                <p className="mt-0.5 text-[10px] text-red-400">Funds short — top up wallet</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function DeveloperView({ data, projectId }: { data: DashboardData; projectId: string }) {
  const { summary, contracts } = data;
  const allStages = contracts.flatMap((c) => c.stages.map((s) => ({ ...s, contractorName: c.contractorName })));

  function stageProgress(status: string): number {
    switch (status) {
      case "released":             return 100;
      case "available_to_release": return 95;
      case "awaiting_approval":    return 80;
      case "in_progress":          return 40;
      default:                     return 5;
    }
  }

  return (
    <div className="space-y-6">
      {/* Programme summary — metric cards */}
      <div>
        <SectionHeader title="Programme summary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="In progress" value={String(summary.stagesInProgress)} tone="text-amber-400" />
          <MetricCard label="Awaiting approval" value={String(summary.stagesAwaiting)} tone="text-purple-400" />
          <MetricCard label="Evidence to review" value={String(summary.pendingEvidence)} tone={summary.pendingEvidence > 0 ? "text-orange-400" : "text-white"} />
          <MetricCard label="Variations pending" value={String(summary.pendingVariations)} tone={summary.pendingVariations > 0 ? "text-blue-400" : "text-white"} />
        </div>
      </div>

      {/* Needs attention */}
      {(summary.pendingEvidence > 0 || summary.pendingVariations > 0 || summary.activeDisputes > 0) && (
        <div>
          <SectionHeader title="Needs attention" />
          <div className="space-y-2">
            {allStages.filter((s) => s.pendingEvidence > 0 || s.pendingVariations > 0 || s.activeDisputes > 0).map((s) => (
              <Link
                key={s.id}
                href={`/projects/${projectId}/stages/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-white/5"
                style={{ border: "1px solid rgba(251,191,36,0.2)", backgroundColor: "rgba(251,191,36,0.05)" }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  <p className="text-xs text-neutral-400">{s.contractorName}</p>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {s.pendingEvidence > 0 && <span className="text-[10px] text-orange-400 font-semibold">{s.pendingEvidence} evidence pending</span>}
                    {s.pendingVariations > 0 && <span className="text-[10px] text-blue-400 font-semibold">{s.pendingVariations} variation(s)</span>}
                    {s.activeDisputes > 0 && s.activeDisputeId && (
                      <Link
                        href={`/projects/${projectId}/stages/${s.id}/disputes/${s.activeDisputeId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-semibold text-red-400 underline underline-offset-2"
                      >
                        ⚠ View dispute
                      </Link>
                    )}
                  </div>
                </div>
                <StatusPill status={s.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Full programme */}
      <div>
        <SectionHeader title="Full programme" sub="All stages · spend vs budget" />

        {/* Desktop: programme table */}
        <div className="hidden md:block overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500 border-b border-white/8">
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Contractor</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium text-right">Budget</th>
                <th className="px-4 py-3 font-medium w-36">Progress</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allStages.map((s) => {
                const progressPct = stageProgress(s.status);
                const drawn = s.status === "released" ? s.value : 0;
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => { window.location.href = `/projects/${projectId}/stages/${s.id}`; }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{s.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400">{s.contractorName}</td>
                    <td className="px-4 py-3 text-xs text-neutral-400">{dateStr(s.startDate)}</td>
                    <td className="px-4 py-3 text-xs text-neutral-400">{dateStr(s.endDate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-white">{gbp.format(s.value)}</td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progressPct}%`, backgroundColor: STATUS_COLOR[s.status] ?? "#94a3b8" }}
                        />
                      </div>
                      <p className="text-[10px] text-neutral-600 mt-0.5">
                        {drawn > 0 ? `${gbp.format(drawn)} drawn` : `${progressPct}%`}
                      </p>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-white/10">
              <tr className="text-sm font-bold">
                <td className="px-4 py-3 text-white" colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right text-white">{gbp.format(summary.totalCommitted)}</td>
                <td className="px-4 py-3 text-xs text-neutral-500">{gbp.format(summary.totalDrawn)} released</td>
                <td className="px-4 py-3 text-xs text-neutral-500">{gbp.format(summary.totalRemaining)} left</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile: progress bar cards */}
        <div className="md:hidden space-y-2">
          {contracts.map((c) => (
            <div key={c.id}>
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-neutral-400">{c.contractorName}</p>
                <Link href={`/projects/${projectId}/contracts/${c.id}`} className="text-[10px] font-medium text-blue-400 hover:text-blue-200 transition">
                  View contract →
                </Link>
              </div>
              {c.stages.map((s) => {
                const drawn = s.status === "released" ? s.value : 0;
                const pctDrawn = pct(drawn, s.value);
                const progressPct = stageProgress(s.status);
                return (
                  <Link
                    key={s.id}
                    href={`/projects/${projectId}/stages/${s.id}`}
                    className="mb-2 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-white/5"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                      <p className="text-xs text-neutral-500">{dateStr(s.startDate)} – {dateStr(s.endDate)}</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${progressPct}%`, backgroundColor: STATUS_COLOR[s.status] ?? "#94a3b8" }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white">{gbp.format(s.value)}</p>
                      <p className="text-xs text-neutral-500">Drawn: {pctDrawn}</p>
                      <StatusPill status={s.status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContractorView({ data, projectId, contractorId }: { data: DashboardData; projectId: string; contractorId: string }) {
  // Contractor only sees their own contracts
  const myContracts = data.contracts.filter((c) => c.contractorId === contractorId);
  const allMyStages = myContracts.flatMap((c) => c.stages);

  if (myContracts.length === 0) {
    return (
      <div className="rounded-2xl px-4 py-8 text-center" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-neutral-400">No stages assigned to you on this project.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload evidence CTAs */}
      {allMyStages.some((s) => s.status === "in_progress") && (
        <div>
          <SectionHeader title="Action required — upload evidence" />
          <div className="space-y-2">
            {allMyStages.filter((s) => s.status === "in_progress").map((s) => (
              <Link
                key={s.id}
                href={`/projects/${projectId}/stages/${s.id}/action`}
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-4 transition"
                style={{ backgroundColor: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}
              >
                <div>
                  <p className="text-sm font-bold text-white">{s.name}</p>
                  <p className="mt-0.5 text-xs text-amber-300">Upload completion evidence to proceed</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{gbp.format(s.value)}</p>
                </div>
                <span className="shrink-0 rounded-2xl px-3 py-1.5 text-xs font-bold text-amber-200" style={{ backgroundColor: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.3)" }}>
                  Upload →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All my stages with evidence status */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">My stages</p>
          {myContracts.length === 1 && (
            <Link
              href={`/projects/${projectId}/contracts/${myContracts[0].id}`}
              className="text-[10px] font-medium text-blue-400 hover:text-blue-200 transition"
            >
              View contract →
            </Link>
          )}
        </div>
        <div className="space-y-2">
          {allMyStages.map((s) => (
            <Link
              key={s.id}
              href={`/projects/${projectId}/stages/${s.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                <StatusPill status={s.status} />
                {s.pendingEvidence > 0 && (
                  <p className="mt-1 text-xs text-orange-400">{s.pendingEvidence} evidence under review</p>
                )}
                {s.status === "returned" && (
                  <p className="mt-1 text-xs text-orange-400">Returned — action required</p>
                )}
              </div>
              <p className="shrink-0 text-sm font-bold text-white">{gbp.format(s.value)}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StageDetailPanel({
  stage,
  projectId,
}: {
  stage: Stage & { contractorName: string };
  projectId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{stage.name}</h3>
            <p className="text-sm text-neutral-400">{stage.contractorName}</p>
          </div>
          <StatusPill status={stage.status} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <p className="text-xs text-neutral-500">Contracted value</p>
            <p className="text-xl font-bold text-white mt-1">{gbp.format(stage.value)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Certified amount</p>
            <p className="text-xl font-bold text-purple-300 mt-1">
              {stage.certifiedAmount !== null ? gbp.format(stage.certifiedAmount) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Approvals pending</p>
            <p className={`text-xl font-bold mt-1 ${stage.pendingApprovals > 0 ? "text-purple-400" : "text-neutral-600"}`}>
              {stage.pendingApprovals}
            </p>
          </div>
        </div>

        <p className="text-xs text-neutral-500 mb-4">Next: {stage.nextAction}</p>

        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/projects/${projectId}/stages/${stage.id}/approve`}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "rgba(192,132,252,0.25)", border: "1px solid rgba(192,132,252,0.4)" }}
          >
            Review &amp; sign off →
          </Link>
          <Link
            href={`/projects/${projectId}/stages/${stage.id}`}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:text-white"
            style={{ border: "1px solid rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            Full stage detail
          </Link>
          {stage.activeDisputes > 0 && stage.activeDisputeId && (
            <Link
              href={`/projects/${projectId}/stages/${stage.id}/disputes/${stage.activeDisputeId}`}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-red-300 transition hover:opacity-90"
              style={{ border: "1px solid rgba(248,113,113,0.3)", backgroundColor: "rgba(248,113,113,0.1)" }}
            >
              ⚠ View dispute
            </Link>
          )}
        </div>
      </div>

      {stage.variationImpact !== 0 && (
        <div className="rounded-2xl px-4 py-3" style={{ border: "1px solid rgba(96,165,250,0.2)", backgroundColor: "rgba(96,165,250,0.05)" }}>
          <p className="text-xs text-neutral-500">Approved variation impact</p>
          <p className={`text-sm font-bold mt-0.5 ${stage.variationImpact > 0 ? "text-green-400" : "text-red-400"}`}>
            {stage.variationImpact > 0 ? "+" : ""}{gbp.format(stage.variationImpact)}
          </p>
        </div>
      )}
    </div>
  );
}

function CommercialView({ data, projectId }: { data: DashboardData; projectId: string }) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const { summary, contracts } = data;
  const allStages = contracts.flatMap((c) =>
    c.stages.map((s) => ({ ...s, contractorName: c.contractorName })),
  );
  const approvalStages = allStages.filter((s) => s.status === "awaiting_approval" || s.pendingApprovals > 0);
  const selectedStage = selectedStageId ? allStages.find((s) => s.id === selectedStageId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Desktop: master-detail layout */}
      <div className="hidden md:flex md:gap-6 md:items-start">

        {/* Left panel: approval queue + stage list */}
        <div className="w-72 shrink-0 space-y-5">
          <div>
            <SectionHeader title="Approvals required" />
            {approvalStages.length === 0 ? (
              <p className="text-xs text-neutral-500 px-1">No stages awaiting approval</p>
            ) : (
              <div className="space-y-1">
                {approvalStages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStageId(s.id)}
                    className="w-full text-left rounded-xl px-3 py-2.5 transition"
                    style={
                      selectedStageId === s.id
                        ? { backgroundColor: "rgba(192,132,252,0.2)", border: "1px solid rgba(192,132,252,0.4)" }
                        : { backgroundColor: "transparent", border: "1px solid transparent" }
                    }
                  >
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    <p className="text-xs text-purple-300">{s.pendingApprovals} pending · {gbp.format(s.value)}</p>
                    <p className="text-xs text-neutral-500">{s.contractorName}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader title="All stages" />
            <div className="space-y-0.5">
              {allStages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStageId(s.id)}
                  className="w-full text-left rounded-xl px-3 py-2 transition hover:bg-white/5"
                  style={
                    selectedStageId === s.id
                      ? { backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }
                      : { backgroundColor: "transparent", border: "1px solid transparent" }
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-neutral-300 truncate">{s.name}</p>
                    <StatusPill status={s.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Pending approvals" value={String(summary.pendingApprovals)} tone="text-purple-400" />
            <MetricCard label="Active disputes" value={String(summary.activeDisputes)} tone={summary.activeDisputes > 0 ? "text-red-400" : "text-white"} />
          </div>
        </div>

        {/* Right panel: stage detail */}
        <div className="flex-1 min-w-0">
          {selectedStage ? (
            <StageDetailPanel stage={selectedStage} projectId={projectId} />
          ) : (
            <div
              className="rounded-2xl flex items-center justify-center h-56"
              style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" }}
            >
              <div className="text-center">
                <p className="text-sm text-neutral-500">Select a stage to review</p>
                <p className="text-xs text-neutral-600 mt-1">Pick from the approval queue or stage list on the left</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: existing card layout */}
      <div className="md:hidden space-y-6">
        <div>
          <SectionHeader title="Approvals required" />
          {approvalStages.length === 0 ? (
            <p className="text-sm text-neutral-500">No stages currently awaiting your approval.</p>
          ) : (
            <div className="space-y-2">
              {approvalStages.map((s) => (
                <Link
                  key={s.id}
                  href={`/projects/${projectId}/stages/${s.id}/approve`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-white/5"
                  style={{ border: "1px solid rgba(192,132,252,0.3)", backgroundColor: "rgba(192,132,252,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    <p className="text-xs text-purple-300 mt-0.5">{s.pendingApprovals} approval(s) pending</p>
                    <p className="text-xs text-neutral-500">{s.contractorName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">{gbp.format(s.value)}</p>
                    {s.certifiedAmount !== null && s.certifiedAmount !== s.value && (
                      <p className="text-xs text-purple-300">Cert: {gbp.format(s.certifiedAmount)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeader title="All stages" />
          <div className="space-y-2">
            {allStages.map((s) => (
              <Link
                key={s.id}
                href={`/projects/${projectId}/stages/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  <p className="text-xs text-neutral-500">{s.contractorName}</p>
                  <StatusPill status={s.status} />
                </div>
                <p className="text-sm font-bold text-white shrink-0">{gbp.format(s.value)}</p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader title="Summary" />
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Pending approvals" value={String(summary.pendingApprovals)} tone="text-purple-400" />
            <MetricCard label="Active disputes" value={String(summary.activeDisputes)} tone={summary.activeDisputes > 0 ? "text-red-400" : "text-white"} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project switcher
// ---------------------------------------------------------------------------

function ProjectSwitcher({ currentProjectId, currentProjectName }: { currentProjectId: string; currentProjectName: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects((d.projects ?? []) as Array<{ id: string; name: string }>))
      .catch(() => { /* non-fatal */ });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const others = projects.filter((p) => p.id !== currentProjectId);

  if (others.length === 0) {
    return (
      <Link href="/projects" className="text-xs text-neutral-500 hover:text-white">← Projects</Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
      >
        <span className="text-neutral-500">←</span>
        <span className="max-w-[140px] truncate font-medium">{currentProjectName}</span>
        <span className="text-neutral-500" style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 w-52 rounded-2xl py-1 shadow-xl"
          style={{ backgroundColor: "#1a2060", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <Link
            href="/projects"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-xs text-neutral-400 hover:text-white transition"
          >
            All projects
          </Link>
          <div className="my-1 border-t border-white/10" />
          {others.map((p) => (
            <button
              key={p.id}
              onClick={() => { router.push(`/projects/${p.id}`); setOpen(false); }}
              className="block w-full px-4 py-2.5 text-left text-xs text-neutral-300 hover:text-white transition"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav links by role
// ---------------------------------------------------------------------------

const NAV_LINKS: Record<AppRole, Array<{ label: string; href: (id: string) => string }>> = {
  funder: [
    { label: "Wallet", href: (id) => `/projects/${id}/wallet` },
    { label: "Reports", href: (id) => `/projects/${id}/reports` },
    { label: "Audit", href: (id) => `/projects/${id}/audit` },
    { label: "Members", href: (id) => `/projects/${id}/members` },
  ],
  developer: [
    { label: "Reports", href: (id) => `/projects/${id}/reports` },
    { label: "Audit", href: (id) => `/projects/${id}/audit` },
    { label: "Members", href: (id) => `/projects/${id}/members` },
    { label: "Add contract", href: (id) => `/projects/${id}/contracts/new` },
  ],
  commercial: [
    { label: "Audit", href: (id) => `/projects/${id}/audit` },
  ],
  consultant: [
    { label: "Audit", href: (id) => `/projects/${id}/audit` },
  ],
  contractor: [],   // no extra nav for contractor
  admin: [
    { label: "Wallet", href: (id) => `/projects/${id}/wallet` },
    { label: "Reports", href: (id) => `/projects/${id}/reports` },
    { label: "Audit", href: (id) => `/projects/${id}/audit` },
    { label: "Members", href: (id) => `/projects/${id}/members` },
    { label: "Add contract", href: (id) => `/projects/${id}/contracts/new` },
  ],
};

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function ProjectSummaryClient({ projectId }: { projectId: string }) {
  const [role, setRole]         = useState<AppRole | null>(null);
  const [userId, setUserId]     = useState<string | null>(null);
  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // 1. Load user role
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setRole(getRole(user));
        setUserId(user.id);
      }
    });
  }, []);

  // 2. Load dashboard data
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/dashboard`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to load project.");
        return;
      }
      const d = await res.json();
      setData(d);
    } catch {
      setError("Network error loading project dashboard.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
          <p className="text-neutral-500 text-sm">Loading project…</p>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
          <Link href="/projects" className="text-xs text-neutral-400 hover:text-white">← Projects</Link>
          <p className="mt-6 text-sm text-red-300">{error ?? "Project not found."}</p>
        </div>
      </AppShell>
    );
  }

  const navLinks = role ? (NAV_LINKS[role] ?? []) : [];
  const roleColor = role ? (ROLE_COLOR[role] ?? "#94a3b8") : "#94a3b8";
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : "";

  return (
    <AppShell>
    <div className="min-h-full px-4 md:px-8 py-6 space-y-6 max-w-7xl mx-auto" style={{ backgroundColor: "#0d1144", minHeight: "100%" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <ProjectSwitcher currentProjectId={projectId} currentProjectName={data.project.name} />
          <h1 className="mt-1 text-2xl font-bold text-white">{data.project.name}</h1>
          <p className="text-sm text-neutral-400">{data.project.address}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Role badge */}
          {role && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: roleColor + "22", color: roleColor, border: `1px solid ${roleColor}44` }}
            >
              {roleLabel}
            </span>
          )}
          <NotificationBell />
        </div>
      </div>

      {/* Role-specific nav links */}
      {navLinks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href(projectId)}
              className="rounded-2xl px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {/* Role-specific dashboard content */}
      {role === "funder" && <FunderView data={data} projectId={projectId} />}
      {role === "developer" && <DeveloperView data={data} projectId={projectId} />}
      {role === "contractor" && <ContractorView data={data} projectId={projectId} contractorId={userId ?? ""} />}
      {(role === "commercial" || role === "consultant" || role === "admin") && (
        <CommercialView data={data} projectId={projectId} />
      )}
      {!role && <DeveloperView data={data} projectId={projectId} />}
    </div>
    </AppShell>
  );
}
