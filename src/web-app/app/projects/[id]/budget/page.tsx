"use client";

/**
 * Budget vs actual — /projects/[id]/budget
 *
 * Per-contract table showing:
 *   Original | Variations | Current | Certified | Paid | Retention | Variance
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { Skeleton } from "../../../components/Skeleton";

// ── Types ──────────────────────────────────────────────────────────────────

type BudgetStage = {
  id: string;
  name: string;
  status: string;
  originalValue: number;
  variationImpact: number;
  currentValue: number;
  certifiedAmount: number | null;
  paid: number;
  retentionWithheld: number;
  retentionReleased: boolean;
  variance: number | null;
};

type BudgetContract = {
  id: string;
  contractorName: string;
  contractStatus: string;
  stages: BudgetStage[];
  summary: {
    originalTotal: number;
    variationTotal: number;
    currentTotal: number;
    certifiedTotal: number;
    paidTotal: number;
    pendingTotal: number;
    retentionHeld: number;
    retentionReleased: number;
  };
};

type PortfolioTotals = {
  originalTotal: number;
  variationTotal: number;
  currentTotal: number;
  certifiedTotal: number;
  paidTotal: number;
  pendingTotal: number;
  retentionHeld: number;
  retentionReleased: number;
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
  funding_gap:          "#dc2626",
};

function VariancePill({ variance }: { variance: number | null }) {
  if (variance === null) return <span style={{ color: "rgba(13,17,68,0.3)" }}>—</span>;
  const isPos = variance >= 0;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{
        backgroundColor: isPos ? "rgba(5,150,105,0.1)" : "rgba(220,38,38,0.1)",
        color: isPos ? "#059669" : "#dc2626",
      }}
    >
      {isPos ? "+" : ""}{gbp.format(variance)}
    </span>
  );
}

function SummaryCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-[18px] px-4 py-3" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
      <p className="text-base font-bold leading-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: "rgba(13,17,68,0.4)" }}>{sub}</p>}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [contracts, setContracts] = useState<BudgetContract[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioTotals | null>(null);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const [budgetRes, dashRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/budget`),
          fetch(`/api/projects/${projectId}/dashboard`),
        ]);
        const [budgetData, dashData] = await Promise.all([
          budgetRes.json(),
          dashRes.json(),
        ]);
        if (!budgetRes.ok) { setError(budgetData.error ?? "Failed to load budget."); return; }
        setContracts(budgetData.contracts ?? []);
        setPortfolio(budgetData.portfolio);
        setProjectName(dashData.project?.name ?? "Project");
        // Expand all contracts by default
        setExpanded(new Set((budgetData.contracts ?? []).map((c: BudgetContract) => c.id)));
      } catch {
        setError("Network error loading budget.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  function toggleContract(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-6xl mx-auto">
        <Skeleton.Dashboard />
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-6xl mx-auto">
        <Link href={`/projects/${projectId}`} className="text-xs font-medium transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>
          ← {projectName || "Project"}
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Budget vs actual</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
            Original budget, variation impacts, certified amounts, and variance per stage.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Portfolio summary strip */}
        {portfolio && (
          <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-4 lg:grid-cols-7">
            <SummaryCard label="Original budget" value={gbp.format(portfolio.originalTotal)} color="var(--brand-navy, #0D1144)" />
            <SummaryCard label="Variations" value={(portfolio.variationTotal >= 0 ? "+" : "") + gbp.format(portfolio.variationTotal)} color={portfolio.variationTotal >= 0 ? "#d97706" : "#059669"} />
            <SummaryCard label="Current budget" value={gbp.format(portfolio.currentTotal)} color="var(--brand-navy, #0D1144)" />
            <SummaryCard label="Certified" value={gbp.format(portfolio.certifiedTotal)} color="#2563eb" />
            <SummaryCard label="Paid" value={gbp.format(portfolio.paidTotal)} color="#16a34a" />
            <SummaryCard label="Pending" value={gbp.format(portfolio.pendingTotal)} color="#d97706" />
            <SummaryCard label="Retention held" value={gbp.format(portfolio.retentionHeld)} color="#64748b" sub={portfolio.retentionReleased > 0 ? `${gbp.format(portfolio.retentionReleased)} released` : undefined} />
          </div>
        )}

        {contracts.length === 0 ? (
          <div className="rounded-[20px] px-6 py-10 text-center" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No contracts on this project yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => {
              const isOpen = expanded.has(contract.id);
              return (
                <div key={contract.id} className="rounded-[20px] overflow-hidden" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
                  {/* Contract header — clickable to expand */}
                  <button
                    onClick={() => toggleContract(contract.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left transition hover:bg-neutral-50"
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                        {contract.contractorName}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(13,17,68,0.45)" }}>
                        {contract.stages.length} stage{contract.stages.length !== 1 ? "s" : ""} ·
                        {" "}{gbp.format(contract.summary.currentTotal)} current ·
                        {" "}{gbp.format(contract.summary.paidTotal)} paid
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <VariancePill variance={
                        contract.summary.certifiedTotal > 0
                          ? contract.summary.certifiedTotal - contract.summary.currentTotal
                          : null
                      } />
                      <span className="text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <>
                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left" style={{ backgroundColor: "rgba(13,17,68,0.02)", borderBottom: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.45)" }}>
                              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider">Stage</th>
                              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider">Status</th>
                              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-right">Original</th>
                              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-right">Variations</th>
                              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-right">Current</th>
                              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-right">Certified</th>
                              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-right">Paid</th>
                              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-right">Retention</th>
                              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-right">Variance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contract.stages.map((s, i) => {
                              const color = STATUS_COLOR[s.status] ?? "#94a3b8";
                              return (
                                <tr key={s.id} style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}>
                                  <td className="px-5 py-3">
                                    <Link
                                      href={`/projects/${projectId}/stages/${s.id}`}
                                      className="font-medium transition hover:opacity-70"
                                      style={{ color: "var(--brand-navy, #0D1144)" }}
                                    >
                                      {s.name}
                                    </Link>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="rounded-full px-2 py-0.5 font-bold uppercase tracking-wider" style={{ backgroundColor: color + "18", color }}>
                                      {s.status.replace(/_/g, " ")}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-right" style={{ color: "rgba(13,17,68,0.7)" }}>{gbp.format(s.originalValue)}</td>
                                  <td className="px-5 py-3 text-right" style={{ color: s.variationImpact !== 0 ? (s.variationImpact > 0 ? "#d97706" : "#059669") : "rgba(13,17,68,0.3)" }}>
                                    {s.variationImpact !== 0 ? (s.variationImpact > 0 ? "+" : "") + gbp.format(s.variationImpact) : "—"}
                                  </td>
                                  <td className="px-5 py-3 text-right font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.currentValue)}</td>
                                  <td className="px-5 py-3 text-right" style={{ color: s.certifiedAmount !== null ? "#2563eb" : "rgba(13,17,68,0.3)" }}>
                                    {s.certifiedAmount !== null ? gbp.format(s.certifiedAmount) : "—"}
                                  </td>
                                  <td className="px-5 py-3 text-right font-semibold" style={{ color: s.paid > 0 ? "#16a34a" : "rgba(13,17,68,0.3)" }}>
                                    {s.paid > 0 ? gbp.format(s.paid) : "—"}
                                  </td>
                                  <td className="px-5 py-3 text-right" style={{ color: s.retentionWithheld > 0 ? (s.retentionReleased ? "#16a34a" : "#64748b") : "rgba(13,17,68,0.3)" }}>
                                    {s.retentionWithheld > 0 ? (
                                      <span>
                                        {gbp.format(s.retentionWithheld)}
                                        {s.retentionReleased && <span className="ml-1 text-[11px] font-bold" style={{ color: "#16a34a" }}>✓</span>}
                                      </span>
                                    ) : "—"}
                                  </td>
                                  <td className="px-5 py-3 text-right"><VariancePill variance={s.variance} /></td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {/* Contract totals */}
                          <tfoot style={{ borderTop: "2px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.02)" }}>
                            <tr className="font-bold text-xs">
                              <td className="px-5 py-3" style={{ color: "var(--brand-navy, #0D1144)" }} colSpan={2}>Contract total</td>
                              <td className="px-5 py-3 text-right" style={{ color: "rgba(13,17,68,0.7)" }}>{gbp.format(contract.summary.originalTotal)}</td>
                              <td className="px-5 py-3 text-right" style={{ color: contract.summary.variationTotal !== 0 ? "#d97706" : "rgba(13,17,68,0.3)" }}>
                                {contract.summary.variationTotal !== 0 ? (contract.summary.variationTotal > 0 ? "+" : "") + gbp.format(contract.summary.variationTotal) : "—"}
                              </td>
                              <td className="px-5 py-3 text-right" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(contract.summary.currentTotal)}</td>
                              <td className="px-5 py-3 text-right" style={{ color: "#2563eb" }}>{gbp.format(contract.summary.certifiedTotal)}</td>
                              <td className="px-5 py-3 text-right" style={{ color: "#16a34a" }}>{gbp.format(contract.summary.paidTotal)}</td>
                              <td className="px-5 py-3 text-right" style={{ color: "#64748b" }}>{gbp.format(contract.summary.retentionHeld)}</td>
                              <td className="px-5 py-3 text-right">
                                <VariancePill variance={
                                  contract.summary.certifiedTotal > 0
                                    ? contract.summary.certifiedTotal - contract.summary.currentTotal
                                    : null
                                } />
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="md:hidden" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                        {contract.stages.map((s, i) => {
                          const color = STATUS_COLOR[s.status] ?? "#94a3b8";
                          return (
                            <div key={s.id} className="px-4 py-3 space-y-2" style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Link href={`/projects/${projectId}/stages/${s.id}`} className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{s.name}</Link>
                                  <span className="ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider" style={{ backgroundColor: color + "18", color }}>{s.status.replace(/_/g, " ")}</span>
                                </div>
                                <VariancePill variance={s.variance} />
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div><p style={{ color: "rgba(13,17,68,0.45)" }}>Original</p><p className="font-semibold" style={{ color: "rgba(13,17,68,0.7)" }}>{gbp.format(s.originalValue)}</p></div>
                                <div><p style={{ color: "rgba(13,17,68,0.45)" }}>Current</p><p className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(s.currentValue)}</p></div>
                                <div><p style={{ color: "rgba(13,17,68,0.45)" }}>Paid</p><p className="font-semibold" style={{ color: s.paid > 0 ? "#16a34a" : "rgba(13,17,68,0.3)" }}>{s.paid > 0 ? gbp.format(s.paid) : "—"}</p></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
