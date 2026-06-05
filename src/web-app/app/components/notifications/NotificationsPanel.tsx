"use client";

import { useRouter } from "next/navigation";

export type AppNotification = {
  id: string;
  type: string;
  required_action: string | null;
  message: string;
  entity_type: string | null;
  entity_name: string | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
};

// Labels shown in the notification panel — plain UK English
const TYPE_LABEL: Record<string, string> = {
  payment_ready:        "Release payment",
  approval_required:    "Sign-off needed",
  evidence_required:    "Evidence needed",
  variation_submitted:  "Contract change to review",
  variation_approved:   "Contract change approved",
  variation_rejected:   "Contract change rejected",
  dispute_raised:       "Dispute — payment held",
  dispute_resolved:     "Dispute sorted",
  funding_gap:          "Funds short",
};

const TYPE_ICON: Record<string, string> = {
  payment_ready:        "£",
  approval_required:    "✓",
  evidence_required:    "📎",
  variation_submitted:  "↕",
  variation_approved:   "✓",
  variation_rejected:   "✗",
  dispute_raised:       "⚠",
  dispute_resolved:     "✓",
  funding_gap:          "!",
};

const TYPE_ACCENT: Record<string, string> = {
  payment_ready:        "#059669",
  approval_required:    "#2563eb",
  evidence_required:    "#d97706",
  variation_submitted:  "#7c3aed",
  variation_approved:   "#059669",
  variation_rejected:   "#dc2626",
  dispute_raised:       "#ea580c",
  dispute_resolved:     "#059669",
  funding_gap:          "#dc2626",
};

const relFmt = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

function relativeTime(iso: string): string {
  const diffMs = Date.parse(iso) - Date.now();
  const diffMin = Math.round(diffMs / 60_000);
  const diffHr  = Math.round(diffMs / 3_600_000);
  const diffDay = Math.round(diffMs / 86_400_000);
  if (Math.abs(diffMin) < 60) return relFmt.format(diffMin, "minute");
  if (Math.abs(diffHr) < 24)  return relFmt.format(diffHr, "hour");
  return relFmt.format(diffDay, "day");
}

export default function NotificationsPanel({
  notifications,
  onMarkAllRead,
  onMarkOneRead,
  onClose,
}: {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onMarkOneRead: (id: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read).length;

  function handleClick(n: AppNotification) {
    if (!n.read) onMarkOneRead(n.id);
    if (n.action_url) {
      onClose();
      router.push(n.action_url);
    }
  }

  return (
    <div
      className="absolute right-0 top-11 z-50 w-[360px] rounded-[24px] shadow-xl overflow-hidden"
      style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Notifications</p>
          {unread > 0 && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: "#dc2626" }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs transition hover:opacity-70"
              style={{ color: "rgba(13,17,68,0.5)" }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-sm transition hover:opacity-70"
            style={{ color: "rgba(13,17,68,0.4)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div
        className="max-h-[480px] overflow-y-auto divide-y"
        style={{ borderColor: "var(--surface-border, #e4e7f0)" }}
      >
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>You&apos;re all caught up</p>
            <p className="text-xs mt-1" style={{ color: "rgba(13,17,68,0.35)" }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const icon   = TYPE_ICON[n.type]   ?? "·";
            const accent = TYPE_ACCENT[n.type] ?? "#94a3b8";
            const isActionable = !!n.action_url;

            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className="w-full text-left px-4 py-3.5 transition-colors hover:bg-neutral-50 focus:outline-none"
                style={{ opacity: n.read ? 0.55 : 1 }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon with accent ring */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-sm font-bold"
                    style={{ backgroundColor: accent + "15", border: `1px solid ${accent}30`, color: accent }}
                  >
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Plain-English action label */}
                    <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: accent }}>
                      {TYPE_LABEL[n.type] ?? (n.required_action ?? "Update")}
                    </p>

                    {/* Entity name — what it's about */}
                    {n.entity_name && (
                      <p className="text-sm font-semibold leading-snug truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>
                        {n.entity_name}
                      </p>
                    )}

                    {/* Body message */}
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(13,17,68,0.55)" }}>
                      {n.message}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="text-[10px]" style={{ color: "rgba(13,17,68,0.35)" }}>{relativeTime(n.created_at)}</p>
                      {isActionable && !n.read && (
                        <span className="text-[10px] font-semibold" style={{ color: accent }}>
                          Tap to sort it →
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          className="px-4 py-2 text-center"
          style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}
        >
          <p className="text-[10px]" style={{ color: "rgba(13,17,68,0.35)" }}>
            {unread} unread · {notifications.length} total
          </p>
        </div>
      )}
    </div>
  );
}
