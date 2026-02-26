-- Migration 005: Advanced Trade Logging Features
-- Run in Supabase Dashboard → SQL Editor AFTER 004

-- 1. Create table for user custom tags
CREATE TABLE IF NOT EXISTS user_custom_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_category text NOT NULL CHECK (tag_category IN ('market_condition', 'entry_model', 'psychology', 'pd_array', 'entry_confluence')),
  tag_name text NOT NULL,
  sentiment text CHECK (sentiment IN ('positive', 'negative')), -- Mostly for psychology tags
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tag_category, tag_name)
);

ALTER TABLE user_custom_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_custom_tags_policy" ON user_custom_tags FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- 2. Add new columns to the trades table
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS confidence_level integer CHECK (confidence_level >= 1 AND confidence_level <= 5),
  ADD COLUMN IF NOT EXISTS trade_type text CHECK (trade_type IN ('continuation', 'reversal', 'other')),
  ADD COLUMN IF NOT EXISTS bias text CHECK (bias IN ('bullish', 'bearish', 'neutral')),
  ADD COLUMN IF NOT EXISTS session_status text CHECK (session_status IN ('in_session', 'out_of_session')),
  ADD COLUMN IF NOT EXISTS market_conditions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS entry_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS psychology_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pd_arrays text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS entry_confluences text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS screenshot_urls text[] DEFAULT '{}';

-- 3. We will keep the old screenshot_url column for backwards compatibility for now, 
-- but migrate existing data to the new array column where possible.
UPDATE trades SET screenshot_urls = ARRAY[screenshot_url] WHERE screenshot_url IS NOT NULL AND screenshot_url != '';
