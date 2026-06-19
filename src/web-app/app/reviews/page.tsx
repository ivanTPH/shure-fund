"use client";

/**
 * Evidence review queue — /reviews
 *
 * Cross-project pending evidence queue for commercial, consultant,
 * professional, funder, developer, and admin roles.
 *
 * Fetches all evidence records with status='pending' across all projects
 * the user has access to and allows inline approval / return.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { useToast } from "@/app/components/ToastContext";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PendingItem = {
  id: string;
  name: string;
  fileType: string | null;
  fileSize: number | null;
  uploadedAt: string;
  notes: string | null;
  stageId: string;
  stageName: string;
  stageStatus: string;
  contractId: string;
  projectId: string;
  projectName: string | null;
  projectAddress: string | null;
  uploadedBy: { id: string; fullName: string; email: string; role: string } | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function fileSizeLabel(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const ROLE_LABELS: Record<string, string> = {
  contractor: "Contractor",
  admin: "Admin",
  commercial: "Commercial",
  consultant: "Consultant",
  funder: "Funder",
  developer: "Project Owner",
};

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
};

// ---------------------------------------------------------------------------
// EvidenceRow component
// ---------------------------------------------------------------------------

function EvidenceRow({
  item,
  onReviewed,
}: {
  item: PendingItem;
  onReviewed: (id: string) => void;
}) {
  const [decision, setDecision] = useState<"accepted" | "requires_more" | "rejected" | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function submit() {
    if (!decision) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/evidence/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision, notes: notes.trim() || undefined }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Review failed."); return; }
      toast(
        decision === "accepted" ? "Evidence accepted" : decision === "rejected" ? "Evidence rejected" : "Requested more information",
        decision === "accepted" ? "success" : "info",
      );
      onReviewed(item.id);
    } finally {
      setSubmitting(false);
    }
  }

  const DECISION_STYLES = {
    accepted:      { label: "Accept",       bg: "#059669", selected: "#059669" },
    requires_more: { label: "Needs more",   bg: "#ea580c", selected: "#ea580c" },
    rejected:      { label: "Reject",       bg: "#dc2626", selected: "#dc2626" },
  } as const;

  return (
    <div
      className="rounded-[20px] px-5 py-4"
      style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
    >
      {/* Header: project + stage */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
            {item.projectName ?? "Unknown project"} · {item.projectAddress}
          </p>
          <p className="mt-0.5 text-sm font-semibold" style={{ color: "#0D1144" }}>
            {item.stageName}
          </p>
        </div>
        <Link
          href={`/projects/${item.projectId}/stages/${item.stageId}`}
          className="text-[11px] font-medium hover:underline shrink-0"
          style={{ color: "#2563eb" }}
        >
          View stage →
        </Link>
      </div>

      {/* Evidence details */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: "#f7f8fc", border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.6)" }}
          >
            {FILE_TYPE_LABELS[item.fileType ?? ""] ?? item.fileType ?? "file"}
          </span>
          <p className="text-sm font-medium" style={{ color: "#0D1144" }}>{item.name}</p>
          {fileSizeLabel(item.fileSize) && (
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>{fileSizeLabel(item.fileSize)}</p>
          )}
        </div>
      </div>

      {item.notes && (
        <p className="mb-2 text-xs italic" style={{ color: "rgba(13,17,68,0.55)" }}>&ldquo;{item.notes}&rdquo;</p>
      )}

      <p className="mb-3 text-[11px]" style={{ color: "rgba(13,17,68,0.4)" }}>
        Uploaded {fmtDate(item.uploadedAt)}
        {item.uploadedBy ? ` by ${item.uploadedBy.fullName} (${ROLE_LABELS[item.uploadedBy.role] ?? item.uploadedBy.role})` : ""}
      </p>

      {/* Decision buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(["accepted", "requires_more", "rejected"] as const).map((d) => {
          const style = DECISION_STYLES[d];
          const isSelected = decision === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDecision(d)}
              className="rounded-[12px] px-3 py-1.5 text-xs font-semibold transition"
              style={
                isSelected
                  ? { backgroundColor: style.bg, color: "#fff" }
                  : { border: `1px solid ${style.bg}`, color: style.bg, backgroundColor: "transparent" }
              }
            >
              {style.label}
            </button>
          );
        })}
      </div>

      {decision && (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Review notes (optional)"
            rows={2}
            className="w-full rounded-[12px] px-3 py-2 text-sm outline-none resize-none mb-2"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#f7f8fc", color: "#0D1144" }}
          />
          {error && <p className="mb-2 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-[14px] px-4 py-2 text-xs font-semibold transition hover:opacity-80"
            style={{
              backgroundColor: DECISION_STYLES[decision].bg,
              color: "#fff",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Saving…" : "Submit review"}
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ReviewsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/evidence/pending");
    if (res.status === 401) { router.replace("/auth/login"); return; }
    if (res.status === 403) { router.replace("/projects"); return; }
    const data = await res.json() as { items: PendingItem[]; total: number };
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }
      await load();
    };
    init();
  }, [load, router]);

  function removeItem(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      setTotal(next.length);
      return next;
    });
  }

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0D1144" }}>
            Evidence review queue
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
            All pending evidence submissions across your projects.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading…</p>
          </div>
        ) : items.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-semibold" style={{ color: "#059669" }}>Queue clear</p>
            <p className="mt-1 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
              No pending evidence awaiting review.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
              {total} item{total !== 1 ? "s" : ""} pending review
            </p>
            <div className="space-y-3">
              {items.map((item) => (
                <EvidenceRow key={item.id} item={item} onReviewed={removeItem} />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
