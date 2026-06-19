"use client";

/**
 * Inbox — unified action feed.
 *
 * Design principles (iOS Mail-inspired):
 *  - Bold title + stronger border when unread — weight drives attention
 *  - Priority sort: payment_ready and funding_gap always float to top
 *  - Grouped by project — sections collapse/expand
 *  - Tapping a card navigates; dismiss is a secondary action
 *  - SVG icons — no emoji in chrome
 *  - Tabs: "To do" (needs action, unread) · "All" (activity log)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import { Skeleton } from "../components/Skeleton";
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
// Type config — determines priority, label, icon, colour
// ---------------------------------------------------------------------------

type TypeCfg = {
  label: string;
  needsAction: boolean;
  accent: string;
  priority: number;   // lower = shown first
};

const TYPE_CONFIG: Record<string, TypeCfg> = {
  payment_ready:       { label: "Release payment",          needsAction: true,  accent: "#059669", priority: 1 },
  funding_gap:         { label: "Funds short",              needsAction: true,  accent: "#dc2626", priority: 2 },
  funding_required:    { label: "Allocate funding",         needsAction: true,  accent: "#7c3aed", priority: 3 },
  evidence_required:   { label: "Evidence needed",          needsAction: true,  accent: "#d97706", priority: 4 },
  approval_required:   { label: "Sign-off needed",          needsAction: true,  accent: "#2563eb", priority: 5 },
  dispute_raised:      { label: "Dispute — payment held",   needsAction: true,  accent: "#ea580c", priority: 6 },
  variation_submitted: { label: "Change to review",         needsAction: true,  accent: "#7c3aed", priority: 7 },
  variation_approved:  { label: "Change approved",          needsAction: false, accent: "#059669", priority: 20 },
  variation_rejected:  { label: "Change rejected",          needsAction: false, accent: "#dc2626", priority: 20 },
  dispute_resolved:    { label: "Dispute resolved",         needsAction: false, accent: "#059669", priority: 20 },
};

const DEFAULT_CFG: TypeCfg = { label: "Update", needsAction: false, accent: "#64748b", priority: 30 };

// ---------------------------------------------------------------------------
// Icons — inline SVG, no emoji
// ---------------------------------------------------------------------------

function Icon({ type, accent }: { type: string; accent: string }) {
  const style: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: accent + "18", color: accent,
  };

  const svgProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  let icon: React.ReactNode;
  switch (type) {
    case "payment_ready":
      icon = <svg {...svgProps}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
      break;
    case "funding_gap":
    case "funding_required":
      icon = <svg {...svgProps}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
      break;
    case "evidence_required":
      icon = <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
      break;
    case "approval_required":
      icon = <svg {...svgProps}><polyline points="20 6 9 17 4 12"/></svg>;
      break;
    case "dispute_raised":
      icon = <svg {...svgProps}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
      break;
    case "variation_submitted":
    case "variation_approved":
    case "variation_rejected":
      icon = <svg {...svgProps}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
      break;
    case "dispute_resolved":
      icon = <svg {...svgProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
      break;
    default:
      icon = <svg {...svgProps}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
  }

  return <div style={style}>{icon}</div>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const relFmt = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

function timeAgo(iso: string): string {
  const diff = Date.parse(iso) - Date.now();
  const mins = Math.round(diff / 60_000);
  const hrs  = Math.round(diff / 3_600_000);
  const days = Math.round(diff / 86_400_000);
  if (Math.abs(mins) < 60)  return relFmt.format(mins, "minute");
  if (Math.abs(hrs)  < 24)  return relFmt.format(hrs,  "hour");
  if (Math.abs(days) < 365) return relFmt.format(days, "day");
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function sortItems(items: Notification[]): Notification[] {
  return [...items].sort((a, b) => {
    const pa = (TYPE_CONFIG[a.type] ?? DEFAULT_CFG).priority;
    const pb = (TYPE_CONFIG[b.type] ?? DEFAULT_CFG).priority;
    if (pa !== pb) return pa - pb;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

// ---------------------------------------------------------------------------
// NotificationCard
// ---------------------------------------------------------------------------

function NotificationCard({
  n,
  onAction,
  onDismiss,
  showDismiss,
}: {
  n: Notification;
  onAction: () => void;
  onDismiss: () => void;
  showDismiss: boolean;
}) {
  const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CFG;
  const isUnread = !n.read;

  // Touch-swipe to dismiss
  const touchStartX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < 0) {
      setSwiping(true);
      setSwipeOffset(Math.max(dx, -100));
    }
  }
  function onTouchEnd() {
    if (swipeOffset < -60 && showDismiss) {
      onDismiss();
    }
    setSwipeOffset(0);
    setSwiping(false);
    touchStartX.current = null;
  }

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        marginBottom: 8,
      }}
    >
      {/* Swipe-reveal dismiss background */}
      {showDismiss && (
        <div style={{
          position: "absolute", inset: 0, right: 0,
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          paddingRight: 20,
          background: "linear-gradient(90deg, transparent 0%, rgba(220,38,38,0.12) 40%, rgba(220,38,38,0.18) 100%)",
          borderRadius: 18,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      )}

      {/* Main card */}
      <div
        style={{
          transform: swiping ? `translateX(${swipeOffset}px)` : "translateX(0)",
          transition: swiping ? "none" : "transform 0.25s ease",
          backgroundColor: "#fff",
          border: isUnread
            ? `1.5px solid ${cfg.accent}55`
            : "1px solid var(--surface-border, #e4e7f0)",
          borderRadius: 18,
          cursor: n.action_url ? "pointer" : "default",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={n.action_url ? onAction : undefined}
      >
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <Icon type={n.type} accent={cfg.accent} />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Type label */}
            <p style={{
              fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.07em", color: cfg.accent, marginBottom: 2,
            }}>
              {cfg.label}
            </p>

            {/* Entity name — bold when unread */}
            {n.entity_name && (
              <p style={{
                fontSize: 14,
                fontWeight: isUnread ? 700 : 500,
                color: "var(--brand-navy, #0D1144)",
                lineHeight: 1.35,
                marginBottom: 2,
              }}>
                {n.entity_name}
              </p>
            )}

            {/* Message */}
            <p style={{
              fontSize: 13,
              color: isUnread ? "rgba(13,17,68,0.75)" : "rgba(13,17,68,0.55)",
              lineHeight: 1.45,
              fontWeight: isUnread ? 500 : 400,
            }}>
              {n.message}
            </p>

            {/* Time */}
            <p style={{ marginTop: 4, fontSize: 11, color: "rgba(13,17,68,0.35)" }}>
              {timeAgo(n.created_at)}
            </p>
          </div>

          {/* Unread dot + actions */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
            {isUnread && (
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                backgroundColor: cfg.accent, flexShrink: 0,
              }} />
            )}

            {/* Navigate arrow (desktop) */}
            {n.action_url && (
              <button
                onClick={(e) => { e.stopPropagation(); onAction(); }}
                style={{
                  border: "1px solid var(--surface-border, #e4e7f0)",
                  borderRadius: 10, padding: "5px 10px",
                  fontSize: 12, fontWeight: 600,
                  color: cfg.accent, backgroundColor: cfg.accent + "0f",
                  cursor: "pointer", display: "none",
                }}
                className="hidden-on-mobile inbox-action-btn"
              >
                Open →
              </button>
            )}
          </div>
        </div>

        {/* Bottom action row — only on mobile or when no action_url */}
        {(n.action_url || showDismiss) && (
          <div style={{
            borderTop: "1px solid var(--surface-border, #e4e7f0)",
            padding: "10px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          }}>
            {n.action_url ? (
              <button
                onClick={(e) => { e.stopPropagation(); onAction(); }}
                style={{
                  backgroundColor: cfg.accent, color: "#fff",
                  border: "none", borderRadius: 10, padding: "8px 16px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                Open →
              </button>
            ) : (
              <span style={{ fontSize: 12, color: "rgba(13,17,68,0.4)" }}>
                For your awareness
              </span>
            )}
            {showDismiss && (
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                style={{
                  border: "1px solid var(--surface-border, #e4e7f0)",
                  borderRadius: 10, padding: "7px 12px",
                  fontSize: 12, fontWeight: 600,
                  color: "rgba(13,17,68,0.5)", backgroundColor: "#f7f8fc",
                  cursor: "pointer",
                }}
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectGroup
// ---------------------------------------------------------------------------

function ProjectGroup({
  projectName,
  items,
  onAction,
  onDismiss,
  showDismiss,
}: {
  projectName: string;
  items: Notification[];
  onAction: (n: Notification) => void;
  onDismiss: (id: string) => void;
  showDismiss: boolean;
}) {
  const [open, setOpen] = useState(true);
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Section header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          width: "100%", textAlign: "left", marginBottom: 8,
          background: "none", border: "none", cursor: "pointer", padding: "2px 0",
        }}
      >
        <p style={{
          fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "rgba(13,17,68,0.45)",
        }}>
          {projectName}
        </p>
        {unreadCount > 0 && (
          <span style={{
            height: 18, minWidth: 18, borderRadius: 999,
            backgroundColor: "#ef4444", color: "#fff",
            fontSize: 10, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 5px",
          }}>
            {unreadCount}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(13,17,68,0.3)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && items.map((n) => (
        <NotificationCard
          key={n.id}
          n={n}
          onAction={() => onAction(n)}
          onDismiss={() => onDismiss(n.id)}
          showDismiss={showDismiss}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InboxClient({
  notifications: initial,
  projectNames = {},
}: {
  notifications: Notification[];
  projectNames?: Record<string, string>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<"todo" | "all">("todo");
  const [search, setSearch] = useState("");
  const [liveCount, setLiveCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => { setMounted(true); }, []);

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
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
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
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload: { new: Notification }) => {
            setItems((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)));
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

  async function markDone(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
  }

  function handleAction(n: Notification) {
    if (!n.read) markDone(n.id);
    if (n.action_url) router.push(n.action_url);
  }

  // ---------------------------------------------------------------------------
  // Filtered + sorted lists
  // ---------------------------------------------------------------------------

  const todoItems = useMemo(() =>
    sortItems(items.filter((n) => {
      const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CFG;
      return cfg.needsAction && !n.read;
    })),
  [items]);

  const allItems = useMemo(() =>
    sortItems(items),
  [items]);

  const visible = useMemo(() => {
    const base = tab === "todo" ? todoItems : allItems;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((n) =>
      [n.entity_name, n.message, n.required_action, n.type].join(" ").toLowerCase().includes(q)
    );
  }, [tab, todoItems, allItems, search]);

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map<string | null, Notification[]>();
    for (const n of visible) {
      const key = n.project_id ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    // Sort groups: non-null project_id first (by first notification priority), then null
    const entries = [...map.entries()];
    entries.sort(([, a], [, b]) => {
      const pa = (TYPE_CONFIG[a[0].type] ?? DEFAULT_CFG).priority;
      const pb = (TYPE_CONFIG[b[0].type] ?? DEFAULT_CFG).priority;
      return pa - pb;
    });
    return entries;
  }, [visible]);

  const unreadCount = todoItems.length;

  if (!mounted) {
    return (
      <AppShell>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
          <Skeleton.NotificationList />
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppShell>
      <style>{`
        .inbox-action-btn { display: none !important; }
        @media (min-width: 768px) { .inbox-action-btn { display: block !important; } }
      `}</style>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>

        {/* Live update banner */}
        {liveCount > 0 && (
          <div style={{
            marginBottom: 12, borderRadius: 16, padding: "10px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            backgroundColor: "#eff6ff", border: "1px solid #bfdbfe",
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
              {liveCount} new {liveCount === 1 ? "item" : "items"} arrived
            </p>
            <button
              onClick={() => setLiveCount(0)}
              style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Page heading */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--brand-navy, #0D1144)", letterSpacing: "-0.02em" }}>
              Inbox
            </h1>
            <p style={{ marginTop: 2, fontSize: 13, color: "rgba(13,17,68,0.5)" }}>
              {unreadCount > 0
                ? `${unreadCount} item${unreadCount !== 1 ? "s" : ""} need your attention`
                : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                border: "1px solid var(--surface-border, #e4e7f0)",
                borderRadius: 10, padding: "8px 14px",
                fontSize: 12, fontWeight: 600,
                color: "rgba(13,17,68,0.55)", backgroundColor: "#fff",
                cursor: "pointer",
              }}
            >
              Mark all done
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <svg
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(13,17,68,0.35)" }}
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications…"
            style={{
              width: "100%", borderRadius: 12, paddingLeft: 36, paddingRight: 16,
              paddingTop: 10, paddingBottom: 10, fontSize: 14, outline: "none",
              border: "1px solid var(--surface-border, #e4e7f0)",
              backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Tabs */}
        <div
          style={{
            marginBottom: 20, display: "flex", borderRadius: 16, padding: 4,
            backgroundColor: "rgba(13,17,68,0.06)",
          }}
        >
          {([["todo", `To do${unreadCount > 0 ? ` (${unreadCount})` : ""}`], ["all", `All · ${allItems.length}`]] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, borderRadius: 12, padding: "9px 0",
                fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
                backgroundColor: tab === t ? "#fff" : "transparent",
                color: tab === t ? "var(--brand-navy, #0D1144)" : "rgba(13,17,68,0.45)",
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.09)" : "none",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {visible.length === 0 ? (
          <div style={{
            borderRadius: 20, padding: "48px 24px", textAlign: "center",
            border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              backgroundColor: "rgba(13,17,68,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="rgba(13,17,68,0.3)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--brand-navy, #0D1144)", marginBottom: 4 }}>
              {tab === "todo" ? "All clear" : "Nothing here yet"}
            </p>
            <p style={{ fontSize: 13, color: "rgba(13,17,68,0.45)" }}>
              {tab === "todo"
                ? "Nothing needs your attention right now."
                : "Activity and completed items appear here."}
            </p>
          </div>
        ) : (
          grouped.map(([projectId, projectItems]) => (
            <ProjectGroup
              key={projectId ?? "_general"}
              projectName={projectId ? (projectNames[projectId] ?? "Project") : "General"}
              items={projectItems}
              onAction={handleAction}
              onDismiss={markDone}
              showDismiss={tab === "todo"}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}
