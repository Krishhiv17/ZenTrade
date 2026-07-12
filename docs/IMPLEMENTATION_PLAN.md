# ZenTrade — Coach Intelligence Upgrade: Implementation Plan

> **Source of truth for the goal:** [`docs/UPDATED_PRODUCT.md`](./UPDATED_PRODUCT.md).
> **This document** is the concrete, file-level build plan to get there.
>
> **Scope:** upgrade the AI coach from a generic read-only chatbot into a domain expert that
> (1) understands ICT/SMC via a curated knowledge base + retrieval (RAG), and (2) understands
> each user's own model via a **playbook**. No rewrite of logging/schema/guard/EOD/analytics.
> **Must stay $0.**
>
> **Note:** this supersedes `docs/STRATEGY.md` (the paid-SaaS/Stripe plan) as the active
> roadmap. That monetization work is parked, not deleted.

---

## 0. Verified codebase facts (ground truth for this build)

| Claim in UPDATED_PRODUCT.md | Reality in repo | Impact |
|---|---|---|
| Next.js 14 | **Next.js 16 / React 19** (`package.json`) | none — patterns identical |
| Supabase | **Cloud** project (`…supabase.co`) | pgvector + Edge Functions available → $0 embeddings viable |
| "custom-tags table backing TagMultiSelect" | `user_custom_tags` (migration 005–007), categories: `market_condition, entry_model, psychology, pd_array, entry_confluence, dol, mistake` | playbook pre-fill can read this directly |
| Coach route streams Groq | `app/api/coach/route.ts` — fetch account + last 30 trades → system prompt → `ReadableStream` | we **insert** retrieval+playbook before the Groq call; transport untouched |
| Groq model | `llama-3.3-70b-versatile` (`lib/groq.ts`) | verify current-best at build; keep behind the constant |
| — | **No service-role Supabase client wrapper exists** | add `lib/supabase/admin.ts` for KB ingestion |
| — | **ChatWindow renders plain text only** (no markdown lib) | Feature 3 citations need a light renderer |
| — | Coach page passes only `active` accounts to ChatWindow | unchanged |

**Env vars present:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `NEXT_PUBLIC_APP_URL`. No new keys needed for
the $0 (gte-small) path.

---

## 1. Key decisions (locked for this plan; change deliberately)

1. **Embeddings = `gte-small` (384-dim) via a Supabase Edge Function.** Keeps compute off
   Vercel, stays $0, and dimension stays small/fast. Everything hides behind `lib/embeddings.ts`.
   - Trade-off: switching to OpenAI `text-embedding-3-small` later means 384→1536, which
     changes the `embedding` column type, the HNSW index, the `match_knowledge` signature,
     **and requires re-embedding the whole corpus.** Commit to 384 now; only revisit if
     retrieval quality is provably insufficient.
2. **Distillation model = the Groq chat model** (`COACH_MODEL`). One model, one key.
3. **Retrieval defaults:** `match_count = 5`, `match_threshold = 0.5`, chunk ≈ 300–500 tokens.
   Treat as tunables; expect iteration in Phase 3.
4. **Citations:** render as a compact "Concepts referenced" footer under each answer, driven
   by the chunks we retrieved (deterministic — not parsed out of the LLM text). Avoids adding
   a markdown dependency and avoids trusting the model to cite correctly.

---

## 2. Architecture of the change

```
                        ┌─────────────────────────────────────────────┐
POST /api/coach         │  (unchanged) auth + fetch account+30 trades  │
  { question, ... }     │                                              │
        │               │  NEW:  embed(question) ─────► Supabase Edge  │  gte-small (384)
        ▼               │        matchKnowledge() ───► match_knowledge RPC (pgvector, HNSW)
   buildCoachPrompt() ◄─┤        getPlaybook(userId) ─► playbooks (RLS) │
        │               │                                              │
        ▼               │  (unchanged) Groq stream ──► ReadableStream ─┼──► ChatWindow
   system prompt =      └─────────────────────────────────────────────┘
     persona + playbook + retrieved concepts + trade/account data + history
```

No new backend service. Ingestion is a standalone `tsx` script. Retrieval is a Postgres RPC.

---

## 3. Phase 1 — RAG foundation

**Goal:** coach retrieves ICT/SMC concept notes at question time and grounds answers in them.

### 3.1 Migration — `supabase/migrations/013_knowledge_base.sql`
- `create extension if not exists vector;`
- `knowledge_chunks` table exactly per UPDATED_PRODUCT.md §7.2 (`embedding vector(384)`).
- HNSW index: `create index on knowledge_chunks using hnsw (embedding vector_cosine_ops);`
- **RLS:** enable RLS; add a `SELECT` policy `to authenticated using (true)` (shared read
  corpus); **no** insert/update/delete policy → writes only via service role, which bypasses RLS.
- `match_knowledge(query_embedding vector(384), match_threshold float, match_count int)`
  RPC exactly per §7.2, `language sql stable`.

### 3.2 Embedding Edge Function — `supabase/functions/embed/index.ts`
- Uses Supabase's built-in `Supabase.ai.Session('gte-small')` to return a 384-dim vector.
- Auth: require the anon/JWT so only signed-in app traffic can call it.
- Deployed via `supabase functions deploy embed`. Document this in the runbook (§7).

### 3.3 New library code
- **`lib/supabase/admin.ts`** — service-role client (`createClient(url, SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })`). **Server-only**; never imported by client components.
- **`lib/embeddings.ts`** — `export async function embed(text: string): Promise<number[]>`.
  Calls the `embed` Edge Function. Single provider seam (the doc's key requirement).
- **`lib/retrieval.ts`** — `matchKnowledge(question, k = 5, threshold = 0.5)`:
  `embed(question)` → `supabase.rpc('match_knowledge', …)` → `KnowledgeChunk[]`.
- **`lib/prompt/coach-prompt.ts`** — `buildCoachSystemPrompt({ account, trades, aggregates,
  playbook, concepts })`. Move the existing Douglas/Tendler persona + trade-context assembly
  here **verbatim first** (pure refactor, no behavior change), then layer in a
  `## RETRIEVED CONCEPTS` section and (Phase 2) a `## USER PLAYBOOK` section. Instruct the
  model: *ground every ICT/SMC claim in the retrieved concepts; if a concept isn't retrieved,
  say so rather than inventing.*

### 3.4 Modify `app/api/coach/route.ts` (surgical, per §7.4)
Before the existing Groq call, insert:
1. `const concepts = await matchKnowledge(question)`
2. `const playbook = await getPlaybook(user.id)` *(Phase 2; pass `null` until then)*
3. `const systemPrompt = buildCoachSystemPrompt({ …existing data…, concepts, playbook })`
Keep: trade fetch, `history` handling, Groq streaming, `ReadableStream` transport, response
headers. **Return the retrieved concept list to the client** for citation rendering — either
as a leading JSON metadata line the client strips, or a second small endpoint. Recommended:
prepend a single `\n`-terminated JSON header line (`{"concepts":[…]}`) before the stream and
have ChatWindow parse the first line. (Keeps one round-trip; minor ChatWindow change.)

### 3.5 Seed data (content, not code)
Hand-write **10–15** concept notes (paraphrased, 200–500 words, IP-safe) covering the
highest-use tags: FVG, Order Block, Breaker, Liquidity (BSL/SSL), SMT divergence, Killzones
(London/NY AM), PD Arrays, DOL/Draw on Liquidity, Displacement, Optimal Trade Entry, Judas
Swing, Turtle Soup, MSS/BOS, Premium/Discount. Store as `scripts/seed/concepts/*.md` with
frontmatter (`concept`, `category`), embed + upsert via the Phase 3 ingestion script (or a
tiny one-off seeder to unblock testing before the full pipeline exists).

### 3.6 Phase 1 acceptance
- "What's an FVG and are mine any good?" → correct FVG explanation **from the KB** + reference
  to the user's actual FVG-tagged trades.
- Retrieved chunks are visibly on-topic for the question's concept category.
- No regression in streaming latency/UX (measure coach first-token time before/after).

---

## 4. Phase 2 — User Playbook

**Goal:** each user defines their model once; it's injected into every coach call so the coach
measures trades against the user's *own* rules.

### 4.1 Migration — `supabase/migrations/014_playbooks.sql`
`playbooks` table per §8.2 (`setups jsonb`, `killzones jsonb`, `instruments text[]`,
`risk_rules jsonb`, `personal_rules text[]`, `goals jsonb`, `user_id` FK, `updated_at`).
**RLS owner-only** (`auth.uid() = user_id` for ALL). One row per user (unique `user_id`).

### 4.2 New code
- **`actions/playbook.ts`** — `getPlaybook(userId)` (returns null if none),
  `upsertPlaybook(formData | typed input)`. Follow the existing action conventions
  (`getUser()` guard, `revalidatePath`).
- **`app/(app)/playbook/page.tsx`** — "My Model" server page: loads playbook + tag history.
- **`components/playbook/PlaybookForm.tsx`** — client form matching existing form styling
  (inline styles + CSS vars). Sections: Setups (repeatable: name / entry_rules /
  required_confluences / invalidation / target_logic), Killzones, Instruments, Risk Rules,
  Personal Rules, Goals.
- **Sidebar nav:** add `{ href: '/playbook', label: 'My Model', icon: <Target/BookMarked> }`
  to `navItems` in `components/layout/Sidebar.tsx` (between Journal and Analytics).
- **Prompt injection:** `coach-prompt.ts` gains a `## USER PLAYBOOK` section; route passes the
  real playbook now.

### 4.3 Nice-to-have (§8.4)
Pre-fill setup suggestions from logged tags: read `user_custom_tags` + aggregate
`entry_tags/pd_arrays/entry_confluences` frequency across the user's trades, offer "Save as
setup" chips. Ship the manual editor first; add inference second.

### 4.4 Phase 2 acceptance
- User can define/edit setups, killzones, risk rules, personal rules, goals; persists under RLS.
- Coach correctly flags a logged trade that violates a user-stated rule
  ("off-playbook: your setup requires HTF bias confluence, absent here").

---

## 5. Phase 3 — KB scale-up (ingestion pipeline)

**Goal:** grow the corpus to 40–80 concepts via a repeatable pipeline; tune retrieval.

### 5.1 `scripts/ingest-kb.ts` (runnable via `tsx`)
Pipeline: source file (transcript/PDF/notes) → **Groq distillation pass** (paraphrase into a
clean concept note: definition, identification, common mistakes, psychology link — **never
store verbatim source**) → chunk (~300–500 tokens) → `embed()` → **upsert** into
`knowledge_chunks` (dedupe by `concept` + `version`; bump `version` on re-ingest). Uses
`lib/supabase/admin.ts` (service role) + `lib/embeddings.ts`.

### 5.2 Content curation
Expand from 15 → 40–80 concepts. IP rule: **paraphrase only**; concepts aren't copyrightable,
verbatim transcripts are. Keep `source` internal-only.

### 5.3 Tuning
Iterate `match_count`, `match_threshold`, chunk size against a small eval set of ~15 real
questions. Record chosen values back in `lib/retrieval.ts` defaults.

---

## 6. Phase 4 — Coach UX polish (§9)

- **Smarter suggested chips:** playbook/tag-aware, generated from the user's setups/killzones
  (e.g. "Was my last NQ entry a valid *[setup name]* setup?", "Am I trading outside my
  killzones?"). Replace the static `SUGGESTED_CHIPS` in `ChatWindow.tsx` with props derived
  from playbook + recent tags.
- **"Ask coach about this trade":** button on trade rows (`components/trades/TradeTable.tsx`)
  → navigates to `/coach?trade=<id>`; coach page seeds the thread with that trade's full
  context (tags, notes, guard flags). Route handler accepts an optional `tradeId` to prepend
  focused trade context.
- **Citation rendering:** the "Concepts referenced" footer under answers, from the concept
  metadata returned in §3.4. Light custom component; no markdown dependency.
- Streaming transport unchanged throughout.

---

## 7. Runbook / operational notes

- **Deploy the edge function:** `supabase functions deploy embed` (once; re-deploy on change).
- **Seed/ingest:** `tsx scripts/ingest-kb.ts <path>` — requires `SUPABASE_SERVICE_ROLE_KEY`
  and `GROQ_API_KEY` in the shell env.
- **Dimension invariant:** ingestion and query-time embedding **must** use the same model/dims
  (384). A mismatch silently returns garbage similarities — assert dim === 384 in `embed()`.
- **Secrets:** `lib/supabase/admin.ts` and `lib/embeddings.ts` are server-only; never import
  from a `'use client'` file. Add an ESLint boundary if convenient.
- **Verify Groq model** currency at build time; if `llama-3.3-70b-versatile` is deprecated,
  update `COACH_MODEL` only.

---

## 8. Build order & first sprint

Matches UPDATED_PRODUCT.md §12, refined:

1. **Sprint 1 (RAG loop end-to-end, thin):** migration 013 + edge function + `admin.ts` +
   `embeddings.ts` + `retrieval.ts` + a tiny seeder for ~12 concepts + refactor prompt into
   `coach-prompt.ts` (no behavior change) → wire retrieval into `/api/coach` → prove §3.6
   acceptance. *This is the highest-risk unknown (embeddings path); de-risk it first.*
2. **Sprint 2:** Playbook (migration 014, action, page, form, nav, prompt injection) → §4.4.
3. **Sprint 3:** full `ingest-kb.ts`, grow corpus, tune retrieval.
4. **Sprint 4:** UX polish (chips, per-trade ask, citations).

**Parallel design track (see §10):** run the *design foundation* (Phase D0: tokens +
primitives) alongside Sprint 1, and **land it before the new Playbook UI (Sprint 2) and coach
citations (Sprint 4)** so those surfaces are built in the new system, not retrofitted. The
backend (RAG) and design tracks touch different files and don't conflict.

---

## 9. Risks & open items

- **Embedding latency** adds a hop (Vercel → Supabase edge → back) before Groq. Expected
  ~100–300ms; acceptable, but measure. Mitigation if needed: skip retrieval for obviously
  data-only questions ("what's my win rate?").
- **Retrieval quality at 384 dims** may be marginal for nuanced ICT distinctions. Accept for
  v1; the OpenAI 1536 upgrade is the escape hatch (behind `embeddings.ts`, but costs a re-embed).
- **Distillation quality/IP:** review the first ~15 distilled notes by hand before trusting the
  pipeline to scale; a bad distillation pollutes every answer that retrieves it.
- **Confirm at build time (UPDATED_PRODUCT.md §13):** current-best Groq model; the exact
  `Supabase.ai` gte-small API surface in the deployed runtime; final K/threshold/chunk values.

---

## 10. UI/UX revamp — design direction & phasing

> **Decision (2026-07-11):** yes to a revamp. Direction = **"Quiet Precision"** — a refined
> minimalist dark system, **not** full glassmorphism. Glass is used *surgically* on floating
> layers only. Rationale below. Runs as a parallel track to the RAG work (see §8).

### 10.1 Why not full glassmorphism
This is a data-dense financial tool (P&L, tabular figures, many Recharts SVGs). Blur +
translucency as the *primary* language actively harms it:
- **Legibility/contrast:** translucent surfaces over busy backgrounds fail WCAG on small
  numeric text — the opposite of what a risk tool needs.
- **Performance:** `backdrop-filter` is GPU-expensive; stacking it under analytics charts
  causes jank, worst on the dashboard.
- **Trust/longevity:** money software should read like an instrument, not a consumer toy;
  heavy glass dates quickly.

### 10.2 The direction: "Quiet Precision"
Minimalist dark foundation in the Linear / Vercel / Raycast lineage — calm, high-contrast,
precise — with **glass as a spatial cue on floating layers ONLY**: modals, dropdowns/selects,
the sidebar rail, a sticky topbar, and a future command palette. (6 modals already use
`backdrop-filter`; this *formalizes* a half-existing language rather than inventing one.)
**Data surfaces — cards, tables, charts — stay solid and opaque.**

Pillars:
- **Token consolidation.** Fix the drift first: **`--bg-card` is referenced by 7 components
  (incl. `ChatWindow`) but is undefined in `globals.css`** → those surfaces fall back to
  transparent. Define one coherent elevation scale (`--bg-base → surface → elevated → overlay`),
  map `--bg-card` correctly, and a disciplined semantic palette (P&L green/red, one accent).
- **Numeric legibility.** `font-variant-numeric: tabular-nums` on every money/stat figure;
  tighten the type scale and spacing rhythm.
- **Depth without blur on data.** Layered opaque surfaces + soft 1px borders + minimal
  shadows for elevation; glass reserved for overlays per above.
- **Primitives.** Introduce `Card`, `Stat`, `Badge`, `Button`, `Meter`, `Modal`, `Sheet` to
  retire ad-hoc `style={{…}}` blocks incrementally.
- **Motion.** 150–200ms ease-out on state changes only; honor `prefers-reduced-motion`.
- **Charts.** Re-theme via the **dataviz** skill so light/dark + P&L color semantics are
  consistent across every Recharts surface.

### 10.3 Phasing
- **Phase D0 — Foundation (do first, parallel to Sprint 1).** Consolidate tokens + fix
  `--bg-card`; define elevation/type/spacing scales; build the core primitives + a glass
  `Modal`/`Sheet`/`Dropdown` overlay style. *No mass page rewrite yet.* New surfaces
  (Playbook, coach citations) are built on these from birth.
- **Phase D1 — High-traffic pages.** Migrate Dashboard, Journal (`/trades`), and Coach to the
  primitives; re-theme charts. These are seen most; biggest perceived-quality lift.
- **Phase D2 — Remaining surfaces.** Analytics, Accounts, Settings, News, auth pages, landing.
  Opportunistic ("touch it → upgrade it") rather than big-bang.
- **Phase D3 — Delight.** Command palette (⌘K), refined empty/loading/skeleton states,
  micro-interactions, polished AI Guard/alert surfaces.

### 10.4 Acceptance
- Single source of truth for tokens; zero references to undefined CSS vars.
- All financial figures use tabular numerals; contrast passes WCAG AA on data surfaces.
- Glass appears only on floating layers; no `backdrop-filter` under charts/tables.
- New Playbook + citation UI ship already in the new system (no retrofit).

### 10.5 Risks
- **Scope creep** — the revamp can swallow the RAG work. Guardrail: D0 is the only *blocking*
  design phase; D1–D3 are incremental and must never delay a functional sprint.
- **Chart re-theming churn** — many Recharts components; batch via shared theme config, not
  per-file edits.
