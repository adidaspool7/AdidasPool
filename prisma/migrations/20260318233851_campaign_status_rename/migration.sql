-- Campaign status rename: ACTIVE→SENT, FINISHED→TERMINATED, add ARCHIVED
-- Drop hiddenFromCandidates column (replaced by ARCHIVED status)
-- PostgreSQL doesn't support renaming enum values, so we recreate the type.

-- Step 1: Drop the default on the status column (it depends on the enum type)
ALTER TABLE "PromoCampaign" ALTER COLUMN "status" DROP DEFAULT;

-- Step 2: Convert column to text temporarily
ALTER TABLE "PromoCampaign" ALTER COLUMN "status" TYPE TEXT;

-- Step 3: Migrate data to new status names
UPDATE "PromoCampaign" SET "status" = 'SENT' WHERE "status" = 'ACTIVE';
UPDATE "PromoCampaign" SET "status" = 'TERMINATED' WHERE "status" = 'FINISHED';
UPDATE "PromoCampaign" SET "status" = 'ARCHIVED' WHERE "status" = 'CANCELLED';

-- Step 4: Drop old enum and create new one
DROP TYPE "CampaignStatus";
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENT', 'TERMINATED', 'ARCHIVED');

-- Step 5: Convert column back to enum with default
ALTER TABLE "PromoCampaign" ALTER COLUMN "status" TYPE "CampaignStatus" USING "status"::"CampaignStatus";
ALTER TABLE "PromoCampaign" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Step 6: Drop hiddenFromCandidates column
ALTER TABLE "PromoCampaign" DROP COLUMN IF EXISTS "hiddenFromCandidates";
