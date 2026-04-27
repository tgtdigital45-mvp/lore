import { describe, expect, it } from "vitest";
import { evaluateNadirFeverEmergency, extractTemperature } from "./modules/alerts/nadirFeverRules.js";

describe("extractTemperature", () => {
  it("parses decimal Celsius with comma", () => {
    expect(extractTemperature("estou com 38,2°C")).toBe(38.2);
  });

  it("parses decimal with dot", () => {
    expect(extractTemperature("temperatura 37.9 C")).toBe(37.9);
  });

  it("parses whole number with degree symbol", () => {
    expect(extractTemperature("39 °C")).toBe(39);
  });

  it("returns undefined when no temperature", () => {
    expect(extractTemperature("só dor de cabeça")).toBeUndefined();
  });
});

describe("evaluateNadirFeverEmergency", () => {
  it("triggers when nadir + temp >= 37.8", () => {
    const r = evaluateNadirFeverEmergency("medi 38,1 °C", true);
    expect(r.severeFever).toBe(true);
    expect(r.feverByTemp).toBe(true);
    expect(r.feverByKeywords).toBe(false);
  });

  it("triggers when nadir + febre keyword", () => {
    const r = evaluateNadirFeverEmergency("estou com febre desde ontem", true);
    expect(r.severeFever).toBe(true);
    expect(r.feverByKeywords).toBe(true);
  });

  it("does not trigger when not in nadir even with fever", () => {
    const r = evaluateNadirFeverEmergency("febre 39°C", false);
    expect(r.severeFever).toBe(false);
  });

  it("does not trigger in nadir without fever signal", () => {
    const r = evaluateNadirFeverEmergency("cansaço e náusea leve", true);
    expect(r.severeFever).toBe(false);
  });

  it("triggers on calafrios in nadir", () => {
    const r = evaluateNadirFeverEmergency("calafrios fortes", true);
    expect(r.severeFever).toBe(true);
  });
});
