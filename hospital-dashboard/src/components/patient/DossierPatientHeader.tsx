import { AlertTriangle, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CANCER_PT } from "@/constants/dashboardLabels";
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
  className?: string;
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
  className,
}: DossierPatientHeaderProps) {
  const cancer = CANCER_PT[riskRow.primary_cancer_type] ?? riskRow.primary_cancer_type;
  const rating =
    riskRow.risk >= 3 ? "Quente" : riskRow.risk >= 2 ? "Morno" : "Frio";

  return (
    <div className={cn("border-b border-slate-100 bg-white px-4 py-6 md:px-6", className)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <Avatar className="size-14 shrink-0 rounded-full border-2 border-white shadow-card ring-2 ring-teal-100 md:size-16">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" className="object-cover" /> : null}
            <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-700 text-lg font-black text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{name}</h1>
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
            <p className="mt-2 text-sm text-slate-500">
              {age ?? "—"} anos · <span className="font-mono text-slate-700">{code}</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{cancer}</p>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-right text-xs sm:text-sm">
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
              <p className="font-semibold text-teal-700">Equipa hospitalar</p>
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
