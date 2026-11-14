"use client";

import { useState, type CSSProperties, type PointerEvent } from "react";
import { scenarios, type Scenario } from "./scenarios";

type FieldPointer = {
  x: number;
  y: number;
  rotateX: number;
  rotateY: number;
  shiftX: number;
  shiftY: number;
  active: boolean;
};

const RESTING_POINTER: FieldPointer = {
  x: 50,
  y: 50,
  rotateX: 0,
  rotateY: 0,
  shiftX: 0,
  shiftY: 0,
  active: false,
};

type SpatialStyle = CSSProperties & {
  "--field-x": string;
  "--field-y": string;
  "--field-rotate-x": string;
  "--field-rotate-y": string;
  "--field-shift-x": string;
  "--field-shift-y": string;
};

function TopographicField({ scenario }: { scenario: Scenario }) {
  const active = scenarios[scenario];
  const shift = scenario === "conservador" ? "field-down" : scenario === "crecimiento" ? "field-up" : "field-base";
  const [pointer, setPointer] = useState<FieldPointer>(RESTING_POINTER);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
    const normalizedX = (x - 50) / 50;
    const normalizedY = (y - 50) / 50;

    setPointer({
      x,
      y,
      rotateX: normalizedY * -3.2,
      rotateY: normalizedX * 4.2,
      shiftX: (50 - x) * 0.11,
      shiftY: (50 - y) * 0.09,
      active: true,
    });
  }

  const spatialStyle: SpatialStyle = {
    "--field-x": `${pointer.x}%`,
    "--field-y": `${pointer.y}%`,
    "--field-rotate-x": `${pointer.rotateX}deg`,
    "--field-rotate-y": `${pointer.rotateY}deg`,
    "--field-shift-x": `${pointer.shiftX}px`,
    "--field-shift-y": `${pointer.shiftY}px`,
  };

  return (
    <div
      className={`p-field-visual ${shift}${pointer.active ? " is-pointer-active" : ""}`}
      style={spatialStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setPointer(RESTING_POINTER)}
      role="group"
      aria-label={`Visualización ilustrativa del escenario ${active.label}. Mueve el puntero para explorar la profundidad del campo.`}
    >
      <div className="p-field-top"><span>EOS / DECISION FIELD</span><span>ILLUSTRATIVE OUTPUT · NO LIVE DATA</span></div>
      <svg className="p-contours" viewBox="0 0 760 520" role="img" aria-label="Líneas topográficas que representan escenarios financieros">
        <defs>
          <linearGradient id="fieldStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9aafff" stopOpacity=".08" /><stop offset=".48" stopColor="#b8c6ff" stopOpacity=".8" /><stop offset="1" stopColor="#62c4a4" stopOpacity=".3" /></linearGradient>
          <radialGradient id="fieldGlow"><stop stopColor="#9fb3ff" stopOpacity=".28" /><stop offset="1" stopColor="#9fb3ff" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="390" cy="260" rx="300" ry="210" fill="url(#fieldGlow)" />
        <g fill="none" stroke="url(#fieldStroke)" strokeWidth="1.15">
          <path d="M-30 120 C90 8 180 45 255 104 S390 190 500 92 S690 15 800 95" />
          <path d="M-35 145 C85 32 182 68 258 128 S393 214 505 117 S690 42 805 120" />
          <path d="M-40 170 C82 57 184 92 262 152 S397 238 510 142 S694 68 810 145" />
          <path d="M-45 195 C80 82 188 117 266 176 S402 262 515 167 S698 94 815 170" />
          <path d="M-50 220 C78 108 191 142 270 200 S407 286 520 192 S702 120 820 195" />
          <path d="M-55 245 C75 134 194 167 274 224 S412 310 525 217 S706 146 825 220" />
          <path d="M-60 270 C73 160 197 192 278 248 S417 334 530 242 S710 172 830 245" />
          <path d="M-65 295 C70 186 200 217 282 272 S422 358 535 267 S714 198 835 270" />
          <path d="M-70 320 C68 212 203 242 286 296 S427 382 540 292 S718 224 840 295" />
          <path d="M-75 345 C65 238 206 267 290 320 S432 406 545 317 S722 250 845 320" />
          <path d="M-80 370 C63 264 209 292 294 344 S437 430 550 342 S726 276 850 345" />
          <path d="M-85 395 C60 290 212 317 298 368 S442 454 555 367 S730 302 855 370" />
          <path d="M90 520 C115 430 210 395 290 420 S425 495 520 440 S680 400 760 460" />
          <path d="M120 540 C145 450 228 420 305 443 S435 520 535 465 S690 428 780 488" />
        </g>
        <path className="p-field-route" d="M95 375 C180 335 215 245 315 265 S440 350 520 240 S620 175 680 145" />
        <circle cx="315" cy="265" r="7" fill="#b9c7ff" /><circle cx="315" cy="265" r="18" fill="none" stroke="#b9c7ff" strokeOpacity=".35" />
        <circle cx="680" cy="145" r="5" fill="#68c7a5" /><circle cx="680" cy="145" r="14" fill="none" stroke="#68c7a5" strokeOpacity=".35" />
      </svg>
      <div className="p-field-coordinate p-coordinate-a"><small>01 / REVENUE</small><b>{active.revenue}</b><span>Proyección anual</span></div>
      <div className="p-field-coordinate p-coordinate-b"><small>02 / EBITDA</small><b>{active.ebitda}</b><span>Escenario {active.label.toLowerCase()}</span></div>
      <div className="p-field-coordinate p-coordinate-c"><small>03 / CASH</small><b>{active.cash}</b><span>Posición estimada</span></div>
      <div className="p-field-legend"><i /> SCENARIO PATH <span>↗</span></div>
      <div className="p-field-bottom"><span>FINANCIAL TERRITORY / 001</span><span>MOVE THE ASSUMPTION. READ THE CONSEQUENCE.</span></div>
    </div>
  );
}

export default TopographicField;
