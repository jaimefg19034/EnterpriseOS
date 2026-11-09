# EnterpriseOS — technical architecture

**Status:** MVP foundation, November 2026  
**Architecture decision:** modular monolith; browser-only demo data for the first iteration.

## 1. Product and technical scope

The first customer hypothesis is an SME finance lead or owner who repeatedly assembles a management profit-and-loss statement from spreadsheets.

The MVP proves two connected finance workflows:

1. Enter six operating assumptions and calculate a management P&L.
2. Compare monthly revenue actuals with a seasonally allocated annual budget.
3. Stress-test the remaining forecast months using base, upside and downside scenarios.
4. Review a modelled full-year profitability projection and export the plan as CSV.
5. Link the management P&L to a cash flow statement and balance sheet, with explicit working-capital and financing drivers.
6. Maintain an invoice register for receivables and payables, including paid-to-date amounts, outstanding balances, ageing and individual dated payment movements.
7. Project invoice cash movements into a quarterly direct-method forecast by due date, with an explicit opt-in and separate manual inputs.

The app is deliberately not a general-purpose spreadsheet. No customer financial data is persisted in this first iteration.

### Launch-critical

- Responsive workspace shell and clear navigation.
- Typed financial input model.
- Pure, independently testable calculation functions.
- Live management P&L and margin calculations.
- Monthly revenue budget vs editable revenue actuals.
- Scenario-adjusted revenue forecast for remaining months.
- Full-year modelled EBITDA, EBIT and net income.
- CSV export with values and formula descriptions.
- Integrated P&L, indirect cash flow and closing balance sheet.
- DSO/DIO/DPO working-capital drivers and capital allocation assumptions.
- Receivables/payables register with ageing and due-date based quarterly cash projections.
- User-controlled invoice integration with a manual-vs-linked cash movement audit trail.
- Opening/closing balance sheet reconciliation and overdraft classification.
- English/Spanish interface with remembered local language preference.
- Clear demo-data and non-statutory-accounting disclosures.
- Automated type, lint and production-build checks before each release.

### Later, only after customer validation

- Authentication and company workspaces.
- Persistent models, version history and audit events.
- Excel import and export with formula/value validation.
- Monthly and quarterly periods beyond the initial FY 2026 revenue plan.
- Accounting integrations and controlled data ingestion.
- Team permissions and approval workflows.
- AI-assisted explanations and model creation.

## 2. Technology choices

| Layer | Choice | Reason |
|---|---|---|
| Web application | Next.js App Router + React | Mature React ecosystem, server/client component boundary, straightforward deployment |
| Language | TypeScript strict mode | Reduce errors in financial input and output contracts |
| Styling | Custom CSS | Consistent, differentiated enterprise design without UI-framework lock-in |
| Domain logic | Pure TypeScript module | Calculation logic remains independent from React and can be unit-tested |
| Hosting | Vercel or another Node-compatible host | Simple preview deployments and low operational burden |
| Future data/auth | Supabase Postgres + Auth | Managed Postgres and authentication; introduce only when persistence is needed |

Avoid microservices, queues and a general formula engine at the MVP stage. They add operational cost before there is evidence of a need.

## 3. Current data flow

```text
User edits an input
      |
      v
React component state (demo model inputs; reset on reload)
      |
      v
calculateFinancials() / buildPlanningResult() / calculateThreeStatements() — pure domain functions
      |
      +----> KPI cards / chart summaries
      |
      +----> Management P&L rows
      |
      +----> Excel workbook export

Budget & scenarios:

User edits assumptions / monthly revenue actuals / scenario
      |
      v
React component state plus browser-local persistence for saved planning inputs and actuals
      |
      v
buildPlanningResult() — pure domain function
      |
      +----> monthly budget vs actual / forecast
      +----> annual profitability projection
      +----> Excel workbook export
```

The calculation modules validate and clamp selected invalid/negative assumptions; management P&L monetary inputs are capped at JavaScript's safe-integer maximum, matching the UI input boundary, while percentage/day drivers are capped to documented ranges. Operations expense records are validated against the reporting period of their linked cost centre. Cost-centre `actualSpend` is an unitemized manual baseline that must exclude individually recorded expenses; actual spend is baseline plus dated expenses in the selected period. The baseline is editable and carried as fixed known spend in run-rate projections, while only dated expenses are extrapolated. When the period filter combines FY and quarterly records, comparable aggregate totals are intentionally not displayed. The three-statement model keeps the opening demonstration balance sheet balanced, rolls retained earnings by net income less dividends, rolls net PP&E by CapEx less D&A, and classifies negative closing cash as an overdraft liability. The model calculation modules do not call third-party APIs. Planning inputs/actuals, operations records, the invoice register and the quarterly cash worksheet use browser localStorage only; the core P&L and three-statement assumptions are currently session state. There is no server-side database, authentication, multi-user sync or company-level data isolation. The working-capital workspace stores individual payment movements (ID, date, amount and optional note) alongside the invoice's paid-to-date aggregate. Legacy/imported paid balances remain undated rather than receiving invented transaction dates. A new payment increases the paid aggregate and reduces the outstanding invoice balance; the cash forecast allocates only that remaining balance by due date, never replaying historical payment movements as future cash flows. Invoice backups preserve dated movements, and the invoice Excel export includes a separate movement sheet with undated legacy balances explicitly labelled. The workspace emits a same-tab update event after saving; the cash forecast reloads the invoice register and calls the pure invoice-allocation function to build a 13-week preview. Invoice balances are grouped by due-date week; amounts already overdue as of the current date are placed in Week 1. The forecast applies these amounts only when the user enables the invoice-inclusion toggle. Manual inputs are never overwritten, and the export includes a separate invoice cash schedule for auditability.

## 4. Financial calculation contract

Expenses are entered as positive amounts. D&A is excluded from operating expenses and deducted below EBITDA.

- Gross profit = Revenue − Cost of goods sold
- EBITDA = Gross profit − Operating expenses
- EBIT = EBITDA − D&A
- Profit before tax = EBIT − interest expense
- Income tax = max(0, profit before tax × tax rate)
- Net income = profit before tax − income tax
- Each margin = corresponding profit / revenue

Three-statement links:
- Closing receivables = revenue / 365 × DSO.
- Closing inventory = COGS / 365 × DIO.
- Closing payables = COGS / 365 × DPO.
- Cash from operations = net income + D&A − Δreceivables − Δinventory + Δpayables.
- Cash from investing = −CapEx.
- Cash from financing = new borrowings − debt repayment − dividends.
- Closing cash = opening cash + net cash movement; negative cash is presented as an overdraft liability.
- Closing net PP&E = opening net PP&E + CapEx − D&A.
- Closing retained earnings = opening retained earnings + net income − dividends.

This is a simplified management model. Real accounting policies, lease treatment, exceptional items, capitalisation, tax losses, deferred tax and jurisdiction-specific rules require further modelling and professional review.

## 5. Security from day one

Current MVP:
- Use illustrative sample data only.
- No secrets, API keys or customer financial records in Git.
- No browser-side privileged credentials.
- No company database or multi-tenant sharing; browser-local records are not backed up or synced.

Before a customer pilot:
1. Add server-side authentication using a maintained SSR integration and cookie-based sessions.
2. Store company/workspace membership and every business record with an explicit tenant identifier.
3. Enforce tenant isolation in Postgres with Row Level Security; test cross-tenant access as a release blocker.
4. Validate all server inputs with schemas and enforce ownership on every read/write.
5. Keep service-role credentials server-only; use environment variables and deployment secret storage.
6. Add audit events for imports, edits, exports and membership changes.
7. Define backup, retention, deletion and incident-response procedures.
8. Review GDPR roles, data-processing terms and EU hosting needs before handling real EU customer data.

Supabase's current Next.js SSR guidance uses cookie-backed sessions and separate browser/server clients. Follow the current official guide when auth is implemented rather than copying an outdated middleware recipe.

## 6. Roadmap

### Phase 0 — foundation (current)
- Repository, Next.js, TypeScript and domain calculation layer.
- First responsive workspace and demo P&L.
- CSV export and visible limitations.

### Phase 1 — correctness and usability (in progress)
- Integrated management P&L, indirect cash flow and closing balance sheet with balance reconciliation.
- Working-capital cycle and capital allocation assumptions (DSO, DIO, DPO, CapEx, debt, dividends).
- English and Spanish UI and localized financial statement export.
- Unit tests cover management P&L, monthly budget allocation, scenarios, zero revenue and invalid assumptions.
- Add deeper model input validation and number formatting tests.
- Add accessible labels, keyboard flows and mobile QA.
- Verify build and deployment with CI.

### Phase 2 — customer discovery
- Observe finance leads completing their current monthly reporting workflow.
- Identify a narrow recurring pain and willingness to pay.
- Only then select the next model (budget vs actual, cash runway or 3-statement forecast).

### Phase 3 — secure pilot
- Add authentication, tenant model, Postgres persistence and RLS.
- Add model versions and audit events.
- Onboard a small number of design partners with explicit consent and data-processing controls.

### Phase 4 — paid product
- Add Excel import/export only for formats required by pilot customers.
- Add billing, support, monitoring and recovery procedures.
- Expand integrations based on actual usage.

## 7. Primary technical risk and mitigation

**Risk:** users may mistake scenario-driven profitability outputs for booked actual results. In this release, monthly revenue actuals are editable, but historical COGS and operating expenses are not supplied as actuals; annual profitability remains a modelled estimate.

**Mitigation:** label historical revenue separately from forecast and modelled profitability, disclose the cost assumptions on screen and in exports, show scenario definitions, add automated calculation tests, and have an accountant/finance professional review model semantics before a paid production pilot.

The hardest future technical task is reliable spreadsheet ingestion and formula compatibility. Do not build a formula engine prematurely. Start with structured templates and validated CSV/XLSX import for one customer workflow.
