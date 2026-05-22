/* eslint-disable @typescript-eslint/no-explicit-any */
self.addEventListener("push", (event: any) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "TanTrack";
  const options = {
    body: data.body ?? "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [200, 100, 200],
    data: { url: data.url ?? "/leave" },
  };
  event.waitUntil(
    (self as any).registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  event.waitUntil(
    (self as any).clients.openWindow(
      event.notification.data?.url ?? "/leave"
    )
  );
});
