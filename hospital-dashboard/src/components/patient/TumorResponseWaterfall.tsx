import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TumorEvaluationRow } from "@/hooks/useDossierExtended";
import { formatPtShort } from "@/lib/dashboardFormat";
import { Card } from "@/components/ui/card";

type Props = {
  evaluations: TumorEvaluationRow[];
};

export function TumorResponseWaterfall({ evaluations }: Props) {
  const sorted = [...evaluations].sort((a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime());
  const baselineSum = sorted[0]?.sum_lesions_mm != null ? Number(sorted[0].sum_lesions_mm) : null;

  const data = sorted.map((e, i) => {
    let v = e.percent_change_from_baseline != null ? Number(e.percent_change_from_baseline) : 0;
    if (e.percent_change_from_baseline == null && baselineSum != null && baselineSum > 0 && e.sum_lesions_mm != null) {
      v = ((Number(e.sum_lesions_mm) - baselineSum) / baselineSum) * 100;
    }
    return {
      name: formatPtShort(e.evaluation_date) + (e.modality ? ` · ${e.modality}` : ""),
      value: v,
      category: e.response_category,
      idx: i,
    };
  });

  if (data.length === 0) {
    return (
      <Card className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-muted-foreground">
        Sem avaliações RECIST registadas. Adicione entradas em «Resposta tumoral» (tabela tumor_evaluations).
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Variação % face ao baseline (negativo = redução tumoral). Linhas tracejadas: −30% (PR) e +20% (PD) — referência RECIST 1.1.
      </p>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" domain={["auto", "auto"]} tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(val) => {
                const n = typeof val === "number" ? val : Number(val);
                return [`${Number.isFinite(n) ? n.toFixed(1) : "0"}%`, "Δ baseline"];
              }}
              contentStyle={{ borderRadius: 12, fontSize: 12 }}
            />
            <ReferenceLine x={-30} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "PR ~−30%", fill: "#15803d", fontSize: 10 }} />
            <ReferenceLine x={20} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "PD +20%", fill: "#b91c1c", fontSize: 10 }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell key={entry.idx} fill={entry.value <= 0 ? "#10b981" : "#f97316"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 text-[0.65rem] font-semibold uppercase text-muted-foreground">
        {["CR", "PR", "SD", "PD", "NE"].map((c) => (
          <span key={c} className="rounded-full bg-slate-100 px-2 py-0.5">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
