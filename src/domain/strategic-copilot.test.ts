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

  it("answers broad or ambiguous questions with a grounded workspace overview", () => {
    const result = analyzeCopilotQuestion("haz magia", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("overview");
    expect(result.response).toContain("lectura general");
    expect(result.response).toContain("EBITDA");
    expect(result.matchedData).toContain("financials");
  });

  it("recognises a natural-language question about the business today", () => {
    const result = analyzeCopilotQuestion("¿Cómo ves mi negocio hoy?", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("overview");
    expect(result.response).toContain("Ingresos");
    expect(result.response).toContain("EBITDA");
  });

  it("recognises open-ended weekly advice requests", () => {
    const result = analyzeCopilotQuestion("¿Qué me aconsejas hacer esta semana?", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("advice");
    expect(result.response).toContain("prioridad");
  });

  it("recognises a concern about spending too much", () => {
    const result = analyzeCopilotQuestion("No sé si estoy gastando demasiado", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("saving");
  });
  it("responds naturally to greetings with live business figures", () => {
    const result = analyzeCopilotQuestion("¡Buenas tardes! ¿Qué tal?", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("greeting");
    expect(result.response).toContain("100.000");
    expect(result.matchedData).toContain("financials");
  });

  it("scores an elaborated strategic question as a cross-workspace overview", () => {
    const result = analyzeCopilotQuestion("Oye, ¿cómo ves el rumbo de este mes respecto a lo que gastamos?", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("overview");
    expect(result.response).toContain("EBITDA");
    expect(result.response).toContain("serie histórica");
    expect(result.matchedData).toContain("operations.expenses");
  });

  it("gives a strategic CFO recommendation for open-ended questions", () => {
    const result = analyzeCopilotQuestion("¿Qué harías tú si fueras mi director financiero?", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("advice");
    expect(result.response).toContain("Si estuviera dirigiendo finanzas");
    expect(result.matchedData).toContain("operations.kpis");
  });

  it("prioritises the previous topic over incidental words in a natural follow-up", () => {
    const result = analyzeCopilotQuestion("¿Y ahora cómo lo ves?", financials, EMPTY_OPERATIONS, "es", undefined, { previousIntent: "expense", previousQuestion: "¿Qué gastos tengo?" });
    expect(result.intent).toBe("expense");
    expect(result.response).toContain("gastos operativos");
  });

  it("parses a long sentence with a hire cost and a marketing reduction", () => {
    const operations = { ...EMPTY_OPERATIONS, expenses: [{ id: "m1", date: "2026-11-15", description: "Paid ads", supplier: "S", category: "Marketing", costCenterId: "cc1", amount: 10000, status: "paid" as const }] };
    const result = analyzeCopilotQuestion("Si contrato a alguien por 2.000 euros al mes o recorto un 15% en marketing, ¿cómo me quedo?", financials, operations, "es");
    expect(result.intent).toBe("advice");
    expect(result.calculations.hireMonthlyCost).toBe(2000);
    expect(result.calculations.marketingSaving).toBe(1500);
    expect(result.calculations.annualHireCost).toBe(24000);
    expect(result.response).toContain("periodos deben coincidir");
    expect(result.response).toContain("cotizaciones");
  });

  it("handles thanks and short conversational turns without a blank reply", () => {
    const result = analyzeCopilotQuestion("¡Perfecto, gracias!", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("social");
    expect(result.response.length).toBeGreaterThan(20);
  });

  it("reads the live 13-week cash forecast", () => {
    const result = analyzeCopilotQuestion("¿Cómo ves la caja y el flujo?", financials, EMPTY_OPERATIONS, "es", {
      planning: null,
      statementAssumptions: null,
      cashForecastWeeks: [{ collections: 1000, operatingPayments: 500, capitalExpenditure: 100, debtService: 50 }],
    });
    expect(result.intent).toBe("cash");
    expect(result.calculations.forecastClosingCash - result.calculations.closingCash).toBeCloseTo(350, 5);
    expect(result.matchedData).toContain("cashForecastWeeks");
  });

  it("reads current receivables and payables from the working-capital register", () => {
    const invoices = [
      { id: "r1", direction: "receivable" as const, counterparty: "Customer A", reference: "INV-1", issueDate: "2020-01-01", dueDate: "2020-01-31", amount: 1200, paidAmount: 200 },
      { id: "p1", direction: "payable" as const, counterparty: "Supplier B", reference: "BILL-1", issueDate: "2020-01-01", dueDate: "2020-01-31", amount: 800, paidAmount: 0 },
    ];
    const result = analyzeCopilotQuestion("¿Qué facturas tengo pendientes de cobro y pago?", financials, EMPTY_OPERATIONS, "es", {
      planning: null, statementAssumptions: null, workingCapitalInvoices: invoices,
    });
    expect(result.intent).toBe("workingCapital");
    expect(result.calculations.receivablesOutstanding).toBe(1000);
    expect(result.calculations.payablesOutstanding).toBe(800);
    expect(result.matchedData).toContain("workingCapitalInvoices");
  });

  it("understands natural-language synonyms without relying on the canonical keyword", () => {
    const result = analyzeCopilotQuestion("¿Cuánto dinero me deben ahora mismo?", financials, EMPTY_OPERATIONS, "es", {
      planning: null, statementAssumptions: null,
      workingCapitalInvoices: [{ id: "r1", direction: "receivable", counterparty: "Cliente", reference: "INV-1", issueDate: "2026-11-01", dueDate: "2026-11-20", amount: 2400, paidAmount: 400 }],
    });
    expect(result.intent).toBe("workingCapital");
    expect(result.calculations.receivablesOutstanding).toBe(2000);
  });

  it("answers about the specific named project instead of returning a workspace overview", () => {
    const operations = { ...EMPTY_OPERATIONS, projects: [{ id: "p1", name: "Migración ERP", owner: "Ana", budget: 10000, spent: 12500, dueDate: "2026-12-01", status: "active" as const }] };
    const result = analyzeCopilotQuestion("¿Qué está pasando con la migración del ERP?", financials, operations, "es");
    expect(result.intent).toBe("project");
    expect(result.matchedData).toContain("operations.projects");
    expect(result.calculations.projectVariance).toBe(2500);
    expect(result.response).toContain("Migración ERP");
    expect(result.response).toContain("2.500");
  });

  it("keeps the previous topic for explanatory and corrective follow-up questions", () => {
    const result = analyzeCopilotQuestion("¿Y por qué ocurre eso?", financials, EMPTY_OPERATIONS, "es", undefined, {
      previousIntent: "cash", previousQuestion: "¿Por qué baja la caja?"
    });
    expect(result.intent).toBe("cash");
  });

  it("answers indirect spend questions with a live category ranking, not a generic overview", () => {
    const operations = { ...EMPTY_OPERATIONS, expenses: [
      { id: "e1", date: "2026-11-15", description: "Campaign", supplier: "S", category: "Marketing", costCenterId: "cc1", amount: 1250, status: "paid" as const },
      { id: "e2", date: "2026-11-15", description: "Hosting", supplier: "Cloud", category: "Software", costCenterId: "cc2", amount: 420, status: "paid" as const },
    ], costCenters: [
      { id: "cc1", name: "Marketing", owner: "A", budget: 2000, actualSpend: 0, period: "2026-Q4" },
      { id: "cc2", name: "Software", owner: "B", budget: 1000, actualSpend: 0, period: "2026-Q4" },
    ] };
    const result = analyzeCopilotQuestion("¿Dónde se está yendo el dinero?", financials, operations, "es");
    expect(result.intent).toBe("expense");
    expect(result.response).toContain("1. Marketing");
    expect(result.response).toContain("2. Software");
    expect(result.response).not.toContain("Te doy una lectura conjunta");

    const concrete = analyzeCopilotQuestion("¿Qué partida concreta está consumiendo más recursos?", financials, operations, "es");
    expect(concrete.intent).toBe("expense");
    expect(concrete.response).toContain("Marketing");
  });


  it("keeps a short follow-up attached to the previous financial topic", () => {
    const result = analyzeCopilotQuestion("¿Y cómo bajo eso?", financials, EMPTY_OPERATIONS, "es", undefined, {
      previousIntent: "saving",
      previousQuestion: "¿Qué gastos tengo?",
    });
    expect(result.intent).toBe("saving");
    expect(result.calculations.saving).toBe(7000);
  });

  it("recalculates a percentage change in a contextual follow-up", () => {
    const result = analyzeCopilotQuestion("¿Qué pasa si lo subo un 20%?", financials, EMPTY_OPERATIONS, "es", undefined, {
      previousIntent: "revenue",
      previousQuestion: "¿Cómo van los ingresos?",
    });
    expect(result.intent).toBe("revenue");
    expect(result.calculations.revenueAfterScenario).toBe(120000);
  });

  it("resolves an explicit second-point reference from the previous answer", () => {
    const result = analyzeCopilotQuestion("Dame más detalles del segundo punto", financials, EMPTY_OPERATIONS, "es", undefined, {
      previousIntent: "advice",
      previousQuestion: "¿Qué priorizarías?",
      previousResponse: ["1. Revisar margen bruto", "2. Reducir concentración de clientes", "3. Mejorar cobros"].join("\n"),
    });
    expect(result.response).toContain("Reducir concentración de clientes");
    expect(result.matchedData).toContain("conversation.previousResponse");
  });



  it("parses percentages written as words and applies them to the previous savings target", () => {
    const result = analyzeCopilotQuestion("¿Y si aumento el ahorro anterior un quince por ciento?", financials, EMPTY_OPERATIONS, "es", undefined, {
      previousIntent: "saving",
      previousQuestion: "¿Cómo reduzco gastos?",
      previousCalculations: { expenseBase: 70000, saving: 7000 },
    });
    expect(result.intent).toBe("saving");
    expect(result.calculations.savingAfterScenario).toBe(8050);
    expect(result.calculations.incrementalSaving).toBe(1050);
  });

  it("turns an implementation follow-up into a concrete plan tied to the previous analysis", () => {
    const result = analyzeCopilotQuestion("Dame un plan paso a paso para aplicarlo", financials, EMPTY_OPERATIONS, "es", undefined, {
      previousIntent: "saving",
      previousQuestion: "¿Cómo reduzco gastos?",
      previousCalculations: { expenseBase: 70000, saving: 7000 },
    });
    expect(result.action).toBe("implement");
    expect(result.steps?.length).toBeGreaterThanOrEqual(3);
    expect(result.calculations.targetSaving).toBe(7000);
  });



  it("compares the exact two financial metrics named by the user", () => {
    const result = analyzeCopilotQuestion("Compara ingresos con gastos operativos", financials, EMPTY_OPERATIONS, "es");
    expect(result.intent).toBe("comparison");
    expect(result.calculations.comparisonFirst).toBe(100000);
    expect(result.calculations.comparisonSecond).toBe(30000);
    expect(result.calculations.comparisonDifference).toBe(70000);
    expect(result.response).toContain("Ingresos");
    expect(result.response).toContain("Gastos operativos");
  });


});