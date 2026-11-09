import { describe, expect, it } from "vitest";
import { kpiPerformance, parseOperationsState, projectBudgetVariance, riskScore, weightedPipeline, type OperationsState } from "./operations";
const state: OperationsState = {
  opportunities: [
    { id: "o1", company: "Northstar", contact: "Alex", value: 10000, stage: "proposal", expectedClose: "2026-12-01" },
    { id: "o2", company: "Acme", contact: "", value: 5000, stage: "lost", expectedClose: "2026-12-10" },
  ],
  projects: [{ id: "p1", name: "ERP rollout", owner: "Sam", budget: 20000, spent: 12500, dueDate: "2026-12-31", status: "active" }],
  risks: [{ id: "r1", title: "Supplier delay", owner: "Lee", probability: 4, impact: 5, mitigation: "Second source", status: "mitigating" }],
  kpis: [{ id: "k1", name: "Retention", actual: 92, target: 95, unit: "%" }],
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
  it("calculates probability-weighted pipeline without lost deals", () => {
    expect(weightedPipeline(state.opportunities)).toBe(6000);
  });
  it("evaluates higher-is-better and lower-is-better KPIs correctly", () => {
    expect(kpiPerformance(state.kpis[0]).onTarget).toBe(false);
    expect(kpiPerformance({ ...state.kpis[0], actual: 4, target: 5, direction: "lower" })).toMatchObject({ onTarget: true, ratio: 125 });
    expect(kpiPerformance({ ...state.kpis[0], actual: 7, target: 5, direction: "lower" }).onTarget).toBe(false);
    expect(kpiPerformance({ ...state.kpis[0], actual: 0, target: 0, direction: "lower" }).onTarget).toBe(true);
  });
  it("scores risk and reports remaining project budget", () => {
    expect(riskScore(state.risks[0])).toBe(20);
    expect(projectBudgetVariance(state.projects[0])).toBe(7500);
  });
});
