const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return Response.json({ status: "local" }, { headers: corsHeaders });
  try {
    const body = await request.json() as { language?: string; question?: string; metrics?: Record<string, number>; operations?: Record<string, unknown> };
    if (!body.metrics || Object.values(body.metrics).some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      return Response.json({ error: "Invalid metrics" }, { status: 400, headers: corsHeaders });
    }
    const operations = body.operations ?? {};
    const compact = {
      metrics: body.metrics,
      operations: Object.fromEntries(["opportunities", "projects", "risks", "kpis", "costCenters", "expenses"].map((key) => [
        key, Array.isArray(operations[key]) ? (operations[key] as unknown[]).slice(0, key === "expenses" ? 200 : 100) : [],
      ])),
    };
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: body.question
            ? (body.language === "en"
              ? "You are a versatile senior business advisor, not a financial-report generator. Understand the user's actual intent before answering. For general strategy, brainstorming, productivity, team organisation, leadership, prioritisation or open-ended business questions, answer naturally and directly with useful ideas and concrete steps. Do NOT inject revenue, expenses, EBITDA or other metrics unless the user asks for them or they materially help answer the question. For explicit financial questions, use only the supplied company data and show relevant calculations. Never append a generic financial overview. Do not invent company facts, guaranteed savings or returns; distinguish assumptions from observed data and say when information is missing. Use the conversation language. Return JSON {status:'ai',answer:'...'} with a useful, specific answer. This is decision support, not regulated investment advice."
              : "Eres un asesor senior de negocio versátil, no un generador automático de informes financieros. Comprende la intención real antes de responder. Para preguntas generales de estrategia, ideas, productividad, organización de equipos, liderazgo, prioridades o consultas abiertas, responde con naturalidad y ve directo al asunto, aportando propuestas útiles y pasos concretos. NO introduzcas ingresos, gastos, EBITDA ni otras métricas si el usuario no las pide o no son realmente relevantes para responder. Para preguntas financieras explícitas, utiliza solo los datos empresariales facilitados y muestra los cálculos pertinentes. Nunca añadas un resumen financiero genérico al final. No inventes hechos de la empresa, ahorros ni retornos garantizados; distingue supuestos de datos observados y señala la información que falte. Responde en el idioma de la conversación. Devuelve JSON {status:'ai',answer:'...'} con una respuesta útil y específica. Es apoyo a la decisión, no asesoramiento de inversión regulado.")
            : (body.language === "en"
              ? "You are a cautious strategic finance copilot. Analyse only supplied data. Never invent facts, guaranteed savings or returns. Return JSON {status:'ai',insights:[{category:'cut|invest|implement',title,detail,action,basis,impact:number|null,priority:'high|medium|low'}]}. Up to 8 insights. Distinguish observed values from estimates. No regulated investment advice."
              : "Eres un copiloto prudente de estrategia y finanzas. Analiza solo los datos facilitados. Nunca inventes hechos, ahorros ni retornos garantizados. Devuelve JSON {status:'ai',insights:[{category:'cut|invest|implement',title,detail,action,basis,impact:number|null,priority:'high|medium|low'}]}. Máximo 8 hallazgos. Distingue datos observados de estimaciones. No des asesoramiento de inversión regulado.") },
          { role: "user", content: body.question ? JSON.stringify({ question: body.question, companyData: compact }) : JSON.stringify(compact) },
        ],
      }),
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) return Response.json({ status: "local" }, { headers: corsHeaders });
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return Response.json({ status: "local" }, { headers: corsHeaders });
    const parsed = JSON.parse(content) as { insights?: unknown[] };
    if (body.question && typeof (parsed as { answer?: unknown }).answer === "string") return Response.json({ status: "ai", answer: (parsed as { answer: string }).answer.slice(0, 2400) }, { headers: corsHeaders });
    if (!Array.isArray(parsed.insights)) return Response.json({ status: "local" }, { headers: corsHeaders });
    return Response.json({ status: "ai", insights: parsed.insights.slice(0, 8) }, { headers: corsHeaders });
  } catch {
    return Response.json({ status: "local" }, { headers: corsHeaders });
  }
});
