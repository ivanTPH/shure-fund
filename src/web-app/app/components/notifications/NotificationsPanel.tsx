"use client";

import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  message: string;
  action_url: string | null;
  read: boolean;
  created_at: string;
};

const TYPE_ICON: Record<string, string> = {
  payment_ready: "💳",
  approval_required: "✅",
  evidence_required: "📎",
  variation_submitted: "📋",
  variation_approved: "✔",
  variation_rejected: "✗",
  dispute_raised: "⚠",
  dispute_resolved: "🔒",
  funding_gap: "💸",
};

const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});

export default function NotificationsPanel({
  notifications,
  onMarkAllRead,
  onMarkOneRead,
  onClose,
}: {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onMarkOneRead: (id: string) => void;
  onClose: () => void;
}) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="absolute right-0 top-11 z-50 w-80 rounded-2xl shadow-2xl"
      style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0d1144" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">Notifications</p>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-neutral-500 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-neutral-500">No notifications yet</p>
        ) : (
          notifications.map((n) => {
            const icon = TYPE_ICON[n.type] ?? "🔔";
            const time = fmt.format(new Date(n.created_at));
            const inner = (
              <div
                className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                style={{ opacity: n.read ? 0.55 : 1 }}
              >
                <span className="mt-0.5 shrink-0 text-base">{icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-neutral-200 leading-snug">{n.message}</p>
                  <p className="mt-1 text-[10px] text-neutral-500">{time}</p>
                </div>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                )}
              </div>
            );

            return (
              <div
                key={n.id}
                className="border-b border-white/5 last:border-0"
                onClick={() => { if (!n.read) onMarkOneRead(n.id); }}
              >
                {n.action_url ? (
                  <Link href={n.action_url} onClick={onClose}>{inner}</Link>
                ) : inner}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
