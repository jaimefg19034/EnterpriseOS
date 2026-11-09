import { MONTHS, type ActualRevenueByMonth, type MonthName, type PlanningAssumptions, type ScenarioKey } from "./planning";

export const PLANNING_STORAGE_KEY = "enterpriseos:planning:v1";

export type SavedPlanningState = {
  assumptions: PlanningAssumptions;
  actualRevenue: ActualRevenueByMonth;
  scenario: ScenarioKey;
  savedAt: string;
};

export function parseSavedPlanningState(raw: string): SavedPlanningState | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !isRecord(value.assumptions) || !isRecord(value.actualRevenue)) return null;
    const a = value.assumptions;
    const keys: (keyof PlanningAssumptions)[] = ["annualRevenueBudget", "costOfGoodsSoldPercent", "annualOperatingExpenses", "annualDepreciationAndAmortisation", "annualInterestExpense", "taxRatePercent"];
    if (keys.some((key) => typeof a[key] !== "number" || !Number.isFinite(a[key]) || (a[key] as number) < 0)) return null;
    if ((a.costOfGoodsSoldPercent as number) > 100 || (a.taxRatePercent as number) > 100) return null;
    if (value.scenario !== "base" && value.scenario !== "upside" && value.scenario !== "downside") return null;
    const actualRevenue: ActualRevenueByMonth = {};
    for (const month of MONTHS) {
      const amount = value.actualRevenue[month];
      if (amount !== null && amount !== undefined && (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)) return null;
      actualRevenue[month as MonthName] = amount === undefined ? null : amount as number | null;
    }
    return {
      assumptions: Object.fromEntries(keys.map((key) => [key, a[key]])) as unknown as PlanningAssumptions,
      actualRevenue,
      scenario: value.scenario as ScenarioKey,
      savedAt: typeof value.savedAt === "string" && Number.isFinite(Date.parse(value.savedAt)) ? value.savedAt : "",
    };
  } catch {
    return null;
  }
}

export function serialisePlanningState(
  assumptions: PlanningAssumptions,
  actualRevenue: ActualRevenueByMonth,
  scenario: ScenarioKey,
  savedAt = new Date().toISOString(),
): string {
  return JSON.stringify({ assumptions, actualRevenue, scenario, savedAt } satisfies SavedPlanningState);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
