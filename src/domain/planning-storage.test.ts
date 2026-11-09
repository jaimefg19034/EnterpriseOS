import { describe, expect, it } from "vitest";
import { makeDemoActualRevenue } from "./planning";
import {
  addPlanningYear,
  createEmptyActualRevenue,
  createInitialPlanningState,
  parseSavedPlanningState,
  serialisePlanningState,
} from "./planning-storage";

const assumptions = {
  annualRevenueBudget: 2_976_000,
  costOfGoodsSoldPercent: 39,
  annualOperatingExpenses: 1_060_800,
  annualDepreciationAndAmortisation: 150_000,
  annualInterestExpense: 50_400,
  taxRatePercent: 25,
};

describe("multi-year planning local persistence", () => {
  it("round-trips multiple years, selected year, assumptions and actual revenue", () => {
    const actualRevenue = makeDemoActualRevenue(assumptions.annualRevenueBudget);
    const initial = createInitialPlanningState(assumptions, actualRevenue, "downside", "2026-11-09T12:00:00.000Z");
    const nextYear = addPlanningYear(initial, 2027);
    expect(nextYear).not.toBeNull();
    if (!nextYear) return;
    const parsed = parseSavedPlanningState(serialisePlanningState(nextYear, "2026-11-09T13:00:00.000Z"));
    expect(parsed?.schemaVersion).toBe(2);
    expect(parsed?.selectedYear).toBe(2027);
    expect(parsed?.years["2026"].assumptions.annualRevenueBudget).toBe(2_976_000);
    expect(parsed?.years["2026"].actualRevenue.Oct).toBe(actualRevenue.Oct);
    expect(parsed?.years["2026"].scenario).toBe("downside");
    expect(parsed?.years["2027"].actualRevenue.Nov).toBeNull();
    expect(parsed?.years["2027"].actualRevenue.Dec).toBeNull();
    expect(parsed?.years["2027"].scenario).toBe("base");
    expect(parsed?.savedAt).toBe("2026-11-09T13:00:00.000Z");
  });

  it("migrates the legacy flat FY2026 record without changing any actuals", () => {
    const actualRevenue = makeDemoActualRevenue(assumptions.annualRevenueBudget);
    const legacy = {
      assumptions,
      actualRevenue,
      scenario: "upside",
      savedAt: "2026-11-09T12:00:00.000Z",
    };
    const parsed = parseSavedPlanningState(JSON.stringify(legacy));
    expect(parsed?.schemaVersion).toBe(2);
    expect(parsed?.selectedYear).toBe(2026);
    expect(parsed?.years["2026"].assumptions).toEqual(assumptions);
    expect(parsed?.years["2026"].actualRevenue).toEqual(actualRevenue);
    expect(parsed?.years["2026"].scenario).toBe("upside");
  });

  it("adds a clean year with copied assumptions but no invented actual revenue", () => {
    const initial = createInitialPlanningState(assumptions, makeDemoActualRevenue(assumptions.annualRevenueBudget), "upside");
    const next = addPlanningYear(initial, 2027);
    expect(next?.years["2027"].assumptions).toEqual(assumptions);
    expect(next?.years["2027"].actualRevenue).toEqual(createEmptyActualRevenue());
    expect(next?.years["2027"].scenario).toBe("base");
    expect(initial.years["2026"].actualRevenue.Jan).not.toBeNull();
  });

  it("rejects duplicate, out-of-range and invalid planning years", () => {
    const initial = createInitialPlanningState(assumptions, {}, "base");
    expect(addPlanningYear(initial, 2026)).toBeNull();
    expect(addPlanningYear(initial, 1899)).toBeNull();
    expect(addPlanningYear(initial, 2101)).toBeNull();
    expect(addPlanningYear(initial, 2026.5)).toBeNull();
  });

  it("rejects corrupt multi-year data, missing selected years and invalid actuals", () => {
    expect(parseSavedPlanningState("{bad")).toBeNull();
    expect(parseSavedPlanningState(JSON.stringify({
      schemaVersion: 2,
      selectedYear: 2027,
      years: { "2026": { assumptions, actualRevenue: {}, scenario: "base" } },
    }))).toBeNull();
    expect(parseSavedPlanningState(JSON.stringify({
      schemaVersion: 2,
      selectedYear: 2026,
      years: { "2026": { assumptions, actualRevenue: { Jan: -1 }, scenario: "base" } },
    }))).toBeNull();
    expect(parseSavedPlanningState(JSON.stringify({
      schemaVersion: 2,
      selectedYear: 2026,
      years: { "02026": { assumptions, actualRevenue: {}, scenario: "base" } },
    }))).toBeNull();
  });

  it("rejects percentages outside the supported range in any year", () => {
    const invalid = createInitialPlanningState(
      { ...assumptions, taxRatePercent: 150 },
      {},
      "base",
    );
    expect(parseSavedPlanningState(serialisePlanningState(invalid))).toBeNull();
  });
});
