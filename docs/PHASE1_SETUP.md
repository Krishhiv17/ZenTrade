# Phase 1 (RAG Coach) — Setup Runbook

Everything you need to do **outside the code** to make the domain-grounded coach work.
Do these in order. Est. 15–20 min.

---

## 0. Prerequisites (one-time)

- **Install the new dev dependency** (adds `tsx`, used by the seeder):
  ```bash
  npm install
  ```
- **Install the Supabase CLI** (to deploy the edge function), if you don't have it:
  ```bash
  brew install supabase/tap/supabase      # macOS
  # or: npm install -g supabase
  supabase --version
  ```

---

## 1. Run the database migration (Supabase)

This enables `pgvector`, creates the `knowledge_chunks` table + HNSW index + RLS, and the
`match_knowledge()` search function.

**Supabase Dashboard → SQL Editor → New query**, paste the entire contents of
[`supabase/migrations/013_knowledge_base.sql`](../supabase/migrations/013_knowledge_base.sql),
and **Run**.

Verify it worked (run in SQL Editor):
```sql
select extname from pg_extension where extname = 'vector';        -- 1 row
select count(*) from knowledge_chunks;                            -- 0 (empty, for now)
```

> If `create extension ... vector` errors on your plan, go to **Database → Extensions**,
> search "vector", and enable it via the UI, then re-run the rest of the migration.

---

## 2. Link the CLI to your project (one-time)

Your project ref is in the Supabase URL — `mumfmylxbgfzuujkoqei`.

```bash
supabase login
supabase link --project-ref mumfmylxbgfzuujkoqei
```

---

## 3. Deploy the embedding Edge Function

This function turns text into a 384-dim vector using Supabase's built-in `gte-small` model.
It's the piece that keeps embeddings **$0**.

```bash
supabase functions deploy embed
```

> **This is the de-risk checkpoint.** If this deploys and the smoke test in step 5 returns a
> 384-length array, the whole $0 architecture is validated.

The function has `verify_jwt` on by default — that's fine. Our backend calls it with the
service-role key (a valid JWT), so only our server can reach it. **No extra config needed.**

---

## 4. Confirm environment variables

**Local** (`.env.local`) — already present, just confirm these exist:
```
NEXT_PUBLIC_SUPABASE_URL=https://mumfmylxbgfzuujkoqei.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...     # Dashboard → Project Settings → API → service_role
GROQ_API_KEY=...
```

**Vercel** (Production) — **Project → Settings → Environment Variables** — make sure the
**same** `SUPABASE_SERVICE_ROLE_KEY` and `GROQ_API_KEY` exist for the Production environment.
The coach route (a serverless function) needs the service-role key to call the edge function.
After adding/changing env vars on Vercel, **redeploy** for them to take effect.

> Nothing new to add if these keys were already set for the existing coach — the RAG path
> reuses `SUPABASE_SERVICE_ROLE_KEY` (already required) and `GROQ_API_KEY`. **No new keys.**

---

## 5. Seed the knowledge base

Embeds the 14 hand-written ICT/SMC concept notes and upserts them into `knowledge_chunks`.
Run **locally** (it uses `.env.local`):

```bash
npm run seed:kb
```

Expected output:
```
🌱 Seeding 14 concept notes (dim=384)…
  ✓ Fair Value Gap (FVG)  (pd_array)
  ✓ Order Block  (pd_array)
  ...
Done. 14 upserted, 0 failed.
```

**Smoke test the vectors landed:**
```sql
select concept, category, array_length(embedding::real[], 1) as dims
from knowledge_chunks order by concept;
-- every row should show dims = 384
```

If the seeder fails with an embed error, the edge function (step 3) isn't deployed or the
service-role key is wrong — fix that and re-run (`seed:kb` is idempotent).

---

## 6. Verify the coach uses it

1. Deploy the app (push to your Vercel-connected branch) **or** run `npm run dev` locally.
2. Open **/coach**, pick an account, and ask:
   > *"What's an FVG and are mine any good?"*
3. Expected:
   - The answer correctly explains a Fair Value Gap (grounded in the KB note), **and**
   - references your actual FVG-tagged trades, **and**
   - a **"Concepts referenced"** row of chips appears under the answer (e.g. *Fair Value Gap*,
     *Liquidity*, *Draw on Liquidity*).

If chips appear, retrieval → prompt → citation round-trip is fully working.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Seeder: `embed() failed (401)` | Edge function not deployed / not linked | Redo steps 2–3 |
| Seeder: `embed() failed (404)` | Function name/path wrong | Confirm `supabase functions list` shows `embed` |
| Seeder: `dimension mismatch` | Wrong model in edge fn | Ensure `gte-small` in `functions/embed/index.ts`, redeploy |
| Coach answers but **no chips** | KB empty or below threshold | Confirm step 5 seeded rows; lower `DEFAULT_MATCH_THRESHOLD` in `lib/retrieval.ts` |
| Coach 500 on Vercel | Missing `SUPABASE_SERVICE_ROLE_KEY` in Prod | Add it in Vercel env, redeploy |
| `match_knowledge` returns nothing for everything | Extension/index missing | Re-run migration 013 |

---

## What changed in code (for reference)

- `supabase/migrations/013_knowledge_base.sql` — vector schema + RPC.
- `supabase/functions/embed/index.ts` — gte-small edge function.
- `lib/supabase/admin.ts` — service-role client (server-only).
- `lib/embeddings.ts` — `embed()` seam (calls the edge function).
- `lib/retrieval.ts` — `matchKnowledge()` (embed → RPC).
- `lib/prompt/coach-prompt.ts` — prompt builder (persona + retrieved concepts).
- `app/api/coach/route.ts` — retrieval wired in; streams a `{concepts}` header line first.
- `components/coach/ChatWindow.tsx` — parses that header, renders citation chips.
- `scripts/seed/concepts.ts` + `scripts/seed-kb.ts` — the seed corpus + seeder.
