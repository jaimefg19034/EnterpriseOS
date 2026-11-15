import type { FinancialResults } from "./financials";
import { costCenterActualSpend, weightedPipeline, type OperationsState } from "./operations";
import type { Language } from "../i18n/translations";
import { calculateThreeStatements, DEFAULT_THREE_STATEMENT_ASSUMPTIONS, type ThreeStatementAssumptions } from "./three-statements";
import type { SavedPlanningState } from "./planning-storage";

export type CopilotIntent = "greeting" | "advice" | "expense" | "saving" | "investment" | "margin" | "profit" | "revenue" | "project" | "risk" | "kpi" | "cash" | "planning" | "overview" | "unknown";
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

function extractAmount(question: string, intent: CopilotIntent): number | null {
  const match = question.match(/(?:€\s*)?(\d[\d.,\s]*\d|\d)\s*(?:€|eur(?:os?)?|euros?)/i)
    ?? question.match(/\b(\d+(?:[.,]\d+)?)\s*(?:k|mil)\b/i)
    ?? (intent === "investment" || intent === "saving" ? question.match(/\b(\d[\d.,]*)\b(?!\s*%)/i) : null);
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

type IntentContext = { previousIntent?: CopilotIntent; previousQuestion?: string };
const normaliseText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9€%.,\s]/g, " ").replace(/\s+/g, " ").trim();
const INTENT_TERMS: Record<Exclude<CopilotIntent,"greeting"|"advice"|"unknown">, string[]> = {
 investment:["invert","inversion","invertir","contratar","contratacion","emplear","personal","capex","inversion","roi","retorno","rentabilidad","capital","investment","hire"],
 margin:["margen","margin","rentabilidad","eficiencia","bruto","ebitda margin"],
 saving:["ahorro","ahorrar","recortar","reducir","bajar","optimizar","eficiencia","cost saving","cut","reduce","lower"],
 expense:["gasto","gastos","coste","costes","costo","costos","partida","proveedor","sobrecoste","marketing","nomina","opex","spend","expense","cost","burn"],
 cash:["caja","liquidez","deuda","circulante","tesoreria","flujo","cash","liquidity","debt","working capital","cobros","pagos"],
 planning:["presupuesto","forecast","prevision","planificacion","escenario","plan anual","budget","planning"],
 profit:["beneficio","beneficios","ebitda","resultado","ganancia","perdida","profit","net income"],
 revenue:["ingreso","ingresos","facturacion","ventas","venta","revenue","sales","comercial"],
 project:["proyecto","proyectos","project","projects","entrega","hitos"],
 risk:["riesgo","riesgos","amenaza","mitigacion","risk","risks"],
 kpi:["kpi","indicador","indicadores","objetivo","target","rendimiento","performance","metricas"],
 overview:["resumen","situacion","estado","empresa","negocio","analiza","analisis","panorama","mes","rumbo","como vamos","como va"]
};
function scoreIntents(question: string): Record<string,number> {
 const q=normaliseText(question), tokens=q.split(" ");
 const scores:Record<string,number>={};
 for(const [intent,terms] of Object.entries(INTENT_TERMS)){
  let score=0;
  for(const term of terms){
   const t=normaliseText(term);
   if(q.includes(t)) score+=t.includes(" ")?3:2;
   else if(t.length>=5&&tokens.some(token=>token.startsWith(t.slice(0,Math.max(4,t.length-2))))) score+=1;
  }
  scores[intent]=score;
 }
 if(/\b(que harias|que harías|si fueras|director financiero|directora financiera|por donde empiezo|no se por donde|que me recomiendas|what would you do|where should i start)\b/.test(q)) scores.advice=8;
 if(/\b(hola|buenas|hey|hello|hi|que tal|como estas|buenos dias|buenas tardes|buenas noches)\b/.test(q)&&tokens.length<=7) scores.greeting=10;
 return scores;
}
function intentOf(question: string, context?: IntentContext): CopilotIntent {
 const q=normaliseText(question), scores=scoreIntents(question);
 if(scores.greeting) return "greeting";
 if(scores.advice) return "advice";
 const ranked=Object.entries(scores).filter(([key,value])=>key!=="greeting"&&key!=="advice"&&value>0).sort((a,b)=>b[1]-a[1]);
 if(ranked.length&&ranked[0][1]>=2) return ranked[0][0] as CopilotIntent;
 if(context?.previousIntent&&/\b(y ahora|ahora|y entonces|con eso|en ese caso|y si|que tal ahora|como lo ves|what about now|and now|in that case)\b/.test(q)) return context.previousIntent;
 return "unknown";
}

function topExpense(operations: OperationsState) {
  return [...operations.expenses].sort((a, b) => b.amount - a.amount)[0] ?? null;
}

export function analyzeCopilotQuestion(question: string, financials: FinancialResults, operations: OperationsState, language: Language, workspace: { planning: SavedPlanningState | null; statementAssumptions: ThreeStatementAssumptions | null } = { planning: null, statementAssumptions: null }, context?: IntentContext): CopilotAnalysis {
  const es = language === "es";
  const q = question.trim();
  const intent = intentOf(q, context);
  const amount = extractAmount(q, intent);
  const targetPercent = extractPercent(q);
  const calculations: Record<string, number> = {};
  const matchedData: string[] = [];
  const currentMargin = financials.ebitdaMarginPercent;
  const grossMarginRatio = financials.revenue > 0 ? financials.grossProfit / financials.revenue : 0;
  const actualExpenses = operations.expenses.reduce((sum, item) => sum + item.amount, 0);
  const topCenter = [...operations.costCenters].map(center => ({ center, actual: costCenterActualSpend(center, operations.expenses) })).sort((a,b) => b.actual-a.actual)[0];
  const largestExpense = topExpense(operations);

  if (!q) return { intent: "unknown", response: es ? "Escribe una pregunta para analizarla." : "Enter a question to analyse.", calculations, matchedData };
  if (intent === "greeting") {
    const openProjects=operations.projects.filter(x=>x.status!=="completed").length;
    const openDeals=operations.opportunities.filter(x=>!["won","lost"].includes(x.stage));
    const pipeline=weightedPipeline(openDeals);
    const overdueRisks=operations.risks.filter(x=>x.status!=="closed");
    matchedData.push("financials","operations.projects","operations.opportunities","operations.risks");
    calculations.revenue=financials.revenue; calculations.ebitda=financials.ebitda; calculations.openProjects=openProjects; calculations.openOpportunities=openDeals.length; calculations.weightedPipeline=pipeline;
    return {intent,calculations,matchedData,response:es
      ? `¡Hola! Todo listo. Con los últimos datos cargados, la empresa registra ${money(financials.revenue,language)} de ingresos y ${money(financials.ebitda,language)} de EBITDA (${percent(currentMargin,language)} de margen). Hay ${openProjects} proyectos abiertos, ${openDeals.length} oportunidades comerciales abiertas y ${overdueRisks.length} riesgos sin cerrar. La cartera ponderada asciende a ${money(pipeline,language)}; no la cuento como ingreso reconocido. ¿Qué área quieres revisar primero?`
      : `Hello. I have the latest workspace figures: ${money(financials.revenue,language)} revenue and ${money(financials.ebitda,language)} EBITDA (${percent(currentMargin,language)} margin). There are ${openProjects} open projects, ${openDeals.length} open sales opportunities and ${overdueRisks.length} unresolved risks. Weighted pipeline is ${money(pipeline,language)}, not recognised revenue. What would you like to review first?`};
  }
  if (intent === "advice" || (intent === "overview" && /director|por donde empiezo|que harias|recomiend|prioridad|rumbo/.test(normaliseText(q)))) {
    const openProjects=operations.projects.filter(x=>x.status!=="completed");
    const overruns=openProjects.map(x=>({...x,variance:x.spent-x.budget})).filter(x=>x.variance>0).sort((a,b)=>b.variance-a.variance);
    const openRisks=operations.risks.filter(x=>x.status!=="closed").sort((a,b)=>b.probability*b.impact-a.probability*b.impact);
    const offKpis=operations.kpis.filter(x=>x.direction==="lower"?x.actual>x.target:x.actual<x.target);
    const totalRecorded=operations.expenses.reduce((sum,x)=>sum+x.amount,0);
    const pipeline=weightedPipeline(operations.opportunities.filter(x=>!["won","lost"].includes(x.stage)));
    const gross=financials.revenue>0?financials.grossProfit/financials.revenue*100:0;
    calculations.revenue=financials.revenue; calculations.ebitda=financials.ebitda; calculations.ebitdaMargin=currentMargin; calculations.grossMargin=gross; calculations.recordedExpenses=totalRecorded; calculations.openProjects=openProjects.length; calculations.projectOverruns=overruns.length; calculations.openRisks=openRisks.length; calculations.offTargetKpis=offKpis.length; calculations.weightedPipeline=pipeline;
    matchedData.push("financials","operations.expenses","operations.projects","operations.risks","operations.kpis","operations.opportunities");
    const priority=financials.ebitda<0?(es?"recuperar EBITDA y entender qué costes fijos no están cubiertos":"restore positive EBITDA and identify uncovered fixed costs"):overruns[0]?(es?`corregir el sobrecoste de ${overruns[0].name}`:`address the overrun in ${overruns[0].name}`):openRisks[0]?(es?`mitigar el riesgo ${openRisks[0].title}`:`mitigate the risk ${openRisks[0].title}`):offKpis[0]?(es?`recuperar el KPI ${offKpis[0].name}`:`recover KPI ${offKpis[0].name}`):(es?"validar la calidad y evolución mensual de los datos":"validate monthly data quality and trend");
    return {intent:"advice",calculations,matchedData,response:es
      ? `Si estuviera dirigiendo finanzas, empezaría por proteger caja y margen, no por recortar a ciegas. La foto actual es: ingresos ${money(financials.revenue,language)}, margen bruto ${percent(gross,language)}, EBITDA ${money(financials.ebitda,language)} (${percent(currentMargin,language)}), gastos detallados registrados ${money(totalRecorded,language)} y cartera comercial ponderada ${money(pipeline,language)}. En operaciones hay ${openProjects.length} proyectos abiertos, ${overruns.length} con sobrecoste, ${openRisks.length} riesgos abiertos y ${offKpis.length} KPI fuera de objetivo.\n\nMi primera prioridad sería ${priority}. Después: (1) conciliar gastos detallados con el P&L para evitar duplicidades; (2) revisar semanalmente caja, cobros y pagos; (3) exigir responsable, fecha y resultado medible a cada proyecto o KPI crítico. No puedo afirmar una tendencia mensual sin una serie histórica comparable: estos datos describen el estado actual, no prueban si mejora o empeora.`
      : `As finance lead, I would protect cash and margin before making indiscriminate cuts. Current position: revenue ${money(financials.revenue,language)}, gross margin ${percent(gross,language)}, EBITDA ${money(financials.ebitda,language)} (${percent(currentMargin,language)}), detailed recorded expenses ${money(totalRecorded,language)}, and weighted sales pipeline ${money(pipeline,language)}. Operations show ${openProjects.length} open projects, ${overruns.length} over budget, ${openRisks.length} open risks and ${offKpis.length} off-target KPIs.\n\nMy first priority would be to ${priority}. Then: (1) reconcile detailed expenses to the P&L to avoid double counting; (2) review cash, collections and payments weekly; (3) give every critical project or KPI an owner, deadline and measurable outcome. I cannot claim a monthly trend without comparable historical data: these figures describe the current state, not whether it is improving or deteriorating.`};
  }
  const multiHire=normaliseText(q).match(/(?:contrat|hire|employ)[a-z ]{0,35}(\d[\d.,]*)\s*(?:€|eur|euros?)/);
  const marketingCut=normaliseText(q).match(/(?:marketing|publicidad|ads)[^%]{0,45}(\d+(?:[.,]\d+)?)\s*%|(?:recort|reduc|cut)[^%]{0,35}(\d+(?:[.,]\d+)?)\s*%[^.]{0,35}(?:marketing|publicidad|ads)/);
  if (multiHire || marketingCut) {
    const hireCost=multiHire?parseNumber(multiHire[1]):0;
    const rate=marketingCut?Number((marketingCut[1]??marketingCut[2]).replace(",",".")):0;
    const marketingSpend=operations.expenses.filter(x=>/marketing|publicidad|ads|advertising/i.test(x.category+" "+x.description)).reduce((sum,x)=>sum+x.amount,0);
    const saving=marketingSpend*rate/100;
    const nextEbitda=financials.ebitda-hireCost+saving;
    calculations.hireMonthlyCost=hireCost; calculations.marketingRecordedSpend=marketingSpend; calculations.marketingSaving=saving; calculations.ebitdaAfterCombinedScenario=nextEbitda;
    matchedData.push("financials.ebitda","operations.expenses");
    return {intent:"advice",calculations,matchedData,response:es
      ? `He separado los dos escenarios para no mezclar hipótesis.\\n• Contratar por ${money(hireCost,language)} al mes: si se trata de coste laboral mensual adicional y se mantiene el resto constante, el EBITDA mensual bajaría de ${money(financials.ebitda,language)} a ${money(financials.ebitda-hireCost,language)}. No he añadido cargas sociales porque no están especificadas.\\n• Reducir marketing un ${rate}%: el gasto de marketing identificado en los registros es ${money(marketingSpend,language)}; el ahorro matemático sería ${money(saving,language)} y el EBITDA subiría a ${money(financials.ebitda+saving,language)}. Si no hay gastos de marketing registrados, el ahorro calculable es cero, no una estimación inventada.\\n• Si aplicases ambas medidas, el EBITDA quedaría en ${money(nextEbitda,language)} por periodo comparable. Comprueba que P&L y gastos operativos usan la misma periodicidad antes de tomar la decisión.`
      : `I separated the alternatives to avoid mixing assumptions.\\n• Hire at ${money(hireCost,language)} per month: treating this as an additional monthly employment cost, EBITDA would fall from ${money(financials.ebitda,language)} to ${money(financials.ebitda-hireCost,language)}. Employer taxes are excluded because they were not specified.\\n• Cut marketing by ${rate}%: marketing spend identified in the records is ${money(marketingSpend,language)}; the mathematical saving is ${money(saving,language)} and EBITDA would rise to ${money(financials.ebitda+saving,language)}. If no marketing expenses are recorded, the calculable saving is zero, not an invented estimate.\\n• If both were applied, EBITDA would be ${money(nextEbitda,language)} per comparable period. Confirm P&L and expense records use the same period before deciding.`};
  }


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
    const rate = targetPercent ?? (amount === null ? 10 : 0);
    const operatingOnly = /\b(operativ\w*|operating|opex)\b/.test(q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
    const base = operatingOnly ? financials.operatingExpenses : financials.operatingExpenses + financials.costOfGoodsSold;
    const requestedSaving = targetPercent !== null ? base * rate / 100 : amount ?? base * 0.1;
    const saving = round(Math.min(base, requestedSaving));
    const nextEbitda = round(financials.ebitda + saving);
    const nextMargin = financials.revenue > 0 ? nextEbitda / financials.revenue * 100 : 0;
    calculations.expenseBase = round(base); calculations.saving = saving; calculations.savingRatePercent = base > 0 ? round(saving / base * 100) : 0; calculations.ebitdaAfterSaving = nextEbitda; calculations.marginAfterSaving = round(nextMargin);
    matchedData.push("financials.operatingExpenses", "financials.costOfGoodsSold", "financials.ebitda", "financials.revenue");
    const basisLabel = operatingOnly ? (es ? "gastos operativos" : "operating expenses") : (es ? "coste de ventas + gastos operativos" : "COGS + operating expenses");
    const scenarioLabel = targetPercent !== null ? (es ? "una reducción del " + percent(rate, language) : "a " + percent(rate, language) + " reduction") : (es ? "un recorte fijo de " + money(saving, language) : "a fixed cut of " + money(saving, language));
    return { intent, calculations, matchedData, response: es
      ? "Escenario de " + scenarioLabel + " sobre " + basisLabel + ":\n• Base actual: " + money(base, language) + ".\n• Ahorro calculado: " + money(saving, language) + " (" + percent(calculations.savingRatePercent, language) + " de la base) por periodo.\n• EBITDA pasaría de " + money(financials.ebitda, language) + " a " + money(nextEbitda, language) + ".\n• Margen EBITDA pasaría de " + percent(currentMargin, language) + " a " + percent(nextMargin, language) + ".\nEs una simulación matemática, no un ahorro garantizado; valida las partidas antes de recortar gasto productivo."
      : "Scenario for " + scenarioLabel + " in " + basisLabel + ":\n• Current base: " + money(base, language) + ".\n• Calculated saving: " + money(saving, language) + " (" + percent(calculations.savingRatePercent, language) + " of the base) per period.\n• EBITDA would move from " + money(financials.ebitda, language) + " to " + money(nextEbitda, language) + ".\n• EBITDA margin would move from " + percent(currentMargin, language) + " to " + percent(nextMargin, language) + ".\nThis is a mathematical simulation, not a guaranteed saving; validate line items before cutting productive spend." };
  }

  if (intent === "margin") {
    const normalisedQuestion = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const increaseBy = targetPercent !== null && /\b(subir|aumentar|mejorar|increase|raise|improve)\b/.test(normalisedQuestion) && !/\b(al|hasta|to|target|objetivo)\b/.test(normalisedQuestion);
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

  if (intent === "revenue" && (targetPercent !== null || amount !== null)) {
    const increase = targetPercent !== null ? financials.revenue * targetPercent / 100 : amount ?? 0;
    const newRevenue = round(financials.revenue + increase);
    const addedEbitda = round(increase * grossMarginRatio);
    const newEbitda = round(financials.ebitda + addedEbitda);
    const newMargin = newRevenue > 0 ? newEbitda / newRevenue * 100 : 0;
    calculations.revenueIncrease = round(increase); calculations.revenueAfterScenario = newRevenue; calculations.ebitdaAfterScenario = newEbitda; calculations.marginAfterScenario = round(newMargin);
    matchedData.push("financials.revenue", "financials.grossMarginPercent", "financials.ebitda");
    return { intent, calculations, matchedData, response: es
      ? "Si los ingresos aumentan " + (targetPercent !== null ? percent(targetPercent, language) : money(increase, language)) + ": facturación pasaría de " + money(financials.revenue, language) + " a " + money(newRevenue, language) + ". Manteniendo el margen bruto actual (" + percent(financials.grossMarginPercent, language) + ") y los gastos operativos constantes, el EBITDA estimado pasaría de " + money(financials.ebitda, language) + " a " + money(newEbitda, language) + " y el margen EBITDA sería " + percent(newMargin, language) + ". Es una sensibilidad, no una previsión."
      : "If revenue increases by " + (targetPercent !== null ? percent(targetPercent, language) : money(increase, language)) + ": sales would move from " + money(financials.revenue, language) + " to " + money(newRevenue, language) + ". Holding current gross margin (" + percent(financials.grossMarginPercent, language) + ") and operating expenses constant, estimated EBITDA would move from " + money(financials.ebitda, language) + " to " + money(newEbitda, language) + " and EBITDA margin would be " + percent(newMargin, language) + ". This is a sensitivity, not a forecast." };
  }

  if (intent === "profit" || intent === "revenue" || intent === "overview") {
    matchedData.push("financials");
    calculations.revenue = financials.revenue; calculations.ebitda = financials.ebitda; calculations.netIncome = financials.netIncome;
    const pipeline = weightedPipeline(operations.opportunities.filter(x => !["won", "lost"].includes(x.stage)));
    calculations.weightedOpenPipeline = pipeline;
    matchedData.push("operations.opportunities");
    const base = es
      ? `Ingresos reconocidos del modelo financiero: ${money(financials.revenue, language)}. Coste de ventas: ${money(financials.costOfGoodsSold, language)}. Gastos operativos: ${money(financials.operatingExpenses, language)}. EBITDA: ${money(financials.ebitda, language)} (${percent(currentMargin, language)} de margen). Beneficio neto: ${money(financials.netIncome, language)}. Además, la cartera comercial abierta ponderada es ${money(pipeline, language)}; es pipeline, no facturación reconocida.`
      : `Recognised revenue in the financial model: ${money(financials.revenue, language)}. COGS: ${money(financials.costOfGoodsSold, language)}. Operating expenses: ${money(financials.operatingExpenses, language)}. EBITDA: ${money(financials.ebitda, language)} (${percent(currentMargin, language)} margin). Net income: ${money(financials.netIncome, language)}. Separately, weighted open sales pipeline is ${money(pipeline, language)}; this is pipeline, not recognised revenue.`;
    return { intent, calculations, matchedData, response: base };
  }

  if (intent === "cash") {
    const statements = calculateThreeStatements(financials, workspace.statementAssumptions ?? DEFAULT_THREE_STATEMENT_ASSUMPTIONS);
    const bs = statements.balanceSheet;
    const cf = statements.cashFlow;
    calculations.closingCash = round(cf.closingCash);
    calculations.freeCashFlow = round(cf.freeCashFlow);
    calculations.netWorkingCapital = round(bs.netWorkingCapital);
    calculations.netDebt = round(bs.netDebt);
    if (bs.currentRatio !== null) calculations.currentRatio = bs.currentRatio;
    matchedData.push("financials", "threeStatementAssumptions");
    return { intent, calculations, matchedData, response: es
      ? `Proyección del modelo de tres estados con las hipótesis actuales:\n• Caja final: ${money(cf.closingCash, language)}.\n• Flujo de caja libre: ${money(cf.freeCashFlow, language)}.\n• Capital circulante neto: ${money(bs.netWorkingCapital, language)}.\n• Deuda neta: ${money(bs.netDebt, language)}.\n• Ratio corriente: ${bs.currentRatio === null ? "no disponible" : bs.currentRatio.toFixed(2) + "x"}.\n${workspace.statementAssumptions ? "He usado las hipótesis editadas en 3 estados." : "Aún no has modificado las hipótesis de 3 estados; se aplican los valores demo iniciales."}`
      : `Three-statement projection using current assumptions:\n• Closing cash: ${money(cf.closingCash, language)}.\n• Free cash flow: ${money(cf.freeCashFlow, language)}.\n• Net working capital: ${money(bs.netWorkingCapital, language)}.\n• Net debt: ${money(bs.netDebt, language)}.\n• Current ratio: ${bs.currentRatio === null ? "not available" : bs.currentRatio.toFixed(2) + "x"}.\n${workspace.statementAssumptions ? "Using the assumptions edited in 3 statements." : "Three-statement assumptions have not been edited; initial demo defaults are used."}` };
  }

  if (intent === "planning") {
    const plan = workspace.planning?.years[String(workspace.planning.selectedYear)];
    if (!plan) return { intent, calculations, matchedData, response: es ? "Todavía no hay datos de planificación disponibles. Abre Presupuestos y escenarios para cargar el plan y vuelve a preguntarme." : "No planning data is available yet. Open Budget & scenarios to load the plan, then ask again." };
    const budget = plan.assumptions.annualRevenueBudget;
    let actual = 0;
    for (const value of Object.values(plan.actualRevenue)) {
      if (typeof value === "number") actual += value;
    }
    const budgetEbitda = budget * (1 - plan.assumptions.costOfGoodsSoldPercent / 100) - plan.assumptions.annualOperatingExpenses;
    calculations.selectedPlanningYear = workspace.planning?.selectedYear ?? 0;
    calculations.annualRevenueBudget = budget;
    calculations.actualRevenueEntered = round(actual);
    calculations.budgetEbitda = round(budgetEbitda);
    matchedData.push("planning.selectedYear", "planning.assumptions", "planning.actualRevenue");
    return { intent, calculations, matchedData, response: es
      ? `Plan ${workspace.planning?.selectedYear}: presupuesto anual de ingresos ${money(budget, language)}; ingresos reales introducidos mes a mes ${money(actual, language)}; crecimiento de escenario ${plan.scenario === "custom" ? plan.customRevenueGrowthPercent + "%" : plan.scenario}. Con el presupuesto de coste de ventas del ${percent(plan.assumptions.costOfGoodsSoldPercent, language)} y gastos operativos anuales de ${money(plan.assumptions.annualOperatingExpenses, language)}, el EBITDA presupuestado simplificado sería ${money(budgetEbitda, language)} antes de D&A e intereses.`
      : `Plan ${workspace.planning?.selectedYear}: annual revenue budget ${money(budget, language)}; actual revenue entered month by month ${money(actual, language)}; scenario growth ${plan.scenario === "custom" ? plan.customRevenueGrowthPercent + "%" : plan.scenario}. With budget COGS at ${percent(plan.assumptions.costOfGoodsSoldPercent, language)} and annual operating expenses of ${money(plan.assumptions.annualOperatingExpenses, language)}, simplified budget EBITDA would be ${money(budgetEbitda, language)} before D&A and interest.` };
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
