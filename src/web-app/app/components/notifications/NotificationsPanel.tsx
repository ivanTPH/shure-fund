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
  payment_ready:        "#34d399",
  approval_required:    "#60a5fa",
  evidence_required:    "#fbbf24",
  variation_submitted:  "#a78bfa",
  variation_approved:   "#34d399",
  variation_rejected:   "#f87171",
  dispute_raised:       "#f97316",
  dispute_resolved:     "#34d399",
  funding_gap:          "#f87171",
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
      className="absolute right-0 top-11 z-50 w-[360px] rounded-[24px] shadow-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0b0f35" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-white">Notifications</p>
          {unread > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button onClick={onMarkAllRead} className="text-xs text-neutral-400 hover:text-white transition">
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition text-sm" aria-label="Close">
            ✕
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-[480px] overflow-y-auto divide-y divide-white/5">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm text-neutral-400">You're all caught up</p>
            <p className="text-xs text-neutral-600 mt-1">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const icon   = TYPE_ICON[n.type]   ?? "🔔";
            const accent = TYPE_ACCENT[n.type] ?? "#94a3b8";
            const isActionable = !!n.action_url;

            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className="w-full text-left px-4 py-3.5 transition-colors hover:bg-white/5 focus:outline-none"
                style={{ opacity: n.read ? 0.6 : 1 }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon with accent ring */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-base"
                    style={{ backgroundColor: accent + "1a", border: `1px solid ${accent}33` }}
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
                      <p className="text-sm font-semibold text-white leading-snug truncate">
                        {n.entity_name}
                      </p>
                    )}

                    {/* Body message */}
                    <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-neutral-600">{relativeTime(n.created_at)}</p>
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
        <div className="border-t border-white/8 px-4 py-2 text-center">
          <p className="text-[10px] text-neutral-600">
            {unread} unread · {notifications.length} total
          </p>
        </div>
      )}
    </div>
  );
}
