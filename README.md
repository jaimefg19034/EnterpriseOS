# EnterpriseOS

**An integrated financial workspace for growing businesses.**

EnterpriseOS is a focused financial modelling and business-analysis workspace. It is designed to complement existing accounting and spreadsheet tools—not to replace every spreadsheet workflow.

## Product direction

Our first customer hypothesis is finance teams and owner-operators at small and medium-sized businesses who repeatedly prepare management accounts, budgets and performance reviews in spreadsheets.

### MVP: one workflow, done well

The first release focuses on a dependable management P&L model and a lightweight budget/scenario workflow:

- Edit the key operating assumptions in a guided form.
- Recalculate gross profit, EBITDA, EBIT, pre-tax profit and net income immediately.
- See the key performance indicators and a monthly trend.
- Export a clean CSV for use in existing workflows.
- Work with clearly labelled sample data until secure persistence is implemented.
- Compare monthly revenue actuals against a seasonal budget.
- Model base, upside and downside scenarios for the remaining forecast months.
- Review a full-year modelled EBITDA and net income projection.
- Link the management P&L to a cash flow statement and a balance sheet.
- Model working-capital days (DSO, DIO and DPO), capital expenditure, debt movements and dividends.
- Reconcile opening and closing balance sheets and flag negative cash as an overdraft.
- Switch the workspace between English and Spanish; export financial statements in the selected language.

### Explicitly out of scope for the first release

- A general-purpose spreadsheet engine or Excel replacement.
- Live bank feeds, accounting integrations or tax filing.
- Multi-user collaboration and enterprise permissions.
- AI-generated financial advice.
- Storage of real customer financial data.

## Technology

- Next.js App Router
- React + TypeScript
- CSS custom properties and component-level CSS (no UI framework dependency)
- Domain calculations isolated from the UI
- Supabase is a future option for authentication and Postgres persistence; it is not enabled yet.

## Local development

Requirements: Node.js 20.9+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Project structure

```
app/
  globals.css
  layout.tsx
  page.tsx
src/
  domain/
    financials.ts
    planning.ts
    three-statements.ts
  components/
    planning-workspace.tsx
    three-statements-workspace.tsx
  i18n/
    translations.ts
docs/
  architecture.md
```

## Financial model conventions

All values are entered as currency amounts for the selected reporting period. Rates are entered as percentages. The MVP uses a simplified management P&L:

- Gross profit = Revenue − Cost of goods sold
- EBITDA = Gross profit − Operating expenses (excluding D&A)
- EBIT = EBITDA − Depreciation & amortisation
- Profit before tax = EBIT − Interest expense
- Income tax = max(0, Profit before tax × Tax rate)
- Net income = Profit before tax − Income tax

This is a management model, not statutory accounting or tax advice. Actual accounting treatment varies by jurisdiction and company.

### Integrated three-statement model

The three-statement workspace connects the existing P&L to an indirect cash flow and closing balance sheet:

- Cash from operations = net income + D&A − change in receivables − change in inventory + change in payables.
- Cash from investing = − capital expenditure.
- Cash from financing = new borrowings − debt repayments − dividends.
- Closing cash = opening cash + net change in cash. A negative amount is classified as a bank overdraft liability.
- Closing receivables, inventory and payables are estimated using DSO, DIO and DPO respectively.
- Closing PP&E = opening net PP&E + capital expenditure − D&A.
- Retained earnings = opening retained earnings + net income − dividends.

The opening balance sheet is an illustrative, balanced demonstration baseline. Working-capital and financing assumptions are editable; it is not yet a full accounting ledger. Lease accounting, disposals, FX, deferred tax, acquisitions, minority interests, statutory adjustments and historical monthly movements are outside scope. The interface shows a balance check and exports opening/closing balances alongside the cash flow.

## Security posture

The initial app uses local demo data only. Do not enter confidential company information.

Before onboarding customers, implement server-side authentication, tenant isolation, database row-level security, audit logging, backups, secure file handling and a documented retention policy. Never expose service-role keys or secrets in browser code.

## Product principle

Build a reliable, narrow financial workflow that customers repeatedly use. Do not expand into a generic spreadsheet until customer evidence justifies it.
