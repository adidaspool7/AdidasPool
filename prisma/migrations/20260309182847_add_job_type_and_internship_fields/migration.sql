-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('NEW', 'PARSED', 'SCREENED', 'INVITED', 'ASSESSED', 'SHORTLISTED', 'BORDERLINE', 'ON_IMPROVEMENT_TRACK', 'REJECTED', 'HIRED');

-- CreateEnum
CREATE TYPE "CandidateSource" AS ENUM ('EXTERNAL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "WorkModel" AS ENUM ('REMOTE', 'HYBRID', 'ON_SITE');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('HIGH_SCHOOL', 'BACHELOR', 'MASTER', 'PHD', 'VOCATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CEFRLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'INVITED', 'ASSESSED', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('LISTENING_WRITTEN', 'SPEAKING', 'READING_ALOUD', 'COMBINED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'SCORED', 'REVIEWED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'REASSESSMENT_PENDING', 'REASSESSED', 'DROPPED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_RECEIVED', 'ASSESSMENT_COMPLETED', 'CV_UPLOADED', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "ParsingJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "country" TEXT,
    "linkedinUrl" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT,
    "willingToRelocate" BOOLEAN,
    "availability" TEXT,
    "workModel" "WorkModel",
    "bio" TEXT,
    "rawCvUrl" TEXT,
    "rawCvText" TEXT,
    "parsedData" JSONB,
    "overallCvScore" DOUBLE PRECISION,
    "experienceScore" DOUBLE PRECISION,
    "educationScore" DOUBLE PRECISION,
    "locationScore" DOUBLE PRECISION,
    "yearsOfExperience" DOUBLE PRECISION,
    "status" "CandidateStatus" NOT NULL DEFAULT 'NEW',
    "sourceType" "CandidateSource" NOT NULL DEFAULT 'EXTERNAL',
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOf" TEXT,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "isRelevant" BOOLEAN,
    "relevanceScore" DOUBLE PRECISION,
    "relevanceReason" TEXT,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "institution" TEXT,
    "degree" TEXT,
    "fieldOfStudy" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "level" "EducationLevel",

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateLanguage" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "selfDeclaredLevel" "CEFRLevel",
    "assessedLevel" "CEFRLevel",

    CONSTRAINT "CandidateLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateTag" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateNote" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT,
    "location" TEXT,
    "country" TEXT,
    "type" "JobType" NOT NULL DEFAULT 'FULL_TIME',
    "durationWeeks" INTEGER,
    "stipend" TEXT,
    "mentorName" TEXT,
    "mentorEmail" TEXT,
    "externalId" TEXT,
    "sourceUrl" TEXT,
    "requiredLanguage" TEXT,
    "requiredLanguageLevel" "CEFRLevel",
    "requiredExperienceType" TEXT,
    "minYearsExperience" INTEGER,
    "requiredEducationLevel" "EducationLevel",
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "notes" TEXT,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobMatch" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT,
    "templateId" TEXT,
    "magicToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accessedAt" TIMESTAMP(3),
    "type" "AssessmentType" NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "language" TEXT NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResult" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grammarScore" DOUBLE PRECISION,
    "vocabularyScore" DOUBLE PRECISION,
    "clarityScore" DOUBLE PRECISION,
    "fluencyScore" DOUBLE PRECISION,
    "customerHandlingScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "cefrEstimation" "CEFRLevel",
    "isBorderline" BOOLEAN NOT NULL DEFAULT false,
    "audioUrl" TEXT,
    "transcript" TEXT,
    "candidateText" TEXT,
    "feedbackSummary" TEXT,
    "rawAiResponse" JSONB,

    CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT NOT NULL,
    "cefrLevel" "CEFRLevel" NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "instructions" TEXT,
    "listeningAudioUrl" TEXT,
    "readingText" TEXT,
    "promptText" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "grammarWeight" INTEGER NOT NULL DEFAULT 20,
    "vocabularyWeight" INTEGER NOT NULL DEFAULT 20,
    "clarityWeight" INTEGER NOT NULL DEFAULT 20,
    "fluencyWeight" INTEGER NOT NULL DEFAULT 20,
    "customerHandlingWeight" INTEGER NOT NULL DEFAULT 20,
    "jobId" TEXT,

    CONSTRAINT "AssessmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImprovementTrack" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "candidateId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "targetLevel" "CEFRLevel" NOT NULL,
    "status" "TrackStatus" NOT NULL DEFAULT 'ENROLLED',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reassessmentId" TEXT,

    CONSTRAINT "ImprovementTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImprovementProgress" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ImprovementProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "jobId" TEXT,
    "candidateId" TEXT,
    "applicationId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsingJob" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ParsingJobStatus" NOT NULL DEFAULT 'QUEUED',
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "parsedFiles" INTEGER NOT NULL DEFAULT 0,
    "failedFiles" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "uploadedBy" TEXT,
    "fileName" TEXT,

    CONSTRAINT "ParsingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_email_key" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");

-- CreateIndex
CREATE INDEX "Candidate_overallCvScore_idx" ON "Candidate"("overallCvScore");

-- CreateIndex
CREATE INDEX "Candidate_country_idx" ON "Candidate"("country");

-- CreateIndex
CREATE INDEX "Experience_candidateId_idx" ON "Experience"("candidateId");

-- CreateIndex
CREATE INDEX "Education_candidateId_idx" ON "Education"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateLanguage_candidateId_idx" ON "CandidateLanguage"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateLanguage_candidateId_language_key" ON "CandidateLanguage"("candidateId", "language");

-- CreateIndex
CREATE INDEX "Skill_candidateId_idx" ON "Skill"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateTag_candidateId_idx" ON "CandidateTag"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateTag_candidateId_tag_key" ON "CandidateTag"("candidateId", "tag");

-- CreateIndex
CREATE INDEX "CandidateNote_candidateId_idx" ON "CandidateNote"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_externalId_key" ON "Job"("externalId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_externalId_idx" ON "Job"("externalId");

-- CreateIndex
CREATE INDEX "Job_type_idx" ON "Job"("type");

-- CreateIndex
CREATE INDEX "JobApplication_jobId_idx" ON "JobApplication"("jobId");

-- CreateIndex
CREATE INDEX "JobApplication_candidateId_idx" ON "JobApplication"("candidateId");

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobId_candidateId_key" ON "JobApplication"("jobId", "candidateId");

-- CreateIndex
CREATE INDEX "JobMatch_jobId_idx" ON "JobMatch"("jobId");

-- CreateIndex
CREATE INDEX "JobMatch_candidateId_idx" ON "JobMatch"("candidateId");

-- CreateIndex
CREATE INDEX "JobMatch_matchScore_idx" ON "JobMatch"("matchScore");

-- CreateIndex
CREATE UNIQUE INDEX "JobMatch_jobId_candidateId_key" ON "JobMatch"("jobId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_magicToken_key" ON "Assessment"("magicToken");

-- CreateIndex
CREATE INDEX "Assessment_candidateId_idx" ON "Assessment"("candidateId");

-- CreateIndex
CREATE INDEX "Assessment_jobId_idx" ON "Assessment"("jobId");

-- CreateIndex
CREATE INDEX "Assessment_magicToken_idx" ON "Assessment"("magicToken");

-- CreateIndex
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResult_assessmentId_key" ON "AssessmentResult"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentTemplate_language_cefrLevel_idx" ON "AssessmentTemplate"("language", "cefrLevel");

-- CreateIndex
CREATE INDEX "ImprovementTrack_candidateId_idx" ON "ImprovementTrack"("candidateId");

-- CreateIndex
CREATE INDEX "ImprovementTrack_status_idx" ON "ImprovementTrack"("status");

-- CreateIndex
CREATE INDEX "ImprovementProgress_trackId_idx" ON "ImprovementProgress"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "ImprovementProgress_trackId_day_key" ON "ImprovementProgress"("trackId", "day");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "ParsingJob_status_idx" ON "ParsingJob"("status");

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLanguage" ADD CONSTRAINT "CandidateLanguage_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTag" ADD CONSTRAINT "CandidateTag_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTemplate" ADD CONSTRAINT "AssessmentTemplate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImprovementTrack" ADD CONSTRAINT "ImprovementTrack_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImprovementProgress" ADD CONSTRAINT "ImprovementProgress_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "ImprovementTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
