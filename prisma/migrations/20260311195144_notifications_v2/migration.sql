-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENT', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'JOB_POSTED';
ALTER TYPE "NotificationType" ADD VALUE 'INTERNSHIP_POSTED';
ALTER TYPE "NotificationType" ADD VALUE 'JOB_STATE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_STATUS_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_WITHDRAWN';
ALTER TYPE "NotificationType" ADD VALUE 'ASSESSMENT_INVITE';
ALTER TYPE "NotificationType" ADD VALUE 'HR_APPLICATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'HR_APPLICATION_WITHDRAWN';
ALTER TYPE "NotificationType" ADD VALUE 'HR_ASSESSMENT_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'HR_CV_UPLOADED';
ALTER TYPE "NotificationType" ADD VALUE 'PROMOTIONAL';

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "learningAgreementUrl" TEXT,
ADD COLUMN     "motivationLetterText" TEXT,
ADD COLUMN     "motivationLetterUrl" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "targetRole" TEXT;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobNotifications" BOOLEAN NOT NULL DEFAULT true,
    "internshipNotifications" BOOLEAN NOT NULL DEFAULT true,
    "onlyMyCountry" BOOLEAN NOT NULL DEFAULT false,
    "fieldFilters" TEXT[],
    "promotionalNotifications" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCampaign" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "targetAll" BOOLEAN NOT NULL DEFAULT true,
    "targetCountries" TEXT[],
    "targetFields" TEXT[],
    "targetEducation" TEXT[],
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "recipientCount" INTEGER,

    CONSTRAINT "PromoCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_candidateId_key" ON "NotificationPreference"("candidateId");

-- CreateIndex
CREATE INDEX "PromoCampaign_status_idx" ON "PromoCampaign"("status");

-- CreateIndex
CREATE INDEX "Notification_candidateId_idx" ON "Notification"("candidateId");

-- CreateIndex
CREATE INDEX "Notification_targetRole_idx" ON "Notification"("targetRole");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
