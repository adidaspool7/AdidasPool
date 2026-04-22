-- ========================================================================
-- Migration: Job Matching + Invitations feature (2026-04-22)
-- ------------------------------------------------------------------------
-- Adds:
--   1. jobs.required_skills  -- TEXT[] list of skills required by the role
--   2. notification_type enum value 'JOB_INVITATION'
--
-- Run this file manually in the Supabase SQL editor.
-- NOTE: Postgres disallows adding enum values inside a transaction, so
-- the ALTER TYPE must be executed on its own statement.
-- ========================================================================

-- 1. required_skills column on jobs (defaults to empty array; safe for existing rows)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS required_skills TEXT[] NOT NULL DEFAULT '{}';

-- 2. New notification type for HR -> Candidate invitations to apply
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'JOB_INVITATION';
