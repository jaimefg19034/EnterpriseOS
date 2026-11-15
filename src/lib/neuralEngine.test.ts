import { describe, expect, it } from "vitest";
import { analyseLanguage, neuralEngine } from "./neuralEngine";

describe("local neural conversation engine", () => {
  it("normalises accents, case and word forms", () => {
    const result = analyseLanguage("¿CÓMO ORGANIZO MEJOR MI SEMANA?");
    expect(result.normalised).toBe("como organizo mejor mi semana?");
    expect(result.mode).toBe("management");
  });

  it("routes open-ended customer acquisition ideas to creative advice without finance", () => {
    const result = neuralEngine("Dame ideas para captar clientes", "es");
    expect(result?.intent).toBe("advice");
    expect(result?.calculations).toEqual({});
    expect(result?.matchedData).toEqual(["conversation"]);
    expect(result?.response.toLowerCase()).not.toMatch(/ingresos|gastos|ebitda|margen|dinero/);
    expect(result?.steps?.length).toBeGreaterThanOrEqual(3);
  });

  it("creates a practical team organisation answer", () => {
    const result = neuralEngine("¿Cómo organizo mejor mi equipo?", "es");
    expect(result?.response).toContain("responsable");
    expect(result?.steps?.length).toBe(4);
  });

  it("keeps a previous topic for short follow-up questions", () => {
    const context = {
      previousIntent: "advice" as const,
      previousQuestion: "Dame ideas para captar clientes",
      previousResponse: "1. Especialización\n2. Distribución\n3. Experiencia",
      history: [{ role: "user" as const, content: "Dame ideas para captar clientes" }, { role: "assistant" as const, content: "1. Especialización\n2. Distribución\n3. Experiencia" }]
    };
    const result = neuralEngine("Dame más detalles del punto 2", "es", context);
    expect(result?.matchedData).toContain("conversation.previousResponse");
    expect(result?.response).toContain("el tema que acabamos de tratar");
  });

  it("leaves explicit financial questions to the live workspace analyst", () => {
    expect(neuralEngine("¿Cómo van mis gastos y mi margen EBITDA?", "es")).toBeNull();
    expect(neuralEngine("Show me revenue and cash flow", "en")).toBeNull();
  });

  it("responds naturally to a greeting", () => {
    const result = neuralEngine("Hola", "es");
    expect(result?.intent).toBe("social");
    expect(result?.response).toContain("¡Buenas!");
  });

  it("varies the response as the conversation develops", () => {
    const first = neuralEngine("Dame ideas para mejorar la experiencia del cliente", "es");
    const second = neuralEngine("Dame ideas para mejorar la experiencia del cliente", "es", {
      history: [{ role: "user", content: "¿Cómo organizo mi equipo?" }]
    });
    expect(first?.response).not.toBe(second?.response);
  });
});
