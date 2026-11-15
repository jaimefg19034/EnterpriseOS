/**
 * Local EnterpriseOS conversation router.
 * Natural-language questions are handled by the local semantic engine.
 * Explicit financial questions are delegated to the deterministic workspace analyst.
 */
import { analyseCopilotQuestion } from "./strategic-copilot";
import { neuralEngine, type NeuralContext } from "../lib/neuralEngine";
import type { CopilotAnalysis } from "./strategic-copilot";

export { analyseCopilotQuestion };
export type { CopilotAnalysis, CopilotIntent, IntentContext } from "./strategic-copilot";

export function aiEngine(...args: Parameters<typeof analyseCopilotQuestion>): CopilotAnalysis {
  const [question, financials, operations, language, workspace, context] = args;
  const conversational = neuralEngine(question, language, context as NeuralContext | undefined);
  if (conversational) return conversational;
  return analyseCopilotQuestion(question, financials, operations, language, workspace, context);
}
