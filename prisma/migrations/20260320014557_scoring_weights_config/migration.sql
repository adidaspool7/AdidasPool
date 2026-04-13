-- CreateTable
CREATE TABLE "ScoringWeights" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "experience" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "yearsOfExperience" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "educationLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "locationMatch" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "language" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "presetName" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "ScoringWeights_pkey" PRIMARY KEY ("id")
);
