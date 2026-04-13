import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  DOSSIER_REPORT_SECTION_OPTIONS,
  type DossierReportPayload,
  type DossierReportSectionId,
  buildDossierReportHtml,
} from "@/lib/dossierReportHtml";
import { Button } from "@/components/ui/button";
import { printHtmlDocument } from "@/lib/printHtml";

const ALL_TRUE: Record<DossierReportSectionId, boolean> = {
  identificacao: true,
  sinais_vitais: true,
  toxicidade: true,
  risco_suspensao: true,
  alertas: true,
  exames: true,
  medicamentos: true,
  diario: true,
  nutricao: true,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: DossierReportPayload;
};

export function DossierReportModal({ open, onOpenChange, payload }: Props) {
  const [sel, setSel] = useState<Record<DossierReportSectionId, boolean>>(ALL_TRUE);

  useEffect(() => {
    if (open) setSel({ ...ALL_TRUE });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  function toggle(id: DossierReportSectionId) {
    setSel((s) => ({ ...s, [id]: !s[id] }));
  }

  function generate() {
    const any = DOSSIER_REPORT_SECTION_OPTIONS.some((o) => sel[o.id]);
    if (!any) {
      window.alert("Seleccione pelo menos uma secção.");
      return;
    }
    const html = buildDossierReportHtml(sel, payload);
    const ok = printHtmlDocument(html);
    if (!ok) {
      window.alert("Não foi possível preparar a impressão neste navegador. Tente Chrome ou Edge atualizados.");
      return;
    }
    onOpenChange(false);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-report-title"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#E8EAED] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="dossier-report-title" className="text-lg font-black tracking-tight">
              Gerar relatório (PDF)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Marque as seções a incluir. Segue-se o diálogo de impressão (não usa pop-ups) — escolha «Guardar como PDF» ou a
              impressora.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-muted-foreground hover:bg-[#F8FAFC]"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <ul className="space-y-3">
          {DOSSIER_REPORT_SECTION_OPTIONS.map((o) => (
            <li key={o.id} className="flex items-start gap-3">
              <input
                id={`rep-${o.id}`}
                type="checkbox"
                className="mt-1 size-4 rounded border-[#CBD5E1] accent-[#4F46E5]"
                checked={sel[o.id]}
                onChange={() => toggle(o.id)}
              />
              <label htmlFor={`rep-${o.id}`} className="cursor-pointer text-sm leading-snug">
                {o.label}
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" className="rounded-2xl bg-[#0A0A0A] font-semibold text-white hover:bg-[#1A1A1A]" onClick={generate}>
            Gerar e imprimir / PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
