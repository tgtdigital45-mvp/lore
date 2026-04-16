import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

let initialized = false;

function getDsn(): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = typeof extra?.sentryDsn === "string" ? extra.sentryDsn.trim() : "";
  if (fromExtra) return fromExtra;
  const env = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  return env || undefined;
}

/** Inicializa Sentry quando `EXPO_PUBLIC_SENTRY_DSN` (ou `extra.sentryDsn`) está definido. Idempotente. */
export function initSentry(): void {
  if (initialized) return;
  const dsn = getDsn();
  if (!dsn) return;
  initialized = true;
  Sentry.init({
    dsn,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
  });
}

export function captureAppError(error: Error, componentStack?: string | null): void {
  if (!initialized) return;
  Sentry.captureException(error, {
    extra: componentStack ? { componentStack } : undefined,
  });
}

export function addFetchBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({
    category: "fetch",
    message,
    level: "info",
    data,
  });
}

export function captureFetchFailure(message: string, err: unknown, data?: Record<string, unknown>): void {
  if (!initialized) return;
  const error = err instanceof Error ? err : new Error(String(err));
  Sentry.captureException(error, { tags: { area: "fetch" }, extra: { message, ...data } });
}

export function setRpcFallbackTag(): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({
    category: "home_summary",
    message: "rpc_mobile_home_summary fallback to parallel queries",
    level: "info",
    data: { rpc_fallback: true },
  });
}
