/**
 * EnterpriseOS copilot router.
 * General business questions are answered independently from financial analysis;
 * financial questions continue through the deterministic live-workspace engine.
 */
import { analyzeCopilotQuestion } from "./strategic-copilot";
import { answerGeneralBusinessQuestion } from "./business-advisor";
import type { CopilotAnalysis } from "./strategic-copilot";

export { analyzeCopilotQuestion };
export type { CopilotAnalysis, CopilotIntent, IntentContext } from "./strategic-copilot";

export function aiEngine(...args: Parameters<typeof analyzeCopilotQuestion>): CopilotAnalysis {
  const [question, , , language] = args;
  const generalAnswer = answerGeneralBusinessQuestion(question, language);
  if (generalAnswer) return generalAnswer;
  return analyzeCopilotQuestion(...args);
}
