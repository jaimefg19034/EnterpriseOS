# EnterpriseOS — current feature inventory

**Reviewed:** 9 November 2026  
**Repository:** `jaimefg19034/EnterpriseOS`  
**Purpose:** baseline for the 18-month roadmap. This is a product inventory, not a claim that the app is production-ready.

## Current application map

| Main workspace | Current capabilities | Data / calculation boundary | Current maturity |
|---|---|---|---|
| Overview | Revenue, EBITDA, margins, net income, trend visualisation and quick navigation | Derived from the illustrative management P&L inputs | Demo dashboard |
| Financial model | Editable management P&L assumptions; gross profit, EBITDA, EBIT, pre-tax profit, tax and net income; Excel export | Pure calculation module; current inputs are session state | Useful model prototype; limited historical actuals |
| Budget & scenarios | Year-aware monthly revenue plan, actual revenue inputs, Base/Upside/Downside/Custom cases, per-year assumptions and scenario settings, profitability projection, budget-vs-actual and run-rate indicators, Excel export | Pure planning calculations; migrated multi-year planning state in browser localStorage | Developed prototype; browser-local only |
| Three statements | P&L, balance sheet and indirect cash flow; working-capital assumptions; financial ratios; balance check; Excel export | Pure three-statement and analysis modules; opening balance sheet is illustrative | Integrated model prototype, not a ledger |
| Cash forecast | Quarterly cash view with weekly internal schedule, invoice-linked receipts/payments, manual movements kept separate, downside liquidity stress test and Excel export | Browser-local storage plus pure invoice allocation and forecast functions | Useful planning tool; not bank-reconciled |
| Working capital | Receivables/payables invoice register, due dates, outstanding balances, ageing, dated partial-payment ledger, CSV import, payment-history Excel export and backup integration | Browser-local storage; validated invoice and payment records; historic aggregate paid balances remain undated | Local single-browser register; no bank reconciliation or automatic payment matching |
| Operations | Sales pipeline, projects, risks, KPIs, cost-centre budgets with editable unitemized baselines, period-matched expense register, baseline-aware run-rate and management reporting | Domain calculations and validated operations state in localStorage | Broad prototype; no shared company database; baseline/expense overlap depends on user-entered unitemized semantics |
| Reports & exports | Structured Excel outputs for financial model, planning, three statements, cash forecast and working capital; summary sheets, reconciled totals, sortable date cells and distinct currency/percentage/percentage-point formats; operational CSV export | Exported values from current client-side state | Reporting prototype; no audit-grade reporting pack or versioned close snapshot |

## Data persistence matrix

| Data area | Current behaviour | Important limitation |
|---|---|---|
| Language preference | Browser localStorage | Device/browser-specific |
| Main P&L assumptions | React session state | Reload returns to demo defaults |
| Three-statement assumptions | React component state | Not a durable company record |
| Planning inputs, monthly actuals and per-year scenario settings | Browser localStorage; legacy FY2026 state migrates to the multi-year format | Not synced to a company database; user must retain local/browser backups |
| Operations records | Browser localStorage | Single browser profile; no user/tenant isolation |
| Invoices, dated payment movements and cash forecast | Browser localStorage | Historic paid balances imported as aggregates have no transaction dates; no bank or accounting reconciliation |
| Finance backup | Downloadable local backup with validation and restore | User must store the file safely; no managed backup service |
| Exports | Generated in the browser | Values are snapshots, not a live linked ledger |

## What is already valuable

- The main workspaces cover a coherent set of SME finance and operating tasks.
- Financial calculation logic is separated into domain modules and has unit tests.
- The P&L, three statements, working capital and cash forecast are connected through explicit calculation functions.
- Planning, operations and invoice/cash data have validation and local backup/restore support; invoice payment movements survive backup/restore and are separately exported to Excel.
- Expense records must fall inside the reporting period of their linked cost centre. Unitemized baseline spend is added once to those dated expenses; the user must not enter the same cost in both places.
- Run-rate projections carry the baseline as fixed known spend and extrapolate only dated expenses. Aggregate budget/actual totals are hidden when the filter combines full-year and quarterly periods.
- Excel exports are structured and styled rather than raw data dumps; the reviewed workbooks include on-screen summary metrics, period totals, real date cells and bilingual labels.
- English and Spanish are supported.
- Lint, typecheck, unit tests and production build run in GitHub Actions before release.

## Material gaps before real-company use

### Critical — data trust and persistence
- No authentication, company workspaces, server database or tenant isolation.
- Local browser storage is not a secure or shared system of record.
- Main P&L and three-statement assumptions do not yet persist as durable, versioned company data.
- No general ledger, journal entries, bank reconciliation or controlled accounting close.
- No server-side audit log or immutable history of who changed what.

### High — finance workflow completeness
- The P&L is a simplified management model, not a statutory accounting engine.
- Historical cost and expense actuals are incomplete relative to the revenue actuals workflow. The manual unitemized baseline has no source-level detail, so the app cannot automatically detect whether a user has also entered the same transaction in the expense register.
- The opening balance sheet is an illustrative baseline.
- Forecast outputs and actuals need consistent period definitions, provenance and labels across every screen. Operations uses shared month/quarter/FY date boundaries. Budget & Scenarios now supports multiple fiscal years and migrates the legacy FY2026 state, but remains browser-local and needs deeper reconciliation, period-close and backup/restore testing before real-company use.
- Excel import, source mapping and reconciliation need a deliberate design before supporting real customer files.

### High — product and operating readiness
- Target customer and strongest recurring use case still need validation with real finance users.
- No onboarding, support workflow, monitoring/alerting or incident runbook.
- No accessibility review or systematic device/browser test matrix recorded yet.
- No pricing, service terms, privacy documentation or customer support commitments.

## Release truth

Until the data architecture and security gates are completed, EnterpriseOS must be described as a prototype/demo workspace. Users must not enter confidential company data or rely on its outputs as statutory accounts, audited reporting, tax filings or reconciled cash positions.

A feature moves from prototype to pilot-ready only when its source data, formula definitions, validation, permissions, auditability, backup/recovery and failure states are all explicit and tested.
