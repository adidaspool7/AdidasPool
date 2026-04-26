-- ========================================================================
-- Migration: Per-criterion fit weights for Job Matching (2026-04-26)
-- ------------------------------------------------------------------------
-- Adds scoring_weights.fit_criterion_weights JSONB — HR-tunable importance
-- weights for the 7 job-fit criteria (field, experience, seniority,
-- requiredSkills, preferredSkills, languages, education).
--
-- Shape: { "field": 2, "experience": 2, "seniority": 1,
--          "requiredSkills": 3, "preferredSkills": 1,
--          "languages": 1, "education": 1 }
--
-- Setting any weight to 0 drops that dimension from BOTH the overall
-- score AND the eligibility flag — useful when HR knows the JD parser
-- missed something on that dimension.
--
-- Run this file manually in the Supabase SQL editor.
-- ========================================================================

ALTER TABLE scoring_weights
  ADD COLUMN IF NOT EXISTS fit_criterion_weights JSONB
  NOT NULL DEFAULT '{
    "field": 2,
    "experience": 2,
    "seniority": 1,
    "requiredSkills": 3,
    "preferredSkills": 1,
    "languages": 1,
    "education": 1
  }'::jsonb;
