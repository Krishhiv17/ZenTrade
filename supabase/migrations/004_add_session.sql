-- Migration 004: Add session column to trades table
-- Run in Supabase Dashboard → SQL Editor AFTER 003

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS session TEXT
    CHECK (session IN ('Asia', 'London', 'Pre-Market', 'New York AM', 'New York PM'));
