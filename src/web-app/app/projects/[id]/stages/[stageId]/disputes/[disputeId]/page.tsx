"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../../components/AppShell";
import FileViewerModal from "../../../../../../components/FileViewerModal";
import { useToast } from "../../../../../../components/ToastContext";
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
  raised:       "#d97706",
  under_review: "#2563eb",
  resolved:     "#059669",
  escalated:    "#ea580c",
};

const CAN_RESPOND  = ["funder", "commercial", "developer", "admin"];
const CAN_RESOLVE  = ["funder", "developer", "admin"];
const CAN_ESCALATE = ["developer", "admin"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EvidenceItem = {
  id: string;
  name: string | null;
  file_url: string;
  file_type: string;
  status: string;
  notes: string | null;
  uploaded_at: string;
  signedUrl: string | null;
  uploader: { id: string; full_name: string; role: string } | null;
};

type Dispute = {
  id: string;
  reason: string;
  status: string;
  disputed_value: number;
  resolution_notes: string | null;
  evidence_url: string | null;
  created_at: string;
  raiser:      { id: string; full_name: string; role: string } | null;
  respondent:  { id: string; full_name: string; role: string } | null;
  stage: {
    id: string;
    name: string;
    contracts: { project_id: string; projects: { name: string } }[];
    evidence: EvidenceItem[];
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
        const color = done || active ? (STATUS_COLOR[step] ?? "#64748b") : "rgba(13,17,68,0.15)";

        return (
          <div key={step} className="flex items-center">
            {/* Connector line (not before first) */}
            {idx > 0 && (
              <div
                className="h-px w-8 shrink-0"
                style={{ backgroundColor: done ? STATUS_COLOR[steps[idx - 1]] ?? "#059669" : "rgba(13,17,68,0.12)" }}
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
              <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: done || active ? color : "rgba(13,17,68,0.3)" }}>
                {STEP_LABEL[step]}
              </span>
            </div>
          </div>
        );
      })}

      {isEscalated && (
        <>
          <div className="h-px w-8 shrink-0" style={{ backgroundColor: "#ea580c" }} />
          <div className="flex flex-col items-center gap-1">
            <div
              className="h-3 w-3 rounded-full border-2"
              style={{ borderColor: "#ea580c", backgroundColor: "#ea580c" }}
            />
            <span className="text-[10px] font-bold" style={{ color: "#ea580c" }}>
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
  const { toast } = useToast();
  const router = useRouter();

  const [dispute, setDispute]     = useState<Dispute | null>(null);
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string } | null>(null);
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
        const tRes = await fetch(`/api/stages/${stageId}/transition`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ action: transitionAction }),
        });
        if (!tRes.ok) {
          const tData = await tRes.json();
          setActionError(tData.error ?? "Dispute resolved but stage transition failed. Contact admin.");
          // Reload dispute state
          await load();
          return;
        }
        toast("Dispute resolved", "success");
        // Dispute resolved — return to stage overview
        router.push(`/projects/${projectId}/stages/${stageId}`);
        return;
      }

      if (action === "escalate") {
        toast("Dispute escalated", "info");
        // Escalated — no further actions here; return to stage
        router.push(`/projects/${projectId}/stages/${stageId}`);
        return;
      }

      // "respond" — stay on page, reload updated dispute state
      toast("Response saved", "success");
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
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.4)" }}>Loading dispute…</p>
        </div>
      </AppShell>
    );
  }

  if (error || !dispute) {
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
            <p className="text-sm" style={{ color: "#dc2626" }}>{error ?? "Dispute not found."}</p>
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
  const stageEvidence: EvidenceItem[] = Array.isArray(stage?.evidence) ? stage.evidence : [];
  const isTerminal = dispute.status === "resolved" || dispute.status === "escalated";

  const canRespond  = !isTerminal && !!userRole && CAN_RESPOND.includes(userRole)  && dispute.status === "raised";
  const canResolve  = !isTerminal && !!userRole && CAN_RESOLVE.includes(userRole)  && dispute.status === "under_review";
  const canEscalate = !isTerminal && !!userRole && CAN_ESCALATE.includes(userRole) && dispute.status === "under_review";

  const hasActions = canRespond || canResolve || canEscalate;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const EVIDENCE_STATUS_COLOR: Record<string, string> = {
    accepted:      "#059669",
    rejected:      "#dc2626",
    requires_more: "#d97706",
    pending:       "#64748b",
  };

  return (
    <>
    <AppShell>
      <div className="min-h-full px-4 md:px-8 py-8 max-w-2xl mx-auto space-y-5">
        <Link
          href={`/projects/${projectId}/stages/${stageId}`}
          className="text-xs font-medium transition hover:opacity-70"
          style={{ color: "rgba(13,17,68,0.5)" }}
        >
          ← Back to stage
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Dispute</h1>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
            style={{ backgroundColor: statusColor + "18", color: statusColor, border: `1px solid ${statusColor}33` }}
          >
            {dispute.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Status timeline */}
        <div
          className="rounded-[20px] px-5 py-4"
          style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
            Timeline
          </p>
          <StatusTimeline current={dispute.status} />
        </div>

        {/* Dispute detail */}
        <div
          className="rounded-[20px] p-5 space-y-4"
          style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Reason</p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--brand-navy, #0D1144)" }}>{dispute.reason}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Raised by</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{dispute.raiser?.full_name ?? "—"}</p>
              {dispute.raiser?.role && (
                <p className="text-[10px] capitalize" style={{ color: "rgba(13,17,68,0.45)" }}>{dispute.raiser.role}</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Stage</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{stage?.name ?? "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Raised</p>
              <p className="mt-1 text-sm" style={{ color: "var(--brand-navy, #0D1144)" }}>{fmt.format(new Date(dispute.created_at))}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Disputed value</p>
              <p className="mt-1 text-sm font-bold" style={{ color: "#dc2626" }}>
                {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(dispute.disputed_value))}
              </p>
            </div>
          </div>

          {dispute.respondent && (
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Respondent</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{dispute.respondent.full_name}</p>
              {dispute.respondent.role && (
                <p className="text-[10px] capitalize" style={{ color: "rgba(13,17,68,0.45)" }}>{dispute.respondent.role}</p>
              )}
            </div>
          )}

          {dispute.evidence_url && (
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Evidence</p>
              <button
                onClick={() => setViewerFile({ url: dispute.evidence_url!, name: "Dispute evidence" })}
                className="mt-1 inline-block text-sm font-semibold transition hover:opacity-70"
                style={{ color: "#2563eb" }}
              >
                View evidence
              </button>
            </div>
          )}

          {dispute.resolution_notes && (
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Resolution notes</p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--brand-navy, #0D1144)" }}>{dispute.resolution_notes}</p>
            </div>
          )}
        </div>

        {/* Stage evidence */}
        {stageEvidence.length > 0 && (
          <div
            className="rounded-[20px] p-5 space-y-3"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Stage evidence ({stageEvidence.length} file{stageEvidence.length !== 1 ? "s" : ""})
            </p>
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
              Review all submitted files before making a decision on this dispute.
            </p>
            <div className="space-y-2">
              {stageEvidence.map((ev) => {
                const evColor = EVIDENCE_STATUS_COLOR[ev.status] ?? "#64748b";
                const label = ev.name || ev.file_url.split("/").pop() || "File";

                return (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-3 rounded-xl px-4 py-3"
                    style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#f7f8fc" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>{label}</span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{ backgroundColor: evColor + "18", color: evColor, border: `1px solid ${evColor}33` }}
                        >
                          {ev.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      {ev.uploader && (
                        <p className="mt-0.5 text-[11px]" style={{ color: "rgba(13,17,68,0.45)" }}>
                          Uploaded by {ev.uploader.full_name} · {fmt.format(new Date(ev.uploaded_at))}
                        </p>
                      )}
                      {ev.notes && (
                        <p className="mt-1 text-xs italic" style={{ color: "rgba(13,17,68,0.5)" }}>&ldquo;{ev.notes}&rdquo;</p>
                      )}
                    </div>
                    {ev.signedUrl && (
                      <button
                        type="button"
                        onClick={() => setViewerFile({ url: ev.signedUrl!, name: label })}
                        className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-70"
                        style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.5)", backgroundColor: "#fff" }}
                      >
                        View
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Terminal state banners */}
        {dispute.status === "resolved" && (
          <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(5,150,105,0.07)", border: "1px solid rgba(5,150,105,0.2)" }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#059669" }}>Dispute resolved</p>
            <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.65)" }}>
              This dispute has been closed. The stage has continued through the workflow.
            </p>
          </div>
        )}

        {dispute.status === "escalated" && (
          <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(234,88,12,0.07)", border: "1px solid rgba(234,88,12,0.2)" }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#ea580c" }}>Escalated</p>
            <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.65)" }}>
              This dispute has been escalated for senior review. No further actions are available here.
            </p>
          </div>
        )}

        {/* Actions */}
        {hasActions && (
          <div
            className="rounded-[20px] p-5 space-y-4"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Actions</p>

            {/* Stage outcome picker (only when resolving) */}
            {canResolve && (
              <div>
                <p className="mb-2 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>What happens to the stage after resolution?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["continue", "return"] as const).map((opt) => {
                    const selected = stageOutcome === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setStageOutcome(opt)}
                        className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-80"
                        style={{
                          border: `1px solid ${selected ? "rgba(37,99,235,0.3)" : "var(--surface-border, #e4e7f0)"}`,
                          backgroundColor: selected ? "rgba(37,99,235,0.07)" : "#f7f8fc",
                          color: selected ? "#2563eb" : "rgba(13,17,68,0.5)",
                        }}
                      >
                        {opt === "continue" ? "Continue to approval" : "Return for rework"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <textarea
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
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
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.2)", color: "#2563eb" }}
                >
                  {acting ? "Processing…" : "Begin review"}
                </button>
              )}
              {canResolve && (
                <button
                  onClick={() => doAction("resolve")}
                  disabled={acting}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: "rgba(5,150,105,0.07)", border: "1px solid rgba(5,150,105,0.2)", color: "#059669" }}
                >
                  {acting ? "Processing…" : "Mark resolved"}
                </button>
              )}
              {canEscalate && (
                <button
                  onClick={() => doAction("escalate")}
                  disabled={acting}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: "rgba(234,88,12,0.07)", border: "1px solid rgba(234,88,12,0.2)", color: "#ea580c" }}
                >
                  {acting ? "Processing…" : "Escalate"}
                </button>
              )}
            </div>
          </div>
        )}

        {actionError && (
          <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{actionError}</p>
          </div>
        )}

      </div>
    </AppShell>

    {viewerFile && (
      <FileViewerModal
        url={viewerFile.url}
        name={viewerFile.name}
        onClose={() => setViewerFile(null)}
      />
    )}
    </>
  );
}
