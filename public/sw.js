self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow("/"));
});

// Notificaciones programadas: la app envía { type, delay, title, body }
// y el SW las muestra tras el delay aunque la pantalla esté bloqueada.
self.addEventListener("message", e => {
  if (e.data?.type !== "SCHEDULE_NOTIFICATION") return;
  const { delay, title, body } = e.data;
  setTimeout(() => {
    self.registration.showNotification(title, { body, icon: "/favicon.svg" });
  }, delay);
});
