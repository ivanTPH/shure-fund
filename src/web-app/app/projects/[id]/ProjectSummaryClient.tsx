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
  sent:                 "#2563eb",
  accepted:             "#7c3aed",
  in_progress:          "#d97706",
  awaiting_approval:    "#7c3aed",
  returned:             "#ea580c",
  disputed:             "#dc2626",
  available_to_release: "#059669",
  released:             "#16a34a",
  funding_gap:          "#dc2626",
  part_funded:          "#d97706",
};

const ROLE_COLOR: Record<string, string> = {
  funder:     "#059669",
  developer:  "#2563eb",
  contractor: "#d97706",
  commercial: "#7c3aed",
  consultant: "#ea580c",
  admin:      "#dc2626",
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
  const valueColor = tone === "text-green-400" ? "#059669"
    : tone === "text-red-400" ? "#dc2626"
    : tone === "text-blue-400" ? "#2563eb"
    : tone === "text-purple-400" ? "#7c3aed"
    : tone === "text-orange-400" ? "#ea580c"
    : "var(--brand-navy, #0D1144)";
  return (
    <div className="rounded-2xl px-4 py-3" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
      <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>{title}</p>
      {sub && <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>{sub}</p>}
    </div>
  );
}

function Badge({ count, color = "#dc2626" }: { count: number; color?: string }) {
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

function FunderView({ data, projectId, role }: { data: DashboardData; projectId: string; role: AppRole }) {
  const { wallet, summary, contracts } = data;
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const allStages = contracts.flatMap((c) =>
    c.stages.map((s) => ({ ...s, contractorName: c.contractorName })),
  );
  const firstAwaitingStage = allStages.find((s) => s.status === "awaiting_approval");
  const firstDisputedStage = allStages.find((s) => s.activeDisputes > 0);
  const selectedStage = selectedStageId ? allStages.find((s) => s.id === selectedStageId) ?? null : null;

  return (
    <>
    <div className="space-y-6">
      {/* Funding gap warning */}
      {summary.fundingGapWarning && (
        <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#dc2626" }}>Funding gap warning</p>
          <p className="mt-1 text-sm" style={{ color: "#b91c1c" }}>
            Wallet available ({gbp.format(wallet.available)}) is less than the projected 30-day draw ({gbp.format(summary.projectedDraw30d)}).
            Add funds to avoid blocking work.
          </p>
          <Link href={`/projects/${projectId}/wallet`} className="mt-2 inline-block text-xs font-semibold transition hover:opacity-70" style={{ color: "#dc2626" }}>
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
            <MetricCard label="Available balance" value={gbp.format(wallet.available)} tone={wallet.available < summary.projectedDraw30d ? "text-red-400" : undefined} sub="Free in wallet" />
          </div>
        </div>
        <div>
          <SectionHeader title="Action required" />
          <div className="flex flex-wrap gap-2">
            {summary.pendingApprovals > 0 && (
              <Link
                href={`/projects/${projectId}/stages/${firstAwaitingStage?.id ?? ""}/approve`}
                className="inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "#7c3aed" }}
              >
                Pending approvals
                <Badge count={summary.pendingApprovals} color="#7c3aed" />
              </Link>
            )}
            {summary.activeDisputes > 0 && (
              <Link
                href={
                  firstDisputedStage?.activeDisputeId
                    ? `/projects/${projectId}/stages/${firstDisputedStage.id}/disputes/${firstDisputedStage.activeDisputeId}`
                    : `/projects/${projectId}/stages/${firstDisputedStage?.id ?? ""}`
                }
                className="inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}
              >
                Active disputes
                <Badge count={summary.activeDisputes} color="#dc2626" />
              </Link>
            )}
            <Link
              href={`/projects/${projectId}/wallet`}
              className="inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
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
          <div className="hidden md:block overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: "rgba(13,17,68,0.45)", borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Contractor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Contracted</th>
                  <th className="px-4 py-3 font-medium text-right">Certified</th>
                  <th className="px-4 py-3 font-medium">Next action</th>
                </tr>
              </thead>
              <tbody>
                {allStages.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer transition-colors hover:bg-neutral-50"
                    style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}
                    onClick={() => setSelectedStageId(s.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                      {s.activeDisputes > 0 && s.activeDisputeId && (
                        <Link
                          href={`/projects/${projectId}/stages/${s.id}/disputes/${s.activeDisputeId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-bold underline underline-offset-2 hover:opacity-70" style={{ color: "#dc2626" }}
                        >
                          ⚠ View dispute
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link
                        href={`/projects/${projectId}/contracts/${s.contractId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="transition hover:opacity-70 underline-offset-2 hover:underline"
                        style={{ color: "rgba(13,17,68,0.55)" }}
                      >
                        {s.contractorName}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.value)}</td>
                    <td className="px-4 py-3 text-right">
                      {s.certifiedAmount !== null ? (
                        <span style={{ color: s.certifiedAmount === s.value ? "#059669" : "#7c3aed", fontWeight: 600 }}>
                          {gbp.format(s.certifiedAmount)}
                          {s.certifiedAmount === s.value && " ✓"}
                        </span>
                      ) : (
                        <span style={{ color: "rgba(13,17,68,0.3)" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[180px]" style={{ color: "rgba(13,17,68,0.5)" }}>{s.nextAction}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                <tr className="text-sm font-bold">
                  <td className="px-4 py-3" style={{ color: "var(--brand-navy, #0D1144)" }} colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(summary.totalCommitted)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "#059669" }}>{gbp.format(summary.totalDrawn)} drawn</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{gbp.format(summary.totalRemaining)} remaining</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="space-y-2 md:hidden">
            {allStages.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStageId(s.id)}
                className="w-full flex items-start gap-3 rounded-2xl px-4 py-3 transition hover:bg-neutral-50 text-left"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                  <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{s.contractorName}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <StatusPill status={s.status} />
                    {s.activeDisputes > 0 && s.activeDisputeId && (
                      <Link
                        href={`/projects/${projectId}/stages/${s.id}/disputes/${s.activeDisputeId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-bold underline underline-offset-2"
                        style={{ color: "#dc2626" }}
                      >
                        ⚠ Dispute — tap to view
                      </Link>
                    )}
                    {s.activeDisputes > 0 && !s.activeDisputeId && (
                      <span className="text-[10px] font-bold" style={{ color: "#dc2626" }}>⚠ Dispute</span>
                    )}
                    {s.pendingApprovals > 0 && <span className="text-[10px] font-bold" style={{ color: "#7c3aed" }}>● Approval pending</span>}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{s.nextAction}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.value)}</p>
                  {s.certifiedAmount !== null && s.certifiedAmount !== s.value && (
                    <p className="text-xs" style={{ color: "#7c3aed" }}>Cert: {gbp.format(s.certifiedAmount)}</p>
                  )}
                  {s.certifiedAmount !== null && s.certifiedAmount === s.value && (
                    <p className="text-xs" style={{ color: "#059669" }}>Certified ✓</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop-only: wallet sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-72 md:shrink-0 gap-4 sticky top-6">
          {/* Wallet card */}
          <div className="rounded-2xl p-4 space-y-3" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Wallet</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: "rgba(13,17,68,0.55)" }}>Total committed</span>
                <span className="font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(summary.totalCommitted)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "rgba(13,17,68,0.55)" }}>Drawn to date</span>
                <span className="font-bold" style={{ color: "#059669" }}>{gbp.format(summary.totalDrawn)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "rgba(13,17,68,0.55)" }}>Ringfenced</span>
                <span className="font-bold" style={{ color: "#2563eb" }}>{gbp.format(wallet.ringfenced)}</span>
              </div>
              <div className="pt-2 flex justify-between text-sm" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                <span style={{ color: "rgba(13,17,68,0.55)" }}>Available</span>
                <span className="font-bold" style={{ color: wallet.available < summary.projectedDraw30d ? "#dc2626" : "#059669" }}>
                  {gbp.format(wallet.available)}
                </span>
              </div>
            </div>
            <Link
              href={`/projects/${projectId}/wallet`}
              className="block w-full text-center rounded-xl py-2 text-xs font-semibold transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand-navy, #0D1144)", color: "#fff" }}
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
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90"
                  style={{ backgroundColor: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "#7c3aed" }}
                >
                  <span>Pending approvals</span>
                  <Badge count={summary.pendingApprovals} color="#7c3aed" />
                </Link>
              )}
              {summary.activeDisputes > 0 && (
                <Link
                  href={
                    firstDisputedStage?.activeDisputeId
                      ? `/projects/${projectId}/stages/${firstDisputedStage.id}/disputes/${firstDisputedStage.activeDisputeId}`
                      : `/projects/${projectId}/stages/${firstDisputedStage?.id ?? ""}`
                  }
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90"
                  style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}
                >
                  <span>Active disputes</span>
                  <Badge count={summary.activeDisputes} color="#dc2626" />
                </Link>
              )}
            </div>
          )}

          {/* 30-day projection */}
          {summary.projectedDraw30d > 0 && (
            <div className="rounded-2xl px-4 py-3" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
              <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Projected draw — next 30 days</p>
              <p className="mt-1 text-lg font-bold" style={{ color: summary.fundingGapWarning ? "#dc2626" : "var(--brand-navy, #0D1144)" }}>
                {gbp.format(summary.projectedDraw30d)}
              </p>
              {summary.fundingGapWarning && (
                <p className="mt-0.5 text-[10px]" style={{ color: "#dc2626" }}>Funds short — top up wallet</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
    {selectedStage && (
      <StageDrawer stage={selectedStage} projectId={projectId} role={role} onClose={() => setSelectedStageId(null)} />
    )}
    </>
  );
}

function DeveloperView({ data, projectId, role }: { data: DashboardData; projectId: string; role: AppRole }) {
  const { summary, contracts } = data;
  const router = useRouter();
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const allStages = contracts.flatMap((c) => c.stages.map((s) => ({ ...s, contractorName: c.contractorName })));
  const selectedStage = selectedStageId ? allStages.find((s) => s.id === selectedStageId) ?? null : null;

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
    <>
    <div className="space-y-6">
      {/* Programme summary — metric cards */}
      <div>
        <SectionHeader title="Programme summary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="In progress" value={String(summary.stagesInProgress)} tone="text-amber-400" />
          <MetricCard label="Awaiting approval" value={String(summary.stagesAwaiting)} tone="text-purple-400" />
          <MetricCard label="Evidence to review" value={String(summary.pendingEvidence)} tone={summary.pendingEvidence > 0 ? "text-orange-400" : undefined} />
          <MetricCard label="Variations pending" value={String(summary.pendingVariations)} tone={summary.pendingVariations > 0 ? "text-blue-400" : undefined} />
        </div>
      </div>

      {/* Needs attention */}
      {(summary.pendingEvidence > 0 || summary.pendingVariations > 0 || summary.activeDisputes > 0) && (
        <div>
          <SectionHeader title="Needs attention" />
          <div className="space-y-2">
            {allStages.filter((s) => s.pendingEvidence > 0 || s.pendingVariations > 0 || s.activeDisputes > 0).map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/projects/${projectId}/stages/${s.id}`)}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/projects/${projectId}/stages/${s.id}`)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-neutral-50"
                style={{ border: "1px solid rgba(251,191,36,0.25)", backgroundColor: "rgba(251,191,36,0.06)" }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                  <p className="text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{s.contractorName}</p>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {s.pendingEvidence > 0 && <span className="text-[10px] font-semibold" style={{ color: "#ea580c" }}>{s.pendingEvidence} evidence pending</span>}
                    {s.pendingVariations > 0 && <span className="text-[10px] font-semibold" style={{ color: "#2563eb" }}>{s.pendingVariations} variation(s)</span>}
                    {s.activeDisputes > 0 && s.activeDisputeId && (
                      <Link
                        href={`/projects/${projectId}/stages/${s.id}/disputes/${s.activeDisputeId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-semibold underline underline-offset-2 hover:opacity-70" style={{ color: "#dc2626" }}
                      >
                        ⚠ View dispute
                      </Link>
                    )}
                  </div>
                </div>
                <StatusPill status={s.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full programme */}
      <div>
        <SectionHeader title="Full programme" sub="All stages · spend vs budget" />

        {/* Desktop: programme table */}
        <div className="hidden md:block overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: "rgba(13,17,68,0.45)", borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Contractor</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium text-right">Budget</th>
                <th className="px-4 py-3 font-medium w-36">Progress</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {allStages.map((s) => {
                const progressPct = stageProgress(s.status);
                const drawn = s.status === "released" ? s.value : 0;
                return (
                  <tr
                    key={s.id}
                    className="cursor-pointer transition-colors hover:bg-neutral-50"
                    style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}
                    onClick={() => setSelectedStageId(s.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{s.contractorName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{dateStr(s.startDate)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{dateStr(s.endDate)}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.value)}</td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(13,17,68,0.08)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progressPct}%`, backgroundColor: STATUS_COLOR[s.status] ?? "#94a3b8" }}
                        />
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(13,17,68,0.35)" }}>
                        {drawn > 0 ? `${gbp.format(drawn)} drawn` : `${progressPct}%`}
                      </p>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
              <tr className="text-sm font-bold">
                <td className="px-4 py-3" style={{ color: "var(--brand-navy, #0D1144)" }} colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(summary.totalCommitted)}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{gbp.format(summary.totalDrawn)} released</td>
                <td className="px-4 py-3 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{gbp.format(summary.totalRemaining)} left</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile: progress bar cards */}
        <div className="md:hidden space-y-2">
          {contracts.map((c) => (
            <div key={c.id}>
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="text-xs font-semibold" style={{ color: "rgba(13,17,68,0.55)" }}>{c.contractorName}</p>
                <Link href={`/projects/${projectId}/contracts/${c.id}`} className="text-[10px] font-medium transition hover:opacity-70" style={{ color: "var(--brand-navy, #0D1144)" }}>
                  View contract →
                </Link>
              </div>
              {c.stages.map((s) => {
                const drawn = s.status === "released" ? s.value : 0;
                const pctDrawn = pct(drawn, s.value);
                const progressPct = stageProgress(s.status);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStageId(s.id)}
                    className="mb-2 w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-neutral-50 text-left"
                    style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                      <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{dateStr(s.startDate)} – {dateStr(s.endDate)}</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(13,17,68,0.08)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${progressPct}%`, backgroundColor: STATUS_COLOR[s.status] ?? "#94a3b8" }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.value)}</p>
                      <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Drawn: {pctDrawn}</p>
                      <StatusPill status={s.status} />
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
    {selectedStage && (
      <StageDrawer stage={selectedStage} projectId={projectId} role={role} onClose={() => setSelectedStageId(null)} />
    )}
    </>
  );
}

function ContractorView({ data, projectId, contractorId }: { data: DashboardData; projectId: string; contractorId: string }) {
  // Contractor only sees their own contracts
  const myContracts = data.contracts.filter((c) => c.contractorId === contractorId);
  const allMyStages = myContracts.flatMap((c) => c.stages);

  if (myContracts.length === 0) {
    return (
      <div className="rounded-2xl px-4 py-8 text-center" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
        <p style={{ color: "rgba(13,17,68,0.5)" }}>No stages assigned to you on this project.</p>
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
                style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: "#d97706" }}>Upload completion evidence to proceed</p>
                  <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{gbp.format(s.value)}</p>
                </div>
                <span className="shrink-0 rounded-2xl px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", color: "#92400e" }}>
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
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>My stages</p>
          {myContracts.length === 1 && (
            <Link
              href={`/projects/${projectId}/contracts/${myContracts[0].id}`}
              className="text-[10px] font-medium transition hover:opacity-70"
              style={{ color: "#2563eb" }}
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
              className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-neutral-50"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                <StatusPill status={s.status} />
                {s.pendingEvidence > 0 && (
                  <p className="mt-1 text-xs" style={{ color: "#ea580c" }}>{s.pendingEvidence} evidence under review</p>
                )}
                {s.status === "returned" && (
                  <p className="mt-1 text-xs" style={{ color: "#ea580c" }}>Returned — action required</p>
                )}
              </div>
              <p className="shrink-0 text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.value)}</p>
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
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{stage.name}</h3>
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>{stage.contractorName}</p>
          </div>
          <StatusPill status={stage.status} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Contracted value</p>
            <p className="text-xl font-bold mt-1" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(stage.value)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Certified amount</p>
            <p className="text-xl font-bold mt-1" style={{ color: "#7c3aed" }}>
              {stage.certifiedAmount !== null ? gbp.format(stage.certifiedAmount) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Approvals pending</p>
            <p className="text-xl font-bold mt-1" style={{ color: stage.pendingApprovals > 0 ? "#7c3aed" : "rgba(13,17,68,0.3)" }}>
              {stage.pendingApprovals}
            </p>
          </div>
        </div>

        <p className="text-xs mb-4" style={{ color: "rgba(13,17,68,0.45)" }}>Next: {stage.nextAction}</p>

        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/projects/${projectId}/stages/${stage.id}/approve`}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#7c3aed" }}
          >
            Review &amp; sign off →
          </Link>
          <Link
            href={`/projects/${projectId}/stages/${stage.id}`}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-70"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.6)" }}
          >
            Full stage detail
          </Link>
          {stage.activeDisputes > 0 && stage.activeDisputeId && (
            <Link
              href={`/projects/${projectId}/stages/${stage.id}/disputes/${stage.activeDisputeId}`}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ border: "1px solid rgba(220,38,38,0.25)", backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626" }}
            >
              ⚠ View dispute
            </Link>
          )}
        </div>
      </div>

      {stage.variationImpact !== 0 && (
        <div className="rounded-2xl px-4 py-3" style={{ border: "1px solid rgba(37,99,235,0.15)", backgroundColor: "rgba(37,99,235,0.04)" }}>
          <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Approved variation impact</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: stage.variationImpact > 0 ? "#059669" : "#dc2626" }}>
            {stage.variationImpact > 0 ? "+" : ""}{gbp.format(stage.variationImpact)}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage drawer — slide-over panel shown when a row is clicked in Funder/Developer views
// ---------------------------------------------------------------------------

function StageDrawer({
  stage,
  projectId,
  role,
  onClose,
}: {
  stage: Stage & { contractorName: string };
  projectId: string;
  role: AppRole | null;
  onClose: () => void;
}) {
  const [description, setDescription] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/stages/${stage.id}`)
      .then((r) => r.json())
      .then((d) => setDescription(d.stage?.description ?? null))
      .catch(() => {});
  }, [stage.id]);

  const statusColor = STATUS_COLOR[stage.status] ?? "#94a3b8";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto"
        style={{ backgroundColor: "#fff", borderLeft: "1px solid var(--surface-border, #e4e7f0)" }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-start justify-between px-5 py-4" style={{ backgroundColor: "#fff", borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.4)" }}>{stage.contractorName}</p>
            <h2 className="mt-1 text-lg font-bold leading-tight" style={{ color: "var(--brand-navy, #0D1144)" }}>{stage.name}</h2>
          </div>
          <button onClick={onClose} className="ml-3 mt-1 shrink-0 text-2xl leading-none transition hover:opacity-50" style={{ color: "rgba(13,17,68,0.5)" }}>×</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Status + value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl px-3 py-3" style={{ backgroundColor: "rgba(13,17,68,0.04)", border: "1px solid var(--surface-border, #e4e7f0)" }}>
              <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(13,17,68,0.4)" }}>Status</p>
              <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: statusColor + "22", color: statusColor }}>
                {stage.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="rounded-xl px-3 py-3" style={{ backgroundColor: "rgba(13,17,68,0.04)", border: "1px solid var(--surface-border, #e4e7f0)" }}>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(13,17,68,0.4)" }}>Value</p>
              <p className="text-lg font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(stage.value)}</p>
            </div>
          </div>

          {/* Certified */}
          {stage.certifiedAmount !== null && (
            <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ backgroundColor: "rgba(5,150,105,0.05)", border: "1px solid rgba(5,150,105,0.15)" }}>
              <p className="text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>Certified amount</p>
              <p className="text-sm font-bold" style={{ color: "#059669" }}>{gbp.format(stage.certifiedAmount)}</p>
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}>
              <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(13,17,68,0.4)" }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(13,17,68,0.7)" }}>{description}</p>
            </div>
          )}

          {/* Dates */}
          {(stage.startDate || stage.endDate) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.4)" }}>Start</p>
                <p className="mt-0.5 text-sm" style={{ color: "var(--brand-navy, #0D1144)" }}>{dateStr(stage.startDate)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.4)" }}>End</p>
                <p className="mt-0.5 text-sm" style={{ color: "var(--brand-navy, #0D1144)" }}>{dateStr(stage.endDate)}</p>
              </div>
            </div>
          )}

          {/* Counters */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Evidence pending", count: stage.pendingEvidence, color: "#ea580c" },
              { label: "Approvals", count: stage.pendingApprovals, color: "#7c3aed" },
              { label: "Variations", count: stage.pendingVariations, color: "#2563eb" },
              { label: "Disputes", count: stage.activeDisputes, color: "#dc2626" },
            ].map(({ label, count, color }) => (
              <div key={label} className="rounded-xl px-3 py-2.5 text-center" style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}>
                <p className="text-xl font-bold" style={{ color: count > 0 ? color : "rgba(13,17,68,0.2)" }}>{count}</p>
                <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(13,17,68,0.35)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Next action */}
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(13,17,68,0.4)" }}>Next action</p>
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.65)" }}>{stage.nextAction || "No action required"}</p>
          </div>

          {/* Role-appropriate action buttons */}
          <div className="space-y-2 pt-1">
            {role === "contractor" && (
              <Link href={`/projects/${projectId}/stages/${stage.id}/action`} className="flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90" style={{ backgroundColor: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#92400e" }}>
                Upload evidence
              </Link>
            )}
            {(role === "commercial" || role === "admin") && stage.pendingApprovals > 0 && (
              <Link href={`/projects/${projectId}/stages/${stage.id}/approve`} className="flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: "#7c3aed" }}>
                Review &amp; approve
              </Link>
            )}
            {(role === "funder" || role === "admin") && stage.status === "available_to_release" && (
              <Link href={`/projects/${projectId}/stages/${stage.id}/release`} className="flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: "#059669" }}>
                Release payment
              </Link>
            )}
            {stage.activeDisputes > 0 && stage.activeDisputeId && (
              <Link href={`/projects/${projectId}/stages/${stage.id}/disputes/${stage.activeDisputeId}`} className="flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)", color: "#dc2626" }}>
                ⚠ View dispute
              </Link>
            )}
            <Link href={`/projects/${projectId}/stages/${stage.id}`} className="flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-70" style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.55)" }}>
              Full stage details →
            </Link>
          </div>
        </div>
      </div>
    </>
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
              <p className="text-xs px-1" style={{ color: "rgba(13,17,68,0.45)" }}>No stages awaiting approval</p>
            ) : (
              <div className="space-y-1">
                {approvalStages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStageId(s.id)}
                    className="w-full text-left rounded-xl px-3 py-2.5 transition"
                    style={
                      selectedStageId === s.id
                        ? { backgroundColor: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }
                        : { backgroundColor: "transparent", border: "1px solid transparent" }
                    }
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                    <p className="text-xs" style={{ color: "#7c3aed" }}>{s.pendingApprovals} pending · {gbp.format(s.value)}</p>
                    <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{s.contractorName}</p>
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
                  className="w-full text-left rounded-xl px-3 py-2 transition hover:bg-neutral-50"
                  style={
                    selectedStageId === s.id
                      ? { backgroundColor: "rgba(13,17,68,0.05)", border: "1px solid rgba(13,17,68,0.12)" }
                      : { backgroundColor: "transparent", border: "1px solid transparent" }
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium truncate" style={{ color: "rgba(13,17,68,0.7)" }}>{s.name}</p>
                    <StatusPill status={s.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Pending approvals" value={String(summary.pendingApprovals)} tone="text-purple-400" />
            <MetricCard label="Active disputes" value={String(summary.activeDisputes)} tone={summary.activeDisputes > 0 ? "text-red-400" : undefined} />
          </div>
        </div>

        {/* Right panel: stage detail */}
        <div className="flex-1 min-w-0">
          {selectedStage ? (
            <StageDetailPanel stage={selectedStage} projectId={projectId} />
          ) : (
            <div
              className="rounded-2xl flex items-center justify-center h-56"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              <div className="text-center">
                <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Select a stage to review</p>
                <p className="text-xs mt-1" style={{ color: "rgba(13,17,68,0.3)" }}>Pick from the approval queue or stage list on the left</p>
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
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No stages currently awaiting your approval.</p>
          ) : (
            <div className="space-y-2">
              {approvalStages.map((s) => (
                <Link
                  key={s.id}
                  href={`/projects/${projectId}/stages/${s.id}/approve`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-neutral-50"
                  style={{ border: "1px solid rgba(124,58,237,0.2)", backgroundColor: "rgba(124,58,237,0.04)" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#7c3aed" }}>{s.pendingApprovals} approval(s) pending</p>
                    <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{s.contractorName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.value)}</p>
                    {s.certifiedAmount !== null && s.certifiedAmount !== s.value && (
                      <p className="text-xs" style={{ color: "#7c3aed" }}>Cert: {gbp.format(s.certifiedAmount)}</p>
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
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-neutral-50"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</p>
                  <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{s.contractorName}</p>
                  <StatusPill status={s.status} />
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.value)}</p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader title="Summary" />
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Pending approvals" value={String(summary.pendingApprovals)} tone="text-purple-400" />
            <MetricCard label="Active disputes" value={String(summary.activeDisputes)} tone={summary.activeDisputes > 0 ? "text-red-400" : undefined} />
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
      <Link href="/projects" className="text-xs transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>← Projects</Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs transition hover:opacity-70"
        style={{ color: "rgba(13,17,68,0.55)" }}
      >
        <span>←</span>
        <span className="max-w-[140px] truncate font-medium">{currentProjectName}</span>
        <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 w-52 rounded-2xl py-1 shadow-xl"
          style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}
        >
          <Link
            href="/projects"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-xs transition hover:opacity-70"
            style={{ color: "rgba(13,17,68,0.55)" }}
          >
            All projects
          </Link>
          <div className="my-1" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }} />
          {others.map((p) => (
            <button
              key={p.id}
              onClick={() => { router.push(`/projects/${p.id}`); setOpen(false); }}
              className="block w-full px-4 py-2.5 text-left text-xs transition hover:opacity-70"
              style={{ color: "rgba(13,17,68,0.7)" }}
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
    { label: "Funding", href: (id) => `/projects/${id}/funding` },
    { label: "Wallet", href: (id) => `/projects/${id}/wallet` },
    { label: "Budget", href: (id) => `/projects/${id}/budget` },
    { label: "Schedule", href: (id) => `/projects/${id}/schedule` },
    { label: "Cash flow", href: (id) => `/projects/${id}/cashflow` },
    { label: "Token holders", href: (id) => `/projects/${id}/token-holders` },
    { label: "Reports", href: (id) => `/projects/${id}/reports` },
    { label: "Audit", href: (id) => `/projects/${id}/audit` },
    { label: "Members", href: (id) => `/projects/${id}/members` },
  ],
  developer: [
    { label: "Funding", href: (id) => `/projects/${id}/funding` },
    { label: "Budget", href: (id) => `/projects/${id}/budget` },
    { label: "Schedule", href: (id) => `/projects/${id}/schedule` },
    { label: "Cash flow", href: (id) => `/projects/${id}/cashflow` },
    { label: "Token holders", href: (id) => `/projects/${id}/token-holders` },
    { label: "Reports", href: (id) => `/projects/${id}/reports` },
    { label: "Audit", href: (id) => `/projects/${id}/audit` },
    { label: "Members", href: (id) => `/projects/${id}/members` },
    { label: "Add contract", href: (id) => `/projects/${id}/contracts/new` },
  ],
  commercial: [
    { label: "Schedule", href: (id) => `/projects/${id}/schedule` },
    { label: "Cash flow", href: (id) => `/projects/${id}/cashflow` },
    { label: "Audit", href: (id) => `/projects/${id}/audit` },
  ],
  consultant: [
    { label: "Schedule", href: (id) => `/projects/${id}/schedule` },
    { label: "Cash flow", href: (id) => `/projects/${id}/cashflow` },
    { label: "Audit", href: (id) => `/projects/${id}/audit` },
  ],
  contractor: [],   // no extra nav for contractor
  admin: [
    { label: "Funding", href: (id) => `/projects/${id}/funding` },
    { label: "Wallet", href: (id) => `/projects/${id}/wallet` },
    { label: "Budget", href: (id) => `/projects/${id}/budget` },
    { label: "Schedule", href: (id) => `/projects/${id}/schedule` },
    { label: "Cash flow", href: (id) => `/projects/${id}/cashflow` },
    { label: "Token holders", href: (id) => `/projects/${id}/token-holders` },
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
  const [role, setRole]             = useState<AppRole | null>(null);
  const [userId, setUserId]         = useState<string | null>(null);
  const [data, setData]             = useState<DashboardData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

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
      setProjectStatus(d.project?.status ?? null);
    } catch {
      setError("Network error loading project dashboard.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  async function handleStatusChange(newStatus: string) {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const d = await res.json();
        setProjectStatus(d.project.status);
      }
    } finally {
      setStatusUpdating(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.4)" }}>Loading project…</p>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8">
          <Link href="/projects" className="text-xs font-medium transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>← Projects</Link>
          <p className="mt-6 text-sm" style={{ color: "#dc2626" }}>{error ?? "Project not found."}</p>
        </div>
      </AppShell>
    );
  }

  const navLinks = role ? (NAV_LINKS[role] ?? []) : [];
  const roleColor = role ? (ROLE_COLOR[role] ?? "#94a3b8") : "#94a3b8";
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : "";

  return (
    <AppShell>
    <div className="min-h-full px-4 md:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <ProjectSwitcher currentProjectId={projectId} currentProjectName={data.project.name} />
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{data.project.name}</h1>
            {projectStatus && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: projectStatus === "active" ? "#05966918" : projectStatus === "completed" ? "#2563eb18" : "#94a3b818",
                  color: projectStatus === "active" ? "#059669" : projectStatus === "completed" ? "#2563eb" : "#64748b",
                }}
              >
                {projectStatus.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>{data.project.address}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Project status control — admin/developer only */}
          {(role === "admin" || role === "developer") && projectStatus && (
            <select
              value={projectStatus}
              disabled={statusUpdating}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-xl px-3 py-1.5 text-xs font-medium outline-none transition disabled:opacity-50"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              title="Change project status"
            >
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
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
              className="rounded-2xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-70"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "rgba(13,17,68,0.65)" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {/* Role-specific dashboard content */}
      {role === "funder" && <FunderView data={data} projectId={projectId} role={role} />}
      {role === "developer" && <DeveloperView data={data} projectId={projectId} role={role} />}
      {role === "contractor" && <ContractorView data={data} projectId={projectId} contractorId={userId ?? ""} />}
      {(role === "commercial" || role === "consultant" || role === "admin") && (
        <CommercialView data={data} projectId={projectId} />
      )}
      {!role && <DeveloperView data={data} projectId={projectId} role={"developer"} />}
    </div>
    </AppShell>
  );
}
