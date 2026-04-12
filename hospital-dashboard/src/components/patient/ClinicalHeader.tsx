import { useMemo } from "react";
import { CANCER_PT } from "../../constants/dashboardLabels";
import { computeClinicalNadirSummary, cancerContextHint } from "../../lib/clinicalNadir";
import type { RiskRow, TreatmentCycleRow, TreatmentInfusionRow } from "../../types/dashboard";
import { formatPtDateTime } from "../../lib/dashboardFormat";

type Props = {
  patient: RiskRow;
  cycles: TreatmentCycleRow[];
  infusions: TreatmentInfusionRow[];
  loading?: boolean;
};

export function ClinicalHeader({ patient, cycles, infusions, loading }: Props) {
  const summary = useMemo(() => computeClinicalNadirSummary(cycles, infusions), [cycles, infusions]);
  const hint = useMemo(() => cancerContextHint(patient.primary_cancer_type), [patient.primary_cancer_type]);

  const stage = patient.current_stage?.trim() || null;
  const code = patient.patient_code?.trim() || null;
  const active = summary.activeCycle;

  return (
    <div className="clinical-header">
      {loading ? <p className="clinical-header__hint muted">A carregar dados clínicos…</p> : null}
      <div className="clinical-header__row">
        {stage ? (
          <span className="clinical-header__chip clinical-header__chip--stage" title="Estadiamento">
            Estágio {stage}
          </span>
        ) : null}
        {code ? (
          <span className="clinical-header__chip clinical-header__chip--code" title="Código Aura">
            {code}
          </span>
        ) : null}
        {active ? (
          <span className="clinical-header__chip clinical-header__chip--cycle" title="Ciclo ativo">
            {active.protocol_name}
            {active.planned_sessions != null && active.completed_sessions != null
              ? ` · Sessões ${active.completed_sessions}/${active.planned_sessions}`
              : ""}
          </span>
        ) : null}
        <span
          className={`clinical-header__chip clinical-header__chip--nadir`}
          title="Vigilância febril / neutropenia"
        >
          {patient.is_in_nadir ? "Em nadir — vigilância" : "Fora do nadir (app)"}
        </span>
      </div>
      <p className="clinical-header__hint">
        <strong>{CANCER_PT[patient.primary_cancer_type] ?? patient.primary_cancer_type}</strong>
        {" · "}
        {hint}
      </p>
      <ul className="clinical-header__hint" style={{ margin: 0, paddingLeft: "1.1rem" }}>
        <li>
          Última infusão (completa):{" "}
          {summary.lastCompletedInfusionAt ? formatPtDateTime(summary.lastCompletedInfusionAt) : "—"}
        </li>
        <li>Janela estimada de nadir (pós-infusão): {summary.estimatedNadirWindowLabel}</li>
        <li>Próxima infusão (estim.): {summary.predictedNextInfusionLabel}</li>
      </ul>
    </div>
  );
}
