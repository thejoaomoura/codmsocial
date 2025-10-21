self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  
  // Limpar notificações antigas ao ativar o service worker
  event.waitUntil(
    self.registration.getNotifications().then(notifications => {
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutos
      
      notifications.forEach(notification => {
        const notificationTime = notification.data?.timestamp || 0;
        if (now - notificationTime > maxAge) {
          notification.close();
        }
      });
    })
  );
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

  // Gerar ID único baseado no timestamp e dados da notificação
  const notificationId = `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  event.waitUntil(
    self.registration.showNotification(title || "Nova notificação", {
      ...options,
      tag: notificationId, // Tag única para evitar duplicatas
      timestamp: Date.now(),
      requireInteraction: false,
      silent: false,
    })
  );
});
