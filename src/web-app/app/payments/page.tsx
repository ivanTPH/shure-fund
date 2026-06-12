"use client";

/**
 * Cross-project payment releases — /payments
 *
 * Shows all released stage payments across every project the current user
 * has access to. Accessible to funder, developer, admin.
 *
 * Grouped by project. Shows total released across all projects.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReleaseItem = {
  stageId: string;
  stageName: string;
  value: number;
  endDate: string | null;
  retentionReleasedAt: string | null;
  contractId: string;
  projectId: string;
  projectName: string | null;
  projectAddress: string | null;
  projectStatus: string | null;
};

type Summary = { totalReleased: number; totalStages: number; projectCount: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalReleased: 0, totalStages: 0, projectCount: 0 });

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }
      const r = getRole(user);
      if (!["funder", "developer", "admin"].includes(r ?? "")) {
        router.replace("/projects");
        return;
      }
      const res = await fetch("/api/payments/releases");
      if (!res.ok) { router.replace("/projects"); return; }
      const data = await res.json() as { releases: ReleaseItem[]; summary: Summary };
      setReleases(data.releases ?? []);
      setSummary(data.summary ?? { totalReleased: 0, totalStages: 0, projectCount: 0 });
      setLoading(false);
    };
    init();
  }, [router]);

  // Group by project
  const byProject = releases.reduce<Record<string, { name: string; address: string | null; items: ReleaseItem[] }>>(
    (acc, r) => {
      const pid = r.projectId;
      if (!acc[pid]) acc[pid] = { name: r.projectName ?? pid, address: r.projectAddress, items: [] };
      acc[pid].items.push(r);
      return acc;
    },
    {},
  );

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0D1144" }}>
            Payment releases
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
            All stage payments released across your projects.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading…</p>
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div
              className="mb-6 grid grid-cols-3 gap-4 rounded-[20px] px-5 py-5"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Total released</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: "#0D1144" }}>
                  {gbp.format(summary.totalReleased)}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Stages</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: "#0D1144" }}>
                  {summary.totalStages}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Projects</p>
                <p className="mt-0.5 text-xl font-bold" style={{ color: "#0D1144" }}>
                  {summary.projectCount}
                </p>
              </div>
            </div>

            {Object.keys(byProject).length === 0 ? (
              <div
                className="rounded-[20px] px-6 py-10 text-center"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
              >
                <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No released payments yet.</p>
              </div>
            ) : (
              Object.entries(byProject).map(([projectId, group]) => {
                const projectTotal = group.items.reduce((s, r) => s + r.value, 0);
                return (
                  <section key={projectId} className="mb-6">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p
                          className="text-xs font-semibold uppercase tracking-widest"
                          style={{ color: "rgba(13,17,68,0.45)" }}
                        >
                          {group.address}
                        </p>
                        <Link
                          href={`/projects/${projectId}`}
                          className="text-base font-bold hover:underline"
                          style={{ color: "#0D1144" }}
                        >
                          {group.name}
                        </Link>
                      </div>
                      <p className="text-sm font-bold" style={{ color: "#0D1144" }}>
                        {gbp.format(projectTotal)}
                      </p>
                    </div>

                    <div
                      className="rounded-[20px] overflow-hidden"
                      style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                    >
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Stage</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Date</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Amount</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Retention</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((r, i) => (
                            <tr
                              key={r.stageId}
                              style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}
                            >
                              <td className="px-4 py-3">
                                <Link
                                  href={`/projects/${r.projectId}/stages/${r.stageId}`}
                                  className="text-sm font-medium hover:underline"
                                  style={{ color: "#0D1144" }}
                                >
                                  {r.stageName}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-xs" style={{ color: "rgba(13,17,68,0.55)" }}>
                                {fmtDate(r.endDate)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: "#059669" }}>
                                {gbp.format(r.value)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {r.retentionReleasedAt ? (
                                  <span className="text-[10px] font-semibold" style={{ color: "#059669" }}>Released</span>
                                ) : (
                                  <span className="text-[10px]" style={{ color: "rgba(13,17,68,0.35)" }}>Withheld</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#f7f8fc" }}>
                            <td colSpan={2} className="px-4 py-3 text-xs font-semibold" style={{ color: "rgba(13,17,68,0.55)" }}>
                              {group.items.length} stage{group.items.length !== 1 ? "s" : ""}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: "#0D1144" }}>
                              {gbp.format(projectTotal)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </section>
                );
              })
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
