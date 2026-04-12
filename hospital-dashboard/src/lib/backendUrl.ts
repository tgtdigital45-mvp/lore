export const BACKEND_URL_STORAGE_KEY = "aura_hospital_backend_url";

export function readEnvBackendUrl(): string {
  return (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "").trim() ?? "";
}

export function readSessionBackendUrl(): string | null {
  try {
    const s = sessionStorage.getItem(BACKEND_URL_STORAGE_KEY)?.trim().replace(/\/$/, "");
    return s || null;
  } catch {
    return null;
  }
}

export function persistSessionBackendUrl(url: string | null): void {
  try {
    if (url) sessionStorage.setItem(BACKEND_URL_STORAGE_KEY, url);
    else sessionStorage.removeItem(BACKEND_URL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function resolveBackendUrl(allowOverride: boolean, sessionUrl: string | null, envBackendUrl: string): string {
  const base = (allowOverride ? (sessionUrl ?? envBackendUrl) : envBackendUrl).replace(/\/$/, "").trim();
  return base;
}
