import type { MedicalDocRow } from "@/src/exams/examHelpers";
import { documentTypeLabel } from "@/src/i18n/ui";

const STOP = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "a",
  "o",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "para",
  "com",
  "por",
  "um",
  "uma",
  "uns",
  "umas",
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Expande um token para várias formas que podem aparecer no documento ou na query. */
function expandToken(token: string): string[] {
  const t = normalize(token);
  if (t.length < 2) return [];
  const out = new Set<string>([t]);

  const topics: Record<string, string[]> = {
    hemograma: ["hemograma", "hemogram", "hemoglobina", "leucocitos", "plaquetas", "sangue", "laboratorio", "laboratorial", "cbc"],
    sangue: ["sangue", "hemograma", "laboratorio", "laboratorial", "blood_test", "glicemia", "coagulacao"],
    laboratorio: ["laboratorio", "laboratorial", "sangue", "hemograma", "blood_test", "urina", "bioquimica"],
    cabeca: ["cabeca", "cranio", "cerebral", "encefalo", "neuro", "tc", "rm", "tomografia", "ressonancia", "neurologia"],
    imagem: ["imagem", "tc", "rm", "raio", "ultrassom", "pet", "mamografia", "tomografia", "ressonancia", "scan"],
    biopsia: ["biopsia", "anatomo", "patologico", "ihq", "citologia", "peça"],
    laudo: ["laudo", "relatorio", "resultado"],
  };

  for (const [, variants] of Object.entries(topics)) {
    if (variants.some((v) => v === t || t.includes(v) || v.includes(t))) {
      variants.forEach((v) => out.add(v));
    }
  }

  if (t === "exame" || t === "exames") {
    out.add("exame");
    out.add("exames");
  }

  return [...out];
}

function tokenizeQuery(q: string): string[] {
  return normalize(q)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

function metricsBlob(j: Record<string, unknown> | null): string {
  if (!j) return "";
  const m = j.metrics;
  if (!Array.isArray(m)) return "";
  const parts: string[] = [];
  for (const item of m) {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      if (typeof o.name === "string") parts.push(o.name);
    }
  }
  return parts.join(" ");
}

function registriesBlob(j: Record<string, unknown> | null): string {
  if (!j) return "";
  const r = j.professional_registries;
  if (!Array.isArray(r)) return "";
  const parts: string[] = [];
  for (const item of r) {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      if (typeof o.kind === "string") parts.push(o.kind);
      if (typeof o.number === "string") parts.push(o.number);
      if (typeof o.uf === "string") parts.push(o.uf);
    }
  }
  return parts.join(" ");
}

export function buildExamSearchHaystack(row: MedicalDocRow): string {
  const j = row.ai_extracted_json;
  const title = typeof j?.title_pt_br === "string" ? j.title_pt_br : "";
  const summary = typeof j?.summary_pt_br === "string" ? j.summary_pt_br : "";
  const doctor = typeof j?.doctor_name === "string" ? j.doctor_name : "";
  const suit = typeof j?.document_suitability === "string" ? j.document_suitability : "";
  const uiCat = typeof j?.ui_category === "string" ? j.ui_category : "";
  const dt = row.document_type ?? "";
  const dtLabel = documentTypeLabel[dt] ?? dt;
  const metrics = metricsBlob(j);
  const reg = registriesBlob(j);
  return normalize(`${dt} ${dtLabel} ${suit} ${uiCat} ${title} ${summary} ${doctor} ${reg} ${metrics}`);
}

/**
 * Pesquisa "inteligente": tokeniza a query, ignora palavras vazias, expande sinónimos
 * e exige que cada token significativo apareça no texto do exame (tipo, título, resumo, médico, métricas).
 */
export function examMatchesSearchQuery(row: MedicalDocRow, rawQuery: string): boolean {
  const trimmed = rawQuery.trim();
  if (!trimmed) return true;
  const tokens = tokenizeQuery(trimmed);
  if (tokens.length === 0) return true;

  const hay = buildExamSearchHaystack(row);

  for (const tok of tokens) {
    const variants = expandToken(tok);
    const candidates = variants.length > 0 ? variants : [tok];
    const ok = candidates.some((c) => {
      const n = normalize(c);
      return n.length >= 2 && hay.includes(n);
    });
    if (!ok) return false;
  }
  return true;
}
