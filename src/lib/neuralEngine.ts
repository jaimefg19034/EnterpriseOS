import type { Language } from "../i18n/translations";
import type { CopilotAnalysis, CopilotIntent } from "../domain/strategic-copilot";

export type NeuralTurn = { role: "user" | "assistant"; content: string };
export type NeuralContext = {
  previousIntent?: CopilotIntent;
  previousQuestion?: string;
  previousResponse?: string;
  previousCalculations?: Record<string, number>;
  history?: NeuralTurn[];
};
export type LinguisticAnalysis = {
  normalised: string; tokens: string[]; stems: string[]; topic: string;
  mode: "creative" | "plan" | "management" | "explain" | "casual" | "open" | "finance";
  confidence: number; isFollowUp: boolean;
};

const STOP = new Set(("a al algo algun alguna algunos algunas ante antes asi aunque bajo bien cada casi como con contra cual cuales cuando cuanto cuantos de del desde donde durante e el ella ellas ello ellos en entre era es esa esas ese eso esos esta estaba estas este esto estos fue ha hacia hasta hay la las le les lo los mas me mi mis muy ni no nos o os otra otras otro otros para pero poco por porque que quien quienes se sea ser si sin sobre su sus te tener tiene todo todos tu tus un una unas uno unos y ya the a an and are as at be been but by can could did do does doing for from had has have he her here hers him his how i if in into is it its may me might more most my of on one or our ours she should so some such than that the their them then there these they this those to up us was we were what when where which who why will with would you your yours").split(" "));
const SUFFIXES = ["amientos","imientos","aciones","uciones","adoras","adores","amiento","imiento","acion","ucion","mente","idades","idad","anzas","anza","ismos","istas","ando","iendo","ieron","arian","aria","ados","adas","idos","idas","es","os","as","s"];
const LEXICON: Record<string,string[]> = {
 creative:["idea","ideas","inventar","creativo","creatividad","innovar","innovacion","alternativa","alternativas","propuesta","propuestas","brainstorm","brainstorming","diferenciar","captar","atraer","clientes","crecer","growth","acquisition","marketing"],
 plan:["plan","pasos","paso a paso","empezar","comenzar","implementar","ejecutar","poner en marcha","roadmap","hoja de ruta","proceso","fases","priorizar","prioridad","objetivo","plazo","planificar"],
 management:["equipo","personas","empleados","trabajo","organizar","organizacion","gestionar","gestion","liderar","liderazgo","delegar","delegacion","productividad","reuniones","responsable","responsabilidades","operaciones","procesos","workflow","coordinar","team","manage","organise","organize"],
 explain:["explica","explicar","explicacion","significa","concepto","por que","como funciona","define","definicion","diferencia","what is","why does","how does","meaning"],
 casual:["hola","buenas","hey","hello","hi","gracias","thanks","thank you","perfecto","genial","vale","ok","okay","buenos dias","buenas tardes","buenas noches"],
 finance:["ingreso","ingresos","facturacion","ventas","venta","gasto","gastos","coste","costes","costo","costos","ebitda","margen","rentabilidad","presupuesto","caja","liquidez","deuda","factura","facturas","cobro","cobros","pago","pagos","inversion","roi","cash","revenue","expense","expenses","cost","costs","profit","margin","budget","forecast","invoice","receivable","payable","balance","financial","financiero","financiera","dinero","euros","eur","ahorro","ahorrar"]
};
const FINANCE = /\b(ingresos?|facturacion|gastos?|costes?|costos?|ebitda|margen|rentabilidad|presupuesto|tesoreria|caja|liquidez|deuda|facturas?|cobros?|pagos?|inversion(?:es)?|roi|cash flow|cash|revenue|expenses?|costs?|profit|margin|budget|forecast|invoice|receivables?|payables?|financial|financiero|financiera|dinero|euros?|ahorro|ahorrar)\b/;
const FOLLOW = /\b(mas detalles|amplia|desarrolla|profundiza|el punto|punto [123]|el segundo|el primero|eso|esto|lo anterior|hazlo|cambialo|mas agresivo|mas conservador|por donde empiezo|y ahora|siguiente paso|paso a paso|aplica eso|en mi empresa|that|this|it|the second|the first|more detail|expand|go deeper|make it|what next|next step|step by step|apply that|in my company)\b/;
const normalise=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9€%.,!?'\s-]/g," ").replace(/\s+/g," ").trim();
function stem(w:string):string{for(const suffix of SUFFIXES)if(w.length>suffix.length+3&&w.endsWith(suffix))return w.slice(0,-suffix.length);if(w.length>5&&w.endsWith("ing"))return w.slice(0,-3);if(w.length>4&&w.endsWith("ed"))return w.slice(0,-2);return w;}
function tokensOf(s:string):string[]{return normalise(s).split(/[\s.,!?;:()[\]{}]+/).filter(x=>x.length>1&&!STOP.has(x));}
function hash(s:string):number{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function score(tokens:string[],terms:string[]):number{let total=0;for(const term of terms){const n=normalise(term);if(n.includes(" ")){if(tokens.join(" ").includes(n))total+=3.8;}else if(tokens.some(t=>t===n||stem(t)===stem(n)))total+=1.15;}return total;}
function topicOf(question:string,context?:NeuralContext):string{
 const all=Object.values(LEXICON).flat().filter(x=>!x.includes(" "));
 const ignored=new Set(["quiero","necesito","puedo","debo","deberia","dame","haz","hacer","hoy","manana","semana","mes","empresa","negocio","mejor","mejorar","como","que","cual","donde","cuando","por","favor","propones","proponer","recomiendas","recomendar","sugieres","sugiero","haria","harias","please","today","week","business","company","need","want","help","give","make","should","could","would"]);
 const follow=FOLLOW.test(normalise(question));
 if(follow&&context?.previousQuestion)return topicOf(context.previousQuestion);
 const words=tokensOf(question).filter(t=>!ignored.has(t)&&!all.some(x=>stem(x)===stem(t)));
 if(words.length)return words.slice(0,5).join(" ");
 const phrase=normalise(question).match(/\b(?:para|sobre|acerca de|regarding|for)\s+(.{3,45})$/);
 if(phrase)return phrase[1].replace(/[?.!,].*$/,"").trim();
 const previous=tokensOf(context?.previousQuestion??"").filter(t=>!STOP.has(t));
 return previous.slice(0,5).join(" ")||"el objetivo que quieres conseguir";
}
function modeOf(q:string,tokens:string[],context?:NeuralContext):LinguisticAnalysis["mode"]{
 const explicitSalesMetrics=/\b(cuanto vendimos|cuantas ventas|ventas del mes|analiza las ventas|como van las ventas|sales figures|sales performance|sales revenue)\b/.test(q);
 if(FINANCE.test(q)||explicitSalesMetrics)return "finance";
 if(/^(hola|buenas|hey|hello|hi|gracias|thanks|thank you|perfecto|genial|vale|ok|okay|buenos dias|buenas tardes|buenas noches)\b/.test(q))return "casual";
 const follow=FOLLOW.test(q)&&!!(context?.previousQuestion||context?.history?.length);
 if(follow&&tokens.length<=8){
  const previous=normalise(context?.previousQuestion??"");
  if(/\b(idea|ideas|innov|captar|crecer|cliente|marketing)\b/.test(previous))return "creative";
  if(/\b(equipo|organizar|gestionar|productividad|delegar|liderazgo|procesos)\b/.test(previous))return "management";
  if(/\b(plan|pasos|empezar|implementar|ejecutar)\b/.test(previous))return "plan";
  return "open";
 }
 const scores={creative:score(tokens,LEXICON.creative),plan:score(tokens,LEXICON.plan),management:score(tokens,LEXICON.management),explain:score(tokens,LEXICON.explain),casual:score(tokens,LEXICON.casual)};
 const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
 if(ranked[0][1]>=2.2)return ranked[0][0] as LinguisticAnalysis["mode"];
 if(/\b(idea|ideas|propuesta|alternativa|innovar|captar|atraer|crecer|brainstorm)\w*/.test(q))return "creative";
 if(/\b(plan|pasos|empezar|comenzar|implementar|ejecutar|priorizar|roadmap|por donde|hoy|today)\w*/.test(q))return "plan";
 if(/\b(equipo|empleados|delegar|liderazgo|productividad|reuniones|procesos|gestionar|organiz)\w*/.test(q))return "management";
 if(/\b(explica|explicar|significa|por que|como funciona|define|what is|why|how does)\b/.test(q))return "explain";
 return "open";
}
export function analyseLanguage(question:string,context?:NeuralContext):LinguisticAnalysis{
 const normalised=normalise(question),tokens=tokensOf(normalised),mode=modeOf(normalised,tokens,context);
 const max=Math.max(0,...Object.values(LEXICON).map(terms=>score(tokens,terms)));
 return {normalised,tokens,stems:tokens.map(stem),topic:topicOf(question,context),mode,confidence:mode==="finance"?0.98:mode==="casual"?0.95:Math.min(0.96,0.58+max*0.06),isFollowUp:FOLLOW.test(normalised)&&!!(context?.previousQuestion||context?.history?.length)};
}
const pick=<T,>(items:T[],seed:number):T=>items[Math.abs(seed)%items.length];
const es=(language:Language)=>language==="es";
function answer(question:string,language:Language,a:LinguisticAnalysis,context?:NeuralContext):CopilotAnalysis{
 const spanish=es(language),seed=hash(question+"|"+(context?.history?.length??0)+"|"+(context?.previousResponse??"").slice(-40));
 const topic=a.isFollowUp?(spanish?"el tema que acabamos de tratar":"the topic we just discussed"):a.topic;
 const intro=spanish?[
  "Vamos a convertirlo en algo concreto y ejecutable.",
  "Lo enfocaría con criterio práctico, sin complicarlo más de lo necesario.",
  "La clave es elegir una dirección, probarla y aprender antes de ampliar el esfuerzo."
 ]:[
  "Let's turn this into something concrete and executable.",
  "I would approach this pragmatically, without adding unnecessary complexity.",
  "The key is to choose a direction, test it, and learn before scaling the effort."
 ];
 if(a.mode==="casual")return {intent:"social",response:spanish?"¡Buenas! Podemos pensar ideas, resolver un problema, ordenar prioridades o analizar el workspace cuando tenga sentido. ¿Qué tienes entre manos?":"Hi. We can brainstorm, work through a problem, organise priorities, or analyse the workspace when it is relevant. What are you working on?",calculations:{},matchedData:["conversation"],confidence:a.confidence};
 const out=[pick(intro,seed)];
 const pointMatch=normalise(question).match(/\b(?:punto|apartado|point|item)\s*(1|2|3|uno|dos|tres)\b/);
 if(a.isFollowUp&&pointMatch&&context?.previousResponse){
  const number=({uno:"1",dos:"2",tres:"3"} as Record<string,string>)[pointMatch[1]]??pointMatch[1];
  const selected=context.previousResponse.split(/\n+/).find(line=>new RegExp("^\\s*"+number+"[.)]").test(line.trim()));
  if(selected){
   const detail=selected.replace(/^\s*\d+[.)]\s*/,"").replace(/\*\*/g,"");
   const response=spanish?"El punto "+number+" al que te refieres es: "+detail+"\n\nPara desarrollarlo, concreta el cliente o usuario al que afecta, define la acción exacta, prueba una versión pequeña y revisa qué resultado produce.":"The point "+number+" you mean is: "+detail+"\n\nTo develop it, define the customer or user it affects, specify the exact action, test a small version, and review the result.";
   const steps=spanish?["Define el resultado específico que debe producir este punto.","Asigna un responsable y prepara una primera prueba acotada.","Recoge feedback y objeciones de las personas afectadas.","Decide qué ajustar antes de ampliar la iniciativa."]:["Define the specific outcome this point should produce.","Assign an owner and prepare a tightly scoped first test.","Collect feedback and objections from the people affected.","Decide what to adjust before scaling the initiative."];
   return {intent:"advice",response,calculations:{},matchedData:["conversation.previousResponse"],steps,action:"implement",confidence:0.94};
  }
 }
 let steps:string[]=[];
 if(a.mode==="creative"){
  out.push(spanish?"Para "+topic+", exploraría tres vías que ponen a prueba hipótesis distintas:":"For "+topic+", I would explore three routes that test different hypotheses:");
  const ideas=spanish?[
   ["Especialización","Resuelve un problema muy concreto para un segmento reconocible; competir por claridad suele ser mejor que intentar gustar a todos."],
   ["Distribución","Llega al cliente a través de una comunidad, socio o canal donde ya exista confianza y atención."],
   ["Experiencia","Haz que el primer contacto, la entrega y el seguimiento sean tan sencillos que el cliente tenga un motivo real para recomendarte."]
  ]:[
   ["Specialisation","Solve one specific problem for a recognisable segment; competing on clarity is often stronger than trying to appeal to everyone."],
   ["Distribution","Reach customers through a community, partner, or channel where trust and attention already exist."],
   ["Experience","Make discovery, delivery, and follow-up so clear that customers have a genuine reason to recommend you."]
  ];
  ideas.forEach((item,i)=>out.push((i+1)+". **"+item[0]+".** "+item[1]));
  out.push(spanish?"No lanzaría las tres a la vez: prepara una prueba pequeña por vía, escucha las objeciones y duplica la que genere señales de intención reales.":"I would not launch all three at once: run a small test for each route, listen to objections, and double down on the one producing genuine intent.");
  steps=spanish?["Define el segmento y el problema específico.","Formula una propuesta de valor distinta para cada hipótesis.","Prueba cada vía con un grupo pequeño y un mensaje concreto.","Compara respuestas cualitativas y conversiones; conserva la mejor señal."]:["Define the segment and specific problem.","Create a distinct value proposition for each hypothesis.","Test each route with a small group and a focused message.","Compare qualitative responses and conversions; keep the strongest signal."];
 }else if(a.mode==="plan"){
  out.push(spanish?"Para avanzar con "+topic+", dividiría la ejecución en hitos con entregables verificables:":"To move "+topic+" forward, I would split execution into milestones with verifiable deliverables:");
  steps=spanish?["Define el resultado: qué debe cambiar y cómo sabrás que está terminado.","Prepara la ejecución: dependencias, información pendiente y una persona responsable por decisión.","Entrega una primera versión acotada; evita añadir extras antes de validar lo esencial.","Revisa el resultado, elimina el mayor bloqueo y decide el siguiente ciclo."]:["Define the outcome: what must change and how completion will be recognised.","Prepare execution: dependencies, missing information, and one owner for each decision.","Deliver a tightly scoped first version; do not add extras before validating the essentials.","Review the result, remove the biggest blocker, and choose the next cycle."];
  out.push(steps.map((x,i)=>(i+1)+". "+x).join("\n"));
  out.push(spanish?"Mantén una única lista de tareas, un responsable por entrega y una fecha de revisión.":"Keep one task list, one accountable owner per deliverable, and a review date.");
 }else if(a.mode==="management"){
  out.push(spanish?"Para organizar "+topic+", estructura el trabajo alrededor de resultados, capacidad y responsabilidad clara:":"To organise "+topic+", structure the work around outcomes, capacity, and clear accountability:");
  steps=spanish?["Agrupa el trabajo por resultados o funciones; evita duplicidades y zonas sin responsable.","Asigna una persona responsable final a cada prioridad y aclara qué puede decidir por sí misma.","Mantén una fuente única de verdad con prioridad, estado, bloqueo y siguiente acción.","Haz una revisión semanal breve para redistribuir capacidad y resolver decisiones pendientes."]:["Group work by outcomes or functions; remove duplication and ownerless areas.","Assign one directly accountable person to each priority and clarify their decision rights.","Keep one source of truth for priority, status, blockers, and next action.","Run a short weekly review to rebalance capacity and resolve outstanding decisions."];
  out.push(steps.map((x,i)=>(i+1)+". "+x).join("\n"));
  out.push(spanish?"Mide resultados terminados, calidad y bloqueos recurrentes; no confundas estar ocupado con avanzar.":"Measure completed outcomes, quality, and recurring blockers; do not confuse activity with progress.");
 }else if(a.mode==="explain"){
  out.push(spanish?"La forma más clara de entender "+topic+" es separar tres capas:":"The clearest way to understand "+topic+" is to separate three layers:");
  steps=spanish?["Propósito: qué resultado se busca y para quién importa.","Mecanismo: qué actividad o decisión produce ese resultado.","Condiciones: qué recursos, dependencias y riesgos determinan si funciona."]:["Purpose: what outcome is sought and who it matters to.","Mechanism: which activity or decision produces that outcome.","Conditions: which resources, dependencies, and risks determine whether it works."];
  out.push(steps.map((x,i)=>(i+1)+". "+x).join("\n"));
  out.push(spanish?"Si lo aplicamos a un caso concreto, podremos distinguir la teoría de lo que realmente conviene hacer.":"Applied to a specific case, we can distinguish the theory from what is actually worth doing.");
 }else{
  out.push(spanish?"Antes de recomendar una solución para "+topic+", separaría el objetivo, el obstáculo y la decisión que tienes delante.":"Before recommending a solution for "+topic+", I would separate the outcome, the obstacle, and the decision in front of you.");
  out.push(spanish?"Mi propuesta inicial es elegir un resultado observable, identificar qué lo frena y probar el cambio más pequeño que permita aprender algo útil.":"My initial recommendation is to choose an observable outcome, identify what is blocking it, and test the smallest change that can produce useful learning.");
  steps=spanish?["Escribe el resultado que quieres conseguir en una frase.","Identifica el principal bloqueo o incertidumbre.","Elige una acción pequeña, con responsable y fecha de revisión."]:["Write the outcome you want in one sentence.","Identify the main blocker or uncertainty.","Choose a small action with an owner and review date."];
 }
 if(a.isFollowUp&&context?.previousResponse)out.unshift(spanish?"Retomo el hilo anterior y desarrollo la idea sin empezar de cero.":"I'll pick up the previous thread and build on it rather than starting over.");
 const closing=spanish?["Si quieres, el siguiente paso es convertirlo en un plan con responsables y plazos.","La decisión importante ahora es qué hipótesis merece la primera prueba.","Conviene validar esto con un ejemplo real antes de convertirlo en un proceso fijo."]:["The next step is to turn this into a plan with owners and deadlines.","The important decision now is which hypothesis deserves the first test.","Validate this with a real example before turning it into a fixed process."];
 out.push(pick(closing,seed+1));
 return {intent:"advice",response:out.join("\n\n"),calculations:{},matchedData:a.isFollowUp?["conversation.history","conversation.previousResponse"]:["conversation"],steps,action:a.mode==="explain"?"explain":"implement",confidence:a.confidence};
}
export function neuralEngine(question:string,language:Language,context?:NeuralContext):CopilotAnalysis|null{
 const a=analyseLanguage(question,context);
 if(!a.normalised)return {intent:"unknown",response:es(language)?"Dime qué quieres resolver y lo pensamos juntos.":"Tell me what you want to work through and we can think it through.",calculations:{},matchedData:[],confidence:0.4};
 if(a.mode==="finance")return null;
 return answer(question,language,a,context);
}
