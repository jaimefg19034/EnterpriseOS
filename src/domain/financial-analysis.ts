import type { FinancialResults } from "./financials";
import { OPENING_BALANCE_SHEET, type ThreeStatementResults } from "./three-statements";

export type FinancialRatio = {
  key: string;
  value: number | null;
  unit: "multiple" | "days" | "percent" | "currency";
  description: string;
};

export type FinancialRatioGroup = {
  key: string;
  ratios: FinancialRatio[];
};

/**
 * Calculates common management ratios from the linked P&L, balance sheet and
 * cash flow model. A null value means the ratio is not meaningful because its
 * denominator is zero or unavailable; it is never silently presented as 0.
 */
export function calculateFinancialRatios(
  financials: FinancialResults,
  model: ThreeStatementResults,
): FinancialRatioGroup[] {
  const bs = model.balanceSheet;
  const cf = model.cashFlow;
  const openingEquity = OPENING_BALANCE_SHEET.shareCapital + OPENING_BALANCE_SHEET.retainedEarnings;
  const averageAssets = (bs.openingAssets + bs.totalAssets) / 2;
  const averageEquity = (openingEquity + bs.totalEquity) / 2;
  const safeRatio = (numerator: number, denominator: number): number | null =>
    Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
      ? Math.round((numerator / denominator) * 100) / 100
      : null;
  const safePercent = (numerator: number, denominator: number): number | null =>
    Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
      ? Math.round((numerator / denominator) * 10_000) / 100
      : null;

  return [
    {
      key: "Liquidity",
      ratios: [
        { key: "Current ratio", value: safeRatio(bs.currentAssets, bs.currentLiabilities), unit: "multiple", description: "Current assets / current liabilities" },
        { key: "Quick ratio", value: safeRatio(bs.cash + bs.accountsReceivable, bs.currentLiabilities), unit: "multiple", description: "(Cash + receivables) / current liabilities" },
        { key: "Cash ratio", value: safeRatio(bs.cash, bs.currentLiabilities), unit: "multiple", description: "Cash / current liabilities" },
      ],
    },
    {
      key: "Leverage",
      ratios: [
        { key: "Debt to equity", value: safeRatio(bs.debt + bs.overdraft, bs.totalEquity), unit: "multiple", description: "Interest-bearing debt / total equity" },
        { key: "Net debt / EBITDA", value: financials.ebitda > 0 ? safeRatio(bs.netDebt, financials.ebitda) : null, unit: "multiple", description: "Net debt / EBITDA" },
        { key: "Interest coverage", value: safeRatio(financials.ebit, financials.interestExpense), unit: "multiple", description: "EBIT / interest expense" },
      ],
    },
    {
      key: "Operating efficiency",
      ratios: [
        { key: "Cash conversion cycle", value: Math.round((model.drivers.daysSalesOutstanding + model.drivers.inventoryDays - model.drivers.payableDays) * 100) / 100, unit: "days", description: "DSO + inventory days − payable days" },
        { key: "Asset turnover", value: safeRatio(financials.revenue, averageAssets), unit: "multiple", description: "Revenue / average total assets" },
        { key: "Working capital / revenue", value: safePercent(bs.netWorkingCapital, financials.revenue), unit: "percent", description: "Net working capital / revenue" },
      ],
    },
    {
      key: "Break-even analysis",
      ratios: [
        { key: "Operating break-even revenue", value: financials.revenue > 0 && financials.grossProfit > 0 ? Math.round(((financials.operatingExpenses + financials.depreciationAndAmortisation) / (financials.grossProfit / financials.revenue)) * 100) / 100 : null, unit: "currency", description: "(Operating expenses + D&A) / gross margin" },
        { key: "Margin of safety", value: financials.revenue > 0 && financials.grossProfit > 0 ? safePercent(financials.revenue - ((financials.operatingExpenses + financials.depreciationAndAmortisation) / (financials.grossProfit / financials.revenue)), financials.revenue) : null, unit: "percent", description: "(Revenue − break-even revenue) / revenue" },
      ],
    },
    {
      key: "Profitability & cash",
      ratios: [
        { key: "Return on assets (ROA)", value: safePercent(financials.netIncome, averageAssets), unit: "percent", description: "Net income / average total assets" },
        { key: "Return on equity (ROE)", value: safePercent(financials.netIncome, averageEquity), unit: "percent", description: "Net income / average equity" },
        { key: "Free cash flow margin", value: safePercent(cf.freeCashFlow, financials.revenue), unit: "percent", description: "Free cash flow / revenue" },
        { key: "Operating cash flow / EBITDA", value: safePercent(cf.cashFromOperations, financials.ebitda), unit: "percent", description: "Operating cash flow / EBITDA" },
      ],
    },
  ];
}
