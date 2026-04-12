/** Normaliza o código para pesquisa (formato armazenado: AURA-XXXXXX). */
export function normalizePatientCodeForLookup(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return "";
  if (t.startsWith("AURA-")) return t;
  if (/^[0-9A-F]{6}$/i.test(t)) return `AURA-${t}`;
  return t;
}

/** Texto amigável para UI (evita duplicar prefixo AURA). */
export function formatPatientCodeDisplay(code: string | null | undefined): string | null {
  if (code == null || String(code).trim() === "") return null;
  const c = String(code).trim().toUpperCase();
  return c.startsWith("AURA-") ? c : `AURA-${c}`;
}
