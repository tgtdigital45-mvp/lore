import { DOCUMENT_TYPE_PT } from "@/constants/dashboardLabels";
import type { MedicalDocModalRow } from "@/types/dashboard";

export function getDoctorNameFromJson(j: Record<string, unknown> | null | undefined): string {
  if (!j) return "—";
  const v = j.doctor_name ?? j.medico ?? j.doctor;
  return typeof v === "string" && v.trim() ? v.trim() : "—";
}

export type ProfessionalRegistryMeta = { kind: string; number: string; uf?: string };

export function getProfessionalRegistriesFromJson(j: Record<string, unknown> | null | undefined): ProfessionalRegistryMeta[] {
  const r = j?.professional_registries;
  if (!Array.isArray(r)) return [];
  const out: ProfessionalRegistryMeta[] = [];
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

/** Uma linha para lista (CRM 123 · SP · CRO 456). */
export function formatProfessionalRegistriesLine(regs: ProfessionalRegistryMeta[]): string {
  if (regs.length === 0) return "";
  return regs.map((r) => (r.uf ? `${r.kind} ${r.number} · ${r.uf}` : `${r.kind} ${r.number}`)).join(" · ");
}

/** Título legível do exame: prioriza IA; senão 1.ª frase do resumo; senão tipo de documento. */
export function getDocumentTitle(row: Pick<MedicalDocModalRow, "document_type" | "ai_extracted_json">): string {
  const j = row.ai_extracted_json;
  if (j && typeof j.title_pt_br === "string" && j.title_pt_br.trim()) return j.title_pt_br.trim();
  const summary = j && typeof j.summary_pt_br === "string" ? j.summary_pt_br : "";
  if (summary) {
    const first = summary.split(/[.\n]/)[0]?.trim() ?? "";
    if (first.length >= 12) return first.length > 72 ? `${first.slice(0, 69)}…` : first;
  }
  return DOCUMENT_TYPE_PT[row.document_type] ?? row.document_type;
}

export function formatExamDayPt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

export function examUsesUploadDateOnly(doc: Pick<MedicalDocModalRow, "exam_performed_at" | "uploaded_at">): boolean {
  return !doc.exam_performed_at || String(doc.exam_performed_at).trim() === "";
}

export function getAiSummaryPtBr(j: Record<string, unknown> | null | undefined): string {
  if (!j || typeof j.summary_pt_br !== "string") return "";
  return j.summary_pt_br.trim();
}

export function getAiConfidenceNote(j: Record<string, unknown> | null | undefined): string {
  if (!j || typeof j.confidence_note !== "string") return "";
  return j.confidence_note.trim();
}
