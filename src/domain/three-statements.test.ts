import { describe, expect, it } from "vitest";
import { calculateFinancials, type FinancialInputs } from "./financials";
import {
  calculateThreeStatements,
  DEFAULT_THREE_STATEMENT_ASSUMPTIONS,
} from "./three-statements";

const incomeStatementInputs: FinancialInputs = {
  revenue: 248_000,
  costOfGoodsSold: 96_300,
  operatingExpenses: 88_400,
  depreciationAndAmortisation: 12_500,
  interestExpense: 4_200,
  taxRatePercent: 25,
};

describe("calculateThreeStatements", () => {
  it("links profit, cash flow and the balance sheet", () => {
    const pnl = calculateFinancials(incomeStatementInputs);
    const result = calculateThreeStatements(
      pnl,
      DEFAULT_THREE_STATEMENT_ASSUMPTIONS,
    );

    expect(result.incomeStatement.netIncome).toBe(34_950);
    expect(result.cashFlow.cashFromOperations).toBeGreaterThan(pnl.netIncome);
    expect(result.cashFlow.freeCashFlow).toBe(
      result.cashFlow.cashFromOperations - 18_000,
    );
    expect(result.balanceSheet.isBalanced).toBe(true);
    expect(result.balanceSheet.balanceDifference).toBe(0);
    expect(result.balanceSheet.netDebt).toBeCloseTo(
      result.balanceSheet.debt - result.balanceSheet.cash,
      2,
    );
  });

  it("rolls retained earnings forward by net income less dividends", () => {
    const pnl = calculateFinancials(incomeStatementInputs);
    const result = calculateThreeStatements(pnl, {
      ...DEFAULT_THREE_STATEMENT_ASSUMPTIONS,
      dividends: 5_000,
    });

    expect(result.balanceSheet.retainedEarnings).toBe(104_950);
    expect(result.balanceSheet.isBalanced).toBe(true);
    expect(result.cashFlow.dividends).toBe(-5_000);
  });

  it("limits debt repayments to opening debt and reports the applied amount", () => {
    const pnl = calculateFinancials(incomeStatementInputs);
    const result = calculateThreeStatements(pnl, {
      ...DEFAULT_THREE_STATEMENT_ASSUMPTIONS,
      debtRepayment: 500_000,
    });

    expect(result.drivers.debtRepaymentApplied).toBe(80_000);
    expect(result.balanceSheet.debt).toBe(0);
    expect(result.balanceSheet.isBalanced).toBe(true);
  });

  it("classifies negative closing cash as an overdraft liability", () => {
    const pnl = calculateFinancials({
      ...incomeStatementInputs,
      revenue: 10_000,
      costOfGoodsSold: 5_000,
      operatingExpenses: 20_000,
      depreciationAndAmortisation: 1_000,
    });
    const result = calculateThreeStatements(pnl, {
      ...DEFAULT_THREE_STATEMENT_ASSUMPTIONS,
      capitalExpenditure: 150_000,
    });

    expect(result.cashFlow.closingCash).toBe(0);
    expect(result.balanceSheet.overdraft).toBeGreaterThan(0);
    expect(result.warnings).toContain(
      "Closing cash is negative and has been presented as a bank overdraft liability.",
    );
    expect(result.balanceSheet.isBalanced).toBe(true);
  });

  it("normalises invalid and negative driver assumptions", () => {
    const pnl = calculateFinancials(incomeStatementInputs);
    const result = calculateThreeStatements(pnl, {
      daysSalesOutstanding: Number.NaN,
      inventoryDays: -40,
      payableDays: 900,
      capitalExpenditure: -1,
      debtRepayment: -5,
      newBorrowings: Number.POSITIVE_INFINITY,
      dividends: -8,
    });

    expect(result.drivers.daysSalesOutstanding).toBe(0);
    expect(result.drivers.inventoryDays).toBe(0);
    expect(result.drivers.payableDays).toBe(365);
    expect(result.drivers.capitalExpenditure).toBe(0);
    expect(result.drivers.newBorrowings).toBe(0);
    expect(result.balanceSheet.isBalanced).toBe(true);
  });
});
