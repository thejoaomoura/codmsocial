self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  const { notification } = event;
  notification.close();

  const urlToOpen = notification?.data?.chatUserId
    ? `/chat/${notification.data.chatUserId}`
    : "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      let chatClient = allClients.find((client) => {
        return "url" in client && client.url.includes(urlToOpen);
      });

      if (chatClient && "focus" in chatClient) {
        return chatClient.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const { title, ...options } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "Nova notificação", {
      ...options,
      timestamp: Date.now(),
    })
  );
});
