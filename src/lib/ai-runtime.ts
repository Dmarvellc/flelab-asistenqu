import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type AIModelCandidate = {
  label: string;
  model: LanguageModel;
};

export function resolveEconomicalLanguageModels(): AIModelCandidate[] {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const anthropicModel = process.env.AI_ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5";

  if (!anthropicKey) return [];

  const anthropic = createAnthropic({ apiKey: anthropicKey });
  return [{
    label: `anthropic:${anthropicModel}`,
    model: anthropic(anthropicModel) as LanguageModel,
  }];
}

export function assertAIConfigured(models: AIModelCandidate[]) {
  if (models.length === 0) {
    throw new Error("AI_CREDENTIALS_MISSING");
  }
}
