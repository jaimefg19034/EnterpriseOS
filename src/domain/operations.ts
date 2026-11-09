export type OpportunityStage = "lead" | "qualified" | "proposal" | "won" | "lost";
export type Opportunity = { id: string; company: string; contact: string; value: number; stage: OpportunityStage; expectedClose: string };
export type ProjectStatus = "planned" | "active" | "onHold" | "completed";
export type Project = { id: string; name: string; owner: string; budget: number; spent: number; dueDate: string; status: ProjectStatus };
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type BusinessRisk = { id: string; title: string; owner: string; probability: number; impact: number; mitigation: string; status: "open" | "mitigating" | "closed" };
export type KpiDirection = "higher" | "lower";
export type BusinessKpi = { id: string; name: string; actual: number; target: number; unit: string; direction?: KpiDirection };
export type CostCenterBudget = { id: string; name: string; owner: string; budget: number; actualSpend: number; period: string };
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
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
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
    if (!isRecord(row) || !validId(row.id) || !validText(row.name, 100) || !validText(row.owner, 100) || !validMoney(row.budget) || !validMoney(row.actualSpend) || !/^\d{4}-(Q[1-4]|FY)$/.test(String(row.period))) return false;
    ids.push(row.id);
  }
  const costCenterIds = new Set((costCenters as unknown[]).filter(isRecord).map((row) => row.id));
  for (const row of expenses as unknown[]) {
    if (!isRecord(row) || !validId(row.id) || !validDate(row.date) || !validText(row.description, 160) || !validText(row.supplier, 120) || !validText(row.category, 80) || !validId(row.costCenterId) || !costCenterIds.has(row.costCenterId) || !validMoney(row.amount) || row.amount <= 0 || !["paid", "unpaid"].includes(String(row.status))) return false;
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
  const [year, period] = item.period.split("-");
  const recorded = expenses.reduce((total, expense) => {
    if (expense.costCenterId !== item.id || expense.date.slice(0, 4) !== year) return total;
    const quarter = `Q${Math.floor((Number(expense.date.slice(5, 7)) - 1) / 3) + 1}`;
    return period === "FY" || period === quarter ? total + expense.amount : total;
  }, 0);
  return Math.round((item.actualSpend + recorded) * 100) / 100;
}


export type CostCenterRunRate = {
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
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(asOfDate)) {
    return { recordedSpend: 0, projectedSpend: null, elapsedPercent: 0, projectedOverBudget: false };
  }
  const [yearText, period] = center.period.split("-");
  const year = Number(yearText);
  const quarter = period === "FY" ? 0 : Number(period.slice(1));
  const startMonth = quarter === 0 ? 1 : (quarter - 1) * 3 + 1;
  const endMonth = quarter === 0 ? 12 : startMonth + 2;
  const start = new Date(Date.UTC(year, startMonth - 1, 1));
  const end = new Date(Date.UTC(year, endMonth, 0));
  const asOf = new Date(`${asOfDate}T00:00:00.000Z`);
  if (asOf < start || asOf > end || Number.isNaN(asOf.getTime())) {
    return { recordedSpend: 0, projectedSpend: null, elapsedPercent: 0, projectedOverBudget: false };
  }
  const recordedSpend = Math.round(expenses.reduce((total, expense) => {
    if (expense.costCenterId !== center.id || expense.date.slice(0, 4) !== yearText) return total;
    const date = new Date(`${expense.date}T00:00:00.000Z`);
    return date >= start && date <= asOf ? total + expense.amount : total;
  }, 0) * 100) / 100;
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const elapsedDays = Math.round((asOf.getTime() - start.getTime()) / 86_400_000) + 1;
  const elapsedPercent = Math.round((elapsedDays / totalDays) * 1000) / 10;
  const projectedSpend = recordedSpend > 0
    ? Math.round((recordedSpend / (elapsedDays / totalDays) + Number.EPSILON) * 100) / 100
    : null;
  return {
    recordedSpend,
    projectedSpend,
    elapsedPercent,
    projectedOverBudget: projectedSpend !== null && projectedSpend > center.budget,
  };
}
