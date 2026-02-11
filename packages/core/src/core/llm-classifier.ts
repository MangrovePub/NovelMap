// ===========================================================================
// NovelMap — LLM Entity Classifier
// Optional AI-powered classification for ambiguous entity candidates.
// Uses the Anthropic API (Claude) for semantic understanding.
// ===========================================================================

import type { EntityType } from "./types.js";
import type { ClassifiedEntity } from "./entity-classifier.js";

// ─── Types ──────────────────────────────────────────────────

export interface LLMClassifierConfig {
  apiKey: string;
  model?: string; // defaults to claude-haiku-4-5-20251001
  maxBatchSize?: number; // candidates per API call, default 25
}

export interface LLMClassificationResult {
  name: string;
  type: EntityType;
  confidence: number;
  isNoise: boolean;
  reasoning: string;
}

export interface LLMBatchResult {
  results: LLMClassificationResult[];
  cost: number;
  tokensUsed: { input: number; output: number };
}

// ─── Cost estimation ────────────────────────────────────────

const HAIKU_INPUT_COST_PER_MTK = 1.00; // $/million tokens
const HAIKU_OUTPUT_COST_PER_MTK = 5.00;
const AVG_INPUT_TOKENS_PER_CANDIDATE = 80;
const AVG_OUTPUT_TOKENS_PER_CANDIDATE = 40;
const SYSTEM_PROMPT_TOKENS = 400;

export function estimateClassificationCost(candidateCount: number): {
  estimatedCost: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
} {
  const inputTokens = SYSTEM_PROMPT_TOKENS + candidateCount * AVG_INPUT_TOKENS_PER_CANDIDATE;
  const outputTokens = candidateCount * AVG_OUTPUT_TOKENS_PER_CANDIDATE;
  const cost =
    (inputTokens / 1_000_000) * HAIKU_INPUT_COST_PER_MTK +
    (outputTokens / 1_000_000) * HAIKU_OUTPUT_COST_PER_MTK;

  return {
    estimatedCost: Math.round(cost * 10000) / 10000,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
  };
}

// ─── LLM classification ─────────────────────────────────────

/**
 * Classify ambiguous entities using Claude.
 * Sends batches of candidates with their contexts to the Anthropic API.
 */
export async function classifyWithLLM(
  entities: ClassifiedEntity[],
  config: LLMClassifierConfig,
  bookTitle: string,
  genre: string,
  onProgress?: (processed: number, total: number) => void,
): Promise<LLMBatchResult> {
  const model = config.model || "claude-haiku-4-5-20251001";
  const batchSize = config.maxBatchSize || 25;
  const allResults: LLMClassificationResult[] = [];
  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    const result = await classifyBatch(batch, config.apiKey, model, bookTitle, genre);

    allResults.push(...result.results);
    totalInput += result.inputTokens;
    totalOutput += result.outputTokens;

    onProgress?.(Math.min(i + batchSize, entities.length), entities.length);
  }

  const cost =
    (totalInput / 1_000_000) * HAIKU_INPUT_COST_PER_MTK +
    (totalOutput / 1_000_000) * HAIKU_OUTPUT_COST_PER_MTK;

  return {
    results: allResults,
    cost: Math.round(cost * 10000) / 10000,
    tokensUsed: { input: totalInput, output: totalOutput },
  };
}

async function classifyBatch(
  entities: ClassifiedEntity[],
  apiKey: string,
  model: string,
  bookTitle: string,
  genre: string,
): Promise<{ results: LLMClassificationResult[]; inputTokens: number; outputTokens: number }> {
  const candidateList = entities.map((e, i) => {
    const ctxStr = e.contexts.slice(0, 3).map(c => `  "${c}"`).join("\n");
    return `${i + 1}. "${e.name}" (appears ${e.frequency}x across ${e.chapterSpread} chapters)\n${ctxStr}`;
  }).join("\n\n");

  const systemPrompt = `You are a literary entity classifier. Classify entity candidates extracted from a novel.

For each candidate, determine:
- type: one of "character", "location", "organization", "artifact", "concept", "event"
- isNoise: true if this is a common word, not a real entity
- confidence: 0-100 how certain you are
- reasoning: brief explanation (10 words max)

Respond with a JSON array. Example:
[{"name":"Knox","type":"character","isNoise":false,"confidence":95,"reasoning":"protagonist name, appears with dialogue verbs"}]`;

  const userPrompt = `Book: "${bookTitle}" (${genre})

Classify these entity candidates:

${candidateList}

Respond ONLY with a JSON array. No other text.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  const data = await response.json() as {
    content: { type: string; text: string }[];
    usage: { input_tokens: number; output_tokens: number };
  };

  const text = data.content[0]?.text || "[]";
  let parsed: LLMClassificationResult[];

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    parsed = JSON.parse(jsonMatch?.[0] || "[]");
  } catch {
    console.error("Failed to parse LLM response:", text);
    parsed = [];
  }

  // Validate and fill in missing results
  const results: LLMClassificationResult[] = entities.map(e => {
    const match = parsed.find(p => p.name === e.name);
    if (match) {
      return {
        name: match.name,
        type: validateType(match.type),
        confidence: Math.min(100, Math.max(0, match.confidence || 50)),
        isNoise: Boolean(match.isNoise),
        reasoning: match.reasoning || "",
      };
    }
    // LLM didn't classify this one — return low-confidence default
    return {
      name: e.name,
      type: e.type,
      confidence: e.confidence,
      isNoise: false,
      reasoning: "LLM did not classify",
    };
  });

  return {
    results,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

function validateType(type: string): EntityType {
  const valid: EntityType[] = ["character", "location", "organization", "artifact", "concept", "event"];
  return valid.includes(type as EntityType) ? (type as EntityType) : "character";
}

// ─── Merge LLM results ──────────────────────────────────────

/**
 * Merge LLM classification results back into the full entity list.
 * LLM results override the pipeline classification for matched entities.
 */
export function mergeLLMResults(
  entities: ClassifiedEntity[],
  llmResults: LLMClassificationResult[],
): ClassifiedEntity[] {
  const llmMap = new Map(llmResults.map(r => [r.name, r]));

  return entities.map(e => {
    const llm = llmMap.get(e.name);
    if (!llm) return e;

    if (llm.isNoise) {
      return { ...e, filtered: true, filterReason: `llm_noise: ${llm.reasoning}` };
    }

    return {
      ...e,
      type: llm.type,
      confidence: llm.confidence,
      classifiedBy: "context" as const, // LLM is context-based
    };
  });
}
