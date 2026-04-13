import { documentTypeLabel } from "@/src/i18n/ui";

export type MedicalDocRow = {
  id: string;
  document_type: string;
  uploaded_at: string;
  /** Data do exame no documento; se ausente, usar `uploaded_at` na UI. */
  exam_performed_at?: string | null;
  ai_extracted_json: Record<string, unknown> | null;
};

export function examDisplayDateIso(row: MedicalDocRow): string {
  return row.exam_performed_at && String(row.exam_performed_at).trim() !== ""
    ? row.exam_performed_at
    : row.uploaded_at;
}

/** Categoria de lista (chip) — alinhada ao `ui_category` da IA ou inferida de `document_type`/texto. */
export type ExamFilterPill = "all" | "exames" | "laudos" | "receitas" | "atestados" | "nutricao";

export const EXAM_FILTER_PILLS: { key: ExamFilterPill; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "exames", label: "Exames" },
  { key: "laudos", label: "Laudos" },
  { key: "receitas", label: "Receitas" },
  { key: "atestados", label: "Atestados" },
  { key: "nutricao", label: "Nutrição" },
];

const LIST_CATEGORY_KEYS = new Set<string>(["exames", "laudos", "receitas", "atestados", "nutricao"]);

function normHay(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function haystackFromRow(row: MedicalDocRow): string {
  const j = row.ai_extracted_json;
  const title = typeof j?.title_pt_br === "string" ? j.title_pt_br : "";
  const summary = typeof j?.summary_pt_br === "string" ? j.summary_pt_br : "";
  return normHay(`${title} ${summary}`);
}

function matchesNutricao(h: string): boolean {
  return /\b(nutri|cardapio|card[aá]pio|dieta|antropo|tace|avaliac[aã]o\s*nutri|gastrostomia|dieta\s*enteral)\b/i.test(h);
}

function matchesReceita(h: string): boolean {
  return /\b(receitu|receita|prescri|posologia|comprimido|capsula|mg\s|ml\s|gotas|antibi[oó]tico|chemio|quimio)\b/i.test(h);
}

function matchesAtestado(h: string): boolean {
  return /\b(atestado|afastamento|declara[cç][aã]o|cid\b|incapacidade|guia\s|opme|conv[eê]nio|autoriza[cç][aã]o\s|dispensa[cç][aã]o)\b/i.test(
    h
  );
}

/** Categoria para filtros: prioriza `ui_category` gravado pela IA; senão heurísticas. */
export function getDocumentListCategory(row: MedicalDocRow): Exclude<ExamFilterPill, "all"> {
  const j = row.ai_extracted_json;
  const u = j?.ui_category;
  if (typeof u === "string") {
    const k = u.trim();
    if (LIST_CATEGORY_KEYS.has(k)) return k as Exclude<ExamFilterPill, "all">;
  }
  const dt = row.document_type;
  const h = haystackFromRow(row);

  if (matchesNutricao(h)) return "nutricao";
  if (matchesReceita(h)) return "receitas";
  if (dt === "biopsy") return "laudos";
  if (dt === "blood_test" || dt === "scan") return "exames";
  if (dt === "administrative") {
    if (matchesAtestado(h)) return "atestados";
    return "atestados";
  }
  if (matchesAtestado(h)) return "atestados";
  return "exames";
}

export function matchesExamFilter(row: MedicalDocRow, filter: ExamFilterPill): boolean {
  if (filter === "all") return true;
  return getDocumentListCategory(row) === filter;
}

/** Ordenação pela data do exame (ou data de registro). */
export type ExamSortOrder = "recent" | "oldest";

export function compareExamRowsByDate(a: MedicalDocRow, b: MedicalDocRow, order: ExamSortOrder): number {
  const ta = new Date(examDisplayDateIso(a)).getTime();
  const tb = new Date(examDisplayDateIso(b)).getTime();
  const safeA = Number.isFinite(ta) ? ta : 0;
  const safeB = Number.isFinite(tb) ? tb : 0;
  return order === "recent" ? safeB - safeA : safeA - safeB;
}

/** Intervalo inclusive `AAAA-MM-DD` vazio = sem limite nesse extremo. */
export function examRowInDateRange(row: MedicalDocRow, start: string, end: string): boolean {
  const s = start.trim();
  const e = end.trim();
  if (!s && !e) return true;
  const raw = examDisplayDateIso(row);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const rowKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (s && rowKey < s) return false;
  if (e && rowKey > e) return false;
  return true;
}

export function kindBadge(documentType: string): string {
  if (documentType === "blood_test") return "EXAME DE SANGUE";
  if (documentType === "biopsy") return "LAUDO";
  if (documentType === "scan") return "LAUDO";
  if (documentType === "administrative") return "GUIA / CONVÊNIO";
  return "DOCUMENTO";
}

export function getDoctorName(j: Record<string, unknown> | null): string {
  if (!j) return "—";
  const v = j.doctor_name ?? j.medico ?? j.doctor;
  return typeof v === "string" && v.trim() ? v.trim() : "—";
}

/** CRM, CRO, COREN, CRF, etc. — `ai_extracted_json.professional_registries`. */
export type ProfessionalRegistryRow = { kind: string; number: string; uf?: string };

export function parseProfessionalRegistriesFromJson(j: Record<string, unknown> | null | undefined): ProfessionalRegistryRow[] {
  const r = j?.professional_registries;
  if (!Array.isArray(r)) return [];
  const out: ProfessionalRegistryRow[] = [];
  for (const item of r) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const kind = typeof o.kind === "string" ? o.kind.trim() : "";
    const number = typeof o.number === "string" ? o.number.trim() : "";
    if (!kind || !number) continue;
    const u = o.uf ?? o.UF;
    const ufRaw = typeof u === "string" ? u.trim().toUpperCase() : "";
    const uf = /^[A-Z]{2}$/.test(ufRaw) ? ufRaw : undefined;
    out.push(uf ? { kind, number, uf } : { kind, number });
  }
  return out;
}

export function formatProfessionalRegistriesDisplay(regs: ProfessionalRegistryRow[]): string {
  if (regs.length === 0) return "";
  return regs.map((r) => (r.uf ? `${r.kind} ${r.number} · ${r.uf}` : `${r.kind} ${r.number}`)).join("\n");
}

export type RegistryEditRow = { kind: string; number: string; uf: string };

export function registryEditRowsFromJson(j: Record<string, unknown> | null | undefined): RegistryEditRow[] {
  const parsed = parseProfessionalRegistriesFromJson(j);
  if (parsed.length === 0) return [{ kind: "", number: "", uf: "" }];
  return parsed.map((r) => ({ kind: r.kind, number: r.number, uf: r.uf ?? "" }));
}

export function registryEditRowsToSave(rows: RegistryEditRow[]): ProfessionalRegistryRow[] {
  return rows
    .map((row) => {
      const kind = row.kind.trim();
      const number = row.number.trim();
      const ufRaw = row.uf.trim().toUpperCase();
      const uf = /^[A-Z]{2}$/.test(ufRaw) ? ufRaw : undefined;
      if (!kind || !number) return null;
      return uf ? { kind, number, uf } : { kind, number };
    })
    .filter((x): x is ProfessionalRegistryRow => x !== null);
}

export function getDocumentTitle(row: MedicalDocRow): string {
  const j = row.ai_extracted_json;
  if (j && typeof j.title_pt_br === "string" && j.title_pt_br.trim()) return j.title_pt_br.trim();
  const summary = typeof j?.summary_pt_br === "string" ? j.summary_pt_br : "";
  if (summary) {
    const first = summary.split(/[.\n]/)[0]?.trim() ?? "";
    if (first.length >= 12) return first.length > 72 ? `${first.slice(0, 69)}…` : first;
  }
  return documentTypeLabel[row.document_type] ?? row.document_type;
}

export function formatExamDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

/** Últimos N meses + "all" para o seletor. */
export function monthOptionsForPicker(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [{ value: "all", label: "Todos os meses" }];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    out.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return out;
}

export function isoInMonth(iso: string, monthKey: string): boolean {
  if (monthKey === "all") return true;
  const d = new Date(iso);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return key === monthKey;
}

export function examRowInMonth(row: MedicalDocRow, monthKey: string): boolean {
  return isoInMonth(examDisplayDateIso(row), monthKey);
}

/** Converte timestamptz ou data ISO num campo `yyyy-MM-dd` para edição. */
export function examPerformedAtToDateInput(iso: string | null | undefined): string {
  if (!iso || String(iso).trim() === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** `yyyy-MM-dd` → timestamptz UTC (meio-dia), alinhado ao backend. */
export function dateInputToExamPerformedAt(isoDate: string): string | null {
  const s = isoDate.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1980 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00.000Z`;
}
