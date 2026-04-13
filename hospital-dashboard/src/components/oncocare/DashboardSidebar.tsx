import { Activity, CheckCircle2, MessageSquare, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CANCER_PT } from "@/constants/dashboardLabels";
import { formatPtShort, formatPtTimeShort } from "@/lib/dashboardFormat";
import { profileName, profileAvatarUrl, initialsFromName } from "@/lib/dashboardProfile";
import { PatientFaceThumb } from "./PatientFaceThumb";
import { clinicalTier, TIER_ACCENT } from "@/lib/clinicalTier";
import type { RiskRow } from "@/types/dashboard";

type Props = {
  alertRows: RiskRow[];
  busy: boolean;
};

const MOCK_ACTIVITY = [
  { icon: CheckCircle2, text: "Triagem concluída: revisão de estável", tone: "text-[#22C55E]" },
  { icon: MessageSquare, text: "Nova mensagem na fila de outbound", tone: "text-[#6366F1]" },
  { icon: Activity, text: "Novos exames processados (OCR)", tone: "text-[#6366F1]" },
] as const;

export function DashboardSidebar({ alertRows, busy }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-3xl border border-[#E8EAED] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Alertas recentes</h3>
        {busy ? (
          <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>
        ) : alertRows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sem alertas prioritários.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {alertRows.slice(0, 5).map((r) => {
              const t = clinicalTier(r);
              const dot = TIER_ACCENT[t];
              const nm = profileName(r.profiles);
              const av = profileAvatarUrl(r.profiles);
              return (
                <li key={r.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: dot }} />
                  <PatientFaceThumb
                    url={av}
                    initials={initialsFromName(nm)}
                    className="mt-0.5 size-9 rounded-xl text-[0.65rem]"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{nm}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.hasClinicalAlert ? r.alertReasons[0] ?? "Alerta clínico" : CANCER_PT[r.primary_cancer_type] ?? r.primary_cancer_type}
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground">{formatPtShort(r.lastSymptomAt)} · {formatPtTimeShort(r.lastSymptomAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="rounded-3xl border border-[#E8EAED] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Atividade em tempo real</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {MOCK_ACTIVITY.map((a, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <a.icon className={`mt-0.5 size-4 shrink-0 ${a.tone}`} strokeWidth={2} />
              <span className="leading-snug text-foreground/90">{a.text}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="rounded-3xl border border-[#E8EAED] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Adesão à pré-habilitação</h3>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-1">
                <Stethoscope className="size-3.5" /> Nutrição
              </span>
              <span>78%</span>
            </div>
            <Progress value={78} className="h-2 rounded-full bg-[#F1F5F9]" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold">
              <span>Exercícios</span>
              <span>62%</span>
            </div>
            <Progress value={62} className="h-2 rounded-full bg-[#F1F5F9]" />
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-[#DCFCE7] px-3 py-2 text-center text-xs font-semibold text-[#166534]">
          +5% em relação à semana anterior
        </p>
      </Card>
    </div>
  );
}
