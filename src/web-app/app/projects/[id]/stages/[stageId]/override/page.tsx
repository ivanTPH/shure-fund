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
  draft:                "#64748b",
  sent:                 "#2563eb",
  accepted:             "#7c3aed",
  in_progress:          "#2563eb",
  awaiting_approval:    "#7c3aed",
  returned:             "#ea580c",
  disputed:             "#dc2626",
  available_to_release: "#059669",
  released:             "#16a34a",
  funding_gap:          "#dc2626",
  part_funded:          "#d97706",
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
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.4)" }}>Loading…</p>
        </div>
      </AppShell>
    );
  }

  if (accessError) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8">
          <Link
            href={`/projects/${projectId}`}
            className="text-xs font-medium transition hover:opacity-70"
            style={{ color: "rgba(13,17,68,0.5)" }}
          >
            ← Back to project
          </Link>
          <div className="mt-6 rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>Access denied</p>
            <p className="mt-1 text-sm" style={{ color: "#dc2626", opacity: 0.8 }}>{accessError}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (done && result) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-xs">
            <div
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(220,38,38,0.08)", border: "2px solid rgba(220,38,38,0.3)" }}
            >
              <span className="text-3xl">⚡</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Override applied</p>
            <p className="mt-2 text-sm" style={{ color: "rgba(13,17,68,0.6)" }}>
              Status changed from{" "}
              <span className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{result.from.replace(/_/g, " ")}</span>
              {" "}to{" "}
              <span className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{result.to.replace(/_/g, " ")}</span>.
            </p>
            <p className="mt-4 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>Returning to stage…</p>
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
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-lg mx-auto">
        <Link
          href={`/projects/${projectId}/stages/${stageId}`}
          className="text-xs font-medium transition hover:opacity-70"
          style={{ color: "rgba(13,17,68,0.5)" }}
        >
          ← Back to stage
        </Link>

        {/* Warning banner */}
        <div
          className="mt-4 rounded-2xl px-4 py-3"
          style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#dc2626" }}>
            Admin override — use with caution
          </p>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.65)" }}>
            This bypasses all workflow validation and pre-condition checks. The change is permanent and
            recorded in the immutable audit trail.
          </p>
        </div>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Force stage status</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>{stageName}</p>
        </div>

        <div className="space-y-5">

          {/* Current status */}
          <div
            className="rounded-[20px] p-5"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(13,17,68,0.45)" }}>
              Current status
            </p>
            <span
              className="rounded-full px-3 py-1 text-sm font-bold capitalize"
              style={{ backgroundColor: currentColor + "18", color: currentColor, border: `1px solid ${currentColor}33` }}
            >
              {currentStatus.replace(/_/g, " ")}
            </span>
          </div>

          {/* Override form */}
          <form onSubmit={handleOverride} className="space-y-4">
            {/* Target status */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(13,17,68,0.45)" }}>
                Force to status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STAGE_STATUSES.filter((s) => s !== currentStatus).map((s) => {
                  const color = STATUS_COLOR[s] ?? "#64748b";
                  const isSelected = targetStatus === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setTargetStatus(s); setConfirmed(false); }}
                      className="rounded-2xl px-3 py-2.5 text-sm font-medium text-left transition hover:opacity-80"
                      style={{
                        border: `1px solid ${isSelected ? color + "44" : "var(--surface-border, #e4e7f0)"}`,
                        backgroundColor: isSelected ? color + "10" : "#f7f8fc",
                        color: isSelected ? color : "rgba(13,17,68,0.5)",
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
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>
                Reason <span style={{ color: "#dc2626" }}>*</span> (required for audit trail)
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain why this override is necessary…"
                value={reason}
                onChange={(e) => { setReason(e.target.value); setConfirmed(false); }}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                style={{
                  border: "1px solid var(--surface-border, #e4e7f0)",
                  backgroundColor: "#fff",
                  color: "var(--brand-navy, #0D1144)",
                }}
              />
            </div>

            {/* Arrow preview */}
            {reason.trim() && (
              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#f7f8fc" }}
              >
                <span className="text-xs font-bold capitalize" style={{ color: currentColor }}>
                  {currentStatus.replace(/_/g, " ")}
                </span>
                <span style={{ color: "rgba(13,17,68,0.35)" }}>→</span>
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
                  border: `1px solid ${confirmed ? "rgba(220,38,38,0.3)" : "var(--surface-border, #e4e7f0)"}`,
                  backgroundColor: confirmed ? "rgba(220,38,38,0.05)" : "#fff",
                }}
              >
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-red-600"
                />
                <p className="text-sm" style={{ color: "rgba(13,17,68,0.75)" }}>
                  I understand this override bypasses all workflow checks and is permanently recorded in the audit trail.
                  I am forcing{" "}
                  <span className="font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{stageName}</span>{" "}
                  to{" "}
                  <span className="font-bold" style={{ color: targetColor }}>{targetStatus.replace(/_/g, " ")}</span>.
                </p>
              </label>
            )}

            {submitError && (
              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
                <p className="text-sm" style={{ color: "#dc2626" }}>{submitError}</p>
              </div>
            )}

            {confirmed && (
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#dc2626" }}
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
