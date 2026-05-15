"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Dispute = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  raiser: { full_name: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  raised: "#fbbf24", under_review: "#60a5fa", resolved: "#34d399", escalated: "#f97316",
};

const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function DisputeList({ stageId, projectId }: { stageId: string; projectId: string }) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/disputes?stageId=${stageId}`)
      .then((r) => r.json())
      .then((d) => setDisputes(d.disputes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stageId]);

  if (loading) return <p className="text-xs text-neutral-500">Loading disputes…</p>;

  return (
    <div className="space-y-2">
      {disputes.length === 0 ? (
        <p className="text-xs text-neutral-500">No disputes raised for this stage.</p>
      ) : (
        disputes.map((d) => {
          const color = STATUS_COLOR[d.status] ?? "#94a3b8";
          return (
            <Link
              key={d.id}
              href={`/projects/${projectId}/stages/${stageId}/disputes/${d.id}`}
              className="flex items-center justify-between rounded-2xl px-4 py-3 transition-colors hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{d.reason}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {d.raiser?.full_name ?? "Unknown"} · {fmt.format(new Date(d.created_at))}
                </p>
              </div>
              <span className="ml-3 shrink-0 text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
                {d.status.replace("_", " ")}
              </span>
            </Link>
          );
        })
      )}

      <Link
        href={`/projects/${projectId}/stages/${stageId}/disputes/new`}
        className="mt-2 flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
        style={{ border: "1px dashed rgba(255,255,255,0.12)" }}
      >
        + Raise dispute
      </Link>
    </div>
  );
}
