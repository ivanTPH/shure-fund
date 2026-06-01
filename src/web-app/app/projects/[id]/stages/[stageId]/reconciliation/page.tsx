"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/app/components/AppShell";

type EvidenceItem = {
  id: string;
  name: string;
  signedUrl: string | null;
  status: string;
  uploadedAt: string;
  uploadedBy: { full_name: string } | null;
};

type StageInfo = { id: string; name: string; value: number; status: string };

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_COLOR: Record<string, string> = {
  accepted: "#059669", rejected: "#dc2626", pending: "#d97706", uploaded: "#2563eb",
};

export default function ReconciliationPage() {
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();
  const [stage, setStage] = useState<StageInfo | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [stageRes, evRes] = await Promise.all([
          fetch(`/api/stages/${stageId}`),
          fetch(`/api/evidence?stageId=${stageId}`),
        ]);
        const [stageData, evData] = await Promise.all([stageRes.json(), evRes.json()]);
        if (stageRes.ok) setStage(stageData.stage ?? null);
        if (evRes.ok) setEvidence(evData.evidence ?? []);
      } catch { setError("Failed to load reconciliation data."); } finally { setLoading(false); }
    }
    load();
  }, [stageId]);

  const accepted = evidence.filter((e) => e.status === "accepted");
  const pending = evidence.filter((e) => e.status !== "accepted" && e.status !== "rejected");
  const rejected = evidence.filter((e) => e.status === "rejected");

  if (loading) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading…</p>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
    <div className="min-h-screen px-4 py-8">
      <Link href={`/projects/${projectId}/stages/${stageId}`} className="text-xs font-medium hover:underline" style={{ color: "rgba(13,17,68,0.45)" }}>
        ← Back to stage
      </Link>

      <h1 className="mt-4 text-2xl font-bold" style={{ color: "#0D1144" }}>Reconciliation</h1>
      {stage && <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>{stage.name} · {gbp.format(stage.value)}</p>}

      {error && (
        <p className="mt-4 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>
          {error}
        </p>
      )}

      <div className="mt-6 max-w-lg space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Accepted", count: accepted.length, color: "#059669" },
            { label: "Pending",  count: pending.length,  color: "#d97706" },
            { label: "Rejected", count: rejected.length, color: "#dc2626" },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-2xl px-4 py-3 text-center" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
              <p className="text-xl font-bold" style={{ color }}>{count}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Evidence list */}
        {evidence.length === 0 ? (
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No evidence uploaded for this stage.</p>
        ) : (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Evidence items</p>
            <div className="space-y-2">
              {evidence.map((ev) => {
                const color = STATUS_COLOR[ev.status] ?? "#64748b";
                return (
                  <div key={ev.id} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" style={{ color: "#0D1144" }}>{ev.name}</p>
                      <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
                        {ev.uploadedBy?.full_name ?? "Unknown"} · {fmt.format(new Date(ev.uploadedAt))}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      {ev.signedUrl && (
                        <a href={ev.signedUrl} target="_blank" rel="noreferrer" className="text-[10px] hover:underline" style={{ color: "#2563eb" }}>
                          View
                        </a>
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
                        {ev.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
    </AppShell>
  );
}
