-- ========================================================================
-- Migration: Job parsed requirements (2026-04-23)
-- ------------------------------------------------------------------------
-- Adds structured requirements extracted from the JD body by the LLM.
--   1. jobs.parsed_requirements          JSONB — the extracted structure
--   2. jobs.parsed_requirements_version  INT   — schema version for re-parses
--
-- Phase 1 of the job-anchored matching initiative
-- (see docs/JOB_ANCHORED_MATCHING_PLAN.md).
--
-- Run this file manually in the Supabase SQL editor.
-- ========================================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS parsed_requirements         JSONB,
  ADD COLUMN IF NOT EXISTS parsed_requirements_version INTEGER;

-- Partial index: quickly find jobs still needing parsing (backfill + sync workers)
CREATE INDEX IF NOT EXISTS idx_jobs_parsed_requirements_pending
  ON jobs (id)
  WHERE parsed_requirements IS NULL AND source_url IS NOT NULL;
