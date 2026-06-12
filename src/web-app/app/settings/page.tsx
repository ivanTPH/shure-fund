"use client";

/**
 * Settings — /settings
 *
 * Allows the current user to:
 *   1. Update their display name (synced to both auth metadata and public.users)
 *   2. Change their password
 *
 * Uses the browser Supabase client directly:
 *   - supabase.auth.updateUser() for auth metadata / password
 *   - supabase.from("users").update() for public.users (RLS: update own record)
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import type { NotificationPreference } from "@/app/api/notifications/preferences/route";

// Friendly labels for notification event types
const EVENT_TYPE_LABELS: Record<string, string> = {
  stage_status_changed:    "Stage status changes",
  evidence_submitted:      "Evidence submitted",
  evidence_reviewed:       "Evidence reviewed",
  approval_given:          "Approval given",
  approval_rejected:       "Approval rejected",
  approval_returned:       "Approval returned for changes",
  all_approvals_complete:  "All approvals complete",
  release_completed:       "Payment released",
  release_failed:          "Release failed",
  wallet_funded:           "Wallet top-up",
  dispute_opened:          "Dispute raised",
  dispute_resolved:        "Dispute resolved",
  variation_requested:     "Variation requested",
  variation_approved:      "Variation approved",
  kyc_submitted:           "KYC submitted",
  kyc_approved:            "KYC approved",
  kyc_rejected:            "KYC rejected",
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId]   = useState("");

  // Profile state
  const [email, setEmail]         = useState("");
  const [name, setName]           = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved]   = useState(false);

  // Password state
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError]   = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved]   = useState(false);

  // Notification preferences state
  const [prefs, setPrefs]           = useState<NotificationPreference[]>([]);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved]   = useState(false);
  const [prefsError, setPrefsError]   = useState<string | null>(null);

  const loadPrefs = useCallback(async () => {
    const res = await fetch("/api/notifications/preferences");
    if (res.ok) {
      const data = await res.json() as { preferences: NotificationPreference[] };
      setPrefs(data.preferences ?? []);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login?redirectTo=/settings"); return; }
      setUserId(user.id);
      setEmail(user.email ?? "");
      setName(user.user_metadata?.full_name ?? "");
      setLoading(false);
      loadPrefs();
    });
  }, [router, loadPrefs]);

  // ---------------------------------------------------------------------------
  // Save display name
  // ---------------------------------------------------------------------------
  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    setNameSaved(false);
    const trimmed = name.trim();
    if (!trimmed) { setNameError("Name cannot be empty."); return; }

    setNameSaving(true);
    try {
      const supabase = createClient();

      // 1. Update Supabase Auth metadata (so getUser() returns updated name)
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });
      if (authErr) { setNameError(authErr.message); return; }

      // 2. Sync to public.users (RLS allows user to update own row)
      const { error: dbErr } = await supabase
        .from("users")
        .update({ full_name: trimmed })
        .eq("id", userId);
      if (dbErr) { setNameError(dbErr.message); return; }

      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } finally {
      setNameSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Notification preferences
  // ---------------------------------------------------------------------------
  function togglePref(eventType: string, channel: "emailEnabled" | "pushEnabled") {
    setPrefs((prev) =>
      prev.map((p) =>
        p.eventType === eventType ? { ...p, [channel]: !p[channel] } : p,
      ),
    );
    setPrefsSaved(false);
  }

  async function handleSavePrefs(e: React.FormEvent) {
    e.preventDefault();
    setPrefsError(null);
    setPrefsSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setPrefsError(data.error ?? "Failed to save preferences."); return; }
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } finally {
      setPrefsSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Change password
  // ---------------------------------------------------------------------------
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match.");
      return;
    }

    setPwSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setPwError(error.message); return; }

      setPwSaved(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSaved(false), 4000);
    } finally {
      setPwSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--surface-muted,#f7f8fc)" }}>
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.4)" }}>Loading…</p>
        </div>
      </AppShell>
    );
  }

  const inputStyle = {
    border: "1px solid var(--surface-border,#e4e7f0)",
    color: "var(--brand-navy,#0D1144)",
    backgroundColor: "#fff",
  } as const;

  return (
    <AppShell>
      <div
        className="min-h-screen px-4 md:px-8 py-8"
        style={{ backgroundColor: "var(--surface-muted,#f7f8fc)" }}
      >
        <div className="max-w-lg mx-auto space-y-5">

          {/* Back */}
          <Link
            href="/account"
            className="inline-block text-xs font-medium transition hover:opacity-70"
            style={{ color: "rgba(13,17,68,0.5)" }}
          >
            ← Account
          </Link>

          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy,#0D1144)" }}>
            Settings
          </h1>

          {/* ── Display name ─────────────────────────────────────────────── */}
          <section
            className="rounded-[20px] p-6"
            style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border,#e4e7f0)" }}
          >
            <h2 className="text-sm font-bold mb-1" style={{ color: "var(--brand-navy,#0D1144)" }}>
              Display name
            </h2>
            <p className="text-xs mb-4" style={{ color: "rgba(13,17,68,0.45)" }}>
              Shown on approvals, evidence records, and the audit log.
            </p>

            {/* Email — read-only */}
            <div className="mb-4">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: "rgba(13,17,68,0.4)" }}
              >
                Email
              </p>
              <p
                className="rounded-xl px-4 py-3 text-sm"
                style={{ ...inputStyle, backgroundColor: "rgba(13,17,68,0.04)", color: "rgba(13,17,68,0.5)" }}
              >
                {email}
              </p>
            </div>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "rgba(13,17,68,0.4)" }}
                >
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameSaved(false); }}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={inputStyle}
                  placeholder="Your full name"
                  required
                />
              </div>

              {nameError && <p className="text-xs" style={{ color: "#dc2626" }}>{nameError}</p>}
              {nameSaved  && <p className="text-xs font-semibold" style={{ color: "#059669" }}>✓ Name updated</p>}

              <button
                type="submit"
                disabled={nameSaving}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-navy,#0D1144)" }}
              >
                {nameSaving ? "Saving…" : "Save name"}
              </button>
            </form>
          </section>

          {/* ── Change password ───────────────────────────────────────────── */}
          <section
            className="rounded-[20px] p-6"
            style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border,#e4e7f0)" }}
          >
            <h2 className="text-sm font-bold mb-1" style={{ color: "var(--brand-navy,#0D1144)" }}>
              Change password
            </h2>
            <p className="text-xs mb-4" style={{ color: "rgba(13,17,68,0.45)" }}>
              Must be at least 8 characters. You&apos;ll stay signed in on this device.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {(
                [
                  { label: "New password",     value: newPassword,     set: setNewPassword,     ph: "Min. 8 characters" },
                  { label: "Confirm password", value: confirmPassword, set: setConfirmPassword, ph: "Repeat new password" },
                ] as const
              ).map(({ label, value, set, ph }) => (
                <div key={label}>
                  <label
                    className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: "rgba(13,17,68,0.4)" }}
                  >
                    {label}
                  </label>
                  <input
                    type="password"
                    value={value}
                    onChange={(e) => { set(e.target.value); setPwSaved(false); }}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={inputStyle}
                    placeholder={ph}
                    required
                    minLength={8}
                  />
                </div>
              ))}

              {pwError && <p className="text-xs" style={{ color: "#dc2626" }}>{pwError}</p>}
              {pwSaved  && <p className="text-xs font-semibold" style={{ color: "#059669" }}>✓ Password changed — you&apos;re still signed in</p>}

              <button
                type="submit"
                disabled={pwSaving}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-navy,#0D1144)" }}
              >
                {pwSaving ? "Updating…" : "Change password"}
              </button>
            </form>
          </section>

          {/* ── Notification preferences ──────────────────────────────────── */}
          {prefs.length > 0 && (
            <section
              className="rounded-[20px] p-6"
              style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border,#e4e7f0)" }}
            >
              <h2 className="text-sm font-bold mb-1" style={{ color: "var(--brand-navy,#0D1144)" }}>
                Notification preferences
              </h2>
              <p className="text-xs mb-4" style={{ color: "rgba(13,17,68,0.45)" }}>
                Choose which events trigger email and push notifications.
              </p>

              <form onSubmit={handleSavePrefs}>
                {/* Column headers */}
                <div className="flex items-center justify-end gap-6 mb-2 pr-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest w-10 text-center" style={{ color: "rgba(13,17,68,0.4)" }}>Email</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest w-10 text-center" style={{ color: "rgba(13,17,68,0.4)" }}>Push</span>
                </div>

                <div className="space-y-1">
                  {prefs.map((pref) => (
                    <div
                      key={pref.eventType}
                      className="flex items-center justify-between rounded-[12px] px-3 py-2.5"
                      style={{ border: "1px solid var(--surface-border,#e4e7f0)", backgroundColor: "#fafafa" }}
                    >
                      <span className="text-sm" style={{ color: "var(--brand-navy,#0D1144)" }}>
                        {EVENT_TYPE_LABELS[pref.eventType] ?? pref.eventType}
                      </span>
                      <div className="flex items-center gap-6">
                        {/* Email toggle */}
                        <button
                          type="button"
                          onClick={() => togglePref(pref.eventType, "emailEnabled")}
                          className="relative h-5 w-9 rounded-full transition-colors"
                          style={{ backgroundColor: pref.emailEnabled ? "#0D1144" : "#d1d5db" }}
                          aria-label={`${pref.emailEnabled ? "Disable" : "Enable"} email for ${pref.eventType}`}
                        >
                          <span
                            className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                            style={{ transform: pref.emailEnabled ? "translateX(18px)" : "translateX(2px)" }}
                          />
                        </button>
                        {/* Push toggle */}
                        <button
                          type="button"
                          onClick={() => togglePref(pref.eventType, "pushEnabled")}
                          className="relative h-5 w-9 rounded-full transition-colors"
                          style={{ backgroundColor: pref.pushEnabled ? "#0D1144" : "#d1d5db" }}
                          aria-label={`${pref.pushEnabled ? "Disable" : "Enable"} push for ${pref.eventType}`}
                        >
                          <span
                            className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                            style={{ transform: pref.pushEnabled ? "translateX(18px)" : "translateX(2px)" }}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {prefsError && <p className="mt-3 text-xs" style={{ color: "#dc2626" }}>{prefsError}</p>}
                {prefsSaved  && <p className="mt-3 text-xs font-semibold" style={{ color: "#059669" }}>✓ Preferences saved</p>}

                <button
                  type="submit"
                  disabled={prefsSaving}
                  className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: "var(--brand-navy,#0D1144)" }}
                >
                  {prefsSaving ? "Saving…" : "Save preferences"}
                </button>
              </form>
            </section>
          )}

        </div>
      </div>
    </AppShell>
  );
}
