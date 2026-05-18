"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import { getRole, ROLE_LABELS } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

const ROLE_PILL_COLOR: Record<string, string> = {
  funder:     "#34d399",
  developer:  "#60a5fa",
  contractor: "#fbbf24",
  commercial: "#a78bfa",
  consultant: "#fb923c",
  admin:      "#f87171",
};

type BadgeVariant = "light" | "dark";

/**
 * Reads the authenticated user from the live Supabase session and displays
 * their full name and role label.
 *
 * variant="light" → navy text on white (desktop app shell)
 * variant="dark"  → white text on dark surface (mobile screens)
 */
export default function AuthUserBadge({
  variant = "light",
}: {
  variant?: BadgeVariant;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Load initial session
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    // Keep in sync with auth state changes (sign in / sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!user) return null;

  const name = user.user_metadata?.full_name ?? user.email ?? "User";
  const role = getRole(user);
  const roleLabel = role ? (ROLE_LABELS[role as AppRole] ?? role) : "No role";

  if (variant === "dark") {
    const pillColor = role ? (ROLE_PILL_COLOR[role] ?? "#94a3b8") : "#94a3b8";
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{name}</p>
          <span
            className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
            style={{ backgroundColor: pillColor + "22", color: pillColor, border: `1px solid ${pillColor}44` }}
          >
            {roleLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{
          backgroundColor: "rgba(13,17,68,0.1)",
          color: "var(--brand-navy, #0D1144)",
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p
          className="truncate text-sm font-semibold"
          style={{ color: "var(--brand-navy, #0D1144)" }}
        >
          {name}
        </p>
        <p
          className="text-[11px] uppercase tracking-[0.16em]"
          style={{ color: "rgba(13,17,68,0.5)" }}
        >
          {roleLabel}
        </p>
      </div>
    </div>
  );
}

/**
 * Sign-out button. Posts to /auth/logout which calls supabase.auth.signOut()
 * server-side, clears the session cookie, and redirects to /auth/login.
 */
export function SignOutButton({ variant = "light" }: { variant?: BadgeVariant }) {
  return (
    <form action="/auth/logout" method="post">
      <button
        type="submit"
        className="rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
        style={
          variant === "dark"
            ? {
                border: "1px solid rgba(255,255,255,0.15)",
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.7)",
              }
            : {
                border: "1px solid var(--surface-border, #e4e7f0)",
                backgroundColor: "transparent",
                color: "rgba(13,17,68,0.55)",
              }
        }
      >
        Sign out
      </button>
    </form>
  );
}
