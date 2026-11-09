import { describe, expect, it } from "vitest";
import { costCenterActualSpend, costCenterPerformance, costCenterRunRate, kpiPerformance, parseOperationsState, projectBudgetVariance, riskScore, weightedPipeline, type OperationsState } from "./operations";
const state: OperationsState = {
  opportunities: [
    { id: "o1", company: "Northstar", contact: "Alex", value: 10000, stage: "proposal", expectedClose: "2026-12-01" },
    { id: "o2", company: "Acme", contact: "", value: 5000, stage: "lost", expectedClose: "2026-12-10" },
  ],
  projects: [{ id: "p1", name: "ERP rollout", owner: "Sam", budget: 20000, spent: 12500, dueDate: "2026-12-31", status: "active" }],
  risks: [{ id: "r1", title: "Supplier delay", owner: "Lee", probability: 4, impact: 5, mitigation: "Second source", status: "mitigating" }],
  kpis: [{ id: "k1", name: "Retention", actual: 92, target: 95, unit: "%" }],
  costCenters: [{ id: "c1", name: "Marketing", owner: "Taylor", budget: 10000, actualSpend: 1000, period: "2026-Q4" }],
  expenses: [
    { id: "e1", date: "2026-10-15", description: "Campaign", supplier: "Media Co", category: "Marketing", costCenterId: "c1", amount: 10200, status: "unpaid" },
    { id: "e2", date: "2026-07-15", description: "Summer ads", supplier: "Ads Co", category: "Marketing", costCenterId: "c1", amount: 300, status: "paid" },
  ],
};
describe("operations workspace domain", () => {
  it("round-trips valid local workspace data", () => {
    expect(parseOperationsState(JSON.stringify(state))).toEqual(state);
  });
  it("rejects malformed records, impossible dates and duplicate IDs", () => {
    expect(parseOperationsState("{")).toBeNull();
    expect(parseOperationsState(JSON.stringify({ ...state, projects: [{ ...state.projects[0], dueDate: "2026-02-30" }] }))).toBeNull();
    expect(parseOperationsState(JSON.stringify({ ...state, risks: [{ ...state.risks[0], id: "o1" }] }))).toBeNull();
  });
  it("loads legacy operations data without cost centres", () => {
    const legacy = { ...state, costCenters: undefined, expenses: undefined };
    expect(parseOperationsState(JSON.stringify(legacy))).toMatchObject({ costCenters: [], expenses: [] });
  });
  it("calculates probability-weighted pipeline without lost deals", () => {
    expect(weightedPipeline(state.opportunities)).toBe(6000);
  });
  it("evaluates higher-is-better and lower-is-better KPIs correctly", () => {
    expect(kpiPerformance(state.kpis[0]).onTarget).toBe(false);
    expect(kpiPerformance({ ...state.kpis[0], actual: 4, target: 5, direction: "lower" })).toMatchObject({ onTarget: true, ratio: 125 });
    expect(kpiPerformance({ ...state.kpis[0], actual: 7, target: 5, direction: "lower" }).onTarget).toBe(false);
    expect(kpiPerformance({ ...state.kpis[0], actual: 0, target: 0, direction: "lower" }).onTarget).toBe(true);
  });
  it("calculates cost-centre headroom, utilisation and overspend", () => {
    expect(costCenterActualSpend(state.costCenters[0], state.expenses)).toBe(11200);
    expect(costCenterActualSpend({ ...state.costCenters[0], period: "2026-FY" }, state.expenses)).toBe(11500);
    expect(costCenterPerformance({ ...state.costCenters[0], actualSpend: costCenterActualSpend(state.costCenters[0], state.expenses) })).toEqual({ remaining: -1200, utilizationPercent: 112, overBudget: true });
    expect(costCenterPerformance({ ...state.costCenters[0], budget: 0, actualSpend: 0 })).toMatchObject({ utilizationPercent: 0, overBudget: false });
  });
  it("projects current-period spend using dated expenses only", () => {
    const center = state.costCenters[0];
    const projection = costCenterRunRate(center, state.expenses, "2026-11-15");
    expect(projection.recordedSpend).toBe(10200);
    expect(projection.elapsedPercent).toBeGreaterThan(0);
    expect(projection.projectedSpend).toBeGreaterThan(10200);
    expect(projection.projectedOverBudget).toBe(true);
  });
  it("does not extrapolate outside the budget period or without dated spend", () => {
    const center = state.costCenters[0];
    expect(costCenterRunRate(center, state.expenses, "2026-09-30").projectedSpend).toBeNull();
    expect(costCenterRunRate(center, [], "2026-11-15").projectedSpend).toBeNull();
  });
  it("rejects expenses linked to a missing cost centre", () => {
    const invalid = { ...state, expenses: [{ ...state.expenses[0], costCenterId: "missing" }] };
    expect(parseOperationsState(JSON.stringify(invalid))).toBeNull();
  });
  it("scores risk and reports remaining project budget", () => {
    expect(riskScore(state.risks[0])).toBe(20);
    expect(projectBudgetVariance(state.projects[0])).toBe(7500);
  });
});
