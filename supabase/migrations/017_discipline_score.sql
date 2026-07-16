-- ============================================================
-- Migration 017: Discipline Score (deterministic, process-first)
-- + formalize the existing AI daily-evaluation columns as schema-as-code.
-- Run in Supabase Dashboard → SQL Editor AFTER 016.
--
-- All ADDs are IF NOT EXISTS and idempotent — this will NOT touch or
-- overwrite existing `score` / `taxonomy` / `ai_feedback` data that was
-- added manually in the dashboard; it just makes the schema reproducible.
-- ============================================================

-- ── Deterministic Discipline Score (the new hero metric) ──
-- 0–100, computed from process signals (rules 45 / emotion 25 /
-- journaling 20 / playbook 10). Written at EOD finalization (Slice 1b);
-- computed live on the Today page in Slice 1a.
alter table daily_summaries
  add column if not exists discipline_score integer,
  add column if not exists score_factors    jsonb;   -- { rule, emotion, journaling, playbook, notes[] }

-- ── Formalize the existing AI daily-evaluation columns ──
-- (already present in the live DB via actions/daily-summary.ts;
--  declared here so the schema is fully reproducible from migrations)
alter table daily_summaries
  add column if not exists score       integer,   -- AI-judged day quality 0–100
  add column if not exists taxonomy    text,      -- 'Good Win' | 'Good Loss' | 'Bad Win' | 'Bad Loss'
  add column if not exists ai_feedback text;       -- AI 2-sentence critique
