/*
  Warnings:

  - You are about to drop the column `durationWeeks` on the `Job` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InternshipStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'FINISHED');

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "durationWeeks",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "internshipStatus" "InternshipStatus",
ADD COLUMN     "isErasmus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "learningAgreementUrl" TEXT;
