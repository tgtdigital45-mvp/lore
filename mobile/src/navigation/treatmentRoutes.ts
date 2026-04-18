import type { Href } from "expo-router";

/**
 * Caminhos canónicos do stack Tratamento (Expo Router: app/(tabs)/health/treatment/).
 * Usar sempre estes valores em vez de strings literais soltas.
 */
export const TREATMENT_HREF = {
  index: "/(tabs)/health/treatment",
  kind: "/(tabs)/health/treatment/kind",
  schedule: "/(tabs)/health/treatment/schedule",
  details: "/(tabs)/health/treatment/details",
} as const satisfies Record<string, Href>;

export function treatmentCycleHref(cycleId: string): Href {
  return `/(tabs)/health/treatment/${cycleId}` as Href;
}

export function treatmentCycleEditHref(cycleId: string): Href {
  return `/(tabs)/health/treatment/${cycleId}/edit` as Href;
}

export function treatmentInfusionNewHref(cycleId: string): Href {
  return `/(tabs)/health/treatment/${cycleId}/infusion/new` as Href;
}

export function treatmentInfusionDetailHref(cycleId: string, infusionId: string): Href {
  return `/(tabs)/health/treatment/${cycleId}/infusion/${infusionId}` as Href;
}

export function treatmentCheckinHref(cycleId: string, infusionId: string): Href {
  return `/(tabs)/health/treatment/${cycleId}/checkin?infusionId=${encodeURIComponent(infusionId)}` as Href;
}
