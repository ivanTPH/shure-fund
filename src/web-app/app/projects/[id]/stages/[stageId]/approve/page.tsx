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

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../components/AppShell";
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
  approved: "#34d399",
  rejected:  "#f87171",
  returned:  "#fbbf24",
  pending:   "#94a3b8",
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

  const [stage, setStage]         = useState<StageInfo | null>(null);
  const [evidence, setEvidence]   = useState<EvidenceItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [userRole, setUserRole]   = useState<AppRole | null>(null);

  // Form state
  const [decision, setDecision]             = useState<"approved" | "returned">("approved");
  const [notes, setNotes]                   = useState("");
  const [certifiedAmount, setCertifiedAmount] = useState("");
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess]   = useState(false);

  // ---- Load data ----
  const loadData = useCallback(async () => {
    try {
      const [stageRes, evidenceRes, approvalsRes] = await Promise.all([
        fetch(`/api/stages/${stageId}`),
        fetch(`/api/evidence?stageId=${stageId}`),
        fetch(`/api/stages/${stageId}/approvals`),
      ]);

      if (stageRes.status === 403) {
        setError("You do not have permission to view this approval screen.");
        return;
      }
      if (!stageRes.ok) {
        setError("Could not load stage details.");
        return;
      }

      const stageJson = await stageRes.json();
      const stageData = stageJson.stage ?? stageJson;
      setStage({
        id: stageData.id ?? stageId,
        name: stageData.name ?? stageData.stageName ?? "Stage",
        value: stageData.value ?? 0,
        status: stageData.status ?? stageData.currentStatus ?? "",
      });

      if (evidenceRes.ok) {
        const ev = await evidenceRes.json();
        setEvidence(ev.evidence ?? []);
      }

      if (approvalsRes.ok) {
        const ap = await approvalsRes.json();
        setApprovals(ap.approvals ?? []);
      }
    } catch {
      setError("Network error loading approval data.");
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
      await loadData();
      setNotes("");
      setCertifiedAmount("");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Render ----
  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
          <p className="text-sm text-neutral-500">Loading approval screen…</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
          <Link href={`/projects/${projectId}/stages/${stageId}`} className="text-xs text-neutral-400 hover:text-white">
            ← Back to stage
          </Link>
          <div className="mt-6 rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const isAwaitingApproval = stage?.status === "awaiting_approval";

  return (
    <AppShell>
    <div className="min-h-screen px-4 md:px-8 py-8 space-y-6 max-w-2xl mx-auto" style={{ backgroundColor: "#0d1144" }}>
      {/* Back link */}
      <Link href={`/projects/${projectId}/stages/${stageId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
        ← Back to stage overview
      </Link>

      {/* Stage summary */}
      <div className="rounded-[20px] px-5 py-5" style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Stage under review</p>
        <p className="mt-1 text-xl font-bold text-white">{stage?.name}</p>
        <div className="mt-3 flex items-center gap-4">
          <div>
            <p className="text-xs text-neutral-500">Contracted value</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(stage?.value ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Status</p>
            <p className="text-sm font-semibold" style={{ color: isAwaitingApproval ? "#60a5fa" : "#94a3b8" }}>
              {stage?.status?.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        {!isAwaitingApproval && (
          <p className="mt-3 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
            This stage is not currently awaiting approval — approval actions are disabled.
          </p>
        )}
      </div>

      {/* Evidence files */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Evidence submitted</h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-neutral-500">No evidence files have been uploaded for this stage.</p>
        ) : (
          <div className="space-y-2">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-2xl px-4 py-3"
                style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <span className="text-xl">{fileIcon(item.fileType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                  <p className="text-xs text-neutral-500">
                    {formatBytes(item.fileSize)} · {item.uploadedBy?.full_name ?? "Unknown"} · {relativeTime(item.uploadedAt)}
                  </p>
                  <span
                    className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{
                      backgroundColor: (item.status === "accepted" ? "#34d399" : item.status === "rejected" ? "#f87171" : "#94a3b8") + "22",
                      color: item.status === "accepted" ? "#34d399" : item.status === "rejected" ? "#f87171" : "#94a3b8",
                    }}
                  >
                    {item.status}
                  </span>
                </div>
                {item.signedUrl && (
                  <a
                    href={item.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                    style={{ border: "1px solid rgba(255,255,255,0.15)" }}
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current approval records */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Approval chain</h2>
        {approvals.length === 0 ? (
          <p className="text-sm text-neutral-500">No approval records yet for this stage.</p>
        ) : (
          <div className="space-y-2">
            {approvals.map((ap) => {
              const color = DECISION_COLOR[ap.decision] ?? "#94a3b8";
              return (
                <div
                  key={ap.id}
                  className="rounded-2xl px-4 py-3"
                  style={{ border: `1px solid ${color}33`, backgroundColor: color + "0d" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{ROLE_LABEL[ap.role] ?? ap.role}</p>
                    <span className="text-xs font-bold uppercase" style={{ color }}>{ap.decision}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-400">{ap.approver?.full_name ?? "Unknown"}</p>
                  {ap.certifiedAmount !== null && (
                    <p className="mt-1 text-xs text-neutral-300">
                      Certified: <span className="font-semibold text-white">{formatCurrency(ap.certifiedAmount)}</span>
                    </p>
                  )}
                  {ap.notes && (
                    <p className="mt-1 text-xs italic text-neutral-400">{ap.notes}</p>
                  )}
                  <p className="mt-1 text-[10px] text-neutral-600">{relativeTime(ap.createdAt)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action form */}
      {isAwaitingApproval && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Your decision</h2>

          {submitSuccess && (
            <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <p className="text-sm font-semibold text-green-300">Decision recorded.</p>
              <p className="text-xs text-neutral-400 mt-0.5">Your approval has been saved. The stage will advance to payment release once all required approvals are granted.</p>
            </div>
          )}

          {submitError && (
            <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-xs font-semibold uppercase text-red-400">Error</p>
              <p className="text-sm text-red-300 mt-0.5">{submitError}</p>
            </div>
          )}

          <form onSubmit={submitDecision} className="rounded-[20px] p-5 space-y-4" style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }}>
            {/* Decision toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDecision("approved")}
                className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
                style={{
                  backgroundColor: decision === "approved" ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${decision === "approved" ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
                  color: decision === "approved" ? "#34d399" : "#94a3b8",
                }}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setDecision("returned")}
                className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
                style={{
                  backgroundColor: decision === "returned" ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${decision === "returned" ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.1)"}`,
                  color: decision === "returned" ? "#fbbf24" : "#94a3b8",
                }}
              >
                Return
              </button>
            </div>

            {/* Certified amount — visible to all, optional except commercial convention */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                Certified amount (optional — leave blank to certify full contracted value)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={`${stage?.value ?? 0}`}
                value={certifiedAmount}
                onChange={(e) => setCertifiedAmount(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none"
              />
              {certifiedAmount && parseFloat(certifiedAmount) !== (stage?.value ?? 0) && (
                <p className="mt-1 text-xs text-amber-400">
                  Certified amount differs from contracted value ({formatCurrency(stage?.value ?? 0)})
                </p>
              )}
            </div>

            {/* Notes — required when returning */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                Notes{decision === "returned" ? " (required when returning)" : " (optional)"}
              </label>
              <textarea
                rows={3}
                placeholder={decision === "returned" ? "Explain what needs to be addressed before re-submission…" : "Additional context for the audit trail…"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required={decision === "returned"}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || (decision === "returned" && !notes.trim())}
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{
                backgroundColor: decision === "approved" ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.2)",
                border: `1px solid ${decision === "approved" ? "rgba(52,211,153,0.3)" : "rgba(251,191,36,0.3)"}`,
              }}
            >
              {submitting ? "Saving…" : decision === "approved" ? "Confirm approval" : "Return for revision"}
            </button>
          </form>

          <p className="mt-3 text-xs text-neutral-600">
            Your decision is recorded in the immutable audit trail. Once all required approvals are granted, the stage automatically advances to payment release.
          </p>
        </div>
      )}

      {/* Navigate to release */}
      {stage?.status === "available_to_release" && (
        <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
          <p className="text-sm font-semibold text-green-300">All approvals granted — stage cleared for payment release.</p>
          <button
            onClick={() => router.push(`/projects/${projectId}/stages/${stageId}/release`)}
            className="mt-3 rounded-2xl px-4 py-2 text-sm font-semibold text-white transition"
            style={{ backgroundColor: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.3)" }}
          >
            Release payment →
          </button>
        </div>
      )}

      {/* Admin override link */}
      {userRole === "admin" && (
        <div className="border-t border-white/5 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-600">Admin tools</p>
          <Link
            href={`/projects/${projectId}/stages/${stageId}/override`}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:text-red-300"
            style={{ border: "1px solid rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.05)" }}
          >
            ⚡ Force stage status override
          </Link>
        </div>
      )}

    </div>
    </AppShell>
  );
}
