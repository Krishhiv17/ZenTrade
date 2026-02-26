-- Migration 006: Add DOL tags
-- Run in Supabase Dashboard → SQL Editor

-- 1. Drop the check constraint on tag_category to redefine it
ALTER TABLE user_custom_tags DROP CONSTRAINT IF EXISTS user_custom_tags_tag_category_check;

-- 2. Add the check constraint back with 'dol' included
ALTER TABLE user_custom_tags ADD CONSTRAINT user_custom_tags_tag_category_check 
  CHECK (tag_category IN ('market_condition', 'entry_model', 'psychology', 'pd_array', 'entry_confluence', 'dol'));

-- 3. Add the dols array to trades table
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS dols text[] DEFAULT '{}';
