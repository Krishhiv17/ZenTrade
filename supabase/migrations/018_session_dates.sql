-- ============================================================
-- Migration 018: Correct End-of-Day handling via session dates
--
-- Prop-firm "trading day" ends at a market boundary (5 PM ET for
-- futures), NOT calendar midnight. We derive a `session_date` per
-- trade from its execution time + the account's reset boundary, and
-- key all day-scoped logic (daily loss reset, max trades, EOD
-- drawdown ratchet, day lock) on it.
-- Run in Supabase Dashboard → SQL Editor AFTER 017.
-- ============================================================

-- ── Per-account daily reset boundary ──
-- Default 5 PM America/New_York (CME futures close). Forex firms that
-- reset at a different time (e.g. CET midnight) can override the tz/time.
alter table prop_accounts
  add column if not exists daily_reset_time time not null default '17:00',
  add column if not exists daily_reset_tz   text not null default 'America/New_York';

-- ── Trade execution time + derived trading day ──
alter table trades
  add column if not exists executed_at  timestamptz,   -- real execution instant (nullable for legacy)
  add column if not exists session_date date;           -- the trading day this trade belongs to

-- Backfill: existing trades have no captured time, so their logged
-- calendar date becomes their session day (lossless).
update trades set session_date = date where session_date is null;

-- Fast per-session aggregation.
create index if not exists trades_account_session_idx on trades(account_id, session_date desc);
