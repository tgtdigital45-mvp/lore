type QuantityLike = { quantity: number; unit: string };

export function formatHeartRateSample(sample: QuantityLike): string {
  const n = Math.round(sample.quantity);
  return `${n} bpm`;
}

/** SpO₂ no HealthKit costuma vir como fração 0–1 ou percentagem 0–100 conforme a fonte. */
export function formatOxygenSaturationSample(sample: QuantityLike): string {
  const q = sample.quantity;
  const pct = q > 0 && q <= 1 ? Math.round(q * 100) : Math.round(q);
  return `${pct}%`;
}

export function formatHrvSdnnSample(sample: QuantityLike): string {
  return `${Math.round(sample.quantity)} ms`;
}
