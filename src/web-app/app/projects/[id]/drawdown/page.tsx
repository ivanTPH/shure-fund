"use client";

/**
 * Drawdown requests — /projects/[id]/drawdown
 *
 * Funder formal drawdown requests to transfer funds from Tier 2 (bank PoF)
 * into the Tier 1 trust wallet.
 *
 * Read:    funder, developer, admin
 * Create:  funder, admin
 * Review:  admin, funder (approve / reject)
 * Withdraw: original requester or admin
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";

// ── Types ──────────────────────────────────────────────────────────────────

type UserRef = { id: string; full_name: string | null; email: string } | null;

type DrawdownRequest = {
  id: string;
  amount: number;
  description: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
  requester: UserRef;
  reviewer: UserRef;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "rgba(37,99,235,0.08)",   color: "#2563eb"  },
  approved:  { bg: "rgba(5,150,105,0.08)",   color: "#059669"  },
  rejected:  { bg: "rgba(220,38,38,0.08)",   color: "#dc2626"  },
  withdrawn: { bg: "rgba(148,163,184,0.12)", color: "#64748b"  },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function DrawdownPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [requests, setRequests]       = useState<DrawdownRequest[]>([]);
  const [totalApproved, setTotalApproved] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Create form
  const [amount, setAmount]       = useState("");
  const [desc, setDesc]           = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);

  // Action state
  const [actionId, setActionId]     = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actioning, setActioning]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [drRes, dashRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/drawdown-requests`),
          fetch(`/api/projects/${projectId}/dashboard`),
        ]);
        const [drData, dashData] = await Promise.all([drRes.json(), dashRes.json()]);
        if (!drRes.ok) { setError(drData.error ?? "Failed to load drawdown requests."); return; }
        setRequests(drData.requests ?? []);
        setTotalApproved(drData.totalApproved ?? 0);
        setProjectName(dashData.project?.name ?? "Project");
      } catch {
        setError("Network error loading drawdown requests.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/drawdown-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), description: desc || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateErr(data.error ?? "Failed to create request."); return; }
      setRequests((prev) => [data.request, ...prev]);
      setAmount("");
      setDesc("");
    } catch {
      setCreateErr("Network error.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAction(reqId: string, action: "approve" | "reject" | "withdraw") {
    setActioning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/drawdown-requests/${reqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes: reviewNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Action failed."); return; }
      setRequests((prev) => prev.map((r) => r.id === reqId ? data.request : r));
      if (action === "approve") setTotalApproved((t) => t + Number(data.request.amount));
      setActionId(null);
      setReviewNotes("");
    } catch {
      alert("Network error.");
    } finally {
      setActioning(false);
    }
  }

  if (loading) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: "rgba(13,17,68,0.4)" }}>Loading drawdown requests…</p>
      </div>
    </AppShell>
  );

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-3xl mx-auto">
        <Link href={`/projects/${projectId}`} className="text-xs font-medium transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>
          ← {projectName || "Project"}
        </Link>

        <div className="mt-4 mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Drawdown requests</h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
              Formal requests to transfer funds from Tier 2 bank PoF into the Tier 1 trust wallet.
            </p>
          </div>
          {totalApproved > 0 && (
            <div className="rounded-[16px] px-4 py-3 text-right" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(13,17,68,0.45)" }}>Total approved</p>
              <p className="text-lg font-bold" style={{ color: "#059669" }}>{gbp.format(totalApproved)}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Create form */}
        <div className="mb-6 rounded-[20px] px-5 py-5" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--brand-navy, #0D1144)" }}>New request</h2>
          {createErr && (
            <div className="mb-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
              <p className="text-xs text-red-600">{createErr}</p>
            </div>
          )}
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="w-40">
              <label className="block text-xs font-medium mb-1" style={{ color: "rgba(13,17,68,0.6)" }}>Amount (£)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="e.g. 50000"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }}
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium mb-1" style={{ color: "rgba(13,17,68,0.6)" }}>Description (optional)</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g. Month 3 programme draw"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }}
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-80"
              style={{ backgroundColor: "var(--brand-navy, #0D1144)", color: "#fff" }}
            >
              {creating ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </div>

        {/* Requests list */}
        {requests.length === 0 ? (
          <div className="rounded-[20px] px-6 py-10 text-center" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No drawdown requests yet.</p>
          </div>
        ) : (
          <div className="rounded-[20px] overflow-hidden" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            {requests.map((r, i) => {
              const style = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
              const isExpanded = actionId === r.id;
              return (
                <div key={r.id} style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}>
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-base font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                            {gbp.format(Number(r.amount))}
                          </p>
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: style.bg, color: style.color }}
                          >
                            {r.status}
                          </span>
                        </div>
                        {r.description && (
                          <p className="text-sm mb-1" style={{ color: "rgba(13,17,68,0.65)" }}>{r.description}</p>
                        )}
                        <p className="text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
                          {r.requester?.full_name ?? r.requester?.email ?? "Unknown"} · {fmtDate(r.created_at)}
                        </p>
                        {r.review_notes && (
                          <p className="mt-1 text-xs" style={{ color: "rgba(13,17,68,0.55)" }}>
                            Note: {r.review_notes}
                          </p>
                        )}
                      </div>

                      {r.status === "pending" && (
                        <button
                          onClick={() => setActionId(isExpanded ? null : r.id)}
                          className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl transition hover:opacity-80"
                          style={{ backgroundColor: "rgba(13,17,68,0.06)", color: "rgba(13,17,68,0.6)" }}
                        >
                          {isExpanded ? "Cancel" : "Review"}
                        </button>
                      )}
                    </div>

                    {/* Inline review panel */}
                    {isExpanded && (
                      <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                        <input
                          type="text"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Review notes (optional)"
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none mb-3"
                          style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(r.id, "approve")}
                            disabled={actioning}
                            className="rounded-xl px-3 py-1.5 text-sm font-semibold transition hover:opacity-80"
                            style={{ backgroundColor: "#059669", color: "#fff" }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(r.id, "reject")}
                            disabled={actioning}
                            className="rounded-xl px-3 py-1.5 text-sm font-semibold transition hover:opacity-80"
                            style={{ backgroundColor: "#dc2626", color: "#fff" }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAction(r.id, "withdraw")}
                            disabled={actioning}
                            className="rounded-xl px-3 py-1.5 text-sm font-medium transition hover:opacity-70"
                            style={{ backgroundColor: "rgba(13,17,68,0.06)", color: "rgba(13,17,68,0.6)" }}
                          >
                            Withdraw
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
