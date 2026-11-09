export type FinancialInputs = {
  revenue: number;
  costOfGoodsSold: number;
  operatingExpenses: number;
  depreciationAndAmortisation: number;
  interestExpense: number;
  taxRatePercent: number;
};

export type FinancialResults = {
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  ebitda: number;
  ebitdaMarginPercent: number;
  depreciationAndAmortisation: number;
  ebit: number;
  ebitMarginPercent: number;
  interestExpense: number;
  profitBeforeTax: number;
  incomeTax: number;
  netIncome: number;
  netMarginPercent: number;
};

const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const safeMargin = (numerator: number, denominator: number): number =>
  denominator > 0 ? roundCurrency((numerator / denominator) * 100) : 0;

/**
 * Calculates a simplified management profit & loss statement.
 *
 * Expenses are supplied as positive amounts. This deliberately models
 * operating EBITDA as gross profit less operating expenses, with D&A
 * excluded from operating expenses and deducted separately below EBITDA.
 */
export function calculateFinancials(
  inputs: FinancialInputs,
): FinancialResults {
  const revenue = Math.max(0, Number.isFinite(inputs.revenue) ? inputs.revenue : 0);
  const costOfGoodsSold = Math.max(
    0,
    Number.isFinite(inputs.costOfGoodsSold) ? inputs.costOfGoodsSold : 0,
  );
  const operatingExpenses = Math.max(
    0,
    Number.isFinite(inputs.operatingExpenses) ? inputs.operatingExpenses : 0,
  );
  const depreciationAndAmortisation = Math.max(
    0,
    Number.isFinite(inputs.depreciationAndAmortisation)
      ? inputs.depreciationAndAmortisation
      : 0,
  );
  const interestExpense = Math.max(
    0,
    Number.isFinite(inputs.interestExpense) ? inputs.interestExpense : 0,
  );
  const taxRatePercent = Math.min(
    100,
    Math.max(0, Number.isFinite(inputs.taxRatePercent) ? inputs.taxRatePercent : 0),
  );

  const grossProfit = roundCurrency(revenue - costOfGoodsSold);
  const ebitda = roundCurrency(grossProfit - operatingExpenses);
  const ebit = roundCurrency(ebitda - depreciationAndAmortisation);
  const profitBeforeTax = roundCurrency(ebit - interestExpense);
  const incomeTax = roundCurrency(
    Math.max(0, profitBeforeTax) * (taxRatePercent / 100),
  );
  const netIncome = roundCurrency(profitBeforeTax - incomeTax);

  return {
    revenue,
    costOfGoodsSold,
    grossProfit,
    grossMarginPercent: safeMargin(grossProfit, revenue),
    operatingExpenses,
    ebitda,
    ebitdaMarginPercent: safeMargin(ebitda, revenue),
    depreciationAndAmortisation,
    ebit,
    ebitMarginPercent: safeMargin(ebit, revenue),
    interestExpense,
    profitBeforeTax,
    incomeTax,
    netIncome,
    netMarginPercent: safeMargin(netIncome, revenue),
  };
}

export function formatCurrency(value: number, compact = false): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value) + "%";
}
