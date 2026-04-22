# adidas Talent Intelligence Platform — User Guide

> **Version:** 1.1 — April 2026
> **Platform URL:** [githubrepo-mocha.vercel.app](https://githubrepo-mocha.vercel.app)

---

## Table of Contents

### Part I — Candidate Guide
1. [Getting Started](#1-getting-started-candidate)
2. [Dashboard Overview](#2-candidate-dashboard-overview)
3. [CV Upload & Profile Creation](#3-cv-upload--profile-creation)
4. [Motivation Letter & Learning Agreement](#4-motivation-letter--learning-agreement)
5. [Browsing & Applying to Jobs](#5-browsing--applying-to-jobs)
6. [Browsing & Applying to Internships](#6-browsing--applying-to-internships)
7. [Tracking Your Applications](#7-tracking-your-applications)
8. [Language Assessments](#8-language-assessments)
9. [Notifications](#9-notifications-candidate)
10. [Profile & Settings](#10-profile--settings)

### Part II — HR Manager Guide
11. [Getting Started (HR)](#11-getting-started-hr)
12. [HR Dashboard Overview](#12-hr-dashboard-overview)
13. [Job Openings Management](#13-job-openings-management)
14. [Internship Management](#14-internship-management)
15. [CV Upload & Processing](#15-cv-upload--processing)
16. [Candidate Evaluation](#16-candidate-evaluation)
17. [Received Job Applications](#17-received-job-applications)
18. [Internship Applications](#18-internship-applications)
19. [Language Assessments (HR)](#19-language-assessments-hr)
20. [Analytics & Reporting](#20-analytics--reporting)
21. [Promotional Campaigns](#21-promotional-campaigns)
22. [Notifications (HR)](#22-notifications-hr)
23. [Improvement Tracks](#23-improvement-tracks)
24. [Data Export](#24-data-export)

### Part III — Feature Status Reference
25. [Feature Roadmap & Implementation Status](#25-feature-roadmap--implementation-status)

---

# Part I — Candidate Guide

---

## 1. Getting Started (Candidate)

### Signing In

1. Open the platform URL in your browser.
2. Click **"Sign in with Google"** on the landing page.
3. The platform uses **Supabase Auth** with Google OAuth as the only sign-in method — no password required.
4. Your role (`candidate` or `hr`) is assigned server-side and stored in your Supabase session; it cannot be changed from the browser.

### What You Can Do

As a candidate, the platform allows you to:

- Upload and manage your CV (auto-parsed by AI)
- Upload a motivation letter and learning agreement
- Browse open job positions and internships
- Apply to positions with one click
- Track all your applications and their statuses
- Take **written** language assessments and **real-time AI interviews** via secure magic links
- Complete per-skill verifications (role-play Q&A graded by AI)
- Receive notifications about new jobs, status updates, and announcements
- Manage your profile and notification preferences

> **Note:** Authentication is enforced at the middleware layer — unauthenticated requests to `/api/*` return `401`, and HR-only endpoints return `403` for non-HR users.

---

## 2. Candidate Dashboard Overview

After selecting your role, you land on the **Dashboard** page. This shows:

| Section | Description |
|---------|-------------|
| **Total Applications** | How many jobs you've applied to. |
| **In Progress** | Applications with status Submitted or Under Review. |
| **Completed** | Applications that are Accepted, Rejected, Hired, or Withdrawn. |
| **CV Upload Zone** | Quick-access drag-and-drop area to upload or re-upload your CV. |
| **Motivation Letter** | Section to upload an optional motivation letter (max 10 MB). |
| **Learning Agreement** | Section to upload a learning agreement (for Erasmus/internship candidates). |

### Sidebar Navigation

The candidate sidebar provides access to:

| Menu Item | Destination |
|-----------|-------------|
| Dashboard | Home overview with stats and document uploads |
| Job Openings | Browse and apply to jobs |
| My Applications | Track submitted applications |
| Internship Applications | Track internship-specific applications |
| Assessments | View pending and completed language assessments |
| CV Upload | Upload/re-upload your CV |
| Notifications | View all notifications and announcements |
| Settings | Edit your profile and notification preferences |

---

## 3. CV Upload & Profile Creation

### How to Upload Your CV

1. Navigate to **CV Upload** from the sidebar (or use the dashboard upload zone).
2. **Drag and drop** your file onto the upload area, or click to browse files.
3. Accepted formats: **PDF**, **DOCX**, **TXT** (max 10 MB).
4. A progress bar shows the upload status.

### What Happens After Upload

The platform uses AI to automatically extract structured information from your CV:

- **Personal Information:** First name, last name, email, phone, location, country, LinkedIn URL
- **Work Experience:** Job title, company, location, dates, description, current role flag
- **Education:** Institution, degree, field of study, dates, education level
- **Languages:** Language name and self-declared proficiency level
- **Skills:** Skill name and category

### Reviewing & Editing Extracted Data

After the AI extracts your data:

1. All extracted fields are displayed in an **editable preview panel**.
2. Review each section (personal info, experiences, education, languages, skills).
3. Click into any field to correct or add missing information.
4. For languages, use the **CEFR level dropdown** (A1 → C2) to set your proficiency.
5. Click **Save** to confirm and store the data to your profile.

### Duplicate Detection

If you upload a CV with the same email as an existing candidate, the system detects it:
- **Exact match (email):** 100% confidence — links to existing profile.
- **Name + location match:** 85% confidence — flags as likely duplicate.
- **Name only match:** 50% confidence — flags for manual review.

You can re-upload your CV at any time to update your profile with new information.

---

## 4. Motivation Letter & Learning Agreement

### Motivation Letter

1. Go to the **Motivation Letter** tab in CV Upload or the dashboard upload zone.
2. Upload a file (PDF, DOCX, TXT — max 10 MB).
3. The system extracts the text content and stores it alongside your profile.
4. This document is available to HR when reviewing your application.

### Learning Agreement (Erasmus / Internship Candidates)

1. Go to the **Learning Agreement** tab.
2. Upload your signed learning agreement document.
3. The document URL is stored and linked to your profile.
4. HR managers can access this when reviewing your internship application.

---

## 5. Browsing & Applying to Jobs

### Finding Jobs

1. Navigate to **Job Openings** from the sidebar.
2. Use the **search bar** to search by job title, department, location, or country.
3. Use **filters** to narrow results:
   - **Job Type:** Full-time, Part-time, Contract, Internship
   - **Department:** Filter by department name
4. Results are paginated (default 100 per page).

### Job Card Information

Each job card displays:
- Job title
- Job type badge (e.g., Full-time, Internship)
- Department, location, and country
- Status (Open, Draft, Closed, Archived)
- Link to original job posting (if available from external source)

### Applying to a Job

1. Hover over a job card to reveal the **Apply** button.
2. Click **Apply** — the system immediately submits your application.
3. A confirmation message appears:
   - ✅ **"Application submitted"** — if successful.
   - ⚠️ **"Already applied"** — if you've previously applied to this job.
4. You can only submit **one application per job**.

---

## 6. Browsing & Applying to Internships

### Finding Internships

1. Navigate to **Job Openings** and filter by type **Internship**, or browse the dedicated **Internships** section if available.
2. Internships marked as **Active** are available for applications.
3. Each internship card shows:
   - Title with a graduation cap icon
   - Department, location, country
   - Start/end date range
   - Stipend amount (if specified)
   - **Erasmus+** badge (if the internship is part of the Erasmus programme)
   - Mentor name and email

### Applying

The application process is the same as for regular jobs — click the **Apply** button. If a learning agreement is required, you can upload it via the **Learning Agreement** tab.

---

## 7. Tracking Your Applications

### My Applications Page

Navigate to **My Applications** to see all your submissions.

#### Application Statuses

| Status | Meaning |
|--------|---------|
| **Submitted** | Your application has been received. |
| **Under Review** | HR is actively reviewing your application. |
| **Invited** | You've been invited for an assessment. |
| **Assessed** | Your assessment has been completed and scored. |
| **Shortlisted** | You've advanced to the next stage. |
| **Rejected** | Your application was not selected. |
| **Withdrawn** | You withdrew your application. |

#### Page Layout

- **Active Applications:** All non-withdrawn, non-rejected applications appear at the top.
- **Past Applications:** Withdrawn and rejected applications appear in a separate section.
- **Stats Cards:** Show total active applications and pending review count.

#### Withdrawing an Application

For any active application, click the **Withdraw** button. This action:
- Changes the application status to **Withdrawn**.
- Moves it to the Past Applications section.
- Notifies HR of the withdrawal.

### Internship Applications

Navigate to **Internship Applications** for a filtered view showing only internship-type applications. This includes:
- All the same status tracking as regular applications.
- **Learning Agreement link** (if you uploaded one) — click to view or download.
- Erasmus badge indicator.

---

## 8. Language Assessments

The platform supports **two assessment modes**. HR chooses the mode when inviting you; you take them both through a magic link.

### How Assessments Work

When HR invites you for an assessment, you'll receive:

1. A **notification** in the Notifications panel.
2. A **magic link** — a unique, time-limited URL sent to your email.

### Mode 1: Written Assessment (async, LLM-graded)

| Type | Duration | What You Do |
|------|----------|-------------|
| **Written Response** | ~30 min | Read prompts and provide written answers. Auto-graded by LLM against a rubric. |

Submit when complete and the system scores the response immediately, producing a CEFR estimate plus sub-scores.

### Mode 2: AI Interview (real-time, voice)

A live conversational interview powered by a FastAPI sidecar service.

- **Whisper STT** transcribes your voice turn-by-turn.
- **GPT-4o-mini** plays the interviewer role and follows a scripted rubric.
- Each turn is scored as it happens; a final verdict (PASS / FAIL) is issued at the end with an **evidence array** justifying the decision.
- **Guardrail:** If the model returns a FAIL with no evidence, the system auto-promotes it to PASS to avoid silent hallucinated rejections.
- Typical duration: ~15–20 minutes, ~6–8 turns.

### Per-Skill Verification (role-play)

For specific skills listed on your CV, HR can request a short role-play Q&A. You'll be prompted with scenario-based questions and your answers are graded by an LLM against the skill's expected competencies. Results are stored in the `skill_verifications` table and visible on your profile.

### Taking an Assessment

1. Click the magic link from your email or notification.
2. The assessment page loads — no login required; the token itself authorises access.
3. For the **interview mode**, grant microphone access when prompted.
4. Follow the on-screen instructions.
5. Submit when complete.

> **Important:** Magic links expire after **48 hours** by default. A countdown shows time remaining. Once expired, the assessment becomes unavailable.

### Viewing Results

After scoring, your assessment results page shows:
- **Overall score** (out of 100)
- **CEFR level** (A1 Beginner → C2 Proficient)
- **Detailed dimension scores** (Grammar, Vocabulary, Clarity, Fluency, and for interviews: Pronunciation, Coherence)
- **AI-generated feedback** summary
- **Evidence trail** (for interview mode) — the specific turns that justified the verdict
- **Borderline indicator** — if your score falls between 45–60, HR may offer an improvement track

---

## 9. Notifications (Candidate)

### Notification Center

Navigate to **Notifications** to see all messages and alerts.

#### Types of Notifications You Receive

| Category | Notification Types |
|----------|--------------------|
| **Jobs** | New Job Posted, New Internship Posted, Job Status Changed |
| **Applications** | Application Received (confirmation), Status Changed, Withdrawal Confirmed |
| **Assessments** | Assessment Invitation, Assessment Completed (results available) |
| **Profile** | CV Upload Confirmed, Candidate Status Change |
| **Promotional** | HR announcements and campaigns (rich text with images and links) |

#### Features

- **Unread badge:** Shows the count of unread notifications.
- **Mark as Read:** Click the checkmark icon on any notification.
- **Mark All as Read:** Bulk-mark all notifications as read.
- **Pinned campaigns:** Important HR announcements appear at the top.
- **Rich content:** Promotional notifications may include formatted text, images, and clickable links.

#### Notification Filtering

Notifications respect your preferences (see Settings). If you've opted out of job or promotional notifications, those types won't appear.

> **Note:** Archived campaigns (campaigns the HR team has retired) are automatically hidden from your view.

---

## 10. Profile & Settings

### Editing Your Profile

Navigate to **Settings** to manage your personal information.

#### Personal Information Fields

| Field | Description |
|-------|-------------|
| First Name / Last Name | Your full name |
| Email | Contact email |
| Phone | Phone number |
| Location / Country | Where you're based |
| LinkedIn URL | Link to your LinkedIn profile |
| Date of Birth | Your date of birth |
| Nationality | Searchable dropdown (195+ nationalities) |
| Bio | Short description about yourself |

#### Career Preferences

| Field | Options |
|-------|---------|
| Willing to Relocate | Yes / No toggle |
| Availability | Immediately, 1 month, 2 months, 3+ months |
| Work Model | Remote, Hybrid, On-site |

### Notification Preferences

Customize what notifications you receive:

| Toggle | Effect |
|--------|--------|
| **Job notifications** | Receive alerts when new jobs are posted. |
| **Internship notifications** | Receive alerts for new internships. |
| **Only my country** | Only receive notifications for positions in your country. |
| **Highlights & announcements** | Receive promotional campaigns from HR. |
| **Field of work filter** | Select specific fields (e.g., Computer Science, Marketing, Engineering) — you'll only receive notifications for matching positions. Leave empty to receive all. |

Changes are saved automatically when you toggle a preference.

---

# Part II — HR Manager Guide

---

## 11. Getting Started (HR)

### Signing In as HR

1. Open the platform URL.
2. Click **"Sign in with Google"** on the landing page.
3. If your account's `app_metadata.role` is `hr` (assigned server-side by the platform administrator), you'll land on the HR dashboard automatically.
4. HR-only API endpoints (rescore, rerank, scoring, export, campaigns, job sync, bulk upload, analytics) are protected at the middleware layer — `403` is returned for non-HR users.

### What You Can Do

As an HR manager, the platform provides:

- Create, edit, and manage job openings and internships
- Bulk-sync jobs from the adidas careers website
- Upload and AI-parse candidate CVs (single or bulk with async processing)
- Evaluate candidates with AI-powered scoring
- Review and manage all received applications
- Invite candidates for written assessments, real-time AI interviews, or skill verification
- View analytics on the recruitment pipeline and performance
- Create and send targeted promotional campaigns
- Manage notifications for all recruitment events
- Export candidate data to CSV

> **Note:** Role assignment (HR vs candidate) is controlled by the platform administrator through Supabase's `app_metadata` and cannot be escalated by users.

---

## 12. HR Dashboard Overview

The main HR dashboard displays four key performance indicator cards:

| Card | Data |
|------|------|
| **Total Candidates** | Number of candidate profiles in the system |
| **Open Positions** | Number of currently open job listings |
| **Total Applications** | All applications received across all jobs |
| **Shortlisted** | Candidates that have been shortlisted |

Data is fetched in real-time from the `/api/analytics` endpoint.

### HR Sidebar Navigation

| Section | Menu Items |
|---------|------------|
| **Dashboard** | Home, Settings, Notifications |
| **Recruiting** | Job Openings, Job Applications, Candidates Evaluation |
| **Internships** | Internships, Internship Applications |
| **Processing & Analytics** | CV Upload & Processing, Analytics |

---

## 13. Job Openings Management

### Viewing Jobs

The **Job Openings** page shows all job listings with:
- Job title (links to external posting if available)
- Department, location, country badges
- Status badge: **Open**, **Draft**, **Closed**, **Archived**
- Type badge: **Full-time**, **Part-time**, **Internship**, **Contract**
- Match count (candidates matched) and assessment count
- Edit and Delete action buttons

### Searching & Filtering

- **Search bar:** Full-text search across title, department, location, country.
- **Department filter:** Multi-select combobox to filter by department.
- **Country filter:** Multi-select combobox to filter by country.
- **Pagination:** Navigate through results (20 per page) with first/prev/next/last controls.

### Creating a New Job

1. Click the **"New Job"** button.
2. Fill in the form:

| Field | Required | Description |
|-------|----------|-------------|
| Title | ✅ | Job title |
| Type | No | Full-time (default), Part-time, Contract, Internship |
| Department | No | Department name |
| Location / Country | No | Job location |
| Description | No | Full job description |

3. **Optional Requirements** (expand the section):
   - Required Language and target CEFR Level (A1–C2)
   - Experience Type and Minimum Years
   - Education Level
4. Click **Save** to create the job as a new listing.

### Editing a Job

Click the **pencil icon** on any job card to open the edit dialog. Make changes and save.

### Deleting a Job

Click the **trash icon** on a job card. The job and all associated data are removed.

### Syncing Jobs from adidas Careers Website

1. Click the **Sync Jobs** button (refresh icon).
2. The system scrapes the adidas careers page using a Cheerio-based web scraper.
3. A results banner shows:
   - Jobs scraped, created, updated, failed
   - Duration of the sync operation
4. Newly found jobs are created; existing jobs (matched by external ID) are updated.

> The scraper can retrieve all ~1,019 adidas job listings across 50+ countries and 16 departments.

---

## 14. Internship Management

### Viewing Internships

The **Internships** page shows all internship listings. Each card displays:
- Title with graduation cap icon
- Department, location, country
- Status: **Draft**, **Active**, **Inactive**, **Finished**
- Start/end date range
- Stipend amount
- **Erasmus+** badge (if applicable)
- Mentor name and email
- Language, experience, and education requirements (if set)
- Match count and assessment count

### Creating an Internship

1. Click **"Create New Internship"**.
2. Fill in the standard job fields (title, department, location, country, description).
3. **Internship-specific fields:**

| Field | Description |
|-------|-------------|
| Start Date | When the internship begins |
| End Date | When the internship ends |
| Status | Draft, Active, Inactive, Finished |
| Stipend | Compensation (e.g., "€800/month") |
| Erasmus+ | Checkbox — mark as Erasmus programme |
| Mentor Name | Supervising mentor's name |
| Mentor Email | Mentor's contact email |

4. Optional requirements (language, experience, education) — same as for jobs.
5. Save to create the internship.

### Editing & Deleting

Same as for regular jobs — use the pencil/trash icons on each card.

> **Tip:** Only **Active** internships are visible to candidates. Use Draft status to prepare listings before publishing.

---

## 15. CV Upload & Processing

### Single CV Upload (HR)

1. Navigate to **CV Upload & Processing**.
2. Drag and drop a candidate's CV (PDF, DOCX, or TXT — max 10 MB), or click to browse.
3. The AI pipeline runs a 9-stage process:
   - File validation → Cloud storage → Text extraction → LLM parsing → Schema validation → Deduplication → Candidate creation/update → CV scoring → Complete
4. The parsed results appear in an editable preview.
5. Review and correct extracted data as needed.
6. Click **Save** to store the candidate profile.

### What the AI Extracts

- Full name, email, phone, location, country, LinkedIn URL
- Complete work history (title, company, dates, description)
- Education history (institution, degree, field, dates, level)
- Languages with proficiency levels
- Skills categorized by type

### Duplicate Handling

The system checks for duplicates at three tiers:
1. **Email match → 100% confidence** — updates existing candidate
2. **Name + location → 85% confidence** — flags as likely duplicate
3. **Name only → 50% confidence** — flags for manual review

If a duplicate is detected, you'll see a "Duplicate Of" link to the existing profile.

### CV Scoring

Each uploaded CV is automatically scored on four dimensions:

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| Experience Quality | 35% | Relevance and depth of work experience |
| Years of Experience | 25% | Total professional experience |
| Education Level | 20% | Highest qualification and field relevance |
| Location Match | 20% | Proximity to job location |

Score colors: 🟢 Green (≥70), 🟡 Yellow (≥45), 🔴 Red (<45).

### Bulk Upload

Bulk upload is fully functional via `POST /api/upload/bulk` (HR-only, middleware-enforced). The endpoint:

1. Accepts a ZIP or multiple files and immediately creates a `parsing_jobs` row.
2. Returns a **`202 Accepted`** response with `{ parsingJobId }`.
3. Uses Next.js **`after()`** to run the parsing pipeline asynchronously — extraction → LLM parse → dedup → upsert → score — after the HTTP response has been sent.
4. The UI polls `GET /api/parsing-jobs/[id]` for progress and displays a live counter of `parsedFiles` / `failedFiles`.

> ZIP archive extraction is supported; scanned/image-based PDFs are flagged for manual review in the job's `errorLog`.

---

## 16. Candidate Evaluation

### Candidates List

Navigate to **Candidates Evaluation** to view the full talent pool.

#### Search & Filter

- **Search bar:** Search by name or email.
- **Status filter:** Dropdown to filter by candidate pipeline status:
  - New, Parsed, Screened, Invited, Assessed, Shortlisted, Borderline, On Improvement Track, Rejected, Hired

#### Candidate Table

| Column | Description |
|--------|-------------|
| Name | Candidate's full name (click to open profile) |
| Location | City/country |
| Status | Current pipeline status badge |
| CV Score | Overall score with visual color-coded bar |
| Score Breakdown | Per-dimension scores with confidence indicators (high/medium/low) |
| Languages | Self-declared languages |
| Added Date | When the candidate was added to the system |
| Shortlist | Star icon toggle to shortlist candidates |
| Review | 3-state toggle: No state → Needs Review → Reviewed |

- **Sortable columns:** Name, CV Score, Added Date — click column header to toggle ascending/descending.
- **Pagination:** 20 candidates per page with navigation controls.
- **Location filter:** Filter by city or country.
- **Status dropdown:** Assign pipeline status per candidate: SCREENED → INVITED → ASSESSED → SHORTLISTED → BORDERLINE → ON_IMPROVEMENT_TRACK → REJECTED → HIRED.
- Click any row to navigate to the **candidate detail page**.

### Scoring Weights & Presets

HR managers can customize how candidates are scored by adjusting the component weights:

1. Click the **"Scoring Weights"** button above the candidates table.
2. A modal opens with **5 sliders** (one per scoring dimension):
   - Experience Relevance (default 30%)
   - Years of Experience (default 20%)
   - Education Level (default 20%)
   - Location Match (default 15%)
   - Language Proficiency (default 15%)
3. Drag any slider to adjust. Weights are automatically normalized to sum to 100%.
4. Candidates **re-rank in real-time** as you adjust.

#### Quick Presets

Select from built-in presets for common scenarios:
- **Balanced** — Equal consideration across all dimensions
- **Experience-focused** — Prioritizes work experience
- **Education-focused** — Prioritizes qualifications
- **Language-focused** — Prioritizes language proficiency
- **Location-focused** — Prioritizes geographic proximity

#### Saving Custom Presets

1. Adjust sliders to your preferred configuration.
2. Enter a name in the "Save as preset" field.
3. Click **Save** — the preset appears in the preset grid.
4. Custom presets can be deleted via the trash icon.

### Candidate Detail Page

The candidate detail page displays the full parsed CV (personal info, experiences, education, languages, skills) plus application history, assessment results with evidence trails (for interview mode), skill verification outcomes, CV score breakdown, and collaborative notes.

### Collaborative Notes

Notes are fully functional: use the rich-text editor (powered by TipTap) on the candidate detail page to add timestamped notes. All notes are persisted via `POST /api/candidates/[id]/notes` (Zod-validated) and render in reverse chronological order.

### Candidate Tagging

> **🚧 Partially Implemented:** The database model for candidate tags exists, but the API endpoints and UI for creating and managing tags are not yet completed.

---

## 17. Received Job Applications

### Viewing Applications

Navigate to **Job Applications** (under Recruiting) to see all received applications.

#### What's Displayed

Each application card shows:
- **Job title** with department, location, and country
- **Application status** badge (color-coded)
- **Candidate information:** Name and email (highlighted box)
- **Applied date**
- **Link to external job posting** (if synced from external source)

#### Status Badges

| Status | Color | Meaning |
|--------|-------|---------|
| Submitted | Blue | Newly received application |
| Under Review | Yellow | HR is reviewing |
| Invited | Purple | Assessment invitation sent |
| Assessed | Indigo | Assessment completed |
| Shortlisted | Green | Candidate advanced |
| Rejected | Red | Application declined |
| Withdrawn | Gray | Candidate withdrew |

#### Search

Use the search bar to search across job title, candidate name, email, department, location, and country.

> **Note:** Withdrawn applications and internship applications are automatically excluded from this view. See the Internship Applications section for internship-specific applications.

---

## 18. Internship Applications

### Viewing Internship Applications

Navigate to **Internship Applications** (under Internships) for a filtered view of internship-specific applications.

This view is identical to job applications but:
- Only shows applications where the job type is **Internship**.
- Displays a **graduation cap** icon in the header.
- Shows a **Learning Agreement** link when the candidate has uploaded one.
- Excludes withdrawn applications.

---

## 19. Language Assessments (HR)

### Assessment Overview

The **Assessments** page lets you manage language verification assessments. The platform supports **two modes** and a complementary **skill verification** flow.

### Mode A — Written Assessment (async, LLM-graded)

| Aspect | Detail |
|--------|--------|
| Duration | ~30 min |
| Inputs | Text prompts + written answers |
| Scoring | LLM-graded against a rubric; Zod-validated output |
| Turnaround | Scored immediately on submission |

### Mode B — AI Interview (real-time, voice)

Backed by a FastAPI sidecar (`ai_interviewer_backend/`) running Whisper STT + GPT-4o-mini.

| Aspect | Detail |
|--------|--------|
| Endpoint flow | `/api/interview/realtime/session` → `/turn` (per exchange) → `/complete` |
| Persistence | `evaluation_rationale` JSONB column stores `turn_count` + `evidence` array |
| Guardrails | `evaluator.py` enforces non-empty evidence, turn-count threshold, `max_tokens=500` |
| Anti-hallucination | Empty-evidence FAIL verdicts are auto-promoted to PASS |
| Sub-scores | Pronunciation, Fluency, Grammar, Vocabulary, Coherence |

### Per-Skill Verification

Stored in the `skill_verifications` table. For any skill on a candidate's profile you can launch a short **role-play Q&A**: the LLM plays a scenario partner, the candidate answers, and the LLM grades the competency evidence. Results appear on the candidate profile.

#### Assessment Statuses

| Status | Description |
|--------|-------------|
| Pending | Created but not started — shows countdown to expiry |
| In Progress | Candidate is currently taking the assessment |
| Submitted | Completed, awaiting AI scoring |
| Scored | AI has scored the assessment |
| Reviewed | HR has reviewed the scored assessment |
| Expired | Time limit passed without completion |

### Creating an Assessment

1. Select a candidate and a job.
2. Choose a mode (**Written** or **Interview**) — or use a saved template.
3. The system generates a **magic link** — a unique, time-limited URL.
4. The magic link is sent to the candidate via email (Resend integration) with a copy-link fallback in the UI.
5. The link expires after 48 hours by default.

### Reviewing Results

For scored assessments, the results panel shows:
- **Overall score** (0–100) with CEFR level estimation
- **Dimension scores** (mode-dependent)
- **AI-generated feedback** text
- **Evidence trail** (interview mode): the specific user turns and interviewer prompts that justified the verdict
- **Borderline indicator:** Candidates scoring 45–60 are flagged for potential improvement track

#### CEFR Level Guide

| Level | Label | Score Range |
|-------|-------|-------------|
| A1 | Beginner | 0–19 |
| A2 | Elementary | 20–39 |
| B1 | Intermediate | 40–59 |
| B2 | Upper Intermediate | 60–74 |
| C1 | Advanced | 75–89 |
| C2 | Proficient | 90–100 |

---

## 20. Analytics & Reporting

The Analytics page provides HR managers with real-time aggregate statistics across the entire recruitment pipeline. Data is rendered using the Recharts charting library (v3.7).

### Analytics Dashboard Views

| Chart | Type | Description |
|-------|------|-------------|
| **Overview Cards** | Stats | Total candidates, open positions, applications, shortlisted, assessments |
| **Candidate Pipeline** | Bar Chart | Count per status: NEW → PARSED → SCREENED → INVITED → ASSESSED → SHORTLISTED → BORDERLINE → ON_IMPROVEMENT_TRACK → REJECTED → HIRED |
| **Candidates by Country** | Pie Chart | Top 10 countries by candidate count |
| **Top Skills** | Horizontal Bar | Top 15 most common skills across all candidates |
| **Applications per Job** | Bar Chart | Top 10 jobs by application volume (with job titles) |
| **Application Trend** | Line Chart | Daily application count over last 30 days |
| **Score Distribution** | Histogram | Distribution of CV scores in 5 buckets: 0–20, 21–40, 41–60, 61–80, 81–100 |

All data is served from the `GET /api/analytics` endpoint, which runs 7 parallel database queries for maximum speed.

---

## 21. Promotional Campaigns

### Campaign Overview

The campaign system allows HR to create and send rich promotional announcements to candidates. Campaigns appear in candidates' notification feeds.

### Campaign Lifecycle

Campaigns follow a linear four-stage lifecycle:

```
Draft  →  Sent  →  Terminated  →  Archived
```

| Status | Meaning |
|--------|---------|
| **Draft** | Being prepared — not visible to candidates. Can be edited, sent, or deleted. |
| **Sent** | Live and visible to candidates. Shows read statistics. Can be terminated or cloned. |
| **Terminated** | Stopped — still visible to candidates who received it. Can be archived. |
| **Archived** | Hidden from candidates entirely. Can be deleted. Data retained for HR reference. |

### Creating a Campaign

1. Navigate to **Notifications** from the sidebar.
2. Click **"New Campaign"** button.
3. Fill in the campaign form:

| Field | Description |
|-------|-------------|
| **Title** | Campaign headline (required) |
| **Body** | Rich text content — supports bold, italic, underline, links, images, colors, text alignment (powered by TipTap editor with 8 extensions) |
| **Link URL** | Optional call-to-action URL |
| **Pinned** | Toggle to pin the campaign to the top of candidates' notification feeds |
| **Scheduled At** | Optional — schedule the campaign for a future date/time |

4. **Targeting Options:**

| Target Method | Description |
|---------------|-------------|
| All Candidates | Send to everyone |
| By Country | Select specific countries |
| By Field of Work | Select specific fields (Computer Science, Marketing, etc.) |
| By Education Level | Target by Bachelor, Master, PhD, etc. |
| By Email | Target specific email addresses |

5. An **audience preview** shows the estimated number of recipients before sending.
6. Save as **Draft** (default) to edit later, or proceed to send immediately.

### Sending a Campaign

1. On a Draft campaign card, click **"Send"**.
2. The system:
   - Fetches all candidates matching the targeting criteria.
   - Checks each candidate's notification preferences (opt-out respected).
   - Creates individual notifications in batches of 500.
   - Updates the campaign status to **Sent**.
3. The campaign card now shows read statistics.

### Campaign Actions by Status

| Status | Available Actions |
|--------|-------------------|
| **Draft** | Preview, Edit, Send, Delete, Clone |
| **Sent** | Preview, Terminate, Clone |
| **Terminated** | Preview, Archive, Clone |
| **Archived** | Preview, Delete, Clone |

- **Clone:** Creates a new Draft campaign with the same content and targeting (appends "(copy)" to title).
- **Delete:** Permanently removes the campaign and all associated notifications. Only available for Draft and Archived campaigns. A confirmation dialog is shown before deletion.

### Read Statistics

For Sent, Terminated, and Archived campaigns, the card shows:
- Total recipients
- Read count and percentage (e.g., "72% read (36/50)")

### Candidate-Side View

- Candidates see campaigns as notifications in their feed.
- **Pinned** campaigns appear at the top.
- **Archived** campaigns are hidden from the candidate view.
- Campaigns respect each candidate's notification preferences — candidates who opted out of promotional notifications won't receive them.

---

## 22. Notifications (HR)

### HR Notification Feed

HR managers receive automatic notifications for recruitment events:

| Notification Type | When It Triggers |
|-------------------|-----------------|
| HR Application Received | A candidate applies to a job |
| HR Application Withdrawn | A candidate withdraws their application |
| HR Assessment Completed | A candidate finishes an assessment |
| HR CV Uploaded | A new candidate CV is processed |

### Managing Notifications

- **Unread badge:** Bell icon in the header shows the unread count.
- **Mark as Read:** Click the checkmark icon on individual notifications.
- **Mark All as Read:** Bulk action to clear all unread badges.
- Notifications show **candidate name and email** alongside **job title and location** for context.

---

## 23. Improvement Tracks

> **🚧 Placeholder:** The Improvement Tracks page exists in the dashboard but is currently a stub. The feature is designed for borderline candidates (score 45–60) who are close to meeting requirements.

### Planned Feature: 14-Day Improvement Programme

The full implementation will include:

| Component | Description |
|-----------|-------------|
| **Track Enrollment** | HR enrolls borderline candidates into a 2-week micro-learning programme |
| **Daily Lessons** | Content modules delivered over 14 days, focused on the candidate's weak areas |
| **Progress Tracking** | Visual dashboard showing daily completion and engagement |
| **Reassessment** | After programme completion, the candidate is offered a new language assessment |

#### Planned Status Lifecycle

| Status | Meaning |
|--------|---------|
| Enrolled | Candidate has been added to the programme |
| In Progress | Candidate is actively completing daily modules |
| Completed | All 14 days completed |
| Reassessment Pending | Waiting for the candidate to retake the assessment |
| Reassessed | Second assessment completed |

> The database models (`ImprovementTrack`, `ImprovementProgress`) are in place. The daily lesson content, progress logic, and reassessment flow are not yet implemented.

---

## 24. Data Export

### CSV Export

The platform supports exporting candidate data to CSV format using the **papaparse** library.

Export includes:
- Candidate personal info (name, email, location, country)
- Pipeline status
- CV scores (overall, experience, education, location)
- Languages and skill summaries
- Filter-aware — respects current search and filter criteria

### PDF Export

> **🚧 Planned:** PDF export for individual candidate profiles, assessment results, and fairness reports is not yet implemented.

---

# Part III — Feature Status Reference

---

## 25. Feature Roadmap & Implementation Status

### ✅ Fully Implemented

| Feature | Description |
|---------|-------------|
| **Authentication** | Supabase Auth + Google OAuth; role stored in `app_metadata.role` (server-only writes) |
| **Authorization / RBAC** | Middleware-level gating: `PUBLIC_API_PREFIXES` + `HR_ONLY_API_PREFIXES`; `401`/`403` at the edge; RLS on candidate-owned tables |
| **Role-based dashboard** | Separate candidate and HR views with tailored navigation |
| **AI-powered CV parsing** | Groq Llama 3.3 70B (primary) + OpenAI GPT-4o (fallback) extract structured data |
| **CV scoring engine** | Deterministic 4-factor scoring: experience (35%), years (25%), education (20%), location (20%) |
| **Scoring weights & presets** | Configurable 5-dimension scoring with real-time re-ranking, built-in quick presets, custom preset save/delete |
| **Duplicate detection** | 3-tier matching (email → name+location → name only) |
| **Job management** | Full CRUD for jobs with search, filter, pagination |
| **Job scraping** | Cheerio-based scraper for adidas careers (1,019 jobs, 50+ countries, 16 departments) |
| **Internship management** | Full CRUD with Erasmus+ support, mentor info, date ranges, stipend |
| **Job applications** | Apply, withdraw, status tracking with one-application-per-job constraint |
| **Job-candidate matching** | 4-criteria engine: location, language+CEFR, experience, education |
| **HR bulk CV upload** | 202-Accepted + Next.js `after()` async pipeline + `parsing_jobs` progress polling (ZIP supported) |
| **Written assessments** | Async, LLM-graded, CEFR estimation, rubric sub-scores |
| **AI Interview assessments** | Real-time FastAPI sidecar, Whisper STT + GPT-4o-mini, evidence-array guardrails, auto-PASS on empty-evidence FAIL |
| **Per-skill verification** | LLM role-play Q&A graded against skill rubric; stored in `skill_verifications` |
| **Magic link assessments** | Token generation, email delivery via Resend, 48h expiry, public `/assess/[token]` portal |
| **Candidate detail page** | Full CV data, application history, assessment + interview results (with evidence), skill verifications, scoring breakdown, notes |
| **Collaborative notes** | TipTap rich text editor, timestamped history, Zod-validated API |
| **Notification system** | 16+ notification types, preference-aware targeting, read/unread management |
| **Promotional campaigns** | Rich text campaigns, targeting (country/field/education/email), lifecycle (Draft→Sent→Terminated→Archived), read statistics, pinning |
| **Candidate profile** | Personal info, career preferences (availability, work model, relocation), nationality, bio |
| **Analytics dashboard** | Recharts-powered: pipeline, country distribution, top skills, top languages, applications per job, trends, score distribution (HR-only, middleware-enforced) |
| **File storage** | `LocalStorageService` (dev) and `SupabaseStorageService` (prod) — conditional binding on `SUPABASE_SERVICE_ROLE_KEY` |
| **CSV export** | Filter-aware candidate data export via papaparse |
| **Candidate activation + invitation** | HR invitations + activation tokens flow into the magic-link portal |
| **Unit test suite** | **101 tests across 6 files** (cv-validation, scoring, matching, text-extraction, upload pipeline, interview runtime) |
| **Cloud deployment** | Vercel (Next.js) + Supabase (Postgres + Auth + Storage) + separate host for FastAPI sidecar |

### ⚠️ Partially Implemented

| Feature | What Works | What's Missing |
|---------|------------|----------------|
| **Candidate tagging** | Database model exists | API endpoints and UI |
| **Improvement tracks** | Database models, borderline detection algorithm | Daily content, progress logic, reassessment flow, UI |
| **PDF export** | — | Profile reports, assessment results as PDF |

### 🔮 Planned (Not Yet Started)

| Feature | Description |
|---------|-------------|
| **OCR for scanned PDFs** | Tesseract.js or external OCR API for image-based CVs |
| **Synthetic demo dataset** | 200–500 generated CVs for demonstration purposes |
| **E2E test suite** | Playwright tests for critical flows: upload → parse → match → invite → assess → export |
| **Component tests** | React Testing Library + jsdom for UI component testing |
| **API integration tests** | Supabase test project / `pg-mem` for route handler tests |
| **Rate limiting + CSP headers** | Vercel Edge / Supabase-based throttling; production-grade security headers |
| **Audit trail** | Dedicated `audit_log` table for HR actions |
| **Real-time updates** | WebSocket/SSE for live progress tracking and notifications |

### ❌ Removed from Scope

| Feature | Reason |
|---------|--------|
| **Ethical AI / bias detection module** | Scope refocused on dual-mode assessment + AI interviewer; bias detection dropped from MVP |
| **Blind review mode** | Tied to bias detection; dropped |
| **BullMQ / Redis queue** | Replaced by Next.js `after()` for async bulk CV processing |
| **Vercel Blob storage** | Replaced by Supabase Storage during consolidation onto Supabase |
| **Prisma ORM + Neon** | Replaced by `@supabase/supabase-js` + `@supabase/ssr` against Supabase Postgres |

---

> **Last updated:** April 22, 2026
