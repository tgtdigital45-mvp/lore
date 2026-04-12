import { useMemo } from "react";
import type { WearableSampleRow } from "../../types/dashboard";
import { formatPtDateTime } from "../../lib/dashboardFormat";

const METRIC_PT: Record<string, string> = {
  heart_rate: "Freq. cardíaca",
  oxygen_saturation: "SpO₂",
  hrv_sdnn: "VFC (SDNN)",
  falls_count: "Quedas",
  walking_steadiness_event: "Estabilidade ao caminhar",
};

type Props = {
  samples: WearableSampleRow[];
};

export function WearableVitalsChart({ samples }: Props) {
  const byMetric = useMemo(() => {
    const m = new Map<string, WearableSampleRow[]>();
    for (const s of samples) {
      const list = m.get(s.metric) ?? [];
      list.push(s);
      m.set(s.metric, list);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => new Date(b.observed_start).getTime() - new Date(a.observed_start).getTime());
    }
    return m;
  }, [samples]);

  if (samples.length === 0) {
    return (
      <p className="muted">
        Sem dados de wearables (Apple Saúde / HealthKit). O paciente precisa de build nativo e sincronização no app móvel.
      </p>
    );
  }

  return (
    <div className="patient-modal__section" style={{ marginTop: "0.5rem" }}>
      <p className="patient-modal__micro-label">Últimas amostras (14 dias)</p>
      <div className="wearable-strip">
        {[...byMetric.entries()].map(([metric, rows]) => {
          const latest = rows[0];
          const label = METRIC_PT[metric] ?? metric;
          const val =
            latest.value_numeric != null
              ? `${latest.value_numeric}${latest.unit ? ` ${latest.unit}` : ""}`
              : "evento";
          return (
            <span key={metric} className="wearable-strip__pill" title={formatPtDateTime(latest.observed_start)}>
              <strong>{label}:</strong> {val}
            </span>
          );
        })}
      </div>
      <ul className="intervention-timeline" style={{ marginTop: "0.75rem" }}>
        {samples.slice(0, 12).map((s) => (
          <li key={s.id} className="intervention-timeline__item" style={{ background: "rgba(0,0,0,0.03)" }}>
            <span>
              <strong>{METRIC_PT[s.metric] ?? s.metric}</strong> · {s.value_numeric ?? "—"}
              {s.unit ? ` ${s.unit}` : ""}
            </span>
            <span className="intervention-timeline__time">{formatPtDateTime(s.observed_start)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
