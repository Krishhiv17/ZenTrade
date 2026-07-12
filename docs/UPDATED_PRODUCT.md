# ZenTrade — Product Details & Build Context

> **Purpose of this document:** full context on what ZenTrade is, what already exists, and what we're adding — written to be handed to an AI coding agent (Claude Code) so it can produce a concrete implementation plan. Read the "Current state" sections as ground truth about the existing codebase, and the "To build" sections as the work.

---

## 1. What ZenTrade is

A free, professional-grade trading journal for prop-firm / futures day traders who trade using **ICT/SMC** concepts (order blocks, fair value gaps, killzones, PD arrays, liquidity, SMT divergence). Users log closed trades with rich context (setup tags, psychology notes, screenshots), the app enforces prop-firm risk rules, and an AI coach analyzes their performance.

**The upgrade this doc specifies:** turn the AI coach from a generic, read-only chatbot into a domain-expert that (a) actually understands ICT/SMC concepts via a curated knowledge base + retrieval (RAG), and (b) understands each user's *own* trading model via a user-defined **playbook**. We are **not** rebuilding the app — logging, schema, risk rules, analytics all stay. We are upgrading the coach's intelligence.

---

## 2. Users & product goals

- **User:** prop/futures day trader using ICT/SMC. Vocabulary (OB, FVG, SMT, killzones, DOL) is already baked into the app's tag system.
- **Core loop:** log closed trades → AI Guard flags rule breaks on save → ask the coach about trades/concepts/psychology → coach answers grounded in ICT/SMC knowledge + the user's playbook + their real data → trader improves.
- **Product principles:**
  - Domain-competent, never generic filler.
  - Personalized to the user's *own* stated rules and setups.
  - Every claim grounded in a retrieved concept and/or the user's real data.
  - Must stay **$0** to run (free tiers only).

---

## 3. Tech stack (fixed — do not change)

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Backend | Next.js Server Actions + Route Handlers (Vercel serverless) — **no separate backend service** |
| DB / Auth / Storage | Supabase (Postgres, RLS, Auth, Storage) |
| Vector search | Supabase **pgvector** (new) |
| LLM (chat + distillation) | Groq — Llama 3.3 70B (verify current best model at build time) |
| Embeddings | `gte-small` via Supabase Edge Function ($0 default) — OR OpenAI `text-embedding-3-small` (paid upgrade) |
| Hosting | Vercel (Hobby) |
| Styling | Tailwind + inline styles + CSS variables (existing convention) |

**Architectural rule:** RAG requires no new backend. Query-embedding, retrieval, prompt assembly, and streaming all run inside the existing coach Route Handler; vector search is a Postgres RPC inside Supabase; KB ingestion is a standalone script/cron.

---

## 4. Current state — architecture

3-layer serverless, hub-and-spoke:

```
Browser (React client components)
   ↕ Server Actions / Route Handlers (API keys never leave server)
Vercel serverless
   ↕                         ↕
Supabase (Postgres+RLS,     Groq API
 Auth, Storage)             (Llama 3.3 70B, streaming)
```

Coach today (`app/api/coach/route.ts`): fetches the account + last ~30 trades, aggregates them into a system prompt, streams a Groq response back as plain text. It is **read-only** and has **no domain knowledge** beyond what's in the prompt.

---

## 5. Current state — routes & features

| Route | What it does |
|---|---|
| `/login`, `/signup` | Supabase auth |
| `/dashboard` | Per-account / cumulative toggle, balance vs target, loss-limit gauges, drawdown, equity curve, AI Guard banner, today's P&L/win rate |
| `/accounts` | Create/edit/delete prop accounts, switch active account, status badges (active/passed/blown), per-account rule summary |
| `/trades` | Filterable/sortable trade history, screenshot lightbox, inline psychology-note edit, delete |
| `/trades/new` | Full trade logging form (`components/trades/TradeForm.tsx`) with auto-calc (risk $, R multiple, balance after), tag multi-selects, screenshot upload, AI Guard check on submit |
| `/analytics` | Equity curve, P&L distributions, by timeframe/ticker/session, win rate by context, drawdown, R histogram, projections |
| `/news` | Economic news feed (impact/currency filters, next-event countdown) |
| `/coach` | AI psychology coach chat (`components/coach/ChatWindow.tsx`) — streaming, account selector, suggested chips. **This is what we upgrade.** |

**Cross-cutting systems (keep as-is):**
- **AI Guard** — runs server-side on trade save; detects revenge trades, 3+ consecutive losses, oversize positions, session overtrading, out-of-session trades, daily-loss / drawdown breaches. Writes `is_flagged` + `flag_reason`.
- **EOD finalization** (`actions/eod.ts`) — locks a day, aggregates `daily_summaries`.
- **Daily summaries** — per-account per-day aggregate rows via RPCs (`upsert_daily_summary`).
- **Balance updates** — atomic via `update_account_balance` RPC.

---

## 6. Current state — data model (as built; confirm against migrations)

### `profiles`
`id` (uuid PK, FK auth.users), `full_name`, `default_account_id`, `commission_per_rt`.

### `prop_accounts`
`id`, `user_id`, `firm_name`, `account_type` (evaluation|funded), `market_type` (futures|forex), `account_size`, `current_balance`, `profit_target`, `max_drawdown`, `trailing_drawdown` (bool), `drawdown_type` (e.g. intraday), `daily_loss_limit`, `personal_daily_loss_limit`, `max_daily_trades`, `consistency_rule`, `status` (active|passed|blown), `start_date`. RLS: owner only.

### `trades`
Base: `id`, `account_id`, `user_id`, `date`, `ticker`, `direction` (long|short), `result` (win|loss|breakeven), `size`, `entry`, `sl`, `tp_avg`, `risk_dollars`, `pnl`, `r_multiple`, `balance_after`, `macro`, `session`, `exec_timeframe`, `duration_minutes`, `news`, `screenshot_urls` (text[]), `psychology_notes`, `is_flagged`, `flag_reason`, `max_unrealized_pnl`, `created_at`.
Advanced/context: `confidence_level`, `trade_type` (continuation|reversal|other), `bias` (bullish|bearish|neutral), `session_status` (in_session|out_of_session), and array tag columns: `market_conditions[]`, `entry_tags[]`, `psychology_tags[]`, `mistakes[]`, `pd_arrays[]`, `dols[]`, `entry_confluences[]`. RLS: owner only (`user_id` denormalized).

### `daily_summaries`
Per-account per-day aggregates: gross/net pnl, win/loss/breakeven counts, trade_count, breach flags, `is_locked`. Generated/updated by DB functions.

### Custom tags
The form's `TagMultiSelect` uses categories: `entry_model`, `market_condition`, `pd_array`, `dol`, `entry_confluence`, plus psychology/mistake tags. Assume a user-scoped custom-tags table backing these; confirm in code.

> **Important:** none of the above tables change in this upgrade.

---

## 7. To build — Feature 1: Domain-grounded coach (RAG)

### 7.1 Goal
The coach retrieves relevant ICT/SMC concept notes at question time and grounds its answer in them, so it correctly understands the exact terms users tag their trades with (FVG, OB, SMT, killzones, PD arrays, DOL) instead of giving generic advice.

### 7.2 New data model
Enable pgvector:
```sql
create extension if not exists vector;
```

`knowledge_chunks` (global/shared corpus — not per user):
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `concept` | text | e.g. "Fair Value Gap" |
| `category` | text | mirrors tag categories: entry_model / pd_array / dol / entry_confluence / market_condition / session / psychology |
| `content` | text | distilled note, 200–500 words (definition, identification, common mistakes, psychology link) |
| `source` | text | provenance, internal only |
| `token_count` | int | |
| `embedding` | vector(384) | 384 = gte-small; use 1536 for OpenAI |
| `version` | int | |
| `created_at` | timestamptz | |

Index: `create index on knowledge_chunks using hnsw (embedding vector_cosine_ops);`
No RLS needed for reads (shared corpus); restrict writes to service role.

Retrieval RPC:
```sql
create or replace function match_knowledge(
  query_embedding vector(384), match_threshold float, match_count int
) returns table (id uuid, concept text, category text, content text, similarity float)
language sql stable as $$
  select id, concept, category, content, 1 - (embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

### 7.3 New code
- `lib/embeddings.ts` — `embed(text: string): Promise<number[]>`. Default: gte-small via Supabase Edge Function. Isolate the provider behind this one function so it's swappable.
- `lib/retrieval.ts` — `matchKnowledge(question: string, k?, threshold?)`: embed → call `match_knowledge` RPC → return chunks.
- `lib/prompt/coach-prompt.ts` — assembles the system prompt from: coach persona (reuse existing Mark Douglas / Jared Tendler framing) + user playbook + retrieved concept chunks + user trade/account data + conversation history.
- `scripts/ingest-kb.ts` — standalone ingestion: source (transcript/PDF/notes) → Groq distillation pass (paraphrase into a clean concept note; **no verbatim text**) → chunk (~300–500 tokens) → embed → upsert into `knowledge_chunks`. Runnable via `tsx`.

### 7.4 Modify (do not rewrite)
`app/api/coach/route.ts` — insert, before the existing Groq call:
1. `matchKnowledge(question)` → top-K concept chunks.
2. `getPlaybook(userId)` → user's model (Feature 2).
3. Assemble the grounded system prompt via `coach-prompt.ts`.
Keep the existing trade-fetch, streaming transport, and `ChatWindow` untouched.

### 7.5 Content work (not code, but required)
Curate concept notes covering the app's tag taxonomy. Start with ~10–15 highest-use concepts to prove the loop, grow to 40–80. Distill from YouTube/PDF/textbooks, **paraphrased only** (concepts aren't copyrightable; verbatim transcripts are — never store them).

### 7.6 Acceptance criteria
- Asking "what's an FVG and are mine any good?" returns an answer that correctly explains FVG (from the KB) AND references the user's actual FVG-tagged trades.
- Retrieved chunks are visibly relevant to the question's concept category.
- No regression in coach streaming/latency UX.

---

## 8. To build — Feature 2: User Playbook

### 8.1 Goal
Let each user define their own trading model once, and inject it into every coach call so the coach can measure trades against the user's *own* rules ("this was an off-playbook trade — your setup requires HTF bias confluence, which was absent").

### 8.2 New data model
`playbooks`:
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK profiles, **RLS owner only** |
| `setups` | jsonb | array: `{ name, entry_rules, required_confluences, invalidation, target_logic }` |
| `killzones` | jsonb | sessions/windows the user trades |
| `instruments` | text[] | NQ, MNQ, ES… |
| `risk_rules` | jsonb | max risk % / trade, max daily loss, max trades/day, stop-after-N-losses |
| `personal_rules` | text[] | hard rules ("no trades after 2 losses") |
| `goals` | jsonb | profit target, timeline, definition of a good day |
| `updated_at` | timestamptz | |

### 8.3 New code
- `actions/playbook.ts` — `getPlaybook(userId)`, `upsertPlaybook(userId, data)`.
- `app/(app)/playbook/page.tsx` — "My Model" editor page.
- `components/playbook/PlaybookForm.tsx` — the form (match existing form styling conventions).
- Add a "Playbook" / "My Model" nav item to the app shell.
- Inject playbook into `coach-prompt.ts` (Feature 1).

### 8.4 Nice-to-have
Pre-fill setup suggestions from the user's logged-tag history (they already store `entry_tags`, `pd_arrays`, `entry_confluences` per trade — infer likely setups and offer to save them).

### 8.5 Acceptance criteria
- User can define/edit setups, killzones, risk rules, personal rules, goals; persists with RLS.
- Coach references the playbook: correctly flags a logged trade that violates a user-stated rule.

---

## 9. To build — Feature 3: Coach UX polish

- Smarter suggested chips, playbook/tag-aware (e.g. "Was my last NQ entry a valid [setup name] setup?", "Am I trading outside my killzones?").
- "Ask coach about this trade" button on trade rows → opens a coach thread seeded with that trade's full context (tags, notes, guard flags).
- Render concept citations cleanly in chat so advice is auditable.
- No change to streaming transport.

---

## 10. Conventions the agent must follow

- **Server-side secrets:** Groq/embedding/service-role keys never reach the client. All LLM + embedding calls run in Route Handlers / Server Actions.
- **Supabase access:** browser client (`lib/supabase/client.ts`) for client components; server client (`lib/supabase/server.ts`, cookie-based) for server code. RPCs via `supabase.rpc(...)`.
- **RLS:** every user-scoped table (`playbooks`) is owner-only. `knowledge_chunks` is a shared read corpus (no per-user RLS), writes service-role only.
- **Auth guard:** protected routes live under the `(app)` group behind `middleware.ts`.
- **Streaming:** the coach uses a `ReadableStream` piped from Groq — preserve this pattern.
- **Styling:** follow existing conventions (Tailwind + inline styles + CSS variables like `--bg-card`, `--accent`, `--text-secondary`).
- **Migrations:** new SQL as versioned migration files under `supabase/migrations/`.
- **Env vars (existing + note new provider key if OpenAI embeddings chosen):**
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `NEXT_PUBLIC_APP_URL`.

---

## 11. Non-goals & constraints

- ❌ **No separate backend service** (no standalone Python/Node server). Next.js server layer + Supabase only.
- ❌ **No open positions.** Schema stays closed-trades-only. No status/positions modeling.
- ❌ **No conversational auto-logging** in this scope (possible future phase). Logging stays form-first.
- ❌ **No rewrite** of logging, schema, AI Guard, EOD, analytics, or dashboard.
- ✅ **Stay $0** — prefer gte-small embeddings; OpenAI embeddings are an explicit opt-in upgrade only.
- ✅ **Grounding over volume** — curate the KB; never dump raw transcripts; paraphrase for IP safety.

---

## 12. Suggested build order

1. **RAG foundation:** enable pgvector, create `knowledge_chunks` + `match_knowledge()`, write `lib/embeddings.ts` + `lib/retrieval.ts`. Hand-seed 10–15 concept notes. Wire retrieval into `/api/coach`. Verify the coach cites concepts correctly.
2. **Playbook:** `playbooks` table + RLS, `actions/playbook.ts`, `/playbook` page + form, nav entry. Inject into coach prompt. Verify off-playbook detection.
3. **KB scale-up:** build `scripts/ingest-kb.ts`, grow corpus to 40–80 concepts, tune `match_count` / `match_threshold` / chunk size.
4. **Coach UX polish:** smarter chips, per-trade "ask coach", citation rendering.

---

## 13. Open items to confirm at build time

- Current best Groq model for chat + distillation (verify; Llama 3.3 70B is the assumed baseline).
- Current $0 embedding path on Supabase (gte-small edge function) vs. OpenAI upgrade — pick one; keep it behind `lib/embeddings.ts`.
- Exact shape of the existing custom-tags table backing `TagMultiSelect` (confirm in code before pre-filling playbook setups).
- Retrieval tuning (K, threshold, chunk size) — expect iteration.
