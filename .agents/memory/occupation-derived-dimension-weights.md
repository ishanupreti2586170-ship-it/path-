---
name: Deriving per-occupation dimension weights from existing profile data
description: Pattern for scoring against many entities (e.g. occupations) using a shared tagged item bank, without hand-authoring content per entity.
---

When a feature needs entity-specific scoring (e.g. "profession-specific aptitude test") across a large set of entities (40+ occupations), avoid hand-authoring unique content per entity.

Instead: define a small set of reusable, tagged dimensions and a shared item bank tagged by dimension. Then compute each entity's relevant dimensions and their weights as a deterministic function of data *already curated on that entity* (e.g. an occupation's existing RIASEC/Big Five/risk/style fields), rather than manually mapping dimensions per entity.

**Why:** This keeps the system scalable (new entities automatically get a sensible test/weighting without extra authoring) and keeps everything deterministic/reproducible, consistent with a "no AI in scoring" architectural constraint.

**How to apply:** When asked to add profession/entity-specific scored content, first check whether the entity data model already has fields that can be projected into the new dimension space via a fixed formula, before creating new per-entity mapping tables.
