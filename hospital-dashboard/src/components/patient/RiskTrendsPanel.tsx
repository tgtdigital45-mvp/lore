import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RiskScoreRow } from "@/hooks/useDossierExtended";
import { formatPtShort } from "@/lib/dashboardFormat";
import { Card } from "@/components/ui/card";

type Props = {
  scores: RiskScoreRow[];
};

export function RiskTrendsPanel({ scores }: Props) {
  const data = [...scores]
    .reverse()
    .map((s) => ({
      t: s.computed_at ? formatPtShort(s.computed_at) : "—",
      p: Math.round((Number(s.probability) || 0) * 100),
      model: s.model_version ?? "",
    }));

  if (data.length === 0) {
    return (
      <Card className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Sem projeções de risco armazenadas. O pipeline pode ser acionado via Edge Function «risk-projection» (cron).
      </Card>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <p className="mb-2 text-xs text-muted-foreground">Probabilidade estimada de evento adverso (horizonte típico 7d) — valores do modelo.</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="t" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
          <Tooltip
            formatter={(v) => {
              const n = typeof v === "number" ? v : Number(v);
              return [`${Number.isFinite(n) ? n : 0}%`, "Prob."];
            }}
          />
          <Area type="monotone" dataKey="p" stroke="#ea580c" fill="url(#riskGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
