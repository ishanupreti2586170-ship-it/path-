import { Link } from "react-router-dom";
import { motion } from "motion/react";

export function LandingPage() {
  return (
    <div className="w-full max-w-[900px] px-6 mx-auto pt-20 pb-32 text-center text-[var(--star)] relative z-10" style={{fontFamily: "'DM Mono', monospace"}}>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <p className="eyebrow mb-4 tracking-[0.4em] text-[10px]">Welcome to the Beyond</p>
        <h1 className="display text-6xl leading-[1.1] mb-8 font-light max-w-2xl mx-auto">
          The <em className="text-[var(--gold-l)]">Career</em> Oracle
        </h1>
        <p className="text-sm md:text-base leading-relaxed text-[var(--mist)] max-w-2xl mx-auto mb-12">
          Step into a realm of deep psychological discovery. The Career Oracle does not simply ask what you want to be; it reveals who you already are. Through profound pattern recognition, risk analysis, and cognitive profiling, we chart your true path.
        </p>
        
        <Link to="/app">
          <button className="btn btn-primary text-[12px] px-8 py-4 mb-24">
            <span>Enter The Oracle ✦</span>
          </button>
        </Link>
      </motion.div>

      <div className="orn w-full max-w-sm mx-auto mb-24">
        <div className="orn-l" />
        <span className="orn-c text-2xl">◎</span>
        <div className="orn-r" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="text-left leading-relaxed text-[var(--star)] max-w-3xl mx-auto space-y-8 font-cg text-lg md:text-xl"
      >
        <h2 className="display text-4xl mb-6 text-center text-[var(--gold)]">The Epistemology of Vocation</h2>
        <p>
          In the modern era, the concept of a career has been reduced to a mere transaction—an exchange of hours for capital, bound by the arbitrary rigidities of corporate structures. But it was not always so. In antiquity, vocation was synonymous with a calling; it was an alignment of the soul’s inherent architecture with the needs of the physical world. The Career Oracle was forged to resurrect this classical understanding, utilizing advanced psychological profiling and deep-learning algorithms to pierce the veil of societal conditioning and reveal your true professional nature.
        </p>

        <p>
          You are not a blank slate waiting to be etched by the demands of the labor market. You are a highly complex, deeply textured psychological entity with intrinsic biases, cognitive preferences, risk thresholds, and innate structural leanings. Some minds are architectural; they thrive on building systems from nothing. Other minds are fluid and empathetic; they are designed to navigate the chaotic waters of human interaction. Some people seek the thrill of asymmetric risk, while others require the solid bedrock of certainty to truly flourish. Too often, we suppress these natural inclinations in favor of what is expected, safe, or immediately lucrative. The result is a profound friction—a lingering sense of misalignment that permeates every waking hour.
        </p>

        <p>
          The Career Oracle rejects standard aptitude tests. A standard test asks you if you like working with numbers or people. A standard test assumes you know yourself. But human beings are notoriously poor at self-assessment. We report our idealized selves rather than our actual behaviors. To bypass this, the Oracle employs lateral cognitive inquiries—puzzles, indirect scenarios, and instinctual stress tests that measure your immediate, uncalculated responses to complex stimuli. By observing how you approach a sequence of numbers, how you prioritize a sinking ship, or how you conceptualize the structure of an unknown city, the Oracle bypasses your conscious filters and analyzes the raw machinery of your cognition. 
        </p>

        <h3 className="display text-3xl mt-12 mb-6 text-center text-[var(--gold)]">The Mathematics of the Soul</h3>
        
        <p>
          This platform operates at the intersection of deep psychology and computational intelligence. Behind the veiled aesthetics lies a massive network of relational data, connecting thousands of distinct professional profiles to specific psychological blueprints. When you interact with the Oracle, it is not simply matching your answers to a static database. It is dynamically synthesizing a multidimensional vector of your personality. It measures your preference for chaotic versus structured environments, your natural orientation toward time (immediate versus delayed gratification), and your inherent threshold for ambiguity. 
        </p>

        <p>
          Consider the nature of ambiguity. In software engineering or data science, ambiguity is an enemy to be eliminated through precise logic and testing. In entrepreneurship or creative direction, ambiguity is the raw material from which value is extracted. A standard career counsel might look at a highly intelligent individual and suggest they become an actuary because they are good at mathematics. The Oracle looks deeper. It asks: does this individual possess the psychological resilience to make probabilistic bets in the absence of complete information? If so, they are not an actuary; they are a venture capitalist or a startup founder. 
        </p>

        <p>
          Every role in the modern economy possesses a dominant psychological frequency. The tragedy of the modern worker is finding themselves tuned to the wrong frequency. An analytical thinker locked in a high-empathy role will experience burnout rapidly, not because they are weak, but because they are constantly working against their own neurological grain. Conversely, a highly intuitive individual placed in a strictly procedural environment will wither, their natural strengths rendered useless by bureaucratic constraints. The Career Oracle maps these frequencies. By understanding the core resonance of your mind, it suggests not just a job, but an entire mode of existence where your natural tendencies become unfair advantages.
        </p>

        <h3 className="display text-3xl mt-12 mb-6 text-center text-[var(--gold)]">The Journey Through the Twelve Gates</h3>
        
        <p>
          To discover this truth, you must pass through the Twelve Gates. These are not simple multiple-choice queries designed to gauge your interest in specific industries. They are carefully calibrated scenarios designed to elicit authentic, instinctual responses. The Gates are divided into four primary domains of inquiry: Pattern Recognition, Epistemological Stance, Conceptual Mapping, and Risk Architecture. 
        </p>

        <p>
          In Pattern Recognition, we observe not just if you see the underlying logic of a scenario, but how quickly you trust your perception of it. Do you require exhaustively verified data before acting, or do you move intuitively based on a partial picture? Both approaches have immense value, but they lead to radically different professional destinies. 
        </p>

        <p>
          Your Epistemological Stance reveals how you process reality. When confronted with a dense philosophical concept or a complex mechanical system, what is your initial emotional reaction? Is it curiosity, frustration, or a desire to immediately break it down into actionable parts? This tells the Oracle whether you are fundamentally a theorist, a builder, or an operator.
        </p>

        <p>
          Conceptual Mapping explores how you organize information. When given a chaotic set of variables, do you naturally look for the human element, structural hierarchies, or narrative arcs? This determines whether your future lies in managing people, designing systems, or shaping culture. 
        </p>

        <p>
          Finally, Risk Architecture defines your relationship with failure and return. The world praises the risk-taker, but reckless risk destroys capital and mental health equally. The Oracle distinguishes between calculated, asymmetric risk-takers who belong in high-stakes environments, and those who require the stability of structured advancement to do their best work. There is nobility in both paths, provided you know which one you are walking.
        </p>

        <h3 className="display text-3xl mt-12 mb-6 text-center text-[var(--gold)]">The Illusion of Passion vs. The Reality of Competence</h3>

        <p>
          A pervasive myth in modern career counseling is the directive to "follow your passion." This advice, though well-intentioned, is often destructively misleading. Passions are transient emotional states; they ebb and flow with circumstances, energy levels, and external validation. If you build a career solely upon the fragile foundation of current enthusiasm, you risk profound disillusionment when the necessary drudgery of mastery sets in. The Oracle operates on a different, more durable principle: the intersection of intrinsic competence and deep psychological alignment.
        </p>

        <p>
          When you align what you are fundamentally built to do with an environment that rewards those exact traits, "passion" becomes a byproduct of competence and flow. Consider the craftsman who loses themselves in the minutiae of shaping wood, or the data scientist who experiences a rush of adrenaline when a complex model finally converges. This is not the fleeting passion of a hobbyist; it is the deep, sustaining engagement of a soul operating exactly as it was designed. The difference between struggling to find motivation and experiencing effortless momentum lies in this alignment. The Career Oracle does not attempt to locate your passion. It attempts to locate your zone of genius—the specific cognitive arena where your natural way of thinking is not a compensatory mechanism, but a distinct, undeniable advantage.
        </p>

        <p>
          Furthermore, true fulfillment requires mastery, and mastery requires enduring the plateau—those long stretches of time where effort is expended without visible progress. Only those whose neurological wiring makes the process itself tolerable, or even enjoyable, will survive the plateau. A person with a high need for novelty will abandon a process that requires decade-long repetition, regardless of how much they initially cared about the outcome. A person who requires immediate tactile feedback will struggle in roles characterized by long feedback loops, such as academic research or long-term strategic planning. By identifying these critical parameters, the Oracle protects you from pursuing paths where you are statistically likely to burn out before achieving mastery.
        </p>

        <h3 className="display text-3xl mt-12 mb-6 text-center text-[var(--gold)]">The Final Synthesis</h3>
        
        <p>
          Upon completing the Twelve Gates, the system does not abandon you with a simple generated result. It subjects your findings to a rigorous secondary analysis, generating what we call the Spiritual Roadmap. This is a highly specific, actionable blueprint. It will articulate exactly why certain paths resonate with your cognitive architecture. It will identify your core strengths—not vague platitudes like "you are a hard worker," but precise psychological advantages such as "you possess a high tolerance for cognitive dissonance allowing you to hold contradictory ideas simultaneously."
        </p>

        <p>
          You will then be presented with a selection of profound professional trajectories. You will select two that call out to you, and the Oracle will force a synthetic comparison, highlighting the exact trade-offs, required skills, and psychological demands of each. Finally, it will subject you to a targeted Aptitude Trial—a final stress test designed to gauge your immediate readiness for your chosen path. 
        </p>

        <p>
          This represents a total paradigm shift in how we approach our professional lives. No longer must you wander blindly through the labor market, hoping to stumble upon a role that fits. By participating in this deep exploration of your own mind, you seize control of your destiny. You step out of the shadows of confusion and into the brilliant clarity of self-knowledge. The Oracle awaits. Are you prepared to discover who you truly are?
        </p>
      </motion.div>

      <div className="orn w-full max-w-sm mx-auto mt-24 mb-16">
        <div className="orn-l" />
        <span className="orn-c text-2xl">◎</span>
        <div className="orn-r" />
      </div>

      <Link to="/app">
        <button className="btn btn-primary text-[14px] px-10 py-5">
          <span>Begin The Assessment ✦</span>
        </button>
      </Link>

    </div>
  );
}
