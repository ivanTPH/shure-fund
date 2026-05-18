"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../../components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

const STATUS_COLOR: Record<string, string> = {
  raised:       "#fbbf24",
  under_review: "#60a5fa",
  resolved:     "#34d399",
  escalated:    "#f97316",
};

const CAN_RESPOND  = ["commercial", "developer", "admin"];
const CAN_RESOLVE  = ["commercial", "developer", "admin"];
const CAN_ESCALATE = ["developer", "admin"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Dispute = {
  id: string;
  reason: string;
  status: string;
  resolution_notes: string | null;
  evidence_url: string | null;
  created_at: string;
  raiser:      { id: string; full_name: string; role: string } | null;
  respondent:  { id: string; full_name: string; role: string } | null;
  stage: {
    id: string;
    name: string;
    contracts: { project_id: string; projects: { name: string } }[];
  } | null;
};

// ---------------------------------------------------------------------------
// StatusTimeline sub-component
// ---------------------------------------------------------------------------

function StatusTimeline({ current }: { current: string }) {
  const steps = ["raised", "under_review", "resolved"] as const;
  const isEscalated = current === "escalated";

  const stepIndex = (s: string) => steps.indexOf(s as (typeof steps)[number]);
  const currentIdx = isEscalated ? 1 : stepIndex(current);

  const STEP_LABEL: Record<string, string> = {
    raised:       "Raised",
    under_review: "Under review",
    resolved:     "Resolved",
  };

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const done  = idx < currentIdx;
        const active = idx === currentIdx && !isEscalated;
        const color = done || active ? (STATUS_COLOR[step] ?? "#94a3b8") : "#374151";

        return (
          <div key={step} className="flex items-center">
            {/* Connector line (not before first) */}
            {idx > 0 && (
              <div
                className="h-px w-8 shrink-0"
                style={{ backgroundColor: done ? STATUS_COLOR[steps[idx - 1]] ?? "#34d399" : "rgba(255,255,255,0.1)" }}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className="h-3 w-3 rounded-full border-2"
                style={{
                  borderColor: color,
                  backgroundColor: done || active ? color : "transparent",
                }}
              />
              <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: done || active ? color : "#4b5563" }}>
                {STEP_LABEL[step]}
              </span>
            </div>
          </div>
        );
      })}

      {isEscalated && (
        <>
          <div className="h-px w-8 shrink-0" style={{ backgroundColor: STATUS_COLOR.escalated }} />
          <div className="flex flex-col items-center gap-1">
            <div
              className="h-3 w-3 rounded-full border-2"
              style={{ borderColor: STATUS_COLOR.escalated, backgroundColor: STATUS_COLOR.escalated }}
            />
            <span className="text-[10px] font-bold" style={{ color: STATUS_COLOR.escalated }}>
              Escalated
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DisputeDetailPage() {
  const { id: projectId, stageId, disputeId } = useParams<{ id: string; stageId: string; disputeId: string }>();

  const [dispute, setDispute]     = useState<Dispute | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [userRole, setUserRole]   = useState<AppRole | null>(null);
  const [acting, setActing]       = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notes, setNotes]         = useState("");
  const [stageOutcome, setStageOutcome] = useState<"continue" | "return">("continue");

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) =>
      setUserRole(user ? getRole(user) as AppRole | null : null)
    );
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId]);

  async function load() {
    try {
      const r = await fetch(`/api/disputes/${disputeId}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Not found"); return; }
      setDispute(d.dispute);
    } catch {
      setError("Failed to load dispute.");
    } finally {
      setLoading(false);
    }
  }

  async function doAction(action: "respond" | "resolve" | "escalate") {
    setActionError(null);
    setActing(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? "Action failed."); return; }

      // If resolving, also trigger the stage transition
      if (action === "resolve") {
        const transitionAction = stageOutcome === "continue"
          ? "resolve_dispute_continue"
          : "resolve_dispute_reject";
        await fetch(`/api/stages/${stageId}/transition`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ action: transitionAction }),
        });
      }

      await load();
      setNotes("");
    } finally {
      setActing(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / error
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
          <p className="text-sm text-neutral-500">Loading dispute…</p>
        </div>
      </AppShell>
    );
  }

  if (error || !dispute) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
          <Link href={`/projects/${projectId}`} className="text-xs text-neutral-400 hover:text-white">
            ← Back to project
          </Link>
          <div className="mt-6 rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm text-red-300">{error ?? "Dispute not found."}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const statusColor = STATUS_COLOR[dispute.status] ?? "#94a3b8";
  const stage = Array.isArray(dispute.stage) ? dispute.stage[0] : dispute.stage;
  const isTerminal = dispute.status === "resolved" || dispute.status === "escalated";

  const canRespond  = !isTerminal && !!userRole && CAN_RESPOND.includes(userRole)  && dispute.status === "raised";
  const canResolve  = !isTerminal && !!userRole && CAN_RESOLVE.includes(userRole)  && dispute.status === "under_review";
  const canEscalate = !isTerminal && !!userRole && CAN_ESCALATE.includes(userRole) && dispute.status === "under_review";

  const hasActions = canRespond || canResolve || canEscalate;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "#0d1144" }}>
        <Link
          href={`/projects/${projectId}/stages/${stageId}`}
          className="text-xs font-medium text-neutral-400 hover:text-white"
        >
          ← Back to stage
        </Link>

        {/* Header */}
        <div className="mt-4 mb-6 flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">Dispute</h1>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
            style={{ backgroundColor: statusColor + "22", color: statusColor, border: `1px solid ${statusColor}44` }}
          >
            {dispute.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="max-w-2xl space-y-5">

          {/* Status timeline */}
          <div
            className="rounded-[20px] px-5 py-4"
            style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Timeline</p>
            <StatusTimeline current={dispute.status} />
          </div>

          {/* Dispute detail */}
          <div
            className="rounded-[20px] p-5 space-y-4"
            style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Reason</p>
              <p className="mt-1 text-sm text-white leading-relaxed">{dispute.reason}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500">Raised by</p>
                <p className="mt-1 text-sm text-white">{dispute.raiser?.full_name ?? "—"}</p>
                {dispute.raiser?.role && (
                  <p className="text-[10px] text-neutral-500 capitalize">{dispute.raiser.role}</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500">Stage</p>
                <p className="mt-1 text-sm text-white">{stage?.name ?? "—"}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Raised</p>
              <p className="mt-1 text-sm text-white">{fmt.format(new Date(dispute.created_at))}</p>
            </div>

            {dispute.respondent && (
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500">Respondent</p>
                <p className="mt-1 text-sm text-white">{dispute.respondent.full_name}</p>
                {dispute.respondent.role && (
                  <p className="text-[10px] text-neutral-500 capitalize">{dispute.respondent.role}</p>
                )}
              </div>
            )}

            {dispute.evidence_url && (
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500">Evidence</p>
                <a
                  href={dispute.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  View evidence →
                </a>
              </div>
            )}

            {dispute.resolution_notes && (
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500">Resolution notes</p>
                <p className="mt-1 text-sm text-white leading-relaxed">{dispute.resolution_notes}</p>
              </div>
            )}
          </div>

          {/* Terminal state banners */}
          {dispute.status === "resolved" && (
            <div
              className="rounded-2xl px-4 py-4"
              style={{ backgroundColor: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-green-400">Dispute resolved</p>
              <p className="mt-1 text-sm text-neutral-300">
                This dispute has been closed. The stage has continued through the workflow.
              </p>
            </div>
          )}

          {dispute.status === "escalated" && (
            <div
              className="rounded-2xl px-4 py-4"
              style={{ backgroundColor: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Escalated</p>
              <p className="mt-1 text-sm text-neutral-300">
                This dispute has been escalated for senior review. No further actions are available here.
              </p>
            </div>
          )}

          {/* Actions */}
          {hasActions && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Actions</p>

              {/* Stage outcome picker (only when resolving) */}
              {canResolve && (
                <div>
                  <p className="mb-2 text-xs text-neutral-400">What happens to the stage after resolution?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["continue", "return"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setStageOutcome(opt)}
                        className="rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
                        style={{
                          border: `1px solid ${stageOutcome === opt ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.1)"}`,
                          backgroundColor: stageOutcome === opt ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
                        }}
                      >
                        {opt === "continue" ? "Continue to approval" : "Return for rework"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
                rows={3}
                placeholder="Add notes or resolution details… (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                {canRespond && (
                  <button
                    onClick={() => doAction("respond")}
                    disabled={acting}
                    className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                    style={{ backgroundColor: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)" }}
                  >
                    {acting ? "Processing…" : "Begin review"}
                  </button>
                )}
                {canResolve && (
                  <button
                    onClick={() => doAction("resolve")}
                    disabled={acting}
                    className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                    style={{ backgroundColor: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)" }}
                  >
                    {acting ? "Processing…" : "Mark resolved"}
                  </button>
                )}
                {canEscalate && (
                  <button
                    onClick={() => doAction("escalate")}
                    disabled={acting}
                    className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                    style={{ backgroundColor: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}
                  >
                    {acting ? "Processing…" : "Escalate"}
                  </button>
                )}
              </div>
            </div>
          )}

          {actionError && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-red-400">Action failed</p>
              <p className="mt-1 text-sm text-red-300">{actionError}</p>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
