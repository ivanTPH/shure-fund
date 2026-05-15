"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Variation = {
  id: string;
  description: string;
  value_change: number;
  status: string;
  created_at: string;
  requester: { full_name: string } | null;
};

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const STATUS_COLOR: Record<string, string> = {
  draft: "#94a3b8", submitted: "#60a5fa", under_review: "#fbbf24",
  approved: "#34d399", pending_funding: "#f97316", rejected: "#f87171",
  active: "#a3e635", cancelled: "#6b7280",
};

export default function VariationList({
  stageId,
  projectId,
}: {
  stageId: string;
  projectId: string;
}) {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/variations?stageId=${stageId}`)
      .then((r) => r.json())
      .then((d) => setVariations(d.variations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stageId]);

  if (loading) return <p className="text-xs text-neutral-500">Loading variations…</p>;

  return (
    <div className="space-y-2">
      {variations.length === 0 ? (
        <p className="text-xs text-neutral-500">No variations submitted for this stage.</p>
      ) : (
        variations.map((v) => {
          const color = STATUS_COLOR[v.status] ?? "#94a3b8";
          return (
            <Link
              key={v.id}
              href={`/projects/${projectId}/stages/${stageId}/variations/${v.id}`}
              className="flex items-center justify-between rounded-2xl px-4 py-3 transition-colors hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{v.description}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{v.requester?.full_name ?? "Unknown"}</p>
              </div>
              <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-bold" style={{ color: v.value_change >= 0 ? "#4ade80" : "#f87171" }}>
                  {v.value_change >= 0 ? "+" : ""}{gbp.format(v.value_change)}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
                  {v.status.replace("_", " ")}
                </span>
              </div>
            </Link>
          );
        })
      )}

      <Link
        href={`/projects/${projectId}/stages/${stageId}/variations/new`}
        className="mt-2 flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
        style={{ border: "1px dashed rgba(255,255,255,0.12)" }}
      >
        + Submit new variation
      </Link>
    </div>
  );
}
