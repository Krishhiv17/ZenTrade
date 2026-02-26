-- Migration 007: Favorite Tags and Mistake Tags
-- Run in Supabase Dashboard → SQL Editor

-- 1. Add `is_favorite` column to custom tags
ALTER TABLE user_custom_tags 
  ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- 2. Update category constraint to include 'mistake'
ALTER TABLE user_custom_tags DROP CONSTRAINT IF EXISTS user_custom_tags_tag_category_check;
ALTER TABLE user_custom_tags ADD CONSTRAINT user_custom_tags_tag_category_check 
  CHECK (tag_category IN ('market_condition', 'entry_model', 'psychology', 'pd_array', 'entry_confluence', 'dol', 'mistake'));

-- 3. Add `mistakes` array to trades table
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS mistakes text[] DEFAULT '{}';
