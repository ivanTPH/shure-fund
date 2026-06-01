"use client";

/**
 * /account/setup
 *
 * Onboarding page for users who accepted an email invite.
 * Supabase creates the auth user and fires fn_handle_new_user on invite,
 * seeding public.users with the assigned role and an email-derived name.
 *
 * This page lets the new user:
 *   1. Set their full display name
 *   2. Set a password (invite sessions require a password to be set)
 *
 * On completion they are redirected to /projects.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { ROLE_LABELS } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

export default function AccountSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading]   = useState(true);
  const [userId, setUserId]     = useState("");
  const [email, setEmail]       = useState("");
  const [role, setRole]         = useState<AppRole | null>(null);

  const [name, setName]             = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
      setEmail(user.email ?? "");
      setRole((user.user_metadata?.role ?? null) as AppRole | null);
      // Pre-fill name from metadata if Supabase already has one
      const existing = user.user_metadata?.full_name ?? "";
      // Only pre-fill if it looks like a real name (not an email prefix)
      if (existing && !existing.includes("@")) setName(existing);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) { setError("Please enter your full name."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setSaving(true);
    try {
      // 1. Set password + update display name in auth metadata
      const { error: authErr } = await supabase.auth.updateUser({
        password,
        data: { full_name: trimmedName },
      });
      if (authErr) { setError(authErr.message); return; }

      // 2. Sync name to public.users
      const { error: dbErr } = await supabase
        .from("users")
        .update({ full_name: trimmedName })
        .eq("id", userId);
      if (dbErr) { setError(dbErr.message); return; }

      router.push("/projects");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Setting up your account…</p>
        </div>
      </AppShell>
    );
  }

  const inputStyle = {
    border: "1px solid var(--surface-border, #e4e7f0)",
    backgroundColor: "#fff",
    color: "var(--brand-navy, #0D1144)",
  } as const;

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-12 flex items-start justify-center">
        <div className="w-full max-w-md space-y-5">

          {/* Welcome header */}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>
              Welcome to Shure Fund
            </h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
              You&apos;ve been invited as a{" "}
              <span className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                {role ? (ROLE_LABELS[role] ?? role) : "team member"}
              </span>. Set your name and password to continue.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[20px] p-6 space-y-5"
            style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}
          >
            {/* Email — read only */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "rgba(13,17,68,0.4)" }}>
                Email
              </p>
              <p className="rounded-xl px-4 py-3 text-sm" style={{ ...inputStyle, backgroundColor: "rgba(13,17,68,0.04)", color: "rgba(13,17,68,0.5)" }}>
                {email}
              </p>
            </div>

            {/* Full name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "rgba(13,17,68,0.4)" }}>
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "rgba(13,17,68,0.4)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={inputStyle}
              />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "rgba(13,17,68,0.4)" }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                required
                minLength={8}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={inputStyle}
              />
            </div>

            {error && (
              <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl py-3 text-sm font-bold text-white transition disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
            >
              {saving ? "Setting up…" : "Complete setup"}
            </button>
          </form>

          <p className="text-xs text-center" style={{ color: "rgba(13,17,68,0.35)" }}>
            Already have a password?{" "}
            <a href="/auth/login" className="underline hover:opacity-70">Sign in instead</a>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
