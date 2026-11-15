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
    const body = await request.json() as { language?: string; metrics?: Record<string, number>; operations?: Record<string, unknown> };
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
          { role: "system", content: body.language === "en"
            ? "You are a cautious strategic finance copilot. Analyse only supplied data. Never invent facts, guaranteed savings or returns. Return JSON {status:'ai',insights:[{category:'cut|invest|implement',title,detail,action,basis,impact:number|null,priority:'high|medium|low'}]}. Up to 8 insights. Distinguish observed values from estimates. No regulated investment advice."
            : "Eres un copiloto prudente de estrategia y finanzas. Analiza solo los datos facilitados. Nunca inventes hechos, ahorros ni retornos garantizados. Devuelve JSON {status:'ai',insights:[{category:'cut|invest|implement',title,detail,action,basis,impact:number|null,priority:'high|medium|low'}]}. Máximo 8 hallazgos. Distingue datos observados de estimaciones. No des asesoramiento de inversión regulado." },
          { role: "user", content: JSON.stringify(compact) },
        ],
      }),
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) return Response.json({ status: "local" }, { headers: corsHeaders });
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return Response.json({ status: "local" }, { headers: corsHeaders });
    const parsed = JSON.parse(content) as { insights?: unknown[] };
    if (!Array.isArray(parsed.insights)) return Response.json({ status: "local" }, { headers: corsHeaders });
    return Response.json({ status: "ai", insights: parsed.insights.slice(0, 8) }, { headers: corsHeaders });
  } catch {
    return Response.json({ status: "local" }, { headers: corsHeaders });
  }
});
