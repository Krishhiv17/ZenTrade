-- Migration 009: Phase 2 EOD Rules and max_daily_trades
-- Run in Supabase Dashboard → SQL Editor

-- 1. Add Max Daily Trades Rule to Prop Accounts
ALTER TABLE prop_accounts
  ADD COLUMN IF NOT EXISTS max_daily_trades integer DEFAULT NULL;

-- 2. Create the daily_summaries table 
CREATE TABLE IF NOT EXISTS daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES prop_accounts(id) ON DELETE CASCADE,
  
  date date NOT NULL, -- The trading date
  
  gross_pnl numeric NOT NULL DEFAULT 0,
  net_pnl numeric NOT NULL DEFAULT 0,
  
  trade_count integer NOT NULL DEFAULT 0,
  win_count integer NOT NULL DEFAULT 0,
  loss_count integer NOT NULL DEFAULT 0,
  breakeven_count integer NOT NULL DEFAULT 0,
  
  daily_loss_limit_breached boolean NOT NULL DEFAULT false,
  max_drawdown_breached boolean NOT NULL DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  
  -- Each account can only have one explicit daily summary for a specific calendar date
  UNIQUE(account_id, date) 
);

-- RLS for Daily Summaries
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own daily summaries" 
  ON daily_summaries FOR ALL TO authenticated
  USING (auth.uid() = user_id);
