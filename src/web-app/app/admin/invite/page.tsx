"use client";

/**
 * /admin/invite — Invite a new user by email
 *
 * Admin: may invite any role.
 * Developer (Project Owner): may invite contractor, commercial, or consultant only.
 * All other roles: redirected to /projects.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";

const navy  = "var(--brand-navy, #0D1144)";
const muted = "rgba(13,17,68,0.45)";
const card  = { border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" } as const;

type AppRole = "admin" | "developer";

const ALL_ROLES = [
  { value: "funder",     label: "Funder" },
  { value: "developer",  label: "Project Owner" },
  { value: "commercial", label: "Commercial Manager" },
  { value: "contractor", label: "Contractor" },
  { value: "consultant", label: "Consultant / Professional" },
  { value: "admin",      label: "Admin" },
];

const DEVELOPER_ROLES = [
  { value: "commercial", label: "Commercial Manager" },
  { value: "contractor", label: "Contractor" },
  { value: "consultant", label: "Consultant / Professional" },
];

type SendState = "idle" | "sending" | "sent" | "error";

export default function AdminInvitePage() {
  const router = useRouter();
  const [callerRole, setCallerRole] = useState<AppRole | null>(null);
  const [email, setEmail]           = useState("");
  const [role, setRole]             = useState("commercial");
  const [sendState, setSendState]   = useState<SendState>("idle");
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const r = getRole(user);
      if (r !== "admin" && r !== "developer") { router.push("/projects"); return; }
      setCallerRole(r as AppRole);
      setRole(r === "developer" ? "commercial" : "commercial");
    });
  }, [router]);

  const availableRoles = callerRole === "admin" ? ALL_ROLES : DEVELOPER_ROLES;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSendState("sending");

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });

    if (res.ok) {
      setSendState("sent");
      setEmail("");
    } else {
      const body = await res.json().catch(() => ({ error: "Unknown error." })) as { error?: string };
      setErrorMsg(body.error ?? "Failed to send invite.");
      setSendState("error");
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
        <div className="max-w-lg mx-auto space-y-6">

          {/* Header */}
          <div>
            <Link
              href="/admin"
              className="text-xs font-semibold transition hover:opacity-70"
              style={{ color: muted }}
            >
              ← Platform overview
            </Link>
            <h1 className="mt-3 text-2xl font-bold" style={{ color: navy }}>Invite a user</h1>
            <p className="mt-1 text-sm" style={{ color: muted }}>
              Send an email invitation. The user sets their password on first sign-in.
            </p>
          </div>

          {/* Role restriction notice for developers */}
          {callerRole === "developer" && (
            <div
              className="rounded-[20px] px-5 py-4 text-sm"
              style={{ backgroundColor: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.2)", color: "#2563eb" }}
            >
              As a Project Owner you can invite contractors, commercial managers, and consultants.
              Contact an Admin to invite funders or other admins.
            </div>
          )}

          {/* Invite form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-[20px] px-6 py-6 space-y-5"
            style={card}
          >
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: muted }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-offset-1"
                style={{
                  border: "1px solid var(--surface-border, #e4e7f0)",
                  color: navy,
                  backgroundColor: "#fafafa",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: muted }}
              >
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-offset-1"
                style={{
                  border: "1px solid var(--surface-border, #e4e7f0)",
                  color: navy,
                  backgroundColor: "#fafafa",
                }}
              >
                {availableRoles.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {sendState === "error" && errorMsg && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
              >
                {errorMsg}
              </div>
            )}

            {sendState === "sent" && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ backgroundColor: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.25)", color: "#059669" }}
              >
                Invitation sent successfully.
              </div>
            )}

            <button
              type="submit"
              disabled={sendState === "sending" || !email.trim()}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: navy }}
            >
              {sendState === "sending" ? "Sending…" : "Send invitation"}
            </button>
          </form>

          {/* Admin quick links */}
          {callerRole === "admin" && (
            <div className="rounded-[20px] px-5 py-4" style={card}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: muted }}>
                Quick links
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Users list", href: "/admin/users" },
                  { label: "Compliance", href: "/admin/compliance" },
                  { label: "Analytics",  href: "/admin/analytics" },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                    style={{ backgroundColor: "rgba(13,17,68,0.05)", color: muted }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
