-- ============================================================
-- Migration 013: Knowledge Base (RAG foundation)
-- Enables pgvector, creates the shared ICT/SMC concept corpus,
-- and the similarity-search RPC used by the AI coach.
-- Run in Supabase Dashboard → SQL Editor AFTER 012.
-- ============================================================

-- ─── Enable pgvector ───────────────────────────────────────
create extension if not exists vector with schema extensions;

-- ─── KNOWLEDGE CHUNKS (global/shared corpus — NOT per user) ─
create table if not exists knowledge_chunks (
  id          uuid primary key default gen_random_uuid(),
  concept     text not null,               -- e.g. "Fair Value Gap"
  category    text not null,               -- mirrors tag categories:
                                            -- entry_model / pd_array / dol /
                                            -- entry_confluence / market_condition /
                                            -- session / psychology
  content     text not null,               -- distilled, paraphrased note (IP-safe)
  source      text,                         -- provenance, internal only
  token_count int,
  embedding   vector(384),                 -- 384 = gte-small (Supabase edge model)
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  -- one row per concept+version → makes seeding/ingestion idempotent (upsert target)
  unique (concept, version)
);

-- ─── HNSW index for fast cosine similarity ─────────────────
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks using hnsw (embedding vector_cosine_ops);

-- ─── RLS: shared READ corpus, writes via service role only ─
-- Reads: any authenticated user may select (the corpus is not user-scoped).
-- Writes: NO insert/update/delete policy is defined, so normal (anon/authenticated)
--         roles cannot write. The service-role key bypasses RLS entirely and is the
--         only way rows are created (ingestion script / seeder).
alter table knowledge_chunks enable row level security;

drop policy if exists "knowledge_chunks_read" on knowledge_chunks;
create policy "knowledge_chunks_read"
  on knowledge_chunks for select
  to authenticated
  using (true);

-- ─── RPC: vector similarity search ─────────────────────────
-- Returns the closest concept chunks to a query embedding, filtered by a
-- minimum cosine similarity. Called from lib/retrieval.ts via supabase.rpc().
create or replace function match_knowledge(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id         uuid,
  concept    text,
  category   text,
  content    text,
  similarity float
)
language sql
stable
as $$
  select
    kc.id,
    kc.concept,
    kc.category,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where kc.embedding is not null
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;
