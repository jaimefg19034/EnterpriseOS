import { describe, expect, it } from "vitest";
import { calculateFinancials } from "./financials";
import { calculateThreeStatements, DEFAULT_THREE_STATEMENT_ASSUMPTIONS } from "./three-statements";
import { calculateFinancialRatios } from "./financial-analysis";

const financials = calculateFinancials({
  revenue: 248_000,
  costOfGoodsSold: 96_300,
  operatingExpenses: 88_400,
  depreciationAndAmortisation: 12_500,
  interestExpense: 4_200,
  taxRatePercent: 25,
});

describe("calculateFinancialRatios", () => {
  it("calculates liquidity, leverage, efficiency and cash returns", () => {
    const statements = calculateThreeStatements(financials, DEFAULT_THREE_STATEMENT_ASSUMPTIONS);
    const groups = calculateFinancialRatios(financials, statements);
    const find = (key: string) => groups.flatMap((group) => group.ratios).find((ratio) => ratio.key === key);

    expect(find("Current ratio")?.value).toBeGreaterThan(0);
    expect(find("Quick ratio")?.value).toBeGreaterThan(0);
    expect(find("Cash conversion cycle")?.value).toBe(60);
    expect(find("Free cash flow margin")?.value).not.toBeNull();
    expect(find("Interest coverage")?.value).toBe(12.1);
  });

  it("returns null rather than misleading zeroes for undefined ratios", () => {
    const noDebtCost = calculateFinancials({
      revenue: 0, costOfGoodsSold: 0, operatingExpenses: 0,
      depreciationAndAmortisation: 0, interestExpense: 0, taxRatePercent: 25,
    });
    const statements = calculateThreeStatements(noDebtCost, DEFAULT_THREE_STATEMENT_ASSUMPTIONS);
    const groups = calculateFinancialRatios(noDebtCost, statements);
    const all = groups.flatMap((group) => group.ratios);
    expect(all.find((ratio) => ratio.key === "Interest coverage")?.value).toBeNull();
    expect(all.find((ratio) => ratio.key === "Free cash flow margin")?.value).toBeNull();
  });
});
