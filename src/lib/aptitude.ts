/**
 * Deterministic profession-specific aptitude scoring.
 *
 * Rather than hand-authoring a unique test for every occupation, each
 * occupation's *existing* RIASEC / Big Five / risk / style profile (already
 * curated in src/data/occupations.ts) is used to compute fixed weights across
 * six general aptitude dimensions. The test assembled for a profession pulls
 * items tagged with that profession's most relevant dimensions from the
 * shared APTITUDE_ITEM_BANK.
 *
 * The resulting "current adaptability" score is a present-time reading of
 * how the user's stated judgment/behavior lines up with what a profession
 * tends to demand — not a fixed trait, and not AI-generated. Same answers +
 * same occupation always produce the same score.
 */

import { Occupation } from "../data/occupations";
import {
  APTITUDE_ITEM_BANK,
  APTITUDE_DIMENSION_LABELS,
  APTITUDE_DIMENSION_HINTS,
  AptitudeDimension,
  AptitudeQuestion,
} from "../data/aptitudeItems";

export interface DimensionWeight {
  dimension: AptitudeDimension;
  label: string;
  hint: string;
  weight: number; // relative importance for this occupation, 0-100, sums to ~100 across selected dims
}

const ALL_DIMENSIONS: AptitudeDimension[] = [
  "analyticalRigor",
  "interpersonalJudgment",
  "processDiscipline",
  "ambiguityTolerance",
  "creativeProblemSolving",
  "pressureExecution",
];

/**
 * Derives how much each aptitude dimension matters for an occupation, purely
 * from that occupation's already-curated profile data. Plain weighted
 * averages — no AI, no per-occupation hand-authoring.
 */
function rawDimensionScores(occ: Occupation): Record<AptitudeDimension, number> {
  return {
    analyticalRigor: occ.riasec.I * 0.6 + occ.bigFive.C * 0.4,
    interpersonalJudgment: occ.riasec.S * 0.6 + occ.bigFive.A * 0.4,
    processDiscipline: occ.riasec.C * 0.6 + occ.bigFive.C * 0.4,
    ambiguityTolerance: occ.style * 0.5 + occ.risk * 0.3 + occ.bigFive.O * 0.2,
    creativeProblemSolving: occ.riasec.A * 0.6 + occ.bigFive.O * 0.4,
    pressureExecution: occ.bigFive.Es * 0.5 + occ.riasec.E * 0.5,
  };
}

export function getOccupationDimensions(occ: Occupation, topN = 5): DimensionWeight[] {
  const raw = rawDimensionScores(occ);
  const entries = ALL_DIMENSIONS.map((d) => [d, raw[d]] as [AptitudeDimension, number]);
  const ranked = entries.sort((a, b) => b[1] - a[1]).slice(0, topN);
  const total = ranked.reduce((s, [, v]) => s + v, 0) || 1;

  return ranked.map(([dimension, v]) => ({
    dimension,
    label: APTITUDE_DIMENSION_LABELS[dimension],
    hint: APTITUDE_DIMENSION_HINTS[dimension],
    weight: Math.round((v / total) * 100),
  }));
}

export function buildAptitudeTest(occ: Occupation, itemsPerDimension = 2): AptitudeQuestion[] {
  const dims = getOccupationDimensions(occ);
  const questions: AptitudeQuestion[] = [];
  for (const d of dims) {
    const pool = APTITUDE_ITEM_BANK.filter((q) => q.dimension === d.dimension);
    questions.push(...pool.slice(0, itemsPerDimension));
  }
  return questions;
}

export interface DimensionResult {
  dimension: AptitudeDimension;
  label: string;
  hint: string;
  score: number;
  weight: number;
}

export interface AptitudeResult {
  overall: number;
  dimensions: DimensionResult[];
  strengths: string[];
  gaps: string[];
}

export function scoreAptitudeTest(
  occ: Occupation,
  questions: AptitudeQuestion[],
  answers: Record<string, string>,
): AptitudeResult {
  const dims = getOccupationDimensions(occ);
  const byDimension: Record<string, number[]> = {};

  for (const q of questions) {
    const chosenValue = answers[q.id];
    const chosenOpt = q.opts.find((o) => o.v === chosenValue);
    if (!chosenOpt) continue;
    (byDimension[q.dimension] ||= []).push(chosenOpt.score);
  }

  const dimensionResults: DimensionResult[] = dims.map((d) => {
    const scores = byDimension[d.dimension] || [];
    const score = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 50;
    return { dimension: d.dimension, label: d.label, hint: d.hint, score, weight: d.weight };
  });

  const totalWeight = dimensionResults.reduce((s, d) => s + d.weight, 0) || 1;
  const overall = Math.round(
    dimensionResults.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight,
  );

  const sorted = [...dimensionResults].sort((a, b) => b.score - a.score);
  const strengths = sorted.filter((d) => d.score >= 65).map((d) => d.label);
  const gaps = sorted.filter((d) => d.score < 50).map((d) => d.label);

  return { overall, dimensions: dimensionResults, strengths, gaps };
}
