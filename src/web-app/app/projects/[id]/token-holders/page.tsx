"use client";

/**
 * Token holders — /projects/[id]/token-holders
 *
 * Trust co-beneficiaries who receive a proportional share of each stage
 * payment at the point of release.
 *
 * Read:   funder, developer, admin
 * Manage: developer, admin only
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import AppShell from "../../../components/AppShell";
import { Skeleton } from "../../../components/Skeleton";
import { useToast } from "../../../components/ToastContext";

// ── Types ──────────────────────────────────────────────────────────────────

type HolderUser = { id: string; full_name: string | null; email: string; role: string };

type Holder = {
  id: string;
  share_pct: number;
  label: string | null;
  created_at: string;
  user: HolderUser | null;
};

type Member = {
  member: { id: string; full_name: string | null; email: string; role: string } | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  funder:      "#2563eb",
  developer:   "#7c3aed",
  admin:       "#059669",
  contractor:  "#d97706",
  commercial:  "#94a3b8",
  consultant:  "#64748b",
  treasury:    "#0891b2",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function TokenHoldersPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [holders, setHolders]         = useState<Holder[]>([]);
  const [totalSharePct, setTotal]     = useState(0);
  const [members, setMembers]         = useState<Member[]>([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [canManage, setCanManage]     = useState(false);

  // Add form
  const [addUserId, setAddUserId]     = useState("");
  const [addSharePct, setAddSharePct] = useState("");
  const [addLabel, setAddLabel]       = useState("");
  const [addError, setAddError]       = useState<string | null>(null);
  const [adding, setAdding]           = useState(false);

  // Delete
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const role = user ? getRole(user) : null;
        setCanManage(role === "admin" || role === "developer");

        const [holdersRes, membersRes, dashRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/token-holders`),
          fetch(`/api/projects/${projectId}/members`),
          fetch(`/api/projects/${projectId}/dashboard`),
        ]);

        if (!holdersRes.ok) {
          const d = await holdersRes.json();
          setError(d.error ?? "Failed to load token holders.");
          return;
        }

        const [hData, mData, dData] = await Promise.all([
          holdersRes.json(),
          membersRes.json(),
          dashRes.json(),
        ]);

        setHolders(hData.holders ?? []);
        setTotal(hData.totalSharePct ?? 0);
        setMembers(mData.members ?? []);
        setProjectName(dData.project?.name ?? "Project");
      } catch {
        setError("Network error loading token holders.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/token-holders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:   addUserId,
          sharePct: parseFloat(addSharePct),
          label:    addLabel || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to add token holder."); return; }
      toast("Token holder added", "success");
      setHolders((prev) => [...prev, data.holder]);
      setTotal((prev) => prev + parseFloat(addSharePct));
      setAddUserId("");
      setAddSharePct("");
      setAddLabel("");
    } catch {
      setAddError("Network error.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(holderId: string, sharePct: number) {
    setDeletingId(holderId);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/token-holders/${holderId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setDeleteError(d.error ?? "Failed to remove holder.");
        return;
      }
      setHolders((prev) => prev.filter((h) => h.id !== holderId));
      setTotal((prev) => Math.max(0, prev - sharePct));
      toast("Token holder removed", "info");
    } finally {
      setDeletingId(null);
    }
  }

  // Members not yet holding tokens
  const holderUserIds = new Set(holders.map((h) => h.user?.id));
  const eligibleMembers = members.filter((m) => m.member && !holderUserIds.has(m.member.id));

  const pctColor = totalSharePct >= 100 ? "#059669" : totalSharePct > 75 ? "#d97706" : "#2563eb";

  if (loading) return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-3xl mx-auto">
        <Skeleton.CardList />
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-3xl mx-auto">
        <Link
          href={`/projects/${projectId}`}
          className="text-xs font-medium transition hover:opacity-70"
          style={{ color: "rgba(13,17,68,0.5)" }}
        >
          ← {projectName || "Project"}
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Token holders</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
            Trust co-beneficiaries who receive a proportional share of each stage payment at release.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Allocation bar */}
        <div
          className="mb-6 rounded-[20px] px-5 py-4"
          style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(13,17,68,0.45)" }}>
              Total allocation
            </p>
            <p className="text-sm font-bold" style={{ color: pctColor }}>
              {totalSharePct.toFixed(2)}% of 100%
            </p>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "rgba(13,17,68,0.07)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, totalSharePct)}%`, backgroundColor: pctColor }}
            />
          </div>
          {totalSharePct < 100 && (
            <p className="mt-1.5 text-[10px]" style={{ color: "rgba(13,17,68,0.4)" }}>
              {(100 - totalSharePct).toFixed(2)}% unallocated — payments to this share go to the project wallet
            </p>
          )}
        </div>

        {/* Holders table */}
        <div
          className="rounded-[20px] overflow-hidden mb-6"
          style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
        >
          {holders.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No token holders registered yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}>
                  {["Name", "Role", "Label", "Share"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${i === 3 ? "text-right" : "text-left"}${i === 1 || i === 2 ? " hidden md:table-cell" : ""}`}
                      style={{ color: "rgba(13,17,68,0.45)" }}
                    >
                      {h}
                    </th>
                  ))}
                  {canManage && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {holders.map((h, i) => {
                  const roleColor = ROLE_COLORS[h.user?.role ?? ""] ?? "#94a3b8";
                  return (
                    <tr
                      key={h.id}
                      style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>
                          {h.user?.full_name ?? "Unknown"}
                        </p>
                        <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{h.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: roleColor + "18", color: roleColor }}
                        >
                          {h.user?.role ?? "—"}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs hidden md:table-cell"
                        style={{ color: "rgba(13,17,68,0.55)" }}
                      >
                        {h.label ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                        {Number(h.share_pct).toFixed(2)}%
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          {confirmingId === h.id ? (
                            <span className="inline-flex items-center gap-2">
                              <button
                                onClick={() => { setConfirmingId(null); handleDelete(h.id, Number(h.share_pct)); }}
                                disabled={deletingId === h.id}
                                className="text-xs font-semibold px-2 py-1 rounded-lg transition hover:opacity-70"
                                style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#dc2626" }}
                              >
                                {deletingId === h.id ? "…" : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmingId(null)}
                                className="text-xs transition hover:opacity-70"
                                style={{ color: "rgba(13,17,68,0.4)" }}
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmingId(h.id)}
                              className="text-xs font-medium px-2 py-1 rounded-lg transition hover:opacity-70"
                              style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626" }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {deleteError && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm text-red-600">{deleteError}</p>
          </div>
        )}

        {/* Add form (admin / developer only) */}
        {canManage && (
          <div
            className="rounded-[20px] px-5 py-5"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--brand-navy, #0D1144)" }}>
              Add token holder
            </h2>

            {addError && (
              <div className="mb-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                <p className="text-xs text-red-600">{addError}</p>
              </div>
            )}

            {totalSharePct >= 100 ? (
              <p className="text-sm" style={{ color: "#059669" }}>
                All 100% has been allocated — no capacity to add more holders.
              </p>
            ) : eligibleMembers.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>
                All project members are already token holders.
              </p>
            ) : (
              <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium mb-1" style={{ color: "rgba(13,17,68,0.6)" }}>
                    Project member
                  </label>
                  <select
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    required
                    className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)", backgroundColor: "#fff" }}
                  >
                    <option value="">Select member…</option>
                    {eligibleMembers.map((m) => (
                      <option key={m.member!.id} value={m.member!.id}>
                        {m.member!.full_name ?? m.member!.email} ({m.member!.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-28">
                  <label className="block text-xs font-medium mb-1" style={{ color: "rgba(13,17,68,0.6)" }}>
                    Share %
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max={100 - totalSharePct}
                    step="0.01"
                    value={addSharePct}
                    onChange={(e) => setAddSharePct(e.target.value)}
                    required
                    placeholder="e.g. 25"
                    className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }}
                  />
                </div>

                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium mb-1" style={{ color: "rgba(13,17,68,0.6)" }}>
                    Label (optional)
                  </label>
                  <input
                    type="text"
                    value={addLabel}
                    onChange={(e) => setAddLabel(e.target.value)}
                    placeholder="e.g. Senior tranche"
                    className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={adding}
                  className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-80"
                  style={{ backgroundColor: "var(--brand-navy, #0D1144)", color: "#fff" }}
                >
                  {adding ? "Adding…" : "Add holder"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
