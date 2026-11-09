# EnterpriseOS — technical architecture

**Status:** MVP foundation, November 2026  
**Architecture decision:** modular monolith; browser-only demo data for the first iteration.

## 1. Product and technical scope

The first customer hypothesis is an SME finance lead or owner who repeatedly assembles a management profit-and-loss statement from spreadsheets.

The MVP proves one narrow workflow:

1. Enter six operating assumptions for a reporting period.
2. Calculate a consistent management P&L.
3. Review the resulting margins and headline KPIs.
4. Export the statement as CSV.

The app is deliberately not a general-purpose spreadsheet. No customer financial data is persisted in this first iteration.

### Launch-critical

- Responsive workspace shell and clear navigation.
- Typed financial input model.
- Pure, independently testable calculation functions.
- Live management P&L and margin calculations.
- CSV export with values and formula descriptions.
- Clear demo-data and non-statutory-accounting disclosures.
- Automated type, lint and production-build checks before each release.

### Later, only after customer validation

- Authentication and company workspaces.
- Persistent models, version history and audit events.
- Excel import and export with formula/value validation.
- Monthly and quarterly periods, budgets and scenarios.
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
React component state (demo data in browser memory)
      |
      v
calculateFinancials() — pure domain function
      |
      +----> KPI cards / chart summaries
      |
      +----> Management P&L rows
      |
      +----> CSV export
```

The calculation module clamps invalid/negative expense inputs and caps the assumed tax rate at 100%. It does not persist data or call a third-party API.

## 4. Financial calculation contract

Expenses are entered as positive amounts. D&A is excluded from operating expenses and deducted below EBITDA.

- Gross profit = Revenue − Cost of goods sold
- EBITDA = Gross profit − Operating expenses
- EBIT = EBITDA − D&A
- Profit before tax = EBIT − interest expense
- Income tax = max(0, profit before tax × tax rate)
- Net income = profit before tax − income tax
- Each margin = corresponding profit / revenue

This is a simplified management model. Real accounting policies, lease treatment, exceptional items, capitalisation, tax losses, deferred tax and jurisdiction-specific rules require further modelling and professional review.

## 5. Security from day one

Current MVP:
- Use illustrative sample data only.
- No secrets, API keys or customer financial records in Git.
- No browser-side privileged credentials.
- No persistence means no multi-tenant data exposure in the first version.

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

### Phase 1 — correctness and usability
- Add unit tests for positive, zero-revenue, loss-making, tax-rate and invalid-input cases.
- Add model input validation and number formatting tests.
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

**Risk:** users may expect accounting-grade correctness from generic financial labels, while actual company reporting conventions differ.

**Mitigation:** keep the first model narrow, show formulas and assumptions, use explicit definitions for each line item, add automated calculation tests, and have an accountant/finance professional review model semantics before a paid production pilot.

The hardest future technical task is reliable spreadsheet ingestion and formula compatibility. Do not build a formula engine prematurely. Start with structured templates and validated CSV/XLSX import for one customer workflow.
