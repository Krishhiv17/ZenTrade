-- ============================================================
-- Migration 016: User Playbooks
-- Each user defines their own trading model once (setups, killzones,
-- risk rules, personal rules, goals). Injected into every Coach-mode
-- call so the coach measures trades against the user's OWN rules.
-- Run in Supabase Dashboard → SQL Editor AFTER 015.
-- ============================================================

create table if not exists playbooks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references profiles(id) on delete cascade,
  -- array of { name, entry_rules, required_confluences, invalidation, target_logic }
  setups         jsonb not null default '[]'::jsonb,
  -- sessions/windows the user trades, e.g. ["London Open", "New York AM"]
  killzones      jsonb not null default '[]'::jsonb,
  instruments    text[] not null default '{}',
  -- { max_risk_per_trade, max_daily_loss, max_trades_per_day, stop_after_losses }
  risk_rules     jsonb not null default '{}'::jsonb,
  personal_rules text[] not null default '{}',
  -- { profit_target, timeline, good_day }
  goals          jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

-- RLS: owner-only for all operations.
alter table playbooks enable row level security;

drop policy if exists "own_playbook" on playbooks;
create policy "own_playbook"
  on playbooks for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
