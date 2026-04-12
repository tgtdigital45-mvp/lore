import { useMemo } from "react";
import type { SymptomLogDetail } from "../../types/dashboard";

type RowKey = "pain" | "nausea" | "fatigue";

const ROW_LABEL: Record<RowKey, string> = {
  pain: "Dor",
  nausea: "Náusea",
  fatigue: "Fadiga",
};

function severityToBucket0to4(s: SymptomLogDetail): number | null {
  if (s.entry_kind === "prd") {
    const v = Math.max(s.pain_level ?? 0, s.nausea_level ?? 0, s.fatigue_level ?? 0);
    if (v <= 2) return 0;
    if (v <= 4) return 1;
    if (v <= 6) return 2;
    if (v <= 8) return 3;
    return 4;
  }
  const map: Record<string, number> = {
    mild: 1,
    moderate: 2,
    severe: 3,
    life_threatening: 4,
  };
  return s.severity ? map[s.severity] ?? 2 : null;
}

function valueForRow(s: SymptomLogDetail, row: RowKey): number | null {
  if (s.entry_kind === "prd") {
    if (row === "pain") return s.pain_level ?? null;
    if (row === "nausea") return s.nausea_level ?? null;
    if (row === "fatigue") return s.fatigue_level ?? null;
  }
  const cat = (s.symptom_category ?? "").toLowerCase();
  if (row === "pain" && cat.includes("pain")) return severityToBucket0to4(s) != null ? (severityToBucket0to4(s)! + 1) * 2.5 : null;
  if (row === "nausea" && cat.includes("nausea")) return severityToBucket0to4(s) != null ? (severityToBucket0to4(s)! + 1) * 2.5 : null;
  if (row === "fatigue" && cat.includes("fatigue")) return severityToBucket0to4(s) != null ? (severityToBucket0to4(s)! + 1) * 2.5 : null;
  return null;
}

function utcDayKey(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

type Props = {
  symptoms: SymptomLogDetail[];
  days?: number;
};

export function ToxicityHeatmap({ symptoms, days = 14 }: Props) {
  const { dayKeys, matrix } = useMemo(() => {
    const end = new Date();
    const keys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setUTCDate(d.getUTCDate() - i);
      keys.push(d.toISOString().slice(0, 10));
    }
    const m: Record<RowKey, Record<string, number | null>> = {
      pain: {},
      nausea: {},
      fatigue: {},
    };
    (["pain", "nausea", "fatigue"] as RowKey[]).forEach((rk) => keys.forEach((k) => (m[rk][k] = null)));

    for (const s of symptoms) {
      const day = utcDayKey(s.logged_at);
      if (!keys.includes(day)) continue;
      for (const row of ["pain", "nausea", "fatigue"] as RowKey[]) {
        const v = valueForRow(s, row);
        if (v == null) continue;
        const cur = m[row][day];
        if (cur == null || v > cur) m[row][day] = v;
      }
    }

    return { dayKeys: keys, matrix: m };
  }, [symptoms, days]);

  const cellClass = (v: number | null) => {
    if (v == null) return "toxicity-heatmap__cell toxicity-heatmap__cell--0";
    if (v <= 2) return "toxicity-heatmap__cell toxicity-heatmap__cell--0";
    if (v <= 4) return "toxicity-heatmap__cell toxicity-heatmap__cell--1";
    if (v <= 6) return "toxicity-heatmap__cell toxicity-heatmap__cell--2";
    if (v <= 8) return "toxicity-heatmap__cell toxicity-heatmap__cell--3";
    return "toxicity-heatmap__cell toxicity-heatmap__cell--4";
  };

  return (
    <div className="toxicity-heatmap">
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.35rem" }}>
        Dias em UTC · valores PRD 0–10 (ou legado aproximado por categoria). Célula vazia = sem registo nesse dia.
      </p>
      <table className="toxicity-heatmap__table">
        <thead>
          <tr>
            <th className="toxicity-heatmap__label" />
            {dayKeys.map((k) => (
              <th key={k} title={k}>
                {k.slice(8, 10)}/{k.slice(5, 7)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(["pain", "nausea", "fatigue"] as RowKey[]).map((row) => (
            <tr key={row}>
              <td className="toxicity-heatmap__label">{ROW_LABEL[row]}</td>
              {dayKeys.map((k) => {
                const v = matrix[row][k];
                return (
                  <td key={k} className={cellClass(v)} title={v != null ? `${ROW_LABEL[row]}: ${v.toFixed(0)}` : undefined}>
                    {v != null ? (v >= 10 ? Math.round(v) : v.toFixed(0)) : "·"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
