import { Card } from "@/components/ui/card";
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

    </div>
  );
}
