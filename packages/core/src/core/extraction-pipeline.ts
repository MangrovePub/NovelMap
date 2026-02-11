// ===========================================================================
// NovelMap — Entity Extraction Pipeline
// Orchestrates: regex scanner → gazetteer → classifier → (optional) LLM
// ===========================================================================

import type { ExtractionCandidate, ExtractionResult } from "./entity-extraction.js";
import {
  classifyEntities,
  getValidEntities,
  getEntitiesNeedingReview,
  type RawCandidate,
  type ClassifiedEntity,
} from "./entity-classifier.js";
import {
  classifyWithLLM,
  estimateClassificationCost,
  mergeLLMResults,
  type LLMClassifierConfig,
  type LLMBatchResult,
} from "./llm-classifier.js";
import { isNoise, isCapsNoise, isStreetAddress, lookup } from "./gazetteer.js";

// ─── Types ──────────────────────────────────────────────────

export interface PipelineResult {
  entities: ClassifiedEntity[];
  filtered: ClassifiedEntity[];
  needsReview: ClassifiedEntity[];
  stats: PipelineStats;
}

export interface PipelineStats {
  totalCandidates: number;
  filteredAsNoise: number;
  autoClassified: number;
  needsReview: number;
  llmEnhanced: number;
  llmCost?: number;
}

export interface PipelineOptions {
  enableLLM?: boolean;
  llmConfig?: LLMClassifierConfig;
  bookTitle?: string;
  genre?: string;
  confidenceThreshold?: number;
  onProgress?: (stage: string, detail: string) => void;
}

// ─── Pipeline ───────────────────────────────────────────────

/**
 * Transform ExtractionCandidate (from existing scanner) into RawCandidate
 * (for the new classifier).
 */
function toRawCandidate(c: ExtractionCandidate, totalChapters: number): RawCandidate {
  return {
    name: c.text,
    type: c.suggestedType || "UNKNOWN",
    score: c.score,
    frequency: c.occurrences,
    chapterSpread: c.chapterSpread,
    totalChapters,
    nonSentenceStartRatio: 0, // not tracked in current scanner output
    contexts: c.sampleContexts,
  };
}

/**
 * Convert ClassifiedEntity back to ExtractionCandidate format
 * (for backward compatibility with existing UI).
 */
function toExtractionCandidate(e: ClassifiedEntity): ExtractionCandidate {
  let confidence: "high" | "medium" | "low";
  if (e.confidence >= 60) confidence = "high";
  else if (e.confidence >= 35) confidence = "medium";
  else confidence = "low";

  return {
    text: e.name,
    suggestedType: e.type,
    confidence,
    score: e.score,
    occurrences: e.frequency,
    chapterSpread: e.chapterSpread,
    sampleContexts: e.contexts,
    relatedCandidates: e.relatedNames,
  };
}

/**
 * Run the full extraction pipeline on scanner output.
 *
 * Usage:
 *   const scannerResult = extractEntityCandidates(db, projectId);
 *   const enhanced = await runPipeline(scannerResult, totalChapters, options);
 */
export async function runPipeline(
  scannerResult: ExtractionResult,
  totalChapters: number,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const threshold = options.confidenceThreshold || 50;

  // Phase 1: Enhance scanner output with gazetteer
  // The scanner already has good context-based classification.
  // The pipeline layers on top: filter noise, fix types via gazetteer.
  options.onProgress?.("enhance", "Enhancing classification...");

  let noiseCount = 0;
  let classified: ClassifiedEntity[] = [];

  for (const cand of scannerResult.candidates) {
    // Filter noise that slipped through the scanner
    if (isNoise(cand.text)) {
      noiseCount++;
      continue;
    }
    if (isStreetAddress(cand.text)) {
      noiseCount++;
      continue;
    }
    if (/^[A-Z]{2,6}$/.test(cand.text) && isCapsNoise(cand.text)) {
      noiseCount++;
      continue;
    }

    // Check gazetteer — override scanner type if gazetteer has a confident match
    const gazHit = lookup(cand.text);
    const raw = toRawCandidate(cand, totalChapters);

    let finalType = cand.suggestedType;
    let confidence = cand.confidence === "high" ? 80 : cand.confidence === "medium" ? 50 : 30;
    let classifiedBy: "gazetteer" | "context" | "shape" | "default" = "context";

    if (gazHit && gazHit.confidence > confidence) {
      // Gazetteer knows this entity better than the scanner
      finalType = gazHit.type;
      confidence = gazHit.confidence;
      classifiedBy = "gazetteer";
    }

    classified.push({
      name: cand.text,
      type: finalType,
      confidence,
      score: cand.score,
      frequency: cand.occurrences,
      chapterSpread: cand.chapterSpread,
      totalChapters,
      contexts: cand.sampleContexts,
      classifiedBy,
      filtered: false,
      relatedNames: cand.relatedCandidates,
    });
  }

  const validEntities = getValidEntities(classified);
  const reviewEntities = getEntitiesNeedingReview(classified, threshold);

  // Phase 4: Optional LLM enhancement
  let llmEnhancedCount = 0;
  let llmCost: number | undefined;

  if (options.enableLLM && options.llmConfig && reviewEntities.length > 0) {
    options.onProgress?.(
      "llm",
      `Enhancing ${reviewEntities.length} entities with AI...`,
    );

    try {
      const llmResult = await classifyWithLLM(
        reviewEntities,
        options.llmConfig,
        options.bookTitle || "Unknown",
        options.genre || "Fiction",
        (processed, total) => {
          options.onProgress?.("llm", `AI classifying: ${processed}/${total} entities`);
        },
      );

      classified = mergeLLMResults(classified, llmResult.results);
      llmEnhancedCount = llmResult.results.filter(r => !r.isNoise).length;
      llmCost = llmResult.cost;

      options.onProgress?.(
        "llm-complete",
        `AI enhanced ${llmEnhancedCount} entities ($${llmCost.toFixed(4)})`,
      );
    } catch (error) {
      console.error("LLM classification failed, using pipeline results:", error);
      options.onProgress?.("llm-error", "AI enhancement failed, using base results");
    }
  }

  // Final results
  const finalValid = getValidEntities(classified);
  const finalFiltered = classified.filter(e => e.filtered);
  const finalNeedsReview = getEntitiesNeedingReview(classified, threshold);

  return {
    entities: finalValid,
    filtered: finalFiltered,
    needsReview: finalNeedsReview,
    stats: {
      totalCandidates: scannerResult.candidates.length,
      filteredAsNoise: noiseCount + finalFiltered.length,
      autoClassified: finalValid.length - finalNeedsReview.length,
      needsReview: finalNeedsReview.length,
      llmEnhanced: llmEnhancedCount,
      llmCost,
    },
  };
}

/**
 * Convert pipeline result back to ExtractionResult format for backward
 * compatibility with the existing API/UI contract.
 */
export function toExtractionResult(
  pipelineResult: PipelineResult,
  existingEntities: string[],
): ExtractionResult {
  const candidates = pipelineResult.entities.map(toExtractionCandidate);

  return {
    candidates,
    existingEntities,
  };
}

// Re-export for convenience
export { estimateClassificationCost } from "./llm-classifier.js";
export type { LLMClassifierConfig } from "./llm-classifier.js";
export type { ClassifiedEntity, RawCandidate } from "./entity-classifier.js";
