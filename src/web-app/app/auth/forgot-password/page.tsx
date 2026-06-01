"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
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
              Reset password
            </p>
          </div>
        </div>

        {sent ? (
          /* Success state */
          <div>
            <div
              className="mb-5 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)" }}
            >
              <span className="text-2xl" style={{ color: "#059669" }}>✓</span>
            </div>
            <h1 className="mb-2 text-xl font-semibold" style={{ color: "#0D1144" }}>Check your email</h1>
            <p className="mb-6 text-sm leading-relaxed" style={{ color: "rgba(13,17,68,0.6)" }}>
              We&apos;ve sent a password reset link to{" "}
              <span className="font-semibold" style={{ color: "#0D1144" }}>{email}</span>.
              The link expires in 1 hour.
            </p>
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
              Didn&apos;t receive it? Check your spam folder, or{" "}
              <button
                onClick={() => { setSent(false); setError(null); }}
                className="font-semibold underline"
                style={{ color: "#0D1144" }}
              >
                try again
              </button>.
            </p>
          </div>
        ) : (
          /* Form state */
          <>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight" style={{ color: "#0D1144" }}>
              Forgot your password?
            </h1>
            <p className="mb-7 text-sm" style={{ color: "rgba(13,17,68,0.6)" }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em]"
                  style={{ color: "rgba(13,17,68,0.55)" }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    border: "1px solid var(--surface-border, #e4e7f0)",
                    color: "#0D1144",
                    backgroundColor: "var(--surface-muted, #f7f8fc)",
                  }}
                  placeholder="you@yourcompany.com"
                />
              </div>

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
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-xs font-medium hover:underline"
            style={{ color: "rgba(13,17,68,0.5)" }}
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
