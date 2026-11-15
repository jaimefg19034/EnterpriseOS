import { describe, expect, it } from "vitest";
import { calculateFinancials } from "./financials";
import { EMPTY_OPERATIONS } from "./operations";
import { analyzeCopilotQuestion } from "./strategic-copilot";

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

  it("includes detailed expenses in cost-centre analysis", () => {
    const operations = { ...EMPTY_OPERATIONS, costCenters: [{ id: "cc1", name: "Marketing", owner: "A", budget: 100, actualSpend: 100, period: "2026-Q4" }], expenses: [{ id: "e1", date: "2026-11-15", description: "Campaign", supplier: "S", category: "Marketing", costCenterId: "cc1", amount: 50, status: "paid" as const }] };
    const result = analyzeCopilotQuestion("¿Cuál es la peor partida de gastos?", financials, operations, "es");
    expect(result.calculations.topCostCenterSpend).toBe(150);
    expect(result.response).toContain("50");
  });

  it("recognises an investment amount even without a currency symbol", () => {
    const result = analyzeCopilotQuestion("¿Qué pasa si invierto 3000?", financials, EMPTY_OPERATIONS, "es");
    expect(result.calculations.investment).toBe(3000);
  });

  it("treats a requested margin increase as a relative improvement", () => {
    const result = analyzeCopilotQuestion("¿Cómo puedo subir mi margen un 15%?", financials, EMPTY_OPERATIONS, "es");
    expect(result.calculations.targetMargin).toBeCloseTo(34.5);
  });

  it("uses edited three-statement assumptions for cash questions", () => {
    const result = analyzeCopilotQuestion("¿Cómo está la caja y la deuda?", financials, EMPTY_OPERATIONS, "es", { planning: null, statementAssumptions: { daysSalesOutstanding: 30, inventoryDays: 30, payableDays: 30, capitalExpenditure: 1000, debtRepayment: 5000, newBorrowings: 0, dividends: 0 } });
    expect(result.intent).toBe("cash");
    expect(result.matchedData).toContain("threeStatementAssumptions");
    expect(result.calculations.closingCash).toBeTypeOf("number");
  });

  it("uses live planning assumptions and actual revenue", () => {
    const planning = { schemaVersion: 2 as const, selectedYear: 2026, savedAt: "2026-11-15", years: { "2026": { assumptions: { annualRevenueBudget: 500000, costOfGoodsSoldPercent: 40, annualOperatingExpenses: 200000, annualDepreciationAndAmortisation: 10000, annualInterestExpense: 5000, taxRatePercent: 25 }, actualRevenue: { Jan: 50000, Feb: null, Mar: null, Apr: null, May: null, Jun: null, Jul: null, Aug: null, Sep: null, Oct: null, Nov: null, Dec: null }, scenario: "base" as const, customRevenueGrowthPercent: 0 } } };
    const result = analyzeCopilotQuestion("Analiza mi presupuesto y forecast", financials, EMPTY_OPERATIONS, "es", { planning, statementAssumptions: null });
    expect(result.intent).toBe("planning");
    expect(result.calculations.annualRevenueBudget).toBe(500000);
    expect(result.calculations.actualRevenueEntered).toBe(50000);
  });

  it("calculates a fixed-amount operating cost reduction", () => {
    const result = analyzeCopilotQuestion("Reduce 3.000€ de gastos operativos", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("saving");
    expect(result.calculations.expenseBase).toBe(30000);
    expect(result.calculations.saving).toBe(3000);
  });

  it("models a revenue increase using the current gross margin", () => {
    const result = analyzeCopilotQuestion("¿Y si aumentan ingresos un 10%?", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("revenue");
    expect(result.calculations.revenueAfterScenario).toBe(110000);
    expect(result.calculations.ebitdaAfterScenario).toBe(36000);
  });

  it("does not claim a return when the question cannot be interpreted", () => {
    const result = analyzeCopilotQuestion("haz magia", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("unknown");
    expect(result.response).toContain("No puedo asociar");
  });
});
