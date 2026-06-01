"use client";

/**
 * Account setup — shown to invited users after they click the invite link.
 * Lets them set a display name and password, then redirects to /projects.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function AccountSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail]         = useState("");
  const [role, setRole]           = useState("");
  const [fullName, setFullName]   = useState("");
  const [password, setPassword]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/auth/login"); return; }
      setEmail(user.email ?? "");
      setRole((user.user_metadata?.role as string) ?? "");
      setFullName((user.user_metadata?.full_name as string) ?? "");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (password && password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(null);
    setSaving(true);

    try {
      const updatePayload: { data: { full_name: string }; password?: string } = {
        data: { full_name: fullName.trim() },
      };
      if (password) updatePayload.password = password;

      const { error: authErr } = await supabase.auth.updateUser(updatePayload);
      if (authErr) { setError(authErr.message); return; }

      await fetch("/api/account", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ full_name: fullName.trim() }),
      });

      router.replace("/projects");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f7f8fc" }}>
        <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "#f7f8fc" }}>
      <div
        className="w-full max-w-md rounded-[24px] p-8 space-y-6"
        style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", boxShadow: "0 4px 24px rgba(13,17,68,0.06)" }}
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Welcome aboard</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
            Set up your account to get started.
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Email</p>
          <p className="text-sm font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{email}</p>
        </div>
        {role && (
          <div className="space-y-1">
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Role</p>
            <p className="text-sm font-medium capitalize" style={{ color: "var(--brand-navy, #0D1144)" }}>{role}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "rgba(13,17,68,0.6)" }}>
              Full name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "rgba(13,17,68,0.6)" }}>
              Password <span className="text-xs font-normal" style={{ color: "rgba(13,17,68,0.4)" }}>(min 8 chars)</span>
            </label>
            <input
              type="password"
              placeholder="Choose a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
            />
          </div>

          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
          >
            {saving ? "Saving…" : "Complete setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
