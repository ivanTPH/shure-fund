"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/projects"), 2500);
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
      style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}
    >
      <div
        className="w-full max-w-sm rounded-[28px] bg-white p-8 shadow-sm"
        style={{ border: "1px solid var(--surface-border, #e4e7f0)" }}
      >
        {/* Brand mark */}
        <div className="mb-8 flex items-center gap-3">
          <Image
            src="/brand/shure-fund-icon.png"
            alt="Shure.Fund"
            width={40}
            height={40}
            className="h-10 w-10 rounded-[12px]"
            priority
          />
          <div>
            <p className="text-base font-semibold tracking-[0.18em]" style={{ color: "#0D1144" }}>
              SHURE.FUND
            </p>
            <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "rgba(13,17,68,0.5)" }}>
              New password
            </p>
          </div>
        </div>

        {done ? (
          <div>
            <div
              className="mb-5 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)" }}
            >
              <span className="text-2xl" style={{ color: "#059669" }}>✓</span>
            </div>
            <h1 className="mb-2 text-xl font-semibold" style={{ color: "#0D1144" }}>Password updated</h1>
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.6)" }}>
              Your password has been changed. Taking you to your projects…
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight" style={{ color: "#0D1144" }}>
              Set new password
            </h1>
            <p className="mb-7 text-sm" style={{ color: "rgba(13,17,68,0.6)" }}>
              Choose a strong password for your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em]"
                  style={{ color: "rgba(13,17,68,0.55)" }}
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoFocus
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    border: "1px solid var(--surface-border, #e4e7f0)",
                    color: "#0D1144",
                    backgroundColor: "var(--surface-muted, #f7f8fc)",
                  }}
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em]"
                  style={{ color: "rgba(13,17,68,0.55)" }}
                >
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    border: "1px solid var(--surface-border, #e4e7f0)",
                    color: "#0D1144",
                    backgroundColor: "var(--surface-muted, #f7f8fc)",
                  }}
                  placeholder="Repeat your new password"
                />
              </div>

              {/* Strength hint */}
              {password.length > 0 && (
                <p
                  className="text-xs"
                  style={{ color: password.length >= 8 ? "#059669" : "#ea580c" }}
                >
                  {password.length >= 8 ? "✓ Good length" : `${8 - password.length} more character${8 - password.length !== 1 ? "s" : ""} needed`}
                </p>
              )}

              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#0D1144" }}
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="text-xs font-medium hover:underline"
                style={{ color: "rgba(13,17,68,0.5)" }}
              >
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
