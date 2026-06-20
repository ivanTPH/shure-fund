"use client";

/**
 * Cash flow forecast — /projects/[id]/cashflow
 *
 * Monthly projected draws (unpaid dated stages) vs actual released payments,
 * grouped by stage end_date. Shows cumulative columns and portfolio totals.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { Skeleton } from "../../../components/Skeleton";

// ── Types ──────────────────────────────────────────────────────────────────

type CashflowMonth = {
  month: string;
  projectedValue:      number;
  projectedCount:      number;
  actualPaid:          number;
  actualCount:         number;
  cumulativeProjected: number;
  cumulativeActual:    number;
};

type Totals = {
  totalProjected: number;
  totalActual:    number;
  outstanding:    number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

function fmtMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-[18px] px-4 py-4"
      style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>
        {label}
      </p>
      <p className="text-xl font-bold leading-tight" style={{ color }}>{gbp.format(value)}</p>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CashflowPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [months, setMonths]           = useState<CashflowMonth[]>([]);
  const [totals, setTotals]           = useState<Totals | null>(null);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [cfRes, dashRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/cashflow`),
          fetch(`/api/projects/${projectId}/dashboard`),
        ]);
        const [cfData, dashData] = await Promise.all([cfRes.json(), dashRes.json()]);
        if (!cfRes.ok) { setError(cfData.error ?? "Failed to load cash flow."); return; }
        setMonths(cfData.months ?? []);
        setTotals(cfData.totals ?? null);
        setProjectName(dashData.project?.name ?? "Project");
      } catch {
        setError("Network error loading cash flow.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const thisMonth = currentYYYYMM();

  if (loading) return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-4xl mx-auto">
        <Skeleton.Dashboard />
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-4xl mx-auto">
        <Link
          href={`/projects/${projectId}`}
          className="text-xs font-medium transition hover:opacity-70"
          style={{ color: "rgba(13,17,68,0.5)" }}
        >
          ← {projectName || "Project"}
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Cash flow</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
            Monthly projected draws vs actual released payments, grouped by stage due date.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Summary strip */}
        {totals && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <StatCard label="Projected draws"  value={totals.totalProjected} color="#2563eb" />
            <StatCard label="Released to date" value={totals.totalActual}    color="#059669" />
            <StatCard
              label="Outstanding"
              value={totals.outstanding}
              color={totals.outstanding > 0 ? "#d97706" : "#059669"}
            />
          </div>
        )}

        {months.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>
              No dated stages found. Add end dates to stages to see cash flow projections.
            </p>
          </div>
        ) : (
          <div
            className="rounded-[20px] overflow-hidden"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            {/* Desktop */}
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}>
                  {[
                    { label: "Month",            align: "left"  },
                    { label: "Projected",         align: "right" },
                    { label: "Released",          align: "right" },
                    { label: "Cum. projected",    align: "right" },
                    { label: "Cum. released",     align: "right" },
                  ].map(({ label, align }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-${align}`}
                      style={{ color: "rgba(13,17,68,0.45)" }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => {
                  const isCurrent = m.month === thisMonth;
                  const isPast    = m.month < thisMonth;
                  return (
                    <tr
                      key={m.month}
                      style={{
                        borderTop:       i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined,
                        backgroundColor: isCurrent ? "rgba(37,99,235,0.025)" : undefined,
                        opacity:         isPast && m.projectedValue === 0 ? 0.7 : 1,
                      }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: isCurrent ? "#2563eb" : "var(--brand-navy, #0D1144)" }}>
                        {fmtMonth(m.month)}
                        {isCurrent && (
                          <span
                            className="ml-2 text-[11px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5"
                            style={{ backgroundColor: "rgba(37,99,235,0.1)", color: "#2563eb" }}
                          >
                            now
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right" style={{ color: m.projectedValue > 0 ? "var(--brand-navy, #0D1144)" : "rgba(13,17,68,0.25)" }}>
                        {m.projectedValue > 0 ? gbp.format(m.projectedValue) : "—"}
                        {m.projectedCount > 0 && (
                          <span className="ml-1 text-[10px]" style={{ color: "rgba(13,17,68,0.35)" }}>
                            ×{m.projectedCount}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-medium" style={{ color: m.actualPaid > 0 ? "#059669" : "rgba(13,17,68,0.25)" }}>
                        {m.actualPaid > 0 ? gbp.format(m.actualPaid) : "—"}
                        {m.actualCount > 0 && (
                          <span className="ml-1 text-[10px]" style={{ color: "rgba(5,150,105,0.5)" }}>
                            ×{m.actualCount}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-xs" style={{ color: "rgba(13,17,68,0.55)" }}>
                        {gbp.format(m.cumulativeProjected)}
                      </td>

                      <td className="px-4 py-3 text-right text-xs" style={{ color: "rgba(13,17,68,0.55)" }}>
                        {m.cumulativeActual > 0 ? gbp.format(m.cumulativeActual) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totals && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.015)" }}>
                    <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(13,17,68,0.5)" }}>
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                      {gbp.format(totals.totalProjected)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: "#059669" }}>
                      {totals.totalActual > 0 ? gbp.format(totals.totalActual) : "—"}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
              {months.map((m) => {
                const isCurrent = m.month === thisMonth;
                return (
                  <div key={m.month} className="px-4 py-4" style={{ backgroundColor: isCurrent ? "rgba(37,99,235,0.025)" : undefined }}>
                    <p className="font-semibold text-sm mb-2" style={{ color: isCurrent ? "#2563eb" : "var(--brand-navy, #0D1144)" }}>
                      {fmtMonth(m.month)}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p style={{ color: "rgba(13,17,68,0.45)" }}>Projected</p>
                        <p className="font-medium" style={{ color: m.projectedValue > 0 ? "var(--brand-navy, #0D1144)" : "rgba(13,17,68,0.3)" }}>
                          {m.projectedValue > 0 ? gbp.format(m.projectedValue) : "—"}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: "rgba(13,17,68,0.45)" }}>Released</p>
                        <p className="font-medium" style={{ color: m.actualPaid > 0 ? "#059669" : "rgba(13,17,68,0.3)" }}>
                          {m.actualPaid > 0 ? gbp.format(m.actualPaid) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
