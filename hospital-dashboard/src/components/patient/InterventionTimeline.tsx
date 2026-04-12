import { SEVERITY_PT } from "../../constants/dashboardLabels";
import type { SymptomLogDetail } from "../../types/dashboard";
import { formatPtDateTime } from "../../lib/dashboardFormat";
import { pillClassForSeverity } from "../../lib/riskUi";

type Props = {
  entries: SymptomLogDetail[];
};

export function InterventionTimeline({ entries }: Props) {
  if (entries.length === 0) {
    return <p className="muted">Nenhum registo com prioridade de triagem recente.</p>;
  }

  return (
    <ul className="intervention-timeline">
      {entries.map((s) => (
        <li key={s.id} className="intervention-timeline__item">
          <div>
            <strong>Intercorrência / triagem</strong>
            {s.symptom_category ? ` · ${s.symptom_category}` : ""}
            {s.entry_kind === "prd" ? (
              <span className="muted" style={{ display: "block", fontSize: "0.78rem" }}>
                PRD: dor {s.pain_level ?? "—"}, náusea {s.nausea_level ?? "—"}, fadiga {s.fatigue_level ?? "—"}
              </span>
            ) : null}
            {s.notes ? (
              <span className="muted" style={{ display: "block", marginTop: "0.25rem", fontSize: "0.82rem" }}>
                {s.notes.length > 160 ? `${s.notes.slice(0, 160)}…` : s.notes}
              </span>
            ) : null}
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="intervention-timeline__time">{formatPtDateTime(s.logged_at)}</span>
            {s.severity ? (
              <div style={{ marginTop: "0.25rem" }}>
                <span className={`pill pill--compact ${pillClassForSeverity(s.severity)}`}>
                  {SEVERITY_PT[s.severity] ?? s.severity}
                </span>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
