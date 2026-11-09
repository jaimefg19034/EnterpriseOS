import { describe, expect, it } from "vitest";
import { calculateFinancials, type FinancialInputs } from "./financials";

const baseline: FinancialInputs = {
  revenue: 248_000,
  costOfGoodsSold: 96_300,
  operatingExpenses: 88_400,
  depreciationAndAmortisation: 12_500,
  interestExpense: 4_200,
  taxRatePercent: 25,
};

describe("calculateFinancials", () => {
  it("calculates the management P&L from the operating assumptions", () => {
    const result = calculateFinancials(baseline);

    expect(result.grossProfit).toBe(151_700);
    expect(result.ebitda).toBe(63_300);
    expect(result.ebit).toBe(50_800);
    expect(result.profitBeforeTax).toBe(46_600);
    expect(result.incomeTax).toBe(11_650);
    expect(result.netIncome).toBe(34_950);
    expect(result.ebitdaMarginPercent).toBe(25.52);
  });

  it("does not recognise income tax on a loss in this simplified model", () => {
    const result = calculateFinancials({
      ...baseline,
      revenue: 100,
      costOfGoodsSold: 80,
      operatingExpenses: 50,
      depreciationAndAmortisation: 0,
      interestExpense: 0,
    });

    expect(result.profitBeforeTax).toBe(-30);
    expect(result.incomeTax).toBe(0);
    expect(result.netIncome).toBe(-30);
  });

  it("returns zero margins when revenue is zero", () => {
    const result = calculateFinancials({
      ...baseline,
      revenue: 0,
      costOfGoodsSold: 0,
      operatingExpenses: 0,
      depreciationAndAmortisation: 0,
      interestExpense: 0,
    });

    expect(result.grossMarginPercent).toBe(0);
    expect(result.ebitdaMarginPercent).toBe(0);
    expect(result.netMarginPercent).toBe(0);
  });

  it("clamps negative and non-finite inputs to zero", () => {
    const result = calculateFinancials({
      revenue: Number.NaN,
      costOfGoodsSold: -10,
      operatingExpenses: Number.POSITIVE_INFINITY,
      depreciationAndAmortisation: 0,
      interestExpense: 0,
      taxRatePercent: 25,
    });

    expect(result.revenue).toBe(0);
    expect(result.costOfGoodsSold).toBe(0);
    expect(result.operatingExpenses).toBe(0);
    expect(result.netIncome).toBe(0);
  });

  it("caps the tax-rate assumption at 100 percent", () => {
    const result = calculateFinancials({
      ...baseline,
      revenue: 500,
      costOfGoodsSold: 0,
      operatingExpenses: 0,
      depreciationAndAmortisation: 0,
      interestExpense: 0,
      taxRatePercent: 150,
    });

    expect(result.incomeTax).toBe(500);
    expect(result.netIncome).toBe(0);
  });
});
