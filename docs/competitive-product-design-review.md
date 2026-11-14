# Competitive product-design review — EnterpriseOS

Research date: 14 November 2026

## Executive conclusion

EnterpriseOS should not imitate a generic SaaS KPI dashboard. The strongest products in adjacent categories distinguish between (1) an executive reading surface, (2) an analytical workspace where users investigate variance and drivers, and (3) operational workflows that let users act. Their visual systems make hierarchy, context, drill-down and workflow state visible. EnterpriseOS currently has a management-planning MVP, so it must not imply accounting connectivity, live bank feeds, statutory compliance, audit trails or automation that it does not yet provide.

## Competitor benchmark

### Holded — SMB ERP and accounting
- Product pattern: quick daily dashboard for revenue, expenses, profit and cash, separated from detailed reports; filters carry through when opening a report; configurable widgets; accounting data feeds reports.
- UX lesson: keep the executive overview concise, then preserve context when drilling into a report.
- Product gap to close later: real accounting source data, bank connections, invoice-led reporting and Spanish tax compliance are not present in the current MVP.
- Sources: https://www.holded.com/reports ; https://www.holded.com/real-time-dashboard ; https://www.holded.com/es/erp

### Ramp — finance operations
- Product pattern: controls and workflow are joined to spend visibility; requests, approvals, policy exceptions, vendor and AP activity connect to finance reporting; charts can be drilled into transaction detail and dashboards can be shared or scheduled.
- UX lesson: metrics should lead to a concrete next action or an investigation path, not end as passive cards.
- Product gap to close later: approval routing, card/bank integrations, procurement and automated accounting sync are not current EnterpriseOS capabilities.
- Sources: https://ramp.com/platform/ ; https://ramp.com/reporting ; https://support.ramp.com/ramps-spend-management-platform-enhancing-your-companys-expense-control/

### Pigment — enterprise planning and performance management
- Product pattern: connected planning models, scenario iteration, role-specific executive views, narrative reports, validation flows and custom interfaces built on live model data.
- UX lesson: planning screens should foreground assumptions, scenario comparison, model impact and decision narrative; not just expose inputs.
- Product gap to close later: shared governed data layer, collaboration, role permissions, integrations and enterprise-scale planning engine.
- Sources: https://www.pigment.com/platform ; https://www.pigment.com/platform/frames

### Sage Intacct — financial management and reporting
- Product pattern: dimensional reporting, operational metrics beside financials, flexible report layouts, grouping, pivots and drill-down to source transactions.
- UX lesson: expose the business dimensions behind a result (department, project, location, cost centre) and keep summary-to-detail navigation consistent.
- Product gap to close later: general ledger, transaction-level drill-through and full financial controls.
- Sources: https://www.getsageintacct.com/sage-intacct/dashboards-and-reporting/ ; https://www.sage.com/en-us/-/media/files/sagedotcom/master/gated-assets/intacct/datasheets/sage-intacct-dimensions-datasheet.pdf

### Oracle NetSuite — role-based ERP
- Product pattern: role-based centres and personalized dashboards with KPI meters, trend graphs, report snapshots, reminders and shortcuts.
- UX lesson: navigation and the landing view should reflect the user's job-to-be-done; don't make every role wade through the same generic dashboard.
- Product gap to close later: identity, roles, permissions, shared dashboard configuration and integrated ERP records.
- Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N633149.html ; https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1529089901.html

### Mosaic — strategic finance and operational analytics
- Product pattern: plan-versus-actual variance, project and team drill-down, EAC / forecast-to-complete, saved report views and dashboard widgets.
- UX lesson: show what moved away from plan, where it happened and what needs attention. Variance is a first-class view, not a tiny percentage below a KPI.
- Product gap to close later: reliable actuals ingestion, project/time integrations and forecasting depth.
- Sources: https://support.mosaicapp.com/en/articles/673-reports-overview ; https://support.mosaicapp.com/en/articles/692-variance-tab ; https://www.mosaicapp.com/by-goals/get-operational-insights

### QuickBooks Online — accounting workflow
- Product pattern: refreshed customizable workspace, bookmarkable actions, modern reporting with persistent filters/groupings and drill-through, invoice lifecycle tracking.
- UX lesson: preserve user context and preferences when moving between a summary, a report and an operational document.
- Source: https://quickbooks.intuit.com/global/resources/product-update/quickbooks-new-experience-defaults/

## Design decisions applied in this iteration

1. Replace the equal-card overview with an asymmetric executive command surface: a dominant revenue-performance canvas paired with a profitability bridge.
2. Add a visible P&L walk from revenue through direct costs, operating expenses, EBITDA and final net income.
3. Give margin analysis its own horizontal editorial section with visual scale and explicit definitions.
4. Replace four equal workspace cards with a numbered operating-system index that reads as a sequence of work areas.
5. Preserve the existing navy / blue / green palette, but use contrast, typography, spacing, grid structure and depth rather than a palette swap.
6. Keep sample-data and MVP limitations explicit; do not manufacture growth deltas, cash runway, live integrations or benchmark performance.
7. Set Spanish as the initial document language and keep the language preference switch intact.

## Prioritized product-design roadmap

### P0 — trust and product clarity
- Keep sample/demo figures unmistakably labelled.
- Add source / calculation explanations beside every major figure.
- Ensure every visible action navigates to a real existing capability.
- Test the first-run language and language persistence.

### P1 — decision-led planning
- Budget vs actual vs forecast as a first-class variance view.
- Scenario comparison with a visible bridge showing which assumptions cause the outcome change.
- Cash forecast risk timeline, with clear week-by-week drivers and scenario stress.
- Saved report views and consistent filters across summary and detail.

### P2 — operational workflows
- Receivables/payables work queues with ageing, due dates, ownership and next action.
- Project and cost-centre profitability with plan, actual, forecast-to-complete and variance.
- Exception inbox for overdue invoices, over-budget projects, negative cash weeks and KPI misses.

### P3 — enterprise credibility (only when backed by real infrastructure)
- Authentication, role-based access, audit log and server-side persistence.
- Integrations and reconciled source data.
- Multi-entity consolidation, governed dimensions and statutory accounting/tax workflows.

## Important scope boundary

This research is a product and UX benchmark, not a claim that the current MVP matches these competitors feature-for-feature. The current application remains a locally persisted, manually entered management-planning prototype with illustrative data. EnterpriseOS must earn trust through clear scope and reliable calculations before marketing itself as a complete ERP or accounting platform.
