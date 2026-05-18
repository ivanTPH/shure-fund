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
  accepted: "#34d399", rejected: "#f87171", pending: "#fbbf24", uploaded: "#60a5fa",
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
        <p className="text-neutral-400">Loading…</p>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link href={`/projects/${projectId}/stages/${stageId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
        ← Back to stage
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-white">Reconciliation</h1>
      {stage && <p className="mt-1 text-sm text-neutral-400">{stage.name} · {gbp.format(stage.value)}</p>}

      {error && (
        <p className="mt-4 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </p>
      )}

      <div className="mt-6 max-w-lg space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Accepted", count: accepted.length, color: "#34d399" },
            { label: "Pending", count: pending.length, color: "#fbbf24" },
            { label: "Rejected", count: rejected.length, color: "#f87171" },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-2xl px-4 py-3 text-center" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
              <p className="text-xl font-bold" style={{ color }}>{count}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Evidence list */}
        {evidence.length === 0 ? (
          <p className="text-sm text-neutral-500">No evidence uploaded for this stage.</p>
        ) : (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Evidence items</p>
            <div className="space-y-2">
              {evidence.map((ev) => {
                const color = STATUS_COLOR[ev.status] ?? "#94a3b8";
                return (
                  <div key={ev.id} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{ev.name}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {ev.uploadedBy?.full_name ?? "Unknown"} · {fmt.format(new Date(ev.uploadedAt))}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      {ev.signedUrl && (
                        <a href={ev.signedUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300">
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
