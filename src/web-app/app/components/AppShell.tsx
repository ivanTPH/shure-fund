"use client";

/**
 * AppShell — responsive navigation wrapper for all authenticated pages.
 *
 * Mobile  (< 768 px): content fills screen; bottom tab bar fixed at foot.
 * Desktop (≥ 768 px): fixed left sidebar 224 px; content scrolls beside it.
 *
 * Usage:
 *   <AppShell activeTab="projects">
 *     {children}
 *   </AppShell>
 */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AuthUserBadge, { SignOutButton } from "./AuthUserBadge";
import { createClient } from "@/lib/supabase/browser";

export type ShellTab = "inbox" | "projects" | "approvals" | "audit" | "account";

// ---------------------------------------------------------------------------
// SVG icons — inline, no external dependency
// ---------------------------------------------------------------------------

function InboxIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={active ? "currentColor" : "currentColor"} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function ProjectsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function AuditIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ApprovalsIcon({ active }: { active: boolean }) {
  void active;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AccountIcon({ active }: { active: boolean }) {
  void active;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Nav definition
// ---------------------------------------------------------------------------

const NAV: Array<{
  tab: ShellTab;
  label: string;
  href: string;
  Icon: (props: { active: boolean }) => React.ReactElement;
}> = [
  { tab: "inbox",     label: "Inbox",     href: "/inbox",     Icon: InboxIcon },
  { tab: "projects",  label: "Projects",  href: "/projects",  Icon: ProjectsIcon },
  { tab: "approvals", label: "Sign-offs", href: "/approvals", Icon: ApprovalsIcon },
  { tab: "audit",     label: "Audit",     href: "/audit-log", Icon: AuditIcon },
  { tab: "account",   label: "Account",   href: "/account",   Icon: AccountIcon },
];

// ---------------------------------------------------------------------------
// Shell component
// ---------------------------------------------------------------------------

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Initial load + Realtime subscription for unread badge
  const fetchUnread = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications");
      if (!r.ok) return;
      const d = await r.json();
      const count = (d.notifications ?? []).filter((n: { read: boolean }) => !n.read).length;
      setUnread(count);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const channel = supabase
        .channel(`shell:notifications:${user.id}`)
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => setUnread((c) => c + 1),
        )
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          // Re-fetch to get accurate count after mark-read
          () => fetchUnread(),
        )
        .subscribe();

      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function isActive(tab: ShellTab) {
    if (tab === "inbox")     return pathname.startsWith("/inbox") || pathname.startsWith("/activity");
    if (tab === "projects")  return pathname.startsWith("/projects");
    if (tab === "approvals") return pathname.startsWith("/approvals");
    if (tab === "audit")     return pathname.startsWith("/audit-log");
    if (tab === "account")   return pathname.startsWith("/account") || pathname.startsWith("/admin");
    return false;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex md:w-56 md:flex-col md:flex-shrink-0 md:border-r"
        style={{ backgroundColor: "#fff", borderColor: "var(--surface-border, #e4e7f0)" }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-5 py-4 border-b"
          style={{ borderColor: "var(--surface-border, #e4e7f0)" }}
        >
          <Image
            src="/brand/shure-fund-icon.png"
            alt="Shure.Fund"
            width={28} height={28}
            className="rounded-lg"
          />
          <span
            className="text-sm font-bold tracking-[0.18em] uppercase"
            style={{ color: "var(--brand-navy, #0D1144)" }}
          >
            Shure.Fund
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ tab, label, href, Icon }) => {
            const active = isActive(tab);
            const badge = tab === "inbox" ? unread : 0;
            return (
              <Link
                key={tab}
                href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? "var(--brand-navy, #0D1144)" : "transparent",
                  color: active ? "#fff" : "rgba(13,17,68,0.6)",
                }}
              >
                <span style={{ color: active ? "#fff" : "rgba(13,17,68,0.45)" }}>
                  <Icon active={active} />
                </span>
                {label}
                {badge > 0 && (
                  <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User strip */}
        <div
          className="px-4 py-3 border-t space-y-2"
          style={{ borderColor: "var(--surface-border, #e4e7f0)" }}
        >
          <AuthUserBadge variant="light" />
          <SignOutButton variant="light" />
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom tab bar ────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 md:hidden z-50 border-t"
        style={{ backgroundColor: "#fff", borderColor: "var(--surface-border, #e4e7f0)" }}
      >
        <div className="flex items-stretch">
          {NAV.map(({ tab, label, href, Icon }) => {
            const active = isActive(tab);
            const badge = tab === "inbox" ? unread : 0;
            return (
              <Link
                key={tab}
                href={href}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors"
                style={{ color: active ? "var(--brand-navy, #0D1144)" : "rgba(13,17,68,0.35)" }}
              >
                <Icon active={active} />
                {label}
                {badge > 0 && (
                  <span className="absolute top-1.5 right-[calc(50%-18px)] flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-black text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
