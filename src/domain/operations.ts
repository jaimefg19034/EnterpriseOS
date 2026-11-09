import { getReportingPeriodBounds, inclusiveDaysBetween, isDateWithinReportingPeriod, isValidISODate, isValidReportingPeriodCode } from "./reporting-periods";
export type OpportunityStage = "lead" | "qualified" | "proposal" | "won" | "lost";
export type Opportunity = { id: string; company: string; contact: string; value: number; stage: OpportunityStage; expectedClose: string };
export type ProjectStatus = "planned" | "active" | "onHold" | "completed";
export type Project = { id: string; name: string; owner: string; budget: number; spent: number; dueDate: string; status: ProjectStatus };
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type BusinessRisk = { id: string; title: string; owner: string; probability: number; impact: number; mitigation: string; status: "open" | "mitigating" | "closed" };
export type KpiDirection = "higher" | "lower";
export type BusinessKpi = { id: string; name: string; actual: number; target: number; unit: string; direction?: KpiDirection };
export type CostCenterBudget = { id: string; name: string; owner: string; budget: number; /** Unitemized manual spend for this period; must exclude expense records below. */ actualSpend: number; period: string };
export type ExpenseRecord = { id: string; date: string; description: string; supplier: string; category: string; costCenterId: string; amount: number; status: "paid" | "unpaid" };
export type OperationsState = { opportunities: Opportunity[]; projects: Project[]; risks: BusinessRisk[]; kpis: BusinessKpi[]; costCenters: CostCenterBudget[]; expenses: ExpenseRecord[] };
export const OPERATIONS_STORAGE_KEY = "enterpriseos:operations:v1";
export const EMPTY_OPERATIONS: OperationsState = { opportunities: [], projects: [], risks: [], kpis: [], costCenters: [], expenses: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}
function validMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000_000;
}
function validDate(value: unknown): value is string {
  return isValidISODate(value);
}
function validReportingPeriod(value: unknown): value is string {
  return typeof value === "string" && isValidReportingPeriodCode(value);
}
function validId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}
export function validateOperationsState(value: unknown): value is OperationsState {
  if (!isRecord(value)) return false;
  const { opportunities, projects, risks, kpis, costCenters = [], expenses = [] } = value;
  if (![opportunities, projects, risks, kpis, costCenters, expenses].every(Array.isArray)) return false;
  const ids: string[] = [];
  for (const row of opportunities as unknown[]) {
    if (!isRecord(row) || !validId(row.id) || !validText(row.company, 120) ||
      !(row.contact === "" || validText(row.contact, 120)) || !validMoney(row.value) ||
      !["lead", "qualified", "proposal", "won", "lost"].includes(String(row.stage)) ||
      !validDate(row.expectedClose)) return false;
    ids.push(row.id);
  }
  for (const row of projects as unknown[]) {
    if (!isRecord(row) || !validId(row.id) || !validText(row.name, 120) ||
      !validText(row.owner, 120) || !validMoney(row.budget) || !validMoney(row.spent) ||
      !validDate(row.dueDate) || !["planned", "active", "onHold", "completed"].includes(String(row.status))) return false;
    ids.push(row.id);
  }
  for (const row of risks as unknown[]) {
    if (!isRecord(row) || !validId(row.id) || !validText(row.title, 160) ||
      !validText(row.owner, 120) || !Number.isInteger(row.probability) || Number(row.probability) < 1 ||
      Number(row.probability) > 5 || !Number.isInteger(row.impact) || Number(row.impact) < 1 ||
      Number(row.impact) > 5 || !(row.mitigation === "" || validText(row.mitigation, 500)) ||
      !["open", "mitigating", "closed"].includes(String(row.status))) return false;
    ids.push(row.id);
  }
  for (const row of kpis as unknown[]) {
    if (!isRecord(row) || !validId(row.id) || !validText(row.name, 100) ||
      typeof row.actual !== "number" || !Number.isFinite(row.actual) ||
      typeof row.target !== "number" || !Number.isFinite(row.target) ||
      !validText(row.unit, 20) || (row.direction !== undefined && !["higher", "lower"].includes(String(row.direction)))) return false;
    ids.push(row.id);
  }
  for (const row of costCenters as unknown[]) {
    if (!isRecord(row) || !validId(row.id) || !validText(row.name, 100) || !validText(row.owner, 100) || !validMoney(row.budget) || !validMoney(row.actualSpend) || !validReportingPeriod(row.period)) return false;
    ids.push(row.id);
  }
  const costCenterPeriods = new Map((costCenters as unknown[]).filter(isRecord)
    .map((row) => [String(row.id), row.period]));
  for (const row of expenses as unknown[]) {
    if (!isRecord(row) || !validId(row.id) || !validDate(row.date) ||
      !validText(row.description, 160) || !validText(row.supplier, 120) ||
      !validText(row.category, 80) || !validId(row.costCenterId) ||
      !validMoney(row.amount) || row.amount <= 0 ||
      !["paid", "unpaid"].includes(String(row.status))) return false;
    const linkedPeriod = costCenterPeriods.get(row.costCenterId);
    if (typeof linkedPeriod !== "string" || !isDateWithinReportingPeriodCode(row.date, linkedPeriod)) return false;
    ids.push(row.id);
  }
  return new Set(ids).size === ids.length;
}
export function parseOperationsState(raw: string | null): OperationsState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return validateOperationsState(value) ? { ...value, costCenters: (value as OperationsState).costCenters ?? [], expenses: (value as OperationsState).expenses ?? [] } : null;
  } catch {
    return null;
  }
}
export function riskScore(risk: Pick<BusinessRisk, "probability" | "impact">): number {
  return Math.max(1, Math.min(5, Math.round(risk.probability))) * Math.max(1, Math.min(5, Math.round(risk.impact)));
}
export function weightedPipeline(opportunities: Opportunity[]): number {
  const probabilities: Record<OpportunityStage, number> = { lead: 0.1, qualified: 0.25, proposal: 0.6, won: 1, lost: 0 };
  return Math.round(opportunities.reduce((total, item) => total + item.value * probabilities[item.stage], 0) * 100) / 100;
}
export function projectBudgetVariance(project: Project): number {
  return Math.round((project.budget - project.spent) * 100) / 100;
}

export function kpiPerformance(kpi: BusinessKpi): { ratio: number; onTarget: boolean; variance: number } {
  const direction = kpi.direction ?? "higher";
  const onTarget = direction === "higher" ? kpi.actual >= kpi.target : kpi.actual <= kpi.target;
  let ratio: number;
  if (direction === "higher") {
    ratio = kpi.target === 0 ? (kpi.actual >= 0 ? 100 : 0) : Math.max(0, kpi.actual / kpi.target * 100);
  } else {
    ratio = kpi.target === 0 ? (kpi.actual <= 0 ? 100 : 0) : (kpi.actual <= 0 ? 150 : Math.max(0, kpi.target / kpi.actual * 100));
  }
  return { ratio: Math.min(150, ratio), onTarget, variance: Math.round((kpi.actual - kpi.target) * 100) / 100 };
}

export function costCenterPerformance(item: CostCenterBudget): { remaining: number; utilizationPercent: number; overBudget: boolean } {
  return { remaining: Math.round((item.budget - item.actualSpend) * 100) / 100, utilizationPercent: item.budget > 0 ? Math.round((item.actualSpend / item.budget) * 1000) / 10 : item.actualSpend > 0 ? 100 : 0, overBudget: item.actualSpend > item.budget };
}

export function costCenterActualSpend(item: CostCenterBudget, expenses: ExpenseRecord[]): number {
  const [yearText, period] = item.period.split("-");
  const bounds = getReportingPeriodBounds(Number(yearText), period as "FY" | "Q1" | "Q2" | "Q3" | "Q4");
  if (!bounds) return Math.round(item.actualSpend * 100) / 100;
  const recorded = expenses.reduce((total, expense) => {
    if (expense.costCenterId !== item.id || !isDateWithinReportingPeriod(expense.date, bounds)) return total;
    return total + expense.amount;
  }, 0);
  return Math.round((item.actualSpend + recorded) * 100) / 100;
}


export type CostCenterRunRate = {
  manualBaseline: number;
  recordedSpend: number;
  projectedSpend: number | null;
  elapsedPercent: number;
  projectedOverBudget: boolean;
};

/**
 * Projects current-period spend at the observed daily rate.
 * Only dated expense records are extrapolated; the manual baseline is excluded
 * because it has no date and cannot safely be annualised.
 */
export function costCenterRunRate(
  center: CostCenterBudget,
  expenses: ExpenseRecord[],
  asOfDate: string,
): CostCenterRunRate {
  const manualBaseline = Math.round((center.actualSpend + Number.EPSILON) * 100) / 100;
  const empty: CostCenterRunRate = { manualBaseline, recordedSpend: 0, projectedSpend: null, elapsedPercent: 0, projectedOverBudget: false };
  if (!isValidISODate(asOfDate)) return empty;

  const [yearText, period] = center.period.split("-");
  const bounds = getReportingPeriodBounds(Number(yearText), period as "FY" | "Q1" | "Q2" | "Q3" | "Q4");
  if (!bounds || !isDateWithinReportingPeriod(asOfDate, bounds)) return empty;

  const recordedSpend = Math.round(expenses.reduce((total, expense) => {
    if (expense.costCenterId !== center.id || !isDateWithinReportingPeriod(expense.date, { ...bounds, end: asOfDate })) return total;
    return total + expense.amount;
  }, 0) * 100) / 100;
  const elapsedDays = inclusiveDaysBetween(bounds.start, asOfDate);
  const elapsedPercent = Math.round((elapsedDays / bounds.totalDays) * 1000) / 10;
  const projectedDatedSpend = recordedSpend > 0
    ? Math.round((recordedSpend / (elapsedDays / bounds.totalDays) + Number.EPSILON) * 100) / 100
    : null;
  const projectedSpend = projectedDatedSpend === null
    ? null
    : Math.round((manualBaseline + projectedDatedSpend + Number.EPSILON) * 100) / 100;

  return {
    recordedSpend,
    projectedSpend,
    elapsedPercent,
    projectedOverBudget: projectedSpend !== null && projectedSpend > center.budget,
  };
}
