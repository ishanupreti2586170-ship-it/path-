/**
 * Deterministic scoring engine.
 *
 * Given the user's raw answers to the ASSESSMENT_BLOCKS item bank, this
 * computes a trait profile using plain arithmetic — the same answers always
 * produce the same numbers. No AI is used anywhere in this file.
 */

import { ASSESSMENT_BLOCKS, LikertBlock, ChoiceBlock } from "../data/assessmentItems";

export interface BigFiveScores {
  O: number;
  C: number;
  E: number;
  A: number;
  Es: number; // Emotional Stability
}

export interface RiasecScores {
  R: number;
  I: number;
  A: number;
  S: number;
  E: number;
  C: number;
}

export interface CognitiveScores {
  analytical: number; // 0 = intuitive, 100 = analytical (from puzzle accuracy)
  style: number; // 0 = adaptor, 100 = innovator
  risk: number; // 0 = risk-averse, 100 = risk-seeking
  locus: number; // 0 = external, 100 = internal
}

export interface TraitProfile {
  bigFive: BigFiveScores;
  riasec: RiasecScores;
  cognitive: CognitiveScores;
}

export type LikertAnswers = Record<string, number>; // item key -> 1..5
export type ChoiceAnswers = Record<string, string>; // block id -> option value

function avg(values: number[]): number {
  if (values.length === 0) return 50;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function likertToScale(value: number, reverse?: boolean): number {
  const v = reverse ? 6 - value : value;
  return ((v - 1) / 4) * 100;
}

export function computeTraitProfile(
  likertAnswers: LikertAnswers,
  choiceAnswers: ChoiceAnswers,
): TraitProfile {
  const byDimension: Record<string, number[]> = {};

  for (const block of ASSESSMENT_BLOCKS) {
    if (block.kind === "likert") {
      for (const item of (block as LikertBlock).items) {
        const raw = likertAnswers[item.key];
        if (raw === undefined) continue;
        const scaled = likertToScale(raw, item.reverse);
        (byDimension[item.dimension] ||= []).push(scaled);
      }
    }
  }

  const bigFive: BigFiveScores = {
    O: Math.round(avg(byDimension.O || [])),
    C: Math.round(avg(byDimension.C || [])),
    E: Math.round(avg(byDimension.E || [])),
    A: Math.round(avg(byDimension.A || [])),
    Es: Math.round(avg(byDimension.Es || [])),
  };

  const riasec: RiasecScores = {
    R: Math.round(avg(byDimension.R || [])),
    I: Math.round(avg(byDimension.I || [])),
    A: Math.round(avg(byDimension.A || [])),
    S: Math.round(avg(byDimension.S || [])),
    E: Math.round(avg(byDimension.E || [])),
    C: Math.round(avg(byDimension.C || [])),
  };

  // Cognitive reflection puzzles: objectively scored, not self-reported.
  let correctCount = 0;
  let puzzleCount = 0;
  const styleValues: number[] = [];

  for (const block of ASSESSMENT_BLOCKS) {
    if (block.kind !== "single") continue;
    const choiceBlock = block as ChoiceBlock;
    const chosenValue = choiceAnswers[choiceBlock.id];
    const chosenOpt = choiceBlock.opts.find((o) => o.v === chosenValue);
    if (!chosenOpt) continue;

    if (choiceBlock.section === "Thinking Puzzles") {
      puzzleCount++;
      if (chosenOpt.correct) correctCount++;
    } else if (choiceBlock.section === "Problem-Solving Style" && chosenOpt.style !== undefined) {
      styleValues.push(chosenOpt.style);
    }
  }

  const cognitive: CognitiveScores = {
    analytical: puzzleCount ? Math.round((correctCount / puzzleCount) * 100) : 50,
    style: Math.round(avg(styleValues)),
    risk: Math.round(avg(byDimension.risk || [])),
    locus: Math.round(avg(byDimension.locus || [])),
  };

  return { bigFive, riasec, cognitive };
}

export function describeLevel(value: number, lowLabel: string, midLabel: string, highLabel: string): string {
  if (value >= 65) return highLabel;
  if (value <= 35) return lowLabel;
  return midLabel;
}

export function bigFiveDescriptors(bigFive: BigFiveScores) {
  return {
    O: describeLevel(bigFive.O, "Grounded & practical", "Balanced", "Curious & idea-driven"),
    C: describeLevel(bigFive.C, "Flexible & spontaneous", "Balanced", "Disciplined & organized"),
    E: describeLevel(bigFive.E, "Reflective & independent", "Balanced", "Outgoing & team-energized"),
    A: describeLevel(bigFive.A, "Direct & candid", "Balanced", "Cooperative & empathetic"),
    Es: describeLevel(bigFive.Es, "Reactive under stress", "Balanced", "Steady under pressure"),
  };
}

export function cognitiveDescriptors(cognitive: CognitiveScores) {
  return {
    analytical: describeLevel(cognitive.analytical, "Intuitive, fast-response thinker", "Blends gut instinct with analysis", "Deliberate, analytical thinker"),
    style: describeLevel(cognitive.style, "Adaptor — refines what already exists", "Blends refining and reinventing", "Innovator — rebuilds from first principles"),
    risk: describeLevel(cognitive.risk, "Risk-averse, values certainty", "Calculated risk-taker", "Risk-seeking, drawn to upside"),
    locus: describeLevel(cognitive.locus, "Sees outcomes as circumstantial", "Balanced view of control", "Sees outcomes as self-driven"),
  };
}
