-- Phase 4b: Add skill verification status to skills table
-- Run this in the Supabase SQL editor once.
-- Values: UNVERIFIED (default) | PENDING | PASSED | FAILED | OVERRIDDEN

ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by         TEXT;        -- 'AI' or HR user email

CREATE INDEX IF NOT EXISTS idx_skills_verification_status
  ON skills(candidate_id, verification_status);
