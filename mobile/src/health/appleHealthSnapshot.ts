import type { CategorySample, QuantitySample } from "@kingstinct/react-native-healthkit";

import {
  formatHeartRateSample,
  formatHrvSdnnSample,
  formatOxygenSaturationSample,
} from "@/src/health/formatAppleHealthSample";
import type { HealthWearableRowInsert } from "@/src/health/healthWearableTypes";
import { supabase } from "@/src/lib/supabase";

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function shortPtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const QUANTITY_SYNC_DAYS = 7;
const STEADINESS_SYNC_DAYS = 90;
const STEADINESS_UI_DAYS = 30;
const UPSERT_CHUNK = 120;

const READ_AUTH = [
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierOxygenSaturation",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  "HKQuantityTypeIdentifierNumberOfTimesFallen",
  "HKCategoryTypeIdentifierAppleWalkingSteadinessEvent",
] as const;

const QUANTITY_METRICS: {
  id: (typeof READ_AUTH)[number];
  metric: HealthWearableRowInsert["metric"];
}[] = [
  { id: "HKQuantityTypeIdentifierHeartRate", metric: "heart_rate" },
  { id: "HKQuantityTypeIdentifierOxygenSaturation", metric: "oxygen_saturation" },
  { id: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN", metric: "hrv_sdnn" },
  { id: "HKQuantityTypeIdentifierNumberOfTimesFallen", metric: "falls_count" },
];

function mapQuantitySample(
  patientId: string,
  metric: HealthWearableRowInsert["metric"],
  s: QuantitySample
): HealthWearableRowInsert {
  return {
    patient_id: patientId,
    source: "apple_health",
    metric,
    value_numeric: s.quantity,
    unit: s.unit,
    observed_start: s.startDate.toISOString(),
    observed_end: s.endDate.toISOString(),
    apple_sample_uuid: s.uuid,
    metadata: {},
  };
}

function mapSteadinessSample(patientId: string, s: CategorySample): HealthWearableRowInsert {
  return {
    patient_id: patientId,
    source: "apple_health",
    metric: "walking_steadiness_event",
    value_numeric: typeof s.value === "number" ? s.value : null,
    unit: null,
    observed_start: s.startDate.toISOString(),
    observed_end: s.endDate.toISOString(),
    apple_sample_uuid: s.uuid,
    metadata: {
      category_type: s.categoryType,
      value: s.value,
    },
  };
}

async function upsertWearableRows(rows: HealthWearableRowInsert[]): Promise<void> {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabase.from("health_wearable_samples").upsert(chunk, {
      onConflict: "patient_id,apple_sample_uuid",
    });
    if (error) console.warn("[health_wearable_samples]", error.message);
  }
}

export type AppleHealthDisplay = {
  heartRate: string;
  spo2: string;
  hrv: string;
  falls: string;
  steadiness: string;
};

/**
 * Autoriza tipos necessários, lê HealthKit e opcionalmente sincroniza com Supabase (com `patientId`).
 */
export async function collectAndSyncAppleHealth(patientId?: string): Promise<AppleHealthDisplay | null> {
  const hk = await import("@kingstinct/react-native-healthkit");
  if (!hk.isHealthDataAvailable()) {
    return null;
  }

  await hk.requestAuthorization({ toRead: [...READ_AUTH] });

  const qFrom = daysAgo(QUANTITY_SYNC_DAYS);
  const t30 = daysAgo(STEADINESS_UI_DAYS);

  if (patientId) {
    const [hrSeries, o2Series, hrvSeries, fallSeries, steadinessSamples, hrRecent, o2Recent, hrvRecent, fallRecent] =
      await Promise.all([
        hk.queryQuantitySamples("HKQuantityTypeIdentifierHeartRate", {
          limit: 400,
          filter: { date: { startDate: qFrom } },
          ascending: false,
        }),
        hk.queryQuantitySamples("HKQuantityTypeIdentifierOxygenSaturation", {
          limit: 400,
          filter: { date: { startDate: qFrom } },
          ascending: false,
        }),
        hk.queryQuantitySamples("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", {
          limit: 400,
          filter: { date: { startDate: qFrom } },
          ascending: false,
        }),
        hk.queryQuantitySamples("HKQuantityTypeIdentifierNumberOfTimesFallen", {
          limit: 200,
          filter: { date: { startDate: qFrom } },
          ascending: false,
        }),
        hk.queryCategorySamples("HKCategoryTypeIdentifierAppleWalkingSteadinessEvent", {
          limit: 200,
          filter: { date: { startDate: daysAgo(STEADINESS_SYNC_DAYS) } },
          ascending: false,
        }),
        hk.getMostRecentQuantitySample("HKQuantityTypeIdentifierHeartRate"),
        hk.getMostRecentQuantitySample("HKQuantityTypeIdentifierOxygenSaturation"),
        hk.getMostRecentQuantitySample("HKQuantityTypeIdentifierHeartRateVariabilitySDNN"),
        hk.getMostRecentQuantitySample("HKQuantityTypeIdentifierNumberOfTimesFallen"),
      ]);

    const rows: HealthWearableRowInsert[] = [];
    const seriesById: Record<string, readonly QuantitySample[]> = {
      HKQuantityTypeIdentifierHeartRate: hrSeries,
      HKQuantityTypeIdentifierOxygenSaturation: o2Series,
      HKQuantityTypeIdentifierHeartRateVariabilitySDNN: hrvSeries,
      HKQuantityTypeIdentifierNumberOfTimesFallen: fallSeries,
    };
    for (const { id, metric } of QUANTITY_METRICS) {
      for (const s of seriesById[id]) {
        rows.push(mapQuantitySample(patientId, metric, s));
      }
    }
    for (const s of steadinessSamples) {
      rows.push(mapSteadinessSample(patientId, s));
    }
    await upsertWearableRows(rows);

    const steadiness30d = steadinessSamples.filter((s) => s.startDate >= t30);

    return {
      heartRate: hrRecent ? formatHeartRateSample(hrRecent) : "—",
      spo2: o2Recent ? formatOxygenSaturationSample(o2Recent) : "—",
      hrv: hrvRecent ? formatHrvSdnnSample(hrvRecent) : "—",
      falls: fallRecent
        ? `${Math.round(fallRecent.quantity)} (${shortPtDate(fallRecent.startDate)})`
        : "—",
      steadiness:
        steadiness30d.length > 0
          ? `${steadiness30d.length} evento(s) de estabilidade (30d)`
          : "—",
    };
  }

  const [hrRecent, o2Recent, hrvRecent, fallRecent, steadinessForUi] = await Promise.all([
    hk.getMostRecentQuantitySample("HKQuantityTypeIdentifierHeartRate"),
    hk.getMostRecentQuantitySample("HKQuantityTypeIdentifierOxygenSaturation"),
    hk.getMostRecentQuantitySample("HKQuantityTypeIdentifierHeartRateVariabilitySDNN"),
    hk.getMostRecentQuantitySample("HKQuantityTypeIdentifierNumberOfTimesFallen"),
    hk.queryCategorySamples("HKCategoryTypeIdentifierAppleWalkingSteadinessEvent", {
      limit: 200,
      filter: { date: { startDate: t30 } },
      ascending: false,
    }),
  ]);

  return {
    heartRate: hrRecent ? formatHeartRateSample(hrRecent) : "—",
    spo2: o2Recent ? formatOxygenSaturationSample(o2Recent) : "—",
    hrv: hrvRecent ? formatHrvSdnnSample(hrvRecent) : "—",
    falls: fallRecent
      ? `${Math.round(fallRecent.quantity)} (${shortPtDate(fallRecent.startDate)})`
      : "—",
    steadiness:
      steadinessForUi.length > 0
        ? `${steadinessForUi.length} evento(s) de estabilidade (30d)`
        : "—",
  };
}
