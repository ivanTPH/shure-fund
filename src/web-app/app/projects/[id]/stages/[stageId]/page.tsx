"use client";

/**
 * Stage overview — /projects/[id]/stages/[stageId]
 *
 * Hub page for a single contract stage. Shows all key information in one view:
 *   • Stage header: name, description, status, value, dates
 *   • Evidence summary (count by status + list)
 *   • Approval chain (all required sign-offs)
 *   • Variations (requested, pending, approved)
 *   • Disputes (active and resolved)
 *   • Role-appropriate action buttons
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../components/AppShell";
import FileViewerModal from "../../../../components/FileViewerModal";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StageDetail = {
  id: string;
  name: string;
  description: string | null;
  value: number;
  status: string;
  sequenceOrder: number | null;
  startDate: string | null;
  endDate: string | null;
  contractId: string;
  projectId: string;
  projectName: string;
};

type Evidence = {
  id: string;
  name: string;
  fileType: string;
  fileSize: number | null;
  uploadedAt: string;
  status: string;
  signedUrl: string | null;
  uploadedBy: { full_name: string } | null;
};

type Approval = {
  id: string;
  role: string;
  decision: string;
  notes: string | null;
  certifiedAmount: number | null;
  createdAt: string;
  approver: { full_name: string } | null;
};

type Variation = {
  id: string;
  description: string;
  valueChange: number;
  status: string;
  createdAt: string;
  requester: { full_name: string } | null;
};

type Dispute = {
  id: string;
  reason: string;
  status: string;
  disputedValue: number;
  createdAt: string;
  raiser: { full_name: string } | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  draft:                { bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.2)", text: "#94a3b8", label: "Draft" },
  in_progress:          { bg: "rgba(96,165,250,0.1)",   border: "rgba(96,165,250,0.25)", text: "#60a5fa", label: "In progress" },
  awaiting_approval:    { bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.25)", text: "#fbbf24", label: "Awaiting approval" },
  returned:             { bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.25)", text: "#fbbf24", label: "Returned" },
  disputed:             { bg: "rgba(249,115,22,0.1)",   border: "rgba(249,115,22,0.25)", text: "#f97316", label: "Disputed" },
  available_to_release: { bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.25)", text: "#34d399", label: "Ready to release" },
  released:             { bg: "rgba(168,85,247,0.1)",   border: "rgba(168,85,247,0.25)", text: "#a855f7", label: "Released" },
  funding_gap:          { bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.2)",   text: "#f87171", label: "Funding gap" },
};

const DECISION_STYLE: Record<string, { color: string; label: string }> = {
  approved: { color: "#34d399", label: "Approved" },
  rejected: { color: "#f87171", label: "Rejected" },
  returned: { color: "#fbbf24", label: "Returned" },
  pending:  { color: "#94a3b8", label: "Pending" },
};

const APPROVAL_ROLE_LABEL: Record<string, string> = {
  commercial:   "Commercial sign-off",
  professional: "Consultant / Professional",
  treasury:     "Funder / Treasury",
};

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function relativeTime(iso: string) {
  const diffMs = Date.parse(iso) - Date.now();
  const diffDay = Math.round(diffMs / 86_400_000);
  const diffHr = Math.round(diffMs / 3_600_000);
  const fmt = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  if (Math.abs(diffHr) < 24) return fmt.format(diffHr, "hour");
  return fmt.format(diffDay, "day");
}

// ---------------------------------------------------------------------------
// Accordion section — collapsible, defaults open
// ---------------------------------------------------------------------------

function Section({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        className="mb-3 flex w-full items-center gap-2 text-left group"
        onClick={() => setOpen((o) => !o)}
      >
        <h2 className="text-xs font-semibold uppercase tracking-widest transition-colors" style={{ color: "rgba(13,17,68,0.45)" }}>
          {title}
        </h2>
        {badge !== undefined && badge > 0 && (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(13,17,68,0.08)", color: "var(--brand-navy, #0D1144)" }}>
            {badge}
          </span>
        )}
        <span className="ml-auto text-[10px] select-none" style={{ color: "rgba(13,17,68,0.3)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StageOverviewPage() {
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();

  const [stage, setStage]         = useState<StageDetail | null>(null);
  const [evidence, setEvidence]   = useState<Evidence[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [disputes, setDisputes]   = useState<Dispute[]>([]);
  const [userRole, setUserRole]   = useState<AppRole | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Evidence inline review
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  // File viewer modal — must be declared before any early returns
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [stageRes, evidenceRes, approvalsRes, variationsRes, disputesRes] = await Promise.all([
        fetch(`/api/stages/${stageId}`),
        fetch(`/api/evidence?stageId=${stageId}`),
        fetch(`/api/stages/${stageId}/approvals`),
        fetch(`/api/variations?stageId=${stageId}`),
        fetch(`/api/disputes?stageId=${stageId}`),
      ]);

      if (stageRes.status === 401) { setError("Sign in to view this stage."); return; }
      if (!stageRes.ok) { setError("Stage not found."); return; }

      const { stage: s } = await stageRes.json();
      const contract = Array.isArray(s.contracts) ? s.contracts[0] : s.contracts;
      const project  = Array.isArray(contract?.projects) ? contract.projects[0] : contract?.projects;

      setStage({
        id:            s.id,
        name:          s.name,
        description:   s.description ?? null,
        value:         Number(s.value),
        status:        s.status,
        sequenceOrder: null,
        startDate:     s.start_date ?? null,
        endDate:       s.end_date ?? null,
        contractId:    contract?.id ?? "",
        projectId:     project?.id ?? projectId,
        projectName:   project?.name ?? "Project",
      });

      if (evidenceRes.ok) {
        const { evidence: ev } = await evidenceRes.json();
        setEvidence(ev ?? []);
      }
      if (approvalsRes.ok) {
        const { approvals: ap } = await approvalsRes.json();
        setApprovals(ap ?? []);
      }
      if (variationsRes.ok) {
        const { variations: va } = await variationsRes.json();
        setVariations((va ?? []).map((v: {
          id: string; description: string; value_change: number;
          status: string; created_at: string;
          requester: { full_name: string } | null;
        }) => ({
          id: v.id,
          description: v.description,
          valueChange: Number(v.value_change),
          status: v.status,
          createdAt: v.created_at,
          requester: Array.isArray(v.requester) ? v.requester[0] : v.requester,
        })));
      }
      if (disputesRes.ok) {
        const { disputes: di } = await disputesRes.json();
        setDisputes((di ?? []).map((d: {
          id: string; reason: string; status: string; disputed_value: number;
          created_at: string; raiser: { full_name: string } | null;
        }) => ({
          id: d.id,
          reason: d.reason,
          status: d.status,
          disputedValue: Number(d.disputed_value),
          createdAt: d.created_at,
          raiser: Array.isArray(d.raiser) ? d.raiser[0] : d.raiser,
        })));
      }
    } catch {
      setError("Network error loading stage.");
    } finally {
      setLoading(false);
    }
  }, [stageId, projectId]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) =>
      setUserRole(user ? (getRole(user) as AppRole | null) : null)
    );
    load();
  }, [load]);

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

  // ---------------------------------------------------------------------------
  // Loading / error
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.4)" }}>Loading stage…</p>
        </div>
      </AppShell>
    );
  }

  if (error || !stage) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8">
          <Link href={`/projects/${projectId}`} className="text-xs font-medium transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>
            ← Back to project
          </Link>
          <div className="mt-6 rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{error ?? "Stage not found."}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const statusStyle = STATUS_COLORS[stage.status] ?? STATUS_COLORS.draft;

  const evidenceCounts = {
    accepted:      evidence.filter((e) => e.status === "accepted").length,
    pending:       evidence.filter((e) => e.status === "pending").length,
    requires_more: evidence.filter((e) => e.status === "requires_more").length,
    rejected:      evidence.filter((e) => e.status === "rejected").length,
  };

  const pendingApprovals = approvals.filter((a) => a.decision === "pending").length;
  const allApproved = approvals.length > 0 && approvals.every((a) => a.decision === "approved");
  const activeDisputes = disputes.filter((d) => d.status === "raised" || d.status === "open").length;

  const variationImpact = variations
    .filter((v) => v.status === "approved" || v.status === "active")
    .reduce((sum, v) => sum + v.valueChange, 0);

  // Role-based action availability
  const isContractor    = userRole === "contractor";
  const isApprover      = ["commercial", "consultant", "funder", "developer", "admin"].includes(userRole ?? "");
  const canRelease      = (userRole === "funder" || userRole === "admin") && stage.status === "available_to_release";
  const canVariation    = ["contractor", "developer", "admin"].includes(userRole ?? "");
  const isAdmin         = userRole === "admin";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-6 max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
          <Link href="/projects" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>Projects</Link>
          <span>/</span>
          <Link href={`/projects/${projectId}`} className="hover:opacity-100 transition-opacity" style={{ opacity: 0.7 }}>{stage.projectName}</Link>
          <span>/</span>
          <span style={{ color: "var(--brand-navy, #0D1144)", fontWeight: 500 }}>{stage.name}</span>
        </div>

        {/* ── Stage header ─────────────────────────────────────────────────── */}
        <div
          className="rounded-[24px] p-5"
          style={{ border: `1px solid ${statusStyle.border}`, backgroundColor: "#fff", borderLeft: `4px solid ${statusStyle.text}` }}
        >
          {/* Status + sequence */}
          <div className="mb-3 flex items-center gap-2">
            {stage.sequenceOrder !== null && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Stage {stage.sequenceOrder}
              </span>
            )}
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}
            >
              {statusStyle.label}
            </span>
          </div>

          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{stage.name}</h1>
          {stage.description && (
            <p className="mt-1.5 text-sm" style={{ color: "rgba(13,17,68,0.6)" }}>{stage.description}</p>
          )}

          {/* Value + dates */}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Contracted value</p>
              <p className="mt-0.5 text-lg font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(stage.value)}</p>
              {variationImpact !== 0 && (
                <p className="text-[11px]" style={{ color: variationImpact > 0 ? "#34d399" : "#f87171" }}>
                  {variationImpact > 0 ? "+" : ""}{gbp.format(variationImpact)} variations
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Start</p>
              <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{formatDate(stage.startDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>End</p>
              <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{formatDate(stage.endDate)}</p>
              {stage.endDate && new Date(stage.endDate) < new Date() && stage.status !== "released" && (
                <p className="text-[10px] text-red-400">Overdue</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Action buttons — context-aware per status + role ─────────────── */}
        <div className="flex flex-wrap gap-2">

          {/* DISPUTED: primary = view/resolve dispute */}
          {stage.status === "disputed" && disputes.length > 0 && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/disputes/${disputes[0].id}`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white transition"
              style={{ backgroundColor: "rgba(249,115,22,0.18)", border: "1px solid rgba(249,115,22,0.4)", color: "#f97316" }}
            >
              ⚠ View dispute
            </Link>
          )}

          {/* DISPUTED + all approvals done + funder/admin: offer release override */}
          {stage.status === "disputed" && allApproved && (canRelease || isAdmin) && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/release`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white transition"
              style={{ backgroundColor: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.4)" }}
            >
              Release payment →
            </Link>
          )}

          {/* AVAILABLE_TO_RELEASE: primary release button */}
          {canRelease && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/release`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white transition"
              style={{ backgroundColor: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.4)" }}
            >
              Release payment →
            </Link>
          )}

          {/* AWAITING_APPROVAL: review & approve (not shown when disputed) */}
          {isApprover && stage.status !== "disputed" && stage.status !== "released" && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/approve`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
              style={{
                backgroundColor: pendingApprovals > 0 ? "rgba(217,119,6,0.1)" : "rgba(13,17,68,0.05)",
                border: `1px solid ${pendingApprovals > 0 ? "rgba(217,119,6,0.35)" : "var(--surface-border, #e4e7f0)"}`,
                color: pendingApprovals > 0 ? "#d97706" : "var(--brand-navy, #0D1144)",
              }}
            >
              {pendingApprovals > 0 ? `Review & approve (${pendingApprovals} pending)` : "View approvals"}
            </Link>
          )}

          {/* Contractor: upload evidence (only when in progress / returned) */}
          {isContractor && (stage.status === "in_progress" || stage.status === "returned" || stage.status === "draft") && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/action`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition"
              style={{ backgroundColor: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)" }}
            >
              Upload evidence
            </Link>
          )}

          {/* Variation request — not when released */}
          {canVariation && stage.status !== "released" && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/variations/new`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
              style={{ backgroundColor: "rgba(13,17,68,0.05)", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }}
            >
              + Variation
            </Link>
          )}

          {/* Raise dispute — only when NOT already disputed or released */}
          {stage.status !== "disputed" && stage.status !== "released" && stage.status !== "draft" && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/disputes/new`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
              style={{ backgroundColor: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316" }}
            >
              Raise dispute
            </Link>
          )}

          {/* Admin override */}
          {isAdmin && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/override`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
              style={{ backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
            >
              ⚡ Override
            </Link>
          )}
        </div>

        {/* ── Evidence ─────────────────────────────────────────────────────── */}
        <Section title="Evidence" badge={evidence.length}>
          {/* Count pills */}
          {evidence.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {evidenceCounts.accepted > 0 && (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "rgba(52,211,153,0.12)", color: "#34d399" }}>
                  {evidenceCounts.accepted} accepted
                </span>
              )}
              {evidenceCounts.pending > 0 && (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "rgba(148,163,184,0.12)", color: "#94a3b8" }}>
                  {evidenceCounts.pending} pending
                </span>
              )}
              {evidenceCounts.requires_more > 0 && (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                  {evidenceCounts.requires_more} requires more
                </span>
              )}
              {evidenceCounts.rejected > 0 && (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                  {evidenceCounts.rejected} rejected
                </span>
              )}
            </div>
          )}

          {reviewError && (
            <p className="mb-2 rounded-xl px-3 py-2 text-xs text-red-300" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {reviewError}
            </p>
          )}
          {evidence.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No evidence uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {evidence.map((item) => {
                const sc = item.status === "accepted" ? "#34d399"
                  : item.status === "rejected" ? "#f87171"
                  : item.status === "requires_more" ? "#fbbf24"
                  : "#94a3b8";
                const isReviewable = item.status === "pending" || item.status === "requires_more";
                const isExpanded = expandedEvidenceId === item.id;
                const isReviewing = reviewSubmitting === item.id;
                const canExpand = isApprover && isReviewable;
                const fileIcon = item.fileType === "form" ? "📋"
                  : item.fileType.includes("pdf") ? "📄"
                  : item.fileType.startsWith("image") ? "🖼" : "📎";
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl overflow-hidden"
                    style={{ border: `1px solid ${isExpanded ? "rgba(13,17,68,0.14)" : "var(--surface-border, #e4e7f0)"}`, backgroundColor: isExpanded ? "rgba(13,17,68,0.03)" : "#fff" }}
                  >
                    {/* Main row — button only when expandable to avoid nested button error */}
                    {canExpand ? (
                      <button
                        type="button"
                        className="flex w-full items-start gap-3 px-4 py-3 text-left"
                        onClick={() => {
                          setExpandedEvidenceId(isExpanded ? null : item.id);
                          setReviewError(null);
                          setTimeout(() => notesRef.current?.focus(), 50);
                        }}
                      >
                        <span className="mt-0.5 text-lg shrink-0">{fileIcon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{item.name}</p>
                          <p className="text-[11px]" style={{ color: "rgba(13,17,68,0.45)" }}>
                            {item.uploadedBy?.full_name ?? "Unknown"} · {relativeTime(item.uploadedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[10px] font-bold uppercase" style={{ color: sc }}>
                            {item.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px]" style={{ color: "rgba(13,17,68,0.3)" }}>{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </button>
                    ) : (
                      <div className="flex w-full items-start gap-3 px-4 py-3 text-left">
                        <span className="mt-0.5 text-lg shrink-0">{fileIcon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{item.name}</p>
                          <p className="text-[11px]" style={{ color: "rgba(13,17,68,0.45)" }}>
                            {item.uploadedBy?.full_name ?? "Unknown"} · {relativeTime(item.uploadedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[10px] font-bold uppercase" style={{ color: sc }}>
                            {item.status.replace(/_/g, " ")}
                          </span>
                          {item.signedUrl && (
                            <button
                              type="button"
                              onClick={() => setViewerFile({ url: item.signedUrl!, name: item.name })}
                              className="rounded-lg px-2 py-1 text-[10px] font-semibold transition hover:opacity-80"
                              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#f7f8fc", color: "var(--brand-navy, #0D1144)" }}
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expanded review panel — only for pending / requires_more */}
                    {isExpanded && canExpand && (
                      <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                        {/* View file button */}
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

                        {/* Notes */}
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                            Review notes (required for reject / more info)
                          </label>
                          <textarea
                            ref={expandedEvidenceId === item.id ? notesRef : undefined}
                            rows={2}
                            placeholder="Add notes for the contractor…"
                            value={reviewNotes[item.id] ?? ""}
                            onChange={(e) => setReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isReviewing}
                            onClick={() => reviewEvidence(item.id, "accepted")}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                            style={{ backgroundColor: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}
                          >
                            ✓ Accept
                          </button>
                          <button
                            type="button"
                            disabled={isReviewing || !reviewNotes[item.id]?.trim()}
                            onClick={() => reviewEvidence(item.id, "requires_more")}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                            style={{ backgroundColor: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}
                          >
                            ↩ More info
                          </button>
                          <button
                            type="button"
                            disabled={isReviewing || !reviewNotes[item.id]?.trim()}
                            onClick={() => reviewEvidence(item.id, "rejected")}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                            style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
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
        </Section>

        {/* ── Approval chain ───────────────────────────────────────────────── */}
        <Section title="Approval chain" badge={pendingApprovals || undefined}>
          {approvals.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No approval records yet.</p>
          ) : (
            <div className="space-y-2">
              {approvals.map((ap) => {
                const ds = DECISION_STYLE[ap.decision] ?? DECISION_STYLE.pending;
                return (
                  <div
                    key={ap.id}
                    className="flex items-start gap-3 rounded-2xl px-4 py-3"
                    style={{ border: `1px solid ${ds.color}33`, backgroundColor: ds.color + "0d" }}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: ds.color + "22", color: ds.color }}
                    >
                      {ap.decision === "approved" ? "✓" : ap.decision === "rejected" ? "✗" : ap.decision === "returned" ? "↩" : "·"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{APPROVAL_ROLE_LABEL[ap.role] ?? ap.role}</p>
                      <p className="text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{ap.approver?.full_name ?? "—"}</p>
                      {ap.certifiedAmount !== null && (
                        <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.65)" }}>Certified {gbp.format(ap.certifiedAmount)}</p>
                      )}
                      {ap.notes && <p className="mt-0.5 text-xs italic" style={{ color: "rgba(13,17,68,0.45)" }}>{ap.notes}</p>}
                      <p className="mt-1 text-[10px]" style={{ color: "rgba(13,17,68,0.35)" }}>{relativeTime(ap.createdAt)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold uppercase" style={{ color: ds.color }}>{ds.label}</span>
                  </div>
                );
              })}
            </div>
          )}
          {allApproved && (
            <p className="mt-3 text-xs font-semibold" style={{ color: "#059669" }}>
              All approvals granted — stage cleared for payment release.
            </p>
          )}
        </Section>

        {/* ── Variations ───────────────────────────────────────────────────── */}
        <Section title="Variations" badge={variations.length || undefined}>
          {variations.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No variations requested.</p>
          ) : (
            <div className="space-y-2">
              {variations.map((v) => {
                const isApproved = v.status === "approved" || v.status === "active";
                const isPending  = v.status === "pending" || v.status === "under_review";
                const color = isApproved ? "#059669" : isPending ? "#d97706" : "#6b7280";
                return (
                  <div
                    key={v.id}
                    className="rounded-2xl px-4 py-3"
                    style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{v.description}</p>
                      <span className="shrink-0 text-[10px] font-bold uppercase" style={{ color }}>
                        {v.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                      <span style={{ color: v.valueChange >= 0 ? "#059669" : "#dc2626", fontWeight: 600 }}>
                        {v.valueChange >= 0 ? "+" : ""}{gbp.format(v.valueChange)}
                      </span>
                      <span>·</span>
                      <span>{v.requester?.full_name ?? "—"}</span>
                      <span>·</span>
                      <span>{relativeTime(v.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Disputes ─────────────────────────────────────────────────────── */}
        <Section title="Disputes" badge={activeDisputes || undefined}>
          {disputes.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No disputes raised.</p>
          ) : (
            <div className="space-y-2">
              {disputes.map((d) => {
                const isActive   = d.status === "raised" || d.status === "open";
                const isResolved = d.status === "resolved" || d.status === "withdrawn";
                const color = isActive ? "#dc2626" : isResolved ? "#6b7280" : "#d97706";
                return (
                  <Link
                    key={d.id}
                    href={`/projects/${projectId}/stages/${stageId}/disputes/${d.id}`}
                    className="block rounded-2xl px-4 py-3 transition hover:opacity-90"
                    style={{ border: `1px solid ${color}33`, backgroundColor: color + "0a" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold line-clamp-1" style={{ color: "var(--brand-navy, #0D1144)" }}>{d.reason}</p>
                      <span className="shrink-0 text-[10px] font-bold uppercase" style={{ color }}>
                        {d.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                      <span className="font-semibold" style={{ color }}>{gbp.format(d.disputedValue)}</span>
                      <span>·</span>
                      <span>{d.raiser?.full_name ?? "—"}</span>
                      <span>·</span>
                      <span>{relativeTime(d.createdAt)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Audit link ───────────────────────────────────────────────────── */}
        <div className="pt-4 pb-6" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
          <Link
            href={`/projects/${projectId}/audit`}
            className="text-xs font-medium transition hover:opacity-70"
            style={{ color: "rgba(13,17,68,0.5)" }}
          >
            View full project audit trail →
          </Link>
        </div>

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
