import type { FinancialResults } from "./financials";
import { costCenterActualSpend, weightedPipeline, type OperationsState } from "./operations";
import type { Language } from "../i18n/translations";
import { calculateThreeStatements, DEFAULT_THREE_STATEMENT_ASSUMPTIONS, type ThreeStatementAssumptions } from "./three-statements";
import type { SavedPlanningState } from "./planning-storage";
import { calculateCashForecast, type CashForecastWeekInput } from "./cash-forecast";
import { calculateInvoiceAgeing, summarizeInvoices, type WorkingCapitalInvoice } from "./working-capital";

export type CopilotIntent = "greeting" | "social" | "advice" | "expense" | "saving" | "investment" | "margin" | "profit" | "revenue" | "project" | "risk" | "kpi" | "cash" | "workingCapital" | "planning" | "overview" | "unknown";
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
const INTENT_TERMS: Record<Exclude<CopilotIntent,"greeting"|"social"|"advice"|"unknown">, string[]> = {
 investment:["invert","invierto","invierta","inversion","invertir","contratar","contratacion","emplear","personal","capex","inversion","roi","retorno","rentabilidad","capital","investment","hire"],
 margin:["margen","margin","rentabilidad","eficiencia","bruto","ebitda margin"],
 saving:["ahorro","ahorrar","recortar","reducir","bajar","optimizar","eficiencia","cost saving","cut","reduce","lower"],
 expense:["gasto","gastos","coste","costes","costo","costos","partida","proveedor","sobrecoste","marketing","nomina","opex","spend","expense","cost","burn"],
 cash:["caja","liquidez","deuda","tesoreria","flujo","cash","liquidity","debt","cash flow"],
 workingCapital:["factura","facturas","cobro","cobros","pago","pagos","vencido","vencida","clientes","proveedores","cuentas por cobrar","cuentas por pagar","working capital","capital circulante","receivable","payable","invoice","invoices"],
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
   else if(t.length>=5&&tokens.some(token=>token.startsWith(t.slice(0,Math.max(4,t.length-2))))) score+=2;
  }
  scores[intent]=score;
 }
 if(/\b(que harias|que harías|si fueras|director financiero|directora financiera|por donde empiezo|no se por donde|que me recomiendas|what would you do|where should i start)\b/.test(q)) scores.advice=8;
 if(/\b(recort\w*|reduc\w*|ahorr\w*|baj\w*|cut\w*|lower\w*)\b/.test(q)) scores.saving=(scores.saving??0)+4;
 if(/\b(inviert\w*|invert\w*|invest\w*)\b/.test(q)) scores.investment=(scores.investment??0)+4;
 if(/\b(hola|buenas|hey|hello|hi|que tal|como estas|buenos dias|buenas tardes|buenas noches)\b/.test(q)&&tokens.length<=7) scores.greeting=10;
 if(/\b(como ves|como va|que tal va|como vamos|how are we doing|how does it look|what is your view)\b/.test(q)) scores.overview=(scores.overview??0)+3;
 if(/\b(gracias|thank you|thanks|perfecto|genial|vale|ok|okay|entiendo|de acuerdo|muy bien|great|got it|and you|y tu)\b/.test(q)&&tokens.length<=8) scores.social=9;
 return scores;
}
function intentOf(question: string, context?: IntentContext): CopilotIntent {
 const q=normaliseText(question), scores=scoreIntents(question);
 if(scores.greeting) return "greeting";
 if(scores.advice) return "advice";
 if(context?.previousIntent&&/\b(y ahora|ahora|y entonces|con eso|en ese caso|y si|que tal ahora|como lo ves|what about now|and now|in that case)\b/.test(q)) return context.previousIntent;
 const ranked=Object.entries(scores).filter(([key,value])=>key!=="greeting"&&key!=="advice"&&value>0).sort((a,b)=>b[1]-a[1]);
 if(ranked.length&&ranked[0][1]>=2) return ranked[0][0] as CopilotIntent;
 return "unknown";
}

function localISODate(): string { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function topExpense(operations: OperationsState) {
  return [...operations.expenses].sort((a, b) => b.amount - a.amount)[0] ?? null;
}

export function analyzeCopilotQuestion(question: string, financials: FinancialResults, operations: OperationsState, language: Language, workspace: { planning: SavedPlanningState | null; statementAssumptions: ThreeStatementAssumptions | null; cashForecastWeeks?: CashForecastWeekInput[]; workingCapitalInvoices?: WorkingCapitalInvoice[] } = { planning: null, statementAssumptions: null }, context?: IntentContext): CopilotAnalysis {
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
  if (intent === "social") {
    return {intent,calculations,matchedData:["financials"],response:es
      ? `¡De nada! Seguimos cuando quieras. Tengo cargados los datos actuales: ingresos ${money(financials.revenue,language)} y EBITDA ${money(financials.ebitda,language)}. Si quieres, podemos convertir cualquier duda en un escenario con números.`
      : `You're welcome. We can pick this up whenever you're ready. I have the current workspace figures: revenue ${money(financials.revenue,language)} and EBITDA ${money(financials.ebitda,language)}. We can turn any question into a quantified scenario.`};
  }
  if (intent === "advice") {
    const openProjects=operations.projects.filter(x=>x.status!=="completed");
    const overruns=openProjects.map(x=>({...x,variance:x.spent-x.budget})).filter(x=>x.variance>0).sort((a,b)=>b.variance-a.variance);
    const openRisks=operations.risks.filter(x=>x.status!=="closed").sort((a,b)=>b.probability*b.impact-a.probability*b.impact);
    const offKpis=operations.kpis.filter(x=>x.direction==="lower"?x.actual>x.target:x.actual<x.target);
    const totalRecorded=operations.expenses.reduce((sum,x)=>sum+x.amount,0);
    const invoices=workspace.workingCapitalInvoices??[];
    const today=localISODate();
    const receivables=summarizeInvoices(calculateInvoiceAgeing(invoices.filter(x=>x.direction==="receivable"),today),today);
    const payables=summarizeInvoices(calculateInvoiceAgeing(invoices.filter(x=>x.direction==="payable"),today),today);
    const statementCash=calculateThreeStatements(financials,workspace.statementAssumptions??DEFAULT_THREE_STATEMENT_ASSUMPTIONS).cashFlow.closingCash;
    const cashForecast=calculateCashForecast(statementCash,workspace.cashForecastWeeks??[]);
    const forecastClosing=cashForecast.at(-1)?.closingCash??statementCash;

    const pipeline=weightedPipeline(operations.opportunities.filter(x=>!["won","lost"].includes(x.stage)));
    const gross=financials.revenue>0?financials.grossProfit/financials.revenue*100:0;
    calculations.revenue=financials.revenue; calculations.ebitda=financials.ebitda; calculations.ebitdaMargin=currentMargin; calculations.grossMargin=gross; calculations.recordedExpenses=totalRecorded; calculations.openProjects=openProjects.length; calculations.projectOverruns=overruns.length; calculations.openRisks=openRisks.length; calculations.offTargetKpis=offKpis.length; calculations.weightedPipeline=pipeline; calculations.receivablesOutstanding=receivables.outstanding; calculations.payablesOutstanding=payables.outstanding; calculations.forecastClosingCash=forecastClosing;
    matchedData.push("financials","operations.expenses","operations.projects","operations.risks","operations.kpis","operations.opportunities","workingCapitalInvoices","cashForecastWeeks","threeStatementAssumptions");
    const priority=financials.ebitda<0?(es?"recuperar EBITDA y entender qué costes fijos no están cubiertos":"restore positive EBITDA and identify uncovered fixed costs"):overruns[0]?(es?`corregir el sobrecoste de ${overruns[0].name}`:`address the overrun in ${overruns[0].name}`):openRisks[0]?(es?`mitigar el riesgo ${openRisks[0].title}`:`mitigate the risk ${openRisks[0].title}`):offKpis[0]?(es?`recuperar el KPI ${offKpis[0].name}`:`recover KPI ${offKpis[0].name}`):(es?"validar la calidad y evolución mensual de los datos":"validate monthly data quality and trend");
    return {intent:"advice",calculations,matchedData,response:es
      ? `Si estuviera dirigiendo finanzas, empezaría por proteger caja y margen, no por recortar a ciegas. La foto actual es: ingresos ${money(financials.revenue,language)}, margen bruto ${percent(gross,language)}, EBITDA ${money(financials.ebitda,language)} (${percent(currentMargin,language)}), gastos detallados registrados ${money(totalRecorded,language)} y cartera comercial ponderada ${money(pipeline,language)}. Las facturas pendientes suman ${money(receivables.outstanding,language)} por cobrar y ${money(payables.outstanding,language)} por pagar; la previsión de caja a 13 semanas termina en ${money(forecastClosing,language)}. En operaciones hay ${openProjects.length} proyectos abiertos, ${overruns.length} con sobrecoste, ${openRisks.length} riesgos abiertos y ${offKpis.length} KPI fuera de objetivo.\n\nMi primera prioridad sería ${priority}. Después: (1) conciliar gastos detallados con el P&L para evitar duplicidades; (2) revisar semanalmente caja, cobros y pagos; (3) exigir responsable, fecha y resultado medible a cada proyecto o KPI crítico. No puedo afirmar una tendencia mensual sin una serie histórica comparable: estos datos describen el estado actual, no prueban si mejora o empeora.`
      : `As finance lead, I would protect cash and margin before making indiscriminate cuts. Current position: revenue ${money(financials.revenue,language)}, gross margin ${percent(gross,language)}, EBITDA ${money(financials.ebitda,language)} (${percent(currentMargin,language)}), detailed recorded expenses ${money(totalRecorded,language)}, and weighted sales pipeline ${money(pipeline,language)}. Outstanding invoices are ${money(receivables.outstanding,language)} receivable and ${money(payables.outstanding,language)} payable; the 13-week cash forecast closes at ${money(forecastClosing,language)}. Operations show ${openProjects.length} open projects, ${overruns.length} over budget, ${openRisks.length} open risks and ${offKpis.length} off-target KPIs.\n\nMy first priority would be to ${priority}. Then: (1) reconcile detailed expenses to the P&L to avoid double counting; (2) review cash, collections and payments weekly; (3) give every critical project or KPI an owner, deadline and measurable outcome. I cannot claim a monthly trend without comparable historical data: these figures describe the current state, not whether it is improving or deteriorating.`};
  }
  const multiHire=normaliseText(q).match(/(?:contrat|hire|employ)[a-z ]{0,35}(\d[\d.,]*)\s*(?:€|eur|euros?)/);
  const marketingCut=normaliseText(q).match(/(?:marketing|publicidad|ads)[^%]{0,45}(\d+(?:[.,]\d+)?)\s*%|(?:recort|reduc|cut)[^0-9%]{0,35}(\d+(?:[.,]\d+)?)\s*%[^.]{0,35}(?:marketing|publicidad|ads)/);
  if (multiHire || marketingCut) {
    const hireCost=multiHire?parseNumber(multiHire[1]):0;
    const rate=marketingCut?Number((marketingCut[1]??marketingCut[2]).replace(",",".")):0;
    const marketingSpend=operations.expenses.filter(x=>/marketing|publicidad|ads|advertising/i.test(x.category+" "+x.description)).reduce((sum,x)=>sum+x.amount,0);
    const saving=marketingSpend*rate/100;
    const annualHireCost=hireCost*12;
    calculations.hireMonthlyCost=hireCost; calculations.annualHireCost=annualHireCost; calculations.marketingRecordedSpend=marketingSpend; calculations.marketingSaving=saving;
    matchedData.push("operations.expenses");
    const hireEs=multiHire?"\n• Contratar por "+money(hireCost,language)+" al mes supone "+money(annualHireCost,language)+" al año, antes de cotizaciones, beneficios y otros costes laborales. Es un coste recurrente, no una inversión única.":"";
    const hireEn=multiHire?"\n• Hiring at "+money(hireCost,language)+" per month equals "+money(annualHireCost,language)+" per year, before employer taxes, benefits and other employment costs. It is recurring spend, not a one-off investment.":"";
    const marketingEs=marketingCut?"\n• Reducir marketing un "+rate+"%: el gasto identificado en los registros es "+money(marketingSpend,language)+" en el periodo cubierto; el ahorro matemático sería "+money(saving,language) + " en ese mismo periodo.":"";
    const marketingEn=marketingCut?"\n• Cutting marketing by "+rate+"%: recorded marketing spend is "+money(marketingSpend,language)+" for the period covered; the mathematical saving is "+money(saving,language)+" over that same period.":"";
    const caveatEs=multiHire&&marketingCut?"\nNo sumo estos impactos al EBITDA todavía: el coste de contratación es mensual y los registros de marketing pueden cubrir otro periodo. Para darte un EBITDA pro forma fiable, ambos periodos deben coincidir.":marketingCut?"\nEl ahorro corresponde al periodo cubierto por los registros; no lo anualizo sin una serie mensual comparable.":"\nEl coste anualizado no incluye cotizaciones, beneficios ni otros costes laborales.";
    const caveatEn=multiHire&&marketingCut?"\nI am not adding these impacts to EBITDA yet: hiring is monthly, while marketing records may cover a different period. A reliable pro forma EBITDA requires matching periods.":marketingCut?"\nThe saving applies to the period covered by the records; I will not annualise it without a comparable monthly series.":"\nThe annualised cost excludes employer taxes, benefits and other employment costs.";
    return {intent:"advice",calculations,matchedData,response:es
      ? "He separado los escenarios para no mezclar hipótesis."+hireEs+marketingEs+caveatEs
      : "I separated the scenarios to avoid mixing assumptions."+hireEn+marketingEn+caveatEn};
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

  if (intent === "overview") {
    const openProjects=operations.projects.filter(x=>x.status!=="completed");
    const openOpportunities=operations.opportunities.filter(x=>!["won","lost"].includes(x.stage));
    const openRisks=operations.risks.filter(x=>x.status!=="closed").sort((a,b)=>b.probability*b.impact-a.probability*a.impact);
    const overBudget=openProjects.map(x=>({...x,variance:x.spent-x.budget})).filter(x=>x.variance>0).sort((a,b)=>b.variance-a.variance);
    const offKpis=operations.kpis.filter(x=>x.direction==="lower"?x.actual>x.target:x.actual<x.target);
    const categoryTotals=new Map<string,number>();
    operations.expenses.forEach(x=>categoryTotals.set(x.category,(categoryTotals.get(x.category)??0)+x.amount));
    const largestCategory=[...categoryTotals.entries()].sort((a,b)=>b[1]-a[1])[0];
    const pipeline=weightedPipeline(openOpportunities);
    const totalRecorded=operations.expenses.reduce((sum,x)=>sum+x.amount,0);
    const invoices=workspace.workingCapitalInvoices??[];
    const today=localISODate();
    const receivables=summarizeInvoices(calculateInvoiceAgeing(invoices.filter(x=>x.direction==="receivable"),today),today);
    const payables=summarizeInvoices(calculateInvoiceAgeing(invoices.filter(x=>x.direction==="payable"),today),today);
    const statementCash=calculateThreeStatements(financials,workspace.statementAssumptions??DEFAULT_THREE_STATEMENT_ASSUMPTIONS).cashFlow.closingCash;
    const cashForecast=calculateCashForecast(statementCash,workspace.cashForecastWeeks??[]);
    const forecastClosing=cashForecast.at(-1)?.closingCash??statementCash;
    calculations.revenue=financials.revenue; calculations.ebitda=financials.ebitda; calculations.ebitdaMargin=currentMargin; calculations.recordedExpenses=totalRecorded; calculations.openProjects=openProjects.length; calculations.openOpportunities=openOpportunities.length; calculations.weightedPipeline=pipeline; calculations.openRisks=openRisks.length; calculations.offTargetKpis=offKpis.length; calculations.receivablesOutstanding=receivables.outstanding; calculations.payablesOutstanding=payables.outstanding; calculations.forecastClosingCash=forecastClosing;
    matchedData.push("financials","operations.expenses","operations.projects","operations.opportunities","operations.risks","operations.kpis","workingCapitalInvoices","cashForecastWeeks","threeStatementAssumptions");
    const expenseFocus=largestCategory?(es?`La categoría con más gasto detallado es ${largestCategory[0]} (${money(largestCategory[1],language)}).`:`The largest detailed spend category is ${largestCategory[0]} (${money(largestCategory[1],language)}).`):(es?"Aún no hay gastos detallados por categoría.":"There are no detailed expenses by category yet.");
    const riskFocus=openRisks[0]?(es?`El riesgo abierto más alto es «${openRisks[0].title}» (${openRisks[0].probability*openRisks[0].impact}/25).`:`The highest open risk is “${openRisks[0].title}” (${openRisks[0].probability*openRisks[0].impact}/25).`):(es?"No hay riesgos abiertos registrados.":"No open risks are recorded.");
    return {intent,calculations,matchedData,response:es
      ? `Te doy una lectura conjunta del estado actual. Los ingresos son ${money(financials.revenue,language)}; el coste de ventas, ${money(financials.costOfGoodsSold,language)}; los gastos operativos, ${money(financials.operatingExpenses,language)}; y el EBITDA, ${money(financials.ebitda,language)} (${percent(currentMargin,language)} de margen). El margen bruto es ${percent(financials.grossMarginPercent,language)}. En Operaciones constan ${money(totalRecorded,language)} de gastos detallados. Facturas pendientes: ${money(receivables.outstanding,language)} por cobrar y ${money(payables.outstanding,language)} por pagar. La previsión de caja a 13 semanas termina en ${money(forecastClosing,language)} según las hipótesis actuales. ${expenseFocus} Hay ${openProjects.length} proyectos abiertos, ${overBudget.length} con sobrecoste, ${openOpportunities.length} oportunidades abiertas y una cartera ponderada de ${money(pipeline,language)}. Además, hay ${offKpis.length} KPI fuera de objetivo. ${riskFocus}\\n\\nMi lectura: vigilaría primero el margen y la conversión de gasto en resultados; después, los sobrecostes y riesgos concretos. Importante: no dispongo de una serie histórica mensual completa en este contexto, así que no voy a afirmar que el gasto de este mes sube o baja. Los importes de Operaciones son registros detallados y no deben sumarse otra vez al P&L sin conciliarlos.`
      : `Here is a combined view of the current workspace. Revenue is ${money(financials.revenue,language)}; COGS, ${money(financials.costOfGoodsSold,language)}; operating expenses, ${money(financials.operatingExpenses,language)}; and EBITDA, ${money(financials.ebitda,language)} (${percent(currentMargin,language)} margin). Gross margin is ${percent(financials.grossMarginPercent,language)}. Operations contains ${money(totalRecorded,language)} of detailed expenses. Outstanding invoices: ${money(receivables.outstanding,language)} receivable and ${money(payables.outstanding,language)} payable. The 13-week cash forecast ends at ${money(forecastClosing,language)} under current assumptions. ${expenseFocus} There are ${openProjects.length} open projects, ${overBudget.length} over budget, ${openOpportunities.length} open opportunities and weighted pipeline of ${money(pipeline,language)}. There are also ${offKpis.length} off-target KPIs. ${riskFocus}\\n\\nMy read: I would first monitor margin and how spend converts into results, then address specific overruns and risks. Important: I do not have a complete monthly historical series in this context, so I will not claim this month's spend is rising or falling. Operations expenses are detailed records and should not be added to the P&L again without reconciliation.`};
  }
  if (intent === "profit" || intent === "revenue") {
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

  if (intent === "workingCapital") {
    const invoices=workspace.workingCapitalInvoices??[];
    const today=localISODate();
    const receivables=summarizeInvoices(calculateInvoiceAgeing(invoices.filter(x=>x.direction==="receivable"),today),today);
    const payables=summarizeInvoices(calculateInvoiceAgeing(invoices.filter(x=>x.direction==="payable"),today),today);
    calculations.receivablesOutstanding=receivables.outstanding; calculations.receivablesOverdue=receivables.overdue; calculations.payablesOutstanding=payables.outstanding; calculations.payablesOverdue=payables.overdue; calculations.receivablesDueNext7Days=receivables.dueNext7Days; calculations.payablesDueNext7Days=payables.dueNext7Days;
    matchedData.push("workingCapitalInvoices");
    const overdueTop=invoices.map(invoice=>({invoice,age:calculateInvoiceAgeing([invoice],today)[0]})).filter(x=>x.age.outstanding>0&&x.age.overdueDays>0).sort((a,b)=>b.age.outstanding-a.age.outstanding)[0];
    return {intent,calculations,matchedData,response:es
      ? "Registro vivo de facturas: tienes "+money(receivables.outstanding,language)+" pendientes de cobro, de los que "+money(receivables.overdue,language)+" están vencidos; y "+money(payables.outstanding,language)+" pendientes de pago, con "+money(payables.overdue,language)+" vencidos. En los próximos 7 días vencen "+money(receivables.dueNext7Days,language)+" de cobros y "+money(payables.dueNext7Days,language)+" de pagos. "+(overdueTop?"La factura vencida pendiente de mayor importe es "+overdueTop.invoice.counterparty+" ("+money(overdueTop.age.outstanding,language)+").":"No hay facturas vencidas pendientes.")
      : "Live invoice register: "+money(receivables.outstanding,language)+" receivables remain outstanding, of which "+money(receivables.overdue,language)+" are overdue; "+money(payables.outstanding,language)+" payables remain outstanding, with "+money(payables.overdue,language)+" overdue. Within 7 days, "+money(receivables.dueNext7Days,language)+" of collections and "+money(payables.dueNext7Days,language)+" of payments fall due. "+(overdueTop?"The largest overdue invoice is "+overdueTop.invoice.counterparty+" ("+money(overdueTop.age.outstanding,language)+").":"There are no overdue outstanding invoices.")};
  }

  if (intent === "cash") {
    const statements = calculateThreeStatements(financials, workspace.statementAssumptions ?? DEFAULT_THREE_STATEMENT_ASSUMPTIONS);
    const bs = statements.balanceSheet;
    const cf = statements.cashFlow;
    const forecast = calculateCashForecast(cf.closingCash, workspace.cashForecastWeeks ?? []);
    const forecastEnd = forecast.at(-1)?.closingCash ?? cf.closingCash;
    const forecastLow = forecast.length ? Math.min(...forecast.map(x=>x.closingCash)) : cf.closingCash;
    const forecastNegativeWeeks = forecast.filter(x=>x.closingCash<0).length;
    const forecastCollections = forecast.reduce((sum,x)=>sum+x.collections,0);
    const forecastPayments = forecast.reduce((sum,x)=>sum+x.operatingPayments+x.capitalExpenditure+x.debtService,0);
    calculations.closingCash = round(cf.closingCash);
    calculations.freeCashFlow = round(cf.freeCashFlow);
    calculations.netWorkingCapital = round(bs.netWorkingCapital);
    calculations.netDebt = round(bs.netDebt);
    if (bs.currentRatio !== null) calculations.currentRatio = bs.currentRatio;
    calculations.forecastClosingCash=round(forecastEnd); calculations.forecastLowestCash=round(forecastLow); calculations.forecastNegativeWeeks=forecastNegativeWeeks; calculations.forecastCollections=round(forecastCollections); calculations.forecastPayments=round(forecastPayments);
    matchedData.push("financials", "threeStatementAssumptions", "cashForecastWeeks");
    return { intent, calculations, matchedData, response: es
      ? `Proyección del modelo de tres estados con las hipótesis actuales:\n• Caja final: ${money(cf.closingCash, language)}.\n• Flujo de caja libre: ${money(cf.freeCashFlow, language)}.\n• Capital circulante neto: ${money(bs.netWorkingCapital, language)}.\n• Deuda neta: ${money(bs.netDebt, language)}.\n• Ratio corriente: ${bs.currentRatio === null ? "no disponible" : bs.currentRatio.toFixed(2) + "x"}.\n${workspace.statementAssumptions ? "He usado las hipótesis editadas en 3 estados." : "Aún no has modificado las hipótesis de 3 estados; se aplican los valores demo iniciales."}\n• Previsión directa de 13 semanas desde esa caja: saldo final ${money(forecastEnd,language)}, mínimo ${money(forecastLow,language)} y ${forecastNegativeWeeks} semanas con saldo negativo. Cobros previstos: ${money(forecastCollections,language)}; pagos totales: ${money(forecastPayments,language)}.`
      : `Three-statement projection using current assumptions:\n• Closing cash: ${money(cf.closingCash, language)}.\n• Free cash flow: ${money(cf.freeCashFlow, language)}.\n• Net working capital: ${money(bs.netWorkingCapital, language)}.\n• Net debt: ${money(bs.netDebt, language)}.\n• Current ratio: ${bs.currentRatio === null ? "not available" : bs.currentRatio.toFixed(2) + "x"}.\n${workspace.statementAssumptions ? "Using the assumptions edited in 3 statements." : "Three-statement assumptions have not been edited; initial demo defaults are used."}\n• 13-week direct forecast from that cash balance: closing cash ${money(forecastEnd,language)}, low point ${money(forecastLow,language)}, and ${forecastNegativeWeeks} negative-balance weeks. Forecast collections: ${money(forecastCollections,language)}; total payments: ${money(forecastPayments,language)}.` };
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
    ? `Entiendo lo que planteas, aunque todavía no identifico qué dato del negocio quieres que use para responder «${q}». ${numeric ? "También he detectado el importe " + numeric + ". " : ""}Puedo relacionarlo con la cuenta de resultados, caja, facturas, gastos por categoría, proyectos, ventas, riesgos y objetivos. Si hablas de la situación general, dímelo con naturalidad; cruzaré los datos disponibles y señalaré qué información falta, sin inventar tendencias ni resultados.`
    : `I understand the question, but I cannot yet tell which business data you want me to use for “${q}”. ${numeric ? "I also detected the amount " + numeric + ". " : ""}I can connect it to the P&L, cash, invoices, category spend, projects, sales, risks and targets. If you mean the overall business position, say so naturally; I will combine the available data and point out what is missing without inventing trends or results.` };
}
