export async function ensureNotificationPermission() {
  // En Electron normalmente ya funciona, pero esto evita errores.
  if (!("Notification" in window)) return false;

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  try {
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch {
    return false;
  }
}

export async function notify(title, body) {
  const ok = await ensureNotificationPermission();
  if (!ok) return;

  try {
    new Notification(title, { body });
  } catch (e) {
    console.error("Error Notification:", e);
  }
}
