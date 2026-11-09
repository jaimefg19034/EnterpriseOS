"use client";

import { useMemo, useState } from "react";
import {
  calculateThreeStatements,
  DEFAULT_THREE_STATEMENT_ASSUMPTIONS,
  OPENING_BALANCE_SHEET,
  type ThreeStatementAssumptions,
} from "@/domain/three-statements";
import {
  formatCurrency,
  formatPercent,
  type FinancialResults,
} from "@/domain/financials";
import { translate, type Language } from "@/i18n/translations";

type StatementTab = "income" | "balance" | "cash";

const DRIVER_FIELDS: {
  key: keyof ThreeStatementAssumptions;
  label: string;
  hint: string;
  group: "workingCapital" | "funding";
  suffix: "days" | "currency";
  step: number;
}[] = [
  {
    key: "daysSalesOutstanding",
    label: "Days sales outstanding (DSO)",
    hint: "Average collection period",
    group: "workingCapital",
    suffix: "days",
    step: 1,
  },
  {
    key: "inventoryDays",
    label: "Inventory days (DIO)",
    hint: "Average time inventory is held",
    group: "workingCapital",
    suffix: "days",
    step: 1,
  },
  {
    key: "payableDays",
    label: "Payable days (DPO)",
    hint: "Average supplier payment period",
    group: "workingCapital",
    suffix: "days",
    step: 1,
  },
  {
    key: "capitalExpenditure",
    label: "Capital expenditure",
    hint: "Cash investment in fixed assets",
    group: "funding",
    suffix: "currency",
    step: 1_000,
  },
  {
    key: "debtRepayment",
    label: "Debt repayment",
    hint: "Principal repaid during the period",
    group: "funding",
    suffix: "currency",
    step: 1_000,
  },
  {
    key: "newBorrowings",
    label: "New borrowings",
    hint: "New debt raised during the period",
    group: "funding",
    suffix: "currency",
    step: 1_000,
  },
  {
    key: "dividends",
    label: "Dividends",
    hint: "Cash distributions to shareholders",
    group: "funding",
    suffix: "currency",
    step: 1_000,
  },
];

const STATEMENT_TABS: { id: StatementTab; label: string }[] = [
  { id: "income", label: "Income statement" },
  { id: "balance", label: "Balance sheet" },
  { id: "cash", label: "Cash flow statement" },
];

function money(value: number, language: Language): string {
  return new Intl.NumberFormat(language === "es" ? "es-ES" : "en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ratio(value: number, language: Language): string {
  return new Intl.NumberFormat(language === "es" ? "es-ES" : "en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function StatementRow({
  label,
  value,
  language,
  emphasis = false,
  subdued = false,
  negative = false,
}: {
  label: string;
  value: number;
  language: Language;
  emphasis?: boolean;
  subdued?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={[
        "three-statement-row",
        emphasis ? "emphasis" : "",
        subdued ? "subdued" : "",
        negative ? "negative" : "",
      ].filter(Boolean).join(" ")}
    >
      <span>{label}</span>
      <strong>{money(value, language)}</strong>
    </div>
  );
}

function OpeningClosingRow({
  label,
  opening,
  closing,
  language,
  emphasis = false,
}: {
  label: string;
  opening: number;
  closing: number;
  language: Language;
  emphasis?: boolean;
}) {
  return (
    <div className={`three-statement-row comparative ${emphasis ? "emphasis" : ""}`}>
      <span>{label}</span>
      <strong>{money(opening, language)}</strong>
      <strong>{money(closing, language)}</strong>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "violet" | "amber";
}) {
  return (
    <article className="three-statement-stat">
      <div className="three-statement-stat-head">
        <span>{label}</span>
        <i className={tone} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function ThreeStatementsWorkspace({
  financials,
  language,
}: {
  financials: FinancialResults;
  language: Language;
}) {
  const [assumptions, setAssumptions] = useState<ThreeStatementAssumptions>(
    DEFAULT_THREE_STATEMENT_ASSUMPTIONS,
  );
  const [activeTab, setActiveTab] = useState<StatementTab>("income");
  const t = (value: string) => translate(value, language);

  const model = useMemo(
    () => calculateThreeStatements(financials, assumptions),
    [financials, assumptions],
  );

  function updateAssumption(key: keyof ThreeStatementAssumptions, raw: string) {
    const value = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(value)) return;
    setAssumptions((current) => ({
      ...current,
      [key]: Math.min(
        key === "daysSalesOutstanding" || key === "inventoryDays" || key === "payableDays"
          ? 365
          : Number.MAX_SAFE_INTEGER,
        Math.max(0, value),
      ),
    }));
  }

  function resetAssumptions() {
    setAssumptions(DEFAULT_THREE_STATEMENT_ASSUMPTIONS);
  }

  function exportStatements() {
    const bs = model.balanceSheet;
    const cf = model.cashFlow;
    const pnl = model.incomeStatement;
    const rows = [
      ["EnterpriseOS — Integrated three-statement model"],
      ["Reporting period", "FY 2026 · Illustrative"],
      ["Currency", "EUR"],
      [],
      ["INCOME STATEMENT", "Amount (EUR)"],
      ["Revenue", pnl.revenue],
      ["Cost of goods sold", -pnl.costOfGoodsSold],
      ["Gross profit", pnl.grossProfit],
      ["Operating expenses", -pnl.operatingExpenses],
      ["EBITDA", pnl.ebitda],
      ["Depreciation & amortisation", -pnl.depreciationAndAmortisation],
      ["EBIT", pnl.ebit],
      ["Interest expense", -pnl.interestExpense],
      ["Profit before tax", pnl.profitBeforeTax],
      ["Income tax", -pnl.incomeTax],
      ["Net income", pnl.netIncome],
      [],
      ["BALANCE SHEET", "Opening (EUR)", "Closing (EUR)"],
      ["Cash", OPENING_BALANCE_SHEET.cash, bs.cash],
      ["Accounts receivable", OPENING_BALANCE_SHEET.accountsReceivable, bs.accountsReceivable],
      ["Inventory", OPENING_BALANCE_SHEET.inventory, bs.inventory],
      ["Net PP&E", OPENING_BALANCE_SHEET.netPropertyPlantAndEquipment, bs.netPropertyPlantAndEquipment],
      ["Total assets", bs.openingAssets, bs.totalAssets],
      ["Accounts payable", OPENING_BALANCE_SHEET.accountsPayable, bs.accountsPayable],
      ["Debt", OPENING_BALANCE_SHEET.debt, bs.debt],
      ["Bank overdraft", 0, bs.overdraft],
      ["Share capital", OPENING_BALANCE_SHEET.shareCapital, bs.shareCapital],
      ["Retained earnings", OPENING_BALANCE_SHEET.retainedEarnings, bs.retainedEarnings],
      ["Total liabilities and equity", bs.openingLiabilitiesAndEquity, bs.totalLiabilitiesAndEquity],
      ["Balance check", bs.openingBalanceDifference, bs.balanceDifference],
      [],
      ["CASH FLOW STATEMENT", "Amount (EUR)"],
      ["Net income", cf.netIncome],
      ["Depreciation & amortisation", cf.depreciationAndAmortisation],
      ["Change in accounts receivable", -cf.changeInAccountsReceivable],
      ["Change in inventory", -cf.changeInInventory],
      ["Change in accounts payable", cf.changeInAccountsPayable],
      ["Cash from operations", cf.cashFromOperations],
      ["Capital expenditure", cf.capitalExpenditure],
      ["Cash from investing", cf.cashFromInvesting],
      ["New borrowings", cf.debtDrawdown],
      ["Debt repayment", cf.debtRepayment],
      ["Dividends", cf.dividends],
      ["Cash from financing", cf.cashFromFinancing],
      ["Net change in cash", cf.netChangeInCash],
      ["Opening cash", cf.openingCash],
      ["Closing cash before overdraft", cf.closingCashBeforeOverdraft],
      ["Free cash flow", cf.freeCashFlow],
      [],
      ["MODEL DRIVERS", "Value"],
      ["Days sales outstanding", model.drivers.daysSalesOutstanding],
      ["Inventory days", model.drivers.inventoryDays],
      ["Payable days", model.drivers.payableDays],
      ["Capital expenditure", model.drivers.capitalExpenditure],
      ["Debt repayment applied", model.drivers.debtRepaymentApplied],
      ["New borrowings", model.drivers.newBorrowings],
      ["Dividends", model.drivers.dividends],
      [],
      ["Note", "Illustrative management model, not statutory accounts or financial advice."],
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = typeof cell === "number" ? cell.toFixed(2) : String(cell ?? "");
            return `"${value.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "enterpriseos-three-statement-model-fy2026.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const cf = model.cashFlow;
  const bs = model.balanceSheet;
  const pnl = model.incomeStatement;

  return (
    <div className="three-statements-workspace">
      <div className="page-heading three-statements-heading">
        <div>
          <div className="eyebrow">{t("INTEGRATED FINANCIAL MODEL")} <span className="eyebrow-dot" /> {t("FY 2026 · ILLUSTRATIVE")}</div>
          <h1>{t("Three financial statements")}</h1>
          <p>{t("One connected model: operating performance flows into cash generation, funding and the closing balance sheet.")}</p>
        </div>
        <div className="heading-actions">
          <span className="demo-badge"><i /> {t("ILLUSTRATIVE MODEL")}</span>
          <button className="secondary-button" onClick={resetAssumptions}>{t("Reset drivers")}</button>
          <button className="primary-button" onClick={exportStatements}>
            <span aria-hidden="true">↓</span> {t("Export model")}
          </button>
        </div>
      </div>

      <section className="three-statements-intro panel">
        <div className="three-statements-intro-copy">
          <span className="panel-kicker">{t("MODEL INTEGRITY")}</span>
          <h2>{model.balanceSheet.isBalanced ? t("Balance sheet reconciled") : t("Balance sheet needs attention")}</h2>
          <p>{t("Opening balances are a balanced demonstration baseline. Change P&L assumptions in Financial Model and these statements recalculate automatically.")}</p>
        </div>
        <div className={`three-statements-integrity ${model.balanceSheet.isBalanced ? "balanced" : "warning"}`}>
          <span className="integrity-indicator" />
          <strong>{model.balanceSheet.isBalanced ? t("BALANCED") : t("REVIEW REQUIRED")}</strong>
          <small>{t("Closing difference")} · {money(bs.balanceDifference, language)}</small>
        </div>
      </section>

      {model.warnings.length > 0 && (
        <div className="three-statements-warning" role="alert">
          <strong>{t("Model warnings")}</strong>
          {model.warnings.map((warning) => <p key={warning}>{t(warning)}</p>)}
        </div>
      )}

      <div className="three-statements-stats">
        <StatCard label={t("Operating cash flow")} value={money(cf.cashFromOperations, language)} detail={t("Cash generated by operations")} tone="blue" />
        <StatCard label={t("Free cash flow")} value={money(cf.freeCashFlow, language)} detail={t("Operating cash flow less CapEx")} tone="green" />
        <StatCard label={t("Closing cash") } value={money(cf.closingCash, language)} detail={t("Including opening cash and financing")} tone="violet" />
        <StatCard label={t("Net debt")} value={money(bs.netDebt, language)} detail={t("Debt plus overdraft less cash")} tone="amber" />
      </div>

      <div className="three-statements-workspace-grid">
        <section className="panel three-statements-drivers">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">{t("MODEL ASSUMPTIONS")}</div>
              <h2>{t("Working capital and funding")}</h2>
              <p>{t("Adjust the drivers; all three statements update together.")}</p>
            </div>
          </div>
          <div className="three-statement-driver-group">
            <div className="three-statement-group-title">{t("WORKING CAPITAL")}</div>
            {DRIVER_FIELDS.filter((field) => field.group === "workingCapital").map((field) => (
              <label className="three-statement-input-row" key={field.key}>
                <span><strong>{t(field.label)}</strong><small>{t(field.hint)}</small></span>
                <span className="three-statement-input">
                  <input
                    type="number"
                    min="0"
                    max={field.suffix === "days" ? 365 : undefined}
                    step={field.step}
                    value={assumptions[field.key]}
                    onChange={(event) => updateAssumption(field.key, event.target.value)}
                    aria-label={t(field.label)}
                  />
                  <small>{field.suffix === "days" ? t("days") : "EUR"}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="three-statement-driver-group">
            <div className="three-statement-group-title">{t("INVESTMENT & FINANCING")}</div>
            {DRIVER_FIELDS.filter((field) => field.group === "funding").map((field) => (
              <label className="three-statement-input-row" key={field.key}>
                <span><strong>{t(field.label)}</strong><small>{t(field.hint)}</small></span>
                <span className="three-statement-input">
                  <small>EUR</small>
                  <input
                    type="number"
                    min="0"
                    step={field.step}
                    value={assumptions[field.key]}
                    onChange={(event) => updateAssumption(field.key, event.target.value)}
                    aria-label={t(field.label)}
                  />
                </span>
              </label>
            ))}
          </div>
          <div className="three-statement-driver-note">
            <span aria-hidden="true">ⓘ</span>
            <p>{t("Debt repayments are capped at opening debt. Negative closing cash is shown as a bank overdraft liability. DSO, DIO and DPO are capped at 365 days.")}</p>
          </div>
        </section>

        <section className="panel three-statements-output">
          <div className="panel-header three-statements-output-header">
            <div>
              <div className="panel-kicker">{t("CONNECTED OUTPUT")}</div>
              <h2>{t("Financial statements")}</h2>
              <p>{t("FY 2026 · EUR · Opening and closing balances where relevant")}</p>
            </div>
            <span className="live-badge"><i /> {t("LIVE MODEL")}</span>
          </div>
          <div className="three-statement-tabs" role="tablist" aria-label={t("Financial statements")}>
            {STATEMENT_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>

          {activeTab === "income" && (
            <div className="three-statement-table" role="tabpanel">
              <div className="three-statement-section-title">{t("PROFIT & LOSS")}</div>
              <StatementRow label={t("Revenue")} value={pnl.revenue} language={language} />
              <StatementRow label={t("Cost of goods sold")} value={-pnl.costOfGoodsSold} language={language} subdued />
              <StatementRow label={t("Gross profit")} value={pnl.grossProfit} language={language} emphasis />
              <StatementRow label={t("Operating expenses")} value={-pnl.operatingExpenses} language={language} subdued />
              <StatementRow label={t("EBITDA")} value={pnl.ebitda} language={language} emphasis />
              <StatementRow label={t("Depreciation & amortisation")} value={-pnl.depreciationAndAmortisation} language={language} subdued />
              <StatementRow label={t("EBIT")} value={pnl.ebit} language={language} emphasis />
              <StatementRow label={t("Interest expense")} value={-pnl.interestExpense} language={language} subdued />
              <StatementRow label={t("Profit before tax")} value={pnl.profitBeforeTax} language={language} />
              <StatementRow label={t("Income tax")} value={-pnl.incomeTax} language={language} subdued />
              <StatementRow label={t("Net income")} value={pnl.netIncome} language={language} emphasis />
              <div className="three-statement-table-note">{t("Pulled directly from the existing Financial Model inputs. Expenses are displayed as negative values.")}</div>
            </div>
          )}

          {activeTab === "balance" && (
            <div className="three-statement-table comparative-table" role="tabpanel">
              <div className="three-statement-comparative-head">
                <span>{t("BALANCE SHEET")}</span><span>{t("OPENING")}</span><span>{t("CLOSING")}</span>
              </div>
              <div className="three-statement-section-title">{t("ASSETS")}</div>
              <OpeningClosingRow label={t("Cash")} opening={OPENING_BALANCE_SHEET.cash} closing={bs.cash} language={language} />
              <OpeningClosingRow label={t("Accounts receivable")} opening={OPENING_BALANCE_SHEET.accountsReceivable} closing={bs.accountsReceivable} language={language} />
              <OpeningClosingRow label={t("Inventory")} opening={OPENING_BALANCE_SHEET.inventory} closing={bs.inventory} language={language} />
              <OpeningClosingRow label={t("Total current assets")} opening={OPENING_BALANCE_SHEET.cash + OPENING_BALANCE_SHEET.accountsReceivable + OPENING_BALANCE_SHEET.inventory} closing={bs.currentAssets} language={language} emphasis />
              <OpeningClosingRow label={t("Net property, plant & equipment")} opening={OPENING_BALANCE_SHEET.netPropertyPlantAndEquipment} closing={bs.netPropertyPlantAndEquipment} language={language} />
              <OpeningClosingRow label={t("Total assets")} opening={bs.openingAssets} closing={bs.totalAssets} language={language} emphasis />
              <div className="three-statement-section-title">{t("LIABILITIES")}</div>
              <OpeningClosingRow label={t("Accounts payable")} opening={OPENING_BALANCE_SHEET.accountsPayable} closing={bs.accountsPayable} language={language} />
              <OpeningClosingRow label={t("Bank overdraft")} opening={0} closing={bs.overdraft} language={language} />
              <OpeningClosingRow label={t("Current liabilities")} opening={OPENING_BALANCE_SHEET.accountsPayable} closing={bs.currentLiabilities} language={language} emphasis />
              <OpeningClosingRow label={t("Debt")} opening={OPENING_BALANCE_SHEET.debt} closing={bs.debt} language={language} />
              <OpeningClosingRow label={t("Total liabilities")} opening={OPENING_BALANCE_SHEET.accountsPayable + OPENING_BALANCE_SHEET.debt} closing={bs.totalLiabilities} language={language} emphasis />
              <div className="three-statement-section-title">{t("EQUITY")}</div>
              <OpeningClosingRow label={t("Share capital")} opening={OPENING_BALANCE_SHEET.shareCapital} closing={bs.shareCapital} language={language} />
              <OpeningClosingRow label={t("Retained earnings")} opening={OPENING_BALANCE_SHEET.retainedEarnings} closing={bs.retainedEarnings} language={language} />
              <OpeningClosingRow label={t("Total equity")} opening={OPENING_BALANCE_SHEET.shareCapital + OPENING_BALANCE_SHEET.retainedEarnings} closing={bs.totalEquity} language={language} emphasis />
              <OpeningClosingRow label={t("Total liabilities and equity")} opening={bs.openingLiabilitiesAndEquity} closing={bs.totalLiabilitiesAndEquity} language={language} emphasis />
              <OpeningClosingRow label={t("Balance check difference")} opening={bs.openingBalanceDifference} closing={bs.balanceDifference} language={language} />
              <div className={`three-statement-table-note ${bs.isBalanced ? "success-note" : "warning-note"}`}>
                {bs.isBalanced ? t("Assets equal liabilities plus equity.") : t("The opening or closing balance sheet is out of balance. Review the assumptions.")}
              </div>
            </div>
          )}

          {activeTab === "cash" && (
            <div className="three-statement-table" role="tabpanel">
              <div className="three-statement-section-title">{t("CASH FLOWS FROM OPERATING ACTIVITIES")}</div>
              <StatementRow label={t("Net income")} value={cf.netIncome} language={language} />
              <StatementRow label={t("Depreciation & amortisation")} value={cf.depreciationAndAmortisation} language={language} />
              <StatementRow label={t("Increase in accounts receivable")} value={-cf.changeInAccountsReceivable} language={language} subdued />
              <StatementRow label={t("Increase in inventory")} value={-cf.changeInInventory} language={language} subdued />
              <StatementRow label={t("Increase in accounts payable")} value={cf.changeInAccountsPayable} language={language} subdued />
              <StatementRow label={t("Net cash from operating activities")} value={cf.cashFromOperations} language={language} emphasis />
              <div className="three-statement-section-title">{t("CASH FLOWS FROM INVESTING ACTIVITIES")}</div>
              <StatementRow label={t("Capital expenditure")} value={cf.capitalExpenditure} language={language} subdued />
              <StatementRow label={t("Net cash from investing activities")} value={cf.cashFromInvesting} language={language} emphasis />
              <div className="three-statement-section-title">{t("CASH FLOWS FROM FINANCING ACTIVITIES")}</div>
              <StatementRow label={t("New borrowings")} value={cf.debtDrawdown} language={language} />
              <StatementRow label={t("Debt repayment")} value={cf.debtRepayment} language={language} subdued />
              <StatementRow label={t("Dividends paid")} value={cf.dividends} language={language} subdued />
              <StatementRow label={t("Net cash from financing activities")} value={cf.cashFromFinancing} language={language} emphasis />
              <StatementRow label={t("Net change in cash")} value={cf.netChangeInCash} language={language} emphasis />
              <StatementRow label={t("Opening cash balance")} value={cf.openingCash} language={language} />
              <StatementRow label={t("Closing cash before overdraft")} value={cf.closingCashBeforeOverdraft} language={language} />
              <StatementRow label={t("Closing cash on balance sheet")} value={cf.closingCash} language={language} emphasis />
              <StatementRow label={t("Bank overdraft on balance sheet")} value={cf.overdraft} language={language} />
              <StatementRow label={t("Free cash flow") } value={cf.freeCashFlow} language={language} emphasis />
              <div className="three-statement-table-note">{t("Free cash flow is defined here as operating cash flow less capital expenditure, before financing.")}</div>
            </div>
          )}
        </section>
      </div>

      <div className="three-statements-method-note">
        <span aria-hidden="true">ⓘ</span>
        <p><strong>{t("Management-model limitation.")}</strong> {t("Closing working capital is derived from DSO, DIO and DPO. The opening balance sheet is illustrative. This model does not yet include lease accounting, fixed-asset disposals, FX, deferred tax, acquisitions, minority interests or statutory accounting adjustments.")}</p>
      </div>
    </div>
  );
}
