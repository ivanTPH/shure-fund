"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Member = {
  id: string;
  role: string;
  is_primary: boolean;
  notes: string | null;
  member: { id: string; full_name: string; email: string; role: string } | null;
  delegate: { id: string; full_name: string; email: string } | null;
};

type User = { id: string; full_name: string; email: string; role: string };

const ROLE_COLOR: Record<string, string> = {
  funder: "#34d399", developer: "#60a5fa", commercial: "#fbbf24",
  contractor: "#f97316", consultant: "#a78bfa", admin: "#f87171",
};

export default function ProjectMembersPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("commercial");
  const [newDelegatedTo, setNewDelegatedTo] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadMembers() {
    const r = await fetch(`/api/projects/${projectId}/members`);
    const d = await r.json();
    if (r.ok) setMembers(d.members ?? []);
    else setError(d.error);
  }

  async function loadUsers() {
    const r = await fetch("/api/admin/users");
    const d = await r.json();
    if (r.ok) setAllUsers(d.users ?? []);
  }

  useEffect(() => {
    Promise.all([loadMembers(), loadUsers()]).finally(() => setLoading(false));
  }, [projectId]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newUserId,
          role: newRole,
          delegatedTo: newDelegatedTo || undefined,
          notes: newNotes || undefined,
        }),
      });
      if (res.ok) {
        setAdding(false);
        setNewUserId(""); setNewRole("commercial"); setNewDelegatedTo(""); setNewNotes("");
        await loadMembers();
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to add member");
      }
    } finally { setSaving(false); }
  }

  async function removeMember(userId: string) {
    await fetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: "DELETE" });
    await loadMembers();
  }

  const assignedIds = new Set(members.map((m) => m.member?.id ?? ""));
  const availableUsers = allUsers.filter((u) => !assignedIds.has(u.id));

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link href={`/projects/${projectId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
        ← Back to project
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Project team</h1>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          {adding ? "Cancel" : "+ Add member"}
        </button>
      </div>

      <p className="mt-1 text-sm text-neutral-400">
        Assign team members to this project. Their role determines what notifications they receive and what actions they can take.
      </p>

      {error && (
        <p className="mt-4 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </p>
      )}

      {/* Add member form */}
      {adding && (
        <form onSubmit={addMember} className="mt-4 max-w-lg rounded-[20px] p-5 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Add team member</p>

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

          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          >
            {["funder", "developer", "commercial", "contractor", "consultant", "admin"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={newDelegatedTo}
            onChange={(e) => setNewDelegatedTo(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">No delegation (primary contact)</option>
            {allUsers.filter((u) => u.id !== newUserId).map((u) => (
              <option key={u.id} value={u.id}>Delegate to: {u.full_name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Notes (optional)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none"
          />

          <button
            type="submit"
            disabled={saving || !newUserId}
            className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            {saving ? "Adding…" : "Add to project"}
          </button>
        </form>
      )}

      {/* Members list */}
      {loading ? (
        <p className="mt-6 text-sm text-neutral-500">Loading…</p>
      ) : (
        <div className="mt-6 max-w-lg space-y-2">
          {members.length === 0 && <p className="text-sm text-neutral-500">No team members assigned yet.</p>}
          {members.map((m) => {
            const color = ROLE_COLOR[m.role] ?? "#94a3b8";
            return (
              <div key={m.id} className="flex items-start gap-3 rounded-2xl px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{m.member?.full_name ?? "—"}</p>
                    {m.is_primary && (
                      <span className="text-[10px] rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: color + "22", color }}>PRIMARY</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">{m.member?.email}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{m.role}</p>
                  {m.delegate && (
                    <p className="mt-0.5 text-xs text-neutral-500">Delegated to: {m.delegate.full_name}</p>
                  )}
                  {m.notes && <p className="mt-0.5 text-xs text-neutral-500 italic">{m.notes}</p>}
                </div>
                <button
                  onClick={() => removeMember(m.member?.id ?? "")}
                  className="shrink-0 text-xs text-neutral-600 hover:text-red-400 transition"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
