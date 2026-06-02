/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

// ────────────────────────────────────────────────
// CONSTANTS & DATA
// ────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 'q1', section: 'Pattern Recognition',
    q: 'Look at this sequence: 2, 6, 12, 20, 30, __ — what comes next?',
    hint: 'Go with your first instinct. How you approach this tells us more than the answer.',
    type: 'single', opts: [
      { v: 'analytical', l: '42', s: 'I spotted the pattern: differences are +4, +6, +8, +10, +12' },
      { v: 'intuitive', l: '40', s: 'It felt like it should jump by roughly 10 again' },
      { v: 'systematic', l: '36', s: 'I assumed it was multiplying or adding a fixed number' },
      { v: 'creative', l: "I didn't try to calculate — I just guessed", s: "Numbers aren't my natural language" },
    ]
  },
  {
    id: 'q2', section: 'Pattern Recognition',
    q: "You're given a map of a city you've never visited. What do you instinctively look at first?",
    hint: "Don't overthink — what actually catches your eye?",
    type: 'single', opts: [
      { v: 'systems', l: 'The road network — how it all connects', s: 'I want to understand the flow and logic of movement' },
      { v: 'spatial', l: 'The overall shape and layout from above', s: "I'm drawn to the big picture and visual structure" },
      { v: 'human', l: 'Where people live — residential areas, density', s: "I'm most interested in the human side of the place" },
      { v: 'detail', l: 'Specific landmarks or points of interest', s: 'I zoom into particular things rather than the whole' },
      { v: 'strategic', l: 'Entry and exit points — how you get in and out', s: 'I instinctively think about access and efficiency' },
    ]
  },
  {
    id: 'q3', section: 'Pattern Recognition',
    q: 'A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How much does the ball cost?',
    hint: 'The most common instinct here is actually wrong — what was yours?',
    type: 'single', opts: [
      { v: 'analytical', l: '5 cents — I worked it out carefully', s: 'bat=$1.05, ball=$0.05 — the algebra checks out' },
      { v: 'impulsive', l: '10 cents — that was my first thought', s: 'Most people jump to this; I know it feels right but isn\'t' },
      { v: 'uncertain', l: 'I\'m not sure — I second-guessed myself', s: 'I knew something was off but couldn\'t pin it down' },
      { v: 'skipped', l: 'I didn\'t try to solve it', s: 'Math puzzles aren\'t where my mind naturally goes' },
    ]
  },
  {
    id: 'q4', section: 'How You Think',
    q: "You're trying to explain something complicated to a friend who keeps not getting it. You naturally...",
    hint: 'What do you actually do in this moment?',
    type: 'single', opts: [
      { v: 'analogy', l: 'Find a completely different analogy or metaphor', s: 'If one comparison doesn\'t work, I\'ll find another angle' },
      { v: 'breakdown', l: 'Break it into even smaller pieces and go slower', s: 'The structure was right — they just need more steps' },
      { v: 'visual', l: 'Draw it, sketch it, or use hand gestures', s: 'I instinctively go spatial when words fail' },
      { v: 'question', l: 'Ask what part they\'re stuck on and start there', s: 'I diagnose where the gap is before trying again' },
      { v: 'surrender', l: 'Accept that it\'s hard to explain and move on', s: 'Some things just resist explanation' },
    ]
  },
  {
    id: 'q5', section: 'How You Think',
    q: 'You have $1,000 and 3 months. Which option appeals to you most?',
    hint: 'Your gut reaction here reveals how you think about resources and time.',
    type: 'single', opts: [
      { v: 'invest_self', l: 'Put it all into a skill, course, or tool', s: 'Best ROI is investing in your own capability' },
      { v: 'invest_money', l: 'Put it in something that can grow — stocks, crypto, assets', s: 'Money should work for you, not sit idle' },
      { v: 'build', l: 'Use it to build or launch something small', s: 'Even $1,000 can start something real' },
      { v: 'experience', l: 'Spend it on travel or a life-changing experience', s: 'Experiences compound in ways money can\'t' },
      { v: 'save', l: 'Save it — security matters more than growth right now', s: 'A cushion is the foundation of everything else' },
    ]
  },
  {
    id: 'q6', section: 'How You Think',
    q: 'Which of these statements feels most true to you right now?',
    hint: 'Pure gut reaction — don\'t analyze it.',
    type: 'single', opts: [
      { v: 'rules', l: 'Most rules exist for good reasons and should be followed', s: 'Systems work when people respect the structure' },
      { v: 'context', l: 'Rules depend on context — some deserve to be broken', s: 'Judgment matters more than blind compliance' },
      { v: 'change', l: 'Most systems are outdated and need to be rebuilt', s: 'The status quo isn\'t sacred — it should be challenged' },
      { v: 'people', l: 'Rules matter less than the relationships they affect', s: 'How people feel always outweighs the letter of the law' },
    ]
  },
  {
    id: 'q7', section: 'How You See the World',
    q: 'Rate how much each type of content genuinely holds your attention',
    hint: '1 star = I lose interest fast  •  5 stars = I could go for hours',
    type: 'stars', items: [
      { v: 'tech', l: 'How things work — engineering, science, tech breakdowns' },
      { v: 'people', l: 'Human stories — real life, psychology, relationships' },
      { v: 'numbers', l: 'Data, statistics, trends, financial patterns' },
      { v: 'ideas', l: 'Big ideas — philosophy, futures, theories' },
      { v: 'making', l: 'Process of making things — from concept to finished result' },
      { v: 'world', l: 'Current events, geopolitics, social movements' },
    ]
  },
  {
    id: 'q8', section: 'How You See the World',
    q: "A company's sales drop 30% in one month. What's your first thought?",
    hint: 'Be honest — what direction does your mind go first?',
    type: 'single', opts: [
      { v: 'data', l: "I'd want to see the data broken down by product, region, time", s: "The aggregate number tells me nothing — I need the breakdown" },
      { v: 'cause', l: 'Something external changed — market, competition, news', s: 'A sudden drop usually means something outside shifted' },
      { v: 'internal', l: 'Something broke internally — team, product, process', s: 'Most crises start from within, not outside' },
      { v: 'people', l: "Who's been affected and how are they holding up?", s: 'The human impact is the most urgent thing to understand' },
      { v: 'opportunity', l: 'This might actually be a reset opportunity', s: 'Disruption opens doors that stability keeps closed' },
    ]
  },
  {
    id: 'q9', section: 'How You See the World',
    q: 'Which of these unsolved mysteries genuinely fascinates you most?',
    hint: 'The one that makes you actually want to go look it up.',
    type: 'single', opts: [
      { v: 'science', l: 'Why do we sleep — and what exactly happens in our brain?', s: 'The biological machinery of consciousness and rest' },
      { v: 'social', l: 'Why do some societies thrive and others collapse?', s: 'The patterns behind civilizational success and failure' },
      { v: 'tech', l: 'Will artificial intelligence ever be truly conscious?', s: 'The line between simulation and genuine experience' },
      { v: 'personal', l: 'Why do people make self-destructive choices they can\'t stop?', s: 'The gap between knowing and doing in human behaviour' },
      { v: 'universe', l: 'Is there life somewhere else in the universe?', s: 'The statistical near-certainty and total silence of space' },
    ]
  },
  {
    id: 'q10', section: 'Decisions & Risk',
    q: "You're offered two jobs. Job A pays well and is very stable. Job B pays less now but has huge upside if it works out. You choose...",
    hint: 'What would you actually do — not what sounds better.',
    type: 'single', opts: [
      { v: 'risk_high', l: 'Job B without much hesitation', s: 'Upside matters more than security — I back myself' },
      { v: 'risk_calc', l: 'Job B, but only after serious due diligence', s: 'I need to believe in the upside before betting on it' },
      { v: 'risk_low', l: 'Job A — the stability is genuinely worth more to me', s: 'A reliable foundation lets me take other risks in life' },
      { v: 'risk_context', l: 'It depends entirely on what the job actually is', s: 'The work itself matters more than the pay structure' },
    ]
  },
  {
    id: 'q11', section: 'Decisions & Risk',
    q: "You're working on something and realize halfway through that your original approach was wrong. You...",
    hint: 'What actually happens inside you at this moment?',
    type: 'single', opts: [
      { v: 'pivot', l: 'Scrap it and restart fresh — clean slate is faster', s: 'Sunk cost is a trap; the new path is always cleaner' },
      { v: 'adapt', l: 'Adapt what I have — salvage the good parts', s: 'Not everything needs to go; I look for what\'s still useful' },
      { v: 'push', l: 'Finish it anyway — quitting mid-way feels wrong', s: 'Completion has its own value even when imperfect' },
      { v: 'consult', l: 'Pause and get a second opinion before deciding', s: 'Another perspective might see options I\'m missing' },
      { v: 'learn', l: 'Figure out first how I got the approach wrong', s: 'Understanding the error matters before fixing anything' },
    ]
  },
  {
    id: 'q12', section: 'Decisions & Risk',
    q: 'Ten years from now, which version of yourself would feel most like success?',
    hint: 'The one that genuinely excites something in your chest.',
    type: 'single', opts: [
      { v: 'builder', l: 'I built something real that exists in the world', s: 'A company, product, body of work — something tangible that outlasts me' },
      { v: 'expert', l: 'I became one of the best in the world at something specific', s: 'Depth of mastery and undeniable expertise in my field' },
      { v: 'free', l: 'I answer to no one and go where I want', s: 'Complete financial and geographic freedom — life entirely on my terms' },
      { v: 'impact', l: 'I changed how people think or live in a meaningful way', s: 'Real-world impact that improved lives, not just my own' },
      { v: 'known', l: 'People in my field or beyond know who I am', s: 'A name that carries weight, a reputation that opens doors' },
    ]
  },
];

const PROFESSIONS_LIST = `Digital Creator, YouTuber, TikToker, Instagram Influencer, Podcaster, Software Engineer, Frontend Developer, Backend Developer, Full-Stack Developer, Mobile App Developer, AI/ML Engineer, Data Scientist, Data Analyst, Cybersecurity Specialist, Entrepreneur, Startup Founder, UX Designer, Product Manager, Growth Hacker, Marketing Director, Brand Strategist, Venture Capitalist, Crypto Investor, Financial Advisor, Graphic Designer, Motion Artist, Animator, Fashion Designer, Interior Designer, Architect, Healthcare Professional, Doctor, Nurse, Surgeon, Psychiatrist, Psychologist, Fitness Coach, Life Coach, Teacher, Professor, Researcher, Journalist, Copywriter, PR Manager, SEO Specialist, Chef, Tattoo Artist, Artist, Athlete, Sports Analyst, Sustainability Consultant, Content Strategy Manager.`;

// ────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────

type Screen = 'welcome' | 'question' | 'analyzing' | 'report' | 'test-intro' | 'test-question' | 'final' | 'about';

function CareerOracleTool({ language }: { language: string }) {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [starRatings, setStarRatings] = useState<Record<string, Record<string, number>>>({});

  // AI Generated Data
  const [personalitySummary, setPersonalitySummary] = useState('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [careerRecs, setCareerRecs] = useState<any[]>([]);
  const [selectedCareers, setSelectedCareers] = useState<any[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<any>(null);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  const [testStep, setTestStep] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Gemini API helper
  const callAI = async (prompt: string) => {
    const langInstructions = language !== 'English' 
      ? `\n\nIMPORTANT: Please translate the values in the JSON output into ${language}. The JSON keys MUST remain in English.` 
      : '';
      
    const genAI = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY!,
      unstable_experimental_httpOptions: {
        // This SDK requires specific environment configuration sometimes
      }
    } as any);
    const result = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt + langInstructions
    });
    // The response structure in this SDK version
    const text = (result as any).candidates?.[0]?.content?.parts?.[0]?.text || (result as any).text;
    if (!text) throw new Error("Could not extract text from Gemini response");
    return text.replace(/```json|```/g, '').trim();
  };

  const handleStart = () => {
    setScreen('question');
    setStep(0);
  };

  const handleNext = () => {
    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1);
    } else {
      runAnalysis();
    }
  };

  const runAnalysis = async () => {
    setScreen('analyzing');
    setLoadingStatus('Consulting the oracle...');

    const answerSummary = QUESTIONS.map(q => {
      if (q.type === 'single') {
        const val = answers[q.id];
        const opt = q.opts?.find(o => o.v === val);
        return `Q: ${q.q}\nA: ${opt ? opt.l : 'n/a'}`;
      } else {
        const ratings = starRatings[q.id] || {};
        const rated = Object.entries(ratings).map(([k, v]) => `${k}: ${v}/5`).join(', ');
        return `Q: ${q.q}\nRatings: ${rated}`;
      }
    }).join('\n\n');

    const prompt = `You are a world-class career psychologist. Analyze these 12 answers which reveal thinking style, risk appetite, curiosity domains, and decision-making patterns.
    ANSWERS:
    ${answerSummary}
    
    AVAILABLE PROFESSIONS:
    ${PROFESSIONS_LIST}
    
    Return ONLY valid JSON:
    {
      "summary": "3-4 sentences describing this person's cognitive style. Be specific and psychologically insightful.",
      "strengths": ["strength1", "strength2", "strength3", "strength4"],
      "careers": [
        {
          "title": "Career Title",
          "emoji": "single emoji",
          "category": "Category Name",
          "match": 92,
          "reason": "Why this fits based on answer patterns",
          "skills": ["Skill 1", "Skill 2", "Skill 3"]
        }
      ]
    }
    Generate exactly 8 careers, varied and interesting. Each MUST have a 'skills' array with 3-5 key skills.`;

    try {
      const resp = await callAI(prompt);
      const data = JSON.parse(resp);
      setPersonalitySummary(data.summary);
      setStrengths(data.strengths);
      setCareerRecs(data.careers);
      setScreen('report');
    } catch (e) {
      console.error(e);
      setScreen('welcome');
    }
  };

  const startTest = async (careerToTest: any) => {
    setSelectedCareer(careerToTest);
    setScreen('test-intro');
    setLoadingStatus('Preparing your aptitude test...');
    
    const prompt = `Create a 5-question aptitude test for someone becoming a ${careerToTest.title}. 
    Based on their profile: ${personalitySummary}.
    Mix logic, knowledge, and practical scenarios.
    
    Return ONLY valid JSON:
    {
      "questions": [
        {"q":"Question?","opts":["A","B","C","D"],"correct":0,"explain":"Explanation text."}
      ]
    }`;

    try {
      const resp = await callAI(prompt);
      const data = JSON.parse(resp);
      setTestQuestions(data.questions);
      setTestStep(0);
      setTestScore(0);
    } catch (e) {
      console.error(e);
      setScreen('report');
    }
  };

  const handleTestAnswer = (index: number) => {
    const q = testQuestions[testStep];
    const isCorrect = index === q.correct;
    if (isCorrect) setTestScore(s => s + 1);

    // Visual feedback handled by state
    const results = [...(testQuestions as any)];
    results[testStep].selectedIndex = index;
    setTestQuestions(results);
  };

  const nextTestStep = () => {
    if (testStep < testQuestions.length - 1) {
      setTestStep(s => s + 1);
    } else {
      generateFinalReport();
    }
  };

  const generateFinalReport = async () => {
    setScreen('analyzing');
    setLoadingStatus('Synthesizing your spiritual roadmap...');
    
    const pct = (testScore / testQuestions.length) * 100;
    const prompt = `Based on personality (${personalitySummary}), target career (${selectedCareer.title}), and aptitude score (${testScore}/${testQuestions.length}), generate a final roadmap.
    
    Return ONLY valid JSON:
    {
      "readiness": ${Math.floor(40 + pct * 0.5)},
      "verdict": "Psychological verdict on career fit.",
      "next_steps": ["step 1", "step 2", "step 3", "step 4", "step 5"],
      "improvements": ["improvement 1", "improvement 2", "improvement 3"],
      "timeline": "e.g. 6-12 months",
      "timeline_detail": "Detailed timeline breakdown."
    }`;

    try {
      const resp = await callAI(prompt);
      setFinalReport(JSON.parse(resp));
      setScreen('final');
    } catch (e) {
      console.error(e);
      setScreen('report');
    }
  };

  const handleDownload = async () => {
    const reportElement = document.getElementById('final-report-content');
    if (!reportElement) return;

    try {
      setLoadingStatus('Generating PDF...');
      
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#060610'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('Career_Oracle_Report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setLoadingStatus('');
    }
  };

  return (
    <div className="app w-full max-w-[720px] px-4 pb-20 relative z-10 pt-10">
      <AnimatePresence mode="wait">
        {screen === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pt-20 text-center flex flex-col items-center"
            >
              <div className="relative w-24 h-24 mb-10 flex items-center justify-center filter drop-shadow-xl">
                 <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="25" fill="#151515" />
                    <text x="50" y="62" fontFamily="Inter, sans-serif" fontSize="38" fill="#93D3FA" fontWeight="500" textAnchor="middle">Path</text>
                 </svg>
              </div>
              <p className="eyebrow mb-3">Career Discovery Oracle</p>
              <h1 className="display text-5xl leading-tight mb-4">Find Your<br /><em className="text-[var(--gold-l)]">True Path</em></h1>
              <p className="welcome-sub text-sm text-[var(--mist)] leading-relaxed max-w-md mx-auto mb-10">
                A deep personality assessment that maps your mind, reveals your ideal professions, tests your aptitude, and gives you an exact roadmap to get there.
              </p>
              <div className="phase-pills flex flex-wrap gap-2 justify-center mb-10">
                 <span className="pill text-[10px] tracking-widest bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] px-4 py-2 rounded-full uppercase">✦ 12 Questions</span>
                 <span className="pill text-[10px] tracking-widest bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] px-4 py-2 rounded-full uppercase">✦ AI Analysis</span>
                 <span className="pill text-[10px] tracking-widest bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] px-4 py-2 rounded-full uppercase">✦ Career Test</span>
              </div>
              <div className="orn w-full"><div className="orn-l" /><span className="orn-c">✦</span><div className="orn-r" /></div>
              <button className="btn btn-primary mt-8 mb-4" onClick={handleStart}>
                <span>Begin Your Reading ✦</span>
              </button>
              <Link to="/about-us" className="text-[var(--gold-d)] tracking-[0.2em] uppercase text-[9px] hover:text-[var(--gold)] transition-colors mt-2">
                About & Disclaimer
              </Link>
            </motion.div>
          )}

          {screen === 'question' && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pt-10"
            >
              <div className="progress-wrap mb-8">
                <div className="progress-meta flex justify-between mb-2">
                  <span className="progress-section text-[9px] tracking-widest text-[var(--gold-d)] uppercase">{QUESTIONS[step].section}</span>
                  <span className="progress-count text-xs text-[var(--mist)]">{step + 1} / {QUESTIONS.length}</span>
                </div>
                <div className="progress-track h-[2px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                  <motion.div 
                    className="progress-fill h-full bg-gradient-to-r from-[var(--violet)] to-[var(--gold)]" 
                    animate={{ width: `${((step) / QUESTIONS.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="card">
                <p className="q-text text-2xl font-light leading-snug mb-2 font-cg">{QUESTIONS[step].q}</p>
                <p className="q-hint text-[11px] text-[var(--mist)] mb-6">{QUESTIONS[step].hint}</p>
                
                {QUESTIONS[step].type === 'single' ? (
                  <div className="opts flex flex-col gap-2">
                    {QUESTIONS[step].opts?.map(o => (
                      <div 
                        key={o.v} 
                        className={`opt ${answers[QUESTIONS[step].id] === o.v ? 'selected' : ''}`}
                        onClick={() => setAnswers({ ...answers, [QUESTIONS[step].id]: o.v })}
                      >
                        <div className="opt-dot" />
                        <div><div className="opt-lbl font-cg text-lg">{o.l}</div><div className="opt-sub text-[10px] text-[var(--mist)]">{o.s}</div></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="star-items flex flex-col gap-3">
                    {QUESTIONS[step].items?.map(it => (
                      <div key={it.v} className="star-row flex items-center justify-between p-3 glass">
                        <span className="font-cg">{it.l}</span>
                        <div className="stars flex gap-1">
                          {[1,2,3,4,5].map(n => (
                            <span 
                              key={n} 
                              className={`star cursor-pointer transition-opacity text-xl ${ (starRatings[QUESTIONS[step].id]?.[it.v] || 0) >= n ? 'opacity-100' : 'opacity-25'}`}
                              onClick={() => setStarRatings({
                                ...starRatings,
                                [QUESTIONS[step].id]: { ...(starRatings[QUESTIONS[step].id] || {}), [it.v]: n }
                              })}
                            >★</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="btn-row flex justify-between mt-10">
                <button className="btn btn-ghost" onClick={() => step > 0 ? setStep(s => s -1) : setScreen('welcome')}>
                  <span>← Back</span>
                </button>
                <button 
                  className="btn btn-primary" 
                  disabled={QUESTIONS[step].type === 'single' && !answers[QUESTIONS[step].id]}
                  onClick={handleNext}
                >
                  <span>{step === QUESTIONS.length - 1 ? 'Behold the Truth' : 'Continue →'}</span>
                </button>
              </div>
            </motion.div>
          )}

          {screen === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-20 text-center"
            >
              <div className="oracle-orb" />
              <p className="eyebrow mb-2">Oracle at Work</p>
              <p className="display text-4xl mb-4">Reading Your Soul</p>
              <p className="oracle-status text-[10px] tracking-widest text-[var(--gold-d)] uppercase">
                {loadingStatus}<span className="oracle-dots"><span>.</span><span>.</span><span>.</span></span>
              </p>
            </motion.div>
          )}

          {screen === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-10"
            >
              <div className="text-center mb-10">
                 <p className="eyebrow mb-2">Your Personality Profile</p>
                 <h2 className="display text-4xl">The Oracle Speaks</h2>
              </div>

              <div className="card mb-8">
                <p className="eyebrow mb-3">Core Strengths</p>
                <div className="strength-chips flex flex-wrap gap-2 mb-6">
                  {strengths.map(s => <span key={s} className="chip text-[10px] px-3 py-1 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)] text-[var(--gold-d)]">✦ {s}</span>)}
                </div>
                <p className="font-cg text-lg italic leading-relaxed text-[var(--star)] border-l border-[rgba(201,168,76,0.2)] pl-5">
                  {personalitySummary}
                </p>
              </div>

              <div className="orn w-full my-10"><div className="orn-l" /><span className="orn-c">RECOMMENDATIONS</span><div className="orn-r" /></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
                {careerRecs.map(c => (
                  <div 
                    key={c.title} 
                    className={`career-card relative ${selectedCareers.find(sc => sc.title === c.title) ? 'selected' : ''}`}
                    onClick={() => {
                      if (selectedCareers.find(sc => sc.title === c.title)) {
                        setSelectedCareers(selectedCareers.filter(sc => sc.title !== c.title));
                      } else {
                        if (selectedCareers.length < 2) {
                          setSelectedCareers([...selectedCareers, c]);
                        } else {
                          setSelectedCareers([selectedCareers[1], c]);
                        }
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                       <span className="text-3xl">{c.emoji}</span>
                       <span className="text-[10px] tracking-tighter text-[var(--gold-l)]">{c.match}% Match</span>
                    </div>
                    <div className="text-xl font-cg mb-1">{c.title}</div>
                    <div className="text-[9px] tracking-widest text-[var(--mist)] uppercase mb-3">{c.category}</div>
                    <p className="text-[11px] text-[rgba(240,234,255,0.7)] leading-relaxed mb-4 line-clamp-3">{c.reason}</p>
                    
                    {c.skills && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {c.skills.slice(0, 3).map((skill: string) => (
                          <span key={skill} className="text-[8px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(201,168,76,0.1)] text-[var(--mist)]">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="h-[2px] w-full bg-[rgba(255,255,255,0.06)] mt-2">
                       <div className="h-full bg-gradient-to-r from-[var(--violet)] to-[var(--gold)]" style={{ width: `${c.match}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {selectedCareers.length === 2 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-10 w-full overflow-hidden">
                   <div className="orn w-full my-6"><div className="orn-l" /><span className="orn-c">COMPARISON</span><div className="orn-r" /></div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedCareers.map((c, i) => (
                          <div key={i} className="glass flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                      <span className="text-2xl">{c.emoji}</span>
                                      <span className="font-cg text-xl">{c.title}</span>
                                  </div>
                                  <span className="text-[10px] text-[var(--gold-l)]">{c.match}% Match</span>
                              </div>
                              <div>
                                  <p className="text-[9px] text-[var(--gold-d)] uppercase tracking-widest mb-1">Why it fits</p>
                                  <p className="text-[11px] text-[rgba(240,234,255,0.7)] leading-relaxed">{c.reason}</p>
                              </div>
                              <div className="flex-1">
                                  <p className="text-[9px] text-[var(--gold-d)] uppercase tracking-widest mb-1">Key Skills</p>
                                  <div className="flex flex-wrap gap-1.5">
                                      {c.skills?.map((skill: string) => (
                                          <span key={skill} className="text-[9px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(201,168,76,0.1)] text-[var(--mist)]">
                                          {skill}
                                          </span>
                                      ))}
                                  </div>
                              </div>
                              <button className="btn btn-primary mt-4 w-full" onClick={() => startTest(c)}>
                                  <span>Test Readiness →</span>
                              </button>
                          </div>
                      ))}
                   </div>
                </motion.div>
              )}

              {selectedCareers.length === 1 && (
                  <div className="flex flex-col items-center gap-4 mt-8">
                      <p className="text-[11px] text-[var(--mist)] italic">Select a second career to compare</p>
                      <button className="btn btn-primary" onClick={() => startTest(selectedCareers[0])}>
                         <span>Test {selectedCareers[0].title} Readiness →</span>
                      </button>
                  </div>
              )}

              {selectedCareers.length === 0 && (
                  <div className="flex flex-col items-center gap-4 mt-8">
                      <p className="text-[11px] text-[var(--mist)] italic">Select up to two careers from the list above</p>
                  </div>
              )}
            </motion.div>
          )}

          {screen === 'test-intro' && (
            <motion.div
              key="test-intro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="pt-10 flex flex-col items-center"
            >
              <p className="eyebrow mb-2">Aptitude Assessment</p>
              <h2 className="display text-4xl text-center mb-8">Likability &<br /><em className="text-[var(--gold-l)]">Readiness Test</em></h2>
              
              <div className="card w-full text-center">
                 <div className="glass bg-[rgba(255,255,255,0.01)] py-8 mb-6">
                    <span className="text-5xl block mb-2">{selectedCareer?.emoji}</span>
                    <p className="eyebrow mb-1">Selected Path</p>
                    <p className="display text-3xl">{selectedCareer?.title}</p>
                 </div>
                 <p className="text-sm text-[rgba(240,234,255,0.6)] leading-relaxed mb-8">
                    The oracle has synthesized 5 specialized questions to probe your natural alignment with this profession. This covers logic, intuition, and domain judgment.
                 </p>
                 {testQuestions.length > 0 ? (
                    <button className="btn btn-primary w-full" onClick={() => setScreen('test-question')}>
                       <span>Enter the Trials ✦</span>
                    </button>
                 ) : (
                    <p className="oracle-status text-[10px] tracking-widest uppercase py-4">Crafting your trial questions...</p>
                 )}
              </div>
            </motion.div>
          )}

          {screen === 'test-question' && (
            <motion.div
              key="test-question"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="pt-10"
            >
              <div className="progress-wrap mb-8">
                <div className="progress-meta flex justify-between mb-2">
                   <span className="progress-section text-[9px] tracking-widest text-[var(--gold-d)] uppercase">Aptitude Trial</span>
                   <span className="progress-count text-xs text-[var(--mist)]">{testStep + 1} / {testQuestions.length}</span>
                </div>
                <div className="progress-track h-[2px] bg-[rgba(255,255,255,0.06)]">
                   <motion.div 
                     className="progress-fill h-full bg-gradient-to-r from-[var(--violet)] to-[var(--gold)]"
                     animate={{ width: `${(testStep / testQuestions.length) * 100}%` }}
                   />
                </div>
              </div>

              <div className="card mb-10">
                <p className="eyebrow text-[var(--gold-d)] mb-4 tracking-tighter">Trial {testStep + 1} OF 5</p>
                <p className="q-text text-2xl font-light font-cg mb-6">{testQuestions[testStep].q}</p>
                <div className="test-opts flex flex-col gap-2">
                  {testQuestions[testStep].opts.map((opt: string, i: number) => {
                    const selected = testQuestions[testStep].selectedIndex === i;
                    const correct = testQuestions[testStep].correct === i;
                    const revealed = testQuestions[testStep].selectedIndex !== undefined;
                    let cls = 'test-opt';
                    if (revealed) {
                        if (correct) cls += ' correct';
                        else if (selected) cls += ' wrong';
                        else cls += ' revealed';
                    }
                    return (
                      <div key={i} className={cls} onClick={() => !revealed && handleTestAnswer(i)}>
                         <span className="opt-letter mr-2 text-[var(--gold-d)]">0{i+1}</span>
                         {opt}
                      </div>
                    );
                  })}
                </div>

                {testQuestions[testStep].selectedIndex !== undefined && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }} 
                     animate={{ opacity: 1, height: 'auto' }} 
                     className="mt-6 p-4 glass bg-[rgba(61,191,168,0.05)] border-[rgba(61,191,168,0.2)]"
                   >
                      <p className="text-xs text-[var(--teal)] leading-relaxed">{testQuestions[testStep].explain}</p>
                   </motion.div>
                )}
              </div>

              <div className="btn-row flex justify-end">
                 <button 
                   className="btn btn-primary" 
                   disabled={testQuestions[testStep].selectedIndex === undefined}
                   onClick={nextTestStep}
                 >
                   <span>{testStep === 4 ? 'See Final Roadmap' : 'Next Trial →'}</span>
                 </button>
              </div>
            </motion.div>
          )}

          {screen === 'final' && (
            <motion.div
              key="final"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-10 flex flex-col w-full"
            >
              <div id="final-report-content" className="w-full bg-[var(--void)] p-4 sm:p-8 rounded-lg">
                <div className="text-center mb-10">
                   <p className="eyebrow mb-2">Your Cosmic Career Report</p>
                   <h2 className="display text-5xl">Your Path<br /><em className="text-[var(--gold-l)]">Revealed</em></h2>
                </div>

                <div className="card text-center mb-8 py-10">
                   <div className="relative w-40 h-40 mx-auto mb-8 flex items-center justify-center">
                      <svg className="absolute inset-0 -rotate-90 w-full h-full" width="160" height="160" viewBox="0 0 100 100">
                         <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                         <motion.circle 
                           cx="50" cy="50" r="45" fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round"
                           initial={{ strokeDasharray: "283 283", strokeDashoffset: 283 }}
                           animate={{ strokeDashoffset: 283 - (283 * (finalReport?.readiness || 0) / 100) }}
                           transition={{ duration: 1.5, ease: "easeOut" }}
                         />
                      </svg>
                      <div>
                         <div className="readiness-num text-4xl font-cg text-[var(--gold-l)]">{finalReport?.readiness}%</div>
                         <div className="readiness-label text-[9px] tracking-widest text-[var(--gold-d)] font-sans">READINESS</div>
                      </div>
                   </div>
                   <p className="eyebrow text-[var(--gold)] mb-4">{selectedCareer?.title}</p>
                   <p className="text-lg font-cg italic leading-relaxed text-[var(--star)] border-t border-[rgba(255,255,255,0.05)] pt-6 mt-2">
                      {finalReport?.verdict}
                   </p>
                </div>

                <div className="orn w-full my-8"><div className="orn-l" /><span className="orn-c">NEXT STEPS</span><div className="orn-r" /></div>
                
                <div className="steps-list flex flex-col gap-3 mb-10">
                  {finalReport?.next_steps?.map((s: string, i: number) => (
                    <div key={i} className="glass flex gap-4 items-start">
                       <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] flex items-center justify-center text-[10px] text-[var(--gold)]">0{i+1}</span>
                       <p className="text-sm text-[rgba(240,234,255,0.7)]">{s}</p>
                    </div>
                  ))}
                </div>

                <div className="card text-left bg-[rgba(201,168,76,0.05)] border-[rgba(201,168,76,0.1)] mb-10">
                   <p className="eyebrow mb-4">Improvement Areas</p>
                   <div className="flex flex-col gap-3">
                     {finalReport?.improvements?.map((imp: string, i: number) => (
                        <div key={i} className="flex gap-2 text-xs text-[var(--mist)]">
                          <span className="text-[var(--gold)]">✦</span> {imp}
                        </div>
                     ))}
                   </div>
                </div>

                <div className="glass border-dashed border-[rgba(201,168,76,0.3)] text-center py-10 mb-10">
                   <p className="eyebrow mb-2">Estimated Timeline</p>
                   <p className="display text-3xl text-[var(--gold-l)] mb-4">{finalReport?.timeline}</p>
                   <p className="text-sm text-[var(--mist)] italic max-w-sm mx-auto">{finalReport?.timeline_detail}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 mt-4">
                 <button className="btn btn-primary" onClick={handleDownload}>
                    <span>Download Report ↓</span>
                 </button>
                 <button className="text-[var(--gold-d)] tracking-[0.3em] uppercase text-[10px] hover:text-[var(--gold)] transition-colors" onClick={() => setScreen('welcome')}>
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
        <meta name="description" content="Discover how to find your career path with Career Oracle. The ultimate quiz and AI tool to find compatible jobs, explore career exploration for students, and help you find a career path that matches your interests." />
      </Helmet>
      <div className="seal relative w-16 h-16 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 border border-[rgba(201,168,76,0.3)] rounded-full" />
          <span className="text-xl text-[var(--gold)]">ℹ</span>
      </div>
      <h2 className="display text-4xl mb-6">About &<br /><em className="text-[var(--gold-l)]">Disclaimer</em></h2>
      
      <div className="card text-left mb-8 max-w-3xl">
        <h3 className="eyebrow mb-4">About Career Oracle</h3>
        <p className="text-sm text-[rgba(240,234,255,0.7)] leading-relaxed mb-6">
          Career Oracle blends psychological profiling with artificial intelligence to suggest potential career paths. By analyzing your decision-making styles, curiosities, and risk tolerance, it attempts to align your personality with real-world professions.
        </p>
        <div className="orn w-full my-6"><div className="orn-l" /><span className="orn-c">✦</span><div className="orn-r" /></div>
        <p className="eyebrow mb-4 text-[#e87b9a]">Disclaimer</p>
        <p className="text-sm text-[rgba(240,234,255,0.7)] leading-relaxed">
          This website and its career recommendations are generated by an AI model for entertainment and exploratory purposes. <strong>This tool is not 100% reliable</strong> and should not be used as the sole basis for major life decisions, academic choices, or professional direction. Always consult with human career counselors, mentors, and rely on your own judgment.
        </p>

        <div className="orn w-full my-6"><div className="orn-l" /><span className="orn-c">✦</span><div className="orn-r" /></div>
        
        <h1 className="text-xl text-[var(--gold-l)] mb-4 font-cg">The Ultimate Guide: How to Navigate Your Professional Future</h1>
        
        <div className="text-sm text-[rgba(240,234,255,0.7)] leading-relaxed space-y-4">
          <p>
            Are you constantly asking yourself, "what should i chose as a career?" or pondering "what am i good at?" Navigating the modern professional landscape can easily feel overwhelming. The pressure to make the perfect choice is immense. Whether you are a student starting fresh, a recent graduate entering the workforce, or a seasoned professional thinking, "i want to change my profession," the journey to discover your true calling starts with deep self-awareness. At Career Oracle, we are entirely dedicated to helping you answer the most pivotal question of your professional life: how to find your career path? Our comprehensive tools are designed specifically to illuminate your optimal professional trajectory and help you find my career path with total confidence.
          </p>
          
          <h2 className="text-base text-[var(--gold)] mt-6 mb-2">Understanding Strengths and Potential</h2>
          <p>
            Before jumping headfirst into saturated job markets, you must take the time to turn inward. To truly find compatible job for me, I first need to understand my brain capability and intrinsic talents. What I can do often differs drastically from what I actually enjoy doing on a daily basis. When you ask yourself, "how can i chose my job?", the fundamental answer lies in meticulously mapping out your core strengths, passions, and risk tolerance. Our intelligent system acts as a multifaceted test to find career path options that align perfectly with your unique cognitive and emotional footprint. It's not just about what you know theoretically; it's about uncovering exactly "what i can do to earn" a living while remaining genuinely fulfilled and driven. Evaluating my capabilities is the cornerstone of professional longevity.
          </p>

          <h2 className="text-base text-[var(--gold)] mt-6 mb-2">The Power of Digital Assessments</h2>
          <p>
            Countless individuals wonder, "how to find career path that matches my interests?" Traditional methods usually involve extensive trial and error, taking entry-level jobs just to test the waters. However, taking a structured quiz to find career path clarity can seamlessly condense years of exhausting soul-searching into a matter of minutes. Our AI-driven exploration tool carefully analyzes your responses to discover hidden patterns and inclinations you might have missed entirely. If you desperately need help find career path directions, this dynamic approach acts as your personal, highly objective compass. By accurately measuring my capabilities against real-world industry demands, we narrow down the confusing noise to present a focused, tailored, and highly actionable professional trajectory. Books to help find career path are great, but AI provides immediate personalization.
          </p>

          <h2 className="text-base text-[var(--gold)] mt-6 mb-2">Guidance for Everyone: From Teens to Career Changers</h2>
          <p>
            The quest to find a career path is universal. Parents frequently reach out to us asking, "how to help teen find career path?" The best advice is to encourage unpressured exploration, limit societal expectations, and utilize engaging tools that translate abstract adolescent interests into concrete, viable professional options. Beyond digital tools, continuous learning is essential. Whether you are a parent guiding a high schooler, or an adult realizing "what i can do" spans far beyond your current role, there are endless resources waiting to be leveraged. We act as a powerful career finder AI and career mapping tool free for all users.
          </p>

          <h2 className="text-base text-[var(--gold)] mt-6 mb-2">Taking the Final Step to Confidence</h2>
          <p>
            The journey to find your career path is rarely a perfectly straight line. Instead, it is a beautifully continuous process of discovering your evolving identity and adapting to entirely new opportunities. So, if you are currently stuck, deeply pondering how to find a career path that truly resonates with your inner self, remember that every great professional journey begins with a single, courageous step of self-discovery. Take control of your future, dive into our intuitive analysis, explore your personalized cosmic report, and finally step into your true potential.
          </p>
        </div>

        <div className="orn w-full my-6"><div className="orn-l" /><span className="orn-c">FAQ</span><div className="orn-r" /></div>
        
        <h3 className="text-xl text-[var(--gold-l)] mb-4 font-cg">Frequently Asked Questions</h3>
        
        <div className="text-sm text-[rgba(240,234,255,0.7)] leading-relaxed space-y-4">
          <h4 className="text-base text-[var(--gold)] mt-6 mb-2">What makes Career Oracle the best AI for career guidance?</h4>
          <p>
            Career Oracle uniquely blends advanced personality profiling with deep artificial intelligence insights, providing holistic recommendations rather than basic job title matching. It acts as an intuitive guide to align your core strengths with viable roles.
          </p>

          <h4 className="text-base text-[var(--gold)] mt-6 mb-2">Is there a best free AI for career guidance available?</h4>
          <p>
            Yes, our core platform operates as a versatile career mapping tool free of charge, allowing you to seamlessly uncover aligned professional avenues without needing an initial investment.
          </p>

          <h4 className="text-base text-[var(--gold)] mt-6 mb-2">How precise is your career prediction AI?</h4>
          <p>
            While our comprehensive models analyze vast amounts of data regarding psychological traits and modern job market trends, our career prediction AI should be used as an illuminating exploratory compass rather than an absolute, final verdict. always use your own judgment.
          </p>

          <h4 className="text-base text-[var(--gold)] mt-6 mb-2">How does a career finder AI actually work?</h4>
          <p>
            A career finder AI systematically evaluates your distinct preferences, stress responses, problem-solving methodologies, and natural affinities. It then meticulously cross-references this specific profile against thousands of contemporary industry roles to suggest the most harmonious professional matches.
          </p>
          
          <h4 className="text-base text-[var(--gold)] mt-6 mb-2">Is this tool suitable for career exploration for students?</h4>
          <p>
            Absolutely. High school and college individuals can effectively use this platform as a premier module for career exploration for students, laying a strong, fundamental foundation before prematurely committing to specific, rigid degrees or long-term training programs.
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
        <meta name="description" content="Privacy Policy for Career Oracle. Learn how we handle your data when you use our career prediction AI." />
      </Helmet>
      <h1 className="display text-4xl mb-6">Privacy Policy</h1>
      <div className="card text-left mb-8 max-w-3xl text-sm text-[rgba(240,234,255,0.7)] space-y-4">
        <p>Last updated: June 2026</p>
        <p>Your privacy is important to us. It is Career Oracle's policy to respect your privacy regarding any information we may collect from you across our website. We are committed to maintaining the confidentiality and security of our users' personal exploration data.</p>
        <h2 className="text-base text-[var(--gold)]">Information We Collect</h2>
        <p>We only ask for personal information when we truly need it to provide a service to you, namely, generating your unique career profile. We do not store your quiz answers or generated reports persistently unless you choose to download them.</p>
        <h2 className="text-base text-[var(--gold)]">Third-Party Services</h2>
        <p>Our career mapping tool free logic relies on the Gemini AI API to generate predictions. Your inputs are sent to the AI strictly to formulate your report and are governed by the respective AI platform's data policies.</p>
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
        <meta name="description" content="Terms of Service for Career Oracle. Read the conditions before exploring your career path." />
      </Helmet>
      <h1 className="display text-4xl mb-6">Terms of Service</h1>
      <div className="card text-left mb-8 max-w-3xl text-sm text-[rgba(240,234,255,0.7)] space-y-4">
        <p>By accessing our website, you agree to be bound by these terms of service and comply with all applicable laws.</p>
        <h2 className="text-base text-[var(--gold)]">Use License</h2>
        <p>Permission is granted to temporarily use our career finder AI and tools for personal, non-commercial transitory viewing only.</p>
        <h2 className="text-base text-[var(--gold)]">Disclaimer</h2>
        <p>The materials on Career Oracle's website are provided on an 'as is' basis. As stated in our About page, our career prediction AI is for entertainment purposes and is not 100% reliable. Do not make major life decisions solely based on the insights provided by this system.</p>
      </div>
      <Link to="/" className="btn btn-ghost">
        <span>← Back to Start</span>
      </Link>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<string>('English');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.3 + 0.2,
      a: Math.random(),
      sp: Math.random() * 0.003 + 0.001
    }));

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    let animationFrame: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      stars.forEach(s => {
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
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="relative min-h-screen z-10 w-full overflow-hidden flex flex-col items-center">
      <Helmet>
        <title>Career Oracle - How to find your career path</title>
        <meta name="description" content="Take this test to find career path and discover what you are good at. Find compatible jobs for you." />
      </Helmet>
      <canvas ref={canvasRef} data-html2canvas-ignore="true" className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-50 z-0" />
      
      <main className="flex-1 w-full flex flex-col items-center z-10 relative">
        <Routes>
          <Route path="/" element={<CareerOracleTool language={language} />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
        </Routes>
      </main>

      <footer className="w-full py-6 mt-8 z-20 text-center text-[10px] uppercase tracking-widest text-[#5c5c70] border-t border-[rgba(255,255,255,0.05)] bg-[rgba(6,6,16,0.8)] backdrop-blur px-6 flex flex-col md:flex-row items-center gap-4 justify-between" data-html2canvas-ignore="true">
        <div className="flex gap-4">
          <Link to="/" className="hover:text-[var(--gold)] transition-colors">Home</Link>
          <Link to="/about-us" className="hover:text-[var(--gold)] transition-colors">About Us</Link>
          <Link to="/privacy-policy" className="hover:text-[var(--gold)] transition-colors">Privacy</Link>
          <Link to="/terms-of-service" className="hover:text-[var(--gold)] transition-colors">Terms of Service</Link>
        </div>
        <div className="flex items-center gap-2">
          <span>Language:</span>
          <select 
            value={language} 
            onChange={e => setLanguage(e.target.value)}
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
