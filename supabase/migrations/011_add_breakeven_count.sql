-- Migration 011: Add breakeven_count to daily_summaries

ALTER TABLE daily_summaries 
ADD COLUMN breakeven_count INTEGER NOT NULL DEFAULT 0;
