"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Member = {
  id: string;
  role: string;
  is_primary: boolean;
  notes: string | null;
  member:   { id: string; full_name: string; email: string; role: string } | null;
  delegate: { id: string; full_name: string; email: string } | null;
};

type User = { id: string; full_name: string; email: string; role: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_COLOR: Record<string, string> = {
  funder:     "#34d399",
  developer:  "#60a5fa",
  commercial: "#fbbf24",
  contractor: "#f97316",
  consultant: "#a78bfa",
  admin:      "#f87171",
};

const ALL_ROLES = ["funder", "developer", "commercial", "contractor", "consultant", "admin"];

const CAN_MANAGE: AppRole[] = ["admin", "developer"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectMembersPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [members, setMembers]   = useState<Member[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  // Add-member form
  const [adding, setAdding]             = useState(false);
  const [newUserId, setNewUserId]       = useState("");
  const [newRole, setNewRole]           = useState("commercial");
  const [newDelegatedTo, setNewDelegatedTo] = useState("");
  const [newNotes, setNewNotes]         = useState("");
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState<string | null>(null);

  async function loadMembers() {
    const r = await fetch(`/api/projects/${projectId}/members`);
    const d = await r.json();
    if (r.ok) setMembers(d.members ?? []);
    else setError(d.error ?? "Failed to load members.");
  }

  async function loadUsers() {
    const r = await fetch("/api/admin/users");
    const d = await r.json();
    if (r.ok) setAllUsers(d.users ?? []);
    // non-admin gets 403 — silently skip (add form just shows empty list)
  }

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) =>
      setUserRole(user ? getRole(user) as AppRole | null : null)
    );
    Promise.all([loadMembers(), loadUsers()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const canManage = !!userRole && CAN_MANAGE.includes(userRole);
  const assignedIds = new Set(members.map((m) => m.member?.id ?? ""));
  const availableUsers = allUsers.filter((u) => !assignedIds.has(u.id));

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserId) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userId:      newUserId,
          role:        newRole,
          delegatedTo: newDelegatedTo || undefined,
          notes:       newNotes || undefined,
        }),
      });
      if (res.ok) {
        setAdding(false);
        setNewUserId(""); setNewRole("commercial"); setNewDelegatedTo(""); setNewNotes("");
        await loadMembers();
      } else {
        const d = await res.json();
        setSaveError(d.error ?? "Failed to add member.");
      }
    } finally { setSaving(false); }
  }

  async function removeMember(userId: string) {
    await fetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: "DELETE" });
    await loadMembers();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "#0d1144" }}>
        <Link href={`/projects/${projectId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
          ← Back to project
        </Link>

        <div className="mt-4 mb-2 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Project team</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Assign team members and control their role on this project.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => { setAdding((v) => !v); setSaveError(null); }}
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {adding ? "Cancel" : "+ Add member"}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Add member form */}
        {adding && canManage && (
          <form
            onSubmit={addMember}
            className="mt-4 max-w-lg rounded-[20px] p-5 space-y-3"
            style={{ border: "1px solid rgba(96,165,250,0.25)", backgroundColor: "rgba(96,165,250,0.05)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">Add team member</p>

            {availableUsers.length === 0 ? (
              <p className="text-xs text-neutral-500">No additional users available. All users are already on this project, or you do not have permission to list users.</p>
            ) : (
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">Select user…</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            )}

            <div className="grid grid-cols-2 gap-2">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select
                value={newDelegatedTo}
                onChange={(e) => setNewDelegatedTo(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">No delegation</option>
                {allUsers.filter((u) => u.id !== newUserId).map((u) => (
                  <option key={u.id} value={u.id}>→ {u.full_name}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder="Notes (optional)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none"
            />

            {saveError && <p className="text-xs text-red-400">{saveError}</p>}

            <button
              type="submit"
              disabled={saving || !newUserId}
              className="w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.3)" }}
            >
              {saving ? "Adding…" : "Add to project"}
            </button>
          </form>
        )}

        {/* Members — desktop table */}
        {loading ? (
          <p className="mt-6 text-sm text-neutral-500">Loading…</p>
        ) : members.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-500">No team members assigned yet.</p>
        ) : (
          <div className="mt-6">
            {/* Desktop table */}
            <div className="hidden md:block rounded-[20px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-500 border-b border-white/8" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Project role</th>
                    <th className="px-5 py-3 font-medium">Delegate</th>
                    <th className="px-5 py-3 font-medium">Notes</th>
                    {canManage && <th className="px-5 py-3 font-medium"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.map((m) => {
                    const color = ROLE_COLOR[m.role] ?? "#94a3b8";
                    return (
                      <tr key={m.id} className="text-neutral-300 hover:bg-white/[0.02] transition">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{m.member?.full_name ?? "—"}</p>
                            {m.is_primary && (
                              <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold" style={{ backgroundColor: color + "22", color }}>
                                PRIMARY
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-neutral-400">{m.member?.email ?? "—"}</td>
                        <td className="px-5 py-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: color + "22", color, border: `1px solid ${color}33` }}
                          >
                            {m.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-neutral-400">{m.delegate?.full_name ?? "—"}</td>
                        <td className="px-5 py-3 text-xs text-neutral-500 italic">{m.notes ?? "—"}</td>
                        {canManage && (
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => removeMember(m.member?.id ?? "")}
                              className="text-xs text-neutral-600 hover:text-red-400 transition"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {members.map((m) => {
                const color = ROLE_COLOR[m.role] ?? "#94a3b8";
                return (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 rounded-2xl px-4 py-3"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white">{m.member?.full_name ?? "—"}</p>
                        {m.is_primary && (
                          <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold" style={{ backgroundColor: color + "22", color }}>PRIMARY</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">{m.member?.email}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{m.role}</p>
                      {m.delegate && <p className="mt-0.5 text-xs text-neutral-500">Delegate: {m.delegate.full_name}</p>}
                      {m.notes && <p className="mt-0.5 text-xs text-neutral-500 italic">{m.notes}</p>}
                    </div>
                    {canManage && (
                      <button
                        onClick={() => removeMember(m.member?.id ?? "")}
                        className="shrink-0 text-xs text-neutral-600 hover:text-red-400 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
