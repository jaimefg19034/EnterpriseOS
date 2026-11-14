export type PlanId = "essential" | "professional" | "business";

export type WorkspaceView = "overview" | "model" | "planning" | "statements" | "operations" | "reports";

export const PLANS: Record<PlanId, { name: string; monthlyPrice: number; description: string; features: string[] }> = {
  essential: {
    name: "Essential",
    monthlyPrice: 29,
    description: "Control financiero esencial para empresas pequeñas.",
    features: ["Dashboard ejecutivo", "Cuenta de resultados (P&L)", "Indicadores financieros básicos"],
  },
  professional: {
    name: "Professional",
    monthlyPrice: 79,
    description: "Planificación y modelización para anticipar decisiones.",
    features: ["Todo Essential", "Presupuestos y escenarios", "Modelo de tres estados", "Informes y exportaciones"],
  },
  business: {
    name: "Business",
    monthlyPrice: 149,
    description: "Visión financiera y operativa ampliada.",
    features: ["Todo Professional", "Operaciones y centros de coste", "Análisis operativo ampliado", "Acceso a todas las áreas actuales"],
  },
};

const PLAN_RANK: Record<PlanId, number> = { essential: 1, professional: 2, business: 3 };

export function canAccessView(plan: PlanId | null, view: WorkspaceView): boolean {
  if (!plan) return false;
  const required: Record<WorkspaceView, PlanId> = {
    overview: "essential",
    model: "essential",
    reports: "professional",
    planning: "professional",
    statements: "professional",
    operations: "business",
  };
  return PLAN_RANK[plan] >= PLAN_RANK[required[view]];
}

export function minimumPlanForView(view: WorkspaceView): PlanId {
  if (view === "operations") return "business";
  if (view === "planning" || view === "statements" || view === "reports") return "professional";
  return "essential";
}
