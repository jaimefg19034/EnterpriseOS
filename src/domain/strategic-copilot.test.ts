import { describe, expect, it } from "vitest";
import { calculateFinancials } from "@/domain/financials";
import { EMPTY_OPERATIONS } from "@/domain/operations";
import { analyzeCopilotQuestion } from "@/domain/strategic-copilot";

const financials = calculateFinancials({ revenue: 100000, costOfGoodsSold: 40000, operatingExpenses: 30000, depreciationAndAmortisation: 5000, interestExpense: 2000, taxRatePercent: 25 });

describe("analyzeCopilotQuestion", () => {
  it("calculates a percentage cost reduction from current workspace numbers", () => {
    const result = analyzeCopilotQuestion("¿Cómo recorto un 10% de gastos?", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("saving");
    expect(result.calculations.expenseBase).toBe(70000);
    expect(result.calculations.saving).toBe(7000);
    expect(result.calculations.ebitdaAfterSaving).toBe(37000);
  });

  it("calculates a user-entered investment amount and break-even sales", () => {
    const result = analyzeCopilotQuestion("¿Qué pasa si invierto 3.000€?", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("investment");
    expect(result.calculations.investment).toBe(3000);
    expect(result.calculations.investmentAsPercentOfEbitda).toBeCloseTo(12);
    expect(result.calculations.revenueToRecoverInvestment).toBe(5000);
  });

  it("recalculates answers when the financial workspace state changes", () => {
    const changed = calculateFinancials({ revenue: 200000, costOfGoodsSold: 80000, operatingExpenses: 60000, depreciationAndAmortisation: 5000, interestExpense: 2000, taxRatePercent: 25 });
    const result = analyzeCopilotQuestion("¿Cómo recorto un 10% de gastos?", changed, EMPTY_OPERATIONS, "es");
    expect(result.calculations.saving).toBe(14000);
  });

  it("does not claim a return when the question cannot be interpreted", () => {
    const result = analyzeCopilotQuestion("haz magia", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("unknown");
    expect(result.response).toContain("No puedo asociar");
  });
});
