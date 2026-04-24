import type { WearableSampleRow } from "@/types/dashboard";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { LoadingInline } from "@/components/ui/LoadingInline";

type Props = {
  modalLoading: boolean;
  wearables: WearableSampleRow[];
};

function wearableMetricPt(metric: string): string {
  const m: Record<string, string> = {
    heart_rate: "Freq. cardíaca",
    oxygen_saturation: "SpO₂",
    hrv_sdnn: "VFC (HRV)",
    falls_count: "Quedas",
    walking_steadiness_event: "Estabilidade ao caminhar",
    steps: "Passos",
    active_energy: "Energia ativa",
    distance_walking_running: "Distância",
    basal_energy: "Energia basal",
    exercise_time: "Tempo de exercício",
    stand_hours: "Horas em pé",
    flights_climbed: "Degraus",
  };
  return m[metric] ?? metric.replace(/_/g, " ");
}

export default function PatientAtividadesPanel({ modalLoading, wearables }: Props) {
  return (
    <div className="patient-modal__tab-panel space-y-6">
      <section className="patient-modal__section" style={{ borderTop: "none", paddingTop: 0 }}>
        <h3 className="patient-modal__section-title">Atividade e Apple Health</h3>
        <p className="muted mb-4 text-sm">
          Amostras enviadas pelo celular (ex.: passos, frequência cardíaca, VFC) quando o paciente autoriza a sincronização.
        </p>
        {modalLoading ? (
          <div className="py-4"><LoadingInline /></div>
        ) : wearables.length === 0 ? (
          <p className="muted">Sem dados de atividade ou wearables no período recente.</p>
        ) : (
          <div className="patient-modal__table-wrap">
            <table className="patient-modal__table">
              <thead>
                <tr>
                  <th>Data / hora</th>
                  <th>Métrica</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {wearables.map((w) => (
                  <tr key={w.id}>
                    <td>{formatPtDateTime(w.observed_start)}</td>
                    <td>{wearableMetricPt(w.metric)}</td>
                    <td>
                      {w.value_numeric != null
                        ? w.unit?.trim()
                          ? `${w.value_numeric} ${w.unit.trim()}`
                          : String(w.value_numeric)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
