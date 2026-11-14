export type Scenario = "conservador" | "base" | "crecimiento";

export const scenarios: Record<Scenario, { label: string; revenue: string; ebitda: string; cash: string; bars: number[]; note: string; delta: string }> = {
  conservador: { label: "Conservador", revenue: "218.000 €", ebitda: "31.000 €", cash: "84.000 €", bars: [58, 36, 43], note: "Menor ritmo de ventas y presión sobre el margen. Revisa costes y necesidades de liquidez.", delta: "−12,1 %" },
  base: { label: "Base", revenue: "248.000 €", ebitda: "51.000 €", cash: "112.000 €", bars: [72, 61, 61], note: "Escenario de referencia para comparar el rendimiento esperado con otras hipótesis.", delta: "REFERENCIA" },
  crecimiento: { label: "Crecimiento", revenue: "286.000 €", ebitda: "68.000 €", cash: "139.000 €", bars: [88, 78, 78], note: "Un crecimiento más rápido mejora el resultado previsto, pero exige vigilar el capital circulante.", delta: "+15,3 %" }
};
