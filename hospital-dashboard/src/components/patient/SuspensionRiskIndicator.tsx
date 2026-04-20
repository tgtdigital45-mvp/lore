type Props = {
  score: number;
  reasons: string[];
};

export function SuspensionRiskIndicator({ score, reasons }: Props) {
  const color =
    score >= 70 ? "var(--risk-critical)" : score >= 40 ? "var(--risk-attention)" : "var(--goal-complete)";

  return (
    <div className="suspension-risk rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700 }}>Risco de suspensão da próxima sessão (heurística)</p>
        <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>
          {reasons.length > 0 ? reasons.join(" · ") : "Sem fatores de risco fortes na janela recente."}
        </p>
      </div>
      <div className="suspension-risk__meter" aria-hidden>
        <div className="suspension-risk__fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="suspension-risk__label" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}
