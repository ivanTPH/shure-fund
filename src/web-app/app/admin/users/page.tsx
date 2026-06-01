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
  funder:     "#059669",
  developer:  "#2563eb",
  commercial: "#d97706",
  contractor: "#ea580c",
  consultant: "#7c3aed",
  admin:      "#dc2626",
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

  // Invite form
  const [showInvite, setShowInvite]     = useState(false);
  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviteRole, setInviteRole]     = useState("commercial");
  const [inviting, setInviting]         = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError]   = useState<string | null>(null);

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

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setInviting(true);
    try {
      const r = await fetch("/api/admin/invite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const d = await r.json();
      if (!r.ok) { setInviteError(d.error ?? "Failed to send invite."); return; }
      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("commercial");
    } catch {
      setInviteError("Network error — please try again.");
    } finally {
      setInviting(false);
    }
  }

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
      <div className="min-h-full px-4 md:px-8 py-8">
        <Link href="/" className="text-xs font-medium transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>
          ← Dashboard
        </Link>

        <div className="mt-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>User management</h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
              {users.length} user{users.length !== 1 ? "s" : ""} · {users.filter((u) => u.active).length} active
            </p>
          </div>
          <button
            onClick={() => { setShowInvite((v) => !v); setInviteError(null); setInviteSuccess(null); }}
            className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
          >
            {showInvite ? "Cancel" : "+ Invite user"}
          </button>
        </div>

        {/* Invite form */}
        {showInvite && (
          <form
            onSubmit={sendInvite}
            className="mb-6 max-w-lg rounded-[20px] p-5 space-y-3"
            style={{ border: "1px solid rgba(37,99,235,0.2)", backgroundColor: "rgba(37,99,235,0.04)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#2563eb" }}>
              Invite new user
            </p>
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.55)" }}>
              They&apos;ll receive an email with a link to set up their account. Role is assigned immediately.
            </p>

            <div className="grid md:grid-cols-2 gap-3">
              <input
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {inviteError && <p className="text-xs" style={{ color: "#dc2626" }}>{inviteError}</p>}
            {inviteSuccess && <p className="text-xs font-semibold" style={{ color: "#059669" }}>✓ {inviteSuccess}</p>}

            <button
              type="submit"
              disabled={inviting}
              className="w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
            >
              {inviting ? "Sending invite…" : "Send invite"}
            </button>
          </form>
        )}

        {/* Summary strip */}
        <div className="mb-6 grid grid-cols-3 md:grid-cols-6 gap-2">
          {ROLES.map((r) => {
            const color = ROLE_COLOR[r] ?? "#94a3b8";
            const count = roleCounts[r] ?? 0;
            const active = roleFilter === r;
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(active ? "all" : r)}
                className="rounded-2xl px-3 py-2 text-center transition"
                style={{
                  border: `1px solid ${active ? color + "55" : "var(--surface-border, #e4e7f0)"}`,
                  backgroundColor: active ? color + "12" : "#fff",
                }}
              >
                <p className="text-base font-bold" style={{ color: active ? color : "var(--brand-navy, #0D1144)" }}>{count}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: active ? color : "rgba(13,17,68,0.4)" }}>{r}</p>
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
            className="flex-1 max-w-sm rounded-2xl px-4 py-2 text-sm outline-none"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
          />
          {(search || roleFilter !== "all") && (
            <button
              onClick={() => { setSearch(""); setRoleFilter("all"); }}
              className="text-xs transition hover:opacity-70"
              style={{ color: "rgba(13,17,68,0.5)" }}
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
          </div>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading users…</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-[20px] overflow-hidden" style={{ border: "1px solid var(--surface-border, #e4e7f0)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-xs"
                    style={{ backgroundColor: "rgba(13,17,68,0.03)", borderBottom: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.45)" }}
                  >
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: "none" }}>
                  {filtered.map((u, i) => {
                    const color = ROLE_COLOR[u.role] ?? "#94a3b8";
                    const isSaving = saving === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-neutral-50 transition" style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : "none" }}>
                        <td className="px-5 py-3">
                          <p className="font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{u.full_name || "—"}</p>
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{u.email}</td>
                        <td className="px-5 py-3">
                          <select
                            value={u.role}
                            disabled={isSaving}
                            onChange={(e) => updateUser(u.id, { role: e.target.value })}
                            className="rounded-xl px-2 py-1 text-xs outline-none transition"
                            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color }}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => updateUser(u.id, { active: !u.active })}
                            disabled={isSaving}
                            className="rounded-xl px-3 py-1 text-xs font-semibold transition disabled:opacity-40"
                            style={{
                              backgroundColor: u.active ? "rgba(5,150,105,0.08)" : "rgba(107,114,128,0.08)",
                              color:           u.active ? "#059669" : "#6b7280",
                              border:          `1px solid ${u.active ? "rgba(5,150,105,0.2)" : "rgba(107,114,128,0.2)"}`,
                            }}
                          >
                            {isSaving ? "…" : u.active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
                          {fmt.format(new Date(u.created_at))}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm" style={{ color: "rgba(13,17,68,0.4)" }}>
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
                    style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>{u.full_name || "—"}</p>
                        <p className="text-xs truncate" style={{ color: "rgba(13,17,68,0.45)" }}>{u.email}</p>
                      </div>
                      <button
                        onClick={() => updateUser(u.id, { active: !u.active })}
                        disabled={isSaving}
                        className="shrink-0 rounded-xl px-2 py-1 text-xs font-semibold transition"
                        style={{
                          backgroundColor: u.active ? "rgba(5,150,105,0.08)" : "rgba(107,114,128,0.08)",
                          color:           u.active ? "#059669" : "#6b7280",
                          border:          `1px solid ${u.active ? "rgba(5,150,105,0.2)" : "rgba(107,114,128,0.2)"}`,
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
                        className="rounded-xl px-2 py-1 text-xs outline-none"
                        style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color }}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No users match the current filter.</p>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
