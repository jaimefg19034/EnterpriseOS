import type { FinancialResults } from "./financials";
import { costCenterActualSpend, weightedPipeline, type OperationsState } from "./operations";
import type { Language } from "../i18n/translations";
import { calculateThreeStatements, DEFAULT_THREE_STATEMENT_ASSUMPTIONS, type ThreeStatementAssumptions } from "./three-statements";
import type { SavedPlanningState } from "./planning-storage";
import { calculateCashForecast, type CashForecastWeekInput } from "./cash-forecast";
import { calculateInvoiceAgeing, summarizeInvoices, type WorkingCapitalInvoice } from "./working-capital";

export type CopilotIntent = "greeting" | "social" | "advice" | "expense" | "saving" | "investment" | "margin" | "profit" | "revenue" | "project" | "risk" | "kpi" | "cash" | "workingCapital" | "planning" | "overview" | "comparison" | "unknown";
export type CopilotAnalysis = { intent: CopilotIntent; response: string; calculations: Record<string, number>; matchedData: string[]; steps?: string[]; action?: "explain" | "simulate" | "implement"; confidence?: number };

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

const NUMBER_WORDS: Record<string, number> = {
  cero:0, zero:0, uno:1, una:1, un:1, one:1, dos:2, two:2, tres:3, three:3, cuatro:4, four:4,
  cinco:5, five:5, seis:6, six:6, siete:7, seven:7, ocho:8, eight:8, nueve:9, nine:9,
  diez:10, ten:10, once:11, eleven:11, doce:12, twelve:12, trece:13, thirteen:13,
  catorce:14, fourteen:14, quince:15, fifteen:15, dieciseis:16, sixteen:16, diecisiete:17,
  seventeen:17, dieciocho:18, eighteen:18, diecinueve:19, nineteen:19, veinte:20, twenty:20,
  treinta:30, thirty:30, cuarenta:40, forty:40, cincuenta:50, fifty:50, sesenta:60, sixty:60,
  setenta:70, seventy:70, ochenta:80, eighty:80, noventa:90, ninety:90, cien:100, hundred:100,
};
function numberWordsValue(raw: string): number | null {
  const words = normaliseText(raw).split(/\s+/).filter(x => x !== "y" && x !== "and");
  if (!words.length || words.some(x => NUMBER_WORDS[x] === undefined)) return null;
  const values = words.map(x => NUMBER_WORDS[x]);
  if (values.length === 1) return values[0];
  if (values.length === 2 && values[0] >= 20 && values[0] % 10 === 0 && values[1] < 10) return values[0] + values[1];
  return null;
}
function extractPercent(question: string): number | null {
  const match = question.match(/(\d+(?:[.,]\d+)?)\s*%/);
  const numeric = match ? Number(match[1].replace(",", ".")) : null;
  if (numeric !== null) return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1000 ? numeric : null;
  const words = normaliseText(question).match(/\b(cero|zero|uno|una|un|one|dos|two|tres|three|cuatro|four|cinco|five|seis|six|siete|seven|ocho|eight|nueve|nine|diez|ten|once|eleven|doce|twelve|trece|thirteen|catorce|fourteen|quince|fifteen|dieciseis|sixteen|diecisiete|seventeen|dieciocho|eighteen|diecinueve|nineteen|veinte|twenty|treinta|thirty|cuarenta|forty|cincuenta|fifty|sesenta|sixty|setenta|seventy|ochenta|eighty|noventa|ninety|cien|hundred)(?:\s+y\s+(?:uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve))?\s+(?:por ciento|percent)\b/);
  if (!words) return null;
  const value = numberWordsValue(words[0].replace(/\s+(?:por ciento|percent)$/, ""));
  return value !== null && value >= 0 && value <= 1000 ? value : null;
}

export type IntentContext = { previousIntent?: CopilotIntent; previousQuestion?: string; previousResponse?: string; previousCalculations?: Record<string, number>; history?: { role: "user" | "assistant"; content: string }[] };
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
 overview:["resumen","situacion","estado","empresa","negocio","analiza","analisis","panorama","mes","rumbo","como vamos","como va"],
 comparison:["comparar","comparacion","comparativa","versus","vs","compare","comparison","diferencia entre"]
};
const INTENT_SYNONYMS: Partial<Record<CopilotIntent, string[]>> = {
  expense: ["dinero que sale", "salidas", "desembolso", "factura de proveedor", "cargo", "consumo", "partida", "coste fijo", "coste variable", "overhead", "donde se esta yendo el dinero", "en que se gasta el dinero", "que partidas consumen recursos", "a donde va el dinero", "gasto por categoria"],
  saving: ["economizar", "ajustar", "contener", "apretar", "eliminar gasto", "eficiencia", "reducir presupuesto", "abaratar"],
  revenue: ["cifra de negocio", "volumen de negocio", "ventas netas", "cobrar por ventas", "vender", "comercializar"],
  profit: ["resultado", "margen operativo", "lo que queda", "ganancia neta", "rentabilidad neta"],
  cash: ["dinero disponible", "saldo bancario", "tesoreria", "caja disponible", "liquido", "solvencia", "runway"],
  workingCapital: ["dinero que me deben", "dinero que debo", "pendiente de cobrar", "pendiente de pagar", "morosidad", "impagado", "deudores", "acreedores"],
  planning: ["plan financiero", "prevision", "estimacion", "presupuestado", "plan de negocio", "proyeccion"],
  project: ["iniciativa", "entrega", "proyecto retrasado", "desviacion de proyecto"],
  risk: ["amenaza", "incertidumbre", "exposicion", "contingencia", "problema potencial"],
  kpi: ["indicador", "objetivo", "meta", "medida de rendimiento", "cuadro de mando"],
  investment: ["contratar", "incorporar personal", "comprar maquinaria", "adquirir", "desembolso inicial", "inversion"],
  margin: ["margen bruto", "margen ebitda", "rentabilidad sobre ventas"]
};
const STOP_WORDS = new Set(["que","como","cuando","donde","cual","cuanto","cuanta","cuantos","cuantas","por","para","con","sin","una","uno","unos","unas","del","las","los","esta","este","eso","esa","ese","hay","tengo","tiene","quiero","puedo","deberia","seria","sobre","entre","mi","mis","el","la","un","al","me","se","y","o","a","en","es","son","the","what","how","when","where","which","who","why","would","could","should","my","our","is","are","do","does","can","for","to","of","in","on","and","or"]);
function stemToken(token: string): string {
  let value=token;
  for (const suffix of ["amientos","imientos","aciones","uciones","amente","idades","adores","adoras","iendo","ando","ieron","iesen","isteis","ariamos","eriamos","iria","arian","acion","mente","idad","ivos","ivas","ados","adas","idos","idas","ando","iendo","es","os","as","s"]) {
    if(value.length>suffix.length+3&&value.endsWith(suffix)){value=value.slice(0,-suffix.length);break;}
  }
  return value;
}
function tokensOf(value: string): string[] {
  return normaliseText(value).split(" ").filter(token=>token.length>1&&!STOP_WORDS.has(token)).map(stemToken);
}
function scoreIntents(question: string): Record<string,number> {
  const q=normaliseText(question), tokens=tokensOf(q), scores:Record<string,number>={};
  for(const [intent,baseTerms] of Object.entries(INTENT_TERMS)){
    const terms=[...baseTerms,...(INTENT_SYNONYMS[intent as CopilotIntent]??[])];
    let score=0;
    for(const term of terms){
      const normalized=normaliseText(term);
      const termTokens=tokensOf(normalized);
      if(!termTokens.length) continue;
      if(q.includes(normalized)){score+=normalized.includes(" ")?4:3;continue;}
      const overlap=termTokens.filter(t=>tokens.some(token=>token===t||token.startsWith(t)||t.startsWith(token))).length;
      if(overlap===termTokens.length) score+=termTokens.length>1?3:2;
      else if(overlap>0) score+=overlap*1.25;
    }
    scores[intent]=score;
  }
  const add=(intent:CopilotIntent,pattern:RegExp,weight=4)=>{if(pattern.test(q))scores[intent]=(scores[intent]??0)+weight;};
  add("advice",/\b(que harias|si estuvieras|si fueras|que me recomiendas|por donde empiezo|como mejorarias|que deberia priorizar|what would you do|where should i start)\b/,7);
  add("saving",/\b(recort\w*|reduc\w*|ahorr\w*|abarat\w*|optimiza\w*|contener el gasto|gastar menos|coste menor)\b/,8);
  add("investment",/\b(inviert\w*|invert\w*|contrat\w*|incorpor\w*|compr\w*|adquir\w*|capex)\b/,3);
  add("greeting",/\b(hola|buenas|hey|hello|hi|buenos dias|buenas tardes|buenas noches)\b/,8);
  add("overview",/\b(como ves|como va|como vamos|situacion actual|panorama general|que tal estamos|how are we doing)\b/,3);
  add("social",/\b(gracias|thank you|thanks|perfecto|genial|vale|okay|entiendo|de acuerdo|muy bien|great|got it)\b/,7);
  return scores;
}
function intentOf(question: string, context?: IntentContext): CopilotIntent {
  const q = normaliseText(question), tokens = tokensOf(q), scores = scoreIntents(question);
  const followUp = /\b(y por que|por que|y eso|como lo soluciono|como lo arreglo|como lo corrijo|como bajo eso|como lo bajo|como reducirlo|como lo reduzco|como lo aplico|como aplico eso|paso a paso|plan de accion|que hago entonces|y si cambio|si cambio esa cifra|esa cifra|ese importe|ese gasto|esa partida|lo anterior|con ese cambio|y ahora|ahora|en ese caso|y si|si lo subo|si lo aumento|mas detalles|amplia|desarrolla|what about|why is that|how do i fix|how can i solve|how do i apply|step by step|what if i change|that amount|that cost)\b/.test(q);
  const lowerAction = /\b(reduc\w*|baj\w*|recort\w*|disminu\w*|ahorr\w*|lower|reduce|cut)\b/.test(q);
  const raiseAction = /\b(sub\w*|aument\w*|elev\w*|increment\w*|raise|increase|boost)\b/.test(q);
  if (context?.previousIntent && followUp) {
    if (lowerAction && ["expense", "overview"].includes(context.previousIntent)) return "saving";
    if (raiseAction && context.previousIntent === "revenue") return "revenue";
    return context.previousIntent;
  }
  if ((scores.greeting ?? 0) >= 8 && tokens.length <= 7 && !Object.entries(scores).some(([key,value]) => !["greeting","social"].includes(key) && value >= 3)) return "greeting";
  if ((scores.social ?? 0) >= 7 && tokens.length <= 8 && !Object.entries(scores).some(([key,value]) => !["greeting","social"].includes(key) && value >= 3)) return "social";
  if ((scores.advice ?? 0) >= 7) return "advice";
  if (lowerAction && /\b(gasto|gastos|coste|costes|costo|costos|presupuesto|spend|expense|cost)\b/.test(q)) return "saving";
  const ranked = Object.entries(scores).filter(([key,value]) => !["greeting","social","advice"].includes(key) && value > 0).sort((a,b) => b[1]-a[1]);
  if (ranked.length && ranked[0][1] >= 2) return ranked[0][0] as CopilotIntent;
  if (context?.previousIntent && tokens.length <= 10) return context.previousIntent;
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
  const asksForSecondPoint = /\b(segundo punto|punto dos|punto 2|segundo apartado|apartado dos|second point|second item)\b/.test(normaliseText(q))
    && /\b(detall|explic|ampl|desarroll|more detail|explain|expand)\w*\b/.test(normaliseText(q));
  if (asksForSecondPoint) {
    const numbered = (context?.previousResponse ?? "").split(/\n/).map(line => line.trim())
      .filter(line => /^(?:2[.)]|[-*]\s*(?:2[.)])?)/.test(line));
    if (numbered.length) {
      const second = numbered[0].replace(/^(?:2[.)]\s*|[-*]\s*)/, "");
      matchedData.push("conversation.previousResponse");
      return { intent, calculations, matchedData, response: es
        ? "El segundo punto de mi respuesta anterior era: «" + second + "». Puedo desarrollarlo usando los registros actuales, manteniendo esa referencia exacta."
        : "The second point in my previous answer was: “" + second + "”. I can expand it using current records while keeping the reference exact." };
    }
    return { intent, calculations, matchedData: ["conversation.previousResponse"], response: es
      ? "La respuesta anterior no estaba organizada en puntos numerados, así que no puedo identificar con seguridad cuál es el segundo. Cita esa frase o dime el tema y lo desarrollo sin inventar una referencia."
      : "My previous answer was not structured as a numbered list, so I cannot reliably identify the second point. Quote that phrase or name the topic and I will expand it without guessing." };
  }
  const asksImplementation = /\b(como lo aplico|como aplico eso|como lo pongo en marcha|como ejecuto|paso a paso|plan de accion|dame un plan|how do i apply|how do i implement|step by step|give me a plan)\b/.test(normaliseText(q));
  if (asksImplementation && context?.previousIntent) {
    const steps: string[] = [];
    if (context.previousIntent === "saving" || context.previousIntent === "expense") {
      const ranked = [...operations.expenses].sort((a,b) => b.amount-a.amount).slice(0,3);
      const base = context.previousCalculations?.expenseBase ?? financials.operatingExpenses + financials.costOfGoodsSold;
      const target = context.previousCalculations?.saving ?? round(base * 0.1);
      calculations.expenseBase = round(base); calculations.targetSaving = round(target);
      matchedData.push("financials.operatingExpenses","financials.costOfGoodsSold","operations.expenses");
      steps.push(es ? "Congela nuevos compromisos no esenciales durante 7 días; no canceles partidas críticas sin validar su efecto." : "Freeze non-essential new commitments for 7 days; do not cancel critical items without validating the effect.");
      if (ranked[0]) steps.push((es ? "Audita primero " : "Audit ") + ranked[0].description + " (" + ranked[0].category + "): " + money(ranked[0].amount,language) + (es ? "; pide detalle, contrato y responsable." : "; request the invoice, contract and owner."));
      if (ranked[1]) steps.push((es ? "Contrasta " : "Benchmark ") + ranked[1].description + " (" + money(ranked[1].amount,language) + (es ? ") con al menos dos alternativas y revisa si es recurrente." : ") against at least two alternatives and check whether it recurs."));
      steps.push((es ? "Fija un objetivo máximo de " : "Set a maximum target of ") + money(target,language) + (es ? " de ahorro para el periodo analizado; registra responsable, fecha y ahorro realmente conseguido." : " for the analysed period; record owner, deadline and realised savings."));
    } else if (context.previousIntent === "revenue") {
      const deals = operations.opportunities.filter(x => !["won","lost"].includes(x.stage)).sort((a,b) => b.value-a.value).slice(0,3);
      const pipeline = weightedPipeline(operations.opportunities.filter(x => !["won","lost"].includes(x.stage)));
      calculations.weightedPipeline = round(pipeline); matchedData.push("operations.opportunities");
      steps.push(es ? "Ordena la cartera por valor, probabilidad y fecha prevista de cierre; no confundas pipeline con ingresos reconocidos." : "Rank the pipeline by value, probability and expected close date; do not confuse pipeline with recognised revenue.");
      deals.forEach((deal,index) => steps.push((index+1) + ". " + deal.company + ": " + money(deal.value,language) + (es ? ", fase " : ", ") + deal.stage + (es ? ", cierre previsto " : ", expected close ") + deal.expectedClose + (es ? ". Define el siguiente contacto y bloqueo." : ". Define the next contact and blocker.")));
      steps.push(es ? "Revisa semanalmente conversión por fase y margen esperado antes de aprobar descuentos." : "Review stage conversion and expected margin weekly before approving discounts.");
    } else if (context.previousIntent === "cash" || context.previousIntent === "workingCapital") {
      const invoices = workspace.workingCapitalInvoices ?? [];
      const today = localISODate();
      const overdue = invoices.map(invoice => ({invoice,age:calculateInvoiceAgeing([invoice],today)[0]})).filter(x=>x.age.outstanding>0&&x.age.overdueDays>0).sort((a,b)=>b.age.outstanding-a.age.outstanding);
      matchedData.push("workingCapitalInvoices","cashForecastWeeks");
      calculations.overdueReceivables = round(overdue.filter(x=>x.invoice.direction==="receivable").reduce((s,x)=>s+x.age.outstanding,0));
      steps.push(es ? "Separa cobros vencidos, cobros próximos y pagos comprometidos; prioriza por importe y días de retraso." : "Separate overdue collections, upcoming receipts and committed payments; prioritise by amount and days overdue.");
      overdue.slice(0,3).forEach((x,index)=>steps.push((index+1) + ". " + (es ? "Contacta con " : "Contact ") + x.invoice.counterparty + " por " + money(x.age.outstanding,language) + (es ? "; vencimiento " : "; due ") + x.invoice.dueDate + "."));
      steps.push(es ? "Actualiza la previsión de 13 semanas con fechas probables reales y negocia plazos antes del vencimiento." : "Update the 13-week forecast with realistic receipt dates and negotiate terms before due dates.");
    } else if (context.previousIntent === "project") {
      const project = operations.projects.filter(x=>x.status!=="completed").map(x=>({...x,variance:x.spent-x.budget})).sort((a,b)=>b.variance-a.variance)[0];
      matchedData.push("operations.projects");
      if(project){calculations.projectVariance=round(project.variance);steps.push((es?"Reestima ":"Reforecast ")+project.name+": "+money(project.spent,language)+(es?" gastados frente a ":" spent against ")+money(project.budget,language)+(es?" presupuestados; valida coste pendiente y fecha final.":" budget; validate cost to complete and final date."));}
      steps.push(es ? "Divide el trabajo restante en hitos, asigna un responsable por hito y aprueba cambios de alcance solo con coste y plazo." : "Break remaining work into milestones, assign one owner per milestone and approve scope changes only with cost and schedule impact.");
    } else if (context.previousIntent === "risk") {
      const risk = operations.risks.filter(x=>x.status!=="closed").sort((a,b)=>b.probability*b.impact-a.probability*a.impact)[0];
      matchedData.push("operations.risks");
      if(risk){calculations.highestRiskScore=risk.probability*risk.impact;steps.push((es?"Asigna un responsable a «":"Assign an owner to “")+risk.title+(es?"» (riesgo ":"” (risk ")+(risk.probability*risk.impact)+"/25) "+(es?"y convierte la mitigación en tareas verificables.":"and turn mitigation into verifiable tasks."));}
      steps.push(es ? "Define señal temprana, fecha de revisión y criterio de escalado; actualiza el estado tras cada control." : "Define an early-warning indicator, review date and escalation trigger; update status after each control.");
    } else {
      steps.push(es ? "Abre el dato o registro concreto que sustenta la recomendación y confirma periodo, responsable y unidad." : "Open the exact record behind the recommendation and confirm period, owner and unit.");
      steps.push(es ? "Define una acción reversible, una métrica de éxito y una fecha de revisión a 30 días." : "Define a reversible action, a success metric and a 30-day review date.");
    }
    return {intent:context.previousIntent,calculations,matchedData,steps,action:"implement",confidence:0.9,response:es ? "Plan de ejecución ligado al análisis anterior y a los registros actuales. No modificaré datos contables automáticamente; cada paso debe validarse y medirse." : "Execution plan linked to the previous analysis and current records. I will not change accounting data automatically; each step must be validated and measured."};
  }

  if (context?.previousIntent === "saving" && targetPercent !== null && /\b(sub\w*|aument\w*|elev\w*|increment\w*|raise|increase|boost)\b/.test(normaliseText(q)) && context.previousCalculations?.saving !== undefined) {
    const previousSaving = context.previousCalculations.saving;
    const nextSaving = round(previousSaving * (1 + targetPercent / 100));
    calculations.previousSaving = previousSaving; calculations.savingIncreasePercent = targetPercent; calculations.savingAfterScenario = nextSaving; calculations.incrementalSaving = round(nextSaving - previousSaving);
    matchedData.push("conversation.previousCalculations","financials");
    return {intent:"saving",calculations,matchedData,action:"simulate",confidence:0.94,response:es ? "Interpreto «subirlo» como aumentar el objetivo de ahorro anterior un " + percent(targetPercent,language) + ". El objetivo pasaría de " + money(previousSaving,language) + " a " + money(nextSaving,language) + " por el mismo periodo: " + money(nextSaving-previousSaving,language) + " adicionales. Es un objetivo de escenario, no un ahorro realizado." : "I interpret “raise it” as increasing the previous savings target by " + percent(targetPercent,language) + ". The target moves from " + money(previousSaving,language) + " to " + money(nextSaving,language) + " for the same period: " + money(nextSaving-previousSaving,language) + " additional. This is a scenario target, not realised savings."};
  }

  if (intent === "comparison") {
    const metrics = [
      {key:"revenue",label:es?"Ingresos":"Revenue",value:financials.revenue,terms:["ingresos","ingreso","ventas","facturacion","revenue","sales"]},
      {key:"costOfGoodsSold",label:es?"Coste de ventas":"Cost of goods sold",value:financials.costOfGoodsSold,terms:["coste de ventas","costes directos","cogs","cost of goods sold"]},
      {key:"operatingExpenses",label:es?"Gastos operativos":"Operating expenses",value:financials.operatingExpenses,terms:["gastos operativos","gasto operativo","opex","operating expenses","overheads","gastos"]},
      {key:"grossProfit",label:es?"Beneficio bruto":"Gross profit",value:financials.grossProfit,terms:["beneficio bruto","margen bruto en euros","gross profit"]},
      {key:"ebitda",label:"EBITDA",value:financials.ebitda,terms:["ebitda"]},
      {key:"netIncome",label:es?"Beneficio neto":"Net income",value:financials.netIncome,terms:["beneficio neto","resultado neto","net income","net profit"]},
      {key:"grossMarginPercent",label:es?"Margen bruto":"Gross margin",value:financials.grossMarginPercent,terms:["margen bruto","gross margin"]},
      {key:"ebitdaMarginPercent",label:es?"Margen EBITDA":"EBITDA margin",value:financials.ebitdaMarginPercent,terms:["margen ebitda","ebitda margin"]},
    ];
    const qn=normaliseText(q);
    const matched=metrics.filter(metric=>metric.terms.some(term=>qn.includes(normaliseText(term))));
    if(matched.length<2){
      return {intent,calculations,matchedData:["financials"],confidence:0.55,response:es?"He detectado una petición de comparación, pero necesito dos métricas concretas. Por ejemplo: «Compara ingresos con gastos operativos» o «EBITDA frente a beneficio neto».":"I detected a comparison request, but need two specific metrics. For example: “Compare revenue with operating expenses” or “EBITDA versus net income.”"};
    }
    const first=matched[0],second=matched[1],difference=round(first.value-second.value),ratio=second.value!==0?round(first.value/second.value):null;
    calculations.comparisonFirst=first.value;calculations.comparisonSecond=second.value;calculations.comparisonDifference=difference;if(ratio!==null)calculations.comparisonRatio=ratio;
    matchedData.push("financials");
    const percentMetric=first.key.toLowerCase().includes("percent")||second.key.toLowerCase().includes("percent");
    return {intent,calculations,matchedData,action:"explain",confidence:0.96,response:es
      ? first.label+": "+(percentMetric&&first.key.toLowerCase().includes("percent")?percent(first.value,language):money(first.value,language))+". "+second.label+": "+(percentMetric&&second.key.toLowerCase().includes("percent")?percent(second.value,language):money(second.value,language))+". Diferencia: "+(percentMetric&&first.key.toLowerCase().includes("percent")&&second.key.toLowerCase().includes("percent")?percent(Math.abs(difference),language):money(Math.abs(difference),language))+". "+first.label+" "+(difference>=0?"supera":"queda por debajo de")+" "+second.label+" en ese importe. "+(ratio!==null?"Relación: "+ratio.toFixed(2)+"x. ":"")+"Ambas cifras proceden de la cuenta de resultados del mismo periodo."
      : first.label+": "+money(first.value,language)+". "+second.label+": "+money(second.value,language)+". Difference: "+money(Math.abs(difference),language)+". "+first.label+" "+(difference>=0?"exceeds":"is below")+" "+second.label+" by that amount. "+(ratio!==null?"Ratio: "+ratio.toFixed(2)+"x. ":"")+"Both figures come from the income statement for the same period."};
  }

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

  const queryTokens=tokensOf(q);
  const recordCandidates: (
    | {kind:"project";label:string;tokens:string[];item:OperationsState["projects"][number]}
    | {kind:"risk";label:string;tokens:string[];item:OperationsState["risks"][number]}
    | {kind:"kpi";label:string;tokens:string[];item:OperationsState["kpis"][number]}
    | {kind:"expense";label:string;tokens:string[];item:OperationsState["expenses"][number]}
    | {kind:"costCenter";label:string;tokens:string[];item:OperationsState["costCenters"][number]}
    | {kind:"opportunity";label:string;tokens:string[];item:OperationsState["opportunities"][number]}
  )[] = [
    ...operations.projects.map(item=>({kind:"project" as const,label:item.name,tokens:tokensOf(item.name),item})),
    ...operations.risks.map(item=>({kind:"risk" as const,label:item.title,tokens:tokensOf(item.title),item})),
    ...operations.kpis.map(item=>({kind:"kpi" as const,label:item.name,tokens:tokensOf(item.name),item})),
    ...operations.expenses.map(item=>({kind:"expense" as const,label:item.description+" "+item.supplier,tokens:tokensOf(item.description+" "+item.supplier),item})),
    ...operations.costCenters.map(item=>({kind:"costCenter" as const,label:item.name,tokens:tokensOf(item.name),item})),
    ...operations.opportunities.map(item=>({kind:"opportunity" as const,label:item.company,tokens:tokensOf(item.company),item}))
  ].filter(candidate=>candidate.tokens.length>0);
  const recordMatches=recordCandidates.map(candidate=>{
    const exact=normaliseText(q).includes(normaliseText(candidate.label));
    const overlap=candidate.tokens.filter(token=>queryTokens.some(queryToken=>queryToken===token||queryToken.startsWith(token)||token.startsWith(queryToken))).length;
    const score=exact?10:overlap/(candidate.tokens.length||1);
    return {candidate,score,overlap,exact};
  }).filter(match=>match.exact||(match.overlap>=2&&match.score>=0.6)||(match.candidate.tokens.length===1&&match.overlap===1&&match.candidate.tokens[0].length>=6))
    .sort((a,b)=>b.score-a.score);
  const matchedRecord=recordMatches[0]?.candidate;
  if(matchedRecord){
    let response="";
    if(matchedRecord.kind==="project"){
      const item=matchedRecord.item;
      const variance=item.spent-item.budget;
      calculations.projectBudget=item.budget;calculations.projectSpent=item.spent;calculations.projectVariance=round(variance);
      matchedData.push("operations.projects");
      response=es?"El proyecto «"+item.name+"» está "+(item.status==="completed"?"completado":item.status==="onHold"?"en pausa":item.status==="active"?"activo":"planificado")+". Ha consumido "+money(item.spent,language)+" de un presupuesto de "+money(item.budget,language)+"; "+(variance>0?"supera":"mantiene un margen de")+" presupuesto de "+money(Math.abs(variance),language)+". Responsable: "+item.owner+". Fecha prevista: "+item.dueDate+".":"Project “"+item.name+"” is "+item.status+". It has used "+money(item.spent,language)+" of a "+money(item.budget,language)+" budget; it is "+(variance>0?"over":"under")+" budget by "+money(Math.abs(variance),language)+". Owner: "+item.owner+". Due date: "+item.dueDate+".";
    }else if(matchedRecord.kind==="risk"){
      const item=matchedRecord.item;
      calculations.riskScore=item.probability*item.impact;matchedData.push("operations.risks");
      response=es?"El riesgo «"+item.title+"» está "+(item.status==="closed"?"cerrado":item.status==="mitigating"?"en mitigación":"abierto")+" y tiene una puntuación de "+(item.probability*item.impact)+"/25 (probabilidad "+item.probability+"/5 e impacto "+item.impact+"/5). Responsable: "+item.owner+". Mitigación: "+(item.mitigation||"no documentada")+".":"Risk “"+item.title+"” is "+item.status+", with a score of "+(item.probability*item.impact)+"/25 (probability "+item.probability+"/5, impact "+item.impact+"/5). Owner: "+item.owner+". Mitigation: "+(item.mitigation||"not documented")+".";
    }else if(matchedRecord.kind==="kpi"){
      const item=matchedRecord.item;
      const delta=item.actual-item.target;calculations.kpiActual=item.actual;calculations.kpiTarget=item.target;calculations.kpiVariance=round(delta);matchedData.push("operations.kpis");
      response=es?"El KPI «"+item.name+"» está en "+item.actual+" "+item.unit+", frente al objetivo de "+item.target+" "+item.unit+". La diferencia es "+(delta>0?"+":"")+round(delta)+" "+item.unit+". "+(((item.direction??"higher")==="lower"?item.actual<=item.target:item.actual>=item.target)?"Está dentro del objetivo.":"Está fuera del objetivo."):"KPI “"+item.name+"” is "+item.actual+" "+item.unit+", against a target of "+item.target+" "+item.unit+". The variance is "+(delta>0?"+":"")+round(delta)+" "+item.unit+". "+(((item.direction??"higher")==="lower"?item.actual<=item.target:item.actual>=item.target)?"It is on target.":"It is off target.");
    }else if(matchedRecord.kind==="expense"){
      const item=matchedRecord.item;
      calculations.expenseAmount=item.amount;matchedData.push("operations.expenses");
      response=es?"El gasto «"+item.description+"» corresponde a "+item.supplier+", categoría "+item.category+". Importe: "+money(item.amount,language)+"; fecha: "+item.date+"; estado: "+(item.status==="paid"?"pagado":"pendiente de pago")+".":"Expense “"+item.description+"” is with "+item.supplier+", category "+item.category+". Amount: "+money(item.amount,language)+"; date: "+item.date+"; status: "+item.status+".";
    }else if(matchedRecord.kind==="costCenter"){
      const item=matchedRecord.item;
      const spend=costCenterActualSpend(item,operations.expenses),variance=spend-item.budget;calculations.costCenterBudget=item.budget;calculations.costCenterSpend=round(spend);calculations.costCenterVariance=round(variance);matchedData.push("operations.costCenters","operations.expenses");
      response=es?"El centro «"+item.name+"» ha registrado "+money(spend,language)+" frente a un presupuesto de "+money(item.budget,language)+". "+(variance>0?"Está excedido en ":"Quedan ")+money(Math.abs(variance),language)+". Responsable: "+item.owner+"; periodo: "+item.period+".":"Cost centre “"+item.name+"” has recorded "+money(spend,language)+" against a "+money(item.budget,language)+" budget. "+(variance>0?"It is over budget by ":"Remaining budget: ")+money(Math.abs(variance),language)+". Owner: "+item.owner+"; period: "+item.period+".";
    }else{
      const item=matchedRecord.item;
      calculations.opportunityValue=item.value;matchedData.push("operations.opportunities");
      response=es?"La oportunidad de «"+item.company+"» tiene un valor de "+money(item.value,language)+", etapa "+item.stage+" y fecha estimada de cierre "+item.expectedClose+".":"The opportunity for “"+item.company+"” is worth "+money(item.value,language)+", stage "+item.stage+", expected close "+item.expectedClose+".";
    }
    const recordIntent:CopilotIntent=matchedRecord.kind==="costCenter"?"expense":matchedRecord.kind==="opportunity"?"revenue":matchedRecord.kind;
    return {intent:recordIntent,calculations,matchedData,response};
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
    const categoryTotals = new Map<string, number>();
    operations.expenses.forEach(item => categoryTotals.set(item.category, (categoryTotals.get(item.category) ?? 0) + item.amount));
    const rankedCategories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
    const leadingCategories = rankedCategories.slice(0, 3);
    const centerText = topCenter ? `${topCenter.center.name}: ${money(topCenter.actual, language)} frente a ${money(topCenter.center.budget, language)} de presupuesto (${money(topCenter.actual-topCenter.center.budget, language)} de desviación)` : "";
    const expenseText = largestExpense ? `${largestExpense.description} / ${largestExpense.category}: ${money(largestExpense.amount, language)}` : "";
    const categoryText = leadingCategories.map(([name, total], index) => `${index + 1}. ${name}: ${money(total, language)}`).join("; ");
    calculations.totalRecordedExpenses = round(actualExpenses);
    if (topCenter) calculations.topCostCenterSpend = round(topCenter.actual);
    if (largestExpense) calculations.largestExpense = round(largestExpense.amount);
    if (leadingCategories[0]) calculations.largestExpenseCategory = round(leadingCategories[0][1]);
    return { intent, calculations, matchedData, response: es
      ? `He revisado los ${operations.expenses.length} registros de gasto actuales. Los gastos operativos del P&L son ${money(financials.operatingExpenses, language)} y el coste de ventas ${money(financials.costOfGoodsSold, language)}. El total detallado en Operaciones es ${money(actualExpenses, language)} (separado del P&L para evitar duplicidades). ${categoryText ? "Distribución por categoría, de mayor a menor: " + categoryText + ". " : "No hay gastos categorizados registrados. "}${centerText ? "Centro de coste con mayor consumo: " + centerText + ". " : "No hay centros de coste registrados. "}${expenseText ? "Mayor gasto individual: " + expenseText + "." : "No hay gastos individuales registrados."}`
      : `I reviewed the ${operations.expenses.length} current expense records. Total detailed spend in Operations is ${money(actualExpenses, language)} (kept separate from P&L expenses to avoid double counting). ${categoryText ? "Category breakdown, highest first: " + categoryText + ". " : "There are no categorised expenses recorded. "}${centerText ? "Highest-spend cost centre: " + centerText + ". " : "No cost centres are recorded. "}${expenseText ? "Largest individual expense: " + expenseText + "." : "No individual expenses are recorded."}` };
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
