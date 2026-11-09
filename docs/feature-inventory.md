# EnterpriseOS — current feature inventory

**Reviewed:** 9 November 2026  
**Repository:** `jaimefg19034/EnterpriseOS`  
**Purpose:** baseline for the 18-month roadmap. This is a product inventory, not a claim that the app is production-ready.

## Current application map

| Main workspace | Current capabilities | Data / calculation boundary | Current maturity |
|---|---|---|---|
| Overview | Revenue, EBITDA, margins, net income, trend visualisation and quick navigation | Derived from the illustrative management P&L inputs | Demo dashboard |
| Financial model | Editable management P&L assumptions; gross profit, EBITDA, EBIT, pre-tax profit, tax and net income; Excel export | Pure calculation module; current inputs are session state | Useful model prototype; limited historical actuals |
| Budget & scenarios | Monthly revenue plan, actual revenue inputs, Base/Upside/Downside cases, profitability projection, budget-vs-actual and run-rate indicators | Pure planning calculations; saved planning state in localStorage | Developed prototype |
| Three statements | P&L, balance sheet and indirect cash flow; working-capital assumptions; financial ratios; balance check; Excel export | Pure three-statement and analysis modules; opening balance sheet is illustrative | Integrated model prototype, not a ledger |
| Cash forecast | Quarterly cash view with weekly internal schedule, invoice-linked receipts/payments, manual movements kept separate, downside liquidity stress test and Excel export | Browser-local storage plus pure invoice allocation and forecast functions | Useful planning tool; not bank-reconciled |
| Working capital | Receivables/payables invoice register, due dates, outstanding balances, ageing, CSV import and backup integration | Browser-local storage; validated invoice records | Local single-browser register |
| Operations | Sales pipeline, projects, risks, KPIs, cost-centre budgets, expense register, budget pressure/run-rate and management reporting | Domain calculations and operations state in localStorage | Broad prototype; no shared company database |
| Reports & exports | Structured Excel outputs for financial model, planning and three statements; operational CSV export | Exported values from current client-side state | Reporting prototype; no audit-grade reporting pack |

## Data persistence matrix

| Data area | Current behaviour | Important limitation |
|---|---|---|
| Language preference | Browser localStorage | Device/browser-specific |
| Main P&L assumptions | React session state | Reload returns to demo defaults |
| Three-statement assumptions | React component state | Not a durable company record |
| Planning inputs and monthly actuals | Browser localStorage | Not synced or backed up automatically |
| Operations records | Browser localStorage | Single browser profile; no user/tenant isolation |
| Invoices and cash forecast | Browser localStorage | No bank or accounting reconciliation |
| Finance backup | Downloadable local backup with validation and restore | User must store the file safely; no managed backup service |
| Exports | Generated in the browser | Values are snapshots, not a live linked ledger |

## What is already valuable

- The main workspaces cover a coherent set of SME finance and operating tasks.
- Financial calculation logic is separated into domain modules and has unit tests.
- The P&L, three statements, working capital and cash forecast are connected through explicit calculation functions.
- Planning, operations and invoice/cash data have validation and local backup/restore support.
- Excel exports are structured and styled rather than raw data dumps.
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
- Historical cost and expense actuals are incomplete relative to the revenue actuals workflow.
- The opening balance sheet is an illustrative baseline.
- Forecast outputs and actuals need consistent period definitions, provenance and labels across every screen.
- Excel import, source mapping and reconciliation need a deliberate design before supporting real customer files.

### High — product and operating readiness
- Target customer and strongest recurring use case still need validation with real finance users.
- No onboarding, support workflow, monitoring/alerting or incident runbook.
- No accessibility review or systematic device/browser test matrix recorded yet.
- No pricing, service terms, privacy documentation or customer support commitments.

## Release truth

Until the data architecture and security gates are completed, EnterpriseOS must be described as a prototype/demo workspace. Users must not enter confidential company data or rely on its outputs as statutory accounts, audited reporting, tax filings or reconciled cash positions.

A feature moves from prototype to pilot-ready only when its source data, formula definitions, validation, permissions, auditability, backup/recovery and failure states are all explicit and tested.
