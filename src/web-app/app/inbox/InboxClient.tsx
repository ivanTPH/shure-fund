"use client";

/**
 * Inbox — unified action feed.
 *
 * Phase 9 upgrade: Supabase Realtime subscription on `notifications`
 * appends new items live. Server renders the initial list; the client
 * stays in sync without polling.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { createClient } from "@/lib/supabase/browser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Notification = {
  id: string;
  type: string;
  required_action: string | null;
  message: string;
  entity_name: string | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
  project_id: string | null;
  stage_id: string | null;
  contract_id: string | null;
};

// ---------------------------------------------------------------------------
// Language map — plain UK English
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<string, {
  label: string;
  needsAction: boolean;
  accent: string;
  dot: string;
}> = {
  payment_ready:       { label: "Release payment",           needsAction: true,  accent: "#34d399", dot: "£" },
  approval_required:   { label: "Sign-off needed",           needsAction: true,  accent: "#60a5fa", dot: "✓" },
  evidence_required:   { label: "Evidence needed",           needsAction: true,  accent: "#fbbf24", dot: "📎" },
  funding_gap:         { label: "Funds short",               needsAction: true,  accent: "#f87171", dot: "!" },
  variation_submitted: { label: "Contract change to review", needsAction: true,  accent: "#a78bfa", dot: "↕" },
  dispute_raised:      { label: "Dispute — payment held",    needsAction: true,  accent: "#f97316", dot: "⚠" },
  variation_approved:  { label: "Contract change approved",  needsAction: false, accent: "#34d399", dot: "✓" },
  variation_rejected:  { label: "Contract change rejected",  needsAction: false, accent: "#f87171", dot: "✗" },
  dispute_resolved:    { label: "Dispute sorted",            needsAction: false, accent: "#34d399", dot: "✓" },
};

const DEFAULT_CONFIG = { label: "Update", needsAction: false, accent: "#94a3b8", dot: "•" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const relFmt = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

function timeAgo(iso: string): string {
  const diff = Date.parse(iso) - Date.now();
  const mins = Math.round(diff / 60_000);
  const hrs  = Math.round(diff / 3_600_000);
  const days = Math.round(diff / 86_400_000);
  if (Math.abs(mins) < 60) return relFmt.format(mins, "minute");
  if (Math.abs(hrs) < 24)  return relFmt.format(hrs, "hour");
  return relFmt.format(days, "day");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InboxClient({ notifications: initial }: { notifications: Notification[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<"action" | "done">("action");
  const [search, setSearch] = useState("");
  const [liveCount, setLiveCount] = useState(0); // new items arrived since page load
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // ---------------------------------------------------------------------------
  // Realtime subscription
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const channel = supabase
        .channel(`inbox:${user.id}`)
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: { new: Notification }) => {
            setItems((prev) => {
              if (prev.some((n) => n.id === payload.new.id)) return prev;
              setLiveCount((c) => c + 1);
              return [payload.new, ...prev];
            });
          },
        )
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: { new: Notification }) => {
            setItems((prev) =>
              prev.map((n) => (n.id === payload.new.id ? payload.new : n))
            );
          },
        )
        .subscribe();

      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }

  async function handleTap(n: Notification) {
    if (!n.read) await markRead(n.id);
    if (n.action_url) router.push(n.action_url);
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // Filtered lists
  // ---------------------------------------------------------------------------

  const actionItems = useMemo(() =>
    items.filter((n) => {
      const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG;
      return (cfg.needsAction || !n.read) && !n.read;
    }),
  [items]);

  const doneItems = useMemo(() => items.filter((n) => n.read), [items]);

  const visible = useMemo(() => {
    const base = tab === "action" ? actionItems : doneItems;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((n) =>
      [n.entity_name, n.message, n.required_action, n.type].join(" ").toLowerCase().includes(q)
    );
  }, [tab, actionItems, doneItems, search]);

  const unreadCount = actionItems.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppShell>
      <div className="px-4 py-6 max-w-2xl mx-auto">

        {/* Live update banner */}
        {liveCount > 0 && (
          <div
            className="mb-4 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3"
            style={{ backgroundColor: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)" }}
          >
            <p className="text-xs font-semibold text-blue-300">
              {liveCount} new item{liveCount !== 1 ? "s" : ""} arrived
            </p>
            <button
              onClick={() => setLiveCount(0)}
              className="text-[10px] text-blue-400 hover:text-blue-200 transition"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Page heading */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--brand-navy, #0D1144)" }}
            >
              Inbox
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
              Everything that needs your attention
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="rounded-xl px-3 py-1.5 text-xs font-medium transition hover:opacity-70"
              style={{
                border: "1px solid var(--surface-border, #e4e7f0)",
                color: "rgba(13,17,68,0.55)",
                backgroundColor: "#fff",
              }}
            >
              Mark all done
            </button>
          )}
        </div>

        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by project, contract, or action…"
          className="mb-4 w-full rounded-xl px-4 py-2.5 text-sm outline-none"
          style={{
            border: "1px solid var(--surface-border, #e4e7f0)",
            backgroundColor: "#fff",
            color: "var(--brand-navy, #0D1144)",
          }}
        />

        {/* Tabs */}
        <div
          className="mb-4 flex rounded-2xl p-1"
          style={{ backgroundColor: "rgba(13,17,68,0.06)" }}
        >
          {(["action", "done"] as const).map((t) => {
            const labels: Record<typeof t, string> = {
              action: `Needs action${unreadCount > 0 ? ` · ${unreadCount}` : ""}`,
              done:   `Done · ${doneItems.length}`,
            };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 rounded-xl py-2 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: tab === t ? "#fff" : "transparent",
                  color: tab === t ? "var(--brand-navy, #0D1144)" : "rgba(13,17,68,0.45)",
                  boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* Item list */}
        {visible.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-3xl mb-2">{tab === "action" ? "✓" : "📭"}</p>
            <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>
              {tab === "action" ? "All clear" : "Nothing here yet"}
            </p>
            <p className="mt-1 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
              {tab === "action"
                ? "Nothing needs your attention right now."
                : "Items will appear here once you've dealt with them."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((n) => {
              const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG;
              const hasLink = !!n.action_url;

              return (
                <button
                  key={n.id}
                  onClick={() => handleTap(n)}
                  disabled={!hasLink}
                  className="w-full text-left rounded-[18px] px-4 py-4 transition"
                  style={{
                    backgroundColor: "#fff",
                    border: `1px solid ${n.read ? "var(--surface-border, #e4e7f0)" : cfg.accent + "44"}`,
                    boxShadow: n.read ? "none" : `0 0 0 3px ${cfg.accent}11`,
                    opacity: !hasLink ? 0.75 : 1,
                    cursor: hasLink ? "pointer" : "default",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-base font-bold"
                      style={{ backgroundColor: cfg.accent + "18", color: cfg.accent }}
                    >
                      {cfg.dot}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                        style={{ color: cfg.accent }}
                      >
                        {cfg.label}
                      </p>

                      {n.entity_name && (
                        <p
                          className="text-sm font-semibold leading-snug"
                          style={{ color: "var(--brand-navy, #0D1144)" }}
                        >
                          {n.entity_name}
                        </p>
                      )}

                      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "rgba(13,17,68,0.55)" }}>
                        {n.message}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[10px]" style={{ color: "rgba(13,17,68,0.35)" }}>
                          {timeAgo(n.created_at)}
                        </p>
                        {hasLink && !n.read && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wide"
                            style={{ color: cfg.accent }}
                          >
                            Tap to sort →
                          </span>
                        )}
                        {hasLink && n.read && (
                          <span className="text-[10px]" style={{ color: "rgba(13,17,68,0.3)" }}>
                            View →
                          </span>
                        )}
                      </div>
                    </div>

                    {!n.read && (
                      <div
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: cfg.accent }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
