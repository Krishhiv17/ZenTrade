-- ============================================================
-- Migration 015: Coach feedback capture
-- Stores 👍/👎 on coach answers along with the question, answer,
-- retrieved concepts, and mode — the dataset used to tune the KB,
-- retrieval, and prompts from real usage.
-- Run in Supabase Dashboard → SQL Editor AFTER 014 (or 013).
-- ============================================================

create table if not exists coach_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  rating      text not null check (rating in ('up', 'down')),
  mode        text not null check (mode in ('coach', 'learn')),
  account_id  uuid references prop_accounts(id) on delete set null,
  question    text,
  answer      text,
  concepts    jsonb default '[]'::jsonb,   -- [{concept, category}] retrieved for this answer
  note        text,                         -- optional free-text (reserved for future use)
  created_at  timestamptz not null default now()
);

-- RLS: owner-only for all operations.
alter table coach_feedback enable row level security;

drop policy if exists "own_coach_feedback" on coach_feedback;
create policy "own_coach_feedback"
  on coach_feedback for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists coach_feedback_user_created_idx
  on coach_feedback (user_id, created_at desc);
