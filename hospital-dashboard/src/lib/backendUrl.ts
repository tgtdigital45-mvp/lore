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

/** Origens permitidas para override em sessionStorage (evita roubo de Bearer via URL arbitrária + XSS). */
function allowedBackendOrigins(): string[] {
  const env = readEnvBackendUrl();
  const extra = [
    import.meta.env.VITE_BACKEND_URL as string | undefined,
    "http://localhost:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3000",
  ];
  const set = new Set<string>();
  for (const h of [env, ...extra]) {
    if (!h?.trim()) continue;
    try {
      set.add(new URL(h.trim()).origin);
    } catch {
      /* ignore */
    }
  }
  return [...set];
}

export function resolveBackendUrl(allowOverride: boolean, sessionUrl: string | null, envBackendUrl: string): string {
  const env = envBackendUrl.replace(/\/$/, "").trim();
  if (!allowOverride || !sessionUrl?.trim()) return env;
  try {
    const url = new URL(sessionUrl.trim());
    const allowed = allowedBackendOrigins();
    const ok = allowed.some((o) => o === url.origin);
    if (!ok) {
      if (import.meta.env.DEV) {
        console.warn("[security] Backend URL override rejected:", url.origin);
      }
      return env;
    }
    return sessionUrl.replace(/\/$/, "").trim();
  } catch {
    return env;
  }
}

/** Explicit backend URL or dev fallback: same-origin `/api` via Vite proxy. */
export function hasStaffBackendForFetch(backendUrl: string): boolean {
  return Boolean(backendUrl.trim()) || Boolean(import.meta.env.DEV);
}

/** `path` must start with `/api/` (e.g. `/api/staff/ocr/analyze`). */
export function staffApiRequestUrl(backendUrl: string, path: string): string {
  const rel = path.startsWith("/") ? path : `/${path}`;
  const b = backendUrl.replace(/\/$/, "").trim();
  return b ? `${b}${rel}` : rel;
}
