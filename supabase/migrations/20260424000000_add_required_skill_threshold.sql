-- ========================================================================
-- Migration: Required-skill coverage threshold (2026-04-24)
-- ------------------------------------------------------------------------
-- Adds scoring_weights.required_skill_threshold FLOAT — the fraction of
-- a JD's required skills a candidate must cover to be flagged "eligible"
-- by the job-anchored matcher.
--
-- Range: 0..1. Default 0.5 ("at least half of the musts").
-- HR-tunable via /dashboard/jobs/[id]/match-candidates (slider).
--
-- Consumed in src/server/domain/services/job-fit.service.ts via the
-- JobFitConfig contract.
--
-- Run this file manually in the Supabase SQL editor.
-- ========================================================================

ALTER TABLE scoring_weights
  ADD COLUMN IF NOT EXISTS required_skill_threshold FLOAT NOT NULL DEFAULT 0.5
    CHECK (required_skill_threshold >= 0 AND required_skill_threshold <= 1);
