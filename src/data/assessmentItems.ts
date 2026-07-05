/**
 * Assessment item bank.
 *
 * These items operationalize well-established, published constructs from
 * psychology and vocational research:
 *  - Big Five personality dimensions (Costa & McCrae; short-form style items)
 *  - Holland's RIASEC vocational interest model (the basis of O*NET's
 *    Interest Profiler used by career counselors)
 *  - Cognitive reflection (Frederick, 2005) — analytical vs. intuitive
 *    processing, measured with objectively-scored logic puzzles
 *  - Adaptor/innovator problem-solving style (Kirton's theory)
 *  - Risk tolerance and locus of control (well-studied decision-making traits)
 *
 * Item wording here is original (not copied from any licensed instrument),
 * but the constructs and scoring logic are grounded in the published theory.
 * All scoring is deterministic arithmetic — no AI is involved in generating
 * or interpreting these results.
 */

export type BigFiveDim = "O" | "C" | "E" | "A" | "Es";
export type RiasecDim = "R" | "I" | "A" | "S" | "E" | "C";

export interface LikertItem {
  key: string;
  label: string;
  dimension: BigFiveDim | RiasecDim | "risk" | "locus";
  reverse?: boolean;
}

export interface LikertBlock {
  id: string;
  kind: "likert";
  section: string;
  title: string;
  hint: string;
  items: LikertItem[];
}

export interface ChoiceOption {
  v: string;
  l: string;
  s?: string;
  correct?: boolean;
  style?: number; // 0 = adaptor lean, 100 = innovator lean
}

export interface ChoiceBlock {
  id: string;
  kind: "single";
  section: string;
  title: string;
  hint: string;
  opts: ChoiceOption[];
}

export type AssessmentBlock = LikertBlock | ChoiceBlock;

export const ASSESSMENT_BLOCKS: AssessmentBlock[] = [
  {
    id: "personality-1",
    kind: "likert",
    section: "Personality",
    title: "How true is each statement of you?",
    hint: "Rate honestly — there are no right answers, just accurate ones.",
    items: [
      { key: "O1", label: "I enjoy exploring abstract ideas and theories.", dimension: "O" },
      { key: "O2", label: "I prefer sticking to familiar routines over trying new things.", dimension: "O", reverse: true },
      { key: "C1", label: "I follow through on tasks until they are completely finished.", dimension: "C" },
      { key: "C2", label: "I often leave things until the last minute.", dimension: "C", reverse: true },
      { key: "E1", label: "I feel energized after spending time with groups of people.", dimension: "E" },
    ],
  },
  {
    id: "personality-2",
    kind: "likert",
    section: "Personality",
    title: "Keep going — same idea, more statements.",
    hint: "Go with your first reaction rather than overthinking each one.",
    items: [
      { key: "E2", label: "I'd rather work quietly on my own than as part of a team.", dimension: "E", reverse: true },
      { key: "A1", label: "I go out of my way to help people, even strangers.", dimension: "A" },
      { key: "A2", label: "I find it easy to be critical of others.", dimension: "A", reverse: true },
      { key: "Es1", label: "I stay calm and level-headed under pressure.", dimension: "Es" },
      { key: "Es2", label: "Small setbacks can throw off my mood for the rest of the day.", dimension: "Es", reverse: true },
    ],
  },
  {
    id: "interests-1",
    kind: "likert",
    section: "Interests",
    title: "How appealing is each activity to you?",
    hint: "1 = not appealing at all, 5 = deeply appealing.",
    items: [
      { key: "R1", label: "Fixing or building something with your hands.", dimension: "R" },
      { key: "R2", label: "Operating tools, machines, or technical equipment.", dimension: "R" },
      { key: "I1", label: "Solving a complex logical or scientific problem.", dimension: "I" },
      { key: "I2", label: "Researching how something works at a deep level.", dimension: "I" },
      { key: "A3", label: "Creating original designs, music, or writing.", dimension: "A" },
      { key: "A4", label: "Expressing ideas in unconventional, unscripted ways.", dimension: "A" },
    ],
  },
  {
    id: "interests-2",
    kind: "likert",
    section: "Interests",
    title: "More activities — how appealing are these?",
    hint: "1 = not appealing at all, 5 = deeply appealing.",
    items: [
      { key: "S1", label: "Teaching or mentoring someone one-on-one.", dimension: "S" },
      { key: "S2", label: "Helping someone work through a personal problem.", dimension: "S" },
      { key: "E3", label: "Persuading a group of people to adopt your idea.", dimension: "E" },
      { key: "E4", label: "Starting and running your own venture.", dimension: "E" },
      { key: "C3", label: "Organizing data, files, or schedules with precision.", dimension: "C" },
      { key: "C4", label: "Following clear, well-established procedures.", dimension: "C" },
    ],
  },
  {
    id: "puzzle-1",
    kind: "single",
    section: "Thinking Puzzles",
    title: "A bat and a ball together cost $1.10. The bat costs $1.00 more than the ball. How much does the ball cost?",
    hint: "This is a real cognitive-reflection puzzle — most people's first instinct is wrong.",
    opts: [
      { v: "a", l: "10 cents", correct: false },
      { v: "b", l: "5 cents", correct: true },
      { v: "c", l: "1 cent", correct: false },
      { v: "d", l: "Not sure", correct: false },
    ],
  },
  {
    id: "puzzle-2",
    kind: "single",
    section: "Thinking Puzzles",
    title: "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?",
    hint: "Resist the urge to just scale the numbers up.",
    opts: [
      { v: "a", l: "100 minutes", correct: false },
      { v: "b", l: "5 minutes", correct: true },
      { v: "c", l: "20 minutes", correct: false },
      { v: "d", l: "Not sure", correct: false },
    ],
  },
  {
    id: "style-1",
    kind: "single",
    section: "Problem-Solving Style",
    title: "When a process works but is inefficient, you usually...",
    hint: "There's no wrong answer — both styles are valuable in different roles.",
    opts: [
      { v: "a", l: "Improve it step by step within the existing system", style: 15 },
      { v: "b", l: "Replace it with a completely different approach", style: 85 },
    ],
  },
  {
    id: "style-2",
    kind: "single",
    section: "Problem-Solving Style",
    title: "You feel most productive when...",
    hint: "Pick whichever is closer to how you actually operate.",
    opts: [
      { v: "a", l: "Clear rules and structure are already in place", style: 15 },
      { v: "b", l: "You're free to challenge the existing rules", style: 85 },
    ],
  },
  {
    id: "decision-1",
    kind: "likert",
    section: "Decision-Making",
    title: "How true is each statement of you?",
    hint: "This section covers risk appetite and sense of control over outcomes.",
    items: [
      { key: "risk1", label: "I'd rather take a chance on a high-reward opportunity than settle for a safe, smaller gain.", dimension: "risk" },
      { key: "risk2", label: "Uncertainty about the outcome makes me hesitant to commit.", dimension: "risk", reverse: true },
      { key: "locus1", label: "My outcomes are mostly the result of my own effort and choices.", dimension: "locus" },
      { key: "locus2", label: "Success is often more about luck or circumstances than what I do.", dimension: "locus", reverse: true },
    ],
  },
];
