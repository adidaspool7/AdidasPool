-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "candidateCustomArea" TEXT,
ADD COLUMN     "languageScore" DOUBLE PRECISION,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parsingConfidence" JSONB,
ADD COLUMN     "primaryBusinessArea" TEXT,
ADD COLUMN     "secondaryBusinessAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Candidate_primaryBusinessArea_idx" ON "Candidate"("primaryBusinessArea");
