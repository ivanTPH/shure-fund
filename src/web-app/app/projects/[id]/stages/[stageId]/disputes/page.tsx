"use client";

/**
 * /projects/[id]/stages/[stageId]/disputes
 *
 * Lists all disputes for a specific stage.
 * Links to [disputeId] detail page and /new for raising a dispute.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../components/AppShell";

type Dispute = {
  id: string;
  reason: string;
  status: string;
  disputed_value: number;
  created_at: string;
  resolution_notes: string | null;
  raiser: { id: string; full_name: string; role: string } | null;
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

export default function StageDisputesPage() {
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/disputes?stageId=${stageId}`)
      .then((r) => r.json())
      .then((body: { disputes?: Dispute[]; error?: string }) => {
        if (body.error) { setError(body.error); return; }
        setDisputes(body.disputes ?? []);
      })
      .catch(() => setError("Failed to load disputes"))
      .finally(() => setLoading(false));
  }, [stageId]);

  const fmt = (v: number) =>
    `£${Number(v).toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <AppShell>
      <div style={{ padding: "32px 24px", maxWidth: 820, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: "rgba(13,17,68,0.55)", marginBottom: 16 }}>
          <Link href={`/projects/${projectId}`} style={{ color: "#2563eb", textDecoration: "none" }}>Project</Link>
          {" / "}
          <Link href={`/projects/${projectId}/stages/${stageId}`} style={{ color: "#2563eb", textDecoration: "none" }}>Stage</Link>
          {" / Disputes"}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--brand-navy, #0D1144)", margin: 0 }}>
            Stage Disputes
          </h1>
          <Link
            href={`/projects/${projectId}/stages/${stageId}/disputes/new`}
            style={{
              padding: "8px 18px", background: "#0D1144", color: "#fff",
              borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 600,
            }}
          >
            Raise Dispute
          </Link>
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
            No disputes for this stage
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {disputes.map((d) => (
            <Link
              key={d.id}
              href={`/projects/${projectId}/stages/${stageId}/disputes/${d.id}`}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                background: "#fff", border: "1px solid var(--surface-border, #e4e7f0)",
                borderRadius: 20, padding: "18px 20px", cursor: "pointer",
                transition: "box-shadow 0.15s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#0D1144", marginBottom: 6 }}>
                      {d.reason.length > 100 ? d.reason.slice(0, 100) + "…" : d.reason}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(13,17,68,0.55)", display: "flex", gap: 12 }}>
                      {d.raiser && <span>By {d.raiser.full_name}</span>}
                      <span>{fmtDate(d.created_at)}</span>
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
                      {fmt(d.disputed_value)}
                    </span>
                  </div>
                </div>

                {d.resolution_notes && (
                  <div style={{
                    marginTop: 10, padding: "8px 12px", background: "#f0fdf4",
                    borderRadius: 8, fontSize: 13, color: "#059669",
                  }}>
                    Resolution: {d.resolution_notes}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
