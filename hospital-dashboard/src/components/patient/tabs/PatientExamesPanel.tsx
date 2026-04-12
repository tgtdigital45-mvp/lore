import { useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  AlertCircle,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { DOCUMENT_TYPE_PT } from "../../../constants/dashboardLabels";
import { formatBiomarkerValue, formatPtDateTime } from "../../../lib/dashboardFormat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BiomarkerModalRow, MedicalDocModalRow } from "../../../types/dashboard";

type Props = {
  modalLoading: boolean;
  modalMedicalDocs: MedicalDocModalRow[];
  modalBiomarkers: BiomarkerModalRow[];
  expandedExamDocId: string | null;
  onExpandedExamDocId: (id: string | null) => void;
  backendUrl: string;
  docOpenError: string | null;
  staffUploadBusy: boolean;
  staffUploadMsg: string | null;
  onStaffUpload: (file: File) => void;
  onOpenExam: (documentId: string, mode: "open" | "download") => void;
};

function SectionTitle({ icon: Icon, children }: { icon: typeof FileText; children: ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
      <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</h3>
    </div>
  );
}

export default function PatientExamesPanel({
  modalLoading,
  modalMedicalDocs,
  modalBiomarkers,
  expandedExamDocId,
  onExpandedExamDocId,
  backendUrl,
  docOpenError,
  staffUploadBusy,
  staffUploadMsg,
  onStaffUpload,
  onOpenExam,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const examBiomarkerGroups = useMemo(() => {
    const byDoc = new Map<string, BiomarkerModalRow[]>();
    const orphans: BiomarkerModalRow[] = [];
    for (const b of modalBiomarkers) {
      if (b.medical_document_id) {
        const list = byDoc.get(b.medical_document_id) ?? [];
        list.push(b);
        byDoc.set(b.medical_document_id, list);
      } else {
        orphans.push(b);
      }
    }
    return { byDoc, orphans };
  }, [modalBiomarkers]);

  const onDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onStaffUpload(f);
  };

  const pickFile = () => fileInputRef.current?.click();

  return (
    <div className="space-y-10 font-sans">
      <section className="space-y-4">
        <div>
          <SectionTitle icon={FileText}>Exames</SectionTitle>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Lista por documento. Expanda a linha para ver biomarcadores; use Ver ou Baixar quando existir ficheiro no armazenamento.
          </p>
        </div>

        {docOpenError ? (
          <div
            className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>{docOpenError}</span>
          </div>
        ) : null}

        {modalLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="A carregar exames">
            <div className="h-[4.5rem] animate-pulse rounded-2xl bg-[#F1F5F9]" />
            <div className="h-[4.5rem] animate-pulse rounded-2xl bg-[#F1F5F9]" />
          </div>
        ) : modalMedicalDocs.length === 0 && examBiomarkerGroups.orphans.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] px-6 py-12 text-center">
            <FileText className="mb-3 size-10 text-muted-foreground/50" strokeWidth={1.25} />
            <p className="text-sm font-medium text-foreground">Nenhum exame ou marcador registado</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Anexe um resultado abaixo para o OCR extrair biomarcadores automaticamente.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {modalMedicalDocs.map((d) => {
              const inlineOnly = d.storage_path.startsWith("inline-ocr/");
              const markers = examBiomarkerGroups.byDoc.get(d.id) ?? [];
              const expanded = expandedExamDocId === d.id;
              return (
                <li key={d.id} className="list-none">
                  <div
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-white transition-all",
                      expanded ? "border-[#CBD5E1] shadow-sm" : "border-[#E8EAED] hover:border-[#CBD5E1] hover:shadow-sm"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-stretch">
                      <button
                        type="button"
                        className="flex flex-1 items-start gap-3 p-4 text-left transition-colors hover:bg-[#FAFBFC]"
                        onClick={() => onExpandedExamDocId(expanded ? null : d.id)}
                        aria-expanded={expanded}
                      >
                        <ChevronDown
                          className={cn(
                            "mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform duration-200",
                            expanded ? "rotate-0" : "-rotate-90"
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="font-semibold text-foreground">
                              {DOCUMENT_TYPE_PT[d.document_type] ?? d.document_type}
                            </span>
                            <Badge variant="outline" className="font-mono text-[0.65rem] font-semibold">
                              {markers.length} marcador{markers.length === 1 ? "" : "es"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{formatPtDateTime(d.uploaded_at)}</p>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center justify-end gap-1 border-t border-[#F1F5F9] px-3 py-2 sm:border-l sm:border-t-0 sm:px-4">
                        {!backendUrl ? (
                          <span className="px-2 text-xs text-muted-foreground">Configure o backend</span>
                        ) : inlineOnly ? (
                          <span className="px-2 text-xs text-muted-foreground" title="OCR sem ficheiro no armazenamento">
                            Só metadados
                          </span>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-xl font-semibold text-[#4F46E5] hover:bg-[#EEF2FF] hover:text-[#4338CA]"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onOpenExam(d.id, "open");
                              }}
                            >
                              <Eye className="size-4" />
                              Ver
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-xl font-semibold text-muted-foreground hover:bg-muted"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onOpenExam(d.id, "download");
                              }}
                            >
                              <Download className="size-4" />
                              Baixar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {expanded ? (
                      <div className="border-t border-[#F1F5F9] bg-[#F8FAFC]/80 px-4 py-4">
                        {markers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sem biomarcadores associados a este exame (ou ainda não extraídos).</p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-[#E8EAED] bg-white">
                            <table className="w-full min-w-[520px] text-sm">
                              <thead>
                                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                  <th className="px-4 py-3 font-semibold">Data</th>
                                  <th className="px-4 py-3 font-semibold">Marcador</th>
                                  <th className="px-4 py-3 font-semibold">Valor</th>
                                  <th className="px-4 py-3 font-semibold">Un.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {markers.map((b) => (
                                  <tr key={b.id} className="border-b border-[#F1F5F9] last:border-0">
                                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                                      {formatPtDateTime(b.logged_at)}
                                    </td>
                                    <td className="px-4 py-2.5 font-medium">
                                      {b.name}
                                      {b.is_abnormal ? (
                                        <Badge variant="attention" className="ml-2 align-middle text-[0.65rem]">
                                          Atenção
                                        </Badge>
                                      ) : null}
                                    </td>
                                    <td className="px-4 py-2.5 tabular-nums">{formatBiomarkerValue(b)}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{b.unit ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!modalLoading && examBiomarkerGroups.orphans.length > 0 ? (
          <div className="rounded-2xl border border-[#E8EAED] bg-[#FFFBEB]/40 p-5">
            <h4 className="text-sm font-bold text-foreground">Marcadores sem exame associado</h4>
            <p className="mt-1 text-xs text-muted-foreground">Entradas antigas ou manuais sem documento de origem</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-[#E8EAED] bg-white">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Marcador</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Un.</th>
                  </tr>
                </thead>
                <tbody>
                  {examBiomarkerGroups.orphans.map((b) => (
                    <tr key={b.id} className="border-b border-[#F1F5F9] last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{formatPtDateTime(b.logged_at)}</td>
                      <td className="px-4 py-2.5 font-medium">
                        {b.name}
                        {b.is_abnormal ? (
                          <Badge variant="attention" className="ml-2 text-[0.65rem]">
                            Atenção
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{formatBiomarkerValue(b)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{b.unit ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <SectionTitle icon={Upload}>Anexar exame (equipe)</SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Foto ou PDF — o OCR atualiza biomarcadores e documentos no prontuário.
          </p>
        </div>

        {!backendUrl ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            Indique o URL do onco-backend em <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs">VITE_BACKEND_URL</code>{" "}
            (ou override em sessão em desenvolvimento).
          </div>
        ) : (
          <>
            {staffUploadMsg ? (
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm",
                  staffUploadMsg.includes("registado")
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
                )}
                role="status"
              >
                {staffUploadMsg}
              </div>
            ) : null}

            <div
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2",
                staffUploadBusy && "pointer-events-none opacity-80",
                dragActive
                  ? "border-[#6366F1] bg-[#EEF2FF]/60"
                  : "border-[#E2E8F0] bg-[#FAFBFC] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
              )}
              onDragEnter={onDrag}
              onDragLeave={onDrag}
              onDragOver={onDrag}
              onDrop={onDrop}
              onClick={pickFile}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pickFile();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Zona para arrastar ficheiro ou clicar para selecionar"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                disabled={staffUploadBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onStaffUpload(f);
                  e.target.value = "";
                }}
              />
              {staffUploadBusy ? (
                <Loader2 className="mb-3 size-10 animate-spin text-[#6366F1]" aria-hidden />
              ) : (
                <Upload className="mb-3 size-10 text-muted-foreground/70" strokeWidth={1.25} aria-hidden />
              )}
              <p className="text-sm font-semibold text-foreground">
                {staffUploadBusy ? "A processar OCR…" : "Arraste um ficheiro ou clique para selecionar"}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG, WebP ou PDF</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
