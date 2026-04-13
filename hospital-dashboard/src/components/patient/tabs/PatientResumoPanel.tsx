import { CANCER_PT, CYCLE_STATUS_PT } from "../../../constants/dashboardLabels";
import type { MergedAlertRules } from "../../../types/dashboard";
import type {
  CycleReadinessRow,
  MedicationLogRow,
  NutritionLogRow,
  RiskRow,
  SymptomLogDetail,
  TreatmentCycleRow,
  TreatmentInfusionRow,
  VitalLogRow,
  WearableSampleRow,
} from "../../../types/dashboard";
import { formatPtDateLong, formatPtDateTime } from "../../../lib/dashboardFormat";
import { calculateSuspensionRisk } from "../../../lib/suspensionRisk";
import { ClinicalHeader } from "../ClinicalHeader";
import { ToxicityHeatmap } from "../ToxicityHeatmap";
import { VitalsTrendCharts } from "../VitalsTrendCharts";
import { WearableVitalsChart } from "../WearableVitalsChart";
import { TemperatureAreaChart } from "../TemperatureAreaChart";
import { OncoSuspensionGauge } from "../OncoSuspensionGauge";
import { InterventionTimeline } from "../InterventionTimeline";
import { medicationLogWhenIso, medicationNameFromLog } from "../../../lib/patientModalHelpers";

type Props = {
  modalPatient: RiskRow;
  triageRules: MergedAlertRules;
  modalLoading: boolean;
  modalError: string | null;
  modalCycles: TreatmentCycleRow[];
  modalInfusions: TreatmentInfusionRow[];
  modalSymptoms: SymptomLogDetail[];
  modalVitals: VitalLogRow[];
  modalWearables: WearableSampleRow[];
  modalMedicationLogs: MedicationLogRow[];
  modalNutritionLogs: NutritionLogRow[];
  modalCycleReadiness: CycleReadinessRow | null;
};

export default function PatientResumoPanel({
  modalPatient,
  triageRules,
  modalLoading,
  modalError,
  modalCycles,
  modalInfusions,
  modalSymptoms,
  modalVitals,
  modalWearables,
  modalMedicationLogs,
  modalNutritionLogs,
  modalCycleReadiness,
}: Props) {
  const suspension = calculateSuspensionRisk(
    modalPatient,
    modalSymptoms,
    modalVitals,
    modalWearables,
    triageRules.fever_celsius_min
  );

  const intercorrencias = modalSymptoms.filter((s) => s.requires_action === true).slice(0, 12);

  return (
    <div className="patient-modal__tab-panel">
      <ClinicalHeader patient={modalPatient} cycles={modalCycles} infusions={modalInfusions} loading={modalLoading} />

      <div className="patient-modal__grid" style={{ marginTop: "0.75rem" }}>
        <div className="patient-modal__card patient-modal__card--sem" style={{ borderColor: "color-mix(in srgb, var(--status-medication) 30%, transparent)" }}>
          <h3 className="patient-modal__label" style={{ color: "var(--status-medication)" }}>
            Tumor
          </h3>
          <p className="patient-modal__value">{CANCER_PT[modalPatient.primary_cancer_type] ?? modalPatient.primary_cancer_type}</p>
        </div>
        <div className="patient-modal__card" style={{ borderColor: "color-mix(in srgb, var(--risk-critical) 25%, transparent)" }}>
          <h3 className="patient-modal__label" style={{ color: "var(--risk-critical)" }}>
            Nadir
          </h3>
          <p className="patient-modal__value">{modalPatient.is_in_nadir ? "Sim — vigilância febril" : "Não"}</p>
        </div>
        <div className="patient-modal__card">
          <h3 className="patient-modal__label">Risco (triagem 7 dias)</h3>
          <p className="patient-modal__value">
            <span className={`pill ${modalPatient.riskClass}`}>{modalPatient.riskLabel}</span>
          </p>
        </div>
        <div className="patient-modal__card">
          <h3 className="patient-modal__label">Alerta clínico ({triageRules.alert_window_hours}h)</h3>
          <p className="patient-modal__value">
            {modalPatient.hasClinicalAlert ? (
              <>
                <span className="alert-badge">Sim</span>
                <span className="muted" style={{ display: "block", marginTop: "0.35rem", fontSize: "0.85rem" }}>
                  {modalPatient.alertReasons.join(" · ")}
                </span>
              </>
            ) : (
              "Sem critérios na janela atual"
            )}
          </p>
        </div>
        {modalCycleReadiness ? (
          <div
            className="patient-modal__card"
            style={{
              borderColor:
                modalCycleReadiness.readiness_status === "hold"
                  ? "color-mix(in srgb, var(--risk-critical) 35%, transparent)"
                  : modalCycleReadiness.readiness_status === "likely_ok"
                    ? "color-mix(in srgb, var(--status-ok) 35%, transparent)"
                    : undefined,
            }}
          >
            <h3 className="patient-modal__label">Próximo ciclo (heurística)</h3>
            <p className="patient-modal__value">
              <span
                className={`pill ${
                  modalCycleReadiness.readiness_status === "hold"
                    ? "risk-critical"
                    : modalCycleReadiness.readiness_status === "likely_ok"
                      ? "risk-low"
                      : "risk-mid"
                }`}
              >
                {modalCycleReadiness.readiness_status === "hold"
                  ? "Aguardar / rever"
                  : modalCycleReadiness.readiness_status === "likely_ok"
                    ? "Provável apto"
                    : "Rever com equipa"}
              </span>
              {modalCycleReadiness.protocol_name ? (
                <span className="muted" style={{ display: "block", marginTop: "0.35rem", fontSize: "0.85rem" }}>
                  Protocolo: {modalCycleReadiness.protocol_name}
                </span>
              ) : null}
              {modalCycleReadiness.readiness_reasons?.length ? (
                <span className="muted" style={{ display: "block", marginTop: "0.35rem", fontSize: "0.85rem" }}>
                  {modalCycleReadiness.readiness_reasons.join(" · ")}
                </span>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>

      <section className="patient-modal__section">
        <h3 className="patient-modal__section-title">Temperatura (tendência)</h3>
        {modalLoading ? <p className="muted patient-modal__loading">Carregando…</p> : <TemperatureAreaChart vitals={modalVitals} />}
      </section>

      <section className="patient-modal__section">
        <h3 className="patient-modal__section-title">Risco de suspensão & intercorrências</h3>
        <OncoSuspensionGauge score={suspension.score} reasons={suspension.reasons} />
        <h4 className="patient-modal__micro-label" style={{ marginTop: "1rem" }}>
          Registros com prioridade (triagem)
        </h4>
        <InterventionTimeline entries={intercorrencias} />
      </section>

      <section className="patient-modal__section">
        <h3 className="patient-modal__section-title">Mapa de calor — toxicidade (sintomas)</h3>
        {modalLoading ? <p className="muted patient-modal__loading">Carregando…</p> : <ToxicityHeatmap symptoms={modalSymptoms} days={28} />}
      </section>

      <section className="patient-modal__section">
        <h3 className="patient-modal__section-title">Sinais vitais (app)</h3>
        {modalLoading ? <p className="muted patient-modal__loading">Carregando…</p> : <VitalsTrendCharts vitals={modalVitals} hideTemperature />}
      </section>

      <section className="patient-modal__section">
        <h3 className="patient-modal__section-title">Wearables</h3>
        {modalLoading ? <p className="muted patient-modal__loading">Carregando…</p> : <WearableVitalsChart samples={modalWearables} />}
      </section>

      <section className="patient-modal__section">
        <h3 className="patient-modal__section-title">Histórico de quimioterapia</h3>
        {modalLoading ? (
          <p className="muted patient-modal__loading">Carregando…</p>
        ) : modalError ? (
          <p className="error">{modalError}</p>
        ) : modalCycles.length === 0 ? (
          <p className="patient-modal__empty-hint">Nenhum ciclo registrado no sistema.</p>
        ) : (
          <div className="patient-modal__table-wrap patient-modal__table-wrap--chemo">
            <table className="patient-modal__table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {modalCycles.map((c) => (
                  <tr key={c.id}>
                    <td>{c.protocol_name}</td>
                    <td>{formatPtDateLong(c.start_date)}</td>
                    <td>{c.end_date ? formatPtDateLong(c.end_date) : "—"}</td>
                    <td>{CYCLE_STATUS_PT[c.status] ?? c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="patient-modal__section">
        <h3 className="patient-modal__section-title">Últimas tomas de medicação</h3>
        <p className="patient-modal__micro-label">Requer vínculo aprovado paciente–hospital para ver histórico completo</p>
        {modalMedicationLogs.length === 0 ? (
          <p className="patient-modal__empty-hint">Nenhum registro visível ou paciente sem vínculo aprovado.</p>
        ) : (
          <div className="patient-modal__table-wrap">
            <table className="patient-modal__table patient-modal__table--compact">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Medicamento</th>
                  <th>Qtd</th>
                </tr>
              </thead>
              <tbody>
                {modalMedicationLogs.map((m) => {
                  const when = medicationLogWhenIso(m);
                  return (
                    <tr key={m.id}>
                      <td>{when ? formatPtDateTime(when) : "—"}</td>
                      <td>{medicationNameFromLog(m)}</td>
                      <td>{m.quantity ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="patient-modal__section">
        <h3 className="patient-modal__section-title">Preabilitação e nutrição</h3>
        <p className="patient-modal__micro-label">Hidratação, apetite e refeições (app)</p>
        {modalNutritionLogs.length === 0 ? (
          <p className="patient-modal__empty-hint">Sem registros nutricionais recentes.</p>
        ) : (
          <div className="patient-modal__table-wrap">
            <table className="patient-modal__table patient-modal__table--compact">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Apetite</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {modalNutritionLogs.map((n) => (
                  <tr key={n.id}>
                    <td>{formatPtDateLong(n.logged_at)}</td>
                    <td>{n.log_type}</td>
                    <td>{n.appetite_level ?? "—"}</td>
                    <td>{n.notes ? (n.notes.length > 80 ? `${n.notes.slice(0, 80)}…` : n.notes) : "—"}</td>
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
