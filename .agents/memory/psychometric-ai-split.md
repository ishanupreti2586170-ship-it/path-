---
name: Deterministic scoring vs AI generation split
description: Architectural pattern for apps mixing validated scoring/matching with generative AI suggestions
---

When a feature combines a "scientific"/validated scoring or matching step (e.g. psychometric assessments, rules-based recommendations) with AI-generated content, keep the two strictly separated:

- Scoring, trait computation, and matching/ranking should be plain deterministic math (same input always produces same output), with no AI calls involved. This keeps results auditable, reproducible, and trustworthy.
- AI should only be invoked for genuinely open-ended, generative sub-tasks downstream of the deterministic result (e.g. suggesting books/topics/resources once a match is already computed) — never for the scoring/ranking itself.

**Why:** Users (and reviewers) distrust "AI decided your result" for anything framed as scientific/validated; mixing AI into the scoring step undermines credibility and reproducibility. Framing results as "a snapshot, not a fixed verdict" is also important messaging when traits/interests are known to evolve over time — this should appear both on the landing/marketing page and within the app's report screens.

**How to apply:** When building assessment/matching features, structure code so scoring+matching live in pure functions with no network/AI calls, and gate any AI usage behind a separate, clearly-labeled step that only fires after the deterministic result exists. Add a UI fallback (not a hard failure) if the AI call errors, since the deterministic result should remain fully usable regardless of AI availability (e.g. missing API key).
