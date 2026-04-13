import { useEffect, useMemo, useRef } from "react";
import type { SymptomLogDetail } from "../../types/dashboard";
import { SYMPTOM_CATEGORY_PT } from "../../constants/dashboardLabels";

type PrdRowKey = "pain" | "nausea" | "fatigue";

const PRD_ROW_LABEL: Record<PrdRowKey, string> = {
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
    absent: 0,
    present: 1,
    mild: 1,
    moderate: 2,
    severe: 3,
    life_threatening: 4,
  };
  return s.severity ? map[s.severity] ?? 2 : null;
}

function valueForPrdRow(s: SymptomLogDetail, row: PrdRowKey): number | null {
  if (s.entry_kind !== "prd") return null;
  if (row === "pain") return s.pain_level ?? null;
  if (row === "nausea") return s.nausea_level ?? null;
  if (row === "fatigue") return s.fatigue_level ?? null;
  return null;
}

function legacyNumericScore(s: SymptomLogDetail): number | null {
  if (s.entry_kind === "prd") return null;
  const b = severityToBucket0to4(s);
  return b != null ? (b + 1) * 2.5 : null;
}

function utcDayKey(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function rowLabel(key: string): string {
  if (key === "pain") return PRD_ROW_LABEL.pain;
  if (key === "nausea") return PRD_ROW_LABEL.nausea;
  if (key === "fatigue") return PRD_ROW_LABEL.fatigue;
  return SYMPTOM_CATEGORY_PT[key] ?? key;
}

function sortRowKeys(keys: string[]): string[] {
  const pr: PrdRowKey[] = ["pain", "nausea", "fatigue"];
  const prSet = new Set(pr);
  const prOrdered = pr.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !prSet.has(k as PrdRowKey)).sort((a, b) => rowLabel(a).localeCompare(rowLabel(b), "pt-BR"));
  return [...prOrdered, ...rest];
}

type Props = {
  symptoms: SymptomLogDetail[];
  days?: number;
};

export function ToxicityHeatmap({ symptoms, days = 14 }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { dayKeys, matrix, rowKeys, hasAnyData } = useMemo(() => {
    const end = new Date();
    const keys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setUTCDate(d.getUTCDate() - i);
      keys.push(d.toISOString().slice(0, 10));
    }

    const matrix: Record<string, Record<string, number | null>> = {};

    const ensureRow = (rowKey: string) => {
      if (!matrix[rowKey]) {
        matrix[rowKey] = {};
        keys.forEach((k) => {
          matrix[rowKey][k] = null;
        });
      }
    };

    for (const s of symptoms) {
      const day = utcDayKey(s.logged_at);
      if (!keys.includes(day)) continue;

      if (s.entry_kind === "prd") {
        for (const row of ["pain", "nausea", "fatigue"] as PrdRowKey[]) {
          const v = valueForPrdRow(s, row);
          if (v == null) continue;
          ensureRow(row);
          const cur = matrix[row][day];
          if (cur == null || v > cur) matrix[row][day] = v;
        }
      } else {
        const raw = (s.symptom_category ?? "").trim();
        if (!raw) continue;
        const rowKey = raw.toLowerCase();
        const v = legacyNumericScore(s);
        if (v == null) continue;
        ensureRow(rowKey);
        const cur = matrix[rowKey][day];
        if (cur == null || v > cur) matrix[rowKey][day] = v;
      }
    }

    const rowKeysAll = Object.keys(matrix);
    const rowKeys = sortRowKeys(
      rowKeysAll.filter((rk) => keys.some((d) => matrix[rk][d] != null))
    );

    const hasAnyData = rowKeys.length > 0;

    return { dayKeys: keys, matrix, rowKeys, hasAnyData };
  }, [symptoms, days]);

  useEffect(() => {
    if (!hasAnyData) return;
    const el = scrollRef.current;
    if (!el) return;
    const snapToToday = () => {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    };
    snapToToday();
    const raf = requestAnimationFrame(snapToToday);
    const ro = new ResizeObserver(snapToToday);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hasAnyData, symptoms, days]);

  const cellClass = (v: number | null) => {
    if (v == null) return "toxicity-heatmap__cell toxicity-heatmap__cell--0";
    if (v <= 2) return "toxicity-heatmap__cell toxicity-heatmap__cell--0";
    if (v <= 4) return "toxicity-heatmap__cell toxicity-heatmap__cell--1";
    if (v <= 6) return "toxicity-heatmap__cell toxicity-heatmap__cell--2";
    if (v <= 8) return "toxicity-heatmap__cell toxicity-heatmap__cell--3";
    return "toxicity-heatmap__cell toxicity-heatmap__cell--4";
  };

  if (!hasAnyData) {
    return (
      <div className="toxicity-heatmap">
        <p className="muted text-sm">Sem registros de sintomas neste período.</p>
      </div>
    );
  }

  return (
    <div className="toxicity-heatmap">
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.35rem" }}>
        Dias em UTC · PRD 0–10 ou escala legado por categoria. Só aparecem linhas com pelo menos um registro. Célula vazia = sem
        registro nesse dia.
      </p>
      <div ref={scrollRef} className="max-w-full overflow-x-auto">
        <table className="toxicity-heatmap__table">
          <thead>
            <tr>
              <th className="toxicity-heatmap__label" />
              {dayKeys.map((k, i) => (
                <th key={k} title={i === dayKeys.length - 1 ? `${k} · hoje` : k}>
                  {k.slice(8, 10)}/{k.slice(5, 7)}
                  {i === dayKeys.length - 1 ? <span className="sr-only"> (hoje)</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((row) => (
              <tr key={row}>
                <td className="toxicity-heatmap__label">{rowLabel(row)}</td>
                {dayKeys.map((k) => {
                  const v = matrix[row]?.[k] ?? null;
                  return (
                    <td key={k} className={cellClass(v)} title={v != null ? `${rowLabel(row)}: ${v.toFixed(1)}` : undefined}>
                      {v != null ? (v >= 10 ? Math.round(v) : v.toFixed(0)) : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
