"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Eye, EyeOff, MessageSquare, MoreHorizontal, Volume2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CANCER_PT } from "@/constants/dashboardLabels";
import { maskPatientCodeDisplay } from "@/lib/patientCode";
import { cn } from "@/lib/utils";
import type { RiskRow } from "@/types/dashboard";

export type DossierPatientHeaderProps = {
  riskRow: RiskRow;
  name: string;
  avatarUrl: string | null;
  initials: string;
  age: string | null;
  code: string;
  alertCount: number;
  onOpenReport: () => void;
  /** Relative link to messages tab (e.g. `?tab=mensagens`). Omitted when not shown. */
  messagesTo?: string | null;
  className?: string;
  /** Alerta sonoro via Realtime quando a temperatura ultrapassa regras de febre. */
  feverSound?: { enabled: boolean; onChange: (next: boolean) => void } | null;
};

/**
 * Cabeçalho do prontuário — nome, foto, badges e metadados estilo CRM.
 */
export function DossierPatientHeader({
  riskRow,
  name,
  avatarUrl,
  initials,
  age,
  code,
  alertCount,
  onOpenReport,
  messagesTo,
  className,
  feverSound,
}: DossierPatientHeaderProps) {
  const [patientCodeVisible, setPatientCodeVisible] = useState(true);
  const cancer = CANCER_PT[riskRow.primary_cancer_type] ?? riskRow.primary_cancer_type;
  const rating =
    riskRow.risk >= 3 ? "Quente" : riskRow.risk >= 2 ? "Morno" : "Frio";

  return (
    <div className={cn("border-b border-slate-100 bg-white px-[clamp(12px,2vw,32px)] py-[clamp(12px,2vw,24px)]", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <Avatar className="size-[clamp(48px,5vw,64px)] shrink-0 rounded-full border-2 border-white shadow-card ring-2 ring-teal-100">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" className="object-cover" /> : null}
            <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-700 text-lg font-black text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[clamp(20px,2.5vw,32px)] font-black tracking-tight text-slate-900 leading-tight">{name}</h1>
              {riskRow.current_stage ? (
                <Badge className="rounded-full border-0 bg-lime-200 px-3 py-1 text-xs font-bold text-lime-900">
                  {riskRow.current_stage}
                </Badge>
              ) : null}
              <Badge variant="secondary" className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-900">
                {riskRow.riskLabel ?? "Triagem"}
              </Badge>
              {alertCount > 0 ? (
                <Badge className="flex items-center gap-1 rounded-full border-0 bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  {alertCount} alerta{alertCount > 1 ? "s" : ""}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[clamp(12px,0.8vw,14px)] text-slate-500">
              <span className="font-medium">
                {age ?? "—"} anos
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 font-mono text-slate-700 tabular-nums">
                {patientCodeVisible ? code : maskPatientCodeDisplay(code)}
              </span>
              <button
                type="button"
                className="inline-flex shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label={patientCodeVisible ? "Ocultar código do paciente" : "Mostrar código do paciente"}
                aria-pressed={patientCodeVisible}
                title={patientCodeVisible ? "Ocultar código" : "Mostrar código"}
                onClick={() => setPatientCodeVisible((v) => !v)}
              >
                {patientCodeVisible ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
              </button>
            </p>
            <p className="mt-1 text-[clamp(12px,0.8vw,14px)] font-semibold text-slate-800">{cancer}</p>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          {messagesTo ? (
            <Link
              href={messagesTo}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-800 shadow-sm transition-colors hover:bg-teal-50 sm:justify-end"
            >
              <MessageSquare className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              Mensagens
            </Link>
          ) : null}
          {feverSound ? (
            <label className="flex cursor-pointer select-none items-center justify-end gap-2 rounded-2xl border border-amber-100/80 bg-amber-50/50 px-3 py-2 text-left text-sm text-amber-950 sm:justify-end">
              <input
                type="checkbox"
                className="size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                checked={feverSound.enabled}
                onChange={() => feverSound.onChange(!feverSound.enabled)}
                aria-label="Ativar som quando febre atingir o limiar das regras"
              />
              <Volume2 className="size-4 shrink-0 text-amber-800" strokeWidth={2} aria-hidden />
              <span className="max-w-[11rem] font-medium leading-tight sm:text-right">
                Som de alerta (febre)
              </span>
            </label>
          ) : null}
          <div className="grid grid-cols-2 gap-x-[clamp(16px,2vw,32px)] gap-y-2 text-right text-[clamp(11px,0.7vw,13px)]">
            <div>
              <p className="font-medium uppercase tracking-wide text-slate-400">Prioridade</p>
              <p className="font-semibold text-slate-800">{rating}</p>
            </div>
            <div>
              <p className="font-medium uppercase tracking-wide text-slate-400">Estado</p>
              <p className="font-semibold text-slate-800">{riskRow.is_in_nadir ? "Nadir" : "Seguimento"}</p>
            </div>
            <div className="col-span-2">
              <p className="font-medium uppercase tracking-wide text-slate-400">OncoCare</p>
              <p className="font-semibold text-teal-700">Equipe hospitalar</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 rounded-full border-slate-200 shadow-sm transition-all duration-200 hover:bg-slate-50"
            aria-label="Relatório e opções"
            onClick={onOpenReport}
          >
            <MoreHorizontal className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
