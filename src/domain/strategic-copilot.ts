import type { FinancialResults } from "@/domain/financials";
import { costCenterActualSpend, type OperationsState } from "@/domain/operations";
import type { Language } from "@/i18n/translations";

export type CopilotIntent = "expense" | "saving" | "investment" | "margin" | "profit" | "revenue" | "project" | "risk" | "kpi" | "overview" | "unknown";
export type CopilotAnalysis = { intent: CopilotIntent; response: string; calculations: Record<string, number>; matchedData: string[] };

const money = (value: number, language: Language) => new Intl.NumberFormat(language === "es" ? "es-ES" : "en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value);
const percent = (value: number, language: Language) => new Intl.NumberFormat(language === "es" ? "es-ES" : "en-IE", { style: "percent", maximumFractionDigits: 2 }).format(value / 100);
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function parseNumber(raw: string): number {
  const value = raw.replace(/\s/g, "");
  if (value.includes(",") && value.includes(".")) return Number(value.lastIndexOf(",") > value.lastIndexOf(".") ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, ""));
  if (/[,.]\d{3}$/.test(value)) return Number(value.replace(/[,.]/g, ""));
  return Number(value.replace(",", "."));
}

function extractAmount(question: string): number | null {
  const match = question.match(/(?:€\s*)?(\d[\d.,\s]*\d|\d)\s*(?:€|eur(?:os?)?|euros?)/i)
    ?? question.match(/\b(\d+(?:[.,]\d+)?)\s*(?:k|mil)\b/i);
  if (!match) return null;
  const parsed = parseNumber(match[1]);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return /\b(?:k|mil)\b/i.test(match[0]) ? parsed * 1000 : parsed;
}

function extractPercent(question: string): number | null {
  const match = question.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value >= 0 && value <= 1000 ? value : null;
}

function intentOf(question: string): CopilotIntent {
  const q = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(invert|inviert|inversion|invertir|investment|invest|roi|retorno|capital)\b/.test(q)) return "investment";
  if (/\b(margen|margin|subir margen|mejorar margen)\b/.test(q)) return "margin";
  if (/\b(ahorr|recort|reduc|optim|saving|save|cut|reduce)\b/.test(q)) return "saving";
  if (/\b(gasto|gastos|coste|costes|costo|costos|expense|expenses|spend|partida|proveedor|sobrecoste|perdiendo|peor partida|peor gasto)\b/.test(q)) return "expense";
  if (/\b(beneficio|beneficios|benefit|profit|ebitda|rentabilidad|net income)\b/.test(q)) return "profit";
  if (/\b(ingreso|ingresos|facturacion|ventas|revenue|sales)\b/.test(q)) return "revenue";
  if (/\b(proyecto|proyectos|project|projects)\b/.test(q)) return "project";
  if (/\b(riesgo|riesgos|risk|risks)\b/.test(q)) return "risk";
  if (/\b(kpi|indicador|indicadores|objetivo|target|rendimiento|performance)\b/.test(q)) return "kpi";
  if (/\b(resumen|situacion|estado|overview|analiza|analisis|empresa|negocio)\b/.test(q)) return "overview";
  return "unknown";
}

function topExpense(operations: OperationsState) {
  return [...operations.expenses].sort((a, b) => b.amount - a.amount)[0] ?? null;
}

export function analyzeCopilotQuestion(question: string, financials: FinancialResults, operations: OperationsState, language: Language): CopilotAnalysis {
  const es = language === "es";
  const q = question.trim();
  const intent = intentOf(q);
  const amount = extractAmount(q);
  const targetPercent = extractPercent(q);
  const calculations: Record<string, number> = {};
  const matchedData: string[] = [];
  const currentMargin = financials.ebitdaMarginPercent;
  const grossMarginRatio = financials.revenue > 0 ? financials.grossProfit / financials.revenue : 0;
  const actualExpenses = operations.expenses.reduce((sum, item) => sum + item.amount, 0);
  const topCenter = [...operations.costCenters].map(center => ({ center, actual: costCenterActualSpend(center, operations.expenses) })).sort((a,b) => b.actual-a.actual)[0];
  const largestExpense = topExpense(operations);

  if (!q) return { intent: "unknown", response: es ? "Escribe una pregunta para analizarla." : "Enter a question to analyse.", calculations, matchedData };

  if (intent === "investment") {
    if (amount === null) {
      const cap = Math.max(0, financials.ebitda) * 0.1;
      calculations.suggestedPilotCap = round(cap);
      return { intent, response: es
        ? `Tu EBITDA actual es ${money(financials.ebitda, language)} y el margen EBITDA es ${percent(currentMargin, language)}. Como límite inicial de prudencia, un piloto podría acotarse a ${money(cap, language)} (10% del EBITDA positivo). Dime el importe y el plazo para calcular su peso y el umbral de recuperación. El retorno no se puede afirmar sin ingresos incrementales y costes del proyecto.`
        : `Current EBITDA is ${money(financials.ebitda, language)} and EBITDA margin is ${percent(currentMargin, language)}. A cautious initial pilot cap would be ${money(cap, language)} (10% of positive EBITDA). Give me the amount and time horizon to calculate its weight and break-even threshold. ROI cannot be asserted without incremental revenue and project costs.`, calculations, matchedData: ["financials.ebitda", "financials.ebitdaMarginPercent"] };
    }
    const share = financials.ebitda > 0 ? amount / financials.ebitda * 100 : null;
    const breakEvenRevenue = grossMarginRatio > 0 ? amount / grossMarginRatio : null;
    const remainingEbitda = financials.ebitda - amount;
    calculations.investment = amount;
    calculations.investmentAsPercentOfEbitda = share ?? 0;
    calculations.ebitdaAfterExpense = remainingEbitda;
    if (breakEvenRevenue !== null) calculations.revenueToRecoverInvestment = round(breakEvenRevenue);
    matchedData.push("financials.ebitda", "financials.grossMarginPercent", "financials.revenue");
    return { intent, calculations, matchedData, response: es
      ? `Escenario para una inversión de ${money(amount, language)}:\n• Equivale al ${share === null ? "—" : percent(share, language)} del EBITDA actual (${money(financials.ebitda, language)}).\n• Si se contabilizara íntegramente como gasto del periodo, el EBITDA pasaría a ${money(remainingEbitda, language)}; si es CAPEX, el tratamiento contable y el efecto en EBITDA serían distintos.\n• Con el margen bruto actual del ${percent(financials.grossMarginPercent, language)}, harían falta ${breakEvenRevenue === null ? "—" : money(breakEvenRevenue, language)} de ventas incrementales para cubrir ese importe antes de otros costes.\nNo puedo calcular un ROI real sin estimar ventas incrementales, costes recurrentes y plazo.`
      : `Scenario for an investment of ${money(amount, language)}:\n• This equals ${share === null ? "—" : percent(share, language)} of current EBITDA (${money(financials.ebitda, language)}).\n• If fully expensed in this period, EBITDA would become ${money(remainingEbitda, language)}; CAPEX accounting would have a different EBITDA impact.\n• At the current gross margin of ${percent(financials.grossMarginPercent, language)}, incremental sales of ${breakEvenRevenue === null ? "—" : money(breakEvenRevenue, language)} would be needed to cover the amount before other costs.\nA real ROI needs incremental sales, recurring costs and a time horizon.` };
  }

  if (intent === "saving") {
    const rate = targetPercent ?? 10;
    const base = /\b(operativ|operating|opex)\b/.test(q.toLowerCase()) ? financials.operatingExpenses : financials.operatingExpenses + financials.costOfGoodsSold;
    const saving = round(base * rate / 100);
    const nextEbitda = round(financials.ebitda + saving);
    const nextMargin = financials.revenue > 0 ? nextEbitda / financials.revenue * 100 : 0;
    calculations.expenseBase = round(base); calculations.saving = saving; calculations.ebitdaAfterSaving = nextEbitda; calculations.marginAfterSaving = round(nextMargin);
    matchedData.push("financials.operatingExpenses", "financials.costOfGoodsSold", "financials.ebitda", "financials.revenue");
    return { intent, calculations, matchedData, response: es
      ? `Aplicando una reducción del ${percent(rate, language)} sobre ${/\b(operativ|operating|opex)\b/.test(q.toLowerCase()) ? "gastos operativos" : "coste de ventas + gastos operativos"}:\n• Base actual: ${money(base, language)}.\n• Ahorro estimado: ${money(saving, language)} por periodo.\n• EBITDA pasaría de ${money(financials.ebitda, language)} a ${money(nextEbitda, language)}.\n• Margen EBITDA pasaría de ${percent(currentMargin, language)} a ${percent(nextMargin, language)}.\nEs un escenario matemático, no un ahorro garantizado; revisa partidas para evitar recortar costes que generen ingresos.`
      : `Applying a ${percent(rate, language)} reduction to ${/\b(operativ|operating|opex)\b/.test(q.toLowerCase()) ? "operating expenses" : "COGS + operating expenses"}:\n• Current base: ${money(base, language)}.\n• Estimated saving: ${money(saving, language)} per period.\n• EBITDA would move from ${money(financials.ebitda, language)} to ${money(nextEbitda, language)}.\n• EBITDA margin would move from ${percent(currentMargin, language)} to ${percent(nextMargin, language)}.\nThis is a mathematical scenario, not a guaranteed saving; validate line items before cutting productive spend.` };
  }

  if (intent === "margin") {
    const increaseBy = targetPercent !== null && /\\b(subir|aumentar|mejorar|increase|raise|improve)\\b/.test(q.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase()) && !/\\b(al|hasta|to|target|objetivo)\\b/.test(q.toLowerCase());
    const goal = targetPercent === null ? currentMargin + 1 : increaseBy ? currentMargin * (1 + targetPercent / 100) : targetPercent;
    const gap = goal - currentMargin;
    const extraEbitda = round(financials.revenue * gap / 100);
    calculations.currentMargin = currentMargin; calculations.targetMargin = goal; calculations.additionalEbitdaRequired = Math.max(0, extraEbitda);
    matchedData.push("financials.revenue", "financials.ebitda", "financials.ebitdaMarginPercent");
    return { intent, calculations, matchedData, response: es
      ? `Tu margen EBITDA actual es ${percent(currentMargin, language)} (${money(financials.ebitda, language)} de EBITDA sobre ${money(financials.revenue, language)} de ingresos). ${gap > 0 ? `Para llegar al ${percent(goal, language)}, necesitas ${money(extraEbitda, language)} más de EBITDA por periodo, manteniendo los ingresos constantes.` : `Ya estás en el objetivo del ${percent(goal, language)} o por encima.`} ${financials.revenue > 0 ? `Eso equivale al ${percent(extraEbitda / financials.revenue * 100, language)} de los ingresos.` : "No hay ingresos registrados para calcular la sensibilidad."}`
      : `Current EBITDA margin is ${percent(currentMargin, language)} (${money(financials.ebitda, language)} EBITDA on ${money(financials.revenue, language)} revenue). ${gap > 0 ? `To reach ${percent(goal, language)}, you need ${money(extraEbitda, language)} more EBITDA per period, holding revenue constant.` : `You are already at or above the ${percent(goal, language)} target.`} ${financials.revenue > 0 ? `That equals ${percent(extraEbitda / financials.revenue * 100, language)} of revenue.` : "No revenue is recorded to calculate sensitivity."}` };
  }

  if (intent === "expense") {
    if (largestExpense) matchedData.push("operations.expenses");
    if (topCenter) matchedData.push("operations.costCenters");
    const centerText = topCenter ? `${topCenter.center.name}: ${money(topCenter.actual, language)} actual vs ${money(topCenter.center.budget, language)} budget (${money(topCenter.actual-topCenter.center.budget, language)} variance)` : "";
    const expenseText = largestExpense ? `${largestExpense.description} / ${largestExpense.category}: ${money(largestExpense.amount, language)}` : "";
    calculations.totalRecordedExpenses = round(actualExpenses);
    if (topCenter) calculations.topCostCenterSpend = round(topCenter.actual);
    if (largestExpense) calculations.largestExpense = round(largestExpense.amount);
    return { intent, calculations, matchedData, response: es
      ? `Datos actuales: gastos operativos P&L ${money(financials.operatingExpenses, language)}; coste de ventas ${money(financials.costOfGoodsSold, language)}; gastos detallados registrados en Operaciones ${money(actualExpenses, language)}. ${centerText ? "Centro con mayor gasto: " + centerText + ". " : "No hay centros de coste registrados. "}${expenseText ? "Mayor gasto individual: " + expenseText + "." : "No hay gastos individuales registrados."}`
      : `Current data: P&L operating expenses ${money(financials.operatingExpenses, language)}; COGS ${money(financials.costOfGoodsSold, language)}; detailed expenses recorded in Operations ${money(actualExpenses, language)}. ${centerText ? "Highest-spend cost centre: " + centerText + ". " : "No cost centres are recorded. "}${expenseText ? "Largest individual expense: " + expenseText + "." : "No individual expenses are recorded."}` };
  }

  if (intent === "profit" || intent === "revenue" || intent === "overview") {
    matchedData.push("financials");
    calculations.revenue = financials.revenue; calculations.ebitda = financials.ebitda; calculations.netIncome = financials.netIncome;
    const base = es
      ? `Ingresos: ${money(financials.revenue, language)}. Coste de ventas: ${money(financials.costOfGoodsSold, language)}. Gastos operativos: ${money(financials.operatingExpenses, language)}. EBITDA: ${money(financials.ebitda, language)} (${percent(currentMargin, language)} de margen). Beneficio neto: ${money(financials.netIncome, language)}.`
      : `Revenue: ${money(financials.revenue, language)}. COGS: ${money(financials.costOfGoodsSold, language)}. Operating expenses: ${money(financials.operatingExpenses, language)}. EBITDA: ${money(financials.ebitda, language)} (${percent(currentMargin, language)} margin). Net income: ${money(financials.netIncome, language)}.`;
    return { intent, calculations, matchedData, response: base };
  }

  if (intent === "project") {
    const open = operations.projects.filter(x => x.status !== "completed");
    const over = open.map(x => ({ ...x, variance: x.spent - x.budget })).filter(x => x.variance > 0).sort((a,b)=>b.variance-a.variance);
    calculations.openProjects = open.length;
    if (over[0]) { calculations.largestProjectOverrun = round(over[0].variance); matchedData.push("operations.projects"); }
    return { intent, calculations, matchedData, response: over[0]
      ? (es ? `El proyecto ${over[0].name} supera su presupuesto en ${money(over[0].variance, language)}: gasto ${money(over[0].spent, language)} frente a presupuesto ${money(over[0].budget, language)}. Hay ${over.length} proyectos abiertos excedidos.` : `${over[0].name} is ${money(over[0].variance, language)} over budget: spend ${money(over[0].spent, language)} vs budget ${money(over[0].budget, language)}. ${over.length} open projects are over budget.`)
      : (es ? `Hay ${open.length} proyectos abiertos y ninguno supera el presupuesto registrado.` : `There are ${open.length} open projects and none exceeds its recorded budget.`) };
  }

  if (intent === "risk") {
    const risks = operations.risks.filter(x => x.status !== "closed").sort((a,b)=>b.probability*b.impact-a.probability*a.impact);
    if (risks[0]) { calculations.highestRiskScore = risks[0].probability * risks[0].impact; matchedData.push("operations.risks"); }
    return { intent, calculations, matchedData, response: risks[0]
      ? (es ? `Riesgo abierto prioritario: ${risks[0].title}, ${risks[0].probability * risks[0].impact}/25. Responsable: ${risks[0].owner}. Mitigación: ${risks[0].mitigation || "sin documentar"}.` : `Top open risk: ${risks[0].title}, ${risks[0].probability * risks[0].impact}/25. Owner: ${risks[0].owner}. Mitigation: ${risks[0].mitigation || "not documented"}.`)
      : (es ? "No hay riesgos abiertos registrados." : "No open risks are recorded.") };
  }

  if (intent === "kpi") {
    const off = operations.kpis.filter(x => x.direction === "lower" ? x.actual > x.target : x.actual < x.target).sort((a,b) => (a.direction === "lower" ? a.target - a.actual : a.actual - a.target) - (b.direction === "lower" ? b.target - b.actual : b.actual - b.target));
    const first = off[0] ?? operations.kpis[0];
    if (first) matchedData.push("operations.kpis");
    return { intent, calculations, matchedData, response: first
      ? (es ? `KPI ${first.name}: actual ${first.actual} ${first.unit}; objetivo ${first.target} ${first.unit}. ${off.includes(first) ? "Está fuera de objetivo." : "No aparece fuera de objetivo en los datos actuales."}` : `KPI ${first.name}: actual ${first.actual} ${first.unit}; target ${first.target} ${first.unit}. ${off.includes(first) ? "It is off target." : "It is not currently flagged as off target."}`)
      : (es ? "No hay KPI registrados todavía." : "No KPIs are recorded yet.") };
  }

  const numeric = amount === null ? "" : ` ${money(amount, language)}`;
  return { intent: "unknown", calculations, matchedData, response: es
    ? `No puedo asociar con seguridad «${q}» a una métrica concreta. ${numeric ? "He detectado el importe " + numeric + "." : ""} Puedo calcular escenarios sobre ingresos, gastos, ahorro porcentual, inversión, EBITDA y margen, o analizar proyectos, riesgos y KPI. Prueba con una pregunta concreta como «¿qué pasa si invierto 3.000 €?» o «¿qué ahorro supone recortar un 10% de gastos operativos?». No inventaré datos si no existen en el workspace.`
    : `I cannot safely map “${q}” to a specific metric. ${numeric ? "I detected the amount " + numeric + "." : ""} I can calculate scenarios for revenue, expenses, percentage savings, investment, EBITDA and margin, or analyse projects, risks and KPIs. Try “What if I invest €3,000?” or “What would a 10% operating-cost cut save?” I will not invent data that is not in the workspace.` };
}
