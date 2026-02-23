-- Migration 003: Change consistency_rule column from text to numeric
-- Run in Supabase Dashboard → SQL Editor AFTER 002
--
-- If you have existing text data in this column, this will fail unless
-- it's already a valid number. Since the app is fresh, it should work cleanly.

ALTER TABLE prop_accounts
  ALTER COLUMN consistency_rule TYPE numeric
  USING NULLIF(TRIM(consistency_rule), '')::numeric;
