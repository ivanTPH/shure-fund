"use client";

/**
 * PwaBootstrap — service worker registration + push notification opt-in banner.
 *
 * Mounts once in the root layout. Does two things:
 *   1. Registers /sw.js silently (enables offline caching, push events).
 *   2. If the user hasn't decided on notifications, shows a subtle banner
 *      offering to enable them. Dismissed state is stored in localStorage.
 *
 * The actual push subscription (VAPID) is handled by PushSubscriber when
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY is configured. Without it, the banner still
 * registers the SW so the PWA is installable.
 */

import { useEffect, useState } from "react";

const DISMISSED_KEY = "push-opt-in-dismissed";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer as ArrayBuffer;
}

export default function PwaBootstrap() {
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    // 1. Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 2. Check if we should show the opt-in banner
    if (
      "Notification" in window &&
      Notification.permission === "default" &&
      !localStorage.getItem(DISMISSED_KEY)
    ) {
      // Small delay so it doesn't flash immediately on load
      const t = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && VAPID_KEY && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });
        await fetch("/api/push/subscribe", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ subscription: sub.toJSON() }),
        }).catch(() => {});
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
      dismiss();
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 z-50 rounded-[20px] px-5 py-4 shadow-lg"
      style={{
        backgroundColor: "#fff",
        border: "1px solid var(--surface-border, #e4e7f0)",
        boxShadow: "0 8px 32px rgba(13,17,68,0.12)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-base"
          style={{ backgroundColor: "rgba(13,17,68,0.06)" }}
        >
          🔔
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: "var(--brand-navy, #0D1144)" }}>
            Stay up to date
          </p>
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "rgba(13,17,68,0.55)" }}>
            Get notified when stages need action or payments are ready.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="rounded-xl px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
            >
              {loading ? "Setting up…" : "Enable notifications"}
            </button>
            <button
              onClick={dismiss}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-70"
              style={{ color: "rgba(13,17,68,0.45)" }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
