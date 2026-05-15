"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
};

const ROLES = ["funder", "developer", "commercial", "contractor", "consultant", "admin"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/admin/users");
      if (!r.ok) { const d = await r.json(); setError(d.error ?? "Failed to load users"); return; }
      const d = await r.json();
      setUsers(d.users);
    } catch { setError("Network error"); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function updateUser(userId: string, patch: { role?: string; active?: boolean }) {
    setSaving(userId);
    try {
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...patch }),
      });
      if (r.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...patch } : u));
      }
    } finally { setSaving(null); }
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link href="/" className="text-xs font-medium text-neutral-400 hover:text-white">← Dashboard</Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">User management</h1>
      </div>

      {loading && <p className="mt-6 text-sm text-neutral-500">Loading…</p>}
      {error && (
        <p className="mt-6 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="mt-6 max-w-2xl space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{u.full_name || "—"}</p>
                <p className="truncate text-xs text-neutral-500">{u.email}</p>
              </div>

              <select
                value={u.role}
                disabled={saving === u.id}
                onChange={(e) => updateUser(u.id, { role: e.target.value })}
                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>

              <button
                onClick={() => updateUser(u.id, { active: !u.active })}
                disabled={saving === u.id}
                className="shrink-0 rounded-xl px-2 py-1 text-xs font-semibold transition disabled:opacity-50"
                style={{
                  backgroundColor: u.active ? "rgba(52,211,153,0.12)" : "rgba(107,114,128,0.15)",
                  color: u.active ? "#34d399" : "#6b7280",
                  border: `1px solid ${u.active ? "rgba(52,211,153,0.25)" : "rgba(107,114,128,0.25)"}`,
                }}
              >
                {u.active ? "Active" : "Inactive"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
