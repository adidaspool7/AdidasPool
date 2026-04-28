-- =============================================================
-- Talent Intelligence Platform — Canonical Schema
-- Migrated from Prisma schema to Supabase PostgreSQL
-- Run this in the Supabase SQL Editor (Project → SQL Editor)
--
-- Consolidated 2026-04-26: this file now contains every schema
-- change shipped through 2026-04-26. The previous per-feature
-- delta migration files have been removed — their contents are
-- inlined below in their respective table definitions. Production
-- already has every change applied; this file is the source of
-- truth for fresh dev databases and documentation.
-- =============================================================

-- ----------------------------------------------------------------
-- 0. SHARED TRIGGER FUNCTION FOR updated_at
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------

CREATE TYPE candidate_status AS ENUM (
  'NEW', 'PARSED', 'SCREENED', 'INVITED', 'ASSESSED',
  'SHORTLISTED', 'BORDERLINE', 'ON_IMPROVEMENT_TRACK', 'REJECTED', 'HIRED'
);

CREATE TYPE candidate_source AS ENUM (
  'EXTERNAL', 'INTERNAL', 'PLATFORM'
);

CREATE TYPE work_model AS ENUM (
  'REMOTE', 'HYBRID', 'ON_SITE'
);

CREATE TYPE education_level AS ENUM (
  'HIGH_SCHOOL', 'BACHELOR', 'MASTER', 'PHD', 'VOCATIONAL', 'OTHER'
);

CREATE TYPE cefr_level AS ENUM (
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
);

CREATE TYPE job_status AS ENUM (
  'DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'
);

CREATE TYPE job_type AS ENUM (
  'FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'
);

CREATE TYPE internship_status AS ENUM (
  'DRAFT', 'ACTIVE', 'INACTIVE', 'FINISHED'
);

CREATE TYPE application_status AS ENUM (
  'SUBMITTED', 'UNDER_REVIEW', 'INVITED', 'ASSESSED',
  'SHORTLISTED', 'REJECTED', 'WITHDRAWN'
);

CREATE TYPE assessment_type AS ENUM (
  'LISTENING_WRITTEN', 'SPEAKING', 'READING_ALOUD', 'COMBINED'
);

CREATE TYPE assessment_status AS ENUM (
  'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'SCORED', 'REVIEWED', 'EXPIRED'
);

CREATE TYPE interview_session_status AS ENUM (
  'CREATED', 'RUNNING', 'ENDED', 'EVALUATED'
);

CREATE TYPE proctoring_severity AS ENUM (
  'INFO', 'WARNING', 'CRITICAL'
);

CREATE TYPE interview_decision AS ENUM (
  'PASS', 'FAIL'
);

CREATE TYPE integrity_decision AS ENUM (
  'CLEAR', 'REVIEW', 'FAIL'
);

CREATE TYPE track_status AS ENUM (
  'ENROLLED', 'IN_PROGRESS', 'COMPLETED',
  'REASSESSMENT_PENDING', 'REASSESSED', 'DROPPED'
);

CREATE TYPE notification_type AS ENUM (
  'JOB_POSTED', 'INTERNSHIP_POSTED', 'JOB_STATE_CHANGED',
  'APPLICATION_RECEIVED', 'APPLICATION_STATUS_CHANGED', 'APPLICATION_WITHDRAWN',
  'ASSESSMENT_INVITE', 'ASSESSMENT_COMPLETED',
  'HR_APPLICATION_RECEIVED', 'HR_APPLICATION_WITHDRAWN',
  'HR_ASSESSMENT_COMPLETED', 'HR_CV_UPLOADED',
  'PROMOTIONAL', 'CV_UPLOADED', 'STATUS_CHANGE',
  'JOB_INVITATION', 'CONTACT_EMAIL_SENT'
);

CREATE TYPE parsing_job_status AS ENUM (
  'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'
);

CREATE TYPE campaign_status AS ENUM (
  'DRAFT', 'SENT', 'TERMINATED', 'ARCHIVED'
);


-- ----------------------------------------------------------------
-- 2. LEAF TABLES (no foreign key dependencies)
-- ----------------------------------------------------------------

-- Scoring weights (single-row config)
CREATE TABLE scoring_weights (
  id                  TEXT PRIMARY KEY DEFAULT 'default',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  experience          FLOAT NOT NULL DEFAULT 0.25,
  years_of_experience FLOAT NOT NULL DEFAULT 0.10,
  education_level     FLOAT NOT NULL DEFAULT 0.15,
  location_match      FLOAT NOT NULL DEFAULT 0.15,
  language            FLOAT NOT NULL DEFAULT 0.35,
  preset_name         TEXT,
  updated_by          TEXT,
  -- Job-anchored matching: minimum fraction of a JD's required skills
  -- a candidate must cover for the eligibility chip to read "all reqs met".
  required_skill_threshold FLOAT NOT NULL DEFAULT 0.5
    CHECK (required_skill_threshold >= 0 AND required_skill_threshold <= 1),
  -- HR-tunable per-criterion fit weights for the 7 job-fit criteria.
  -- Setting any weight to 0 drops that dimension from BOTH overall score
  -- AND eligibility (used when HR knows the JD parser missed a dimension).
  fit_criterion_weights JSONB NOT NULL DEFAULT '{
    "field": 2,
    "experience": 2,
    "seniority": 1,
    "requiredSkills": 3,
    "preferredSkills": 1,
    "languages": 1,
    "education": 1
  }'::jsonb
);

CREATE TRIGGER trg_scoring_weights_updated_at
  BEFORE UPDATE ON scoring_weights
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Scoring presets
CREATE TABLE scoring_presets (
  id                  TEXT PRIMARY KEY,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name                TEXT NOT NULL,
  experience          FLOAT NOT NULL,
  years_of_experience FLOAT NOT NULL,
  education_level     FLOAT NOT NULL,
  location_match      FLOAT NOT NULL,
  language            FLOAT NOT NULL
);

-- Sync jobs
CREATE TABLE sync_jobs (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  status       TEXT NOT NULL,
  result       JSONB,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Parsing jobs
CREATE TABLE parsing_jobs (
  id           TEXT PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       parsing_job_status NOT NULL DEFAULT 'QUEUED',
  total_files  INTEGER NOT NULL DEFAULT 0,
  parsed_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,
  error_log    JSONB,
  uploaded_by  TEXT,
  file_name    TEXT
);

CREATE TRIGGER trg_parsing_jobs_updated_at
  BEFORE UPDATE ON parsing_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_parsing_jobs_status ON parsing_jobs(status);

-- Promotional campaigns
CREATE TABLE promo_campaigns (
  id               TEXT PRIMARY KEY,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  image_url        TEXT,
  link_url         TEXT,
  is_pinned        BOOLEAN NOT NULL DEFAULT FALSE,
  target_all       BOOLEAN NOT NULL DEFAULT TRUE,
  target_countries TEXT[] NOT NULL DEFAULT '{}',
  target_fields    TEXT[] NOT NULL DEFAULT '{}',
  target_education TEXT[] NOT NULL DEFAULT '{}',
  target_emails    TEXT[] NOT NULL DEFAULT '{}',
  scheduled_at     TIMESTAMPTZ,
  status           campaign_status NOT NULL DEFAULT 'DRAFT',
  sent_at          TIMESTAMPTZ,
  sent_by          TEXT,
  recipient_count  INTEGER
);

CREATE TRIGGER trg_promo_campaigns_updated_at
  BEFORE UPDATE ON promo_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_promo_campaigns_status ON promo_campaigns(status);


-- ----------------------------------------------------------------
-- 3. CANDIDATES
-- user_id links to Supabase auth.users for self-registered candidates
-- ----------------------------------------------------------------

CREATE TABLE candidates (
  id                       TEXT PRIMARY KEY,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Auth link (nullable — HR-uploaded CVs have no auth user)
  user_id                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Basic info (from CV)
  first_name               TEXT NOT NULL,
  last_name                TEXT NOT NULL,
  email                    TEXT UNIQUE,
  phone                    TEXT,
  location                 TEXT,
  country                  TEXT,
  linkedin_url             TEXT,

  -- Self-declared profile
  date_of_birth            TIMESTAMPTZ,
  nationality              TEXT,
  willing_to_relocate      BOOLEAN,
  availability             TEXT,
  work_model               work_model,
  bio                      TEXT,

  -- CV storage
  raw_cv_url               TEXT,
  raw_cv_text              TEXT,
  parsed_data              JSONB,

  -- Motivation letter
  motivation_letter_url    TEXT,
  motivation_letter_text   TEXT,

  -- Learning agreement
  learning_agreement_url   TEXT,

  -- Scoring
  overall_cv_score         FLOAT,
  experience_score         FLOAT,
  education_score          FLOAT,
  location_score           FLOAT,
  language_score           FLOAT,
  years_of_experience      FLOAT,

  -- Business area
  primary_business_area    TEXT,
  secondary_business_areas TEXT[] NOT NULL DEFAULT '{}',
  candidate_custom_area    TEXT,

  -- Parsing quality
  parsing_confidence       JSONB,
  needs_review             BOOLEAN,

  -- Status
  status                   candidate_status NOT NULL DEFAULT 'NEW',
  source_type              candidate_source NOT NULL DEFAULT 'EXTERNAL',
  is_duplicate             BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of             TEXT,

  -- Activation / invitation tracking
  -- activated_at: set when the candidate first logs in (Google OAuth).
  --   HR-uploaded candidates have activated_at = NULL until the real
  --   person logs in. Self-registered PLATFORM candidates have it set
  --   on row creation.
  -- invitation_sent: visual flag for HR — whether an invitation email
  --   was "sent" to activate the account.
  activated_at             TIMESTAMPTZ,
  invitation_sent          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_candidates_email              ON candidates(email);
CREATE INDEX idx_candidates_status             ON candidates(status);
CREATE INDEX idx_candidates_overall_cv_score   ON candidates(overall_cv_score);
CREATE INDEX idx_candidates_country            ON candidates(country);
CREATE INDEX idx_candidates_primary_area       ON candidates(primary_business_area);
CREATE INDEX idx_candidates_user_id            ON candidates(user_id);


-- ----------------------------------------------------------------
-- 4. JOBS
-- ----------------------------------------------------------------

CREATE TABLE jobs (
  id                       TEXT PRIMARY KEY,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title                    TEXT NOT NULL,
  description              TEXT,
  department               TEXT,
  location                 TEXT,
  country                  TEXT,
  type                     job_type NOT NULL DEFAULT 'FULL_TIME',

  -- Internship fields
  start_date               TIMESTAMPTZ,
  end_date                 TIMESTAMPTZ,
  stipend                  TEXT,
  mentor_name              TEXT,
  mentor_email             TEXT,
  is_erasmus               BOOLEAN NOT NULL DEFAULT FALSE,
  internship_status        internship_status,

  -- External source
  external_id              TEXT UNIQUE,
  source_url               TEXT,
  -- When the job was originally posted on the source careers site,
  -- parsed from the listing's "Posted Date" cell. Captured once on
  -- first sight and never overwritten on subsequent syncs (so the
  -- value remains the *original* posting date even if the listing
  -- re-renders the row weeks later).
  posted_at                TIMESTAMPTZ,

  -- Requirements
  required_language        TEXT,
  required_language_level  cefr_level,
  required_experience_type TEXT,
  min_years_experience     INTEGER,
  required_education_level education_level,
  -- TEXT[] list of must-have skills for the role.
  required_skills          TEXT[] NOT NULL DEFAULT '{}',

  -- Job-anchored matching: structured requirements extracted from the
  -- JD body by the LLM (Phase 1 of job-anchored matching). The version
  -- column lets us re-parse when the schema evolves.
  parsed_requirements         JSONB,
  parsed_requirements_version INTEGER,

  status                   job_status NOT NULL DEFAULT 'OPEN'
);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_jobs_status      ON jobs(status);
CREATE INDEX idx_jobs_external_id ON jobs(external_id);
CREATE INDEX idx_jobs_type        ON jobs(type);
CREATE INDEX idx_jobs_posted_at   ON jobs(posted_at DESC NULLS LAST);
-- Partial index: quickly find jobs still needing parsing
-- (used by the backfill script + post-sync extractor worker).
CREATE INDEX idx_jobs_parsed_requirements_pending
  ON jobs (id)
  WHERE parsed_requirements IS NULL AND source_url IS NOT NULL;


-- ----------------------------------------------------------------
-- 5. CANDIDATE RELATIONS (all cascade-delete with candidate)
-- ----------------------------------------------------------------

CREATE TABLE experiences (
  id                TEXT PRIMARY KEY,
  candidate_id      TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_title         TEXT NOT NULL,
  company           TEXT,
  location          TEXT,
  start_date        TEXT,
  end_date          TEXT,
  is_current        BOOLEAN NOT NULL DEFAULT FALSE,
  description       TEXT,
  is_relevant       BOOLEAN,
  relevance_score   FLOAT,
  relevance_reason  TEXT,
  -- Canonical Fields of Work this experience maps to (see
  -- src/client/lib/constants.ts FIELDS_OF_WORK). Emitted by the
  -- CV parser LLM; powers the per-field years vector used by the
  -- job-anchored matcher.
  fields_of_work    TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_experiences_candidate_id ON experiences(candidate_id);
-- GIN index for fast "which candidates have experience in field X"
CREATE INDEX idx_experiences_fields_of_work
  ON experiences USING GIN (fields_of_work);

-- -------

CREATE TABLE education (
  id             TEXT PRIMARY KEY,
  candidate_id   TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  institution    TEXT,
  degree         TEXT,
  field_of_study TEXT,
  start_date     TEXT,
  end_date       TEXT,
  level          education_level
);

CREATE INDEX idx_education_candidate_id ON education(candidate_id);

-- -------

CREATE TABLE candidate_languages (
  id                  TEXT PRIMARY KEY,
  candidate_id        TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  language            TEXT NOT NULL,
  self_declared_level cefr_level,
  assessed_level      cefr_level,
  UNIQUE(candidate_id, language)
);

CREATE INDEX idx_candidate_languages_candidate_id ON candidate_languages(candidate_id);

-- -------

CREATE TABLE skills (
  id           TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT,
  -- Skill verification status set by AI Interviewer / HR.
  -- Values: 'UNVERIFIED' (default) | 'PENDING' | 'PASSED' | 'FAILED' | 'OVERRIDDEN'
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  verified_at         TIMESTAMPTZ,
  verified_by         TEXT  -- 'AI' or HR user email
);

CREATE INDEX idx_skills_candidate_id ON skills(candidate_id);
CREATE INDEX idx_skills_verification_status
  ON skills(candidate_id, verification_status);

-- -------

CREATE TABLE candidate_tags (
  id           TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  tag          TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, tag)
);

CREATE INDEX idx_candidate_tags_candidate_id ON candidate_tags(candidate_id);

-- -------

CREATE TABLE candidate_notes (
  id           TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  author       TEXT NOT NULL,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_candidate_notes_updated_at
  BEFORE UPDATE ON candidate_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_candidate_notes_candidate_id ON candidate_notes(candidate_id);


-- ----------------------------------------------------------------
-- 6. JOB RELATIONS
-- ----------------------------------------------------------------

CREATE TABLE job_applications (
  id                    TEXT PRIMARY KEY,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_id                TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id          TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status                application_status NOT NULL DEFAULT 'SUBMITTED',
  notes                 TEXT,
  learning_agreement_url TEXT,
  UNIQUE(job_id, candidate_id)
);

CREATE TRIGGER trg_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_job_applications_job_id       ON job_applications(job_id);
CREATE INDEX idx_job_applications_candidate_id ON job_applications(candidate_id);
CREATE INDEX idx_job_applications_status       ON job_applications(status);

-- -------

CREATE TABLE job_matches (
  id           TEXT PRIMARY KEY,
  job_id       TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  match_score  FLOAT NOT NULL,
  breakdown    JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_job_matches_job_id       ON job_matches(job_id);
CREATE INDEX idx_job_matches_candidate_id ON job_matches(candidate_id);
CREATE INDEX idx_job_matches_score        ON job_matches(match_score);


-- ----------------------------------------------------------------
-- 7. ASSESSMENT TEMPLATES
-- ----------------------------------------------------------------

CREATE TABLE assessment_templates (
  id                      TEXT PRIMARY KEY,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name                    TEXT NOT NULL,
  description             TEXT,
  language                TEXT NOT NULL,
  cefr_level              cefr_level NOT NULL,
  type                    assessment_type NOT NULL,
  instructions            TEXT,
  listening_audio_url     TEXT,
  reading_text            TEXT,
  prompt_text             TEXT,
  duration_minutes        INTEGER NOT NULL DEFAULT 30,
  grammar_weight          INTEGER NOT NULL DEFAULT 20,
  vocabulary_weight       INTEGER NOT NULL DEFAULT 20,
  clarity_weight          INTEGER NOT NULL DEFAULT 20,
  fluency_weight          INTEGER NOT NULL DEFAULT 20,
  customer_handling_weight INTEGER NOT NULL DEFAULT 20,
  job_id                  TEXT REFERENCES jobs(id)
);

CREATE TRIGGER trg_assessment_templates_updated_at
  BEFORE UPDATE ON assessment_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_assessment_templates_lang_cefr ON assessment_templates(language, cefr_level);


-- ----------------------------------------------------------------
-- 8. ASSESSMENTS
-- ----------------------------------------------------------------

CREATE TABLE assessments (
  id           TEXT PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id       TEXT REFERENCES jobs(id),
  template_id  TEXT REFERENCES assessment_templates(id),
  magic_token  TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  accessed_at  TIMESTAMPTZ,
  type         assessment_type NOT NULL,
  status       assessment_status NOT NULL DEFAULT 'PENDING',
  language     TEXT NOT NULL
);

CREATE TRIGGER trg_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_assessments_candidate_id ON assessments(candidate_id);
CREATE INDEX idx_assessments_job_id       ON assessments(job_id);
CREATE INDEX idx_assessments_magic_token  ON assessments(magic_token);
CREATE INDEX idx_assessments_status       ON assessments(status);


-- ----------------------------------------------------------------
-- 9. ASSESSMENT RESULTS
-- ----------------------------------------------------------------

CREATE TABLE assessment_results (
  id                    TEXT PRIMARY KEY,
  assessment_id         TEXT NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grammar_score         FLOAT,
  vocabulary_score      FLOAT,
  clarity_score         FLOAT,
  fluency_score         FLOAT,
  customer_handling_score FLOAT,
  overall_score         FLOAT,
  cefr_estimation       cefr_level,
  is_borderline         BOOLEAN NOT NULL DEFAULT FALSE,
  audio_url             TEXT,
  transcript            TEXT,
  candidate_text        TEXT,
  feedback_summary      TEXT,
  raw_ai_response       JSONB
);


-- ----------------------------------------------------------------
-- 10. INTERVIEW SESSIONS
-- ----------------------------------------------------------------

CREATE TABLE interview_sessions (
  id                   TEXT PRIMARY KEY,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at           TIMESTAMPTZ,
  ended_at             TIMESTAMPTZ,
  evaluated_at         TIMESTAMPTZ,
  candidate_id         TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status               interview_session_status NOT NULL DEFAULT 'CREATED',
  target_skill         TEXT,
  -- Interview mode: 'TECHNICAL' (default) | 'LANGUAGE'.
  -- TECHNICAL = skill validation Q&A (single-topic enforcement).
  -- LANGUAGE  = free-form English conversation scored on CEFR rubric.
  interview_mode       TEXT NOT NULL DEFAULT 'TECHNICAL',
  signed_token_hash    TEXT NOT NULL,
  token_expires_at     TIMESTAMPTZ NOT NULL,
  consent_accepted_at  TIMESTAMPTZ,
  technical_decision   interview_decision,
  integrity_decision   integrity_decision,
  final_decision       interview_decision,
  evaluation_rationale JSONB,
  termination_reason   TEXT
);

CREATE TRIGGER trg_interview_sessions_updated_at
  BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_interview_sessions_candidate_id   ON interview_sessions(candidate_id);
CREATE INDEX idx_interview_sessions_status         ON interview_sessions(status);
CREATE INDEX idx_interview_sessions_token_expires  ON interview_sessions(token_expires_at);


-- ----------------------------------------------------------------
-- 11. INTERVIEW TRANSCRIPT TURNS
-- ----------------------------------------------------------------

CREATE TABLE interview_transcript_turns (
  id              TEXT PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interview_id    TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  raw_text        TEXT NOT NULL,
  normalized_text TEXT,
  sequence        INTEGER NOT NULL,
  turn_type       TEXT  -- 'core_answer' | 'clarification' | 'system'
);

CREATE INDEX idx_transcript_turns_interview_seq ON interview_transcript_turns(interview_id, sequence);


-- ----------------------------------------------------------------
-- 12. INTERVIEW PROCTORING EVENTS
-- ----------------------------------------------------------------

CREATE TABLE interview_proctoring_events (
  id           TEXT PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interview_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  severity     proctoring_severity NOT NULL,
  details      JSONB,
  occurred_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_proctoring_events_interview_time ON interview_proctoring_events(interview_id, occurred_at);
CREATE INDEX idx_proctoring_events_severity       ON interview_proctoring_events(severity);


-- ----------------------------------------------------------------
-- 13. IMPROVEMENT TRACKS
-- ----------------------------------------------------------------

CREATE TABLE improvement_tracks (
  id               TEXT PRIMARY KEY,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  candidate_id     TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  language         TEXT NOT NULL,
  target_level     cefr_level NOT NULL,
  status           track_status NOT NULL DEFAULT 'ENROLLED',
  start_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date         TIMESTAMPTZ NOT NULL,
  reassessment_id  TEXT
);

CREATE TRIGGER trg_improvement_tracks_updated_at
  BEFORE UPDATE ON improvement_tracks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_improvement_tracks_candidate_id ON improvement_tracks(candidate_id);
CREATE INDEX idx_improvement_tracks_status       ON improvement_tracks(status);


-- ----------------------------------------------------------------
-- 14. IMPROVEMENT PROGRESS
-- ----------------------------------------------------------------

CREATE TABLE improvement_progress (
  id           TEXT PRIMARY KEY,
  track_id     TEXT NOT NULL REFERENCES improvement_tracks(id) ON DELETE CASCADE,
  day          INTEGER NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes        TEXT,
  UNIQUE(track_id, day)
);

CREATE INDEX idx_improvement_progress_track_id ON improvement_progress(track_id);


-- ----------------------------------------------------------------
-- 15. NOTIFICATIONS
-- ----------------------------------------------------------------

CREATE TABLE notifications (
  id             TEXT PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type           notification_type NOT NULL,
  message        TEXT NOT NULL,
  read           BOOLEAN NOT NULL DEFAULT FALSE,
  archived       BOOLEAN NOT NULL DEFAULT FALSE,
  read_at        TIMESTAMPTZ,
  created_by     TEXT,
  metadata       JSONB,
  target_role    TEXT,
  job_id         TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id   TEXT REFERENCES candidates(id) ON DELETE CASCADE,
  application_id TEXT,
  campaign_id    TEXT REFERENCES promo_campaigns(id) ON DELETE SET NULL
);

CREATE INDEX idx_notifications_candidate_id ON notifications(candidate_id);
CREATE INDEX idx_notifications_target_role  ON notifications(target_role);
CREATE INDEX idx_notifications_read         ON notifications(read);
CREATE INDEX idx_notifications_archived     ON notifications(archived);
CREATE INDEX idx_notifications_created_at   ON notifications(created_at);
CREATE INDEX idx_notifications_type         ON notifications(type);


-- ----------------------------------------------------------------
-- 16. NOTIFICATION PREFERENCES
-- ----------------------------------------------------------------

CREATE TABLE notification_preferences (
  id                          TEXT PRIMARY KEY,
  candidate_id                TEXT NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
  job_notifications           BOOLEAN NOT NULL DEFAULT TRUE,
  internship_notifications    BOOLEAN NOT NULL DEFAULT TRUE,
  only_my_country             BOOLEAN NOT NULL DEFAULT FALSE,
  field_filters               TEXT[] NOT NULL DEFAULT '{}',
  promotional_notifications   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ----------------------------------------------------------------
-- 17. DISABLE RLS (all DB access is server-side via service role)
-- ----------------------------------------------------------------

ALTER TABLE candidates                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE experiences                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE education                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_languages         DISABLE ROW LEVEL SECURITY;
ALTER TABLE skills                      DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_tags              DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_notes             DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                        DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications            DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates        DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessments                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results          DISABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions          DISABLE ROW LEVEL SECURITY;
ALTER TABLE interview_transcript_turns  DISABLE ROW LEVEL SECURITY;
ALTER TABLE interview_proctoring_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE improvement_tracks          DISABLE ROW LEVEL SECURITY;
ALTER TABLE improvement_progress        DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications               DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences    DISABLE ROW LEVEL SECURITY;
ALTER TABLE promo_campaigns             DISABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_jobs                DISABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_weights             DISABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_presets             DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs                   DISABLE ROW LEVEL SECURITY;

-- Insert default scoring weights row
INSERT INTO scoring_weights (id, experience, years_of_experience, education_level, location_match, language)
VALUES ('default', 0.25, 0.10, 0.15, 0.15, 0.35)
ON CONFLICT (id) DO NOTHING;
