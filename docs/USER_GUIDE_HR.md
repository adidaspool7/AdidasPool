# adidas Talent Intelligence Platform — HR Manager User Guide

> **Version:** 1.4 — May 2026
> **Platform URL:** [adidas-pool.vercel.app](https://adidas-pool.vercel.app)
> **Audience:** HR managers, recruiters, hiring coordinators.
> **Candidate counterpart:** [USER_GUIDE_CANDIDATE.md](USER_GUIDE_CANDIDATE.md)

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [HR Dashboard Overview](#2-hr-dashboard-overview)
3. [Job Openings Management](#3-job-openings-management)
4. [Internship Management](#4-internship-management)
5. [CV Upload & Processing](#5-cv-upload--processing)
6. [Candidate Evaluation](#6-candidate-evaluation)
7. [Job Matching & Fit](#7-job-matching--fit)
8. [Received Job Applications](#8-received-job-applications)
9. [Internship Applications](#9-internship-applications)
10. [Language Assessments & AI Interviews](#10-language-assessments--ai-interviews)
11. [Promotional Campaigns](#11-promotional-campaigns)
12. [Ambassador Program Management](#12-ambassador-program-management)
13. [Notifications & Interaction History](#13-notifications--interaction-history)
14. [Analytics & Reporting](#14-analytics--reporting)
15. [Improvement Tracks](#15-improvement-tracks)
16. [Data Export](#16-data-export)
17. [Tips & Conventions](#17-tips--conventions)
18. [Feature Roadmap & Implementation Status](#18-feature-roadmap--implementation-status)

---

## 1. Getting Started

### Signing In as HR

1. Open the platform URL.
2. Click **"Sign in with Google"** on the landing page.
3. If your account's `app_metadata.role` is `hr` (assigned server-side by the platform administrator), you'll land on the HR dashboard automatically.
4. HR-only API endpoints (rescore, rerank, scoring, export, campaigns, job sync, bulk upload, analytics) are protected at the middleware layer — `403` is returned for non-HR users.

### What You Can Do

As an HR manager, the platform provides:

- Create, edit, and manage job openings and internships.
- Bulk-sync jobs from the adidas careers website.
- Upload and AI-parse candidate CVs (single or bulk with async processing).
- Evaluate candidates with AI-powered scoring (CV-intrinsic Quality + per-job Fit).
- Review and manage all received applications.
- Invite candidates for written assessments, real-time AI interviews, or skill verification.
- View analytics on the recruitment pipeline and performance.
- Create and send targeted promotional campaigns.
- Create and manage brand ambassador programs, review applications, and update applicant status.
- Manage notifications for all recruitment events.
- Export candidate data to CSV.
- Maintain a per-candidate audit trail of every status change, email, assessment, and campaign.

> **Note:** Role assignment (HR vs candidate) is controlled by the platform administrator through Supabase's `app_metadata` and cannot be escalated by users.

---

## 2. HR Dashboard Overview

The main HR dashboard displays four key performance indicator cards:

| Card | Data |
|------|------|
| **Total Candidates** | Number of candidate profiles in the system |
| **Open Positions** | Number of currently open job listings |
| **Total Applications** | All applications received across all jobs |
| **Shortlisted** | Candidates that have been shortlisted |

Data is fetched in real-time from the `/api/analytics` endpoint, which runs 7 parallel database queries.

### HR Sidebar Navigation

| Section | Menu Items |
|---------|------------|
| **Dashboard** | Home, Profile Settings, Notifications |
| **Recruiting** | Job Openings, Job Applications, Candidates, Job Matching |
| **Internships** | Internships, Internship Applications |
| **Processing & Outreach** | CV Upload & Processing, Candidates Outreach, Analytics |

The footer of the sidebar gives quick access to **User guide** (this document, in-app) and **Sign out**.

---

## 3. Job Openings Management

### Viewing Jobs

The **Job Openings** page shows all job listings with:

- Job title (links to external posting if available).
- Department, location, country badges.
- Status badge: **Open**, **Draft**, **Closed**, **Archived**.
- Type badge: **Full-time**, **Part-time**, **Internship**, **Contract**.
- Match count (candidates matched) and assessment count.
- Edit and Delete action buttons.

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
   - Required Language and target CEFR Level (A1–C2).
   - Experience Type and Minimum Years.
   - Education Level.
4. Click **Save** to create the job as a new listing.

> **Tip:** the more requirement fields you fill in, the more accurate the per-job Fit score will be when ranking candidates.

### Editing a Job

Click the **pencil icon** on any job card to open the edit dialog. Changes invalidate the cached `parsed_requirements` so the next ranking re-parses the JD.

### Deleting a Job

Click the **trash icon** on a job card. The job and all associated data (matches, applications) are removed.

### Syncing Jobs from adidas Careers Website

1. Click the **Sync Jobs** button (refresh icon).
2. The system scrapes the adidas careers page using a Cheerio-based web scraper.
3. A results banner shows:
   - Jobs scraped, created, updated, failed.
   - Duration of the sync operation.
4. Newly found jobs are created; existing jobs (matched by external ID) are updated. If the source URL changed, the parsed-requirements cache is invalidated.

> The scraper can retrieve all ~1,019 adidas job listings across 50+ countries and 16 departments.

---

## 4. Internship Management

### Viewing Internships

The **Internships** page shows all internship listings. Each card displays:

- Title with graduation cap icon.
- Department, location, country.
- Status: **Draft**, **Active**, **Inactive**, **Finished**.
- Start/end date range.
- Stipend amount.
- **Erasmus+** badge (if applicable).
- Mentor name and email.
- Language, experience, and education requirements (if set).
- Match count and assessment count.

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

## 5. CV Upload & Processing

### Single CV Upload (HR)

1. Navigate to **CV Upload & Processing**.
2. Drag and drop a candidate's CV (PDF, DOCX, or TXT — max 10 MB), or click to browse.
3. The AI pipeline runs a 9-stage process:

   > File validation → cloud storage → text extraction → LLM parsing → schema validation → deduplication → candidate creation/update → CV scoring → complete.

4. The parsed results appear in an editable preview.
5. Review and correct extracted data as needed.
6. Click **Save** to store the candidate profile.

### What the AI Extracts

- Full name, email, phone, location, country, LinkedIn URL.
- Complete work history (title, company, dates, description) — each experience is tagged with one or more canonical *Fields of Work* (16 total).
- Education history (institution, degree, field, dates, level).
- Languages with self-declared proficiency.
- Skills categorised by type.

### Duplicate Handling

The system checks for duplicates at three tiers:

1. **Email match → 100% confidence** — updates existing candidate.
2. **Name + location → 85% confidence** — flags as likely duplicate.
3. **Name only → 50% confidence** — flags for manual review.

If a duplicate is detected, you'll see a "Duplicate Of" link to the existing profile.

### CV Scoring (Quality)

Each uploaded CV is automatically scored on four dimensions:

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| Experience Quality | 35% | Relevance and depth of work experience |
| Years of Experience | 25% | Total professional experience |
| Education Level | 20% | Highest qualification and field relevance |
| Location Match | 20% | Proximity to job location |

Score colors: 🟢 Green (≥70), 🟡 Yellow (≥45), 🔴 Red (<45).

> **Important:** This is the candidate's CV-intrinsic **Quality** score. It is independent of any specific job. For per-job ranking use the **Fit** score (see §7 *Job Matching & Fit*).

### Bulk Upload

Bulk upload is fully functional via `POST /api/upload/bulk` (HR-only, middleware-enforced). The endpoint:

1. Accepts a ZIP or multiple files and immediately creates a `parsing_jobs` row.
2. Returns a **`202 Accepted`** response with `{ parsingJobId }`.
3. Uses Next.js **`after()`** to run the parsing pipeline asynchronously — extraction → LLM parse → dedup → upsert → score — after the HTTP response has been sent.
4. The UI polls `GET /api/parsing-jobs/[id]` for progress and displays a live counter of `parsedFiles` / `failedFiles`.

> ZIP archive extraction is supported; scanned/image-based PDFs are flagged for manual review in the job's `errorLog`.

---

## 6. Candidate Evaluation

### Candidates List

Navigate to **Candidates** to view the full talent pool.

#### Search & Filter

- **Search bar:** Search by name or email.
- **Status filter:** Dropdown to filter by candidate pipeline status:
  - New, Parsed, Screened, Invited, Assessed, Shortlisted, Borderline, On Improvement Track, Rejected, Hired.

#### Candidate Table

| Column | Description |
|--------|-------------|
| Name | Candidate's full name (click to open profile) |
| Location | City/country |
| Status | Current pipeline status badge — updating it fires a `STATUS_CHANGE` notification to the candidate, attributed to your account |
| Quality Score | Overall CV score with visual color-coded bar |
| Score Breakdown | Per-dimension scores with confidence indicators (high/medium/low) |
| Languages | Self-declared languages |
| Departments | Up to 3 department badges with `+N` overflow popover |
| Added Date | When the candidate was added to the system |
| Shortlist | Star icon toggle to shortlist candidates |
| Review | 3-state toggle: No state → Needs Review → Reviewed |
| Fit | Per-job Fit score — only populated when a job is selected from the toolbar dropdown |

- **Sortable columns:** Name, Quality Score, Added Date — click column header to toggle ascending/descending.
- **Pagination:** 20 candidates per page with navigation controls.
- **Location filter:** Filter by city or country.
- **Status dropdown:** Assign pipeline status per candidate: SCREENED → INVITED → ASSESSED → SHORTLISTED → BORDERLINE → ON_IMPROVEMENT_TRACK → REJECTED → HIRED.
- **Row action menu:** Send a contact email, open the candidate profile, mark as reviewed.
- Click any row name to navigate to the **candidate detail page**.

### Scoring Weights & Presets

HR managers can customize how candidates are scored by adjusting the component weights:

1. Click the **"Scoring Weights"** button above the candidates table.
2. A modal opens with **5 sliders** (one per scoring dimension):
   - Experience Relevance (default 30%).
   - Years of Experience (default 20%).
   - Education Level (default 20%).
   - Location Match (default 15%).
   - Language Proficiency (default 15%).
3. Drag any slider to adjust. Weights are automatically normalized to sum to 100%.
4. Candidates **re-rank in real-time** as you adjust.

#### Quick Presets

Select from built-in presets for common scenarios:

- **Balanced** — Equal consideration across all dimensions.
- **Experience-focused** — Prioritizes work experience.
- **Education-focused** — Prioritizes qualifications.
- **Language-focused** — Prioritizes language proficiency.
- **Location-focused** — Prioritizes geographic proximity.

#### Saving Custom Presets

1. Adjust sliders to your preferred configuration.
2. Enter a name in the "Save as preset" field.
3. Click **Save** — the preset appears in the preset grid.
4. Custom presets can be deleted via the trash icon.

### Candidate Detail Page

The candidate detail page displays:

- The full parsed CV (personal info, experiences, education, languages, skills).
- Application history.
- Assessment results with evidence trails (for interview mode).
- Skill verification outcomes.
- CV score breakdown.
- **Recruiter Notes** — collaborative rich-text notes (TipTap editor), timestamped, reverse chronological.
- **Interaction History** — every notification, status change, email, and campaign linked to the candidate, with HR sender attribution and read tracking.
- **Contact Candidate** — send an email directly; the message is recorded as a `CONTACT_EMAIL_SENT` event in the interaction history with the subject and expandable body.

> **Email delivery note:** the contact-email pipeline is fully wired (Zod validation → Resend → interaction-history logging) but **outbound delivery requires a verified Resend sender domain**. Until that is configured, the API returns an error and the message is not delivered. See [CONTACT_EMAIL_OPTION_B_SETUP.md](CONTACT_EMAIL_OPTION_B_SETUP.md) for the operational steps.
### Collaborative Notes

Notes are fully functional: use the rich-text editor (powered by TipTap) on the candidate detail page to add timestamped notes. All notes are persisted via `POST /api/candidates/[id]/notes` (Zod-validated) and render in reverse chronological order.

### Candidate Tagging

> **🚧 Partially Implemented:** The database model for candidate tags exists, but the API endpoints and UI for creating and managing tags are not yet completed.

---

## 7. Job Matching & Fit

Matching is always **candidate × specific job**. The platform exposes two distinct scores so you never confuse a general-quality signal with a hiring signal.

### Quality vs Fit

- **Quality** — CV-intrinsic profile score (always shown on the Candidates list). Useful as a prefilter, *not* as a hiring decision.
- **Fit** — computed live for a chosen job across 7 criteria: field, experience-in-field, seniority, required skills, preferred skills, languages, education. Persisted in the `job_matches` cache (top-100 per job).

### How JD Parsing Works

The first time you open **Rank candidates** for a job, the JD is parsed by Groq (with OpenAI fallback) into structured requirements (`jobs.parsed_requirements` JSONB). The result is cached on the job row; if the source URL later changes the cache is invalidated automatically. The schema is versioned via `parsed_requirements_version`.

### Ranking Workflow

1. From a job card click **Rank candidates for this job**.
2. The orchestrator lazy-parses the JD, loads candidates with experiences/languages/education/skills, runs the fit engine (`computeJobFit`), and persists the top 100.
3. You can also pick a job from the Candidates page toolbar to overlay Fit scores in the candidate list directly.

### Eligibility & Overall Fit

- A candidate is only **eligible** when *every applicable* must-have criterion is met (`isEligible = AND of applicable.met`).
- Overall Fit is the **average of applicable criteria** — irrelevant ones are skipped, not penalised. This means a job with no language requirement does not punish candidates for lacking a language.

> **Tip:** When too few candidates are eligible, edit the job and relax a must-have to "preferred" — the next ranking will re-include them.

### Per-Job Shortlist

The ranked-candidates page has two tabs: **Ranked candidates** and **Shortlist (N)**. Use the shortlist as your active pick list **for that specific job** — it is independent of the global Watchlist (the star toggle on the Candidates list, which marks a candidate as generally interesting across all jobs).

- **Add to shortlist:** click the star icon next to any ranked candidate. Idempotent — clicking twice does not duplicate.
- **Snapshot fit:** when you add a candidate, the current Fit score is captured (`fitScoreAtAdd`). The Shortlist tab shows both the **snapshot** and the **current** fit, so you can spot drift if the ranking changed (e.g., after a JD edit).
- **HR notes:** each shortlist entry has an inline note field for short context ("phone screened", "availability July", etc.).
- **Remove:** the trash icon removes the candidate from this job's shortlist (does not affect their global Watchlist or any other job's shortlist).
- **Per-candidate view:** the candidate detail page shows a **Shortlisted For** card listing every job this candidate is currently shortlisted on, so you immediately see if they're already in flight elsewhere.

> **Three concepts, do not confuse them:**
> 1. **Watchlist** (`candidates.shortlisted`) — global "follow this candidate" star on the Candidates list. Job-agnostic.
> 2. **Per-job Shortlist** (`job_shortlists`) — your active pick list for one specific job. Covered here.
> 3. **Application status `SHORTLISTED`** — a lifecycle stage on a job *application* (Submitted → Under Review → … → Shortlisted). Triggered from the Applications view, not from ranking.

---

## 8. Received Job Applications

### Viewing Applications

Navigate to **Job Applications** (under Recruiting) to see all received applications.

#### What's Displayed

Each application card shows:

- **Job title** with department, location, and country.
- **Application status** badge (color-coded).
- **Candidate information:** Name and email (highlighted box).
- **Applied date**.
- **Link to external job posting** (if synced from external source).

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

> **Note:** Withdrawn applications and internship applications are automatically excluded from this view. See §9 for internship-specific applications.

---

## 9. Internship Applications

Navigate to **Internship Applications** for a filtered view of internship-specific applications.

This view is identical to job applications but:

- Only shows applications where the job type is **Internship**.
- Displays a **graduation cap** icon in the header.
- Shows a **Learning Agreement** link when the candidate has uploaded one.
- Excludes withdrawn applications.

---

## 10. Language Assessments & AI Interviews

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
| Browser support | Chrome / Edge only (uses `window.speechSynthesis` and `window.SpeechRecognition`) |
| Per-question timer | Counts down per question; clarification questions (input ending in `?`) do not reset it |

#### Two interview-mode flavours

- **Technical Assessment** — skill validation Q&A, single-topic enforcement.
- **Language Assessment** — free-form English conversation graded on CEFR rubric (grammar, vocabulary, fluency). Pass threshold: B1+.

The mode is selected via toggle on `/dashboard/ai-interview` and stored in `interview_sessions.interview_mode` (`TECHNICAL` | `LANGUAGE`).

### Per-Skill Verification

For any skill on a candidate's profile you can launch a short **role-play Q&A**: the LLM plays a scenario partner, the candidate answers, and the LLM grades the competency evidence. Results appear on the candidate profile.

### Assessment Statuses

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
3. The system generates a **magic link** — a unique, time-limited URL backed by an HMAC-SHA256 token (10-min TTL for token issuance, 48 h for the assessment itself).
4. The magic link is sent to the candidate via email (Resend integration) with a copy-link fallback in the UI.
5. The link expires after 48 hours by default.

### Reviewing Results

For scored assessments, the results panel shows:

- **Overall score** (0–100) with CEFR level estimation.
- **Dimension scores** (mode-dependent).
- **AI-generated feedback** text.
- **Evidence trail** (interview mode): the specific user turns and interviewer prompts that justified the verdict.
- **Borderline indicator:** Candidates scoring 45–60 are flagged for potential improvement track.

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

## 11. Promotional Campaigns

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

1. Navigate to **Notifications** (or **Candidates Outreach**).
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

- Total recipients.
- Read count and percentage (e.g., "72% read (36/50)").

### Candidate-Side View

- Candidates see campaigns as notifications in their feed.
- **Pinned** campaigns appear at the top.
- **Archived** campaigns are hidden from the candidate view.
- Campaigns respect each candidate's notification preferences — candidates who opted out of promotional notifications won't receive them.

---

## 12. Ambassador Program Management

### Overview

The Ambassador Program module lets HR create and manage **brand ambassador recruitment programs** — distinct from job postings. Candidates apply through their own portal and HR reviews applications per-program.

**URL:** `/dashboard/ambassador`

---

### Viewing Programs

Navigate to **Ambassador** in the HR sidebar. You see a card grid of all existing programs showing:

- **Title** and **cohort** label
- **Deadline** and **location / country**
- **Status badge** — `DRAFT`, `OPEN`, or `CLOSED`
- **Applicant count**

---

### Creating a Program

1. Click **+ Create Program** in the top-right.
2. Fill in the creation form:

| Field | Notes |
|-------|-------|
| Title | Short descriptive name (e.g. "Spring 2026 Campus Ambassadors") |
| Description | Rich text overview visible to candidates |
| Cohort | Label (e.g. "2026-Q1") |
| Application Deadline | Date picker |
| Location | City / venue |
| Country | Country of activity |
| Requirements | Bullet list of expectations |
| Perks | Benefits for accepted ambassadors |
| Status | `DRAFT` (hidden from candidates), `OPEN` (visible + accepting applications), `CLOSED` |
| Max Applicants | Optional capacity cap |

3. Click **Create** — program is immediately saved and visible in the list with the selected status.

---

### Editing a Program

1. Open the program by clicking its card.
2. Click the **Edit** button (top of detail page).
3. An edit dialog pre-fills all fields. Change any field and click **Save**.

> **Tip:** Flip status from `DRAFT` → `OPEN` when you are ready for candidates to apply.

---

### Deleting a Program

1. Open the program detail page.
2. Click **Delete Program** (bottom of page).
3. Confirm in the browser confirmation dialog.

> **Warning:** Deletion is permanent. All applications for that program are also deleted (cascade).

---

### Viewing & Managing Applications

Each program detail page (`/dashboard/ambassador/[id]`) shows a table of all submitted applications:

| Column | Description |
|--------|-------------|
| Candidate name / email | Links to candidate profile |
| University | Applicant's university |
| Year of study | Year stated in application |
| Motivation | Free-text motivation statement |
| Previous experience | Any prior ambassador / relevant experience |
| Pitch video | Link to submitted video (if provided) |
| Applied at | Submission timestamp |
| Status | Current application status badge |

---

### Updating Application Status

For each application row, use the **Status** dropdown to change:

| Status | Meaning |
|--------|---------|
| `SUBMITTED` | Default on receipt |
| `UNDER_REVIEW` | HR is reviewing |
| `ACCEPTED` | Candidate accepted as ambassador |
| `REJECTED` | Application rejected |

Status changes are persisted immediately. Accepted candidates are automatically tagged with **"brand-ambassador"** in their candidate profile.

---

## 13. Notifications & Interaction History

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

### Per-Candidate Interaction History

The candidate detail page has an **Interaction History** panel below Recruiter Notes, listing every event linked to that candidate, ordered most-recent first:

- `STATUS_CHANGE` — pipeline status update (with old/new status and HR sender).
- `CONTACT_EMAIL_SENT` — direct emails sent through the platform (subject + expandable body).
- `PROMOTIONAL` — campaigns the candidate received (linked to the campaign title).
- `JOB_APPLICATION` / `ASSESSMENT_*` — system events for application and assessment lifecycle.

Each entry shows the type badge, the HR sender (or system), the timestamp, and read state. This effectively gives you a per-candidate audit trail.

---

## 14. Analytics & Reporting

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

### My Charts (per-user custom widgets)

Below the seven default charts you can build your own using a constrained, no-SQL chart builder. Widgets are **per HR user** — only you see your saved charts.

- Click **➕ Add chart** to open the builder dialog.
- Pick a **metric** (one of: Candidates, Applications, Jobs, Assessments).
- Pick a **dimension** — the catalog only offers dimensions that make sense for the chosen metric (e.g. *Status*, *Country*, *Score bucket*, *Department*, *Type*, or temporal buckets *Day / Week / Month*).
- Pick a **chart type** — only types valid for the dimension family are offered (categorical → bar / horizontal bar / pie; temporal → line / area / bar; no-dimension → stat card).
- Tune **Top-N** (categorical) or **Lookback days** (temporal) and give the chart a title — a default title is auto-suggested.
- A **live preview** updates as you adjust the form (debounced ~300 ms).
- **Save** to add it to your dashboard. **Edit** or **Delete** any saved chart from its card.

> **Why is the builder constrained?** Every spec is validated server-side against a strict Zod schema before any database query runs. Unknown filter keys, mismatched dimension/chart-type combinations, or out-of-range limits are rejected. There is no freeform SQL surface — by design.

Widgets are stored per user in `hr_dashboard_widgets`; the seven default analytics charts above are unaffected.

---

## 15. Improvement Tracks

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

> The database models (`improvement_tracks`, `improvement_progress`) are in place. The daily lesson content, progress logic, and reassessment flow are not yet implemented.

---

## 16. Data Export

### CSV Export

The platform supports exporting candidate data to CSV format using the **papaparse** library.

Export includes:

- Candidate personal info (name, email, location, country).
- Pipeline status.
- CV scores (overall, experience, education, location).
- Languages and skill summaries.
- Filter-aware — respects current search and filter criteria.

### PDF Export

> **🚧 Planned:** PDF export for individual candidate profiles, assessment results, and fairness reports is not yet implemented.

---

## 17. Tips & Conventions

- **Quality is candidate-intrinsic. Fit is the hiring signal.** Always rank candidates against a specific job before short-listing.
- Re-rank candidates after editing job requirements — the cache rebuilds on demand and JD parse cache is invalidated when the source URL changes.
- Use **Sync Jobs** sparingly; the scraper is best-effort and can fail per-listing without blocking the rest.
- Notifications respect candidate opt-out preferences automatically — no manual filtering needed.
- All HR actions on candidates (status changes, emails, assessments) are recorded in the candidate's interaction history with your account as the sender.
- Use the **Scoring Weights** modal to A/B test how different role priorities affect ranking, then save your favourite as a preset.

---

## 18. Feature Roadmap & Implementation Status

### ✅ Fully Implemented

| Feature | Description |
|---------|-------------|
| **Authentication** | Supabase Auth + Google OAuth; role stored in `app_metadata.role` (server-only writes) |
| **Authorization / RBAC** | Middleware-level gating: `PUBLIC_API_PREFIXES` + `HR_ONLY_API_PREFIXES`; `401`/`403` at the edge |
| **Role-based dashboard** | Separate candidate and HR views with tailored navigation |
| **AI-powered CV parsing** | Groq Llama 3.3 70B (primary) + OpenAI GPT-4o (fallback) extract structured data |
| **CV scoring engine (Quality)** | Deterministic 4-factor scoring: experience (35%), years (25%), education (20%), location (20%) |
| **Per-job Fit scoring** | 7-criteria engine — field, experience-in-field, seniority, required skills, preferred skills, languages, education |
| **Per-job Shortlist** | Per-job pick list (`job_shortlists`) with snapshot fit, HR notes, and Shortlisted-For card on candidate profile — distinct from global Watchlist and from `application_status.SHORTLISTED` |
| **My Charts (custom analytics widgets)** | Per-user constrained-builder charts on `/dashboard/analytics`: 4 metrics × whitelisted dimensions × 6 chart types, Zod-strict spec, live preview, edit/delete |
| **Scoring weights & presets** | Configurable 5-dimension scoring with real-time re-ranking, built-in quick presets, custom preset save/delete |
| **Duplicate detection** | 3-tier matching (email → name+location → name only) |
| **Job management** | Full CRUD for jobs with search, filter, pagination |
| **Job scraping** | Cheerio-based scraper for adidas careers (1,019 jobs, 50+ countries, 16 departments) |
| **Internship management** | Full CRUD with Erasmus+ support, mentor info, date ranges, stipend |
| **Job applications** | Apply, withdraw, status tracking with one-application-per-job constraint |
| **HR bulk CV upload** | 202-Accepted + Next.js `after()` async pipeline + `parsing_jobs` progress polling (ZIP supported) |
| **Written assessments** | Async, LLM-graded, CEFR estimation, rubric sub-scores |
| **AI Interview assessments** | Real-time FastAPI sidecar, Whisper STT + GPT-4o-mini, evidence-array guardrails, auto-PASS on empty-evidence FAIL |
| **Per-skill verification** | LLM role-play Q&A graded against skill rubric |
| **Magic link assessments** | Token generation, email delivery via Resend, 48h expiry, public `/assess/[token]` portal |
| **Candidate detail page** | Full CV data, application history, assessment + interview results (with evidence), skill verifications, scoring breakdown, notes |
| **Collaborative notes** | TipTap rich text editor, timestamped history, Zod-validated API |
| **Notification system** | 16+ notification types, preference-aware targeting, read/unread management |
| **Per-candidate interaction history** | Read tracking, HR sender attribution, status / contact-email / promotional events |
| **Promotional campaigns** | Rich text campaigns, targeting (country/field/education/email), lifecycle (Draft→Sent→Terminated→Archived), read statistics, pinning |
| **Candidate profile** | Personal info, career preferences (availability, work model, relocation), nationality, bio |
| **Analytics dashboard** | Recharts-powered: pipeline, country distribution, top skills, top languages, applications per job, trends, score distribution (HR-only, middleware-enforced) |
| **File storage** | Supabase Storage (`talent-pool` bucket) |
| **CSV export** | Filter-aware candidate data export via papaparse |
| **Candidate activation + invitation** | HR invitations + activation tokens flow into the magic-link portal |
| **In-app User Guide** | Sidebar dialog with role-aware HR / candidate documentation |
| **Cloud deployment** | Vercel (Next.js) + Supabase (Postgres + Auth + Storage) + separate host for FastAPI sidecar |

### ⚠️ Partially Implemented

| Feature | What Works | What's Missing |
|---------|------------|----------------|
| **Candidate tagging** | Database model exists | API endpoints and UI |
| **Contact Candidate email delivery** | Compose UI, validation, Resend integration, interaction-history logging | Verified Resend sender domain in production (see [CONTACT_EMAIL_OPTION_B_SETUP.md](CONTACT_EMAIL_OPTION_B_SETUP.md)) |
| **Improvement tracks** | Database models, borderline detection | Daily content, progress logic, reassessment flow, UI |
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

> **Last updated:** May 2026
