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
    expect(result.calculations.investmentAsPercentOfEbitda).toBeCloseTo(10);
    expect(result.calculations.revenueToRecoverInvestment).toBe(5000);
  });

  it("recalculates answers when the financial workspace state changes", () => {
    const changed = calculateFinancials({ revenue: 200000, costOfGoodsSold: 80000, operatingExpenses: 60000, depreciationAndAmortisation: 5000, interestExpense: 2000, taxRatePercent: 25 });
    const result = analyzeCopilotQuestion("¿Cómo recorto un 10% de gastos?", changed, EMPTY_OPERATIONS, "es");
    expect(result.calculations.saving).toBe(14000);
  });

  it("includes detailed expenses in cost-centre analysis", () => {\n    const operations = { ...EMPTY_OPERATIONS, costCenters: [{ id: "cc1", name: "Marketing", owner: "A", budget: 100, actualSpend: 100, period: "2026-Q4" }], expenses: [{ id: "e1", date: "2026-11-15", description: "Campaign", supplier: "S", category: "Marketing", costCenterId: "cc1", amount: 50, status: "paid" as const }] };\n    const result = analyzeCopilotQuestion("¿Cuál es la peor partida de gastos?", financials, operations, "es");\n    expect(result.calculations.topCostCenterSpend).toBe(150);\n    expect(result.response).toContain("50");\n  });\n\n  it("recognises an investment amount even without a currency symbol", () => {\n    const result = analyzeCopilotQuestion("¿Qué pasa si invierto 3000?", financials, EMPTY_OPERATIONS, "es");\n    expect(result.calculations.investment).toBe(3000);\n  });\n\n  it("treats a requested margin increase as a relative improvement", () => {\n    const result = analyzeCopilotQuestion("¿Cómo puedo subir mi margen un 15%?", financials, EMPTY_OPERATIONS, "es");\n    expect(result.calculations.targetMargin).toBeCloseTo(34.5);\n  });\n\n  it("does not claim a return when the question cannot be interpreted", () => {
    const result = analyzeCopilotQuestion("haz magia", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("unknown");
    expect(result.response).toContain("No puedo asociar");
  });
});
