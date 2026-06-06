"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole, ROLE_LABELS } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_COLOR: Record<string, string> = {
  funder:     "#059669",
  developer:  "#2563eb",
  commercial: "#d97706",
  contractor: "#ea580c",
  consultant: "#7c3aed",
  admin:      "#dc2626",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail]     = useState<string>("");
  const [name, setName]       = useState<string>("");
  const [role, setRole]       = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>("not_started");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setEmail(user.email ?? "");
      setName(user.user_metadata?.full_name ?? "");
      setRole(getRole(user) as AppRole | null);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    fetch("/api/account/kyc")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.profile?.kyc_status) setKycStatus(d.profile.kyc_status); })
      .catch(() => {});
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/auth/login");
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f7f8fc" }}>
          <p className="text-sm text-neutral-400">Loading…</p>
        </div>
      </AppShell>
    );
  }

  const roleColor  = role ? (ROLE_COLOR[role] ?? "#94a3b8") : "#94a3b8";
  const roleLabel  = role ? (ROLE_LABELS[role] ?? role) : "No role";
  const initials   = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <div
        className="min-h-screen px-4 md:px-8 py-8"
        style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}
      >
        <div className="max-w-lg mx-auto space-y-4">

          {/* Profile card */}
          <div
            className="rounded-[20px] p-6"
            style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
                style={{ backgroundColor: roleColor }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p
                  className="text-lg font-bold truncate"
                  style={{ color: "var(--brand-navy, #0D1144)" }}
                >
                  {name || "—"}
                </p>
                <p className="text-sm truncate" style={{ color: "rgba(13,17,68,0.5)" }}>
                  {email}
                </p>
              </div>
            </div>

            {/* Role badge */}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "rgba(13,17,68,0.4)" }}>
                Platform role
              </p>
              <span
                className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
                style={{ backgroundColor: roleColor + "18", color: roleColor, border: `1px solid ${roleColor}33` }}
              >
                {roleLabel}
              </span>
            </div>
          </div>

          {/* KYC status banner */}
          {kycStatus !== "approved" && (
            <Link
              href="/account/setup/kyc"
              style={{ textDecoration: "none" }}
            >
              <div
                className="rounded-[20px] px-5 py-4 flex items-center justify-between"
                style={{
                  backgroundColor: kycStatus === "rejected"
                    ? "rgba(220,38,38,0.06)"
                    : kycStatus === "pending_review"
                    ? "rgba(37,99,235,0.06)"
                    : "rgba(217,119,6,0.06)",
                  border: `1px solid ${kycStatus === "rejected" ? "rgba(220,38,38,0.2)" : kycStatus === "pending_review" ? "rgba(37,99,235,0.15)" : "rgba(217,119,6,0.2)"}`,
                }}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: kycStatus === "rejected" ? "#dc2626" : kycStatus === "pending_review" ? "#2563eb" : "#d97706" }}>
                    {kycStatus === "rejected"
                      ? "Identity verification failed"
                      : kycStatus === "pending_review"
                      ? "Identity verification under review"
                      : "Identity verification required"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(13,17,68,0.5)" }}>
                    {kycStatus === "rejected"
                      ? "Contact support — your KYC submission was not approved."
                      : kycStatus === "pending_review"
                      ? "Your submission is being reviewed. Typically 1–2 business days."
                      : "Complete KYC to deposit funds and receive payments."}
                  </p>
                </div>
                <span style={{ color: "rgba(13,17,68,0.3)", fontSize: "18px" }}>›</span>
              </div>
            </Link>
          )}

          {/* Quick links */}
          <div
            className="rounded-[20px] overflow-hidden"
            style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}
          >
            <p className="px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.4)" }}>
              Navigate
            </p>
            {[
              { href: "/projects",         label: "My projects",  desc: "All projects you're assigned to" },
              { href: "/inbox",            label: "Inbox",        desc: "Notifications and actions" },
              { href: "/approvals",        label: "Sign-offs",    desc: "Pending approvals across all projects" },
              { href: "/audit-log",        label: "Audit log",    desc: "Immutable activity trail" },
              ...(role === "funder" || role === "admin"
                ? [{ href: "/account/payments", label: "My payments", desc: "Token distributions received from stage releases" }]
                : []),
              { href: "/settings",  label: "Settings",     desc: "Edit your name and password" },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between px-5 py-3.5 border-t transition hover:bg-neutral-50"
                style={{ borderColor: "var(--surface-border, #e4e7f0)" }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{label}</p>
                  <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{desc}</p>
                </div>
                <span style={{ color: "rgba(13,17,68,0.25)" }}>›</span>
              </Link>
            ))}

            {/* Admin-only links */}
            {(role === "admin" || role === "developer") && (
              <>
                <Link
                  href="/admin/users"
                  className="flex items-center justify-between px-5 py-3.5 border-t transition hover:bg-neutral-50"
                  style={{ borderColor: "var(--surface-border, #e4e7f0)" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>User management</p>
                    <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Manage roles and access</p>
                  </div>
                  <span style={{ color: "rgba(13,17,68,0.25)" }}>›</span>
                </Link>
                {role === "admin" && (
                  <>
                    <Link
                      href="/admin/company"
                      className="flex items-center justify-between px-5 py-3.5 border-t transition hover:bg-neutral-50"
                      style={{ borderColor: "var(--surface-border, #e4e7f0)" }}
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>Company settings</p>
                        <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Organisation details and preferences</p>
                      </div>
                      <span style={{ color: "rgba(13,17,68,0.25)" }}>›</span>
                    </Link>
                    <Link
                      href="/admin/compliance"
                      className="flex items-center justify-between px-5 py-3.5 border-t transition hover:bg-neutral-50"
                      style={{ borderColor: "var(--surface-border, #e4e7f0)" }}
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>Compliance queue</p>
                        <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>AML flags and KYC reviews</p>
                      </div>
                      <span style={{ color: "rgba(13,17,68,0.25)" }}>›</span>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full rounded-[20px] py-3.5 text-sm font-semibold transition disabled:opacity-50"
            style={{
              backgroundColor: "#fff",
              border: "1px solid var(--surface-border, #e4e7f0)",
              color: "rgba(13,17,68,0.55)",
            }}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>

        </div>
      </div>
    </AppShell>
  );
}
