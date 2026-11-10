# EnterpriseOS — 18-month product roadmap

**Planning window:** November 2026 – May 2028  
**Product owner:** project team  
**Current stage:** foundation and product validation  
**Status:** living plan — priorities are reviewed after each milestone

## Product ambition

Build a dependable financial and operating workspace for small and medium-sized businesses. EnterpriseOS should help a finance lead or business owner understand performance, plan cash, control budgets and make better operating decisions without stitching together disconnected spreadsheets.

The ambition is not to build every enterprise feature. We will earn complexity through evidence: first make the financial workflows correct, then make company data safe, then test with real users, and only then scale integrations and commercial features.

## Non-negotiable principles

1. **Financial correctness before feature count.** Every important calculation has a written definition, edge-case tests and visible assumptions.
2. **No fake integrations.** A connected bank, accounting system, login or shared workspace must be real, secure and tested before it is presented as available.
3. **No confidential data in the current demo.** GitHub Pages is a static deployment; browser storage is local to one browser/device and is not a company database.
4. **One source of truth.** Domain calculations stay outside UI components. A metric must not be recalculated differently in different screens.
5. **Small releases.** Each change is tested, deployed and checked before the next risky change.
6. **Customer evidence beats assumptions.** Interview users and observe workflows before building expensive features.
7. **Free-first development.** Avoid paid APIs and infrastructure until a validated need justifies the cost and the owner approves it.

## 18-month roadmap

| Period | Stage | Main outcome | Exit gate |
|---|---|---|---|
| Months 1–2 · Nov–Dec 2026 | Foundation & product discovery | Stable current product, written requirements, validated target user and priority workflow | Core checks green; 5–8 discovery conversations or documented attempts; top workflow agreed |
| Months 3–4 · Jan–Feb 2027 | Financial core v1 | Reliable monthly management accounts, budget/forecast, cash visibility and period comparisons | Reconciled sample cases; edge cases covered; exports match on-screen figures |
| Months 5–6 · Mar–Apr 2027 | Data architecture | Server-backed persistence design, company/tenant boundaries, authentication plan and migration strategy | Threat model and data model reviewed; no secrets in client bundle; backup/restore tested |
| Months 7–8 · May–Jun 2027 | Controlled data ingestion | Robust spreadsheet import, mapping, validation, duplicate handling and import preview | Rejected rows explained; imports are repeatable; source-to-result traceability |
| Months 9–10 · Jul–Aug 2027 | Management intelligence | Variance explanations, KPI drivers, cash scenarios and useful management packs | Every insight traceable to underlying figures; no unsupported AI-generated numbers |
| Months 11–12 · Sep–Oct 2027 | Security & collaboration | Authentication, company isolation, roles, audit trail and recovery procedures | Tenant isolation tests; authorization tests; restore drill; security review |
| Months 13–14 · Nov–Dec 2027 | Private pilot | Small controlled pilot with real workflows, onboarding and feedback loop | Pilot users complete the core workflow; issues prioritised by severity and frequency |
| Months 15–16 · Jan–Feb 2028 | Reliability & commercial readiness | Performance, observability, support process, product packaging and pricing tests | Operational runbook, incident path, support expectations and cost model documented |
| Months 17–18 · Mar–Apr/May 2028 | Launch decision | Stable release candidate and evidence-based go/no-go decision | Critical defects closed; security and data controls verified; users demonstrate recurring value |

**Dedicated design and UX phase (gated, not calendar-led):** after the core functionality and priority workflows are implemented and validated, reserve a focused product-wide pass for visual identity, design system, layout hierarchy, typography, data visualisation, tables, responsive behaviour, accessibility, interaction feedback and motion. This is deliberately not part of the current foundation work; it begins only when the functional structure is stable enough that we are not repeatedly redesigning unfinished workflows. It must improve clarity and usability, not add decoration for its own sake.

Dates are planning targets, not promises. A stage does not advance just because its calendar window has ended. If an exit gate fails, we fix the gap before adding scope. We can extend any session or stage when a workflow needs deeper analysis, testing or redesign; session counts are planning aids, never speed targets.

## Current priority order

### P0 — Protect the foundation
- Keep the main navigation and current user workflows stable.
- Maintain green lint, typecheck, unit tests and production build.
- Check the actual GitHub Pages deployment after each release.
- Keep the demo-data and browser-local-storage limitations visible.
- Add regression tests before changing financial calculations.

### P1 — Make the financial workflow dependable
- Define a common reporting-period model (month, quarter, financial year).
- Add actual-versus-budget-versus-forecast variance analysis with consistent formulas.
- Strengthen three-statement integrity checks and explain reconciliation differences.
- Add a controlled month/quarter close checklist and locked-period behaviour only after the underlying data model supports it.
- Make exports reproducible and reconcile exported totals to the UI.

### P2 — Prepare for real company use
- Interview target users and document their current month-end process.
- Design company, user, role, period, source-import and audit-event entities.
- Decide on backend hosting and database only after security, cost and migration requirements are written.
- Build migration and recovery paths before storing sensitive company records.

### P3 — Validate and scale
- Pilot with a very small number of invited businesses.
- Track activation, time-to-first-report, recurring usage and workflow completion.
- Prioritise defects and repeated user pain over decorative features.
- Consider integrations and AI only when they reduce a measured workflow cost.

## First 20 working sessions

These are the initial sequence, not 20 tasks to rush through in one sitting. Each session ends with a commit or a documented reason not to merge. A session may be split into several focused work blocks if the scope or quality checks require it.

| Session | Deliverable | Acceptance check |
|---:|---|---|
| 1 | Freeze the current feature inventory and known limitations | Every visible module has an owner, status and data-source note |
| 2 | Map the end-to-end finance workflow | Inputs, calculations, outputs and hand-offs are documented |
| 3 | Audit the management P&L calculation definitions | Formula sheet agrees with code and tests |
| 4 | Audit balance-sheet and cash-flow links | Reconciliation checks cover normal and edge cases |
| 5 | Create a financial-model test matrix | Zero revenue, negative profit, debt, overdraft and working-capital cases covered |
| 6 | Audit reporting-period handling | Month, quarter, FY boundaries and leap years tested |
| 7 | Review invoice-to-cash logic | Partial payments, overdue invoices and duplicate prevention tested |
| 8 | Review expense-to-budget logic | Manual baseline and dated expenses cannot be double counted |
| 9 | Reconcile Excel exports with displayed figures | Totals and labels match in both languages |
| 10 | Fix the highest-severity issue found in sessions 1–9 | Regression test added and CI green |
| 11 | Draft target-customer interview guide | Questions focus on current behaviour, not leading feature requests |
| 12 | Build a workflow map from discovery evidence | Most painful repeated task is identified |
| 13 | Define the first customer profile and exclusions | Clear user, company size, workflow and non-goals |
| 14 | Write acceptance criteria for the core monthly review | A user can complete the workflow without undocumented assumptions |
| 15 | Review navigation and accessibility across screen sizes | No clipped panels, hidden actions or keyboard traps |
| 16 | Review empty, loading, error and recovery states | Every module explains what happened and what the user can do |
| 17 | Define the canonical financial data dictionary | Metric names, signs, units, periods and formulas are consistent |
| 18 | Draft the first data model and tenant-boundary diagram | Company-owned records have explicit ownership and access rules |
| 19 | Write a security and privacy threat checklist | Risks, mitigations and unresolved decisions are recorded |
| 20 | Review milestone evidence and reprioritise | Next 20 sessions are based on test results and user evidence |

## Daily execution method

Every work session follows the same loop:

1. **Inspect:** check the live site, latest commit, CI and current backlog.
2. **Choose one outcome:** one meaningful user problem, not a bundle of unrelated cosmetic changes.
3. **Specify:** write acceptance criteria and identify affected calculations, data and screens.
4. **Implement:** keep the change small and preserve existing behaviour.
5. **Verify:** run lint, typecheck, tests and production build; add regression tests for bugs.
6. **Release:** commit once, wait for deployment, then verify the deployed site.
7. **Record:** update this roadmap or the decision log with what changed, evidence, known limitations and the next task.

A session is not complete when code is merely written. It is complete when the checks pass and the deployed result has been verified, or when a blocker is recorded honestly.

## Release gates

A change that affects financial data cannot be released unless:
- The formula and sign convention are documented.
- Inputs are validated and invalid states are handled.
- Relevant unit tests pass, including boundary cases.
- The UI labels sample, estimated and actual figures correctly.
- Exports agree with the displayed model.
- Existing backup compatibility is preserved or a migration is supplied.

A change that affects security or persistence cannot be released unless:
- Access is enforced server-side, not only hidden in the UI.
- Company/tenant ownership is checked on every relevant operation.
- Secrets stay server-side.
- Backup, restore and deletion behaviour is defined and tested.
- Logs do not expose sensitive financial information.

## What we will not do yet

- Connect a real bank account or accounting platform to the public static demo.
- Store real customer financial records in browser localStorage.
- Add multi-user collaboration before tenant isolation and permissions exist.
- Add AI-generated financial recommendations before the underlying data is reliable and traceable.
- Add a feature merely because another SaaS product has it.

## Session log

Append a short entry after each completed work session:

- **Date / commit:**
- **User problem addressed:**
- **What changed:**
- **Checks and deployment:**
- **Known limitations:**
- **Next session:**

**Session 1 completed (9 Nov 2026):** current modules, persistence boundaries and major product limitations were recorded in [the feature inventory](feature-inventory.md).

**Session 2 completed (9 Nov 2026):** the current and target monthly finance workflows were mapped in [the core finance workflow](core-finance-workflow.md). The map makes explicit that the current operations, P&L, invoice and cash modules are not yet one reconciled system of record.

**Session 3 completed (9 Nov 2026):** the management P&L formula contract was compared with its implementation and tests. One edge case was hardened: extreme monetary values are now capped at the same safe-integer boundary used by the input UI, preventing non-finite margin results from direct domain calls.

**Session 4 completed (9 Nov 2026, commit `360485c`):** added multi-scenario reconciliation tests covering operating losses, zero revenue, working-capital movements, large CapEx, new borrowing, debt repayment and dividends. Added a direct indirect-cash-flow reconciliation test. Quality checks, production build and both GitHub Pages deployment workflows completed successfully for this commit.

**Session 5 completed (9 Nov 2026, commit `6b07eb7`):** added a table-driven financial-model test matrix covering zero revenue/activity, high growth and positive margins, operating losses without tax benefits, and the 100% tax-rate boundary. All returned values are checked for finiteness and key P&L identities are asserted. Lint, typecheck, unit tests, production build, custom static deployment and the GitHub Pages deployment workflow all completed successfully.

**Session 6 completed (9 Nov 2026, commit `e8c65ba`):** introduced shared UTC reporting-period boundaries and strict date validation across Operations. Added coverage for calendar and custom fiscal quarters, financial years crossing calendar years, leap-year and non-leap-year lengths, inclusive boundaries, invalid dates and invalid period codes. Added calendar-month bounds and tests for February in leap/non-leap years and December year-end. Lint, typecheck, unit tests, production build and the custom GitHub Pages deployment all completed successfully. The audit also confirmed that Budget & Scenarios still stores one 12-month plan keyed only by month name and labels it FY2026; it is not yet a multi-year model. We deliberately did not relabel or overwrite that demo data. A year-aware planning data model with a tested migration from the existing FY2026 state is a separate required change before adding a year selector.\n\n**Planning workstream completed (10 Nov 2026, commit `afc3a2f`):** Budget & Scenarios now has a year-aware local planning state, preserves the legacy FY2026 plan through migration, carries assumptions into new fiscal years without copying actual revenue, and stores scenario selection and custom revenue growth separately per year. Added Base, Upside, Downside and Custom scenarios; the custom adjustment affects forecast months only and leaves entered actuals and cost assumptions unchanged. The fiscal-year controls, custom-scenario controls, selected-year monthly labels and Excel export were updated. Lint, typecheck, unit tests, production build and GitHub Pages deployment all completed successfully. The workspace remains browser-local and illustrative, not a shared company database.

The next planned session is **Session 7: review invoice-to-cash logic**, covering partial payments, overdue invoices, duplicate prevention, period allocation and backup/restore compatibility.
