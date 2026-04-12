type ExpoNotifications = typeof import("expo-notifications");

let notificationsModule: ExpoNotifications | null | undefined;

async function loadNotifications(): Promise<ExpoNotifications | null> {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = await import("expo-notifications");
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

let handlerInstalled = false;

async function ensureNotificationHandler() {
  if (handlerInstalled) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerInstalled = true;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    await ensureNotificationHandler();
    const Notifications = await loadNotifications();
    if (!Notifications) return false;
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return true;
    }
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export async function notifyEmergency(title: string, body: string) {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return;
    const ok = await ensureNotificationPermissions();
    if (!ok) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {
    /* Expo Go / ambiente sem push */
  }
}
