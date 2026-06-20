"use client";

/**
 * /projects/[id]/stages/[stageId]/variations
 *
 * Lists all variations for a specific stage.
 * Links to [variationId] detail page and /new for creating a variation.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../components/AppShell";
import { Skeleton } from "../../../../../components/Skeleton";

type Variation = {
  id: string;
  description: string;
  value_change: number;
  status: string;
  approved_at: string | null;
  created_at: string;
  requester: { full_name: string; role: string } | null;
  approver: { full_name: string; role: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft:     "Draft",
  submitted: "Submitted",
  approved:  "Approved",
  rejected:  "Rejected",
  activated: "Activated",
};

const STATUS_COLOURS: Record<string, string> = {
  draft:     "#64748b",
  submitted: "#2563eb",
  approved:  "#059669",
  rejected:  "#dc2626",
  activated: "#7c3aed",
};

export default function StageVariationsPage() {
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/variations?stageId=${stageId}`)
      .then((r) => r.json())
      .then((body: { variations?: Variation[]; error?: string }) => {
        if (body.error) { setError(body.error); return; }
        setVariations(body.variations ?? []);
      })
      .catch(() => setError("Failed to load variations"))
      .finally(() => setLoading(false));
  }, [stageId]);

  const fmtValue = (v: number) => {
    const abs = Math.abs(v);
    const sign = v >= 0 ? "+" : "−";
    return `${sign}£${abs.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;
  };
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
          {" / Variations"}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--brand-navy, #0D1144)", margin: 0 }}>
            Stage Variations
          </h1>
          <Link
            href={`/projects/${projectId}/stages/${stageId}/variations/new`}
            style={{
              padding: "8px 18px", background: "#0D1144", color: "#fff",
              borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 600,
            }}
          >
            New Variation
          </Link>
        </div>

        {loading && <Skeleton.CardList rows={3} />}

        {error && (
          <div style={{ background: "#fee2e2", borderRadius: 12, padding: 16, color: "#dc2626" }}>
            {error}
          </div>
        )}

        {!loading && !error && variations.length === 0 && (
          <div style={{
            background: "#fff", border: "1px solid var(--surface-border, #e4e7f0)",
            borderRadius: 20, padding: "40px 24px", textAlign: "center",
            color: "rgba(13,17,68,0.45)",
          }}>
            No variations for this stage
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {variations.map((v) => (
            <Link
              key={v.id}
              href={`/projects/${projectId}/stages/${stageId}/variations/${v.id}`}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                background: "#fff", border: "1px solid var(--surface-border, #e4e7f0)",
                borderRadius: 20, padding: "18px 20px", cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#0D1144", marginBottom: 6 }}>
                      {v.description.length > 100 ? v.description.slice(0, 100) + "…" : v.description}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(13,17,68,0.55)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {v.requester && <span>By {v.requester.full_name}</span>}
                      {v.approver && <span>Approved by {v.approver.full_name}</span>}
                      <span>{fmtDate(v.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
                      background: (STATUS_COLOURS[v.status] ?? "#64748b") + "18",
                      color: STATUS_COLOURS[v.status] ?? "#64748b",
                    }}>
                      {STATUS_LABELS[v.status] ?? v.status}
                    </span>
                    <span style={{
                      fontWeight: 700, fontSize: 15,
                      color: v.value_change >= 0 ? "#059669" : "#dc2626",
                    }}>
                      {fmtValue(v.value_change)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
