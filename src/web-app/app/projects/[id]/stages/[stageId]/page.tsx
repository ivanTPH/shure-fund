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
import { Skeleton } from "../../../../components/Skeleton";
import { useToast } from "../../../../components/ToastContext";
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

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; role: string | null };
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
  draft:                { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)",  text: "#64748b", label: "Draft" },
  in_progress:          { bg: "rgba(37,99,235,0.06)",   border: "rgba(37,99,235,0.2)",    text: "#2563eb", label: "In progress" },
  awaiting_approval:    { bg: "rgba(124,58,237,0.07)",  border: "rgba(124,58,237,0.2)",   text: "#7c3aed", label: "Awaiting approval" },
  returned:             { bg: "rgba(234,88,12,0.07)",   border: "rgba(234,88,12,0.2)",    text: "#ea580c", label: "Returned" },
  disputed:             { bg: "rgba(220,38,38,0.06)",   border: "rgba(220,38,38,0.2)",    text: "#dc2626", label: "Disputed" },
  available_to_release: { bg: "rgba(5,150,105,0.07)",   border: "rgba(5,150,105,0.2)",    text: "#059669", label: "Ready to release" },
  released:             { bg: "rgba(22,163,74,0.07)",   border: "rgba(22,163,74,0.2)",    text: "#16a34a", label: "Released" },
  funding_gap:          { bg: "rgba(220,38,38,0.06)",   border: "rgba(220,38,38,0.2)",    text: "#dc2626", label: "Funding gap" },
  sent:                 { bg: "rgba(37,99,235,0.06)",   border: "rgba(37,99,235,0.18)",   text: "#2563eb", label: "Sent for review" },
  accepted:             { bg: "rgba(124,58,237,0.06)",  border: "rgba(124,58,237,0.18)",  text: "#7c3aed", label: "Accepted" },
  part_funded:          { bg: "rgba(217,119,6,0.07)",   border: "rgba(217,119,6,0.2)",    text: "#d97706", label: "Partially funded" },
};

const DECISION_STYLE: Record<string, { color: string; label: string }> = {
  approved: { color: "#059669", label: "Approved" },
  rejected: { color: "#dc2626", label: "Rejected" },
  returned: { color: "#ea580c", label: "Returned" },
  pending:  { color: "#94a3b8", label: "Pending" },
};

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  submit:                   { label: "Submit for review",          color: "#2563eb", bg: "rgba(37,99,235,0.08)",  border: "rgba(37,99,235,0.25)" },
  accept:                   { label: "Accept stage",               color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.25)" },
  reject:                   { label: "Reject stage",               color: "#dc2626", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.25)" },
  allocate_funding:         { label: "Allocate funding & start",   color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.25)" },
  flag_funding_gap:         { label: "Flag funding gap",           color: "#dc2626", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.2)"  },
  partial_fund:             { label: "Mark partially funded",      color: "#d97706", bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.25)" },
  submit_for_approval:      { label: "Submit for approval",        color: "#7c3aed", bg: "rgba(124,58,237,0.08)",border: "rgba(124,58,237,0.25)"},
  complete_approvals:       { label: "Complete approval chain",    color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.25)" },
  restart:                  { label: "Restart stage",              color: "#2563eb", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.25)" },
  resolve_dispute_continue: { label: "Resolve — continue to approval", color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.25)" },
  resolve_dispute_reject:   { label: "Resolve — return for rework",    color: "#dc2626", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.2)"  },
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
// Stage stepper — visual progress indicator
// ---------------------------------------------------------------------------

const STAGE_STEPS: Array<{ key: string; label: string; sub: string }> = [
  { key: "draft",                label: "Draft",      sub: "Not started" },
  { key: "sent",                 label: "Sent",       sub: "Under review" },
  { key: "in_progress",          label: "Active",     sub: "Work underway" },
  { key: "awaiting_approval",    label: "Sign-offs",  sub: "Approval chain" },
  { key: "available_to_release", label: "Ready",      sub: "For release" },
  { key: "released",             label: "Released",   sub: "Complete" },
];

// Map side-states onto a main step for stepper positioning
const STEP_ALIAS: Record<string, string> = {
  accepted:      "sent",
  returned:      "awaiting_approval",
  disputed:      "awaiting_approval",
  funding_gap:   "available_to_release",
  part_funded:   "available_to_release",
};

function StageStepper({ status }: { status: string }) {
  const resolved = STEP_ALIAS[status] ?? status;
  const currentIdx = STAGE_STEPS.findIndex((s) => s.key === resolved);
  const isWarning = ["disputed", "returned", "funding_gap"].includes(status);

  return (
    <div
      className="rounded-[20px] px-4 py-4"
      style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.4)" }}>
        Stage progress
      </p>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto" }}>
        {STAGE_STEPS.map((step, idx) => {
          const isDone    = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture  = idx > currentIdx;

          const dotColor = isDone ? "#059669" : isCurrent ? (isWarning ? "#ea580c" : "#0D1144") : "#e4e7f0";
          const dotBg    = isDone ? "#059669" : isCurrent ? (isWarning ? "#ea580c" : "#0D1144") : "#f7f8fc";
          const lineColor = isDone ? "#059669" : "#e4e7f0";

          return (
            <div key={step.key} style={{ flex: 1, minWidth: 44, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Connector + dot row */}
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {/* Left connector */}
                <div style={{
                  flex: 1, height: 2,
                  backgroundColor: idx === 0 ? "transparent" : (isDone || isCurrent ? lineColor : "#e4e7f0"),
                  transition: "background-color 0.3s",
                }} />
                {/* Dot */}
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  backgroundColor: dotBg,
                  border: `2px solid ${dotColor}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.3s",
                }}>
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : isCurrent ? (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#fff" }} />
                  ) : null}
                </div>
                {/* Right connector */}
                <div style={{
                  flex: 1, height: 2,
                  backgroundColor: idx === STAGE_STEPS.length - 1 ? "transparent" : (isDone ? "#059669" : "#e4e7f0"),
                  transition: "background-color 0.3s",
                }} />
              </div>

              {/* Label */}
              <p style={{
                marginTop: 6, fontSize: 10, fontWeight: isCurrent ? 800 : 500,
                textAlign: "center", lineHeight: 1.3,
                color: isCurrent
                  ? (isWarning ? "#ea580c" : "var(--brand-navy, #0D1144)")
                  : isDone ? "#059669" : "rgba(13,17,68,0.35)",
              }}>
                {step.label}
              </p>
              {isCurrent && (
                <p style={{ fontSize: 9, color: "rgba(13,17,68,0.4)", textAlign: "center", marginTop: 1 }}>
                  {isWarning ? status.replace(/_/g, " ") : step.sub}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StageOverviewPage() {
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();
  const { toast } = useToast();

  const [stage, setStage]         = useState<StageDetail | null>(null);
  const [evidence, setEvidence]   = useState<Evidence[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [disputes, setDisputes]   = useState<Dispute[]>([]);
  const [comments, setComments]   = useState<Comment[]>([]);
  const [userId, setUserId]       = useState<string | null>(null);
  const [userRole, setUserRole]   = useState<AppRole | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Comments form
  const [commentDraft, setCommentDraft]   = useState("");
  const [commentPosting, setCommentPosting] = useState(false);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Workflow transitions
  const [availableTransitions, setAvailableTransitions] = useState<string[]>([]);
  const [transitioning, setTransitioning]               = useState(false);

  // Evidence inline review
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<string | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  // File viewer modal — must be declared before any early returns
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [stageRes, evidenceRes, approvalsRes, variationsRes, disputesRes, transitionRes, commentsRes] = await Promise.all([
        fetch(`/api/stages/${stageId}`),
        fetch(`/api/evidence?stageId=${stageId}`),
        fetch(`/api/stages/${stageId}/approvals`),
        fetch(`/api/variations?stageId=${stageId}`),
        fetch(`/api/disputes?stageId=${stageId}`),
        fetch(`/api/stages/${stageId}/transition`),
        fetch(`/api/stages/${stageId}/comments`),
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
      if (transitionRes.ok) {
        const { availableActions } = await transitionRes.json();
        setAvailableTransitions(availableActions ?? []);
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
      if (commentsRes.ok) {
        const { comments: cm } = await commentsRes.json();
        setComments(cm ?? []);
      }
    } catch {
      setError("Network error loading stage.");
    } finally {
      setLoading(false);
    }
  }, [stageId, projectId]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setUserRole(user ? (getRole(user) as AppRole | null) : null);
      setUserId(user?.id ?? null);
    });
    load();
  }, [load]);

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentDraft.trim()) return;
    setCommentPosting(true);
    try {
      const res = await fetch(`/api/stages/${stageId}/comments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: commentDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to post comment.", "error");
        return;
      }
      setCommentDraft("");
      setComments(prev => [...prev, data.comment]);
    } catch {
      toast("Network error.", "error");
    } finally {
      setCommentPosting(false);
    }
  }

  async function deleteComment(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId));
    await fetch(`/api/stages/${stageId}/comments/${commentId}`, { method: "DELETE" });
  }

  async function reviewEvidence(evidenceId: string, status: "accepted" | "rejected" | "requires_more") {
    setReviewSubmitting(evidenceId);
    try {
      const res = await fetch(`/api/evidence/${evidenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: reviewNotes[evidenceId]?.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast(d.error ?? "Failed to update evidence.", "error");
        return;
      }
      setEvidence((prev) => prev.map((e) => e.id === evidenceId ? { ...e, status } : e));
      setExpandedEvidenceId(null);
      setReviewNotes((prev) => ({ ...prev, [evidenceId]: "" }));
      const label = status === "accepted" ? "Evidence accepted" : status === "rejected" ? "Evidence rejected" : "More information requested";
      toast(label, status === "accepted" ? "success" : status === "rejected" ? "error" : "info");
    } catch {
      toast("Network error updating evidence.", "error");
    } finally {
      setReviewSubmitting(null);
    }
  }

  async function performTransition(action: string) {
    setTransitioning(true);
    try {
      const res = await fetch(`/api/stages/${stageId}/transition`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Action failed.", "error");
        return;
      }
      const newStatus = (data.to ?? "").replace(/_/g, " ");
      toast(`Stage moved to: ${newStatus}`, "success");
      await load();
    } catch {
      toast("Network error.", "error");
    } finally {
      setTransitioning(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / error
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <AppShell>
        <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto">
          <Skeleton.Stage />
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
  const activeDisputes = disputes.filter((d) => d.status === "raised" || d.status === "under_review").length;

  const variationImpact = variations
    .filter((v) => v.status === "approved" || v.status === "active")
    .reduce((sum, v) => sum + v.valueChange, 0);

  // Role-based action availability
  const isContractor    = userRole === "contractor";
  const isApprover      = ["commercial", "consultant", "funder", "developer", "admin"].includes(userRole ?? "");
  const canRelease      = (userRole === "funder" || userRole === "admin") && stage.status === "available_to_release";
  const canVariation    = ["contractor", "developer", "admin"].includes(userRole ?? "");
  const isAdmin         = userRole === "admin";

  // Task banner — what does THIS user need to do right now?
  const myApprovalRole =
    userRole === "commercial" ? "commercial"
    : userRole === "consultant" ? "professional"
    : userRole === "funder" || userRole === "developer" ? "treasury"
    : null;
  const myApprovalRecord = myApprovalRole ? approvals.find((a) => a.role === myApprovalRole) : null;
  const iAlreadyActed = myApprovalRecord && myApprovalRecord.decision !== "pending";

  type TaskBannerConfig = { message: string; sub?: string; accent: string; bg: string; border: string; href?: string; cta?: string } | null;

  function getTaskBanner(): TaskBannerConfig {
    if (!stage) return null;
    const s = stage.status;
    if (userRole === "contractor") {
      if (s === "in_progress")       return { accent: "#2563eb", bg: "rgba(37,99,235,0.06)", border: "rgba(37,99,235,0.2)", message: "Upload your evidence to progress this stage", sub: "Use the 'Upload evidence' button below once your work is complete.", href: `/projects/${projectId}/stages/${stageId}/action`, cta: "Upload evidence" };
      if (s === "returned")          return { accent: "#ea580c", bg: "rgba(234,88,12,0.06)", border: "rgba(234,88,12,0.2)",  message: "Stage returned for revision", sub: "Review the notes in the approval chain below, then re-upload your evidence.", href: `/projects/${projectId}/stages/${stageId}/action`, cta: "Upload evidence" };
      if (s === "awaiting_approval") return { accent: "#7c3aed", bg: "rgba(124,58,237,0.05)", border: "rgba(124,58,237,0.18)", message: "Evidence submitted — awaiting sign-offs", sub: "No action needed from you right now. You will be notified when a decision is made." };
      if (s === "disputed")          return { accent: "#dc2626", bg: "rgba(220,38,38,0.05)", border: "rgba(220,38,38,0.18)", message: "Stage under dispute", sub: "Payment is held until the dispute is resolved. No action available until then." };
      if (s === "available_to_release") return { accent: "#059669", bg: "rgba(5,150,105,0.05)", border: "rgba(5,150,105,0.18)", message: "All approvals granted", sub: "Payment is ready to be released by the funder. No action needed from you." };
    }
    if (userRole === "commercial" || userRole === "consultant") {
      if (s === "awaiting_approval" && !iAlreadyActed) return { accent: "#7c3aed", bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.2)", message: `Your ${userRole === "commercial" ? "commercial" : "professional"} sign-off is required`, sub: "Review the evidence below and submit your decision.", href: `/projects/${projectId}/stages/${stageId}/approve`, cta: "Sign off now" };
      if (s === "awaiting_approval" && iAlreadyActed)  return { accent: "#059669", bg: "rgba(5,150,105,0.05)", border: "rgba(5,150,105,0.18)", message: "You have signed off", sub: "Awaiting the remaining approvals in the chain." };
    }
    if (userRole === "funder" || userRole === "developer") {
      if (s === "awaiting_approval" && !iAlreadyActed) return { accent: "#7c3aed", bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.2)", message: "Treasury sign-off required", sub: "Review the evidence and commercial sign-offs, then submit your decision.", href: `/projects/${projectId}/stages/${stageId}/approve`, cta: "Sign off now" };
      if (s === "awaiting_approval" && iAlreadyActed)  return { accent: "#059669", bg: "rgba(5,150,105,0.05)", border: "rgba(5,150,105,0.18)", message: "You have signed off", sub: "Awaiting the remaining approvals in the chain." };
      if (s === "available_to_release" && userRole === "funder") return { accent: "#059669", bg: "rgba(5,150,105,0.07)", border: "rgba(5,150,105,0.25)", message: "Ready to release payment", sub: `All sign-offs complete. You can now release ${gbp.format(stage?.value ?? 0)} to the contractor.`, href: `/projects/${projectId}/stages/${stageId}/release`, cta: "Release payment" };
    }
    return null;
  }

  const taskBanner = getTaskBanner();

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

        {/* ── Task banner — role-contextual guidance ────────────────────────── */}
        {taskBanner && (
          <div
            className="rounded-[20px] px-5 py-5"
            style={{
              backgroundColor: taskBanner.bg,
              border: `2px solid ${taskBanner.accent}55`,
              boxShadow: `0 0 0 4px ${taskBanner.accent}0a`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: taskBanner.accent, color: "#fff" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  {taskBanner.href
                    ? <><circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/></>
                    : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>
                  }
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold leading-snug" style={{ color: taskBanner.accent }}>
                  {taskBanner.message}
                </p>
                {taskBanner.sub && (
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "rgba(13,17,68,0.6)" }}>
                    {taskBanner.sub}
                  </p>
                )}
                {taskBanner.href && taskBanner.cta && (
                  <Link
                    href={taskBanner.href}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 active:opacity-80"
                    style={{ backgroundColor: taskBanner.accent }}
                  >
                    {taskBanner.cta} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Stage stepper ────────────────────────────────────────────────── */}
        <StageStepper status={stage.status} />

        {/* ── Stage header ─────────────────────────────────────────────────── */}
        <div
          className="rounded-[24px] p-5"
          style={{ border: `1px solid ${statusStyle.border}`, backgroundColor: statusStyle.bg }}
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
                <p className="text-[11px] font-semibold" style={{ color: variationImpact > 0 ? "#059669" : "#dc2626" }}>
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
                <p className="text-[10px] font-semibold" style={{ color: "#dc2626" }}>Overdue</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Workflow transitions ──────────────────────────────────────────── */}
        {availableTransitions.length > 0 && (
          <div
            className="rounded-[20px] p-4"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Workflow actions
            </p>
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map((action) => {
                // complete_approvals fires automatically via DB trigger — never show as a manual button
                if (action === "complete_approvals") return null;
                const cfg = ACTION_CONFIG[action];
                if (!cfg) return null;
                return (
                  <button
                    key={action}
                    type="button"
                    disabled={transitioning}
                    onClick={() => performTransition(action)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                  >
                    {transitioning ? "…" : cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Contextual action links ───────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">

          {/* DISPUTED: primary = view/resolve dispute */}
          {stage.status === "disputed" && disputes.length > 0 && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/disputes/${disputes[0].id}`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition"
              style={{ backgroundColor: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}
            >
              View dispute
            </Link>
          )}

          {/* AVAILABLE_TO_RELEASE: primary release button */}
          {canRelease && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/release`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition"
              style={{ backgroundColor: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.25)", color: "#059669" }}
            >
              Release payment →
            </Link>
          )}

          {/* AWAITING_APPROVAL: review & approve — only shown when stage actually needs sign-off */}
          {isApprover && stage.status === "awaiting_approval" && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/approve`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
              style={{
                backgroundColor: "rgba(124,58,237,0.07)",
                border: "1px solid rgba(124,58,237,0.2)",
                color: "#7c3aed",
              }}
            >
              {pendingApprovals > 0 ? `Sign off (${pendingApprovals} pending)` : "Review & sign off"}
            </Link>
          )}

          {/* Contractor: upload evidence (only when in progress or returned — not draft) */}
          {isContractor && (stage.status === "in_progress" || stage.status === "returned") && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/action`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
              style={{ backgroundColor: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.2)", color: "#2563eb" }}
            >
              Upload evidence
            </Link>
          )}

          {/* Variation request — not when released */}
          {canVariation && stage.status !== "released" && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/variations/new`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
              style={{ backgroundColor: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: "#64748b" }}
            >
              + Variation
            </Link>
          )}

          {/* Raise dispute — only when work is underway or under review */}
          {(stage.status === "in_progress" || stage.status === "awaiting_approval" || stage.status === "returned") && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/disputes/new`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
              style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}
            >
              Raise dispute
            </Link>
          )}

          {/* Admin override */}
          {isAdmin && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/override`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
              style={{ backgroundColor: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: "#64748b" }}
            >
              Override
            </Link>
          )}

          {/* Reconciliation — available after release */}
          {stage.status === "released" && (
            <Link
              href={`/projects/${projectId}/stages/${stageId}/reconciliation`}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
              style={{ backgroundColor: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.2)", color: "#16a34a" }}
            >
              View reconciliation
            </Link>
          )}
        </div>

        {/* ── Evidence ─────────────────────────────────────────────────────── */}
        <Section title="Evidence" badge={evidence.length}>
          {/* Count pills */}
          {evidence.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {evidenceCounts.accepted > 0 && (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "rgba(5,150,105,0.08)", color: "#059669", border: "1px solid rgba(5,150,105,0.2)" }}>
                  {evidenceCounts.accepted} accepted
                </span>
              )}
              {evidenceCounts.pending > 0 && (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "rgba(148,163,184,0.1)", color: "#64748b", border: "1px solid rgba(148,163,184,0.2)" }}>
                  {evidenceCounts.pending} pending
                </span>
              )}
              {evidenceCounts.requires_more > 0 && (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "rgba(217,119,6,0.08)", color: "#d97706", border: "1px solid rgba(217,119,6,0.2)" }}>
                  {evidenceCounts.requires_more} requires more
                </span>
              )}
              {evidenceCounts.rejected > 0 && (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "rgba(220,38,38,0.07)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>
                  {evidenceCounts.rejected} rejected
                </span>
              )}
            </div>
          )}

          {evidence.length === 0 ? (
            isContractor && (stage.status === "in_progress" || stage.status === "returned") ? (
              <div className="rounded-2xl px-5 py-6 text-center" style={{ border: "1px dashed rgba(37,99,235,0.3)", backgroundColor: "rgba(37,99,235,0.03)" }}>
                <p className="text-sm font-medium" style={{ color: "rgba(13,17,68,0.6)" }}>No evidence uploaded yet.</p>
                <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>Submit photos, documents or a completion form to proceed.</p>
                <Link
                  href={`/projects/${projectId}/stages/${stageId}/action`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                  style={{ backgroundColor: "#2563eb", color: "#fff" }}
                >
                  Upload evidence
                </Link>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No evidence uploaded yet.</p>
            )
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
                              className="rounded-lg px-2 py-1 text-[10px] font-semibold transition hover:opacity-70"
                              style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.5)" }}
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
        </Section>

        {/* ── Approval chain ───────────────────────────────────────────────── */}
        <Section title="Approval chain" badge={pendingApprovals || undefined}>
          {approvals.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>
              No approval records yet.{" "}
              {stage.status === "awaiting_approval"
                ? "Approval chain members have been notified."
                : stage.status === "in_progress" || stage.status === "sent" || stage.status === "accepted"
                ? "Approvals will appear once the stage is submitted for review."
                : ""}
            </p>
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
                const isPending  = v.status === "submitted" || v.status === "under_review";
                const color = isApproved ? "#059669" : isPending ? "#d97706" : "#6b7280";
                return (
                  <Link
                    key={v.id}
                    href={`/projects/${projectId}/stages/${stageId}/variations/${v.id}`}
                    className="block rounded-2xl px-4 py-3 transition hover:bg-slate-50"
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
                  </Link>
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

        {/* ── Internal notes / comments ────────────────────────────────────── */}
        <Section title="Internal notes" badge={comments.length || undefined}>
          {/* Comment list */}
          {comments.length > 0 && (
            <div className="mb-4 space-y-3">
              {comments.map((c) => {
                const isOwn     = c.author.id === userId;
                const canDelete = isOwn || userRole === "admin";
                const roleColors: Record<string, string> = {
                  admin:      "#dc2626", developer: "#2563eb", funder: "#059669",
                  commercial: "#7c3aed", consultant: "#ea580c", contractor: "#d97706",
                };
                const rc = c.author.role ? (roleColors[c.author.role] ?? "#64748b") : "#64748b";
                return (
                  <div
                    key={c.id}
                    className="rounded-[18px] px-4 py-3.5"
                    style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: rc + "22", color: rc }}
                      >
                        {c.author.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <p className="text-xs font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                            {c.author.name}
                          </p>
                          {c.author.role && (
                            <span
                              className="inline-block rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                              style={{ backgroundColor: rc + "18", color: rc }}
                            >
                              {c.author.role}
                            </span>
                          )}
                          <p className="text-[10px]" style={{ color: "rgba(13,17,68,0.35)" }}>
                            {relativeTime(c.createdAt)}
                          </p>
                        </div>
                        <p
                          className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words"
                          style={{ color: "var(--brand-navy, #0D1144)" }}
                        >
                          {c.content}
                        </p>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="shrink-0 text-[10px] font-semibold transition hover:opacity-60 mt-0.5"
                          style={{ color: "rgba(13,17,68,0.3)" }}
                          aria-label="Delete comment"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* New comment form */}
          <form onSubmit={postComment} className="rounded-[18px] p-4" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            <textarea
              ref={commentTextareaRef}
              value={commentDraft}
              onChange={e => setCommentDraft(e.target.value)}
              placeholder="Add an internal note visible to all project members…"
              rows={3}
              maxLength={2000}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                border: "1px solid var(--surface-border, #e4e7f0)",
                backgroundColor: "#f7f8fc",
                color: "var(--brand-navy, #0D1144)",
              }}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[10px]" style={{ color: "rgba(13,17,68,0.3)" }}>
                {commentDraft.length}/2000 · visible to all project members
              </p>
              <button
                type="submit"
                disabled={commentPosting || !commentDraft.trim()}
                className="rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
              >
                {commentPosting ? "Posting…" : "Post note"}
              </button>
            </div>
          </form>
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
