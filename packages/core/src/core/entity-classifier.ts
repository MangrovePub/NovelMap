// ===========================================================================
// NovelMap — Entity Classifier
// Classifies raw entity candidates using gazetteer + context analysis.
// ===========================================================================

import type { EntityType } from "./types.js";
import {
  lookup,
  isNoise,
  isCapsNoise,
  isStreetAddress,
  CHARACTER_TITLES,
  CHARACTER_SIGNALS,
  LOCATION_PREPOSITIONS,
} from "./gazetteer.js";

// ─── Types ──────────────────────────────────────────────────

export interface RawCandidate {
  name: string;
  type: string; // from scanner — may be "UNKNOWN" or a guess
  score: number;
  frequency: number;
  chapterSpread: number;
  totalChapters: number;
  nonSentenceStartRatio: number;
  contexts: string[];
}

export interface ClassifiedEntity {
  name: string;
  type: EntityType;
  confidence: number; // 0–100
  score: number;
  frequency: number;
  chapterSpread: number;
  totalChapters: number;
  contexts: string[];
  classifiedBy: "gazetteer" | "context" | "shape" | "default";
  filtered: boolean;
  filterReason?: string;
  relatedNames: string[];
}

// ─── Classification ─────────────────────────────────────────

/**
 * Classify an array of raw candidates into typed entities.
 * Uses a layered approach:
 *   1. Gazetteer lookup (highest confidence)
 *   2. Context signal analysis
 *   3. Name shape heuristics
 *   4. Default fallback
 */
export function classifyEntities(candidates: RawCandidate[]): ClassifiedEntity[] {
  const results: ClassifiedEntity[] = [];

  for (const cand of candidates) {
    // Pre-filter noise
    if (isNoise(cand.name)) {
      results.push(makeFiltered(cand, "noise_word"));
      continue;
    }

    // Pre-filter street addresses
    if (isStreetAddress(cand.name)) {
      results.push(makeFiltered(cand, "street_address"));
      continue;
    }

    // Pre-filter caps noise
    if (/^[A-Z]{2,6}$/.test(cand.name) && isCapsNoise(cand.name)) {
      results.push(makeFiltered(cand, "caps_noise"));
      continue;
    }

    // Layer 1: Gazetteer
    const gazHit = lookup(cand.name);
    if (gazHit) {
      results.push({
        ...makeBase(cand),
        type: gazHit.type,
        confidence: gazHit.confidence,
        classifiedBy: "gazetteer",
      });
      continue;
    }

    // Layer 2: Context analysis
    const contextResult = classifyByContext(cand.name, cand.contexts);
    if (contextResult) {
      results.push({
        ...makeBase(cand),
        type: contextResult.type,
        confidence: contextResult.confidence,
        classifiedBy: "context",
      });
      continue;
    }

    // Layer 3: Name shape heuristics
    const shapeResult = classifyByShape(cand.name, cand.frequency, cand.chapterSpread);
    if (shapeResult) {
      results.push({
        ...makeBase(cand),
        type: shapeResult.type,
        confidence: shapeResult.confidence,
        classifiedBy: "shape",
      });
      continue;
    }

    // Layer 4: Default — multi-word names default to character
    results.push({
      ...makeBase(cand),
      type: "character",
      confidence: 30,
      classifiedBy: "default",
    });
  }

  return results;
}

// ─── Context analysis ───────────────────────────────────────

interface TypeScore {
  type: EntityType;
  confidence: number;
}

function classifyByContext(name: string, contexts: string[]): TypeScore | null {
  if (contexts.length === 0) return null;

  let characterScore = 0;
  let locationScore = 0;
  let orgScore = 0;
  const nameLower = name.toLowerCase();

  for (const ctx of contexts) {
    const lower = ctx.toLowerCase();

    // Character signals: "Liu said", "said Liu"
    for (const signal of CHARACTER_SIGNALS) {
      if (lower.includes(`${nameLower} ${signal}`)) characterScore += 3;
      if (lower.includes(`${signal} ${nameLower}`)) characterScore += 3;
    }

    // Character title signals: "Agent Ramsey", "Dr. Wu"
    for (const title of CHARACTER_TITLES) {
      if (lower.includes(`${title} ${nameLower}`)) characterScore += 5;
      if (lower.includes(`${title}. ${nameLower}`)) characterScore += 5;
    }

    // Location signals: "in Shanghai", "to Detroit"
    for (const prep of LOCATION_PREPOSITIONS) {
      if (lower.includes(`${prep} ${nameLower}`)) locationScore += 3;
    }

    // Organization signals: "the MSS", "the Agency"
    if (lower.includes(`the ${nameLower}`)) orgScore += 2;
    for (const orgWord of [
      "agency", "bureau", "department", "ministry", "institute",
      "corporation", "company", "force", "intelligence", "committee",
    ]) {
      if (lower.includes(`${nameLower} ${orgWord}`)) orgScore += 4;
    }
  }

  // Multi-word names without location/org keywords lean character
  const words = name.split(/\s+/);
  if (words.length >= 2 && words.length <= 3) {
    characterScore += 8;
  }

  const maxScore = Math.max(characterScore, locationScore, orgScore);
  if (maxScore === 0) return null;

  // Convert raw signal score to confidence (0-100)
  const confidence = Math.min(85, 40 + maxScore * 2);

  if (characterScore >= locationScore && characterScore >= orgScore) {
    return { type: "character", confidence };
  }
  if (locationScore > characterScore && locationScore >= orgScore) {
    return { type: "location", confidence };
  }
  if (orgScore > characterScore) {
    return { type: "organization", confidence };
  }

  return null;
}

// ─── Shape heuristics ───────────────────────────────────────

function classifyByShape(name: string, frequency: number, chapterSpread: number): TypeScore | null {
  // All-caps 2-6 letter words → organization (acronym)
  if (/^[A-Z]{2,6}$/.test(name)) {
    return { type: "organization", confidence: 60 };
  }

  // Multi-word capitalized name with no keywords → likely character
  const words = name.split(/\s+/);
  if (words.length >= 2 && words.length <= 3 && words.every(w => /^[A-Z]/.test(w))) {
    return { type: "character", confidence: 50 };
  }

  // Single word, high frequency, multi-chapter → weak character signal
  if (words.length === 1 && frequency >= 5 && chapterSpread >= 3) {
    return { type: "character", confidence: 35 };
  }

  return null;
}

// ─── Helpers ────────────────────────────────────────────────

function makeBase(cand: RawCandidate): Omit<ClassifiedEntity, "type" | "confidence" | "classifiedBy"> {
  return {
    name: cand.name,
    score: cand.score,
    frequency: cand.frequency,
    chapterSpread: cand.chapterSpread,
    totalChapters: cand.totalChapters,
    contexts: cand.contexts,
    filtered: false,
    relatedNames: [],
  };
}

function makeFiltered(cand: RawCandidate, reason: string): ClassifiedEntity {
  return {
    ...makeBase(cand),
    type: "character",
    confidence: 0,
    classifiedBy: "default",
    filtered: true,
    filterReason: reason,
  };
}

// ─── Convenience filters ────────────────────────────────────

export function getValidEntities(entities: ClassifiedEntity[]): ClassifiedEntity[] {
  return entities.filter(e => !e.filtered);
}

export function getEntitiesNeedingReview(
  entities: ClassifiedEntity[],
  threshold = 50
): ClassifiedEntity[] {
  return entities.filter(e => !e.filtered && e.confidence < threshold);
}
