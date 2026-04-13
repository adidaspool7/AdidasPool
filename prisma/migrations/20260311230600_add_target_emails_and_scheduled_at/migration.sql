-- AlterTable
ALTER TABLE "PromoCampaign" ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "targetEmails" TEXT[];
