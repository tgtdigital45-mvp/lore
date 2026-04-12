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
                  <th>Registado</th>
                  <th>Tipo / categoria</th>
                  <th>Gravidade / PRD</th>
                  <th>Temp.</th>
                  <th>Triagem</th>
                </tr>
              </thead>
              <tbody>
                {modalSymptoms.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div>{formatPtDateTime(s.logged_at)}</div>
                      {s.symptom_started_at && s.symptom_ended_at ? (
                        <div className="muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                          Episódio: {formatPtDateTime(s.symptom_started_at)} → {formatPtDateTime(s.symptom_ended_at)}
                        </div>
                      ) : null}
                    </td>
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
          Sintomas alinhados à app Aura: escala verbal (não presente … grave) e janela de episódio quando aplicável. PRD:
          dor, náusea e fadiga (0–10).
        </p>
      </section>
    </div>
  );
}
