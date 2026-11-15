/**
 * EnterpriseOS local AI engine facade.
 *
 * The engine is intentionally deterministic and offline: it resolves intent,
 * thread references and numeric scenarios against the live workspace model.
 * It is not presented as a generative language model.
 */
export {
  analyzeCopilotQuestion,
  analyzeCopilotQuestion as aiEngine,
} from "./strategic-copilot";
export type {
  CopilotAnalysis,
  CopilotIntent,
  IntentContext,
} from "./strategic-copilot";
