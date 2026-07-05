/**
 * Deterministic career matching.
 *
 * Computes similarity between the user's trait profile and each occupation's
 * reference profile using weighted distance across RIASEC interests, Big
 * Five personality, risk tolerance, and problem-solving style. This is plain
 * vector math — the same profile always produces the same ranked list and
 * the same match percentages. No AI is involved in this calculation.
 */

import { TraitProfile } from "./scoring";
import { Occupation, OCCUPATIONS } from "../data/occupations";

export interface CareerMatch {
  occupation: Occupation;
  match: number;
  why: string;
}

const RIASEC_LABELS: Record<string, string> = {
  R: "hands-on, practical instincts",
  I: "analytical, investigative thinking",
  A: "creative, original expression",
  S: "people-focused, helping instincts",
  E: "persuasive, initiative-driven energy",
  C: "structured, detail-oriented precision",
};

const BIGFIVE_LABELS: Record<string, string> = {
  O: "openness to new ideas",
  C: "conscientious follow-through",
  E: "extraverted energy",
  A: "cooperative, empathetic style",
  Es: "composure under pressure",
};

function rmse(a: number[], b: number[]): number {
  const diffs = a.map((v, i) => (v - b[i]) ** 2);
  const mean = diffs.reduce((s, v) => s + v, 0) / diffs.length;
  return Math.sqrt(mean);
}

function bestOverlap(userVals: Record<string, number>, occVals: Record<string, number>, labels: Record<string, string>): { key: string; gap: number } | null {
  let best: { key: string; gap: number } | null = null;
  for (const key of Object.keys(userVals)) {
    const gap = Math.abs(userVals[key] - occVals[key]);
    const strong = occVals[key] >= 55; // only count as a defining trait if it's actually prominent for the role
    if (!strong) continue;
    if (!best || gap < best.gap) best = { key, gap };
  }
  return best;
}

export function matchCareers(profile: TraitProfile, pool: Occupation[] = OCCUPATIONS, topN = 8): CareerMatch[] {
  const userRiasec = [profile.riasec.R, profile.riasec.I, profile.riasec.A, profile.riasec.S, profile.riasec.E, profile.riasec.C];
  const userBigFive = [profile.bigFive.O, profile.bigFive.C, profile.bigFive.E, profile.bigFive.A, profile.bigFive.Es];

  const results: CareerMatch[] = pool.map((occ) => {
    const occRiasec = [occ.riasec.R, occ.riasec.I, occ.riasec.A, occ.riasec.S, occ.riasec.E, occ.riasec.C];
    const occBigFive = [occ.bigFive.O, occ.bigFive.C, occ.bigFive.E, occ.bigFive.A, occ.bigFive.Es];

    const riasecDist = rmse(userRiasec, occRiasec);
    const bigFiveDist = rmse(userBigFive, occBigFive);
    const styleDist = Math.abs(profile.cognitive.style - occ.style);
    const riskDist = Math.abs(profile.cognitive.risk - occ.risk);

    const combinedDist = 0.5 * riasecDist + 0.3 * bigFiveDist + 0.1 * styleDist + 0.1 * riskDist;
    const match = Math.max(5, Math.min(98, Math.round(100 - combinedDist)));

    const riasecOverlap = bestOverlap(
      { R: profile.riasec.R, I: profile.riasec.I, A: profile.riasec.A, S: profile.riasec.S, E: profile.riasec.E, C: profile.riasec.C },
      { R: occ.riasec.R, I: occ.riasec.I, A: occ.riasec.A, S: occ.riasec.S, E: occ.riasec.E, C: occ.riasec.C },
      RIASEC_LABELS,
    );
    const bigFiveOverlap = bestOverlap(
      { O: profile.bigFive.O, C: profile.bigFive.C, E: profile.bigFive.E, A: profile.bigFive.A, Es: profile.bigFive.Es },
      { O: occ.bigFive.O, C: occ.bigFive.C, E: occ.bigFive.E, A: occ.bigFive.A, Es: occ.bigFive.Es },
      BIGFIVE_LABELS,
    );

    const parts: string[] = [];
    if (riasecOverlap) parts.push(RIASEC_LABELS[riasecOverlap.key]);
    if (bigFiveOverlap) parts.push(BIGFIVE_LABELS[bigFiveOverlap.key]);

    const why = parts.length
      ? `Your ${parts.join(" and ")} closely align with what this role tends to reward.`
      : `This role broadly overlaps with your current trait profile.`;

    return { occupation: occ, match, why };
  });

  return results.sort((a, b) => b.match - a.match).slice(0, topN);
}
