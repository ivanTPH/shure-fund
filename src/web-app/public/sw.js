/**
 * Service Worker — Shure.Fund
 *
 * Handles:
 *  - push: display a browser notification when a Web Push message arrives
 *  - notificationclick: focus/open the relevant page and close the notification
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Shure.Fund", body: event.data.text() };
  }

  const title = payload.title ?? "Shure.Fund";
  const options = {
    body:    payload.body ?? "",
    icon:    "/brand/icon-192.png",
    badge:   "/brand/icon-96.png",
    data:    payload.data ?? {},
    tag:     payload.tag ?? "shure-fund-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const { projectId, url } = event.notification.data ?? {};
  const target = url ?? (projectId ? `/projects/${projectId}` : "/");

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing window on the target path if one is open
      for (const client of windowClients) {
        if (client.url.includes(target) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    }),
  );
});
