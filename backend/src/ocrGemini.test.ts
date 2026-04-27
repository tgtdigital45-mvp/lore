import { describe, expect, it } from "vitest";
import { buildOcrMetricsFromMarkersFallback, parseOcrModelJsonText } from "./lib/ocrGemini.js";

describe("buildOcrMetricsFromMarkersFallback", () => {
  it("produces entries from string values", () => {
    const m = buildOcrMetricsFromMarkersFallback({
      Hemoglobina: "11,0 g/dL",
      Leucócitos: "1.610",
    });
    expect(m.length).toBe(2);
    expect(m.some((x) => x.name === "Hemoglobina" && x.value === "11,0 g/dL")).toBe(true);
  });

  it("deduplicates by canonical name", () => {
    const m = buildOcrMetricsFromMarkersFallback({
      HGB: "12",
      "Hemoglobina": "12",
    });
    expect(m.length).toBe(1);
  });
});

describe("parseOcrModelJsonText", () => {
  it("uses markers fallback when metrics_json is empty and clinical_exam", () => {
    const json = JSON.stringify({
      summary_pt_br: "Resumo com valores.",
      exam_date_iso: "2026-04-22",
      title_pt_br: "Lab",
      doctor_name: "Dr. X",
      professional_registries_json: "[]",
      markers_json: JSON.stringify({ Alfa: "1", Beta: "2" }),
      metrics_json: "[]",
      prescription_items_json: "[]",
      confidence_note: "ok",
      document_suitability: "clinical_exam",
      document_kind: "blood_test",
      ui_category: "exames",
    });
    const out = parseOcrModelJsonText(json, { logContext: "test" });
    expect(out.structured.metrics.length).toBeGreaterThanOrEqual(2);
    const names = out.structured.metrics.map((x) => x.name);
    expect(names).toContain("Alfa");
    expect(names).toContain("Beta");
  });
});
