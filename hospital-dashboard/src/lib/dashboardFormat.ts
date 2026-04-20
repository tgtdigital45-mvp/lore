import type { BiomarkerModalRow } from "../types/dashboard";
import { sanitizeSupabaseError } from "./errorMessages";

export function formatBiomarkerValue(r: BiomarkerModalRow): string {
  if (r.value_numeric != null && Number.isFinite(r.value_numeric)) return String(r.value_numeric);
  if (r.value_text != null && String(r.value_text).trim() !== "") return String(r.value_text);
  return "—";
}

export function formatPtShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

export function formatPtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/** Hora local curta (painéis operacionais). */
export function formatPtTimeShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function formatPtDateLong(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

/** Tempo decorrido curto (ex.: triagem). */
export function formatRelativeSince(iso: string | null): string {
  if (!iso) return "—";
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "agora";
    if (m < 60) return `há ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 48) return `há ${h} h`;
    const d = Math.floor(h / 24);
    return `há ${d} d`;
  } catch {
    return "—";
  }
}

export function chatDayKey(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  } catch {
    return iso;
  }
}

export function formatChatDayLabel(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const dayMs = 86400000;
    const strip = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = strip(d) - strip(today);
    if (diff === 0) return "Hoje";
    if (diff === -dayMs) return "Ontem";
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return "—";
  }
}

/** Quando o browser só devolve «Failed to fetch» (servidor parado, URL/porta errada, etc.) */
export function formatBackendConnectionError(backendBaseUrl: string, err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const looksNetwork =
    raw === "Failed to fetch" || /failed to fetch|networkerror|network request failed|load failed/i.test(raw);
  if (looksNetwork) {
    return `Sem ligação ao servidor em ${backendBaseUrl}. Inicie o onco-backend (na pasta backend: npm run dev — porta por defeito 3001, não 3000) e em Integração use o mesmo URL, por exemplo http://localhost:3001.`;
  }
  const tail = raw || "Falha de rede";
  return sanitizeSupabaseError({ message: tail });
}
