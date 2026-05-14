"use client";

import { useEffect, useState } from "react";
import type { FundingState } from "@/lib/funding/assuranceEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Position = {
  state: FundingState;
  walletBalance: number;
  projectedWip: number;
  shortfall: number;
  coveragePct: number | null;
  activeStages: { stageId: string; stageName: string; value: number }[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return gbp.format(n);
}

const STATE_STYLES: Record<
  FundingState,
  { border: string; bg: string; dot: string; label: string; labelColor: string }
> = {
  funded: {
    border: "rgba(34,197,94,0.25)",
    bg: "rgba(34,197,94,0.08)",
    dot: "#22c55e",
    label: "FUNDED",
    labelColor: "#4ade80",
  },
  warning: {
    border: "rgba(234,179,8,0.3)",
    bg: "rgba(234,179,8,0.08)",
    dot: "#eab308",
    label: "WARNING",
    labelColor: "#facc15",
  },
  gap: {
    border: "rgba(239,68,68,0.3)",
    bg: "rgba(239,68,68,0.1)",
    dot: "#ef4444",
    label: "GAP",
    labelColor: "#f87171",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FundingBanner({ projectId }: { projectId: string }) {
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/funding-position`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setPosition(data as Position);
      })
      .catch(() => {/* silently ignore — banner is non-blocking */});
  }, [projectId]);

  if (!position) return null;

  const style = STATE_STYLES[position.state];

  return (
    <div
      className="rounded-[20px] px-4 py-3"
      style={{
        border: `1px solid ${style.border}`,
        backgroundColor: style.bg,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* State label */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: style.dot }}
          />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: style.labelColor }}
          >
            {style.label}
          </span>
        </div>

        {/* Coverage pct */}
        {position.coveragePct !== null && (
          <span className="text-xs font-semibold text-neutral-300">
            {Math.round(position.coveragePct)}% cover
          </span>
        )}
      </div>

      {/* Metrics row */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
        <span>
          Wallet{" "}
          <span className="font-semibold text-white">
            {compact(position.walletBalance)}
          </span>
        </span>
        <span>
          Active WIP{" "}
          <span className="font-semibold text-white">
            {compact(position.projectedWip)}
          </span>
        </span>
        {position.state === "gap" && position.shortfall > 0 && (
          <span>
            Shortfall{" "}
            <span className="font-semibold" style={{ color: "#f87171" }}>
              {compact(position.shortfall)}
            </span>
          </span>
        )}
        {position.activeStages.length > 0 && (
          <span>
            {position.activeStages.length} active stage
            {position.activeStages.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Gap warning */}
      {position.state === "gap" && (
        <p
          className="mt-2 text-xs leading-relaxed"
          style={{ color: "#f87171" }}
        >
          Stage progression is blocked until wallet covers active work-in-progress.
        </p>
      )}
    </div>
  );
}
