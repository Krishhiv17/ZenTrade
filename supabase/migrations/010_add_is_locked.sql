-- Migration 010: Add is_locked to daily_summaries

ALTER TABLE daily_summaries 
ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false;

-- Update existing rows that already have a score to be locked
UPDATE daily_summaries 
SET is_locked = true 
WHERE score IS NOT NULL;
