"use client";

/**
 * Admin override panel — /projects/[id]/stages/[stageId]/override
 *
 * Allows administrators to force-set a stage's status, bypassing the
 * normal state machine. Use only to recover stuck or misconfigured stages.
 * All overrides are recorded in the immutable audit trail via DB trigger.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import { STAGE_STATUSES, type StageStatus } from "@/lib/workflow/stateMachine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<string, string> = {
  draft:                "#94a3b8",
  sent:                 "#60a5fa",
  accepted:             "#34d399",
  in_progress:          "#a78bfa",
  awaiting_approval:    "#fbbf24",
  returned:             "#f97316",
  disputed:             "#f87171",
  available_to_release: "#34d399",
  released:             "#34d399",
  funding_gap:          "#ef4444",
  part_funded:          "#fb923c",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminOverridePage() {
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();
  const router = useRouter();

  const [stageName, setStageName]       = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [loading, setLoading]           = useState(true);
  const [accessError, setAccessError]   = useState<string | null>(null);

  const [targetStatus, setTargetStatus] = useState<StageStatus>("in_progress");
  const [reason, setReason]             = useState("");
  const [confirmed, setConfirmed]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [done, setDone]                 = useState(false);
  const [result, setResult]             = useState<{ from: string; to: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user || getRole(user) !== "admin") {
        setAccessError("This page is restricted to administrators.");
        return;
      }

      const r = await fetch(`/api/stages/${stageId}`);
      if (!r.ok) { setAccessError("Stage not found."); return; }
      const { stage } = await r.json();
      setStageName(stage.name ?? stageId);
      setCurrentStatus(stage.status ?? "");
      // Default target to first status that differs from current
      const first = STAGE_STATUSES.find((s) => s !== stage.status);
      if (first) setTargetStatus(first);
    } catch {
      setAccessError("Failed to load stage.");
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => { load(); }, [load]);

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/stages/${stageId}/override`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: targetStatus, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Override failed."); return; }
      setResult({ from: data.from, to: data.to });
      setDone(true);
      setTimeout(() => router.push(`/projects/${projectId}/stages/${stageId}`), 3000);
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      </AppShell>
    );
  }

  if (accessError) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
          <Link href={`/projects/${projectId}`} className="text-xs text-neutral-400 hover:text-white">
            ← Back to project
          </Link>
          <div className="mt-6 rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm font-semibold text-red-400">Access denied</p>
            <p className="mt-1 text-sm text-red-300">{accessError}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (done && result) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#0d1144" }}>
          <div className="text-center max-w-xs">
            <div
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(251,191,36,0.15)", border: "2px solid #fbbf24" }}
            >
              <span className="text-3xl text-amber-400">⚡</span>
            </div>
            <p className="text-xl font-bold text-white">Override applied</p>
            <p className="mt-2 text-sm text-neutral-400">
              Status changed from{" "}
              <span className="font-semibold text-white">{result.from.replace(/_/g, " ")}</span>
              {" "}to{" "}
              <span className="font-semibold text-white">{result.to.replace(/_/g, " ")}</span>.
            </p>
            <p className="mt-4 text-xs text-neutral-600">Returning to stage…</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const currentColor = STATUS_COLOR[currentStatus] ?? "#94a3b8";
  const targetColor  = STATUS_COLOR[targetStatus]  ?? "#94a3b8";

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "#0d1144" }}>
        <Link
          href={`/projects/${projectId}/stages/${stageId}`}
          className="text-xs font-medium text-neutral-400 hover:text-white"
        >
          ← Back to stage
        </Link>

        {/* Warning banner */}
        <div
          className="mt-4 rounded-2xl px-4 py-3"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-red-400">Admin override — use with caution</p>
          <p className="mt-1 text-sm text-neutral-300">
            This bypasses all workflow validation and pre-condition checks. The change is permanent and
            recorded in the immutable audit trail.
          </p>
        </div>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Force stage status</h1>
          <p className="mt-1 text-sm text-neutral-400">{stageName}</p>
        </div>

        <div className="max-w-lg space-y-5">

          {/* Current status */}
          <div
            className="rounded-[20px] p-5"
            style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2">Current status</p>
            <span
              className="rounded-full px-3 py-1 text-sm font-bold capitalize"
              style={{ backgroundColor: currentColor + "22", color: currentColor, border: `1px solid ${currentColor}44` }}
            >
              {currentStatus.replace(/_/g, " ")}
            </span>
          </div>

          {/* Override form */}
          <form onSubmit={handleOverride} className="space-y-4">
            {/* Target status */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2">
                Force to status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STAGE_STATUSES.filter((s) => s !== currentStatus).map((s) => {
                  const color = STATUS_COLOR[s] ?? "#94a3b8";
                  const isSelected = targetStatus === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setTargetStatus(s); setConfirmed(false); }}
                      className="rounded-2xl px-3 py-2.5 text-sm font-medium text-left transition"
                      style={{
                        border: `1px solid ${isSelected ? color + "66" : "rgba(255,255,255,0.08)"}`,
                        backgroundColor: isSelected ? color + "15" : "rgba(255,255,255,0.03)",
                        color: isSelected ? color : "#9ca3af",
                      }}
                    >
                      {s.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                Reason (required for audit trail)
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain why this override is necessary…"
                value={reason}
                onChange={(e) => { setReason(e.target.value); setConfirmed(false); }}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
              />
            </div>

            {/* Arrow preview */}
            {reason.trim() && (
              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-xs font-bold capitalize" style={{ color: currentColor }}>
                  {currentStatus.replace(/_/g, " ")}
                </span>
                <span className="text-neutral-600">→</span>
                <span className="text-xs font-bold capitalize" style={{ color: targetColor }}>
                  {targetStatus.replace(/_/g, " ")}
                </span>
              </div>
            )}

            {/* Confirmation checkbox */}
            {reason.trim() && (
              <label
                className="flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-4"
                style={{
                  border: `1px solid ${confirmed ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`,
                  backgroundColor: confirmed ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
                }}
              >
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-red-500"
                />
                <p className="text-sm text-neutral-200">
                  I understand this override bypasses all workflow checks and is permanently recorded in the audit trail.
                  I am forcing{" "}
                  <span className="font-bold text-white">{stageName}</span>{" "}
                  to{" "}
                  <span className="font-bold" style={{ color: targetColor }}>{targetStatus.replace(/_/g, " ")}</span>.
                </p>
              </label>
            )}

            {submitError && (
              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-xs font-bold uppercase tracking-wider text-red-400">Failed</p>
                <p className="mt-1 text-sm text-red-300">{submitError}</p>
              </div>
            )}

            {confirmed && (
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="w-full rounded-2xl py-4 text-sm font-bold text-white transition disabled:opacity-40"
                style={{ backgroundColor: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)" }}
              >
                {submitting ? "Applying override…" : `Force to "${targetStatus.replace(/_/g, " ")}"`}
              </button>
            )}
          </form>
        </div>
      </div>
    </AppShell>
  );
}
