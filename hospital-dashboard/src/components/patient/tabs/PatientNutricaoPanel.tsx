import type { NutritionLogRow } from "@/types/dashboard";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { formatNutritionLogDetail } from "@/lib/patientModalHelpers";

type Props = {
  modalLoading: boolean;
  nutritionLogs: NutritionLogRow[];
};

function nutritionLogTypePt(logType: NutritionLogRow["log_type"]): string {
  switch (logType) {
    case "water":
      return "Água";
    case "coffee":
      return "Café";
    case "meal":
      return "Refeição";
    case "calories":
      return "Calorias";
    case "appetite":
      return "Apetite";
    default:
      return String(logType);
  }
}

export default function PatientNutricaoPanel({ modalLoading, nutritionLogs }: Props) {
  return (
    <div className="patient-modal__tab-panel space-y-6">
      <section className="patient-modal__section" style={{ borderTop: "none", paddingTop: 0 }}>
        <h3 className="patient-modal__section-title">Nutrição (app Aura)</h3>
        <p className="muted mb-4 text-sm">
          Registos de hidratação, refeições, calorias e apetite sincronizados a partir da aplicação do paciente.
        </p>
        {modalLoading ? (
          <p className="muted patient-modal__loading">A carregar…</p>
        ) : nutritionLogs.length === 0 ? (
          <p className="muted">Sem registos de nutrição recentes.</p>
        ) : (
          <div className="patient-modal__table-wrap">
            <table className="patient-modal__table">
              <thead>
                <tr>
                  <th>Data / hora</th>
                  <th>Tipo</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {nutritionLogs.map((n) => (
                  <tr key={n.id}>
                    <td>{formatPtDateTime(n.logged_at)}</td>
                    <td>{nutritionLogTypePt(n.log_type)}</td>
                    <td>{formatNutritionLogDetail(n)}</td>
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
