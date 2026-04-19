-- Phase 4: Add interview_mode column to interview_sessions
-- Run this in the Supabase SQL editor once.
-- Values: 'TECHNICAL' (default) | 'LANGUAGE'

ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS interview_mode TEXT NOT NULL DEFAULT 'TECHNICAL';
