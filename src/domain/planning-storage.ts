import {
  MONTHS,
  type ActualRevenueByMonth,
  type MonthName,
  type PlanningAssumptions,
  type ScenarioKey,
} from "./planning";

export const PLANNING_STORAGE_KEY = "enterpriseos:planning:v2";
export const LEGACY_PLANNING_STORAGE_KEY = "enterpriseos:planning:v1";
export const PLANNING_STATE_VERSION = 2;
export const DEFAULT_PLANNING_YEAR = 2026;
export const MIN_PLANNING_YEAR = 1900;
export const MAX_PLANNING_YEAR = 2100;

export type PlanningYearState = {
  assumptions: PlanningAssumptions;
  actualRevenue: ActualRevenueByMonth;
  scenario: ScenarioKey;
  customRevenueGrowthPercent: number;
};

export type SavedPlanningState = {
  schemaVersion: typeof PLANNING_STATE_VERSION;
  selectedYear: number;
  years: Record<string, PlanningYearState>;
  savedAt: string;
};

const ASSUMPTION_KEYS: (keyof PlanningAssumptions)[] = [
  "annualRevenueBudget",
  "costOfGoodsSoldPercent",
  "annualOperatingExpenses",
  "annualDepreciationAndAmortisation",
  "annualInterestExpense",
  "taxRatePercent",
];

export function isValidPlanningYear(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) &&
    value >= MIN_PLANNING_YEAR && value <= MAX_PLANNING_YEAR;
}

export function createEmptyActualRevenue(): Record<MonthName, null> {
  return Object.fromEntries(MONTHS.map((month) => [month, null])) as Record<MonthName, null>;
}

export function createPlanningYearState(
  assumptions: PlanningAssumptions,
  actualRevenue: ActualRevenueByMonth,
  scenario: ScenarioKey,
  customRevenueGrowthPercent = 0,
): PlanningYearState {
  return {
    assumptions: { ...assumptions },
    actualRevenue: Object.fromEntries(MONTHS.map((month) => [
      month,
      actualRevenue[month] ?? null,
    ])) as ActualRevenueByMonth,
    scenario,
    customRevenueGrowthPercent: Math.min(30, Math.max(-30, Number.isFinite(customRevenueGrowthPercent) ? customRevenueGrowthPercent : 0)),
  };
}

export function createInitialPlanningState(
  assumptions: PlanningAssumptions,
  actualRevenue: ActualRevenueByMonth,
  scenario: ScenarioKey,
  savedAt = "",
): SavedPlanningState {
  return {
    schemaVersion: PLANNING_STATE_VERSION,
    selectedYear: DEFAULT_PLANNING_YEAR,
    years: {
      [String(DEFAULT_PLANNING_YEAR)]: createPlanningYearState(assumptions, actualRevenue, scenario),
    },
    savedAt,
  };
}

/** Adds a clean fiscal year, carrying forward assumptions but never inventing actual revenue. */
export function addPlanningYear(state: SavedPlanningState, year: number): SavedPlanningState | null {
  if (!isValidPlanningYear(year) || state.years[String(year)] || Object.keys(state.years).length >= 100) return null;
  const template = state.years[String(state.selectedYear)];
  if (!template) return null;
  return {
    ...state,
    selectedYear: year,
    years: {
      ...state.years,
      [String(year)]: {
        assumptions: { ...template.assumptions },
        actualRevenue: createEmptyActualRevenue(),
        scenario: "base",
        customRevenueGrowthPercent: 0,
      },
    },
  };
}

export function parseSavedPlanningState(raw: string): SavedPlanningState | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;

    // Current multi-year format.
    if (value.schemaVersion === PLANNING_STATE_VERSION) {
      if (!isRecord(value.years) || !isValidPlanningYear(value.selectedYear)) return null;
      const entries = Object.entries(value.years);
      if (entries.length === 0 || entries.length > 100) return null;
      const years: Record<string, PlanningYearState> = {};
      for (const [yearKey, yearValue] of entries) {
        const year = Number(yearKey);
        if (!isValidPlanningYear(year) || String(year) !== yearKey) return null;
        const parsedYear = parsePlanningYearState(yearValue);
        if (!parsedYear) return null;
        years[yearKey] = parsedYear;
      }
      if (!years[String(value.selectedYear)]) return null;
      return {
        schemaVersion: PLANNING_STATE_VERSION,
        selectedYear: value.selectedYear,
        years,
        savedAt: validSavedAt(value.savedAt),
      };
    }

    // Legacy flat FY2026 format. Migrate it in memory without changing any
    // assumptions, monthly actuals, scenario or saved timestamp.
    if (value.schemaVersion === undefined || value.schemaVersion === 1) {
      const legacyYear = parsePlanningYearState(value);
      if (!legacyYear) return null;
      return {
        schemaVersion: PLANNING_STATE_VERSION,
        selectedYear: DEFAULT_PLANNING_YEAR,
        years: { [String(DEFAULT_PLANNING_YEAR)]: legacyYear },
        savedAt: validSavedAt(value.savedAt),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function serialisePlanningState(
  state: SavedPlanningState,
  savedAt = new Date().toISOString(),
): string {
  return JSON.stringify({
    schemaVersion: PLANNING_STATE_VERSION,
    selectedYear: state.selectedYear,
    years: state.years,
    savedAt,
  } satisfies SavedPlanningState);
}

function parsePlanningYearState(value: unknown): PlanningYearState | null {
  if (!isRecord(value) || !isRecord(value.assumptions) || !isRecord(value.actualRevenue)) return null;
  const assumptions = value.assumptions;
  if (ASSUMPTION_KEYS.some((key) =>
    typeof assumptions[key] !== "number" ||
    !Number.isFinite(assumptions[key]) ||
    (assumptions[key] as number) < 0,
  )) return null;
  if ((assumptions.costOfGoodsSoldPercent as number) > 100 ||
      (assumptions.taxRatePercent as number) > 100) return null;
  if (value.scenario !== "base" && value.scenario !== "upside" && value.scenario !== "downside" && value.scenario !== "custom") return null;
  const customRevenueGrowthPercent = value.customRevenueGrowthPercent === undefined ? 0 : value.customRevenueGrowthPercent;
  if (typeof customRevenueGrowthPercent !== "number" || !Number.isFinite(customRevenueGrowthPercent) || customRevenueGrowthPercent < -30 || customRevenueGrowthPercent > 30) return null;

  const actualRevenue: ActualRevenueByMonth = {};
  for (const month of MONTHS) {
    const amount = value.actualRevenue[month];
    if (amount !== null && amount !== undefined &&
        (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)) return null;
    actualRevenue[month as MonthName] = amount === undefined ? null : amount as number | null;
  }
  return {
    assumptions: Object.fromEntries(ASSUMPTION_KEYS.map((key) => [key, assumptions[key]])) as unknown as PlanningAssumptions,
    actualRevenue,
    scenario: value.scenario,
    customRevenueGrowthPercent,
  };
}

function validSavedAt(value: unknown): string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
