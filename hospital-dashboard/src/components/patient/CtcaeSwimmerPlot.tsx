import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { SEVERITY_PT } from "@/constants/dashboardLabels";
import { symptomCategoryLabelFromKey } from "@/lib/patientModalHelpers";

export type CtcaeMatrixRow = {
  cycle_id?: string | null;
  symptom_category?: string | null;
  severity?: string | null;
  logged_at?: string | null;
};

const GRADE_COLORS: Record<string, string> = {
  none: "#e2e8f0",
  mild: "#fde047",
  moderate: "#fb923c",
  severe: "#ef4444",
  life_threatening: "#7c3aed",
};

const GRADE_LEGEND_PT: Record<keyof typeof GRADE_COLORS, string> = {
  none: "Mínimo / ausente",
  mild: SEVERITY_PT.mild,
  moderate: SEVERITY_PT.moderate,
  severe: SEVERITY_PT.severe,
  life_threatening: SEVERITY_PT.life_threatening,
};

function gradeToBucket(sev: string | null | undefined): keyof typeof GRADE_COLORS {
  const s = (sev ?? "").toLowerCase();
  if (s.includes("life") || s.includes("g4") || s.includes("grade_4")) return "life_threatening";
  if (s.includes("severe") || s.includes("g3") || s.includes("grade_3")) return "severe";
  if (s.includes("moderate") || s.includes("g2") || s.includes("grade_2")) return "moderate";
  if (s.includes("mild") || s.includes("g1") || s.includes("grade_1")) return "mild";
  return "none";
}

type Props = {
  rows: CtcaeMatrixRow[];
};

/** Visualização compacta estilo «swimmer»: categorias × tempo (últimos eventos). */
export function CtcaeSwimmerPlot({ rows }: Props) {
  const { categories, matrix } = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const ta = new Date(a.logged_at ?? 0).getTime();
      const tb = new Date(b.logged_at ?? 0).getTime();
      return ta - tb;
    });
    const cats = Array.from(new Set(sorted.map((r) => r.symptom_category ?? "—"))).slice(0, 12);
    const slots = sorted.slice(-48);
    return { categories: cats, matrix: slots };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-muted-foreground">
        Sem dados CTCAE agregados para este paciente.
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto">
      <p className="mb-3 text-xs text-muted-foreground">
        Cada linha é um registo recente de sintoma; cor ≈ grau CTCAE inferido do campo severity.
      </p>
      <div className="flex min-w-[520px] flex-col gap-1">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-2">
            <span
              className="w-36 shrink-0 truncate text-[0.65rem] font-semibold text-slate-600"
              title={cat !== "—" ? `${symptomCategoryLabelFromKey(cat)} (${cat})` : "—"}
            >
              {symptomCategoryLabelFromKey(cat)}
            </span>
            <div className="flex flex-1 flex-wrap gap-0.5">
              {matrix
                .filter((r) => (r.symptom_category ?? "—") === cat)
                .map((r, i) => (
                  <span
                    key={`${r.logged_at}-${i}`}
                    className="h-6 min-w-[10px] flex-1 rounded-sm"
                    style={{ backgroundColor: GRADE_COLORS[gradeToBucket(r.severity)] }}
                    title={`${r.logged_at ?? ""} · ${symptomCategoryLabelFromKey(r.symptom_category)} · ${r.severity ?? ""}`}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-[0.6rem] font-semibold uppercase text-muted-foreground">
        {(Object.keys(GRADE_COLORS) as (keyof typeof GRADE_COLORS)[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="size-3 rounded-sm" style={{ backgroundColor: GRADE_COLORS[k] }} />
            {GRADE_LEGEND_PT[k]}
          </span>
        ))}
      </div>
    </div>
  );
}
