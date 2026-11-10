export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export type MonthName = (typeof MONTHS)[number];
export type PresetScenarioKey = "base" | "upside" | "downside";
export type ScenarioKey = PresetScenarioKey | "custom";

export type PlanningAssumptions = {
  annualRevenueBudget: number;
  costOfGoodsSoldPercent: number;
  annualOperatingExpenses: number;
  annualDepreciationAndAmortisation: number;
  annualInterestExpense: number;
  taxRatePercent: number;
};

export type ActualRevenueByMonth = Partial<Record<MonthName, number | null>>;

export type ScenarioDefinition = {
  key: ScenarioKey;
  label: string;
  description: string;
  revenueGrowthPercent: number;
  cogsRateAdjustmentPp: number;
  operatingExpenseMultiplier: number;
};

export type MonthlyPlanRow = {
  month: MonthName;
  budgetRevenue: number;
  actualRevenue: number | null;
  forecastRevenue: number | null;
  revenueVariance: number | null;
  status: "Actual" | "Forecast";
};

export type PlanningResult = {
  scenario: ScenarioDefinition;
  monthlyRows: MonthlyPlanRow[];
  assumptions: PlanningAssumptions;
  budgetRevenue: number;
  actualRevenueToDate: number;
  budgetRevenueToDate: number;
  remainingForecastRevenue: number;
  projectedRevenue: number;
  revenueVariance: number;
  costOfGoodsSoldPercent: number;
  projectedCostOfGoodsSold: number;
  projectedGrossProfit: number;
  projectedOperatingExpenses: number;
  projectedEbitda: number;
  projectedEbitdaMarginPercent: number;
  projectedDepreciationAndAmortisation: number;
  projectedEbit: number;
  projectedInterestExpense: number;
  projectedProfitBeforeTax: number;
  projectedIncomeTax: number;
  projectedNetIncome: number;
  budgetEbitda: number;
  ebitdaVariance: number;
};

export const SCENARIOS: Record<PresetScenarioKey, ScenarioDefinition> = {
  base: {
    key: "base",
    label: "Base case",
    description: "Current budget assumptions with no additional growth or cost changes.",
    revenueGrowthPercent: 0,
    cogsRateAdjustmentPp: 0,
    operatingExpenseMultiplier: 1,
  },
  upside: {
    key: "upside",
    label: "Upside",
    description: "Revenue 12% above plan, 1.5 pp better COGS ratio and unchanged operating costs.",
    revenueGrowthPercent: 12,
    cogsRateAdjustmentPp: -1.5,
    operatingExpenseMultiplier: 1,
  },
  downside: {
    key: "downside",
    label: "Downside",
    description: "Revenue 12% below plan, COGS ratio 2 pp higher and operating costs 2% higher.",
    revenueGrowthPercent: -12,
    cogsRateAdjustmentPp: 2,
    operatingExpenseMultiplier: 1.02,
  },
};

// Illustrative monthly seasonality. These weights sum to exactly 100%.
export const SEASONALITY_WEIGHTS = [
  0.072, 0.072, 0.081, 0.082, 0.084, 0.086,
  0.073, 0.073, 0.085, 0.087, 0.095, 0.11,
] as const;

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const finiteNonNegative = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const clampPercent = (value: number): number =>
  Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

function allocateAnnualAmount(amount: number, weights: readonly number[]): number[] {
  const safeAmount = finiteNonNegative(amount);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (weights.length === 0 || totalWeight <= 0) return [];

  let allocated = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return roundMoney(safeAmount - allocated);
    }
    const share = roundMoney(safeAmount * (weight / totalWeight));
    allocated = roundMoney(allocated + share);
    return share;
  });
}

/**
 * Builds a full-year management forecast with actual revenue entered for
 * closed periods and scenario-adjusted revenue for future periods.
 *
 * Important: historical COGS and operating expenses are not actuals in this
 * first version. The annual profitability output is therefore a modelled
 * estimate using the selected scenario's cost assumptions.
 */
export function buildPlanningResult(
  inputAssumptions: PlanningAssumptions,
  actualRevenueByMonth: ActualRevenueByMonth,
  scenarioKey: ScenarioKey,
  customRevenueGrowthPercent = 0,
): PlanningResult {
  const assumptions: PlanningAssumptions = {
    annualRevenueBudget: finiteNonNegative(inputAssumptions.annualRevenueBudget),
    costOfGoodsSoldPercent: clampPercent(inputAssumptions.costOfGoodsSoldPercent),
    annualOperatingExpenses: finiteNonNegative(inputAssumptions.annualOperatingExpenses),
    annualDepreciationAndAmortisation: finiteNonNegative(
      inputAssumptions.annualDepreciationAndAmortisation,
    ),
    annualInterestExpense: finiteNonNegative(inputAssumptions.annualInterestExpense),
    taxRatePercent: clampPercent(inputAssumptions.taxRatePercent),
  };
  const safeCustomGrowth = Math.min(30, Math.max(-30, Number.isFinite(customRevenueGrowthPercent) ? customRevenueGrowthPercent : 0));
  const scenario: ScenarioDefinition = scenarioKey === "custom"
    ? { key: "custom", label: "Custom scenario", description: `Custom forecast: ${safeCustomGrowth >= 0 ? "+" : ""}${safeCustomGrowth}% revenue adjustment. Cost assumptions remain unchanged.`, revenueGrowthPercent: safeCustomGrowth, cogsRateAdjustmentPp: 0, operatingExpenseMultiplier: 1 }
    : SCENARIOS[scenarioKey];
  const monthlyBudget = allocateAnnualAmount(
    assumptions.annualRevenueBudget,
    SEASONALITY_WEIGHTS,
  );

  const monthlyRows: MonthlyPlanRow[] = MONTHS.map((month, index) => {
    const rawActual = actualRevenueByMonth[month];
    const isActual = rawActual !== null && rawActual !== undefined;
    const actualRevenue = isActual ? finiteNonNegative(rawActual) : null;
    const budgetRevenue = monthlyBudget[index];
    const forecastRevenue = isActual
      ? null
      : roundMoney(
          budgetRevenue * (1 + scenario.revenueGrowthPercent / 100),
        );

    return {
      month,
      budgetRevenue,
      actualRevenue,
      forecastRevenue,
      revenueVariance: isActual
        ? roundMoney((actualRevenue ?? 0) - budgetRevenue)
        : null,
      status: isActual ? "Actual" : "Forecast",
    };
  });

  const actualRevenueToDate = roundMoney(
    monthlyRows.reduce((sum, row) => sum + (row.actualRevenue ?? 0), 0),
  );
  const budgetRevenueToDate = roundMoney(
    monthlyRows
      .filter((row) => row.status === "Actual")
      .reduce((sum, row) => sum + row.budgetRevenue, 0),
  );
  const remainingForecastRevenue = roundMoney(
    monthlyRows.reduce((sum, row) => sum + (row.forecastRevenue ?? 0), 0),
  );
  const budgetRevenue = roundMoney(
    monthlyRows.reduce((sum, row) => sum + row.budgetRevenue, 0),
  );
  const projectedRevenue = roundMoney(
    actualRevenueToDate + remainingForecastRevenue,
  );
  const revenueVariance = roundMoney(projectedRevenue - budgetRevenue);
  const costOfGoodsSoldPercent = clampPercent(
    assumptions.costOfGoodsSoldPercent + scenario.cogsRateAdjustmentPp,
  );
  const projectedCostOfGoodsSold = roundMoney(
    projectedRevenue * (costOfGoodsSoldPercent / 100),
  );
  const projectedGrossProfit = roundMoney(
    projectedRevenue - projectedCostOfGoodsSold,
  );
  const projectedOperatingExpenses = roundMoney(
    assumptions.annualOperatingExpenses * scenario.operatingExpenseMultiplier,
  );
  const projectedEbitda = roundMoney(
    projectedGrossProfit - projectedOperatingExpenses,
  );
  const projectedEbitdaMarginPercent =
    projectedRevenue > 0
      ? roundMoney((projectedEbitda / projectedRevenue) * 100)
      : 0;
  const projectedDepreciationAndAmortisation = roundMoney(
    assumptions.annualDepreciationAndAmortisation,
  );
  const projectedEbit = roundMoney(
    projectedEbitda - projectedDepreciationAndAmortisation,
  );
  const projectedInterestExpense = roundMoney(assumptions.annualInterestExpense);
  const projectedProfitBeforeTax = roundMoney(
    projectedEbit - projectedInterestExpense,
  );
  const projectedIncomeTax = roundMoney(
    Math.max(0, projectedProfitBeforeTax) * (assumptions.taxRatePercent / 100),
  );
  const projectedNetIncome = roundMoney(
    projectedProfitBeforeTax - projectedIncomeTax,
  );
  const budgetEbitda = roundMoney(
    budgetRevenue * (1 - assumptions.costOfGoodsSoldPercent / 100) -
      assumptions.annualOperatingExpenses,
  );

  return {
    scenario,
    monthlyRows,
    assumptions,
    budgetRevenue,
    actualRevenueToDate,
    budgetRevenueToDate,
    remainingForecastRevenue,
    projectedRevenue,
    revenueVariance,
    costOfGoodsSoldPercent,
    projectedCostOfGoodsSold,
    projectedGrossProfit,
    projectedOperatingExpenses,
    projectedEbitda,
    projectedEbitdaMarginPercent,
    projectedDepreciationAndAmortisation,
    projectedEbit,
    projectedInterestExpense,
    projectedProfitBeforeTax,
    projectedIncomeTax,
    projectedNetIncome,
    budgetEbitda,
    ebitdaVariance: roundMoney(projectedEbitda - budgetEbitda),
  };
}

export function makeDemoActualRevenue(
  annualRevenueBudget: number,
): Record<MonthName, number | null> {
  const budget = allocateAnnualAmount(annualRevenueBudget, SEASONALITY_WEIGHTS);
  const actualFactors = [0.96, 1.02, 1.01, 0.99, 1.04, 1.03, 0.97, 1.05, 1.02, 1.01];

  return Object.fromEntries(
    MONTHS.map((month, index) => [
      month,
      index < actualFactors.length
        ? roundMoney(budget[index] * actualFactors[index])
        : null,
    ]),
  ) as Record<MonthName, number | null>;
}
