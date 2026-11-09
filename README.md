# EnterpriseOS

**An integrated financial workspace for growing businesses.**

EnterpriseOS is a focused financial modelling and business-analysis workspace. It is designed to complement existing accounting and spreadsheet tools—not to replace every spreadsheet workflow.

## Product direction

Our first customer hypothesis is finance teams and owner-operators at small and medium-sized businesses who repeatedly prepare management accounts, budgets and performance reviews in spreadsheets.

### MVP: one workflow, done well

The first release focuses on a dependable management P&L model:

- Edit the key operating assumptions in a guided form.
- Recalculate gross profit, EBITDA, EBIT, pre-tax profit and net income immediately.
- See the key performance indicators and a monthly trend.
- Export a clean CSV for use in existing workflows.
- Work with clearly labelled sample data until secure persistence is implemented.

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

## Security posture

The initial app uses local demo data only. Do not enter confidential company information.

Before onboarding customers, implement server-side authentication, tenant isolation, database row-level security, audit logging, backups, secure file handling and a documented retention policy. Never expose service-role keys or secrets in browser code.

## Product principle

Build a reliable, narrow financial workflow that customers repeatedly use. Do not expand into a generic spreadsheet until customer evidence justifies it.
