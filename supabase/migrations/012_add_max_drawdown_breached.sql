-- Migration 012: Add max_drawdown_breached to daily_summaries

ALTER TABLE daily_summaries 
ADD COLUMN max_drawdown_breached BOOLEAN NOT NULL DEFAULT false;
