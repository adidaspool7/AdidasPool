-- AlterTable: add terminationReason to InterviewSession
ALTER TABLE "InterviewSession" ADD COLUMN "terminationReason" TEXT;

-- AlterTable: add turnType to InterviewTranscriptTurn
ALTER TABLE "InterviewTranscriptTurn" ADD COLUMN "turnType" TEXT;
