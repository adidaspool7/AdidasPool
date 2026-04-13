-- Campaign status: replace SENT with ACTIVE + FINISHED, add hiddenFromCandidates
-- Note: uses separate statements outside transaction for enum safety

-- 1. Add new enum values
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'FINISHED';

-- 3. Add hiddenFromCandidates column
ALTER TABLE "PromoCampaign" ADD COLUMN IF NOT EXISTS "hiddenFromCandidates" BOOLEAN NOT NULL DEFAULT false;
