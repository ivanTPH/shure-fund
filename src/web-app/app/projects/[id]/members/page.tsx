"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { Skeleton } from "../../../components/Skeleton";
import { useToast } from "../../../components/ToastContext";
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

const ROLE_LABELS: Record<string, string> = {
  funder:     "Funder",
  developer:  "Project Owner",
  commercial: "Commercial",
  contractor: "Contractor",
  consultant: "Consultant",
  admin:      "Admin",
};

const ROLE_COLOR: Record<string, string> = {
  funder:     "#059669",
  developer:  "#2563eb",
  commercial: "#d97706",
  contractor: "#ea580c",
  consultant: "#7c3aed",
  admin:      "#dc2626",
};

const ALL_ROLES = ["funder", "developer", "commercial", "contractor", "consultant", "admin"];

const CAN_MANAGE: AppRole[] = ["admin", "developer"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectMembersPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { toast } = useToast();

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

  // Inline remove confirmation
  const [confirmingMemberId, setConfirmingMemberId] = useState<string | null>(null);

  // Invite-new-user form
  const [inviting, setInviting]         = useState(false);
  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviteRole, setInviteRole]     = useState("contractor");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError]   = useState<string | null>(null);

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
        toast("Member added to project", "success");
        await loadMembers();
      } else {
        const d = await res.json();
        setSaveError(d.error ?? "Failed to add member.");
      }
    } finally { setSaving(false); }
  }

  async function removeMember(userId: string) {
    const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: "DELETE" });
    if (res.ok) toast("Member removed", "info");
    await loadMembers();
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setInviteSending(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const d = await res.json();
      if (res.ok) {
        setInviteSuccess(`Invite sent to ${inviteEmail.trim()}. They will receive an email to set up their account.`);
        toast(`Invite sent to ${inviteEmail.trim()}`, "success");
        setInviteEmail("");
        setInviteRole("contractor");
        await loadUsers();
      } else {
        setInviteError(d.error ?? "Failed to send invite.");
      }
    } catch {
      setInviteError("Network error — please try again.");
    } finally {
      setInviteSending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppShell>
      <div className="min-h-full px-4 md:px-8 py-8">
        <Link href={`/projects/${projectId}`} className="text-xs font-medium transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>
          ← Back to project
        </Link>

        <div className="mt-4 mb-2 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Project team</h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
              Assign team members and control their role on this project.
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setInviting((v) => !v); setAdding(false); setInviteError(null); setInviteSuccess(null); }}
                className="rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-80"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.65)", backgroundColor: "#fff" }}
              >
                {inviting ? "Cancel invite" : "✉ Invite new user"}
              </button>
              <button
                onClick={() => { setAdding((v) => !v); setInviting(false); setSaveError(null); }}
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
              >
                {adding ? "Cancel" : "+ Add member"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
          </div>
        )}

        {/* Invite new user form */}
        {inviting && canManage && (
          <form
            onSubmit={sendInvite}
            className="mt-4 max-w-lg rounded-[20px] p-5 space-y-3"
            style={{ border: "1px solid rgba(37,99,235,0.2)", backgroundColor: "rgba(37,99,235,0.04)" }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#2563eb" }}>Invite a new user</p>
              <p className="mt-1 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
                They will receive an email to set up their account. Once registered, add them to this project using the "+ Add member" button.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                required
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="col-span-2 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              >
                {(userRole === "admin"
                  ? ALL_ROLES
                  : ["contractor", "commercial", "consultant"]
                ).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={inviteSending || !inviteEmail.trim()}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
              >
                {inviteSending ? "Sending…" : "Send invite"}
              </button>
            </div>

            {inviteSuccess && (
              <div className="rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)" }}>
                <p className="text-xs" style={{ color: "#059669" }}>{inviteSuccess}</p>
              </div>
            )}
            {inviteError && <p className="text-xs" style={{ color: "#dc2626" }}>{inviteError}</p>}
          </form>
        )}

        {/* Add member form */}
        {adding && canManage && (
          <form
            onSubmit={addMember}
            className="mt-4 max-w-lg rounded-[20px] p-5 space-y-3"
            style={{ border: "1px solid rgba(37,99,235,0.2)", backgroundColor: "rgba(37,99,235,0.04)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#2563eb" }}>Add team member</p>

            {availableUsers.length === 0 ? (
              <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>No additional users available. All users are already on this project, or you do not have permission to list users.</p>
            ) : (
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                required
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              >
                <option value="">Select user…</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({ROLE_LABELS[u.role] ?? u.role})</option>
                ))}
              </select>
            )}

            <div className="grid grid-cols-2 gap-2">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>

              <select
                value={newDelegatedTo}
                onChange={(e) => setNewDelegatedTo(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
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
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
            />

            {saveError && <p className="text-xs" style={{ color: "#dc2626" }}>{saveError}</p>}

            <button
              type="submit"
              disabled={saving || !newUserId}
              className="w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
            >
              {saving ? "Adding…" : "Add to project"}
            </button>
          </form>
        )}

        {/* Members — desktop table */}
        {loading ? (
          <div className="mt-6"><Skeleton.CardList rows={3} /></div>
        ) : members.length === 0 ? (
          <div className="mt-6 rounded-[20px] px-6 py-10 text-center" style={{ border: "1px dashed var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            <p className="text-sm font-medium" style={{ color: "rgba(13,17,68,0.6)" }}>No team members assigned yet.</p>
            <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>Add contractors, consultants and other stakeholders to this project.</p>
            {canManage && (
              <Link
                href="/admin/invite"
                className="mt-3 inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                style={{ backgroundColor: "var(--brand-navy, #0D1144)", color: "#fff" }}
              >
                Invite a member
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-6">
            {/* Desktop table */}
            <div className="hidden md:block rounded-[20px] overflow-hidden" style={{ border: "1px solid var(--surface-border, #e4e7f0)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs" style={{ backgroundColor: "rgba(13,17,68,0.03)", borderBottom: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.45)" }}>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Project role</th>
                    <th className="px-5 py-3 font-medium">Delegate</th>
                    <th className="px-5 py-3 font-medium">Notes</th>
                    {canManage && <th className="px-5 py-3 font-medium"></th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => {
                    const color = ROLE_COLOR[m.role] ?? "#94a3b8";
                    return (
                      <tr key={m.id} className="hover:bg-neutral-50 transition" style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : "none" }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{m.member?.full_name ?? "—"}</p>
                            {m.is_primary && (
                              <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold" style={{ backgroundColor: color + "22", color }}>
                                PRIMARY
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{m.member?.email ?? "—"}</td>
                        <td className="px-5 py-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: color + "22", color, border: `1px solid ${color}33` }}
                          >
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{m.delegate?.full_name ?? "—"}</td>
                        <td className="px-5 py-3 text-xs italic" style={{ color: "rgba(13,17,68,0.4)" }}>{m.notes ?? "—"}</td>
                        {canManage && (
                          <td className="px-5 py-3 text-right">
                            {confirmingMemberId === m.member?.id ? (
                              <span className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setConfirmingMemberId(null); removeMember(m.member?.id ?? ""); }}
                                  className="text-xs font-semibold transition hover:opacity-70"
                                  style={{ color: "#dc2626" }}
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmingMemberId(null)}
                                  className="text-xs transition hover:opacity-70"
                                  style={{ color: "rgba(13,17,68,0.35)" }}
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmingMemberId(m.member?.id ?? "")}
                                className="text-xs transition hover:opacity-70"
                                style={{ color: "rgba(13,17,68,0.35)" }}
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
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {members.map((m) => {
                const color = ROLE_COLOR[m.role] ?? "#94a3b8";
                return (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 rounded-2xl px-4 py-3"
                    style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{m.member?.full_name ?? "—"}</p>
                        {m.is_primary && (
                          <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold" style={{ backgroundColor: color + "22", color }}>PRIMARY</span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{m.member?.email}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{ROLE_LABELS[m.role] ?? m.role}</p>
                      {m.delegate && <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Delegate: {m.delegate.full_name}</p>}
                      {m.notes && <p className="mt-0.5 text-xs italic" style={{ color: "rgba(13,17,68,0.4)" }}>{m.notes}</p>}
                    </div>
                    {canManage && (
                      confirmingMemberId === m.member?.id ? (
                        <div className="shrink-0 flex flex-col gap-1 items-end">
                          <button
                            onClick={() => { setConfirmingMemberId(null); removeMember(m.member?.id ?? ""); }}
                            className="text-xs font-semibold transition hover:opacity-70"
                            style={{ color: "#dc2626" }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmingMemberId(null)}
                            className="text-xs transition hover:opacity-70"
                            style={{ color: "rgba(13,17,68,0.35)" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingMemberId(m.member?.id ?? "")}
                          className="shrink-0 text-xs transition hover:opacity-70"
                          style={{ color: "rgba(13,17,68,0.35)" }}
                        >
                          Remove
                        </button>
                      )
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
