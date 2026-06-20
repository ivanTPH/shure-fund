"use client";

/**
 * Cross-project drawdown requests — /requests
 *
 * Funder/admin/developer view of all drawdown requests across all their
 * projects. Allows inline approve/reject actions (admin only).
 *
 * Drawdown = formal request to transfer funds from Tier 2 (bank PoF)
 *            into the Tier 1 trust wallet.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { Skeleton } from "@/app/components/Skeleton";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRef = { id: string; full_name: string; email: string } | null;

type DrawdownRequest = {
  id: string;
  amount: number;
  description: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  createdAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  projectId: string;
  projectName: string | null;
  projectAddress: string | null;
  requester: UserRef;
  reviewer: UserRef;
};

type Summary = { total: number; pending: number; approved: number; rejected: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const fmtDate = (s: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(s));

const STATUS_STYLES: Record<DrawdownRequest["status"], { label: string; bg: string; color: string }> = {
  pending:   { label: "Pending",   bg: "rgba(234,88,12,0.09)",  color: "#ea580c" },
  approved:  { label: "Approved",  bg: "rgba(5,150,105,0.09)",  color: "#059669" },
  rejected:  { label: "Rejected",  bg: "rgba(220,38,38,0.09)",  color: "#dc2626" },
  withdrawn: { label: "Withdrawn", bg: "rgba(100,116,139,0.1)", color: "#64748b" },
};

function StatusBadge({ status }: { status: DrawdownRequest["status"] }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RequestsPage() {
  const router = useRouter();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DrawdownRequest[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actioning, setActioning] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (status = "all") => {
    const url = `/api/drawdowns${status !== "all" ? `?status=${status}` : ""}`;
    const res = await fetch(url);
    if (res.status === 401) { router.replace("/auth/login"); return; }
    if (res.status === 403) { router.replace("/projects"); return; }
    const data = await res.json() as { requests: DrawdownRequest[]; summary: Summary };
    setRequests(data.requests ?? []);
    setSummary(data.summary ?? { total: 0, pending: 0, approved: 0, rejected: 0 });
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }
      const r = getRole(user) as AppRole;
      setRole(r);
      if (!["funder", "developer", "admin"].includes(r)) { router.replace("/projects"); return; }
      await load(statusFilter);
    };
    init();
  }, [load, router, statusFilter]);

  async function takeAction(reqId: string, projectId: string, action: "approve" | "reject") {
    setActionError(null);
    const res = await fetch(`/api/projects/${projectId}/drawdown-requests/${reqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNotes: actionNotes.trim() || undefined }),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) { setActionError(data.error ?? "Action failed."); return; }
    setActioning(null);
    setActionNotes("");
    await load(statusFilter);
  }

  const filtered = requests;  // already filtered by API
  const isAdmin = role === "admin";

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0D1144" }}>
            Drawdown requests
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
            Formal requests to transfer funds from Tier 2 (bank) into the Tier 1 trust wallet.
          </p>
        </div>

        {!loading && (
          <>
            {/* Summary strip */}
            <div
              className="mb-5 grid grid-cols-4 gap-3 rounded-[20px] px-5 py-4"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              {[
                { label: "Total", value: summary.total, color: "#0D1144" },
                { label: "Pending", value: summary.pending, color: "#ea580c" },
                { label: "Approved", value: summary.approved, color: "#059669" },
                { label: "Rejected", value: summary.rejected, color: "#dc2626" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
                  <p className="mt-0.5 text-xl font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Status filter */}
            <div className="mb-4 flex flex-wrap gap-2">
              {["all", "pending", "approved", "rejected", "withdrawn"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s); load(s); }}
                  className="rounded-[12px] px-3 py-1.5 text-xs font-semibold transition"
                  style={
                    statusFilter === s
                      ? { backgroundColor: "#0D1144", color: "#fff" }
                      : { border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.6)", backgroundColor: "#fff" }
                  }
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </>
        )}

        {loading ? (
          <Skeleton.CardList />
        ) : filtered.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No drawdown requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => {
              const isActioning = actioning === req.id;
              return (
                <div
                  key={req.id}
                  className="rounded-[20px] px-5 py-4"
                  style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                        {req.projectName ?? "Unknown project"} · {req.projectAddress}
                      </p>
                      <p className="mt-0.5 text-xl font-bold" style={{ color: "#0D1144" }}>
                        {gbp.format(req.amount)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={req.status} />
                      <Link
                        href={`/projects/${req.projectId}/drawdown`}
                        className="text-[11px] font-medium hover:underline"
                        style={{ color: "#2563eb" }}
                      >
                        View project →
                      </Link>
                    </div>
                  </div>

                  {req.description && (
                    <p className="mb-2 text-sm italic" style={{ color: "rgba(13,17,68,0.55)" }}>
                      &ldquo;{req.description}&rdquo;
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
                    <span>Requested {fmtDate(req.createdAt)} by {req.requester?.full_name ?? "Unknown"}</span>
                    {req.reviewedAt && req.reviewer && (
                      <span>· Reviewed {fmtDate(req.reviewedAt)} by {req.reviewer.full_name}</span>
                    )}
                  </div>

                  {req.reviewNotes && (
                    <p className="mt-1 text-xs italic" style={{ color: "rgba(13,17,68,0.5)" }}>
                      Notes: &ldquo;{req.reviewNotes}&rdquo;
                    </p>
                  )}

                  {/* Admin approve/reject inline */}
                  {isAdmin && req.status === "pending" && (
                    <div className="mt-3">
                      {!isActioning ? (
                        <button
                          type="button"
                          onClick={() => { setActioning(req.id); setActionNotes(""); setActionError(null); }}
                          className="text-xs font-medium hover:underline"
                          style={{ color: "#2563eb" }}
                        >
                          Review →
                        </button>
                      ) : (
                        <div
                          className="mt-2 rounded-[14px] px-4 py-3"
                          style={{ border: "1px solid rgba(37,99,235,0.2)", backgroundColor: "rgba(37,99,235,0.03)" }}
                        >
                          <textarea
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            placeholder="Review notes (optional)"
                            rows={2}
                            className="w-full rounded-[10px] px-3 py-2 text-sm outline-none resize-none mb-3"
                            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "#0D1144" }}
                          />
                          {actionError && <p className="mb-2 text-xs" style={{ color: "#dc2626" }}>{actionError}</p>}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => takeAction(req.id, req.projectId, "approve")}
                              className="rounded-[12px] px-4 py-1.5 text-xs font-semibold transition hover:opacity-80"
                              style={{ backgroundColor: "#059669", color: "#fff" }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => takeAction(req.id, req.projectId, "reject")}
                              className="rounded-[12px] px-4 py-1.5 text-xs font-semibold transition hover:opacity-80"
                              style={{ backgroundColor: "#dc2626", color: "#fff" }}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => setActioning(null)}
                              className="rounded-[12px] px-4 py-1.5 text-xs"
                              style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.6)" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
