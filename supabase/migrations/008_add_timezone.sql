-- Migration 008: Add timezone to profiles
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York';
