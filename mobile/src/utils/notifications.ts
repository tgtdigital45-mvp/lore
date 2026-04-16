import Constants from "expo-constants";
import { Platform } from "react-native";

type ExpoNotifications = typeof import("expo-notifications");

let notificationsModule: ExpoNotifications | null | undefined;

/** Expo Go SDK 53+ removed remote push; importing expo-notifications still runs native FX and logs errors. */
function shouldLoadExpoNotifications(): boolean {
  if (Platform.OS === "web") return false;
  if (Constants.appOwnership === "expo") return false;
  return true;
}

/**
 * Metro/Hermes dynamic `import("expo-notifications")` pode expor APIs em `default`
 * em vez do namespace — nesse caso `getAllScheduledNotificationsAsync` fica em `undefined` na raiz.
 * Em nativo, `require("expo-notifications")` costuma devolver o objeto de API completo.
 */
function resolveExpoNotificationsModule(imported: unknown): ExpoNotifications | null {
  if (!imported || typeof imported !== "object") return null;
  const root = imported as Record<string, unknown>;
  const pick = (o: Record<string, unknown>) =>
    typeof o.getAllScheduledNotificationsAsync === "function" ? (o as ExpoNotifications) : null;
  return pick(root) ?? (root.default && typeof root.default === "object" ? pick(root.default as Record<string, unknown>) : null);
}

function tryRequireExpoNotifications(): ExpoNotifications | null {
  if (!shouldLoadExpoNotifications()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return resolveExpoNotificationsModule(require("expo-notifications"));
  } catch {
    return null;
  }
}

export async function loadExpoNotificationsModule(): Promise<ExpoNotifications | null> {
  if (notificationsModule !== undefined) return notificationsModule;
  if (!shouldLoadExpoNotifications()) {
    notificationsModule = null;
    return null;
  }
  const fromRequire = tryRequireExpoNotifications();
  if (fromRequire) {
    notificationsModule = fromRequire;
  } else {
    try {
      const raw = await import("expo-notifications");
      notificationsModule = resolveExpoNotificationsModule(raw);
    } catch {
      notificationsModule = null;
    }
  }
  return notificationsModule;
}

async function loadNotifications(): Promise<ExpoNotifications | null> {
  return loadExpoNotificationsModule();
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
