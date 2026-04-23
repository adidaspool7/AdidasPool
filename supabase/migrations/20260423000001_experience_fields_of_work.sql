-- ========================================================================
-- Migration: Per-experience Field of Work tags (2026-04-23)
-- ------------------------------------------------------------------------
-- Adds experiences.fields_of_work TEXT[] — the canonical Fields of Work
-- (see src/client/lib/constants.ts) that each experience maps to.
--
-- Emitted by the CV parser LLM so the Phase-3 job-anchored matcher can
-- compute a candidate's years-per-field vector instead of relying on a
-- single primaryBusinessArea.
--
-- Phase 2 of the job-anchored matching initiative
-- (see docs/JOB_ANCHORED_MATCHING_PLAN.md).
--
-- Run this file manually in the Supabase SQL editor.
-- ========================================================================

ALTER TABLE experiences
  ADD COLUMN IF NOT EXISTS fields_of_work TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for fast "which candidates have experience in field X" queries
CREATE INDEX IF NOT EXISTS idx_experiences_fields_of_work
  ON experiences USING GIN (fields_of_work);
