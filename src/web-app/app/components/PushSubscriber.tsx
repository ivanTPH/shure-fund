"use client";

/**
 * PushSubscriber — registers the service worker and subscribes the browser
 * to Web Push notifications.
 *
 * Renders nothing visible. Mount it once inside AppShell (or the root layout)
 * so it runs for every authenticated page.
 *
 * Requirements:
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY must be set in env
 *   - /sw.js must be served from the public directory
 */

import { useEffect } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer as ArrayBuffer;
}

export default function PushSubscriber() {
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) return; // Not configured — skip silently
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;

    async function register() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // Don't prompt if already subscribed
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          // Re-POST to ensure the server has this subscription (handles re-logins)
          await fetch("/api/push/subscribe", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ subscription: existing.toJSON() }),
          });
          return;
        }

        // Request permission only if not already granted
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await fetch("/api/push/subscribe", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ subscription: sub.toJSON() }),
        });
      } catch {
        // Non-fatal — push is enhancement only
      }
    }

    register();
  }, []);

  return null;
}
