import { describe, expect, it } from "vitest";
import {
  buildPlanningResult,
  comparePlanningScenarios,
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
  it("compares all four scenarios against the same actuals and base case", () => {
    const actuals = makeDemoActualRevenue(assumptions.annualRevenueBudget);
    const comparison = comparePlanningScenarios(assumptions, actuals, 7.5);

    expect(comparison.map((row) => row.key)).toEqual([
      "base", "upside", "downside", "custom",
    ]);
    expect(comparison[0].deltaVsBase).toEqual({
      revenue: 0,
      ebitda: 0,
      netIncome: 0,
      ebitdaMarginPercentagePoints: 0,
    });
    expect(comparison[1].result.actualRevenueToDate).toBe(comparison[0].result.actualRevenueToDate);
    expect(comparison[2].result.actualRevenueToDate).toBe(comparison[0].result.actualRevenueToDate);
    expect(comparison[3].result.actualRevenueToDate).toBe(comparison[0].result.actualRevenueToDate);
    expect(comparison[3].result.scenario.revenueGrowthPercent).toBe(7.5);
    expect(comparison[1].deltaVsBase.revenue).toBeGreaterThan(0);
    expect(comparison[2].deltaVsBase.revenue).toBeLessThan(0);
    expect(comparison[3].deltaVsBase.revenue).toBeGreaterThan(0);
    for (const row of comparison) {
      expect(row.deltaVsBase.revenue).toBeCloseTo(
        row.result.projectedRevenue - comparison[0].result.projectedRevenue, 2,
      );
      expect(row.deltaVsBase.ebitda).toBeCloseTo(
        row.result.projectedEbitda - comparison[0].result.projectedEbitda, 2,
      );
      expect(row.deltaVsBase.netIncome).toBeCloseTo(
        row.result.projectedNetIncome - comparison[0].result.projectedNetIncome, 2,
      );
    }
  });

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

  it("reconciles the full-year revenue variance into actual and forecast components", () => {
    const actuals = makeDemoActualRevenue(assumptions.annualRevenueBudget);
    const result = buildPlanningResult(assumptions, actuals, "base");
    expect(result.actualRevenueVarianceToDate).toBeCloseTo(result.actualRevenueToDate - result.budgetRevenueToDate, 2);
    expect(result.remainingBudgetRevenue).toBeCloseTo(result.budgetRevenue - result.budgetRevenueToDate, 2);
    expect(result.remainingForecastVariance).toBeCloseTo(result.remainingForecastRevenue - result.remainingBudgetRevenue, 2);
    expect(result.actualRevenueVarianceToDate + result.remainingForecastVariance).toBeCloseTo(result.revenueVariance, 2);
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

  it("applies a custom revenue adjustment only to forecast months and leaves cost assumptions unchanged", () => {
    const actuals = makeDemoActualRevenue(assumptions.annualRevenueBudget);
    const base = buildPlanningResult(assumptions, actuals, "base");
    const custom = buildPlanningResult(assumptions, actuals, "custom", 7.5);
    expect(custom.monthlyRows.slice(0, 10).map((row) => row.actualRevenue)).toEqual(base.monthlyRows.slice(0, 10).map((row) => row.actualRevenue));
    expect(custom.remainingForecastRevenue).toBeCloseTo(base.remainingForecastRevenue * 1.075, 2);
    expect(custom.costOfGoodsSoldPercent).toBe(assumptions.costOfGoodsSoldPercent);
    expect(custom.projectedOperatingExpenses).toBe(assumptions.annualOperatingExpenses);
    expect(custom.scenario.revenueGrowthPercent).toBe(7.5);
  });

  it("clamps custom revenue adjustments to the supported range", () => {
    expect(buildPlanningResult(assumptions, {}, "custom", 90).scenario.revenueGrowthPercent).toBe(30);
    expect(buildPlanningResult(assumptions, {}, "custom", -90).scenario.revenueGrowthPercent).toBe(-30);
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
    expect(SEASONALITY_WEIGHTS.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
  });
});
