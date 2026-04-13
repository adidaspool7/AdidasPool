-- AlterTable
ALTER TABLE "Candidate" ALTER COLUMN "needsReview" DROP NOT NULL,
ALTER COLUMN "needsReview" DROP DEFAULT;

-- Reset existing false values to null (no state) since they were auto-set, not HR-set
UPDATE "Candidate" SET "needsReview" = NULL WHERE "needsReview" = false;

-- CreateTable
CREATE TABLE "ScoringPreset" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "experience" DOUBLE PRECISION NOT NULL,
    "yearsOfExperience" DOUBLE PRECISION NOT NULL,
    "educationLevel" DOUBLE PRECISION NOT NULL,
    "locationMatch" DOUBLE PRECISION NOT NULL,
    "language" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ScoringPreset_pkey" PRIMARY KEY ("id")
);
