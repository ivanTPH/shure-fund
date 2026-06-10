"use client";

/**
 * Payment schedule — /projects/[id]/schedule
 *
 * Timeline of all stages with dates, sorted by due date.
 * Shows 30/60/90-day funding requirement windows.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";

// ── Types ──────────────────────────────────────────────────────────────────

type ScheduleStage = {
  id: string;
  contractId: string;
  name: string;
  value: number;
  status: string;
  contractorName: string;
  startDate: string | null;
  endDate: string | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
};

type Windows = {
  next30: { value: number; count: number };
  next60: { value: number; count: number };
  next90: { value: number; count: number };
};

// ── Helpers ────────────────────────────────────────────────────────────────

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const STATUS_COLOR: Record<string, string> = {
  draft:                "#94a3b8",
  sent:                 "#2563eb",
  accepted:             "#7c3aed",
  in_progress:          "#d97706",
  awaiting_approval:    "#7c3aed",
  returned:             "#ea580c",
  disputed:             "#dc2626",
  available_to_release: "#059669",
  released:             "#16a34a",
  funding_gap:          "#dc2626",
};

/** Render the start→end date span as a relative progress bar within a 90-day window */
function DateBar({ startDate, endDate, isOverdue }: { startDate: string | null; endDate: string | null; isOverdue: boolean }) {
  if (!startDate && !endDate) return null;

  const now = Date.now();
  const windowMs = 90 * 24 * 60 * 60 * 1000;
  const windowStart = now - 14 * 24 * 60 * 60 * 1000; // 14 days before today

  const start = startDate ? new Date(startDate).getTime() : now;
  const end   = endDate   ? new Date(endDate).getTime()   : start + 14 * 24 * 60 * 60 * 1000;

  const leftPct  = Math.max(0, Math.min(100, ((start - windowStart) / windowMs) * 100));
  const widthPct = Math.max(1, Math.min(100 - leftPct, ((end - start) / windowMs) * 100));

  return (
    <div className="relative h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "rgba(13,17,68,0.07)" }}>
      {/* Today marker */}
      <div
        className="absolute top-0 h-full w-px"
        style={{ left: `${((now - windowStart) / windowMs) * 100}%`, backgroundColor: "rgba(13,17,68,0.25)" }}
      />
      <div
        className="absolute top-0 h-full rounded-full"
        style={{
          left:  `${leftPct}%`,
          width: `${widthPct}%`,
          backgroundColor: isOverdue ? "#dc2626" : "#2563eb",
          opacity: 0.75,
        }}
      />
    </div>
  );
}

function WindowCard({ label, value, count, color }: { label: string; value: number; count: number; color: string }) {
  return (
    <div className="rounded-[18px] px-4 py-4" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
      <p className="text-xl font-bold leading-tight" style={{ color }}>{gbp.format(value)}</p>
      <p className="text-[10px] mt-0.5" style={{ color: "rgba(13,17,68,0.4)" }}>{count} stage{count !== 1 ? "s" : ""} due</p>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [stages, setStages]           = useState<ScheduleStage[]>([]);
  const [undated, setUndated]         = useState<Omit<ScheduleStage, "daysUntilDue" | "isOverdue">[]>([]);
  const [windows, setWindows]         = useState<Windows | null>(null);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showReleased, setShowReleased] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [schedRes, dashRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/schedule`),
          fetch(`/api/projects/${projectId}/dashboard`),
        ]);
        const [schedData, dashData] = await Promise.all([schedRes.json(), dashRes.json()]);
        if (!schedRes.ok) { setError(schedData.error ?? "Failed to load schedule."); return; }
        setStages(schedData.stages ?? []);
        setUndated(schedData.undated ?? []);
        setWindows(schedData.windows);
        setProjectName(dashData.project?.name ?? "Project");
      } catch {
        setError("Network error loading schedule.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const visibleStages = showReleased
    ? stages
    : stages.filter((s) => s.status !== "released");

  const overdueCount = stages.filter((s) => s.isOverdue).length;

  if (loading) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: "rgba(13,17,68,0.4)" }}>Loading schedule…</p>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-4xl mx-auto">
        <Link href={`/projects/${projectId}`} className="text-xs font-medium transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>
          ← {projectName || "Project"}
        </Link>

        <div className="mt-4 mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Payment schedule</h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
              Stage timeline sorted by due date · funding requirements by window.
            </p>
          </div>
          {overdueCount > 0 && (
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
              {overdueCount} overdue
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Funding window strip */}
        {windows && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <WindowCard label="Due in 30 days"  value={windows.next30.value} count={windows.next30.count} color={windows.next30.value > 0 ? "#dc2626" : "#059669"} />
            <WindowCard label="Due in 60 days"  value={windows.next60.value} count={windows.next60.count} color={windows.next60.value > 0 ? "#d97706" : "#059669"} />
            <WindowCard label="Due in 90 days"  value={windows.next90.value} count={windows.next90.count} color={windows.next90.value > 0 ? "#2563eb" : "#059669"} />
          </div>
        )}

        {/* Timeline legend */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px]" style={{ color: "rgba(13,17,68,0.45)" }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded-full opacity-75" style={{ backgroundColor: "#2563eb" }} />
              Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded-full opacity-75" style={{ backgroundColor: "#dc2626" }} />
              Overdue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-px w-3" style={{ backgroundColor: "rgba(13,17,68,0.25)" }} />
              Today
            </span>
          </div>
          <button
            onClick={() => setShowReleased((v) => !v)}
            className="text-xs font-medium px-3 py-1 rounded-xl transition hover:opacity-80"
            style={{ backgroundColor: "rgba(13,17,68,0.05)", color: "rgba(13,17,68,0.6)" }}
          >
            {showReleased ? "Hide released" : "Show released"}
          </button>
        </div>

        {/* Timeline list */}
        {visibleStages.length === 0 && undated.length === 0 ? (
          <div className="rounded-[20px] px-6 py-10 text-center" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>
              {stages.length === 0
                ? "No stages with dates have been added yet."
                : "All scheduled stages are released. Toggle to show them."}
            </p>
          </div>
        ) : (
          <div className="rounded-[20px] overflow-hidden" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            {visibleStages.map((s, i) => {
              const color = STATUS_COLOR[s.status] ?? "#94a3b8";
              const isReleased = s.status === "released";
              return (
                <div
                  key={s.id}
                  className="px-5 py-4"
                  style={{
                    borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined,
                    backgroundColor: s.isOverdue ? "rgba(220,38,38,0.02)" : undefined,
                  }}
                >
                  {/* Row header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/projects/${projectId}/stages/${s.id}`}
                          className="text-sm font-semibold transition hover:opacity-70"
                          style={{ color: isReleased ? "rgba(13,17,68,0.5)" : "var(--brand-navy, #0D1144)" }}
                        >
                          {s.name}
                        </Link>
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: color + "18", color }}
                        >
                          {s.status.replace(/_/g, " ")}
                        </span>
                        {s.isOverdue && (
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
                            {Math.abs(s.daysUntilDue!)}d overdue
                          </span>
                        )}
                        {!s.isOverdue && s.daysUntilDue !== null && s.daysUntilDue <= 7 && !isReleased && (
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "#d97706" }}>
                            due in {s.daysUntilDue}d
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                        {s.contractorName}
                        {s.startDate && s.endDate && ` · ${fmtDate(s.startDate)} – ${fmtDate(s.endDate)}`}
                        {s.startDate && !s.endDate && ` · From ${fmtDate(s.startDate)}`}
                        {!s.startDate && s.endDate && ` · Due ${fmtDate(s.endDate)}`}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold" style={{ color: isReleased ? "#16a34a" : "var(--brand-navy, #0D1144)" }}>
                      {gbp.format(s.value)}
                    </p>
                  </div>

                  {/* Date bar */}
                  <DateBar startDate={s.startDate} endDate={s.endDate} isOverdue={s.isOverdue} />
                </div>
              );
            })}

            {/* Undated stages */}
            {undated.length > 0 && (
              <div style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.01)" }}>
                <div className="px-5 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.4)" }}>
                    No dates set ({undated.length})
                  </p>
                </div>
                {undated.map((s, i) => {
                  const color = STATUS_COLOR[s.status] ?? "#94a3b8";
                  return (
                    <div key={s.id} className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/projects/${projectId}/stages/${s.id}`} className="text-sm font-medium transition hover:opacity-70" style={{ color: "var(--brand-navy, #0D1144)" }}>
                            {s.name}
                          </Link>
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: color + "18", color }}>
                            {s.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(13,17,68,0.45)" }}>{s.contractorName}</p>
                      </div>
                      <p className="shrink-0 ml-3 text-sm font-bold" style={{ color: "rgba(13,17,68,0.5)" }}>{gbp.format(s.value)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
