# ZenTrade — Knowledge Base Growth Roadmap (Phase 3)

> **Status: PARKED — start post-launch, feedback-driven.** The coach is functionally
> complete (RAG + playbook). KB growth is the *quality* loop, and it's far higher-signal when
> guided by real `coach_feedback` than done blind. This doc exists so we don't lose the plan.

---

## 0. When to start / trigger
Begin once there's real usage and a batch of `coach_feedback` rows. The 👎 rows + the
`question` text tell us exactly which concepts are missing or weak — that's the priority list.
Don't bulk-add 60 notes nobody asked for.

## 1. Goal
Grow the corpus from the current **~15 hand-written concepts → 40–80**, via a repeatable
pipeline (not hand-writing each note), while keeping retrieval quality high and staying $0.

## 2. The ingestion pipeline — `scripts/ingest-kb.ts`
Runnable via `tsx` (same pattern as `seed-kb.ts`). Stages:

1. **Source in** — a transcript / PDF / article / personal notes file. Store raw sources
   outside the repo (they may be copyrighted); only distilled output is committed/stored.
2. **Distillation pass (Groq)** — LLM rewrites the source into an ORIGINAL, paraphrased
   concept note: *definition → identification → high- vs low-probability → common mistakes →
   psychology link*. **Never store verbatim source text** (concepts aren't copyrightable;
   transcripts are). Target 200–500 words per note.
3. **Chunk** — ~300–500 tokens. Most concept notes are a single chunk; only long multi-idea
   sources get split.
4. **Embed** — reuse `lib/embeddings.ts` (`embed()`, gte-small, 384-dim). Same model as query
   time — the dimension invariant is non-negotiable (a mismatch silently corrupts search).
5. **Upsert** — into `knowledge_chunks` via `lib/supabase/admin.ts` (service role). Dedup on
   `(concept, version)`; bump `version` on re-ingest of an existing concept. Keep `source`
   internal-only.

## 3. Content plan (what to add, in priority order)
Prioritize by (a) `coach_feedback` misses, then (b) coverage of the app's tag taxonomy:
- **PD arrays / entry models** not yet covered: mitigation block, rejection block, propulsion
  block, vacuum block, inversion FVG, balanced price range, mean threshold.
- **Liquidity / structure**: internal vs external range liquidity, liquidity voids, equal
  highs/lows nuance, ERL↔IRL delivery.
- **Time / sessions**: macros (the :50–:10 windows), true day open, midnight open, weekly/daily
  templates, power of 3 (accumulation-manipulation-distribution).
- **Higher-timeframe framing**: dealing ranges, IPDA data ranges, seasonal tendencies.
- **Psychology** (pairs with the coach's core purpose): the specific leaks — boredom trading,
  results-orientation, loss aversion, moving stops — as retrievable notes.

Aim: ~10–15 well-chosen additions per iteration, reviewed by hand before trusting the pipeline
to scale.

## 4. Retrieval tuning
Once the corpus is larger, tune against a small eval set (~15 real questions from feedback):
- `DEFAULT_MATCH_COUNT` (currently 6) and `DEFAULT_MATCH_THRESHOLD` (0.5) in `lib/retrieval.ts`.
- Chunk size.
- Watch for over-retrieval (noise) as the corpus grows — a bigger corpus may want a *higher*
  threshold. Record chosen values back in `lib/retrieval.ts`.

## 5. Quality guardrails
- **Hand-review the first ~15 distilled notes** before trusting the pipeline — one bad
  distillation pollutes every answer that retrieves it.
- **IP safety**: paraphrase only, never store verbatim transcripts; `source` stays internal.
- **Dimension assert**: `embed()` already throws on ≠384 — keep it.
- If retrieval quality plateaus, the escape hatch is OpenAI `text-embedding-3-small` (1536-dim)
  behind `lib/embeddings.ts` — but that's a paid upgrade + a full re-embed (column dim change).

## 6. Ops
- Run: `tsx --env-file=.env.local scripts/ingest-kb.ts <source-path>` (needs
  `SUPABASE_SERVICE_ROLE_KEY` + `GROQ_API_KEY`).
- Idempotent via `(concept, version)`.
- Verify after each run: `select concept, category, array_length(embedding::real[],1) from
  knowledge_chunks order by concept;` — all dims = 384.

## 7. Definition of done (per iteration)
- New concepts embedded and retrievable.
- The feedback questions that motivated them now return grounded, correct answers.
- No regression in retrieval for existing concepts (spot-check a few).
