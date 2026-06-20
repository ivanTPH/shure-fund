"use client";

/**
 * Approval workflow page — /projects/[id]/stages/[stageId]/approve
 *
 * Visible to: commercial, consultant, funder, developer, admin roles.
 * Contractor receives a 403 since they cannot approve their own work.
 *
 * Layout:
 *  1. Stage summary (name, value, status)
 *  2. Evidence panel — all uploaded files, viewable/downloadable
 *  3. Current approval records (who has acted, what decision)
 *  4. Action form — certify amount (commercial only) + approve / return
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../components/AppShell";
import { Skeleton } from "../../../../../components/Skeleton";
import FileViewerModal from "../../../../../components/FileViewerModal";
import { useToast } from "../../../../../components/ToastContext";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EvidenceItem = {
  id: string;
  name: string;
  fileType: string;
  fileSize: number | null;
  signedUrl: string | null;
  uploadedAt: string;
  status: string;
  uploadedBy: { id: string; full_name: string; role: string } | null;
};

type ApprovalRecord = {
  id: string;
  role: string;
  decision: string;
  notes: string | null;
  certifiedAmount: number | null;
  createdAt: string;
  approver: { id: string; full_name: string; email: string; role: string } | null;
};

type StageInfo = {
  id: string;
  name: string;
  value: number;
  status: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

function relativeTime(iso: string): string {
  const diffMs = Date.parse(iso) - Date.now();
  const diffMin = Math.round(diffMs / 60_000);
  const diffHr  = Math.round(diffMs / 3_600_000);
  const diffDay = Math.round(diffMs / 86_400_000);
  const fmt = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  if (Math.abs(diffMin) < 60) return fmt.format(diffMin, "minute");
  if (Math.abs(diffHr) < 24)  return fmt.format(diffHr, "hour");
  return fmt.format(diffDay, "day");
}

const DECISION_COLOR: Record<string, string> = {
  approved: "#059669",
  rejected:  "#dc2626",
  returned:  "#ea580c",
  pending:   "#64748b",
};

const ROLE_LABEL: Record<string, string> = {
  commercial:  "Commercial",
  professional: "Professional / Consultant",
  treasury:    "Treasury / Funder",
};

function fileIcon(type: string): string {
  if (type === "application/pdf") return "📄";
  if (type.startsWith("image/"))   return "🖼";
  if (type.includes("spreadsheet") || type.includes("excel")) return "📊";
  return "📎";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ApproveStagePage() {
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [stage, setStage]         = useState<StageInfo | null>(null);
  const [evidence, setEvidence]   = useState<EvidenceItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [userRole, setUserRole]   = useState<AppRole | null>(null);

  // Evidence inline review
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string } | null>(null);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const evidenceNotesRef = useRef<HTMLTextAreaElement | null>(null);

  async function reviewEvidence(evidenceId: string, status: "accepted" | "rejected" | "requires_more") {
    setReviewSubmitting(evidenceId);
    setReviewError(null);
    try {
      const res = await fetch(`/api/evidence/${evidenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: reviewNotes[evidenceId]?.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        setReviewError(d.error ?? "Failed to update evidence.");
        return;
      }
      setEvidence((prev) => prev.map((e) => e.id === evidenceId ? { ...e, status } : e));
      setExpandedEvidenceId(null);
      setReviewNotes((prev) => ({ ...prev, [evidenceId]: "" }));
    } catch {
      setReviewError("Network error.");
    } finally {
      setReviewSubmitting(null);
    }
  }

  // Form state
  const [decision, setDecision]             = useState<"approved" | "returned">("approved");
  const [notes, setNotes]                   = useState("");
  const [certifiedAmount, setCertifiedAmount] = useState("");
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess]   = useState(false);

  // ---- Load data ----
  const loadData = useCallback(async (): Promise<string | null> => {
    try {
      const [stageRes, evidenceRes, approvalsRes] = await Promise.all([
        fetch(`/api/stages/${stageId}`),
        fetch(`/api/evidence?stageId=${stageId}`),
        fetch(`/api/stages/${stageId}/approvals`),
      ]);

      if (stageRes.status === 403) {
        setError("You do not have permission to view this approval screen.");
        return null;
      }
      if (!stageRes.ok) {
        setError("Could not load stage details.");
        return null;
      }

      const stageJson = await stageRes.json();
      const stageData = stageJson.stage ?? stageJson;
      const newStatus = stageData.status ?? stageData.currentStatus ?? "";
      setStage({
        id: stageData.id ?? stageId,
        name: stageData.name ?? stageData.stageName ?? "Stage",
        value: stageData.value ?? 0,
        status: newStatus,
      });

      if (evidenceRes.ok) {
        const ev = await evidenceRes.json();
        setEvidence(ev.evidence ?? []);
      }

      if (approvalsRes.ok) {
        const ap = await approvalsRes.json();
        setApprovals(ap.approvals ?? []);
      }

      return newStatus;
    } catch {
      setError("Network error loading approval data.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) =>
      setUserRole(user ? getRole(user) as AppRole | null : null)
    );
    loadData();
  }, [loadData]);

  // ---- Submit approval decision ----
  async function submitDecision(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = { decision, notes: notes.trim() || undefined };
      if (certifiedAmount.trim()) {
        const parsed = parseFloat(certifiedAmount);
        if (isNaN(parsed) || parsed <= 0) {
          setSubmitError("Certified amount must be a positive number.");
          return;
        }
        body.certifiedAmount = parsed;
      }

      const res = await fetch(`/api/stages/${stageId}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to submit approval.");
        return;
      }

      setSubmitSuccess(true);
      const newStatus = await loadData();
      setNotes("");
      setCertifiedAmount("");
      toast(
        decision === "approved"
          ? newStatus === "available_to_release"
            ? "All sign-offs complete — stage cleared for payment release"
            : "Approval recorded"
          : "Stage returned for revision",
        decision === "approved" ? "success" : "info",
      );
      // Funder who just completed the final approval goes straight to release
      const funderReadyToRelease = userRole === "funder" && newStatus === "available_to_release";
      if (!funderReadyToRelease) {
        setTimeout(() => router.push("/approvals"), 2500);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Render ----
  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto">
          <Skeleton.Stage />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8">
          <Link
            href={`/projects/${projectId}/stages/${stageId}`}
            className="text-xs font-medium transition hover:opacity-70"
            style={{ color: "rgba(13,17,68,0.5)" }}
          >
            ← Back to stage
          </Link>
          <div className="mt-6 rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const isAwaitingApproval = stage?.status === "awaiting_approval";

  const INPUT_STYLE = {
    border: "1px solid var(--surface-border, #e4e7f0)",
    backgroundColor: "#fff",
    color: "var(--brand-navy, #0D1144)",
  } as const;

  return (
    <>
    <AppShell>
    <div className="min-h-full px-4 md:px-8 py-8 space-y-6 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href={`/projects/${projectId}/stages/${stageId}`}
        className="text-xs font-medium transition hover:opacity-70"
        style={{ color: "rgba(13,17,68,0.5)" }}
      >
        ← Back to stage overview
      </Link>

      {/* Stage summary */}
      <div className="rounded-[20px] px-5 py-5" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Stage under review</p>
        <p className="mt-1 text-xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{stage?.name}</p>
        <div className="mt-3 flex items-center gap-4">
          <div>
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Contracted value</p>
            <p className="text-lg font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{formatCurrency(stage?.value ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Status</p>
            <p className="text-sm font-semibold" style={{ color: isAwaitingApproval ? "#7c3aed" : "#64748b" }}>
              {stage?.status?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
          </div>
        </div>
        {!isAwaitingApproval && (
          <p className="mt-3 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(217,119,6,0.07)", color: "#d97706", border: "1px solid rgba(217,119,6,0.2)" }}>
            This stage is not currently awaiting approval — approval actions are disabled.
          </p>
        )}
      </div>

      {/* Evidence files */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
          Evidence submitted
          {evidence.length > 0 && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(13,17,68,0.08)", color: "var(--brand-navy, #0D1144)" }}>
              {evidence.length}
            </span>
          )}
        </h2>
        {reviewError && (
          <p className="mb-2 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
            {reviewError}
          </p>
        )}
        {evidence.length === 0 ? (
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No evidence files have been uploaded for this stage.</p>
        ) : (
          <div className="space-y-2">
            {evidence.map((item) => {
              const sc = item.status === "accepted" ? "#059669"
                : item.status === "rejected" ? "#dc2626"
                : item.status === "requires_more" ? "#d97706"
                : "#64748b";
              const isReviewable = item.status === "pending" || item.status === "requires_more";
              const isExpanded = expandedEvidenceId === item.id;
              const isReviewing = reviewSubmitting === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${isExpanded ? "rgba(13,17,68,0.14)" : "var(--surface-border, #e4e7f0)"}`, backgroundColor: isExpanded ? "rgba(13,17,68,0.03)" : "#fff" }}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left"
                    style={{ cursor: isReviewable ? "pointer" : "default" }}
                    onClick={isReviewable ? () => {
                      setExpandedEvidenceId(isExpanded ? null : item.id);
                      setReviewError(null);
                      setTimeout(() => evidenceNotesRef.current?.focus(), 50);
                    } : undefined}
                  >
                    <span className="shrink-0 text-xl">{fileIcon(item.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{item.name}</p>
                      <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                        {formatBytes(item.fileSize)} · {item.uploadedBy?.full_name ?? "Unknown"} · {relativeTime(item.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ backgroundColor: sc + "18", color: sc, border: `1px solid ${sc}33` }}
                      >
                        {item.status.replace(/_/g, " ")}
                      </span>
                      {isReviewable && (
                        <span className="text-[10px]" style={{ color: "rgba(13,17,68,0.3)" }}>{isExpanded ? "▲" : "▼"}</span>
                      )}
                      {!isReviewable && item.signedUrl && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewerFile({ url: item.signedUrl!, name: item.name }); }}
                          className="rounded-lg px-2 py-1 text-[10px] font-semibold transition hover:opacity-70"
                          style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.5)" }}
                        >
                          View
                        </button>
                      )}
                    </div>
                  </button>

                  {isExpanded && isReviewable && (
                    <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                      {item.signedUrl && (
                        <button
                          type="button"
                          onClick={() => setViewerFile({ url: item.signedUrl!, name: item.name })}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                          style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#f7f8fc", color: "var(--brand-navy, #0D1144)" }}
                        >
                          View file
                        </button>
                      )}
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                          Review notes (required for reject / more info)
                        </label>
                        <textarea
                          ref={expandedEvidenceId === item.id ? evidenceNotesRef : undefined}
                          rows={2}
                          placeholder="Add notes for the contractor…"
                          value={reviewNotes[item.id] ?? ""}
                          onChange={(e) => setReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                          style={INPUT_STYLE}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => reviewEvidence(item.id, "accepted")}
                          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                          style={{ backgroundColor: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.25)", color: "#059669" }}
                        >
                          ✓ Accept
                        </button>
                        <button
                          type="button"
                          disabled={isReviewing || !reviewNotes[item.id]?.trim()}
                          onClick={() => reviewEvidence(item.id, "requires_more")}
                          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                          style={{ backgroundColor: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", color: "#d97706" }}
                        >
                          ↩ More info
                        </button>
                        <button
                          type="button"
                          disabled={isReviewing || !reviewNotes[item.id]?.trim()}
                          onClick={() => reviewEvidence(item.id, "rejected")}
                          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                          style={{ backgroundColor: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}
                        >
                          ✗ Reject
                        </button>
                        {isReviewing && (
                          <span className="flex items-center text-[11px]" style={{ color: "rgba(13,17,68,0.45)" }}>Saving…</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current approval records */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Approval chain</h2>
        {approvals.length === 0 ? (
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No approval records yet for this stage.</p>
        ) : (
          <div className="space-y-2">
            {approvals.map((ap) => {
              const color = DECISION_COLOR[ap.decision] ?? "#64748b";
              return (
                <div
                  key={ap.id}
                  className="rounded-2xl px-4 py-3"
                  style={{ border: `1px solid ${color}33`, backgroundColor: color + "0d" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{ROLE_LABEL[ap.role] ?? ap.role}</p>
                    <span className="text-xs font-bold uppercase" style={{ color }}>{ap.decision}</span>
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{ap.approver?.full_name ?? "Unknown"}</p>
                  {ap.certifiedAmount !== null && (
                    <p className="mt-1 text-xs" style={{ color: "rgba(13,17,68,0.65)" }}>
                      Certified: <span className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{formatCurrency(ap.certifiedAmount)}</span>
                    </p>
                  )}
                  {ap.notes && (
                    <p className="mt-1 text-xs italic" style={{ color: "rgba(13,17,68,0.45)" }}>{ap.notes}</p>
                  )}
                  <p className="mt-1 text-[10px]" style={{ color: "rgba(13,17,68,0.35)" }}>{relativeTime(ap.createdAt)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action form */}
      {isAwaitingApproval && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Your decision</h2>

          {submitSuccess && (() => {
            const readyToRelease = stage?.status === "available_to_release";
            const isFunder = userRole === "funder";
            return (
              <div className="mb-4 rounded-2xl px-5 py-4" style={{ backgroundColor: "rgba(5,150,105,0.07)", border: "1px solid rgba(5,150,105,0.2)" }}>
                <p className="text-base font-bold" style={{ color: "#059669" }}>Decision recorded ✓</p>
                <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.65)" }}>
                  {decision === "approved"
                    ? readyToRelease
                      ? "All sign-offs are complete. The stage is ready for payment release."
                      : "Your approval has been saved. The stage will advance to payment release once all required sign-offs are complete."
                    : "The stage has been returned for revision. The contractor will be notified."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {readyToRelease && isFunder ? (
                    <Link
                      href={`/projects/${projectId}/stages/${stageId}/release`}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                      style={{ backgroundColor: "#059669" }}
                    >
                      Release payment →
                    </Link>
                  ) : (
                    <button
                      onClick={() => router.push("/approvals")}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                      style={{ backgroundColor: "#059669" }}
                    >
                      Back to approvals
                    </button>
                  )}
                  {!(readyToRelease && isFunder) && (
                    <p className="text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>Redirecting in a moment…</p>
                  )}
                </div>
              </div>
            );
          })()}

          {submitError && (
            <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
              <p className="text-sm" style={{ color: "#dc2626" }}>{submitError}</p>
            </div>
          )}

          <form onSubmit={submitDecision} className="rounded-[20px] p-5 space-y-4" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            {/* Decision toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDecision("approved")}
                className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-80"
                style={{
                  backgroundColor: decision === "approved" ? "rgba(5,150,105,0.08)" : "#f7f8fc",
                  border: `1px solid ${decision === "approved" ? "rgba(5,150,105,0.3)" : "var(--surface-border, #e4e7f0)"}`,
                  color: decision === "approved" ? "#059669" : "rgba(13,17,68,0.5)",
                }}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setDecision("returned")}
                className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-80"
                style={{
                  backgroundColor: decision === "returned" ? "rgba(234,88,12,0.07)" : "#f7f8fc",
                  border: `1px solid ${decision === "returned" ? "rgba(234,88,12,0.25)" : "var(--surface-border, #e4e7f0)"}`,
                  color: decision === "returned" ? "#ea580c" : "rgba(13,17,68,0.5)",
                }}
              >
                Return
              </button>
            </div>

            {/* Certified amount */}
            <div>
              <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.5)" }}>
                Certified amount (optional — leave blank to certify full contracted value)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={`${stage?.value ?? 0}`}
                value={certifiedAmount}
                onChange={(e) => setCertifiedAmount(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={INPUT_STYLE}
              />
              {certifiedAmount && parseFloat(certifiedAmount) !== (stage?.value ?? 0) && (
                <p className="mt-1 text-xs" style={{ color: "#d97706" }}>
                  Certified amount differs from contracted value ({formatCurrency(stage?.value ?? 0)})
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.5)" }}>
                Notes{decision === "returned" ? " (required when returning)" : " (optional)"}
              </label>
              <textarea
                rows={3}
                placeholder={decision === "returned" ? "Explain what needs to be addressed before re-submission…" : "Additional context for the audit trail…"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required={decision === "returned"}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                style={INPUT_STYLE}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || (decision === "returned" && !notes.trim())}
              className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: decision === "approved" ? "#059669" : "#ea580c" }}
            >
              {submitting ? "Saving…" : decision === "approved" ? "Confirm approval" : "Return for revision"}
            </button>
          </form>

          <p className="mt-3 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
            Your decision is recorded in the immutable audit trail. Once all required approvals are granted, the stage automatically advances to payment release.
          </p>
        </div>
      )}

      {/* Navigate to release */}
      {stage?.status === "available_to_release" && (
        <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(5,150,105,0.07)", border: "1px solid rgba(5,150,105,0.2)" }}>
          <p className="text-sm font-semibold" style={{ color: "#059669" }}>All approvals granted — stage cleared for payment release.</p>
          <button
            onClick={() => router.push(`/projects/${projectId}/stages/${stageId}/release`)}
            className="mt-3 rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#059669" }}
          >
            Release payment →
          </button>
        </div>
      )}

      {/* Admin override link */}
      {userRole === "admin" && (
        <div className="pt-4" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.35)" }}>Admin tools</p>
          <Link
            href={`/projects/${projectId}/stages/${stageId}/override`}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition hover:opacity-80"
            style={{ border: "1px solid rgba(220,38,38,0.2)", backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626" }}
          >
            Override stage status
          </Link>
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
