-- ============================================================
-- Prop Firm Journal — Supabase SQL Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── PROFILES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  default_account_id uuid,
  commission_per_rt numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles" ON profiles FOR ALL TO authenticated
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ─── PROP ACCOUNTS ─────────────────────────────────────────
CREATE TYPE account_type_enum AS ENUM ('evaluation', 'funded');
CREATE TYPE account_status_enum AS ENUM ('active', 'passed', 'blown');

CREATE TABLE IF NOT EXISTS prop_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  firm_name text NOT NULL,
  account_type account_type_enum NOT NULL DEFAULT 'evaluation',
  account_size numeric NOT NULL,
  current_balance numeric NOT NULL,
  profit_target numeric,
  max_drawdown numeric,
  trailing_drawdown boolean DEFAULT false,
  daily_loss_limit numeric,
  personal_daily_loss_limit numeric,
  consistency_rule text,
  status account_status_enum NOT NULL DEFAULT 'active',
  start_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prop_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_prop_accounts" ON prop_accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id);


-- ─── TRADES ────────────────────────────────────────────────
CREATE TYPE direction_enum AS ENUM ('long', 'short');
CREATE TYPE trade_result_enum AS ENUM ('win', 'loss', 'breakeven');

CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES prop_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  ticker text NOT NULL,
  direction direction_enum NOT NULL,
  result trade_result_enum,
  size integer NOT NULL DEFAULT 1,
  entry numeric NOT NULL,
  sl numeric,
  tp_avg numeric,
  risk_dollars numeric,
  pnl numeric NOT NULL DEFAULT 0,
  r_multiple numeric,
  balance_after numeric,
  macro text,
  exec_timeframe text,
  news text,
  screenshot_url text,
  psychology_notes text,
  is_flagged boolean DEFAULT false,
  flag_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_trades" ON trades FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast per-account queries
CREATE INDEX IF NOT EXISTS trades_account_id_date_idx ON trades(account_id, date DESC);
CREATE INDEX IF NOT EXISTS trades_user_id_idx ON trades(user_id);


-- ─── DAILY SUMMARIES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES prop_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  gross_pnl numeric DEFAULT 0,
  net_pnl numeric DEFAULT 0,
  trade_count integer DEFAULT 0,
  win_count integer DEFAULT 0,
  loss_count integer DEFAULT 0,
  daily_loss_limit_breached boolean DEFAULT false,
  UNIQUE(account_id, date)
);

ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_daily_summaries" ON daily_summaries FOR ALL TO authenticated
  USING (auth.uid() = user_id);


-- ─── STORAGE BUCKET RLS ────────────────────────────────────
-- Create bucket in Supabase Dashboard: Storage → New Bucket → "screenshots" (public)
-- Then run this policy:

INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "user_screenshot_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user_screenshot_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user_screenshot_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
