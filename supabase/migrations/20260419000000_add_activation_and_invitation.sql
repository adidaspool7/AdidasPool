-- =============================================================
-- Add activation and invitation tracking to candidates
-- =============================================================

-- activated_at: set when the candidate first logs in (Google OAuth)
-- HR-uploaded candidates have activated_at = NULL until the real person logs in
ALTER TABLE candidates
  ADD COLUMN activated_at TIMESTAMPTZ;

-- invitation_sent: visual flag for HR — whether an invitation was "sent" to activate
ALTER TABLE candidates
  ADD COLUMN invitation_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: existing PLATFORM candidates (self-registered) are already activated
UPDATE candidates
  SET activated_at = created_at
  WHERE source_type = 'PLATFORM' AND user_id IS NOT NULL;
