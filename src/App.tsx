/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { LandingPage } from "./LandingPage";
import { ASSESSMENT_BLOCKS, LikertBlock, ChoiceBlock } from "./data/assessmentItems";
import {
  computeTraitProfile,
  bigFiveDescriptors,
  cognitiveDescriptors,
  TraitProfile,
} from "./lib/scoring";
import { matchCareers, CareerMatch } from "./lib/matching";
import {
  buildAptitudeTest,
  scoreAptitudeTest,
  getOccupationDimensions,
  AptitudeResult,
} from "./lib/aptitude";
import { AptitudeQuestion, APTITUDE_DIMENSION_LABELS, AptitudeDimension } from "./data/aptitudeItems";

// ────────────────────────────────────────────────
// CONSTANTS & DATA
// ────────────────────────────────────────────────

// ────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────

type Screen =
  | "welcome"
  | "question"
  | "analyzing"
  | "report"
  | "aptitude"
  | "aptitude-result"
  | "compare"
  | "growth"
  | "final"
  | "about";

interface GrowthSuggestions {
  books: { title: string; author: string; why: string }[];
  topics: string[];
  resources: { name: string; type: string; why: string }[];
}

function CareerOracleTool({ language }: { language: string }) {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [step, setStep] = useState(0);
  const [likertAnswers, setLikertAnswers] = useState<Record<string, number>>({});
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string>>({});

  const [profile, setProfile] = useState<TraitProfile | null>(null);
  const [matches, setMatches] = useState<CareerMatch[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<CareerMatch | null>(null);
  const [growth, setGrowth] = useState<GrowthSuggestions | null>(null);
  const [growthError, setGrowthError] = useState("");
  const [loadingStatus, setLoadingStatus] = useState("");

  const [aptitudeQuestions, setAptitudeQuestions] = useState<AptitudeQuestion[]>([]);
  const [aptitudeStep, setAptitudeStep] = useState(0);
  const [aptitudeAnswers, setAptitudeAnswers] = useState<Record<string, string>>({});
  const [aptitudeResults, setAptitudeResults] = useState<Record<string, AptitudeResult>>({});

  const currentBlock = ASSESSMENT_BLOCKS[step];

  // Gemini API helper — used ONLY for the optional growth-suggestions step,
  // never for scoring or matching, which are fully deterministic below.
  const callAI = async (prompt: string) => {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, language }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to call AI API");
    return data.result;
  };

  const handleStart = () => {
    setScreen("question");
    setStep(0);
  };

  const isBlockComplete = (block = currentBlock) => {
    if (block.kind === "likert") {
      return (block as LikertBlock).items.every((it) => likertAnswers[it.key] !== undefined);
    }
    return choiceAnswers[block.id] !== undefined;
  };

  const handleNext = () => {
    if (step < ASSESSMENT_BLOCKS.length - 1) {
      setStep((s) => s + 1);
    } else {
      runAnalysis();
    }
  };

  const runAnalysis = () => {
    setScreen("analyzing");
    setLoadingStatus("Scoring your responses...");
    // Deterministic scoring — plain arithmetic, no AI, no randomness.
    // A short delay just gives the transition some breathing room.
    setTimeout(() => {
      const computed = computeTraitProfile(likertAnswers, choiceAnswers);
      const ranked = matchCareers(computed);
      setProfile(computed);
      setMatches(ranked);
      setScreen("report");
    }, 700);
  };

  const openGrowthPath = async (match: CareerMatch) => {
    setSelectedCareer(match);
    setGrowth(null);
    setGrowthError("");
    setScreen("growth");

    if (!profile) return;
    const bf = bigFiveDescriptors(profile.bigFive);
    const cg = cognitiveDescriptors(profile.cognitive);
    const prompt = `You are a thoughtful career mentor. Someone's current-thinking assessment shows:
    - Personality: openness (${bf.O}), conscientiousness (${bf.C}), extraversion (${bf.E}), agreeableness (${bf.A}), emotional stability (${bf.Es})
    - Thinking style: ${cg.analytical}; ${cg.style}; ${cg.risk}; ${cg.locus}
    They are exploring "${match.occupation.title}" as a possible path (${match.match}% profile overlap). This snapshot reflects how they think right now, not a fixed identity — they can grow toward or away from this role with learning.

    Suggest concrete books, topics, and resources to help them explore and grow toward this career.
    Return ONLY valid JSON:
    {
      "books": [{"title":"Book Title","author":"Author Name","why":"1 sentence on why it fits this person"}],
      "topics": ["topic to study 1", "topic to study 2", "topic to study 3", "topic to study 4"],
      "resources": [{"name":"Resource or community name","type":"course, community, or practice","why":"1 sentence why"}]
    }
    Generate exactly 3 books, 4 topics, and 3 resources.`;

    try {
      const resp = await callAI(prompt);
      const data = JSON.parse(resp);
      setGrowth(data);
    } catch (e) {
      console.error(e);
      setGrowthError(
        "Growth suggestions need an AI connection to generate and couldn't load right now. Your deterministic match results above are unaffected.",
      );
    }
  };

  const startAptitudeTest = (match: CareerMatch) => {
    setSelectedCareer(match);
    setAptitudeQuestions(buildAptitudeTest(match.occupation));
    setAptitudeAnswers({});
    setAptitudeStep(0);
    setScreen("aptitude");
  };

  const currentAptitudeQuestion = aptitudeQuestions[aptitudeStep];

  const handleAptitudeNext = () => {
    if (!selectedCareer) return;
    if (aptitudeStep < aptitudeQuestions.length - 1) {
      setAptitudeStep((s) => s + 1);
    } else {
      // Deterministic scoring — fixed weights and answer values, no AI involved.
      const result = scoreAptitudeTest(selectedCareer.occupation, aptitudeQuestions, aptitudeAnswers);
      setAptitudeResults((prev) => ({ ...prev, [selectedCareer.occupation.title]: result }));
      setScreen("aptitude-result");
    }
  };

  const handleDownload = async () => {
    const reportElement = document.getElementById("final-report-content");
    if (!reportElement) return;

    try {
      setLoadingStatus("Generating PDF...");

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#060610",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("Career_Oracle_Report.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setLoadingStatus("");
    }
  };

  return (
    <div className="app w-full max-w-[720px] px-4 pb-20 relative z-10 pt-10">
      <AnimatePresence mode="wait">
        {screen === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-20 text-center flex flex-col items-center"
          >
            <div className="relative w-24 h-24 mb-10 flex items-center justify-center filter drop-shadow-xl">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="100" height="100" rx="25" fill="#151515" />
                <text
                  x="50"
                  y="62"
                  fontFamily="Inter, sans-serif"
                  fontSize="38"
                  fill="#93D3FA"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  Path
                </text>
              </svg>
            </div>
            <p className="eyebrow mb-3">Career Discovery Oracle</p>
            <h1 className="display text-5xl leading-tight mb-4">
              Find Your
              <br />
              <em className="text-[var(--gold-l)]">True Path</em>
            </h1>
            <p className="welcome-sub text-sm text-[var(--mist)] leading-relaxed max-w-md mx-auto mb-6">
              A research-grounded assessment — personality, vocational
              interests, and thinking style — scored with plain deterministic
              math, then matched against real occupational profiles. No AI
              guessing in the diagnostic step.
            </p>
            <div className="glass max-w-md mx-auto mb-10 text-left px-5 py-4">
              <p className="text-[11px] text-[rgba(240,234,255,0.65)] leading-relaxed">
                <span className="text-[var(--gold-l)]">A snapshot, not a verdict:</span>{" "}
                this reflects how you think and what interests you{" "}
                <em>right now</em>. Traits, interests, and skills evolve as you
                learn — treat this as a starting point for exploration, not a
                fixed label.
              </p>
            </div>
            <div className="phase-pills flex flex-wrap gap-2 justify-center mb-10">
              <span className="pill text-[10px] tracking-widest bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] px-4 py-2 rounded-full uppercase">
                ✦ Validated Trait Model
              </span>
              <span className="pill text-[10px] tracking-widest bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] px-4 py-2 rounded-full uppercase">
                ✦ Deterministic Scoring
              </span>
              <span className="pill text-[10px] tracking-widest bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] px-4 py-2 rounded-full uppercase">
                ✦ AI Growth Guide
              </span>
            </div>
            <div className="orn w-full">
              <div className="orn-l" />
              <span className="orn-c">✦</span>
              <div className="orn-r" />
            </div>
            <button className="btn btn-primary mt-8 mb-4" onClick={handleStart}>
              <span>Begin Your Reading ✦</span>
            </button>
            <Link
              to="/about-us"
              className="text-[var(--gold-d)] tracking-[0.2em] uppercase text-[9px] hover:text-[var(--gold)] transition-colors mt-2"
            >
              About & Disclaimer
            </Link>
          </motion.div>
        )}

        {screen === "question" && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-10"
          >
            <div className="progress-wrap mb-8">
              <div className="progress-meta flex justify-between mb-2">
                <span className="progress-section text-[9px] tracking-widest text-[var(--gold-d)] uppercase">
                  {currentBlock.section}
                </span>
                <span className="progress-count text-xs text-[var(--mist)]">
                  {step + 1} / {ASSESSMENT_BLOCKS.length}
                </span>
              </div>
              <div className="progress-track h-[2px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                <motion.div
                  className="progress-fill h-full bg-gradient-to-r from-[var(--violet)] to-[var(--gold)]"
                  animate={{ width: `${(step / ASSESSMENT_BLOCKS.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="card">
              <p className="q-text text-2xl font-light leading-snug mb-2 font-cg">
                {currentBlock.title}
              </p>
              <p className="q-hint text-[11px] text-[var(--mist)] mb-6">
                {currentBlock.hint}
              </p>

              {currentBlock.kind === "likert" ? (
                <div className="star-items flex flex-col gap-3">
                  {(currentBlock as LikertBlock).items.map((it) => (
                    <div
                      key={it.key}
                      className="star-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 glass"
                    >
                      <span className="font-cg text-sm">{it.label}</span>
                      <div className="likert-scale flex gap-1.5 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={`w-8 h-8 rounded-full text-[11px] border transition-colors ${
                              likertAnswers[it.key] === n
                                ? "bg-[var(--gold)] border-[var(--gold)] text-[#1a1500]"
                                : "border-[rgba(201,168,76,0.25)] text-[var(--mist)] hover:border-[var(--gold)]"
                            }`}
                            onClick={() =>
                              setLikertAnswers({ ...likertAnswers, [it.key]: n })
                            }
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-[9px] text-[var(--mist)] uppercase tracking-widest px-1">
                    <span>1 · Not true of me</span>
                    <span>5 · Very true of me</span>
                  </div>
                </div>
              ) : (
                <div className="opts flex flex-col gap-2">
                  {(currentBlock as ChoiceBlock).opts.map((o) => (
                    <div
                      key={o.v}
                      className={`opt ${choiceAnswers[currentBlock.id] === o.v ? "selected" : ""}`}
                      onClick={() =>
                        setChoiceAnswers({ ...choiceAnswers, [currentBlock.id]: o.v })
                      }
                    >
                      <div className="opt-dot" />
                      <div>
                        <div className="opt-lbl font-cg text-lg">{o.l}</div>
                        {o.s && (
                          <div className="opt-sub text-[10px] text-[var(--mist)]">
                            {o.s}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="btn-row flex justify-between mt-10">
              <button
                className="btn btn-ghost"
                onClick={() =>
                  step > 0 ? setStep((s) => s - 1) : setScreen("welcome")
                }
              >
                <span>← Back</span>
              </button>
              <button
                className="btn btn-primary"
                disabled={!isBlockComplete()}
                onClick={handleNext}
              >
                <span>
                  {step === ASSESSMENT_BLOCKS.length - 1
                    ? "See My Results"
                    : "Continue →"}
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {screen === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-20 text-center"
          >
            <div className="oracle-orb" />
            <p className="eyebrow mb-2">Deterministic Scoring</p>
            <p className="display text-4xl mb-4">Reading Your Profile</p>
            <p className="oracle-status text-[10px] tracking-widest text-[var(--gold-d)] uppercase">
              {loadingStatus}
              <span className="oracle-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          </motion.div>
        )}

        {screen === "report" && (
          <motion.div
            key="report"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-10"
          >
            <div className="text-center mb-10">
              <p className="eyebrow mb-2">Your Current Trait Profile</p>
              <h2 className="display text-4xl">A Snapshot of How You Think</h2>
            </div>

            {profile && (
              <>
                <div className="glass mb-8 px-5 py-4">
                  <p className="text-[11px] text-[rgba(240,234,255,0.65)] leading-relaxed">
                    <span className="text-[var(--gold-l)]">Not a fixed verdict:</span>{" "}
                    these scores describe your responses today. Personality shifts,
                    interests deepen, and skills compound with practice — revisit
                    this any time your thinking evolves.
                  </p>
                </div>

                <div className="card mb-8">
                  <p className="eyebrow mb-4">Big Five Personality</p>
                  <div className="flex flex-col gap-4">
                    {(
                      [
                        ["O", "Openness", profile.bigFive.O],
                        ["C", "Conscientiousness", profile.bigFive.C],
                        ["E", "Extraversion", profile.bigFive.E],
                        ["A", "Agreeableness", profile.bigFive.A],
                        ["Es", "Emotional Stability", profile.bigFive.Es],
                      ] as [string, string, number][]
                    ).map(([key, label, val]) => (
                      <div key={key}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="font-cg">{label}</span>
                          <span className="text-[var(--gold-d)]">
                            {bigFiveDescriptors(profile.bigFive)[key as keyof typeof profile.bigFive]}
                          </span>
                        </div>
                        <div className="progress-track h-[4px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--violet)] to-[var(--gold)]"
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card mb-8">
                  <p className="eyebrow mb-4">Holland Code (RIASEC) Interests</p>
                  <div className="flex flex-col gap-4">
                    {(
                      [
                        ["R", "Realistic — hands-on", profile.riasec.R],
                        ["I", "Investigative — analytical", profile.riasec.I],
                        ["A", "Artistic — creative", profile.riasec.A],
                        ["S", "Social — people-focused", profile.riasec.S],
                        ["E", "Enterprising — persuasive", profile.riasec.E],
                        ["C", "Conventional — structured", profile.riasec.C],
                      ] as [string, string, number][]
                    ).map(([key, label, val]) => (
                      <div key={key}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="font-cg">{label}</span>
                          <span className="text-[var(--gold-d)]">{val}</span>
                        </div>
                        <div className="progress-track h-[4px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--teal)] to-[var(--gold)]"
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card mb-10">
                  <p className="eyebrow mb-4">Thinking Style</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(cognitiveDescriptors(profile.cognitive)).map((desc) => (
                      <span
                        key={desc}
                        className="chip text-[10px] px-3 py-1 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)] text-[var(--gold-d)]"
                      >
                        ✦ {desc}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="orn w-full my-10">
              <div className="orn-l" />
              <span className="orn-c">CAREER MATCHES</span>
              <div className="orn-r" />
            </div>

            {Object.keys(aptitudeResults).length >= 2 && (
              <div className="flex justify-center mb-8">
                <button
                  className="btn btn-ghost"
                  onClick={() => setScreen("compare")}
                >
                  <span>Compare Tested Careers →</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
              {matches.map((m) => (
                <div key={m.occupation.title} className="career-card relative">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-3xl">{m.occupation.emoji}</span>
                    <span className="text-[10px] tracking-tighter text-[var(--gold-l)]">
                      {m.match}% Overlap
                    </span>
                  </div>
                  <div className="text-xl font-cg mb-1">{m.occupation.title}</div>
                  <div className="text-[9px] tracking-widest text-[var(--mist)] uppercase mb-3">
                    {m.occupation.category}
                  </div>
                  <p className="text-[11px] text-[rgba(240,234,255,0.7)] leading-relaxed mb-4 line-clamp-3">
                    {m.why}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {m.occupation.skills.slice(0, 3).map((skill: string) => (
                      <span
                        key={skill}
                        className="text-[8px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(201,168,76,0.1)] text-[var(--mist)]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="h-[2px] w-full bg-[rgba(255,255,255,0.06)] mt-2 mb-4">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--violet)] to-[var(--gold)]"
                      style={{ width: `${m.match}%` }}
                    />
                  </div>

                  {aptitudeResults[m.occupation.title] && (
                    <div className="flex justify-between items-center text-[10px] text-[var(--gold-l)] mb-3 uppercase tracking-widest">
                      <span>Current Adaptability</span>
                      <span>{aptitudeResults[m.occupation.title].overall}%</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      className="btn btn-ghost w-full"
                      onClick={() => startAptitudeTest(m)}
                    >
                      <span>
                        {aptitudeResults[m.occupation.title]
                          ? "Retake Aptitude Test →"
                          : "Test Current Aptitude →"}
                      </span>
                    </button>
                    <button
                      className="btn btn-ghost w-full"
                      onClick={() => openGrowthPath(m)}
                    >
                      <span>Growth Path →</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {screen === "aptitude" && currentAptitudeQuestion && selectedCareer && (
          <motion.div
            key="aptitude"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-10"
          >
            <div className="text-center mb-8">
              <p className="eyebrow mb-2">Profession Aptitude Check</p>
              <h2 className="display text-3xl">
                {selectedCareer.occupation.emoji} {selectedCareer.occupation.title}
              </h2>
            </div>

            <div className="progress-wrap mb-8">
              <div className="progress-meta flex justify-between mb-2">
                <span className="progress-section text-[9px] tracking-widest text-[var(--gold-d)] uppercase">
                  Situational Judgment
                </span>
                <span className="progress-count text-xs text-[var(--mist)]">
                  {aptitudeStep + 1} / {aptitudeQuestions.length}
                </span>
              </div>
              <div className="progress-track h-[2px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                <motion.div
                  className="progress-fill h-full bg-gradient-to-r from-[var(--violet)] to-[var(--gold)]"
                  animate={{ width: `${(aptitudeStep / aptitudeQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="card">
              <p className="q-text text-xl font-light leading-snug mb-6 font-cg">
                {currentAptitudeQuestion.scenario}
              </p>
              <div className="opts flex flex-col gap-2">
                {currentAptitudeQuestion.opts.map((o) => (
                  <div
                    key={o.v}
                    className={`opt ${aptitudeAnswers[currentAptitudeQuestion.id] === o.v ? "selected" : ""}`}
                    onClick={() =>
                      setAptitudeAnswers({
                        ...aptitudeAnswers,
                        [currentAptitudeQuestion.id]: o.v,
                      })
                    }
                  >
                    <div className="opt-dot" />
                    <div>
                      <div className="opt-lbl font-cg text-base">{o.l}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="btn-row flex justify-between mt-10">
              <button
                className="btn btn-ghost"
                onClick={() =>
                  aptitudeStep > 0 ? setAptitudeStep((s) => s - 1) : setScreen("report")
                }
              >
                <span>← Back</span>
              </button>
              <button
                className="btn btn-primary"
                disabled={aptitudeAnswers[currentAptitudeQuestion.id] === undefined}
                onClick={handleAptitudeNext}
              >
                <span>
                  {aptitudeStep === aptitudeQuestions.length - 1
                    ? "See My Adaptability"
                    : "Continue →"}
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {screen === "aptitude-result" && selectedCareer && aptitudeResults[selectedCareer.occupation.title] && (
          <motion.div
            key="aptitude-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-10"
          >
            <div className="text-center mb-8">
              <p className="eyebrow mb-2">Current Adaptability</p>
              <h2 className="display text-4xl">
                {selectedCareer.occupation.emoji}{" "}
                <em className="text-[var(--gold-l)]">{selectedCareer.occupation.title}</em>
              </h2>
            </div>

            <div className="glass mb-8 px-5 py-4">
              <p className="text-[11px] text-[rgba(240,234,255,0.65)] leading-relaxed">
                <span className="text-[var(--gold-l)]">A present-time reading, not a verdict:</span>{" "}
                this reflects how ready your current skills and working style
                are for this role today. It shifts with practice and
                learning — it isn't a fixed ceiling.
              </p>
            </div>

            <div className="card text-center mb-8 py-8">
              <div className="readiness-num text-5xl font-cg text-[var(--gold-l)] mb-2">
                {aptitudeResults[selectedCareer.occupation.title].overall}%
              </div>
              <div className="readiness-label text-[9px] tracking-widest text-[var(--gold-d)] font-sans uppercase">
                Current Adaptability Score
              </div>
            </div>

            <div className="card mb-8">
              <p className="eyebrow mb-4">Dimension Breakdown</p>
              <div className="flex flex-col gap-4">
                {aptitudeResults[selectedCareer.occupation.title].dimensions.map((d) => (
                  <div key={d.dimension}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-cg">{d.label}</span>
                      <span className="text-[var(--gold-d)]">{d.score}%</span>
                    </div>
                    <div className="progress-track h-[4px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--teal)] to-[var(--gold)]"
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--mist)] mt-1">{d.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card mb-10">
              <p className="eyebrow mb-4">What This Suggests</p>
              {aptitudeResults[selectedCareer.occupation.title].strengths.length > 0 && (
                <p className="text-[12px] text-[rgba(240,234,255,0.75)] leading-relaxed mb-3">
                  <span className="text-[var(--gold-l)]">Current strengths: </span>
                  {aptitudeResults[selectedCareer.occupation.title].strengths.join(", ")}.
                </p>
              )}
              {aptitudeResults[selectedCareer.occupation.title].gaps.length > 0 ? (
                <p className="text-[12px] text-[rgba(240,234,255,0.75)] leading-relaxed">
                  <span className="text-[var(--gold-l)]">Room to grow right now: </span>
                  {aptitudeResults[selectedCareer.occupation.title].gaps.join(", ")}
                  {" "}— these are learnable, not fixed limits.
                </p>
              ) : (
                <p className="text-[12px] text-[rgba(240,234,255,0.75)] leading-relaxed">
                  No clear gaps showed up in this reading — a strong present-day
                  fit across the dimensions this role tends to demand.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn btn-ghost" onClick={() => setScreen("report")}>
                <span>← Back to Matches</span>
              </button>
              <button className="btn btn-primary" onClick={() => openGrowthPath(selectedCareer)}>
                <span>Explore Growth Path (AI) →</span>
              </button>
            </div>
          </motion.div>
        )}

        {screen === "compare" && (
          <motion.div
            key="compare"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-10"
          >
            <div className="text-center mb-8">
              <p className="eyebrow mb-2">Adaptability Comparison</p>
              <h2 className="display text-4xl">
                Compare <em className="text-[var(--gold-l)]">Tested Careers</em>
              </h2>
            </div>

            {(() => {
              const comparedCareers = matches
                .filter((m) => aptitudeResults[m.occupation.title])
                .map((m) => ({
                  title: m.occupation.title,
                  emoji: m.occupation.emoji,
                  result: aptitudeResults[m.occupation.title],
                }));

              if (comparedCareers.length === 0) {
                return (
                  <p className="text-center text-[12px] text-[var(--mist)] py-10">
                    No tested careers yet — take an aptitude check from the
                    matches screen first.
                  </p>
                );
              }

              const dimensionsPresent = new Set<AptitudeDimension>();
              comparedCareers.forEach((c) =>
                c.result.dimensions.forEach((d) => dimensionsPresent.add(d.dimension)),
              );
              const orderedDimensions = (
                Object.keys(APTITUDE_DIMENSION_LABELS) as AptitudeDimension[]
              ).filter((d) => dimensionsPresent.has(d));

              return (
                <>
                  <div className="card mb-8">
                    <p className="eyebrow mb-4">Overall Adaptability</p>
                    <div className="flex flex-col gap-4">
                      {[...comparedCareers]
                        .sort((a, b) => b.result.overall - a.result.overall)
                        .map((c) => (
                          <div key={c.title}>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="font-cg">
                                {c.emoji} {c.title}
                              </span>
                              <span className="text-[var(--gold-d)]">{c.result.overall}%</span>
                            </div>
                            <div className="progress-track h-[4px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[var(--teal)] to-[var(--gold)]"
                                style={{ width: `${c.result.overall}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="card mb-10">
                    <p className="eyebrow mb-4">Dimension Breakdown</p>
                    <div className="flex flex-col gap-6">
                      {orderedDimensions.map((dim) => (
                        <div key={dim}>
                          <div className="text-[11px] font-cg mb-2 text-[var(--gold-l)]">
                            {APTITUDE_DIMENSION_LABELS[dim]}
                          </div>
                          <div className="flex flex-col gap-2">
                            {comparedCareers.map((c) => {
                              const d = c.result.dimensions.find((x) => x.dimension === dim);
                              if (!d) {
                                return (
                                  <div
                                    key={c.title}
                                    className="flex justify-between text-[10px] text-[rgba(240,234,255,0.35)]"
                                  >
                                    <span>
                                      {c.emoji} {c.title}
                                    </span>
                                    <span>Not tested</span>
                                  </div>
                                );
                              }
                              return (
                                <div key={c.title}>
                                  <div className="flex justify-between text-[10px] mb-1 text-[var(--mist)]">
                                    <span>
                                      {c.emoji} {c.title}
                                    </span>
                                    <span>{d.score}%</span>
                                  </div>
                                  <div className="progress-track h-[3px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-[var(--violet)] to-[var(--gold)]"
                                      style={{ width: `${d.score}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="flex justify-center">
              <button className="btn btn-ghost" onClick={() => setScreen("report")}>
                <span>← Back to Matches</span>
              </button>
            </div>
          </motion.div>
        )}

        {screen === "growth" && (
          <motion.div
            key="growth"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pt-10 flex flex-col items-center w-full"
          >
            <p className="eyebrow mb-2">AI Growth Guide</p>
            <h2 className="display text-4xl text-center mb-2">
              Growing Toward
              <br />
              <em className="text-[var(--gold-l)]">{selectedCareer?.occupation.title}</em>
            </h2>
            <p className="text-[10px] text-[var(--mist)] uppercase tracking-widest mb-8">
              These suggestions are AI-generated — the match above is not
            </p>

            <div className="card w-full">
              {growthError ? (
                <p className="text-sm text-[rgba(240,234,255,0.6)] leading-relaxed text-center py-6">
                  {growthError}
                </p>
              ) : !growth ? (
                <p className="oracle-status text-[10px] tracking-widest uppercase py-8 text-center">
                  Finding books and resources for you...
                </p>
              ) : (
                <div className="flex flex-col gap-8">
                  <div>
                    <p className="eyebrow mb-4">Books Worth Reading</p>
                    <div className="flex flex-col gap-3">
                      {growth.books.map((b) => (
                        <div key={b.title} className="glass">
                          <div className="font-cg text-base mb-1">
                            {b.title}
                            <span className="text-[10px] text-[var(--mist)] ml-2">
                              by {b.author}
                            </span>
                          </div>
                          <p className="text-[11px] text-[rgba(240,234,255,0.65)] leading-relaxed">
                            {b.why}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="eyebrow mb-4">Topics to Study</p>
                    <div className="flex flex-wrap gap-2">
                      {growth.topics.map((t) => (
                        <span
                          key={t}
                          className="chip text-[10px] px-3 py-1 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)] text-[var(--gold-d)]"
                        >
                          ✦ {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="eyebrow mb-4">Resources & Practice</p>
                    <div className="flex flex-col gap-3">
                      {growth.resources.map((r) => (
                        <div key={r.name} className="glass">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-cg text-base">{r.name}</span>
                            <span className="text-[9px] text-[var(--gold-d)] uppercase tracking-widest">
                              {r.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-[rgba(240,234,255,0.65)] leading-relaxed">
                            {r.why}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <button className="btn btn-ghost" onClick={() => setScreen("report")}>
                <span>← Back to Matches</span>
              </button>
              <button className="btn btn-primary" onClick={() => setScreen("final")}>
                <span>See Final Report →</span>
              </button>
            </div>
          </motion.div>
        )}

        {screen === "final" && (
          <motion.div
            key="final"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-10 flex flex-col w-full"
          >
            <div
              id="final-report-content"
              className="w-full bg-[var(--void)] p-4 sm:p-8 rounded-lg"
            >
              <div className="text-center mb-10">
                <p className="eyebrow mb-2">Your Career Exploration Report</p>
                <h2 className="display text-5xl">
                  Your Current
                  <br />
                  <em className="text-[var(--gold-l)]">Snapshot</em>
                </h2>
              </div>

              <div className="card text-center mb-8 py-10">
                <div className="relative w-40 h-40 mx-auto mb-8 flex items-center justify-center">
                  <svg
                    className="absolute inset-0 -rotate-90 w-full h-full"
                    width="160"
                    height="160"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="4"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="var(--gold)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      initial={{
                        strokeDasharray: "283 283",
                        strokeDashoffset: 283,
                      }}
                      animate={{
                        strokeDashoffset:
                          283 - (283 * (selectedCareer?.match || 0)) / 100,
                      }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  <div>
                    <div className="readiness-num text-4xl font-cg text-[var(--gold-l)]">
                      {selectedCareer?.match}%
                    </div>
                    <div className="readiness-label text-[9px] tracking-widest text-[var(--gold-d)] font-sans">
                      PROFILE OVERLAP
                    </div>
                  </div>
                </div>
                <p className="eyebrow text-[var(--gold)] mb-4">
                  {selectedCareer?.occupation.title}
                </p>
                <p className="text-lg font-cg italic leading-relaxed text-[var(--star)] border-t border-[rgba(255,255,255,0.05)] pt-6 mt-2">
                  {selectedCareer?.why}
                </p>
                <p className="text-[10px] text-[var(--mist)] mt-6 italic">
                  Deterministically computed from your Big Five, RIASEC, and
                  thinking-style scores — not AI-generated. Your thinking
                  evolves, so treat this as a starting point, not a verdict.
                </p>
              </div>

              {selectedCareer && aptitudeResults[selectedCareer.occupation.title] && (
                <>
                  <div className="orn w-full my-8">
                    <div className="orn-l" />
                    <span className="orn-c">CURRENT ADAPTABILITY</span>
                    <div className="orn-r" />
                  </div>

                  <div className="card mb-10">
                    <div className="flex justify-between items-baseline mb-6">
                      <p className="eyebrow">Adaptability for This Role Today</p>
                      <span className="text-3xl font-cg text-[var(--gold-l)]">
                        {aptitudeResults[selectedCareer.occupation.title].overall}%
                      </span>
                    </div>
                    <div className="flex flex-col gap-4 mb-4">
                      {aptitudeResults[selectedCareer.occupation.title].dimensions.map((d) => (
                        <div key={d.dimension}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-cg">{d.label}</span>
                            <span className="text-[var(--gold-d)]">{d.score}%</span>
                          </div>
                          <div className="progress-track h-[4px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[var(--teal)] to-[var(--gold)]"
                              style={{ width: `${d.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[var(--mist)] mt-4 italic">
                      Deterministically scored from your situational-judgment
                      answers for this specific profession — not AI-generated.
                      This is a present-time reading, not a fixed ceiling.
                    </p>
                  </div>
                </>
              )}

              {growth && (
                <>
                  <div className="orn w-full my-8">
                    <div className="orn-l" />
                    <span className="orn-c">GROWTH PATH (AI-GENERATED)</span>
                    <div className="orn-r" />
                  </div>

                  <div className="steps-list flex flex-col gap-3 mb-10">
                    {growth.books.map((b, i) => (
                      <div key={i} className="glass flex gap-4 items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] flex items-center justify-center text-[10px] text-[var(--gold)]">
                          0{i + 1}
                        </span>
                        <p className="text-sm text-[rgba(240,234,255,0.7)]">
                          <span className="text-[var(--gold-l)]">{b.title}</span> by{" "}
                          {b.author} — {b.why}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="card text-left bg-[rgba(201,168,76,0.05)] border-[rgba(201,168,76,0.1)] mb-10">
                    <p className="eyebrow mb-4">Topics to Study</p>
                    <div className="flex flex-col gap-3">
                      {growth.topics.map((t, i) => (
                        <div key={i} className="flex gap-2 text-xs text-[var(--mist)]">
                          <span className="text-[var(--gold)]">✦</span> {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col items-center gap-6 mt-4">
              <button className="btn btn-primary" onClick={handleDownload}>
                <span>Download Report ↓</span>
              </button>
              <button
                className="text-[var(--gold-d)] tracking-[0.3em] uppercase text-[10px] hover:text-[var(--gold)] transition-colors"
                onClick={() => {
                  setScreen("welcome");
                  setStep(0);
                  setLikertAnswers({});
                  setChoiceAnswers({});
                  setProfile(null);
                  setMatches([]);
                  setSelectedCareer(null);
                  setGrowth(null);
                  setGrowthError("");
                  setAptitudeQuestions([]);
                  setAptitudeAnswers({});
                  setAptitudeStep(0);
                  setAptitudeResults({});
                }}
              >
                ⟵ Start a New Reading
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AboutUs() {
  return (
    <div className="pt-20 flex flex-col items-center text-center app w-full max-w-[720px] px-4 pb-20 relative z-10">
      <Helmet>
        <title>About Career Oracle - Find Your Career Path</title>
        <meta
          name="description"
          content="Discover how to find your career path with Career Oracle. The ultimate quiz and AI tool to find compatible jobs, explore career exploration for students, and help you find a career path that matches your interests."
        />
      </Helmet>
      <div className="seal relative w-16 h-16 mb-8 flex items-center justify-center">
        <div className="absolute inset-0 border border-[rgba(201,168,76,0.3)] rounded-full" />
        <span className="text-xl text-[var(--gold)]">ℹ</span>
      </div>
      <h2 className="display text-4xl mb-6">
        About &<br />
        <em className="text-[var(--gold-l)]">Disclaimer</em>
      </h2>

      <div className="card text-left mb-8 max-w-3xl">
        <h3 className="eyebrow mb-4">About Career Oracle</h3>
        <p className="text-sm text-[rgba(240,234,255,0.7)] leading-relaxed mb-6">
          Career Oracle scores your responses using established psychometric
          frameworks — the Big Five personality model, Holland's RIASEC
          vocational-interest model, cognitive reflection puzzles, and
          measures of risk tolerance, locus of control, and problem-solving
          style — then matches your resulting profile against a curated set
          of real occupations using deterministic (non-AI) math. AI is used
          only afterward, to suggest books, topics, and resources for
          whichever career you'd like to explore further.
        </p>
        <div className="orn w-full my-6">
          <div className="orn-l" />
          <span className="orn-c">✦</span>
          <div className="orn-r" />
        </div>
        <p className="eyebrow mb-4 text-[#e87b9a]">Disclaimer</p>
        <p className="text-sm text-[rgba(240,234,255,0.7)] leading-relaxed">
          This assessment offers a snapshot of your personality, interests,
          and thinking style at the time you took it — not a fixed, permanent
          verdict. Traits and interests evolve as you learn and gain new
          experiences. <strong>This tool is not a substitute for professional
          guidance</strong> and should not be the sole basis for major life
          decisions, academic choices, or professional direction. Always
          consult with human career counselors, mentors, and your own
          judgment.
        </p>

        <div className="orn w-full my-6">
          <div className="orn-l" />
          <span className="orn-c">✦</span>
          <div className="orn-r" />
        </div>

        <h1 className="text-xl text-[var(--gold-l)] mb-4 font-cg">
          How to Think About Finding Your Career Path
        </h1>

        <div className="text-sm text-[rgba(240,234,255,0.7)] leading-relaxed space-y-4">
          <p>
            "What should I choose as a career?" is one of the hardest
            questions to answer honestly, because most of us are poor judges
            of our own patterns — we know what we're supposed to like more
            than what we actually gravitate toward under pressure. That's the
            gap a structured, validated assessment can help close: it gives
            you a grounded read on your personality, interests, and
            decision-making style, without asking you to self-diagnose from
            scratch.
          </p>

          <h2 className="text-base text-[var(--gold)] mt-6 mb-2">
            Why We Measure Traits, Not Just Ask "What Do You Like?"
          </h2>
          <p>
            Simple quizzes that just ask "do you like people or numbers?"
            assume you already understand yourself — but self-report is
            notoriously unreliable. That's why part of this assessment uses
            short cognitive puzzles that are scored as right or wrong rather
            than self-described, giving an objective read on whether you lean
            analytical or intuitive. Combined with your Big Five personality
            profile and RIASEC interest scores, this builds a fuller picture
            than a single "what do you enjoy" question ever could.
          </p>

          <h2 className="text-base text-[var(--gold)] mt-6 mb-2">
            Deterministic Matching, AI-Assisted Growth
          </h2>
          <p>
            Your career matches are computed with fixed, repeatable math —
            comparing your trait profile against real occupational profiles.
            There's no AI guessing involved in the ranking you see. Once
            you've found a career that interests you, that's where AI
            genuinely helps: generating a tailored reading list, topics to
            study, and resources for growth. That's a task AI is well suited
            for, and it's kept separate from the scoring itself.
          </p>

          <h2 className="text-base text-[var(--gold)] mt-6 mb-2">
            For Students, Career Changers, and the Curious
          </h2>
          <p>
            Whether you're a student weighing options, a professional
            considering a change, or simply curious how your personality maps
            onto real occupations, this tool is meant as a starting point for
            exploration — a way to surface options you might not have
            considered, backed by transparent scoring you can inspect for
            yourself.
          </p>

          <h2 className="text-base text-[var(--gold)] mt-6 mb-2">
            Your Thinking Evolves — Revisit Anytime
          </h2>
          <p>
            Personality and interests are not permanently fixed; research
            consistently shows they shift as we gain experience and learn new
            things. Treat your results as a snapshot of where you are now,
            not a life sentence. You're welcome to retake the assessment as
            your thinking evolves.
          </p>
        </div>

        <div className="orn w-full my-6">
          <div className="orn-l" />
          <span className="orn-c">FAQ</span>
          <div className="orn-r" />
        </div>

        <h3 className="text-xl text-[var(--gold-l)] mb-4 font-cg">
          Frequently Asked Questions
        </h3>

        <div className="text-sm text-[rgba(240,234,255,0.7)] leading-relaxed space-y-4">
          <h4 className="text-base text-[var(--gold)] mt-6 mb-2">
            How is my score actually calculated?
          </h4>
          <p>
            Every question maps to a specific trait scale (a Big Five factor,
            a RIASEC interest, cognitive reflection accuracy, risk tolerance,
            locus of control, or adaptor/innovator style). Your answers are
            averaged and normalized using fixed formulas — no AI is involved
            in this step, and the same answers always produce the same
            scores.
          </p>

          <h4 className="text-base text-[var(--gold)] mt-6 mb-2">
            Is this free to use?
          </h4>
          <p>
            Yes — the full assessment, trait profile, and career matching are
            free to use.
          </p>

          <h4 className="text-base text-[var(--gold)] mt-6 mb-2">
            How accurate are the career matches?
          </h4>
          <p>
            The matches reflect how closely your trait profile overlaps with
            each occupation's typical profile, based on established
            frameworks. They're a well-grounded starting point for
            exploration — not a guarantee of fit or success. Use your own
            judgment and talk to people in fields you're considering.
          </p>

          <h4 className="text-base text-[var(--gold)] mt-6 mb-2">
            Where does AI come into this at all?
          </h4>
          <p>
            AI is used only after your deterministic matches are shown —
            to generate personalized book recommendations, topics to study,
            and resources for growth toward a career you're curious about. It
            has no role in scoring your assessment or ranking your matches.
          </p>

          <h4 className="text-base text-[var(--gold)] mt-6 mb-2">
            Is this suitable for students exploring career options?
          </h4>
          <p>
            Yes. Students and career changers alike can use this as a
            starting point for exploration, laying a foundation before
            committing to specific degrees or training paths.
          </p>
        </div>
      </div>

      <Link to="/" className="btn btn-ghost">
        <span>← Back to Start</span>
      </Link>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="pt-20 flex flex-col items-center text-center app w-full max-w-[720px] px-4 pb-20 relative z-10">
      <Helmet>
        <title>Privacy Policy - Career Oracle</title>
        <meta
          name="description"
          content="Privacy Policy for Career Oracle. Learn how we handle your data when you use our career prediction AI."
        />
      </Helmet>
      <h1 className="display text-4xl mb-6">Privacy Policy</h1>
      <div className="card text-left mb-8 max-w-3xl text-sm text-[rgba(240,234,255,0.7)] space-y-4">
        <p>Last updated: June 2026</p>
        <p>
          Your privacy is important to us. It is Career Oracle's policy to
          respect your privacy regarding any information we may collect from you
          across our website. We are committed to maintaining the
          confidentiality and security of our users' personal exploration data.
        </p>
        <h2 className="text-base text-[var(--gold)]">Information We Collect</h2>
        <p>
          We only ask for personal information when we truly need it to provide
          a service to you, namely, generating your unique career profile. We do
          not store your quiz answers or generated reports persistently unless
          you choose to download them.
        </p>
        <h2 className="text-base text-[var(--gold)]">Third-Party Services</h2>
        <p>
          Our career mapping tool free logic relies on the Gemini AI API to
          generate predictions. Your inputs are sent to the AI strictly to
          formulate your report and are governed by the respective AI platform's
          data policies.
        </p>
      </div>
      <Link to="/" className="btn btn-ghost">
        <span>← Back to Start</span>
      </Link>
    </div>
  );
}

function TermsOfService() {
  return (
    <div className="pt-20 flex flex-col items-center text-center app w-full max-w-[720px] px-4 pb-20 relative z-10">
      <Helmet>
        <title>Terms of Service - Career Oracle</title>
        <meta
          name="description"
          content="Terms of Service for Career Oracle. Read the conditions before exploring your career path."
        />
      </Helmet>
      <h1 className="display text-4xl mb-6">Terms of Service</h1>
      <div className="card text-left mb-8 max-w-3xl text-sm text-[rgba(240,234,255,0.7)] space-y-4">
        <p>
          By accessing our website, you agree to be bound by these terms of
          service and comply with all applicable laws.
        </p>
        <h2 className="text-base text-[var(--gold)]">Use License</h2>
        <p>
          Permission is granted to temporarily use our career finder AI and
          tools for personal, non-commercial transitory viewing only.
        </p>
        <h2 className="text-base text-[var(--gold)]">Disclaimer</h2>
        <p>
          The materials on Career Oracle's website are provided on an 'as is'
          basis. As stated in our About page, our career prediction AI is for
          entertainment purposes and is not 100% reliable. Do not make major
          life decisions solely based on the insights provided by this system.
        </p>
      </div>
      <Link to="/" className="btn btn-ghost">
        <span>← Back to Start</span>
      </Link>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<string>("English");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.3 + 0.2,
      a: Math.random(),
      sp: Math.random() * 0.003 + 0.001,
    }));

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    let animationFrame: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      stars.forEach((s) => {
        s.a += s.sp;
        if (s.a > 1) s.a = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 230, 255, ${0.08 + Math.abs(Math.sin(s.a)) * 0.65})`;
        ctx.fill();
      });
      animationFrame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="relative min-h-screen z-10 w-full overflow-x-hidden flex flex-col items-center">
      <Helmet>
        <title>Career Oracle - How to find your career path</title>
        <meta
          name="description"
          content="Take this test to find career path and discover what you are good at. Find compatible jobs for you."
        />
      </Helmet>
      <canvas
        ref={canvasRef}
        data-html2canvas-ignore="true"
        className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-50 z-0"
      />

      <main className="flex-1 w-full flex flex-col items-center z-10 relative">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<CareerOracleTool language={language} />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
        </Routes>
      </main>

      <footer
        className="w-full py-6 mt-8 z-20 text-center text-[10px] uppercase tracking-widest text-[#5c5c70] border-t border-[rgba(255,255,255,0.05)] bg-[rgba(6,6,16,0.8)] backdrop-blur px-6 flex flex-col md:flex-row items-center gap-4 justify-between"
        data-html2canvas-ignore="true"
      >
        <div className="flex gap-4">
          <Link to="/" className="hover:text-[var(--gold)] transition-colors">
            Home
          </Link>
          <Link
            to="/about-us"
            className="hover:text-[var(--gold)] transition-colors"
          >
            About Us
          </Link>
          <Link
            to="/privacy-policy"
            className="hover:text-[var(--gold)] transition-colors"
          >
            Privacy
          </Link>
          <Link
            to="/terms-of-service"
            className="hover:text-[var(--gold)] transition-colors"
          >
            Terms of Service
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span>Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-[#0b0b18] border border-[rgba(201,168,76,0.2)] text-[var(--gold-d)] text-[10px] rounded px-2 py-1 outline-none uppercase tracking-wider cursor-pointer hover:border-[var(--gold)] transition-colors"
          >
            <option value="English">English</option>
            <option value="Spanish">Español</option>
            <option value="French">Français</option>
            <option value="German">Deutsch</option>
            <option value="Italian">Italiano</option>
            <option value="Hindi">हिन्दी</option>
            <option value="Chinese">中文</option>
            <option value="Japanese">日本語</option>
            <option value="Korean">한국어</option>
          </select>
        </div>
      </footer>
    </div>
  );
}
