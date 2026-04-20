import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ProQuestionnaireRow } from "@/hooks/useDossierExtended";
import { Card } from "@/components/ui/card";

/** Domínios genéricos EORTC-like para demo quando domain_scores está vazio. */
const DEFAULT_DOMAINS = [
  { key: "physical", label: "Função física" },
  { key: "fatigue", label: "Fadiga" },
  { key: "nausea", label: "Náusea" },
  { key: "pain", label: "Dor" },
  { key: "insomnia", label: "Insónia" },
  { key: "appetite", label: "Apetite" },
  { key: "constipation", label: "Obstipação" },
  { key: "diarrhea", label: "Diarreia" },
];

type Props = {
  responses: ProQuestionnaireRow[];
};

export function ProQoLRadarChart({ responses }: Props) {
  const latest = responses[0];
  const baseline = responses.find((r) => r.id !== latest?.id);

  const domainScores =
    latest?.domain_scores && typeof latest.domain_scores === "object" && !Array.isArray(latest.domain_scores)
      ? (latest.domain_scores as Record<string, number>)
      : null;

  const data = DEFAULT_DOMAINS.map((d) => ({
    domain: d.label,
    atual: domainScores?.[d.key] ?? Math.max(0, 100 - (latest?.total_score ?? 0) / 8),
    baseline: baseline?.domain_scores
      ? Number((baseline.domain_scores as Record<string, number>)[d.key] ?? 0)
      : undefined,
  }));

  if (!latest) {
    return (
      <Card className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Sem questionários PRO. Registe respostas (EORTC QLQ-C30 / FACT-G) na base de dados.
      </Card>
    );
  }

  return (
    <div className="h-[360px] w-full">
      <p className="mb-2 text-xs text-muted-foreground">
        Último: {latest.questionnaire_type} · {new Date(latest.filled_at).toLocaleString("pt-PT")}
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
          {baseline ? (
            <Radar name="Baseline" dataKey="baseline" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} strokeDasharray="4 4" />
          ) : null}
          <Radar name="Atual" dataKey="atual" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.35} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
