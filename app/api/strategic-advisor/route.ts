import { NextResponse } from "next/server";
export const runtime="nodejs";
export async function POST(request:Request){
 const key=process.env.OPENAI_API_KEY;
 if(!key)return NextResponse.json({status:"local"});
 let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 if(!body||typeof body!=="object"||!("metrics" in body))return NextResponse.json({error:"Missing metrics."},{status:400});
 const data=body as {language?:string;metrics?:Record<string,number>;operations?:Record<string,unknown>};
 if(!data.metrics||Object.values(data.metrics).some(v=>typeof v!=="number"||!Number.isFinite(v)))return NextResponse.json({error:"Invalid metrics."},{status:400});
 const ops=data.operations??{};
 const compact={metrics:data.metrics,operations:Object.fromEntries(["opportunities","projects","risks","kpis","costCenters","expenses"].map(k=>[k,Array.isArray(ops[k])?(ops[k] as unknown[]).slice(0,k==="expenses"?200:100):[]]))};
 try{
  const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",temperature:.2,response_format:{type:"json_object"},messages:[{role:"system",content:data.language==="en"?"You are a cautious strategic finance copilot. Analyse only supplied data. Never invent facts, guaranteed savings or returns. Return JSON {status:'ai',insights:[{category:'cut|invest|implement',title,detail,action,basis,impact:number|null,priority:'high|medium|low'}]}. Up to 8 insights. Distinguish observed values from estimates. No regulated investment advice.":"Eres un copiloto prudente de estrategia y finanzas. Analiza solo los datos facilitados. Nunca inventes hechos, ahorros ni retornos garantizados. Devuelve JSON {status:'ai',insights:[{category:'cut|invest|implement',title,detail,action,basis,impact:number|null,priority:'high|medium|low'}]}. Máximo 8 hallazgos. Distingue datos observados de estimaciones. No des asesoramiento de inversión regulado."},{role:"user",content:JSON.stringify(compact)}]}),signal:AbortSignal.timeout(18000)});
  if(!response.ok)return NextResponse.json({status:"local"});
  const payload=await response.json() as {choices?:{message?:{content?:string}}[]};
  const content=payload.choices?.[0]?.message?.content;if(!content)return NextResponse.json({status:"local"});
  const parsed=JSON.parse(content) as {insights?:unknown[]};
  if(!Array.isArray(parsed.insights))return NextResponse.json({status:"local"});
  return NextResponse.json({status:"ai",insights:parsed.insights.slice(0,8)});
 }catch{return NextResponse.json({status:"local"})}
}
