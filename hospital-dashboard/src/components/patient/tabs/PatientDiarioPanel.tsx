import { SEVERITY_PT } from "../../../constants/dashboardLabels";
import type { SymptomLogDetail } from "../../../types/dashboard";
import { formatPtDateTime } from "../../../lib/dashboardFormat";
import { symptomCategoryLabel, symptomSeverityLabel, symptomSeverityPillClass } from "../../../lib/patientModalHelpers";

type Props = {
  modalLoading: boolean;
  modalSymptoms: SymptomLogDetail[];
};

export default function PatientDiarioPanel({ modalLoading, modalSymptoms }: Props) {
  return (
    <div className="patient-modal__tab-panel">
      <section className="patient-modal__section" style={{ borderTop: "none", paddingTop: 0 }}>
        <h3 className="patient-modal__section-title">Histórico de sintomas</h3>
        {modalLoading ? (
          <p className="muted patient-modal__loading">Carregando…</p>
        ) : modalSymptoms.length === 0 ? (
          <p className="muted">Sem registros.</p>
        ) : (
          <div className="patient-modal__table-wrap">
            <table className="patient-modal__table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo / categoria</th>
                  <th>Gravidade / PRD</th>
                  <th>Temp.</th>
                  <th>Triagem</th>
                </tr>
              </thead>
              <tbody>
                {modalSymptoms.map((s) => (
                  <tr key={s.id}>
                    <td>{formatPtDateTime(s.logged_at)}</td>
                    <td>{symptomCategoryLabel(s)}</td>
                    <td>
                      <span className={`pill pill--compact ${symptomSeverityPillClass(s)}`}>{symptomSeverityLabel(s)}</span>
                    </td>
                    <td>{s.body_temperature != null ? `${s.body_temperature} °C` : "—"}</td>
                    <td>{s.requires_action ? <span className="alert-badge">Prioridade</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.75rem" }}>
          Legado: gravidade categórica ({Object.values(SEVERITY_PT).slice(0, 3).join(", ")}). PRD: escalas 0–10.
        </p>
      </section>
    </div>
  );
}
