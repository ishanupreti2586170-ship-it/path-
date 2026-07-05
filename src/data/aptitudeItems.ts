/**
 * Profession-aptitude item bank.
 *
 * This is a shared bank of situational-judgment questions, tagged by one of
 * six general aptitude dimensions. Rather than hand-authoring a unique test
 * per occupation, each occupation's existing RIASEC / Big Five / risk / style
 * profile (see src/data/occupations.ts) is used to deterministically derive
 * which dimensions matter most for that profession (see src/lib/aptitude.ts).
 * The test assembled for a given profession simply pulls the relevant items
 * from this bank for its top dimensions.
 *
 * Each option carries a fixed 0-100 score reflecting how strongly that
 * response demonstrates the dimension — authored once, ahead of time. There
 * is no AI involved in generating questions or scoring answers.
 */

export type AptitudeDimension =
  | "analyticalRigor"
  | "interpersonalJudgment"
  | "processDiscipline"
  | "ambiguityTolerance"
  | "creativeProblemSolving"
  | "pressureExecution";

export const APTITUDE_DIMENSION_LABELS: Record<AptitudeDimension, string> = {
  analyticalRigor: "Analytical Rigor",
  interpersonalJudgment: "Interpersonal Judgment",
  processDiscipline: "Process Discipline",
  ambiguityTolerance: "Ambiguity Tolerance",
  creativeProblemSolving: "Creative Problem-Solving",
  pressureExecution: "Execution Under Pressure",
};

export const APTITUDE_DIMENSION_HINTS: Record<AptitudeDimension, string> = {
  analyticalRigor: "Systematically investigating problems before concluding",
  interpersonalJudgment: "Reading people and situations well",
  processDiscipline: "Sticking to structure and precision consistently",
  ambiguityTolerance: "Staying effective without clear direction",
  creativeProblemSolving: "Generating original approaches and ideas",
  pressureExecution: "Performing reliably under stress or scrutiny",
};

export interface AptitudeOption {
  v: string;
  l: string;
  score: number; // 0-100, fixed at authoring time — how strongly this choice demonstrates the dimension
}

export interface AptitudeQuestion {
  id: string;
  dimension: AptitudeDimension;
  scenario: string;
  opts: AptitudeOption[];
}

export const APTITUDE_ITEM_BANK: AptitudeQuestion[] = [
  // ── Analytical Rigor ──────────────────────────────────────────────
  {
    id: "ar1",
    dimension: "analyticalRigor",
    scenario: "You're given a dataset that mostly makes sense, but a few numbers look off. What do you do first?",
    opts: [
      { v: "a", l: "Investigate the anomalies before drawing any conclusions", score: 90 },
      { v: "b", l: "Note it, but proceed since most of the data checks out", score: 55 },
      { v: "c", l: "Round the numbers to something more sensible and move on", score: 20 },
      { v: "d", l: "Ask someone else to double check and wait for them", score: 40 },
    ],
  },
  {
    id: "ar2",
    dimension: "analyticalRigor",
    scenario: "A system you're troubleshooting is behaving unpredictably. Your instinct is to...",
    opts: [
      { v: "a", l: "Isolate variables one at a time until you find the cause", score: 90 },
      { v: "b", l: "Try the most likely fix based on past experience", score: 65 },
      { v: "c", l: "Restart everything and hope it resolves itself", score: 25 },
      { v: "d", l: "Escalate immediately without further investigation", score: 30 },
    ],
  },
  {
    id: "ar3",
    dimension: "analyticalRigor",
    scenario: "When facing a problem with no obvious solution, you tend to...",
    opts: [
      { v: "a", l: "Break it into smaller, testable pieces", score: 90 },
      { v: "b", l: "Look for a similar problem you've solved before", score: 65 },
      { v: "c", l: "Go with whatever feels intuitively right", score: 45 },
      { v: "d", l: "Wait for more information before acting", score: 35 },
    ],
  },
  {
    id: "ar4",
    dimension: "analyticalRigor",
    scenario: "You notice two reports show conflicting numbers for the same metric. You...",
    opts: [
      { v: "a", l: "Trace both back to their source data before trusting either", score: 90 },
      { v: "b", l: "Use whichever number seems more recent", score: 50 },
      { v: "c", l: "Average the two numbers", score: 25 },
      { v: "d", l: "Flag it to a colleague and move on", score: 45 },
    ],
  },
  {
    id: "ar5",
    dimension: "analyticalRigor",
    scenario: "How do you typically evaluate whether an argument or claim is sound?",
    opts: [
      { v: "a", l: "Check the underlying evidence and logic carefully", score: 90 },
      { v: "b", l: "Consider whether it matches your gut feeling", score: 45 },
      { v: "c", l: "Trust it if it comes from a credible-sounding source", score: 40 },
      { v: "d", l: "Assume it's true unless something feels off", score: 25 },
    ],
  },

  // ── Interpersonal Judgment ────────────────────────────────────────
  {
    id: "ij1",
    dimension: "interpersonalJudgment",
    scenario: "A teammate seems frustrated but hasn't said anything directly. You...",
    opts: [
      { v: "a", l: "Check in privately to understand what's going on", score: 90 },
      { v: "b", l: "Wait for them to bring it up if it's serious", score: 45 },
      { v: "c", l: "Address it publicly so the team is aware", score: 20 },
      { v: "d", l: "Assume it will resolve itself", score: 30 },
    ],
  },
  {
    id: "ij2",
    dimension: "interpersonalJudgment",
    scenario: "During a disagreement, your first move is usually to...",
    opts: [
      { v: "a", l: "Listen fully to understand their perspective before responding", score: 90 },
      { v: "b", l: "State your position clearly and defend it", score: 55 },
      { v: "c", l: "Avoid the conflict until it passes", score: 30 },
      { v: "d", l: "Bring in someone else to settle it", score: 40 },
    ],
  },
  {
    id: "ij3",
    dimension: "interpersonalJudgment",
    scenario: "Someone asks for feedback on something you think is genuinely weak. You...",
    opts: [
      { v: "a", l: "Give honest, specific, constructive feedback", score: 85 },
      { v: "b", l: "Focus mostly on the positives to avoid discouraging them", score: 45 },
      { v: "c", l: "Say it's fine to keep the peace", score: 20 },
      { v: "d", l: "Suggest they ask someone else", score: 30 },
    ],
  },
  {
    id: "ij4",
    dimension: "interpersonalJudgment",
    scenario: "When onboarding someone new to a group, you tend to...",
    opts: [
      { v: "a", l: "Proactively make sure they feel included and informed", score: 90 },
      { v: "b", l: "Let them find their footing on their own", score: 35 },
      { v: "c", l: "Introduce them once and leave it there", score: 40 },
      { v: "d", l: "Assign someone else to handle it", score: 45 },
    ],
  },
  {
    id: "ij5",
    dimension: "interpersonalJudgment",
    scenario: "You realize you misjudged someone's intentions and reacted poorly. You...",
    opts: [
      { v: "a", l: "Acknowledge it directly and repair the relationship", score: 90 },
      { v: "b", l: "Let it blow over without addressing it", score: 35 },
      { v: "c", l: "Justify your reaction if it comes up", score: 25 },
      { v: "d", l: "Avoid the person going forward", score: 15 },
    ],
  },

  // ── Process Discipline ────────────────────────────────────────────
  {
    id: "pd1",
    dimension: "processDiscipline",
    scenario: "You're handed a checklist for a repetitive task. You...",
    opts: [
      { v: "a", l: "Follow it precisely every time, even when tempting to skip steps", score: 90 },
      { v: "b", l: "Follow the important steps and skip ones that seem redundant", score: 55 },
      { v: "c", l: "Use it as a rough guide but mostly go from memory", score: 35 },
      { v: "d", l: "Ignore it if you already know how to do the task", score: 15 },
    ],
  },
  {
    id: "pd2",
    dimension: "processDiscipline",
    scenario: "Deadlines are approaching and details are piling up. You...",
    opts: [
      { v: "a", l: "Keep a structured list and track everything methodically", score: 90 },
      { v: "b", l: "Focus on the biggest items and let smaller details slide", score: 55 },
      { v: "c", l: "Work reactively as things come up", score: 30 },
      { v: "d", l: "Rely on memory to keep track", score: 20 },
    ],
  },
  {
    id: "pd3",
    dimension: "processDiscipline",
    scenario: "When documentation for a process is missing, you...",
    opts: [
      { v: "a", l: "Write it down as you go so others can follow it later", score: 85 },
      { v: "b", l: "Do the work but don't bother documenting it", score: 35 },
      { v: "c", l: "Assume someone else will document it", score: 20 },
      { v: "d", l: "Skip steps that seem unnecessary to save time", score: 15 },
    ],
  },
  {
    id: "pd4",
    dimension: "processDiscipline",
    scenario: "How do you feel about strict quality-control procedures?",
    opts: [
      { v: "a", l: "They're essential, even when they slow things down", score: 85 },
      { v: "b", l: "Useful in general but fine to bend under time pressure", score: 50 },
      { v: "c", l: "Mostly unnecessary overhead", score: 20 },
      { v: "d", l: "Depends entirely on who's watching", score: 15 },
    ],
  },
  {
    id: "pd5",
    dimension: "processDiscipline",
    scenario: "You're asked to repeat the same precise task 50 times in a row. You...",
    opts: [
      { v: "a", l: "Stay just as careful and consistent on the 50th as the 1st", score: 85 },
      { v: "b", l: "Stay careful but your attention drifts near the end", score: 55 },
      { v: "c", l: "Speed up and accept some deviations", score: 30 },
      { v: "d", l: "Find a way to avoid doing it manually at all", score: 40 },
    ],
  },

  // ── Ambiguity Tolerance ───────────────────────────────────────────
  {
    id: "at1",
    dimension: "ambiguityTolerance",
    scenario: "You're given a project with an unclear brief and no fixed deadline. You...",
    opts: [
      { v: "a", l: "Get comfortable making progress despite the uncertainty", score: 90 },
      { v: "b", l: "Ask a few clarifying questions, then move forward", score: 65 },
      { v: "c", l: "Wait for more clarity before starting", score: 30 },
      { v: "d", l: "Feel stressed and avoid starting until it's clearer", score: 15 },
    ],
  },
  {
    id: "at2",
    dimension: "ambiguityTolerance",
    scenario: "Plans change suddenly midway through a project. You...",
    opts: [
      { v: "a", l: "Adapt quickly and adjust your approach", score: 90 },
      { v: "b", l: "Adjust, but it takes some time to feel comfortable", score: 55 },
      { v: "c", l: "Feel thrown off and need time to regroup", score: 30 },
      { v: "d", l: "Push back and try to stick to the original plan", score: 20 },
    ],
  },
  {
    id: "at3",
    dimension: "ambiguityTolerance",
    scenario: "How do you feel about situations with no clear right answer?",
    opts: [
      { v: "a", l: "Energized — it's a chance to explore options", score: 90 },
      { v: "b", l: "Fine, as long as there's some structure to lean on", score: 55 },
      { v: "c", l: "Uncomfortable but manageable", score: 35 },
      { v: "d", l: "Prefer to avoid them entirely", score: 15 },
    ],
  },
  {
    id: "at4",
    dimension: "ambiguityTolerance",
    scenario: "A client changes their requirements after you've already started. You...",
    opts: [
      { v: "a", l: "Treat it as normal and rework your approach", score: 85 },
      { v: "b", l: "Feel frustrated but adjust anyway", score: 55 },
      { v: "c", l: "Push to keep the original scope", score: 30 },
      { v: "d", l: "Struggle to change direction", score: 15 },
    ],
  },
  {
    id: "at5",
    dimension: "ambiguityTolerance",
    scenario: "You're exploring a completely new field with no established best practices. You...",
    opts: [
      { v: "a", l: "See it as an opportunity to define your own approach", score: 90 },
      { v: "b", l: "Look for the closest existing framework to borrow from", score: 60 },
      { v: "c", l: "Feel uneasy without established guidance", score: 30 },
      { v: "d", l: "Avoid taking it on if possible", score: 15 },
    ],
  },

  // ── Creative Problem-Solving ──────────────────────────────────────
  {
    id: "cp1",
    dimension: "creativeProblemSolving",
    scenario: "You're stuck on a problem using the usual approach. You...",
    opts: [
      { v: "a", l: "Try a completely different angle or unconventional idea", score: 90 },
      { v: "b", l: "Tweak the existing approach slightly", score: 55 },
      { v: "c", l: "Ask someone else what they'd do", score: 45 },
      { v: "d", l: "Keep trying the same approach more carefully", score: 25 },
    ],
  },
  {
    id: "cp2",
    dimension: "creativeProblemSolving",
    scenario: "When brainstorming, you tend to...",
    opts: [
      { v: "a", l: "Generate many unusual ideas before narrowing down", score: 90 },
      { v: "b", l: "Suggest a few solid, proven ideas", score: 55 },
      { v: "c", l: "Wait and build on others' ideas", score: 40 },
      { v: "d", l: "Prefer not to brainstorm at all", score: 15 },
    ],
  },
  {
    id: "cp3",
    dimension: "creativeProblemSolving",
    scenario: "Given a blank page and an open-ended assignment, you feel...",
    opts: [
      { v: "a", l: "Excited by the freedom to create something original", score: 90 },
      { v: "b", l: "Fine, but you'd prefer some constraints", score: 55 },
      { v: "c", l: "A bit overwhelmed without more direction", score: 30 },
      { v: "d", l: "Uncomfortable without a clear template", score: 15 },
    ],
  },
  {
    id: "cp4",
    dimension: "creativeProblemSolving",
    scenario: "You see a common tool being used in a very standard way. You...",
    opts: [
      { v: "a", l: "Wonder how it could be used in an unexpected way", score: 85 },
      { v: "b", l: "Use it exactly as intended", score: 40 },
      { v: "c", l: "Assume the standard way is already optimal", score: 30 },
      { v: "d", l: "Rarely think about alternative uses", score: 15 },
    ],
  },
  {
    id: "cp5",
    dimension: "creativeProblemSolving",
    scenario: "How do you generally approach a creative project?",
    opts: [
      { v: "a", l: "Experiment freely and refine through iteration", score: 90 },
      { v: "b", l: "Follow a proven structure with small personal touches", score: 55 },
      { v: "c", l: "Copy a format that's worked well before", score: 35 },
      { v: "d", l: "Prefer detailed instructions to follow", score: 15 },
    ],
  },

  // ── Execution Under Pressure ──────────────────────────────────────
  {
    id: "pe1",
    dimension: "pressureExecution",
    scenario: "A deadline moves up unexpectedly. You...",
    opts: [
      { v: "a", l: "Reprioritize calmly and focus on what matters most", score: 90 },
      { v: "b", l: "Push through with extra effort and some stress", score: 60 },
      { v: "c", l: "Feel overwhelmed but manage to get through it", score: 35 },
      { v: "d", l: "Struggle to function effectively under the new pressure", score: 15 },
    ],
  },
  {
    id: "pe2",
    dimension: "pressureExecution",
    scenario: "Something goes wrong in front of others (e.g. a presentation glitch). You...",
    opts: [
      { v: "a", l: "Stay composed and adapt in the moment", score: 90 },
      { v: "b", l: "Feel flustered but recover after a moment", score: 55 },
      { v: "c", l: "Visibly show frustration or stress", score: 25 },
      { v: "d", l: "Avoid similar situations going forward", score: 15 },
    ],
  },
  {
    id: "pe3",
    dimension: "pressureExecution",
    scenario: "You have multiple urgent tasks competing for attention at once. You...",
    opts: [
      { v: "a", l: "Quickly triage and tackle the highest-impact task first", score: 90 },
      { v: "b", l: "Work through them roughly in the order they arrived", score: 55 },
      { v: "c", l: "Feel paralyzed trying to decide where to start", score: 25 },
      { v: "d", l: "Ask someone else to decide for you", score: 30 },
    ],
  },
  {
    id: "pe4",
    dimension: "pressureExecution",
    scenario: "After a high-stakes failure, your typical reaction is to...",
    opts: [
      { v: "a", l: "Analyze what happened and adjust quickly", score: 90 },
      { v: "b", l: "Take some time to recover before moving on", score: 55 },
      { v: "c", l: "Feel discouraged for an extended period", score: 25 },
      { v: "d", l: "Avoid similar situations in the future", score: 20 },
    ],
  },
  {
    id: "pe5",
    dimension: "pressureExecution",
    scenario: "How do you perform when being closely observed or evaluated?",
    opts: [
      { v: "a", l: "Perform at your normal level or better", score: 85 },
      { v: "b", l: "Perform slightly worse but still competently", score: 55 },
      { v: "c", l: "Feel noticeably more anxious and make more mistakes", score: 25 },
      { v: "d", l: "Avoid being observed whenever possible", score: 15 },
    ],
  },
];
