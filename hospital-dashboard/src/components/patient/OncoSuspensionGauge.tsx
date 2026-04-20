type Props = {
  score: number;
  reasons: string[];
};

export function OncoSuspensionGauge({ score, reasons }: Props) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? "#FF4D4D" : pct >= 40 ? "#FFA500" : "#10B981";
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold">Risco de suspensão (IA / heurística)</p>
        <p className="muted mt-1 text-xs leading-relaxed">
          {reasons.length > 0 ? reasons.join(" · ") : "Sem fatores fortes na janela recente."}
        </p>
      </div>
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r={r} fill="none" stroke="#F3F4F6" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums" style={{ color }}>
            {pct}
          </span>
          <span className="text-[0.65rem] font-semibold uppercase text-muted-foreground">score</span>
        </div>
      </div>
    </div>
  );
}
