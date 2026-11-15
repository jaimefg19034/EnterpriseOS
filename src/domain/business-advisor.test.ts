import { describe, expect, it } from "vitest";
import { answerGeneralBusinessQuestion } from "./business-advisor";

describe("answerGeneralBusinessQuestion", () => {
  it.each([
    ["¿Qué me propones hacer hoy?", "today"],
    ["Dame 3 ideas para crecer", "ideas"],
    ["¿Cómo organizo mi equipo?", "team"],
    ["¿Por dónde empiezo?", "start"],
    ["Dame ideas para mejorar", "improve"],
    ["¿Cómo organizo esto?", "strategy"],
  ])("answers general request: %s", (question) => {
    const answer = answerGeneralBusinessQuestion(question, "es");
    expect(answer?.intent).toBe("advice");
    expect(answer?.response.length).toBeGreaterThan(40);
    expect(answer?.steps?.length).toBeGreaterThanOrEqual(3);
    expect(answer?.calculations).toEqual({});
    expect(answer?.matchedData).toEqual([]);
  });

  it("does not intercept explicit financial questions", () => {
    expect(answerGeneralBusinessQuestion("¿Cómo reduzco mis gastos un 10%?", "es")).toBeNull();
    expect(answerGeneralBusinessQuestion("Analiza mi margen EBITDA", "es")).toBeNull();
  });
});
