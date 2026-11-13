import type { FinancialResults } from "./financials";

export type ThreeStatementAssumptions = {
  daysSalesOutstanding: number;
  inventoryDays: number;
  payableDays: number;
  capitalExpenditure: number;
  debtRepayment: number;
  newBorrowings: number;
  dividends: number;
};

export const DEFAULT_THREE_STATEMENT_ASSUMPTIONS: ThreeStatementAssumptions = {
  daysSalesOutstanding: 45,
  inventoryDays: 60,
  payableDays: 45,
  capitalExpenditure: 18_000,
  debtRepayment: 10_000,
  newBorrowings: 0,
  dividends: 0,
};

export const OPENING_BALANCE_SHEET = {
  cash: 50_000,
  accountsReceivable: 40_000,
  inventory: 25_000,
  netPropertyPlantAndEquipment: 120_000,
  accountsPayable: 30_000,
  debt: 80_000,
  shareCapital: 50_000,
  retainedEarnings: 75_000,
} as const;

export type ThreeStatementResults = {
  incomeStatement: {
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    operatingExpenses: number;
    ebitda: number;
    depreciationAndAmortisation: number;
    ebit: number;
    interestExpense: number;
    profitBeforeTax: number;
    incomeTax: number;
    netIncome: number;
  };
  cashFlow: {
    netIncome: number;
    depreciationAndAmortisation: number;
    changeInAccountsReceivable: number;
    changeInInventory: number;
    changeInAccountsPayable: number;
    cashFromOperations: number;
    capitalExpenditure: number;
    cashFromInvesting: number;
    debtDrawdown: number;
    debtRepayment: number;
    dividends: number;
    cashFromFinancing: number;
    netChangeInCash: number;
    openingCash: number;
    closingCashBeforeOverdraft: number;
    closingCash: number;
    overdraft: number;
    freeCashFlow: number;
  };
  balanceSheet: {
    openingAssets: number;
    openingLiabilitiesAndEquity: number;
    openingBalanceDifference: number;
    cash: number;
    accountsReceivable: number;
    inventory: number;
    currentAssets: number;
    netPropertyPlantAndEquipment: number;
    totalAssets: number;
    accountsPayable: number;
    debt: number;
    overdraft: number;
    currentLiabilities: number;
    totalLiabilities: number;
    shareCapital: number;
    retainedEarnings: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
    balanceDifference: number;
    isBalanced: boolean;
    netWorkingCapital: number;
    netDebt: number;
    currentRatio: number | null;
  };
  drivers: {
    daysSalesOutstanding: number;
    inventoryDays: number;
    payableDays: number;
    debtRepaymentApplied: number;
    capitalExpenditure: number;
    newBorrowings: number;
    dividends: number;
  };
  warnings: string[];
};

const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const nonNegative = (value: number) =>
  Math.max(0, Number.isFinite(value) ? value : 0);

const days = (value: number) => Math.min(365, nonNegative(value));

/**
 * Builds a linked three-statement management model.
 *
 * The opening balances are an illustrative, internally balanced demo balance
 * sheet. Cash flow movements roll forward cash, PP&E, debt and retained
 * earnings; working-capital days derive closing receivables, inventory and
 * payables from the period's P&L. This is a planning model, not statutory
 * accounting software.
 */
export function calculateThreeStatements(
  financials: FinancialResults,
  assumptions: ThreeStatementAssumptions,
): ThreeStatementResults {
  const dso = days(assumptions.daysSalesOutstanding);
  const inventoryDays = days(assumptions.inventoryDays);
  const payableDays = days(assumptions.payableDays);
  const capex = nonNegative(assumptions.capitalExpenditure);
  const debtRepayment = Math.min(
    OPENING_BALANCE_SHEET.debt,
    nonNegative(assumptions.debtRepayment),
  );
  const newBorrowings = nonNegative(assumptions.newBorrowings);
  const dividends = nonNegative(assumptions.dividends);

  const closingReceivables = roundCurrency((financials.revenue / 365) * dso);
  const closingInventory = roundCurrency(
    (financials.costOfGoodsSold / 365) * inventoryDays,
  );
  const closingPayables = roundCurrency(
    (financials.costOfGoodsSold / 365) * payableDays,
  );

  const changeInAccountsReceivable = roundCurrency(
    closingReceivables - OPENING_BALANCE_SHEET.accountsReceivable,
  );
  const changeInInventory = roundCurrency(
    closingInventory - OPENING_BALANCE_SHEET.inventory,
  );
  const changeInAccountsPayable = roundCurrency(
    closingPayables - OPENING_BALANCE_SHEET.accountsPayable,
  );

  const cashFromOperations = roundCurrency(
    financials.netIncome +
      financials.depreciationAndAmortisation -
      changeInAccountsReceivable -
      changeInInventory +
      changeInAccountsPayable,
  );
  const cashFromInvesting = roundCurrency(-capex);
  const cashFromFinancing = roundCurrency(
    newBorrowings - debtRepayment - dividends,
  );
  const netChangeInCash = roundCurrency(
    cashFromOperations + cashFromInvesting + cashFromFinancing,
  );
  const closingCashBeforeOverdraft = roundCurrency(
    OPENING_BALANCE_SHEET.cash + netChangeInCash,
  );
  const closingCash = Math.max(0, closingCashBeforeOverdraft);
  const overdraft = roundCurrency(Math.max(0, -closingCashBeforeOverdraft));

  const closingPpe = roundCurrency(
    OPENING_BALANCE_SHEET.netPropertyPlantAndEquipment +
      capex -
      financials.depreciationAndAmortisation,
  );
  const closingDebt = roundCurrency(
    OPENING_BALANCE_SHEET.debt - debtRepayment + newBorrowings,
  );
  const closingRetainedEarnings = roundCurrency(
    OPENING_BALANCE_SHEET.retainedEarnings +
      financials.netIncome -
      dividends,
  );

  const currentAssets = roundCurrency(
    closingCash + closingReceivables + closingInventory,
  );
  const totalAssets = roundCurrency(currentAssets + closingPpe);
  const currentLiabilities = roundCurrency(closingPayables + overdraft);
  const totalLiabilities = roundCurrency(currentLiabilities + closingDebt);
  const totalEquity = roundCurrency(
    OPENING_BALANCE_SHEET.shareCapital + closingRetainedEarnings,
  );
  const totalLiabilitiesAndEquity = roundCurrency(
    totalLiabilities + totalEquity,
  );
  const openingAssets = roundCurrency(
    OPENING_BALANCE_SHEET.cash +
      OPENING_BALANCE_SHEET.accountsReceivable +
      OPENING_BALANCE_SHEET.inventory +
      OPENING_BALANCE_SHEET.netPropertyPlantAndEquipment,
  );
  const openingLiabilitiesAndEquity = roundCurrency(
    OPENING_BALANCE_SHEET.accountsPayable +
      OPENING_BALANCE_SHEET.debt +
      OPENING_BALANCE_SHEET.shareCapital +
      OPENING_BALANCE_SHEET.retainedEarnings,
  );
  const balanceDifference = roundCurrency(
    totalAssets - totalLiabilitiesAndEquity,
  );
  const openingBalanceDifference = roundCurrency(
    openingAssets - openingLiabilitiesAndEquity,
  );
  const netWorkingCapital = roundCurrency(
    closingReceivables + closingInventory - closingPayables,
  );
  const netDebt = roundCurrency(closingDebt + overdraft - closingCash);

  const warnings: string[] = [];
  if (Math.abs(openingBalanceDifference) > 0.01) {
    warnings.push("The opening balance sheet does not balance.");
  }
  if (Math.abs(balanceDifference) > 0.01) {
    warnings.push("The closing balance sheet does not balance. Review the model assumptions.");
  }
  if (closingPpe < 0) {
    warnings.push("Depreciation exceeds opening net PP&E plus capital expenditure.");
  }
  if (overdraft > 0) {
    warnings.push("Closing cash is negative and has been presented as a bank overdraft liability.");
  }

  return {
    incomeStatement: {
      revenue: financials.revenue,
      costOfGoodsSold: financials.costOfGoodsSold,
      grossProfit: financials.grossProfit,
      operatingExpenses: financials.operatingExpenses,
      ebitda: financials.ebitda,
      depreciationAndAmortisation: financials.depreciationAndAmortisation,
      ebit: financials.ebit,
      interestExpense: financials.interestExpense,
      profitBeforeTax: financials.profitBeforeTax,
      incomeTax: financials.incomeTax,
      netIncome: financials.netIncome,
    },
    cashFlow: {
      netIncome: financials.netIncome,
      depreciationAndAmortisation: financials.depreciationAndAmortisation,
      changeInAccountsReceivable,
      changeInInventory,
      changeInAccountsPayable,
      cashFromOperations,
      capitalExpenditure: -capex,
      cashFromInvesting,
      debtDrawdown: newBorrowings,
      debtRepayment: -debtRepayment,
      dividends: -dividends,
      cashFromFinancing,
      netChangeInCash,
      openingCash: OPENING_BALANCE_SHEET.cash,
      closingCashBeforeOverdraft,
      closingCash,
      overdraft,
      freeCashFlow: roundCurrency(cashFromOperations + cashFromInvesting),
    },
    balanceSheet: {
      openingAssets,
      openingLiabilitiesAndEquity,
      openingBalanceDifference,
      cash: closingCash,
      accountsReceivable: closingReceivables,
      inventory: closingInventory,
      currentAssets,
      netPropertyPlantAndEquipment: closingPpe,
      totalAssets,
      accountsPayable: closingPayables,
      debt: closingDebt,
      overdraft,
      currentLiabilities,
      totalLiabilities,
      shareCapital: OPENING_BALANCE_SHEET.shareCapital,
      retainedEarnings: closingRetainedEarnings,
      totalEquity,
      totalLiabilitiesAndEquity,
      balanceDifference,
      isBalanced:
        Math.abs(openingBalanceDifference) <= 0.01 &&
        Math.abs(balanceDifference) <= 0.01,
      netWorkingCapital,
      netDebt,
      currentRatio:
        currentLiabilities > 0
          ? roundCurrency(currentAssets / currentLiabilities)
          : null,
    },
    drivers: {
      daysSalesOutstanding: dso,
      inventoryDays,
      payableDays,
      debtRepaymentApplied: debtRepayment,
      capitalExpenditure: capex,
      newBorrowings,
      dividends,
    },
    warnings,
  };
}
