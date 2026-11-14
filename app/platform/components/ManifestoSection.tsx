import TechnicalLabel from "../../components/ui/TechnicalLabel";

export default function ManifestoSection() {
  return (
    <section className="p-manifesto" id="manifesto">
        <div className="p-manifesto-meta"><TechnicalLabel number="01">THE POINT OF VIEW</TechnicalLabel><span>AN ENTERPRISEOS PRINCIPLE</span></div>
        <h2>Una empresa genera<br />miles de cifras.<br /><em>Pero no todas</em><br /><span>cuentan la misma historia.</span></h2>
        <div className="p-manifesto-bottom"><p>El valor está en entender cómo se conectan: sus supuestos, su evolución, sus consecuencias y el margen de decisión que todavía existe.</p><span>01 — 04<br />CONTEXT OVER NOISE</span></div>
        <svg className="p-manifesto-lines" viewBox="0 0 520 520" aria-hidden="true"><g fill="none" stroke="currentColor"><path d="M260 5 C450 80 470 200 260 260 S70 440 260 515" /><path d="M260 30 C425 95 445 205 260 260 S95 425 260 490" /><path d="M260 55 C400 110 420 210 260 260 S120 410 260 465" /><path d="M260 80 C375 125 395 215 260 260 S145 395 260 440" /><path d="M260 105 C350 140 370 220 260 260 S170 380 260 415" /></g></svg>
      </section>
  );
}
