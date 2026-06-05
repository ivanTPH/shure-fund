"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const DEV_PROFILES = [
  { role: "funder",       label: "Funder",      email: "admin@harbourcapital.co.uk",    color: "#0D1144" },
  { role: "commercial",   label: "Commercial",  email: "maya.singh@shure.fund",         color: "#7c3a00" },
  { role: "contractor",   label: "Contractor",  email: "contracts@hawthornebuild.co.uk",color: "#1e5c3a" },
  { role: "professional", label: "Professional",email: "owen.blake@shure.fund",         color: "#1a3a6b" },
  { role: "treasury",     label: "Treasury",    email: "leah.mercer@shure.fund",        color: "#5b2a8a" },
  { role: "developer",    label: "Developer Co",email: "helen.grant@shure.fund",        color: "#7c5a00" },
] as const;

// Suspense wrapper required by Next.js 16 for pages using useSearchParams
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState<string | null>(null);

  /** Returns the role-appropriate home URL after successful sign-in */
  function roleHome(userRole: string | undefined): string {
    // If the caller had a specific destination (e.g. from a notification link),
    // honour it. Otherwise route to the projects list for all roles.
    if (redirectTo && redirectTo !== "/") return redirectTo;
    return "/projects";
  }

  async function signIn(emailVal: string, passwordVal: string) {
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: emailVal,
      password: passwordVal,
    });
    return { error: authError, user: data?.user ?? null };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError, user } = await signIn(email, password);
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.push(roleHome(user?.user_metadata?.role));
    router.refresh();
  }

  async function handleDevLogin(profileEmail: string, role: string) {
    setError(null);
    setDevLoading(role);

    // Try sign-in first; on failure auto-create the dev account
    const { error: signInError } = await signIn(profileEmail, "password123");
    if (!signInError) {
      router.push(roleHome(role));
      router.refresh();
      return;
    }

    // Account doesn't exist yet — create it with role metadata so the
    // handle_new_user trigger fires and seeds public.users + project_members
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: profileEmail,
      password: "password123",
      options: { data: { role } },
    });
    if (signUpError) {
      setError(signUpError.message);
      setDevLoading(null);
      return;
    }

    // Sign in with the newly-created account
    const { error: finalError } = await signIn(profileEmail, "password123");
    if (finalError) {
      setError(finalError.message);
      setDevLoading(null);
      return;
    }

    router.push(roleHome(role));
    router.refresh();
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
            <p
              className="text-base font-semibold tracking-[0.18em]"
              style={{ color: "var(--brand-navy-strong, #0D1144)" }}
            >
              SHURE.FUND
            </p>
            <p
              className="text-[11px] uppercase tracking-[0.22em]"
              style={{ color: "rgba(13,17,68,0.5)" }}
            >
              Secure sign in
            </p>
          </div>
        </div>

        <h1
          className="mb-1 text-2xl font-semibold tracking-tight"
          style={{ color: "var(--brand-navy, #0D1144)" }}
        >
          Welcome back
        </h1>
        <p className="mb-7 text-sm" style={{ color: "rgba(13,17,68,0.6)" }}>
          Sign in to access your projects and workflow.
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
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition focus:ring-2"
              style={{
                border: "1px solid var(--surface-border, #e4e7f0)",
                color: "var(--brand-navy, #0D1144)",
                backgroundColor: "var(--surface-muted, #f7f8fc)",
              }}
              placeholder="you@yourcompany.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em]"
              style={{ color: "rgba(13,17,68,0.55)" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
              style={{
                border: "1px solid var(--surface-border, #e4e7f0)",
                color: "var(--brand-navy, #0D1144)",
                backgroundColor: "var(--surface-muted, #f7f8fc)",
              }}
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#dc2626",
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{
              backgroundColor: "var(--brand-navy, #0D1144)",
              color: "var(--brand-white, #fff)",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium hover:underline"
            style={{ color: "rgba(13,17,68,0.5)" }}
          >
            Forgot your password?
          </Link>
        </div>

        <p
          className="mt-4 text-center text-xs"
          style={{ color: "rgba(13,17,68,0.45)" }}
        >
          Access is invitation-only. Contact your project administrator if you
          need an account.
        </p>
      </div>

      {/* Dev-only profile switcher */}
      {process.env.NODE_ENV === "development" && (
        <div
          className="mt-6 w-full max-w-sm rounded-[20px] p-5"
          style={{
            backgroundColor: "rgba(255,255,255,0.7)",
            border: "1px dashed rgba(13,17,68,0.2)",
          }}
        >
          <p
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "rgba(13,17,68,0.4)" }}
          >
            Dev — Quick sign in
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEV_PROFILES.map((p) => (
              <button
                key={p.email}
                onClick={() => handleDevLogin(p.email, p.role)}
                disabled={devLoading !== null}
                className="rounded-xl px-3 py-2.5 text-xs font-semibold transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: p.color,
                  color: "#fff",
                  opacity: devLoading === p.role ? 0.7 : undefined,
                }}
              >
                {devLoading === p.role ? "…" : p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
