import { BookHeart, Trash2 } from "lucide-react";
import type { SymptomLogDetail } from "../../../types/dashboard";
import { formatPtDateTime } from "../../../lib/dashboardFormat";
import { symptomCategoryLabel, symptomSeverityLabel, symptomSeverityPillClass } from "../../../lib/patientModalHelpers";
import { ClinicalEmptyState } from "@/components/patient/ClinicalEmptyState";
import { LoadingInline } from "@/components/ui/LoadingInline";
import { Button } from "@/components/ui/button";

type Props = {
  modalLoading: boolean;
  modalSymptoms: SymptomLogDetail[];
  onDelete?: (id: string) => Promise<void>;
};

export default function PatientDiarioPanel({ modalLoading, modalSymptoms, onDelete }: Props) {
  const handleDelete = (id: string) => {
    if (!onDelete) return;
    if (confirm("Tem certeza que deseja excluir este registro de sintoma?")) {
      void onDelete(id);
    }
  };

  return (
    <div className="patient-modal__tab-panel">
      <section className="patient-modal__section" style={{ borderTop: "none", paddingTop: 0 }}>
        <h3 className="patient-modal__section-title">Histórico de sintomas</h3>
        {modalLoading ? (
          <div className="py-4"><LoadingInline /></div>
        ) : modalSymptoms.length === 0 ? (
          <ClinicalEmptyState
            icon={BookHeart}
            title="Sem registros de sintomas"
            description="Quando o paciente registar sintomas na app Aura, o histórico aparece aqui."
            className="border-none bg-transparent p-6"
          />
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
                  <th className="w-10"></th>
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
                    <td>
                      {onDelete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-destructive"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </td>
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
