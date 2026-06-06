"use client";

/**
 * /account/payments — personal token payment ledger.
 *
 * Shows all stage-release payments received by the current user
 * across all projects they hold tokens in, grouped by project.
 * Visible to funders and admins.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/app/components/AppShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Payment = {
  id: string;
  amount: number;
  sharePct: number | null;
  reference: string;
  paidAt: string;
  projectId: string;
  stageId: string;
  projectName: string | null;
  projectAddress: string | null;
  stageName: string | null;
};

type Summary = { total: number; count: number; projectCount: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const gbpDec = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function fmtDate(iso: string) { return fmt.format(new Date(iso)); }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/token-payments")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setPayments(d.payments ?? []);
        setSummary(d.summary ?? null);
      })
      .catch(() => setError("Network error loading payments."))
      .finally(() => setLoading(false));
  }, []);

  // Group by project
  const byProject = useMemo(() => {
    const map = new Map<string, { name: string; address: string | null; payments: Payment[] }>();
    for (const p of payments) {
      if (!map.has(p.projectId)) {
        map.set(p.projectId, { name: p.projectName ?? p.projectId, address: p.projectAddress, payments: [] });
      }
      map.get(p.projectId)!.payments.push(p);
    }
    return [...map.entries()].map(([id, v]) => ({ projectId: id, ...v }));
  }, [payments]);

  const navy  = "var(--brand-navy, #0D1144)";
  const muted = "rgba(13,17,68,0.45)";
  const card  = { border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" } as const;

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
        <Link href="/account" className="text-xs font-medium transition hover:opacity-70" style={{ color: muted }}>
          ← Account
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: navy }}>My payments</h1>
          <p className="mt-1 text-sm" style={{ color: muted }}>
            Token distributions received across all projects you hold a stake in.
          </p>
        </div>

        {loading && (
          <p className="text-sm" style={{ color: muted }}>Loading payments…</p>
        )}

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="max-w-2xl space-y-6">

            {/* Summary strip */}
            {summary && summary.count > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total received",  value: gbp.format(summary.total),         color: "#059669" },
                  { label: "Payments",        value: String(summary.count),              color: navy },
                  { label: "Projects",        value: String(summary.projectCount),       color: "#2563eb" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-2xl px-4 py-4" style={card}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>{label}</p>
                    <p className="mt-1.5 text-xl font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {payments.length === 0 && (
              <div className="rounded-[20px] px-6 py-10 text-center" style={card}>
                <p className="text-3xl mb-2">💷</p>
                <p className="text-sm font-semibold" style={{ color: navy }}>No payments yet</p>
                <p className="mt-1 text-xs" style={{ color: muted }}>
                  Payments are recorded here each time a stage is released on a project you fund.
                </p>
              </div>
            )}

            {/* Per-project groups */}
            {byProject.map(({ projectId, name, address, payments: plist }) => {
              const projectTotal = plist.reduce((s, p) => s + p.amount, 0);
              return (
                <div key={projectId} className="rounded-[20px] overflow-hidden" style={card}>
                  {/* Project header */}
                  <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.02)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: navy }}>{name}</p>
                      {address && (
                        <p className="text-xs truncate" style={{ color: muted }}>{address}</p>
                      )}
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>Total</p>
                      <p className="text-base font-bold" style={{ color: "#059669" }}>{gbp.format(projectTotal)}</p>
                    </div>
                  </div>

                  {/* Payment rows */}
                  <div className="divide-y" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
                    {plist.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: navy }}>
                            {p.stageName ?? "Stage payment"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-xs" style={{ color: muted }}>{fmtDate(p.paidAt)}</p>
                            {p.sharePct != null && (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{ backgroundColor: "rgba(37,99,235,0.08)", color: "#2563eb" }}
                              >
                                {(p.sharePct * 100).toFixed(1)}% share
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="ml-4 shrink-0 text-sm font-bold" style={{ color: "#059669" }}>
                          {gbpDec.format(p.amount)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Project link */}
                  <div
                    className="px-5 py-3"
                    style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.01)" }}
                  >
                    <Link
                      href={`/projects/${projectId}/wallet`}
                      className="text-xs font-semibold transition hover:opacity-70"
                      style={{ color: muted }}
                    >
                      View project wallet →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
