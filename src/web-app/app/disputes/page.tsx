"use client";

/**
 * /disputes — Cross-project disputes hub
 *
 * Shows all disputes the current user can see across all projects,
 * grouped by status. Calls GET /api/disputes (cross-project mode).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../components/AppShell";

type Dispute = {
  id: string;
  reason: string;
  status: string;
  disputedValue: number;
  createdAt: string;
  resolutionNotes: string | null;
  stageId: string;
  stageName: string | null;
  contractId: string | null;
  projectId: string | null;
  projectName: string | null;
  raiserId: string | null;
  raiserName: string | null;
};

type Summary = {
  total: number;
  raised: number;
  under_review: number;
  resolved: number;
};

const STATUS_LABELS: Record<string, string> = {
  raised:       "Raised",
  under_review: "Under Review",
  resolved:     "Resolved",
};

const STATUS_COLOURS: Record<string, string> = {
  raised:       "#dc2626",
  under_review: "#ea580c",
  resolved:     "#059669",
};

const TABS = ["all", "raised", "under_review", "resolved"] as const;
type Tab = (typeof TABS)[number];

export default function DisputesPage() {
  const [disputes, setDisputes]   = useState<Dispute[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [tab, setTab]             = useState<Tab>("all");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "all") params.set("status", tab);
    fetch(`/api/disputes?${params}`)
      .then((r) => r.json())
      .then((body: { disputes?: Dispute[]; summary?: Summary; error?: string }) => {
        if (body.error) { setError(body.error); return; }
        setDisputes(body.disputes ?? []);
        setSummary(body.summary ?? null);
      })
      .catch(() => setError("Failed to load disputes"))
      .finally(() => setLoading(false));
  }, [tab]);

  const fmt = (v: number) => `£${v.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <AppShell>
      <div style={{ padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--brand-navy, #0D1144)", margin: "0 0 4px" }}>
          Disputes
        </h1>
        <p style={{ color: "rgba(13,17,68,0.55)", margin: "0 0 24px" }}>
          All disputes across your projects
        </p>

        {/* Summary strip */}
        {summary && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {[
              { label: "Total", value: summary.total, color: "#0D1144" },
              { label: "Raised", value: summary.raised, color: "#dc2626" },
              { label: "Under Review", value: summary.under_review, color: "#ea580c" },
              { label: "Resolved", value: summary.resolved, color: "#059669" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: "#fff", border: "1px solid var(--surface-border, #e4e7f0)",
                borderRadius: 16, padding: "14px 20px", minWidth: 120, flex: "1 1 120px",
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 12, color: "rgba(13,17,68,0.55)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Status tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => { setLoading(true); setTab(t); }}
              style={{
                padding: "6px 16px", borderRadius: 20, border: "1px solid",
                borderColor: tab === t ? "#0D1144" : "var(--surface-border, #e4e7f0)",
                background: tab === t ? "#0D1144" : "#fff",
                color: tab === t ? "#fff" : "rgba(13,17,68,0.7)",
                fontWeight: tab === t ? 600 : 400,
                cursor: "pointer", fontSize: 14,
              }}
            >
              {t === "all" ? "All" : STATUS_LABELS[t] ?? t}
            </button>
          ))}
        </div>

        {loading && (
          <p style={{ color: "rgba(13,17,68,0.45)", textAlign: "center", padding: "40px 0" }}>
            Loading disputes…
          </p>
        )}

        {error && (
          <div style={{ background: "#fee2e2", borderRadius: 12, padding: 16, color: "#dc2626" }}>
            {error}
          </div>
        )}

        {!loading && !error && disputes.length === 0 && (
          <div style={{
            background: "#fff", border: "1px solid var(--surface-border, #e4e7f0)",
            borderRadius: 20, padding: "40px 24px", textAlign: "center",
            color: "rgba(13,17,68,0.45)",
          }}>
            No disputes found
          </div>
        )}

        {/* Dispute cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {disputes.map((d) => (
            <div key={d.id} style={{
              background: "#fff", border: "1px solid var(--surface-border, #e4e7f0)",
              borderRadius: 20, padding: "18px 20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#0D1144", marginBottom: 4 }}>
                    {d.reason.length > 120 ? d.reason.slice(0, 120) + "…" : d.reason}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(13,17,68,0.55)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {d.projectName && (
                      <span>
                        {d.projectId ? (
                          <Link href={`/projects/${d.projectId}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                            {d.projectName}
                          </Link>
                        ) : d.projectName}
                      </span>
                    )}
                    {d.stageName && <span>Stage: {d.stageName}</span>}
                    {d.raiserName && <span>Raised by: {d.raiserName}</span>}
                    <span>{fmtDate(d.createdAt)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
                    background: (STATUS_COLOURS[d.status] ?? "#64748b") + "18",
                    color: STATUS_COLOURS[d.status] ?? "#64748b",
                  }}>
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                  <span style={{ fontWeight: 700, color: "#0D1144", fontSize: 15 }}>
                    {fmt(d.disputedValue)}
                  </span>
                </div>
              </div>

              {d.projectId && d.stageId && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                  <Link
                    href={`/projects/${d.projectId}/stages/${d.stageId}/disputes/${d.id}`}
                    style={{ fontSize: 13, color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
                  >
                    View dispute →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
