import type { Language } from "../i18n/translations";
import type { CopilotAnalysis } from "./strategic-copilot";

const normalise = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const FINANCE_SIGNAL = /\b(ingresos?|facturacion|ventas?|gastos?|costes?|costos?|ebitda|margen|rentabilidad|presupuesto|caja|liquidez|deuda|facturas?|cobros?|pagos?|inversion|roi|cash|revenue|expenses?|costs?|profit|margin|budget|forecast|invoice|receivable|payable)\b/;
const GENERAL_PATTERNS: Array<{ test: RegExp; key: "today" | "ideas" | "team" | "start" | "improve" | "strategy" }> = [
  { test: /\b(que me propones hacer hoy|que hago hoy|que deberia hacer hoy|que me recomiendas hacer hoy|what should i do today|what do you suggest today)\b/, key: "today" },
  { test: /\b(dame ideas|ideas para|como puedo crecer|como crecer|crecer el negocio|ideas para crecer|growth ideas|ideas to grow)\b/, key: "ideas" },
  { test: /\b(como organizo mi equipo|organizar mi equipo|organizar el equipo|gestiono mi equipo|manage my team|organize my team|team structure)\b/, key: "team" },
  { test: /\b(por donde empiezo|por donde empezar|como empiezo|where do i start|how should i start)\b/, key: "start" },
  { test: /\b(dame ideas para mejorar|como mejoro|como mejorar|mejorar el negocio|mejorar la empresa|improve my business|how can i improve)\b/, key: "improve" },
  { test: /\b(estrategia|plan estrategico|prioridades|productividad|organizar el trabajo|organizar tareas|strategy|productivity|priorities)\b/, key: "strategy" },
];

export function answerGeneralBusinessQuestion(question: string, language: Language): CopilotAnalysis | null {
  const q = normalise(question);
  if (!q || FINANCE_SIGNAL.test(q)) return null;
  const match = GENERAL_PATTERNS.find(item => item.test.test(q));
  if (!match) return null;

  const es = language === "es";
  const responses = {
    today: es
      ? { response: "Hoy te propondría dejar de intentar avanzar en todo a la vez y cerrar un pequeño ciclo de ejecución. Empieza por elegir un resultado importante para el negocio, identifica qué lo está bloqueando y termina el día con un avance visible, no solo con reuniones.", steps: ["Define el resultado más importante que debe quedar conseguido hoy.", "Elige la tarea que más desbloquea ese resultado y asígnale una persona responsable.", "Reserva un bloque de trabajo sin interrupciones y elimina una tarea secundaria.", "Cierra el día revisando qué se ha completado y cuál es el siguiente paso."] }
      : { response: "Today, I would avoid trying to move everything forward at once. Pick one meaningful business outcome, identify what is blocking it, and finish the day with visible progress rather than a calendar full of meetings.", steps: ["Define the single most important outcome for today.", "Choose the task that unlocks it and assign one clear owner.", "Protect a focused work block and remove one low-value task.", "Close the day by reviewing what shipped and the next action."] },
    ideas: es
      ? { response: "Para crecer, buscaría mejoras que puedas probar rápido y medir antes de comprometer muchos recursos. No empezaría abriendo más canales sin validar primero dónde tienes mejor encaje con el cliente.", steps: ["Habla con cinco clientes actuales o potenciales para detectar una necesidad repetida.", "Diseña una oferta o paquete más claro alrededor de esa necesidad y pruébalo con un grupo pequeño.", "Activa un canal de captación concreto con un mensaje distinto por segmento.", "Crea un sistema sencillo de recomendaciones y seguimiento después de cada venta."] }
      : { response: "I would focus on growth experiments that can be tested quickly before committing significant resources. Avoid adding more channels until you know where customer demand and product fit are strongest.", steps: ["Interview five current or prospective customers to find a repeated unmet need.", "Package a clearer offer around that need and test it with a small group.", "Run one focused acquisition channel with a message tailored to a specific segment.", "Build a simple referral and post-sale follow-up process."] },
    team: es
      ? { response: "Organizaría el equipo alrededor de resultados y responsabilidades, no solo de departamentos. Cada prioridad debe tener una persona responsable, una definición clara de terminado y una rutina breve para detectar bloqueos.", steps: ["Agrupa el trabajo en áreas claras: clientes, producto/operaciones y gestión.", "Asigna un único responsable final a cada resultado; evita responsabilidades compartidas sin dueño.", "Define para cada tarea qué significa terminarla y cuándo debe revisarse.", "Haz una reunión semanal corta para revisar avances, bloqueos y decisiones pendientes."] }
      : { response: "I would organise the team around outcomes and ownership, not just departments. Every priority needs one accountable owner, a clear definition of done, and a lightweight routine for surfacing blockers.", steps: ["Group work into clear areas: customers, product/operations, and business management.", "Give each outcome one directly accountable owner.", "Define what done means and when each task will be reviewed.", "Run a short weekly review of progress, blockers, and decisions needed."] },
    start: es
      ? { response: "Empezaría reduciendo la incertidumbre, no creando un plan enorme. Primero aclara qué problema quieres resolver, para quién y qué evidencia demostraría que merece la pena seguir.", steps: ["Escribe en una frase el problema concreto que quieres resolver.", "Define el tipo de cliente que más lo sufre y cómo lo resuelve actualmente.", "Habla con clientes potenciales antes de construir o invertir.", "Prueba una versión pequeña y decide con lo aprendido si continuar, cambiar o parar."] }
      : { response: "Start by reducing uncertainty rather than writing a huge plan. Clarify the problem, who experiences it, and what evidence would show that it is worth pursuing.", steps: ["Write the specific problem you want to solve in one sentence.", "Define the customer who feels it most and how they solve it today.", "Talk to prospective customers before building or investing.", "Test a small version and decide whether to continue, adapt, or stop."] },
    improve: es
      ? { response: "Para mejorar el negocio, buscaría primero fricciones repetidas: tareas que se retrasan, clientes que no vuelven, decisiones que dependen de una sola persona o procesos que nadie siente como propios. Ataca una fricción cada vez.", steps: ["Pide al equipo que identifique los tres obstáculos que más ralentizan su trabajo.", "Contrasta esos obstáculos con comentarios reales de clientes.", "Elige el problema con mayor efecto sobre la experiencia del cliente o la ejecución.", "Prueba un cambio durante dos semanas y conserva solo lo que demuestre funcionar."] }
      : { response: "To improve the business, look for recurring friction: delayed work, customers who do not return, decisions dependent on one person, or processes nobody owns. Fix one friction point at a time.", steps: ["Ask the team to name the three biggest obstacles slowing their work.", "Compare those obstacles with actual customer feedback.", "Choose the issue with the greatest effect on customer experience or execution.", "Test one change for two weeks and keep only what proves useful."] },
    strategy: es
      ? { response: "Te recomiendo convertir la estrategia en pocas decisiones operativas. Una buena estrategia aclara qué vamos a priorizar, qué vamos a dejar de hacer y cómo sabremos si estamos avanzando.", steps: ["Elige un objetivo principal para el próximo ciclo de trabajo.", "Define dos o tres iniciativas que contribuyan directamente a ese objetivo.", "Anota explícitamente qué actividades se van a pausar para liberar capacidad.", "Revisa semanalmente resultados, bloqueos y cambios de prioridad."] }
      : { response: "Turn strategy into a small set of operating decisions. A useful strategy makes clear what to prioritise, what to stop doing, and how progress will be recognised.", steps: ["Choose one primary outcome for the next work cycle.", "Define two or three initiatives that directly support it.", "Explicitly pause activities that compete for the same capacity.", "Review outcomes, blockers, and priority changes every week."] },
  } as const;
  const selected = responses[match.key];
  return { intent: "advice", response: selected.response, calculations: {}, matchedData: [], steps: [...selected.steps], action: "implement", confidence: 0.9 };
}
