import { describe, expect, it } from "vitest";
import {
  buildPlanningResult,
  makeDemoActualRevenue,
  MONTHS,
  SEASONALITY_WEIGHTS,
  type PlanningAssumptions,
} from "./planning";

const assumptions: PlanningAssumptions = {
  annualRevenueBudget: 2_976_000,
  costOfGoodsSoldPercent: 39,
  annualOperatingExpenses: 1_060_800,
  annualDepreciationAndAmortisation: 150_000,
  annualInterestExpense: 50_400,
  taxRatePercent: 25,
};

describe("buildPlanningResult", () => {
  it("allocates the annual revenue budget across all 12 months", () => {
    const result = buildPlanningResult(assumptions, {}, "base");

    expect(result.monthlyRows).toHaveLength(12);
    expect(result.budgetRevenue).toBe(assumptions.annualRevenueBudget);
    expect(result.monthlyRows.reduce((sum, row) => sum + row.budgetRevenue, 0))
      .toBe(assumptions.annualRevenueBudget);
  });

  it("uses actual revenue for closed months and scenario forecast for open months", () => {
    const actuals = makeDemoActualRevenue(assumptions.annualRevenueBudget);
    const result = buildPlanningResult(assumptions, actuals, "base");

    expect(result.monthlyRows.filter((row) => row.status === "Actual")).toHaveLength(10);
    expect(result.monthlyRows.filter((row) => row.status === "Forecast")).toHaveLength(2);
    expect(result.monthlyRows[0].actualRevenue).not.toBeNull();
    expect(result.monthlyRows[10].forecastRevenue).not.toBeNull();
    expect(result.monthlyRows[10].actualRevenue).toBeNull();
  });

  it("applies the upside scenario to future revenue and cost assumptions", () => {
    const actuals = makeDemoActualRevenue(assumptions.annualRevenueBudget);
    const base = buildPlanningResult(assumptions, actuals, "base");
    const upside = buildPlanningResult(assumptions, actuals, "upside");

    expect(upside.remainingForecastRevenue).toBeGreaterThan(base.remainingForecastRevenue);
    expect(upside.costOfGoodsSoldPercent).toBe(37.5);
    expect(upside.projectedEbitda).toBeGreaterThan(base.projectedEbitda);
  });

  it("models the downside scenario with lower revenue and sticky operating costs", () => {
    const actuals = makeDemoActualRevenue(assumptions.annualRevenueBudget);
    const base = buildPlanningResult(assumptions, actuals, "base");
    const downside = buildPlanningResult(assumptions, actuals, "downside");

    expect(downside.remainingForecastRevenue).toBeLessThan(base.remainingForecastRevenue);
    expect(downside.projectedOperatingExpenses).toBe(
      assumptions.annualOperatingExpenses * 1.02,
    );
    expect(downside.projectedEbitda).toBeLessThan(base.projectedEbitda);
  });

  it("does not calculate a margin when forecast revenue is zero", () => {
    const zeroAssumptions = { ...assumptions, annualRevenueBudget: 0 };
    const result = buildPlanningResult(
      zeroAssumptions,
      Object.fromEntries(MONTHS.map((month) => [month, 0])),
      "base",
    );

    expect(result.projectedRevenue).toBe(0);
    expect(result.projectedEbitdaMarginPercent).toBe(0);
  });

  it("keeps negative and non-finite assumptions from contaminating the model", () => {
    const invalid = {
      ...assumptions,
      annualRevenueBudget: Number.NaN,
      costOfGoodsSoldPercent: 120,
      annualOperatingExpenses: -5,
    };
    const result = buildPlanningResult(invalid, {}, "base");

    expect(result.budgetRevenue).toBe(0);
    expect(result.costOfGoodsSoldPercent).toBe(100);
    expect(result.projectedOperatingExpenses).toBe(0);
  });

  it("exposes seasonality weights that total 100 percent", () => {
    expect(SEASONALITY_WEIGHTS.reduce((sum, weight) => sum + weight, 0)).toBe(1);
  });
});
