"use client";

/**
 * Financial reports page — /projects/[id]/reports
 *
 * Visible to: funder, developer, admin. Contractor and commercial roles
 * are redirected to the project dashboard.
 *
 * Sections:
 *  1. Certified vs instructed amounts per stage
 *  2. Retention schedule (5% of certified payments, still withheld vs released)
 *  3. Cost to complete (remaining non-released stage value)
 *  4. Variation register (all variations with status and financial impact)
 *  5. Drawdown schedule (stages with projected release dates)
 *
 * Export: CSV download (same pattern as AuditClient.tsx)
 * Print:  clean print stylesheet (no window.print() call)
 */

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";

// ---------------------------------------------------------------------------
// Types (from dashboard API + variations)
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
};

type Contract = {
  id: string;
  contractorName: string;
  totalValue: number;
  stages: Stage[];
};

type Variation = {
  id: string;
  stageId: string;
  stageName: string;
  description: string;
  valueChange: number;
  status: string;
  createdAt: string;
};

type DashboardData = {
  project: { id: string; name: string; address: string };
  wallet: { balance: number; available: number; ringfenced: number };
  contracts: Contract[];
  summary: { totalCommitted: number; totalDrawn: number; totalRemaining: number };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const RETENTION_PCT = 0.05;

const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
function fmtDate(d: string | null) {
  if (!d) return "—";
  return fmt.format(new Date(d));
}

const STATUS_COLOR: Record<string, string> = {
  draft: "#94a3b8", submitted: "#60a5fa", under_review: "#fbbf24",
  approved: "#34d399", rejected: "#f87171", active: "#4ade80",
  pending_funding: "#fb923c", cancelled: "#6b7280",
};

function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#94a3b8";
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: color + "22", color }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3 border-b border-white/8 pb-2">
      <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-neutral-600">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------

function downloadCSV(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectReportsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);

  const [data, setData]           = useState<DashboardData | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/dashboard`),
        ]);
        if (!dashRes.ok) { setError("Failed to load report data."); return; }
        const dashData: DashboardData = await dashRes.json();
        setData(dashData);

        // Fetch variations for every stage in parallel
        const allStageIds = dashData.contracts.flatMap((c) => c.stages.map((s) => s.id));
        const stageNames = new Map(
          dashData.contracts.flatMap((c) => c.stages.map((s) => [s.id, s.name])),
        );
        const varResults = await Promise.all(
          allStageIds.map((sid) =>
            fetch(`/api/variations?stageId=${sid}`)
              .then((r) => r.ok ? r.json() : { variations: [] })
              .then((d) =>
                (d.variations ?? []).map((v: Record<string, unknown>) => ({
                  id: v.id,
                  stageId: sid,
                  stageName: stageNames.get(sid) ?? sid,
                  description: v.description,
                  valueChange: Number(v.value_change),
                  status: v.status,
                  createdAt: v.created_at,
                })),
              ),
          ),
        );
        setVariations(varResults.flat());
      } catch {
        setError("Network error loading report.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
        <p className="text-neutral-400">Loading report…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
        <Link href={`/projects/${projectId}`} className="text-xs text-neutral-400 hover:text-white">← Back to project</Link>
        <p className="mt-6 text-sm text-red-300">{error ?? "Report unavailable."}</p>
      </div>
    );
  }

  const allStages = data.contracts.flatMap((c) =>
    c.stages.map((s) => ({ ...s, contractorName: c.contractorName })),
  );

  // ---- Certified vs instructed ----
  // Certified amount = certifiedAmount from approvals (or stage value if not set)
  const certifiedRows = allStages.map((s) => ({
    ...s,
    instructed: s.value + s.variationImpact,
    certified: s.certifiedAmount ?? s.value,
    variance: (s.certifiedAmount ?? s.value) - s.value,
  }));
  const totalInstructed = certifiedRows.reduce((sum, r) => sum + r.instructed, 0);
  const totalCertified = certifiedRows.reduce((sum, r) => sum + r.certified, 0);

  // ---- Retention ----
  const releasedStages = allStages.filter((s) => s.status === "released");
  const totalRetentionHeld = releasedStages.reduce((sum, s) => {
    const certified = s.certifiedAmount ?? s.value;
    return sum + certified * RETENTION_PCT;
  }, 0);

  // ---- Cost to complete ----
  const nonReleasedStages = allStages.filter((s) => s.status !== "released");
  const costToComplete = nonReleasedStages.reduce((sum, s) => sum + s.value, 0);

  // ---- CSV exports ----
  function exportCertifiedCSV() {
    downloadCSV(
      `certified-vs-instructed-${projectId}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Stage", "Contractor", "Instructed (£)", "Certified (£)", "Variance (£)", "Status"],
      certifiedRows.map((r) => [r.name, r.contractorName, r.instructed, r.certified, r.variance, r.status]),
    );
  }

  function exportVariationsCSV() {
    downloadCSV(
      `variations-${projectId}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Stage", "Description", "Value Change (£)", "Status", "Date"],
      variations.map((v) => [v.stageName, v.description, v.valueChange, v.status, fmtDate(v.createdAt)]),
    );
  }

  function exportDrawdownCSV() {
    downloadCSV(
      `drawdown-schedule-${projectId}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Stage", "Contractor", "Value (£)", "Start Date", "End Date", "Status"],
      allStages
        .filter((s) => s.startDate || s.endDate)
        .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
        .map((s) => [s.name, s.contractorName, s.value, fmtDate(s.startDate), fmtDate(s.endDate), s.status]),
    );
  }

  return (
    <AppShell>
    <>
      {/* Print stylesheet */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-root { background: white !important; color: black !important; padding: 2rem !important; }
          .print-card { border: 1px solid #ddd !important; background: white !important; }
          .text-white, .text-neutral-400, .text-neutral-500 { color: #111 !important; }
          a { color: #111 !important; text-decoration: none !important; }
        }
      `}</style>

      <div className="min-h-screen px-4 md:px-8 py-8 print-root" style={{ backgroundColor: "#0d1144" }}>
        {/* Header */}
        <div className="no-print mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Link href={`/projects/${projectId}`} className="text-xs text-neutral-400 hover:text-white">
                ← Back to project
              </Link>
              <h1 className="mt-1 text-2xl font-bold text-white">Financial report</h1>
              <p className="text-sm text-neutral-400">{data.project.name} · {data.project.address}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={exportCertifiedCSV}
                className="rounded-2xl px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                Export certified CSV
              </button>
              <button
                onClick={exportVariationsCSV}
                className="rounded-2xl px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                Export variations CSV
              </button>
              <button
                onClick={exportDrawdownCSV}
                className="rounded-2xl px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                Export schedule CSV
              </button>
              <button
                onClick={() => window.print()}
                className="no-print rounded-2xl px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/5"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Print
              </button>
            </div>
          </div>

          {/* Desktop summary strip */}
          <div className="hidden md:grid md:grid-cols-4 gap-3 mt-6">
            {[
              { label: "Total contracted", value: gbp.format(data.summary.totalCommitted), tone: "text-white" },
              { label: "Released to date", value: gbp.format(data.summary.totalDrawn), tone: "text-green-400" },
              { label: "Cost to complete", value: gbp.format(data.summary.totalRemaining), tone: "text-blue-300" },
              { label: "Retention held", value: gbp.format(totalRetentionHeld), tone: "text-amber-300" },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                <p className="text-xs text-neutral-500">{m.label}</p>
                <p className={`mt-1 text-lg font-bold tracking-tight ${m.tone}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Print header (only shown in print) */}
        <div className="hidden print:block mb-6">
          <p className="text-lg font-bold">{data.project.name} — Financial Report</p>
          <p className="text-sm text-gray-500">{data.project.address} · Generated {fmt.format(new Date())}</p>
        </div>

        <div ref={printRef} className="max-w-7xl space-y-8">

          {/* 1. Certified vs instructed */}
          <section className="rounded-[20px] p-5 print-card" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
            <SectionHeader title="1. Certified vs instructed amounts" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-500">
                    <th className="pb-2 font-medium">Stage</th>
                    <th className="pb-2 font-medium text-right">Contracted</th>
                    <th className="pb-2 font-medium text-right">Instructed</th>
                    <th className="pb-2 font-medium text-right">Certified</th>
                    <th className="pb-2 font-medium text-right">Variance</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {certifiedRows.map((r) => (
                    <tr key={r.id} className="text-neutral-200">
                      <td className="py-2 pr-3">
                        <p className="font-medium text-white">{r.name}</p>
                        <p className="text-xs text-neutral-500">{r.contractorName}</p>
                      </td>
                      <td className="py-2 text-right">{gbp.format(r.value)}</td>
                      <td className="py-2 text-right">{gbp.format(r.instructed)}</td>
                      <td className="py-2 text-right font-semibold">{gbp.format(r.certified)}</td>
                      <td className="py-2 text-right" style={{ color: r.variance < 0 ? "#f87171" : r.variance > 0 ? "#34d399" : "#94a3b8" }}>
                        {r.variance === 0 ? "—" : (r.variance > 0 ? "+" : "") + gbp.format(r.variance)}
                      </td>
                      <td className="py-2 pl-2"><StatusChip status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-white/10">
                  <tr className="font-bold text-white">
                    <td className="pt-3">Total</td>
                    <td className="pt-3 text-right">{gbp.format(data.summary.totalCommitted)}</td>
                    <td className="pt-3 text-right">{gbp.format(totalInstructed)}</td>
                    <td className="pt-3 text-right">{gbp.format(totalCertified)}</td>
                    <td className="pt-3 text-right" style={{ color: totalCertified - data.summary.totalCommitted < 0 ? "#f87171" : "#34d399" }}>
                      {gbp.format(totalCertified - data.summary.totalCommitted)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* 2. Retention */}
          <section className="rounded-[20px] p-5 print-card" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
            <SectionHeader title="2. Retention schedule" sub={`${(RETENTION_PCT * 100).toFixed(0)}% withheld from each certified payment`} />
            {releasedStages.length === 0 ? (
              <p className="text-sm text-neutral-500">No payments released yet — retention not yet applicable.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {releasedStages.map((s) => {
                    const certified = s.certifiedAmount ?? s.value;
                    const retention = certified * RETENTION_PCT;
                    return (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <p className="text-neutral-200">{s.name}</p>
                        <p className="font-semibold text-amber-300">{gbp.format(retention)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <p className="text-sm font-bold text-white">Total retention held</p>
                  <p className="text-lg font-bold text-amber-300">{gbp.format(totalRetentionHeld)}</p>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  Retention is typically released at practical completion and expiry of defects period.
                </p>
              </>
            )}
          </section>

          {/* 3. Cost to complete */}
          <section className="rounded-[20px] p-5 print-card" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
            <SectionHeader title="3. Cost to complete" sub="Remaining contracted value for all non-released stages" />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-neutral-500">Total contracted</p>
                <p className="mt-1 text-lg font-bold text-white">{gbp.format(data.summary.totalCommitted)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Released to date</p>
                <p className="mt-1 text-lg font-bold text-green-400">{gbp.format(data.summary.totalDrawn)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Cost to complete</p>
                <p className="mt-1 text-lg font-bold text-blue-300">{gbp.format(costToComplete)}</p>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              {nonReleasedStages.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-neutral-200">{s.name}</span>
                    <span className="ml-2 text-xs text-neutral-500">({s.status.replace(/_/g, " ")})</span>
                  </div>
                  <span className="font-medium text-white">{gbp.format(s.value)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Variation register */}
          <section className="rounded-[20px] p-5 print-card" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
            <SectionHeader title="4. Variation register" />
            {variations.length === 0 ? (
              <p className="text-sm text-neutral-500">No variations recorded for this project.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-neutral-500">
                        <th className="pb-2 font-medium">Stage</th>
                        <th className="pb-2 font-medium">Description</th>
                        <th className="pb-2 font-medium text-right">Value change</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {variations.map((v) => (
                        <tr key={v.id} className="text-neutral-200">
                          <td className="py-2 pr-3 text-xs">{v.stageName}</td>
                          <td className="py-2 pr-3 max-w-xs">
                            <p className="truncate">{v.description}</p>
                          </td>
                          <td className="py-2 text-right font-semibold" style={{ color: v.valueChange >= 0 ? "#34d399" : "#f87171" }}>
                            {v.valueChange >= 0 ? "+" : ""}{gbp.format(v.valueChange)}
                          </td>
                          <td className="py-2 pl-2"><StatusChip status={v.status} /></td>
                          <td className="py-2 pl-2 text-xs text-neutral-500">{fmtDate(v.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-white/10">
                      <tr className="font-bold">
                        <td className="pt-3" colSpan={2}>Net variation impact</td>
                        <td className="pt-3 text-right" style={{ color: variations.filter((v) => v.status === "approved").reduce((s, v) => s + v.valueChange, 0) >= 0 ? "#34d399" : "#f87171" }}>
                          {gbp.format(variations.filter((v) => v.status === "approved").reduce((s, v) => s + v.valueChange, 0))}
                        </td>
                        <td colSpan={2} className="pt-3 pl-2 text-xs text-neutral-500">approved only</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* 5. Drawdown schedule */}
          <section className="rounded-[20px] p-5 print-card" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
            <SectionHeader title="5. Drawdown schedule" sub="Projected payment dates based on stage programme" />
            {allStages.filter((s) => s.startDate || s.endDate).length === 0 ? (
              <p className="text-sm text-neutral-500">No programme dates set on stages. Add start/end dates to stages to see drawdown schedule.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-neutral-500">
                      <th className="pb-2 font-medium">Stage</th>
                      <th className="pb-2 font-medium">Start date</th>
                      <th className="pb-2 font-medium">End date</th>
                      <th className="pb-2 font-medium text-right">Value</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allStages
                      .filter((s) => s.startDate || s.endDate)
                      .sort((a, b) => (a.startDate ?? a.endDate ?? "").localeCompare(b.startDate ?? b.endDate ?? ""))
                      .map((s) => (
                        <tr key={s.id} className="text-neutral-200">
                          <td className="py-2 pr-3">
                            <p className="font-medium text-white">{s.name}</p>
                            <p className="text-xs text-neutral-500">{s.contractorName}</p>
                          </td>
                          <td className="py-2 text-xs">{fmtDate(s.startDate)}</td>
                          <td className="py-2 text-xs">{fmtDate(s.endDate)}</td>
                          <td className="py-2 text-right font-semibold">{gbp.format(s.value)}</td>
                          <td className="py-2 pl-2"><StatusChip status={s.status} /></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Report footer */}
          <div className="text-xs text-neutral-600 text-center py-2">
            Generated by Shure.Fund · {fmt.format(new Date())} · {data.project.name}
          </div>
        </div>
      </div>
    </>
    </AppShell>
  );
}
