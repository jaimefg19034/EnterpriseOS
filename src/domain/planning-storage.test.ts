import { describe, expect, it } from "vitest";
import { makeDemoActualRevenue } from "./planning";
import { parseSavedPlanningState, serialisePlanningState } from "./planning-storage";

const assumptions = {
  annualRevenueBudget: 2_976_000,
  costOfGoodsSoldPercent: 39,
  annualOperatingExpenses: 1_060_800,
  annualDepreciationAndAmortisation: 150_000,
  annualInterestExpense: 50_400,
  taxRatePercent: 25,
};

describe("planning local persistence", () => {
  it("round-trips assumptions, actual revenue and selected scenario", () => {
    const actualRevenue = makeDemoActualRevenue(assumptions.annualRevenueBudget);
    const parsed = parseSavedPlanningState(serialisePlanningState(assumptions, actualRevenue, "downside", "2026-11-09T12:00:00.000Z"));
    expect(parsed?.scenario).toBe("downside");
    expect(parsed?.assumptions.annualRevenueBudget).toBe(2_976_000);
    expect(parsed?.actualRevenue.Oct).toBe(actualRevenue.Oct);
    expect(parsed?.actualRevenue.Nov).toBeNull();
  });

  it("rejects corrupt data, negative actuals and invalid scenario keys", () => {
    expect(parseSavedPlanningState("{bad")).toBeNull();
    const invalidActuals = JSON.stringify({ assumptions, actualRevenue: { Jan: -1 }, scenario: "base" });
    const invalidScenario = JSON.stringify({ assumptions, actualRevenue: {}, scenario: "aggressive" });
    expect(parseSavedPlanningState(invalidActuals)).toBeNull();
    expect(parseSavedPlanningState(invalidScenario)).toBeNull();
  });

  it("rejects percentages outside the supported range", () => {
    expect(parseSavedPlanningState(JSON.stringify({
      assumptions: { ...assumptions, taxRatePercent: 150 },
      actualRevenue: {},
      scenario: "base",
    }))).toBeNull();
  });
});
