"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLES = ["funder", "developer", "commercial", "contractor", "consultant", "admin"];

const ROLE_COLOR: Record<string, string> = {
  funder:     "#34d399",
  developer:  "#60a5fa",
  commercial: "#fbbf24",
  contractor: "#f97316",
  consultant: "#a78bfa",
  admin:      "#f87171",
};

const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState<string | null>(null);

  // Filters
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  async function load() {
    try {
      const r = await fetch("/api/admin/users");
      if (!r.ok) {
        const d = await r.json();
        setError(d.error ?? "Failed to load users.");
        return;
      }
      const d = await r.json();
      setUsers(d.users ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateUser(userId: string, patch: { role?: string; active?: boolean }) {
    setSaving(userId);
    try {
      const r = await fetch("/api/admin/users", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, ...patch }),
      });
      if (r.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...patch } : u));
      }
    } finally {
      setSaving(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (q && !u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) counts[u.role] = (counts[u.role] ?? 0) + 1;
    return counts;
  }, [users]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "#0d1144" }}>
        <Link href="/" className="text-xs font-medium text-neutral-400 hover:text-white">
          ← Dashboard
        </Link>

        <div className="mt-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">User management</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {users.length} user{users.length !== 1 ? "s" : ""} · {users.filter((u) => u.active).length} active
            </p>
          </div>
        </div>

        {/* Summary strip */}
        <div className="mb-6 grid grid-cols-3 md:grid-cols-6 gap-2">
          {ROLES.map((r) => {
            const color = ROLE_COLOR[r] ?? "#94a3b8";
            const count = roleCounts[r] ?? 0;
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(roleFilter === r ? "all" : r)}
                className="rounded-2xl px-3 py-2 text-center transition"
                style={{
                  border: `1px solid ${roleFilter === r ? color + "66" : "rgba(255,255,255,0.07)"}`,
                  backgroundColor: roleFilter === r ? color + "15" : "rgba(255,255,255,0.03)",
                }}
              >
                <p className="text-base font-bold" style={{ color: roleFilter === r ? color : "#e5e5e5" }}>{count}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: roleFilter === r ? color : "#6b7280" }}>{r}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="mb-4 flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-sm rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-neutral-600 outline-none"
          />
          {(search || roleFilter !== "all") && (
            <button
              onClick={() => { setSearch(""); setRoleFilter("all"); }}
              className="text-xs text-neutral-500 hover:text-white transition"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-neutral-500">Loading users…</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-[20px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-xs text-neutral-500 border-b border-white/8"
                    style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                  >
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((u) => {
                    const color = ROLE_COLOR[u.role] ?? "#94a3b8";
                    const isSaving = saving === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-5 py-3">
                          <p className="font-medium text-white">{u.full_name || "—"}</p>
                        </td>
                        <td className="px-5 py-3 text-xs text-neutral-400">{u.email}</td>
                        <td className="px-5 py-3">
                          <select
                            value={u.role}
                            disabled={isSaving}
                            onChange={(e) => updateUser(u.id, { role: e.target.value })}
                            className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none transition"
                            style={{ color }}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r} style={{ color: ROLE_COLOR[r] ?? "#94a3b8" }}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => updateUser(u.id, { active: !u.active })}
                            disabled={isSaving}
                            className="rounded-xl px-3 py-1 text-xs font-semibold transition disabled:opacity-40"
                            style={{
                              backgroundColor: u.active ? "rgba(52,211,153,0.12)" : "rgba(107,114,128,0.15)",
                              color:           u.active ? "#34d399" : "#6b7280",
                              border:          `1px solid ${u.active ? "rgba(52,211,153,0.25)" : "rgba(107,114,128,0.25)"}`,
                            }}
                          >
                            {isSaving ? "…" : u.active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-3 text-xs text-neutral-500">
                          {fmt.format(new Date(u.created_at))}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm text-neutral-500">
                        No users match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((u) => {
                const color = ROLE_COLOR[u.role] ?? "#94a3b8";
                const isSaving = saving === u.id;
                return (
                  <div
                    key={u.id}
                    className="rounded-2xl px-4 py-3"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{u.full_name || "—"}</p>
                        <p className="text-xs text-neutral-500 truncate">{u.email}</p>
                      </div>
                      <button
                        onClick={() => updateUser(u.id, { active: !u.active })}
                        disabled={isSaving}
                        className="shrink-0 rounded-xl px-2 py-1 text-xs font-semibold transition"
                        style={{
                          backgroundColor: u.active ? "rgba(52,211,153,0.12)" : "rgba(107,114,128,0.15)",
                          color:           u.active ? "#34d399" : "#6b7280",
                          border:          `1px solid ${u.active ? "rgba(52,211,153,0.25)" : "rgba(107,114,128,0.25)"}`,
                        }}
                      >
                        {isSaving ? "…" : u.active ? "Active" : "Inactive"}
                      </button>
                    </div>
                    <div className="mt-2">
                      <select
                        value={u.role}
                        disabled={isSaving}
                        onChange={(e) => updateUser(u.id, { role: e.target.value })}
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none"
                        style={{ color }}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-neutral-500">No users match the current filter.</p>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
