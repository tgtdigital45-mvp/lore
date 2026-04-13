import { useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { DOCUMENT_TYPE_PT } from "../../../constants/dashboardLabels";
import {
  examUsesUploadDateOnly,
  formatExamDayPt,
  formatProfessionalRegistriesLine,
  getAiConfidenceNote,
  getAiSummaryPtBr,
  getDoctorNameFromJson,
  getDocumentTitle,
  getProfessionalRegistriesFromJson,
} from "@/lib/medicalDocumentMeta";
import { formatBiomarkerValue, formatPtDateTime } from "../../../lib/dashboardFormat";
import { buildMetricHistorySeries, type MetricHistoryChartModel } from "@/lib/biomarkerHistoryChart";
import { examDisplayDateIso } from "@/lib/examDisplayDate";
import { useBiomarkerHistoryContext } from "@/hooks/useBiomarkerHistoryContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { BiomarkerModalRow, MedicalDocModalRow } from "../../../types/dashboard";

type ChartPoint = { value: number; label: string; formattedValue: string };

function MetricTrendChart({
  model,
  abnormal,
  unit,
}: {
  model: MetricHistoryChartModel;
  abnormal: boolean;
  unit: string | null;
}) {
  const stroke = abnormal ? "#EA580C" : "#4F46E5";
  const fill = abnormal ? "#EA580C" : "#6366F1";
  const u = unit?.trim() ?? "";

  const chartData = useMemo((): ChartPoint[] => {
    if (model.kind !== "chart") return [];
    return model.data.map((d) => ({
      ...d,
      formattedValue: u ? `${d.value} ${u}`.trim() : String(d.value),
    }));
  }, [model, u]);

  const valueByLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of chartData) {
      m.set(row.label, row.formattedValue);
    }
    return m;
  }, [chartData]);

  if (model.kind === "non_numeric") {
    return (
      <div className="rounded-xl bg-[#F8FAFC] px-4 py-3 text-center text-xs text-muted-foreground">
        Valor não numérico neste e nos outros registros — gráfico indisponível.
      </div>
    );
  }
  if (model.kind === "empty") {
    return (
      <div className="rounded-xl bg-[#F8FAFC] px-4 py-3 text-center text-xs text-muted-foreground">{model.hint}</div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {model.otherExams > 0
          ? `Evolução com ${model.otherExams} outro(s) exame(s) do mesmo tipo (datas por exame).`
          : "Evolução no tempo (mesmo tipo de exame). Adicione exames anteriores para ver tendência."}
      </p>
      <div className="w-full min-w-0">
        <ResponsiveContainer width="100%" height={170} minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 8, right: 10, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-[#E8EAED]" />
            <XAxis
              dataKey="label"
              tick={(props) => {
                const x = Number(props.x);
                const y = Number(props.y);
                const label = String((props.payload as { value?: unknown } | undefined)?.value ?? "");
                const tip = valueByLabel.get(label) ?? label;
                return (
                  <g transform={`translate(${x},${y})`} className="cursor-default">
                    <title>{`Valor nesta data: ${tip}`}</title>
                    <text
                      x={0}
                      y={0}
                      dy={14}
                      textAnchor="middle"
                      fill="hsl(var(--muted-foreground))"
                      fontSize={10}
                    >
                      {label}
                    </text>
                  </g>
                );
              }}
              height={32}
            />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={40} />
            <RechartsTooltip
              formatter={(v) => {
                if (v === undefined || v === null) return ["—", "Valor"];
                const display =
                  typeof v === "number" && u ? `${v} ${u}`.trim() : String(v);
                return [display, "Valor"];
              }}
              labelFormatter={(lbl) => `Data ${lbl}`}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e8eaed",
                fontSize: "12px",
              }}
            />
            <Area type="monotone" dataKey="value" stroke={stroke} fill={fill} fillOpacity={0.12} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type Props = {
  patientId: string | undefined;
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

/** Texto vindo do OCR: intervalo no documento + eventual alerta clínico. */
function biomarkerReferenceTooltipBody(b: BiomarkerModalRow): string | null {
  const range = b.reference_range?.trim();
  const alert = b.reference_alert?.trim();
  if (range && alert) {
    return `Referência no documento: ${range}\n\n${alert}`;
  }
  if (range) return `Referência no documento: ${range}`;
  return alert ?? null;
}

function BiomarkerResultValue({
  b,
  variant = "card",
  showUnit = true,
}: {
  b: BiomarkerModalRow;
  variant?: "card" | "table";
  /** Em tabelas com coluna de unidade separada, use false. */
  showUnit?: boolean;
}) {
  const refText = biomarkerReferenceTooltipBody(b);
  const valueClass =
    variant === "card"
      ? cn("text-lg font-bold tabular-nums", b.is_abnormal ? "text-[#C2410C]" : "text-[#4F46E5]")
      : cn("font-medium tabular-nums", b.is_abnormal ? "text-[#C2410C]" : "text-foreground");
  const unitClass =
    variant === "card" ? "ml-1 text-sm font-medium text-muted-foreground" : "ml-1 text-xs text-muted-foreground";

  const inner = (
    <span className={valueClass}>
      {formatBiomarkerValue(b)}
      {showUnit && b.unit ? <span className={unitClass}>{b.unit}</span> : null}
    </span>
  );

  if (!refText) {
    return variant === "card" ? <div className="shrink-0 text-left sm:text-right">{inner}</div> : <>{inner}</>;
  }

  const triggerClass =
    variant === "card"
      ? cn(
          "-m-1 rounded-lg p-1 text-left sm:text-right outline-none",
          "cursor-help border border-transparent hover:border-[#E2E8F0] hover:bg-[#F8FAFC]",
          "focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2"
        )
      : cn(
          "cursor-help rounded-md border border-transparent px-0.5 outline-none",
          "hover:border-[#E2E8F0] hover:bg-[#F8FAFC]",
          "focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-1"
        );

  const wrap = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={triggerClass} aria-label="Valores de referência do documento">
          {inner}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs sm:max-w-sm" sideOffset={8}>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Valores de referência</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-snug text-foreground">{refText}</p>
      </TooltipContent>
    </Tooltip>
  );

  if (variant === "card") {
    return <div className="shrink-0 text-left sm:text-right">{wrap}</div>;
  }
  return wrap;
}

export default function PatientExamesPanel({
  patientId,
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

  const historyInvalidationKey = useMemo(
    () =>
      `${modalMedicalDocs
        .map((d) => d.id)
        .sort()
        .join(",")}|${modalBiomarkers.length}`,
    [modalMedicalDocs, modalBiomarkers.length]
  );

  const { ready: historyReady, logs: histLogs, docMap: histDocMap } = useBiomarkerHistoryContext(
    patientId,
    historyInvalidationKey
  );

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
    <TooltipProvider delayDuration={250}>
    <div className="space-y-10 font-sans">
      <section className="space-y-4">
        <div>
          <SectionTitle icon={FileText}>Exames</SectionTitle>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Clique na linha do exame (ou na seta) para expandir: vê as métricas extraídas do PDF/OCR e, quando existirem vários exames do mesmo
            tipo (ex.: dois hemogramas), gráficos de evolução por data de exame — alinhados à app do paciente. Use Ver ou Baixar quando existir
            arquivo no armazenamento.
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
          <div className="space-y-3" aria-busy="true" aria-label="Carregando exames">
            <div className="h-[4.5rem] animate-pulse rounded-2xl bg-[#F1F5F9]" />
            <div className="h-[4.5rem] animate-pulse rounded-2xl bg-[#F1F5F9]" />
          </div>
        ) : modalMedicalDocs.length === 0 && examBiomarkerGroups.orphans.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] px-6 py-12 text-center">
            <FileText className="mb-3 size-10 text-muted-foreground/50" strokeWidth={1.25} />
            <p className="text-sm font-medium text-foreground">Nenhum exame ou marcador registrado</p>
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
              const docTitle = getDocumentTitle(d);
              const aiJson = d.ai_extracted_json;
              const doctorLine = getDoctorNameFromJson(aiJson ?? undefined);
              const registryLine = formatProfessionalRegistriesLine(getProfessionalRegistriesFromJson(aiJson ?? undefined));
              const examDayIso = examDisplayDateIso(d);
              const examDayLabel = formatExamDayPt(examDayIso);
              const uploadFallback = examUsesUploadDateOnly(d);
              const abnormalAlerts = markers.filter((m) => m.is_abnormal && m.reference_alert?.trim());
              const aiSummary = getAiSummaryPtBr(aiJson ?? undefined);
              const aiNote = getAiConfidenceNote(aiJson ?? undefined);
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
                            <span className="font-semibold leading-snug text-foreground">{docTitle}</span>
                            <Badge variant="outline" className="shrink-0 font-mono text-[0.65rem] font-semibold">
                              {markers.length} marcador{markers.length === 1 ? "" : "es"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/80">
                              {DOCUMENT_TYPE_PT[d.document_type] ?? d.document_type}
                            </span>
                            <span className="text-muted-foreground"> · </span>
                            <span>Data do exame: {examDayLabel}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Médico (documento): <span className="text-foreground/90">{doctorLine}</span>
                          </p>
                          {registryLine ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Registos (CRM, CRO…): <span className="text-foreground/90">{registryLine}</span>
                            </p>
                          ) : null}
                          <p className="mt-0.5 text-[0.7rem] text-muted-foreground/90">
                            Registado na app: {formatPtDateTime(d.uploaded_at)}
                          </p>
                          {uploadFallback ? (
                            <p className="mt-1 text-[0.65rem] leading-snug text-muted-foreground/90">
                              Não foi possível ler a data do exame no documento — está indicada a data de registo na app.
                            </p>
                          ) : null}
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center justify-end gap-1 border-t border-[#F1F5F9] px-3 py-2 sm:border-l sm:border-t-0 sm:px-4">
                        {!backendUrl ? (
                          <span className="px-2 text-xs text-muted-foreground">Configure o backend</span>
                        ) : inlineOnly ? (
                          <span className="px-2 text-xs text-muted-foreground" title="OCR sem arquivo no armazenamento">
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
                        {abnormalAlerts.length > 0 ? (
                          <div
                            className="mb-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2]/95 px-4 py-3 text-sm"
                            role="region"
                            aria-label="Alerta clínico"
                          >
                            <div className="flex gap-3">
                              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#DC2626]" aria-hidden />
                              <div className="min-w-0">
                                <p className="font-bold text-[#991B1B]">Alerta clínico</p>
                                <p className="mt-1 text-xs leading-relaxed text-[#7F1D1D]">
                                  Valores fora do intervalo de referência indicado no próprio documento (não substitui avaliação médica).
                                </p>
                                <ul className="mt-3 space-y-3">
                                  {abnormalAlerts.map((m) => (
                                    <li
                                      key={m.id}
                                      className="border-b border-[#FECACA]/80 pb-3 last:border-0 last:pb-0"
                                    >
                                      <p className="font-bold text-[#7F1D1D]">{m.name}</p>
                                      <p className="mt-1 text-[#991B1B]">
                                        Valor: {formatBiomarkerValue(m)}
                                        {m.unit ? ` ${m.unit}` : ""}
                                      </p>
                                      {m.reference_range?.trim() ? (
                                        <p className="mt-1 text-sm text-[#7F1D1D]">
                                          Referência no documento: {m.reference_range.trim()}
                                        </p>
                                      ) : null}
                                      {m.reference_alert?.trim() ? (
                                        <p className="mt-2 text-sm leading-relaxed text-[#7F1D1D]">{m.reference_alert.trim()}</p>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="mb-4 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <Sparkles className="size-5 shrink-0 text-[#4F46E5]" aria-hidden />
                            <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[#4F46E5]">Análise da IA</p>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-foreground">
                            {aiSummary || "Sem resumo disponível."}
                          </p>
                          {aiNote ? (
                            <div className="mt-3 border-t border-[#F1F5F9] pt-3">
                              <p className="text-xs font-bold text-muted-foreground">Nota da IA (leitura automática)</p>
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{aiNote}</p>
                            </div>
                          ) : null}
                        </div>

                        {markers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sem biomarcadores associados a este exame (ou ainda não extraídos).</p>
                        ) : !historyReady ? (
                          <p className="text-sm text-muted-foreground" aria-busy="true">
                            Carregando histórico para gráficos…
                          </p>
                        ) : (
                          <ul className="space-y-4">
                            {markers.map((b) => {
                              const trend = buildMetricHistorySeries(b.name, histLogs, histDocMap, {
                                documentType: d.document_type,
                                currentDocumentId: d.id,
                                currentReading: {
                                  valueText: formatBiomarkerValue(b),
                                  examDateIso: examDisplayDateIso(d),
                                },
                              });
                              return (
                                <li
                                  key={b.id}
                                  className={cn(
                                    "overflow-hidden rounded-2xl border bg-white p-4 shadow-sm",
                                    b.is_abnormal ? "border-amber-200/90 bg-[#FFFBEB]/40" : "border-[#E8EAED]"
                                  )}
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-foreground">{b.name}</span>
                                        {b.is_abnormal ? (
                                          <Badge variant="attention" className="text-[0.65rem]">
                                            Atenção
                                          </Badge>
                                        ) : null}
                                      </div>
                                      <p className="mt-1 text-xs text-muted-foreground">{formatPtDateTime(b.logged_at)}</p>
                                    </div>
                                    <BiomarkerResultValue b={b} variant="card" />
                                  </div>
                                  <div className="mt-4 border-t border-[#F1F5F9] pt-4">
                                    <MetricTrendChart model={trend} abnormal={b.is_abnormal} unit={b.unit} />
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
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
                      <td className="px-4 py-2.5">
                        <BiomarkerResultValue b={b} variant="table" showUnit={false} />
                      </td>
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
                  staffUploadMsg.includes("registrado")
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
              aria-label="Zona para arrastar arquivo ou clicar para selecionar"
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
                {staffUploadBusy ? "A processar OCR…" : "Arraste um arquivo ou clique para selecionar"}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG, WebP ou PDF</p>
            </div>
          </>
        )}
      </section>
    </div>
    </TooltipProvider>
  );
}
