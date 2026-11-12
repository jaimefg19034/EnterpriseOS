# EnterpriseOS — competitive landscape and product gap assessment

**Research date:** 12 November 2026  
**Scope:** SME finance workspaces, FP&A, cash forecasting and modular business-management suites.  
**Purpose:** inform product priorities, not claim that EnterpriseOS already has enterprise-grade ERP coverage.

## Executive conclusion

EnterpriseOS currently competes most directly with the *entry point* of lightweight FP&A and management-finance tools, not with full ERP suites. Its present product includes a management P&L, budget/scenario planning, a simplified linked three-statement model, cost-centre/operations tracking, receivables/payables, invoice ageing, a 13-week direct cash forecast and Excel exports.

The strongest near-term positioning hypothesis is:

> A transparent, spreadsheet-friendly financial planning and management workspace for small and growing businesses that need to understand performance, explain variances and forecast cash without adopting a heavyweight ERP.

Do not attempt to match the entire feature catalogue of SAP, Oracle, Odoo or Zoho. First close reliability, traceability, multi-period planning and data-ingestion gaps in the finance workflow. Broader operational modules should follow validated customer demand.

## How to read this research

- Vendor product pages are useful evidence of advertised scope, not independent proof of product quality.
- Comparison articles and pricing directories may be commercially influenced; use them to identify candidates and capability categories, not as definitive rankings.
- Pricing, packaging, availability and country-specific compliance change frequently. This report avoids treating indicative third-party prices as a binding quote.
- A capability described as "missing" means it is not evidenced in the current repository/product scope reviewed on 12 November 2026. It may exist in an unreviewed branch or later release.
- This is a focused market scan, not an exhaustive census of every regional ERP, accounting package or treasury vendor.

## Competitor groups

### 1. SME all-in-one business suites

| Product | Primary strength | What EnterpriseOS should learn | Strategic implication |
|---|---|---|---|
| Holded | Spanish SME workflow: invoicing, accounting, bank reconciliation, cash visibility, inventory, CRM, projects, team and local compliance | Connected source transactions, bank reconciliation, accountant collaboration, Spanish compliance and onboarding matter as much as dashboards | Do not claim to replace Holded/accounting. Integrate with accounting sources later; stay focused on planning and management insight |
| Odoo | Modular breadth across CRM, sales, accounting, expenses, documents, purchases, inventory, manufacturing, maintenance and quality | Modular navigation and connected business objects; modules should share one coherent data model | Borrow modular architecture, not its breadth. Add modules only where they feed financial planning |
| Zoho One | Broad suite spanning sales, marketing, service, finance, HR, operations, collaboration, analytics and custom apps | Unified identity, app access, cross-functional dashboards, integrations and low-code extensibility | Future EnterpriseOS needs role-aware workspaces and connected data, but not 50 shallow apps |
| ERPNext | Open-source integrated ERP for accounting, stock, manufacturing, HR and CRM | Open deployment/customisation model and breadth for cost-sensitive teams | Potential integration/alternative ecosystem, but full ERP implementation is far beyond current MVP |
| Microsoft Dynamics 365 Business Central | Finance and operations for Microsoft-centric SMB/mid-market firms; connected Microsoft ecosystem and Copilot capabilities | Strong workflow integration, permissions, reporting and ecosystem leverage | Benchmark integrations and controls, not attempt to recreate Microsoft stack |
| Oracle NetSuite | Unified cloud ERP, financial management, multi-subsidiary operations and reporting | Multi-entity finance, consolidation and transaction traceability | Enterprise benchmark for later scale; not the initial target customer |

### 2. FP&A and performance management

| Product | Primary strength | What EnterpriseOS should learn | Strategic implication |
|---|---|---|---|
| Pigment | Connected planning across finance and other departments, scenario modelling and explainable AI positioning | Shared modelling layer, flexible drivers, scenario comparison and traceable outputs | Strengthen driver-based planning and make every forecast explainable |
| Anaplan | Large-scale connected planning across functions and complex models | Model governance, dimensional planning and workflows | Enterprise reference only; avoid overengineering |
| Planful | Planning, forecasting, reporting and financial close/performance management | Rolling reforecasting, management packs and close workflows | Add rolling forecast and period-close concepts when the underlying model is ready |
| Vena / Cube / Datarails | Excel-centric FP&A with governed data/workflows | Respect existing spreadsheet habits; robust imports/exports and version control | Excel import/export quality is a strategic capability, not a cosmetic extra |
| Sage Intacct | Financial management, multi-entity reporting, dimensional dashboards, budgeting, close controls and finance automation | Drillable reporting, multi-entity consolidation, close task tracking, anomaly checks and approval traceability | Prioritise reliable reporting dimensions and data quality before AI |
| Workday Adaptive Planning | Planning connected to workforce and enterprise data | Workforce/headcount drivers can connect operational assumptions to financial forecasts | Later add workforce planning only if user evidence supports it |

### 3. Cash forecasting and treasury specialists

| Product | Primary strength | What EnterpriseOS should learn | Strategic implication |
|---|---|---|---|
| Float | Cash-first forecasting for finance teams using accounting data | Fast setup, forecast clarity and accounting connectivity | A 13-week forecast is a good core workflow, but it needs real data ingestion to compete |
| Fathom | Management reporting, analysis and multi-period / three-way forecasting | Board-ready reporting, comparisons and narrative context | Strengthen report packs and reconciled three-statement forecasts |
| Dryrun | Cash timing, AR/AP expected dates, scenarios and multi-entity views | Timing assumptions and invoice-driven scenario analysis | Continue hardening due-date and partial-payment logic |
| Jirav | Driver-based FP&A for small finance teams, multi-year plans and three-statement forecasts | Longer-horizon driver models and payroll/accounting data inputs | Extend horizon only after current 13-week and annual models reconcile |
| Cash Flow Frog | Rolling cash forecasting with multiple time granularities and named scenarios | Weekly/monthly/daily views and scenario comparison | Consider rolling horizons and side-by-side scenario versions |
| Kyriba | Enterprise treasury, multi-bank liquidity and payment controls | Bank connectivity, cash positioning, security and control requirements | Not an MVP competitor; informs future treasury controls |

## Capability comparison against current EnterpriseOS

Legend: **Present** = evidenced in current app/repository; **Partial** = simplified/demo/manual/local-only; **Missing** = not evidenced in current product.

| Capability | EnterpriseOS today | Competitive expectation / gap |
|---|---|---|
| Management P&L and profitability KPIs | Present (management model) | Preserve formula transparency; distinguish management model from statutory ledger |
| Budget vs actual and scenarios | Present (limited horizon/model assumptions) | Add period-consistent variance bridges and rolling reforecast |
| Three-statement model | Partial (simplified assumptions and illustrative opening balance sheet) | More complete opening balances, monthly periods, reconciliation and model versioning |
| Working capital and invoice ageing | Present (browser-local records) | Source import, data provenance, robust permissions and multi-user controls |
| 13-week cash forecast | Present (manual inputs plus optional invoice projection) | Real accounting/bank inputs, rolling horizon, scenario comparison and reconciliation |
| Cost-centre / operational spend | Partial (manual baseline plus recorded expenses) | Department/project dimensions, budget owners and approval workflow |
| Excel exports | Present | Import mapping, formula/value validation, reproducibility and version history |
| Multi-period management reporting | Partial | Month, quarter, financial year, comparative periods and drill-down |
| Accounting ledger / journal entries | Missing | Do not build before deciding whether to integrate with accounting software or become a ledger |
| Bank feeds / reconciliation | Missing | Future integration; never simulate a bank connection |
| CRM, sales pipeline and customer service | Missing | Integrate first; only build if finance workflow requires customer pipeline drivers |
| Procurement / purchase orders / approvals | Missing | Start with supplier commitments and approval trail if discovery validates it |
| Inventory / manufacturing | Missing | Industry-specific scope; avoid generic inventory without a target vertical |
| HR / payroll / workforce planning | Missing | Consider headcount cost planning, not full payroll, as an FP&A extension |
| Multi-company / consolidation | Missing | Requires a real tenant/entity data model and currency/intercompany design |
| Authentication, roles and audit trail | Missing | Launch blocker before real customer financial data |
| Server persistence, backups and recovery | Missing | Launch blocker; localStorage is not a business database |
| AI explanations / agents | Missing | Only after governed source data and traceable calculations exist |
| Spanish accounting / tax compliance | Missing | Integrate with compliant accounting providers; do not claim statutory compliance |

## What competitors collectively do well

1. **Connected records:** invoices, bank movements, bills, customers and reports share the same source data. Users do not re-enter the same transaction in several modules.
2. **Actuals-to-forecast pipeline:** historical actuals feed a forecast, and users can see exactly which assumptions and source records produce a number.
3. **Rolling planning:** budgets are not frozen once per year; forecasts update as new actuals arrive.
4. **Scenario comparison:** base, upside and downside assumptions can be compared side by side, with visible drivers and impact.
5. **Dimensional reporting:** results can be analysed by entity, department, cost centre, project, product or geography.
6. **Controls and traceability:** roles, approvals, change history, close checklists, source references and recovery paths are part of the product.
7. **Spreadsheet interoperability:** finance teams can import, map, validate, export and reconcile workbooks.
8. **Useful onboarding:** migration, sample data, guided setup and clear empty/error states reduce time to value.
9. **Decision-ready outputs:** dashboards are supported by drill-down, variance explanations and management packs.
10. **AI with governance:** useful automation is grounded in source data, permissions and explainable calculations, not invented figures.

## Recommended EnterpriseOS response

### P0 — Complete the current finance foundation

- Finish and independently test the current cash forecast and working-capital audit.
- Create a canonical reporting-period model shared by P&L, planning, statements, operations and exports.
- Add explicit actual / budget / forecast / prior-period comparisons and a variance bridge.
- Make every KPI and forecast traceable to its input assumptions and source records.
- Reconcile every Excel export against the on-screen result in both languages.
- Strengthen the three-statement model's balance checks and expose assumptions/limitations clearly.
- Improve recovery and validation for all browser-local finance records.

### P1 — Make planning genuinely useful

- Rolling forecast with a controlled horizon and clear as-of date.
- Side-by-side named scenarios with assumption deltas and impact summaries.
- Monthly/quarterly/FY reporting with consistent date boundaries.
- Department/cost-centre dimensions and owner-friendly budget vs actual views.
- Management pack export with P&L, cash, balance sheet, KPIs, variances and assumptions.
- Import preview with column mapping, duplicate detection, rejected-row reasons and source references.

### P2 — Build a safe data foundation before integrations

- Define company, legal entity, user, role, reporting period, source connection, imported batch and audit event.
- Server-side authentication and tenant isolation, tested with cross-company access attempts.
- Database persistence, backups, restore drills, retention and deletion policy.
- Read-only accounting-data ingestion before any write-back or payment initiation.
- Source-to-report lineage: each imported amount retains system, record ID, date and import batch.

### P3 — Extend only with customer evidence

- Accounting integrations and bank feeds, prioritised by the target market's actual software stack.
- Supplier commitments / purchase order cash forecast.
- CRM pipeline as a revenue forecast driver.
- Headcount and payroll-cost planning.
- Multi-entity consolidation and foreign currency.
- Approval workflows and controlled period close.
- AI variance commentary and anomaly detection only after data lineage and permissions are reliable.

## Product positioning to test

**Do not position EnterpriseOS as "another all-in-one ERP" yet.**

Test this narrower message with finance leads and business owners:

> EnterpriseOS turns management accounts, budgets, working capital and cash forecasts into one transparent financial decision workspace — without forcing a business to replace its accounting system.

The key differentiation to validate:
- Faster to understand and maintain than heavyweight FP&A platforms.
- More planning- and scenario-oriented than basic invoicing/accounting tools.
- More transparent about formulas, assumptions and source data than a collection of disconnected spreadsheets.
- Free-first, modular and honest about what is manual, imported, connected or illustrative.

## Discovery questions before expanding scope

1. Which accounting package is the source of truth today (Holded, Sage, A3, Odoo, Business Central, Xero, QuickBooks or another)?
2. What takes the most time every month: closing actuals, preparing the budget, explaining variances, updating cash forecasts or producing management reports?
3. Which forecast is used most: 13-week cash, monthly P&L, annual budget, headcount or project profitability?
4. Who reviews and approves changes to budgets and forecasts?
5. Which dimensions matter in practice: entity, department, project, product, location or customer?
6. What must be exported to Excel, a board pack or an external accountant?

## Sources reviewed

### Official product documentation / vendor pages
- Holded — SME management, finance, cash, inventory and CRM: https://www.holded.com/es/pymes
- Holded — ERP scope and Spanish compliance positioning: https://www.holded.com/es/erp-para-pymes
- Odoo — official app catalogue: https://www.odoo.com/es/page/all-apps
- Zoho One — official integrated business suite: https://www.zoho.com/one/
- Sage Intacct — financial management, reporting, multi-entity and AI capabilities: https://www.sage.com/en-gb/sage-business-cloud/intacct/
- Microsoft Dynamics 365 — Copilot and AI features overview: https://learn.microsoft.com/es-es/dynamics365/copilot/ai-get-started

### Market and category research
- Pigment, *Best FP&A software in 2026* (6 Aug 2026; updated 3 Sep 2026): https://www.pigment.com/blog/best-fpa-software
- Float, *How to compare cash flow forecasting tools for finance teams* (vendor-authored comparison; dated vendor claims): https://floatapp.com/blog/compare-cash-flow-forecasting-tools
- Gartner, *What the 2026 Hype Cycle for ERP Reveals* (7 Jul 2026): https://www.gartner.com/en/articles/hype-cycle-for-erp
- Gartner, *Embedded AI in Cloud ERP and financial close* (24 Feb 2026): https://www.gartner.com/en/newsroom/press-releases/2026-02-24-gartner-predicts-embedded-ai-in-cloud-erp-applications-will-drive-a-30-percent-faster-financial-close-by-2028
- BARC, *Financial Performance Management Score 2026*: https://www.anaplan.com/content/dam/anaplan/assets/documents/report/analyst-report/anaplan-barc-fpm-2026-analyst-report.pdf
- ERP Research, *Odoo alternatives and competitors* (reviewed 1 Nov 2026): https://erpresearch.com/compare/odoo-alternatives
- Acelera pyme / Red.es, *Gestión de tesorería: control y previsión del cash flow*: https://www.acelerapyme.gob.es/sites/acelerapyme/files/2023-07/Gesti%C3%B3n%20de%20tesorer%C3%ADa%20-%20La%20importancia%20del%20control%20en%20la%20posici%C3%B3n%20de%20tesorer%C3%ADa%20y%20la%20previsi%C3%B3n%20de%20cash%20flow.pdf

**Next review:** revisit this landscape quarterly or before a major scope decision. Re-check vendor claims, pricing, Spanish regulatory requirements and integration availability before implementation.
