# adidas Talent Intelligence Platform — Candidate User Guide

> **Version:** 1.3 — May 2026
> **Platform URL:** [adidas-pool.vercel.app](https://adidas-pool.vercel.app)
> **Audience:** Candidates (job seekers, internship applicants).
> **HR counterpart:** [USER_GUIDE_HR.md](USER_GUIDE_HR.md)

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [CV Upload & Profile Creation](#3-cv-upload--profile-creation)
4. [Motivation Letter & Learning Agreement](#4-motivation-letter--learning-agreement)
5. [Browsing & Applying to Jobs](#5-browsing--applying-to-jobs)
6. [Browsing & Applying to Internships](#6-browsing--applying-to-internships)
7. [Tracking Your Applications](#7-tracking-your-applications)
8. [Language Assessments](#8-language-assessments)
9. [Ambassador Program Applications](#9-ambassador-program-applications)
10. [Notifications](#10-notifications)
11. [Profile & Settings](#11-profile--settings)
12. [Privacy & Data Control](#12-privacy--data-control)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Getting Started

### Signing In

1. Open the platform URL in your browser.
2. Click **"Sign in with Google"** on the landing page.
3. The platform uses **Supabase Auth** with Google OAuth as the only sign-in method — no password required.
4. Your role (`candidate` or `hr`) is assigned server-side and stored in your Supabase session; it cannot be changed from the browser.
5. On first sign-in you'll be asked to confirm your role on `/auth/select-role`. After that you go straight to the dashboard.

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

## 2. Dashboard Overview

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
| Profile Settings | Edit profile and notification preferences |
| Notifications | View all notifications and announcements |
| Documents Upload | Upload/re-upload your CV, motivation letter, learning agreement |
| Job Openings | Browse and apply to jobs |
| Internships | Browse and apply to internships |
| My Applications | Track submitted applications |
| Assessments | View pending and completed language assessments |
| AI Skill Validation | Launch a per-skill role-play verification |
| Improvement Tracks | View enrolled improvement programmes (placeholder) |

The footer of the sidebar gives you quick access to **User guide** (this document, in-app) and **Sign out**.

---

## 3. CV Upload & Profile Creation

### How to Upload Your CV

1. Navigate to **Documents Upload** from the sidebar (or use the dashboard upload zone).
2. **Drag and drop** your file onto the upload area, or click to browse files.
3. Accepted formats: **PDF**, **DOCX**, **TXT** (max 10 MB).
4. A progress bar shows the upload status.

### What Happens After Upload

The platform runs a 9-stage AI pipeline to extract structured information from your CV:

> File validation → cloud storage → text extraction → LLM parsing → schema validation → deduplication → candidate creation/update → CV scoring → complete.

Extracted fields:

- **Personal Information:** First name, last name, email, phone, location, country, LinkedIn URL.
- **Work Experience:** Job title, company, location, dates, description, current role flag, and one or more canonical *Fields of Work*.
- **Education:** Institution, degree, field of study, dates, education level.
- **Languages:** Language name and self-declared proficiency level (CEFR A1 → C2).
- **Skills:** Skill name and category.

### Reviewing & Editing Extracted Data

After the AI extracts your data:

1. All extracted fields are displayed in an **editable preview panel**.
2. Review each section (personal info, experiences, education, languages, skills).
3. Click into any field to correct or add missing information.
4. For languages, use the **CEFR level dropdown** (A1 → C2) to set your proficiency.
5. Click **Save** to confirm and store the data to your profile.

> **Tip:** The CV scoring engine (Quality score) reads from these structured fields. Filling in a missing graduation date or location can move you from 45 → 60+ on your overall score.

### Duplicate Detection

If you upload a CV with the same email as an existing candidate, the system detects it:

- **Exact match (email):** 100% confidence — links to existing profile and updates it.
- **Name + location match:** 85% confidence — flags as likely duplicate.
- **Name only match:** 50% confidence — flags for manual review.

You can re-upload your CV at any time to update your profile with new information.

### Your Quality Score

Every CV is automatically scored on four dimensions, weighted as follows:

| Dimension | Weight |
|-----------|--------|
| Experience Quality | 35% |
| Years of Experience | 25% |
| Education Level | 20% |
| Location Match | 20% |

The colour code: 🟢 ≥ 70, 🟡 ≥ 45, 🔴 < 45. This Quality score is *intrinsic* to your profile — independent of any specific job. When HR ranks candidates against a job they use a separate **Fit** score that combines your profile with that job's requirements (you don't see Fit; HR does).

---

## 4. Motivation Letter & Learning Agreement

### Motivation Letter

1. Go to the **Motivation Letter** section in Documents Upload or the dashboard upload zone.
2. Upload a file (PDF, DOCX, TXT — max 10 MB).
3. The system extracts the text content and stores it alongside your profile.
4. This document is available to HR when reviewing your application.

### Learning Agreement (Erasmus / Internship Candidates)

1. Go to the **Learning Agreement** section.
2. Upload your signed learning agreement document.
3. The document URL is stored and linked to your profile.
4. HR managers can access this when reviewing your internship application.

> **Tip:** Upload these documents *before* applying to internships — many recruiters use them as a first filter for Erasmus+ candidates.

---

## 5. Browsing & Applying to Jobs

### Finding Jobs

1. Navigate to **Job Openings** from the sidebar.
2. Use the **search bar** to search by job title, department, location, or country.
3. Use **filters** to narrow results:
   - **Job Type:** Full-time, Part-time, Contract, Internship.
   - **Department:** Filter by department name.
4. Results are paginated (default 100 per page).

### Job Card Information

Each job card displays:

- Job title.
- Job type badge (e.g., Full-time, Internship).
- Department, location, and country.
- Status (Open, Draft, Closed, Archived) — only **Open** jobs are applyable.
- Link to the original job posting (if synced from an external source).

### Applying to a Job

1. Hover over a job card to reveal the **Apply** button.
2. Click **Apply** — the system immediately submits your application.
3. A confirmation message appears:
   - ✅ **"Application submitted"** — if successful.
   - ⚠️ **"Already applied"** — if you've previously applied to this job.
4. You can only submit **one application per job**.

> **Tip:** If you withdraw an application, you cannot re-apply to the exact same listing. Apply only when you're sure.

---

## 6. Browsing & Applying to Internships

### Finding Internships

1. Navigate to **Internships** in the sidebar (or filter Job Openings by type **Internship**).
2. Internships marked as **Active** are available for applications.
3. Each internship card shows:
   - Title with a graduation cap icon.
   - Department, location, country.
   - Start/end date range.
   - Stipend amount (if specified).
   - **Erasmus+** badge (if the internship is part of the Erasmus programme).
   - Mentor name and email.

### Applying

The application process is the same as for regular jobs — click the **Apply** button. If a learning agreement is required, upload it via Documents Upload before applying so HR sees it on your application.

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

Internship-specific applications appear together with regular ones in My Applications, but are tagged with a graduation-cap icon. They include:

- All the same status tracking as regular applications.
- **Learning Agreement link** (if you uploaded one) — click to view or download.
- Erasmus badge indicator.

---

## 8. Language Assessments

The platform supports **two assessment modes**, plus a per-skill verification flow. HR chooses the mode when inviting you; you take them all through a magic link.

### How Assessments Work

When HR invites you for an assessment, you'll receive:

1. A **notification** in the Notifications panel.
2. A **magic link** — a unique, time-limited URL sent to your email (Resend integration, with a copy-link fallback).

### Mode 1: Written Assessment (async, LLM-graded)

| Type | Duration | What You Do |
|------|----------|-------------|
| **Written Response** | ~30 min | Read prompts and provide written answers. Auto-graded by an LLM against a CEFR-aligned rubric. |

Submit when complete and the system scores the response immediately, producing a CEFR estimate plus sub-scores (grammar, vocabulary, clarity, fluency).

### Mode 2: AI Interview (real-time, voice)

A live conversational interview powered by a FastAPI sidecar service.

- Browser **Speech Recognition** transcribes your voice; browser **Speech Synthesis** speaks the interviewer's questions back to you.
- An LLM plays the interviewer role and follows a scripted rubric.
- Each turn is scored as it happens; a final verdict (PASS / FAIL) is issued at the end with an **evidence array** justifying the decision.
- **Guardrail:** If the model returns a FAIL with no evidence, the system auto-promotes it to PASS to avoid silent hallucinated rejections.
- **Per-question timer**: a countdown applies per question; clarification questions (input ending with `?`) do *not* reset the timer.
- Typical duration: ~15–20 minutes, ~6–8 turns.

> **Important:** the AI interview only works in **Chrome** or **Edge** because it relies on the browser Speech Recognition API. Firefox and Safari are not supported for the voice flow.

#### Two interview modes

The same UI hosts two interview-mode flavours selected by HR or by you on the AI Skill Validation page:

| Mode | What it tests | Pass criteria |
|------|---------------|---------------|
| **Technical** | A specific skill from your profile, single-topic enforcement | Skill demonstrated in evidence |
| **Language** | Free-form English conversation graded on grammar, vocabulary, fluency | CEFR B1 or higher |

### Per-Skill Verification (role-play)

For specific skills listed on your CV, HR (or you, via AI Skill Validation) can request a short role-play Q&A. You'll be prompted with scenario-based questions and your answers are graded by an LLM against the skill's expected competencies. Results are stored against your profile and visible to HR alongside your CV.

### Taking an Assessment

1. Click the magic link from your email or notification.
2. The assessment page loads — no login required; the token itself authorises access.
3. For the **interview mode**, grant microphone access when prompted, and enable camera if requested for proctoring.
4. Follow the on-screen instructions; speak clearly and stay on-topic.
5. Submit when complete.

> **Important:** Magic links expire after **48 hours** by default. A countdown shows time remaining. Once expired, the assessment becomes unavailable.

### Viewing Results

After scoring, your assessment results page shows:

- **Overall score** (out of 100).
- **CEFR level** (A1 Beginner → C2 Proficient).
- **Detailed dimension scores** (Grammar, Vocabulary, Clarity, Fluency, and for interviews: Pronunciation, Coherence).
- **AI-generated feedback** summary.
- **Evidence trail** (for interview mode) — the specific turns that justified the verdict.
- **Borderline indicator** — if your score falls between 45–60, HR may offer an improvement track.

#### CEFR Level Reference

| Level | Label | Score Range |
|-------|-------|-------------|
| A1 | Beginner | 0–19 |
| A2 | Elementary | 20–39 |
| B1 | Intermediate | 40–59 |
| B2 | Upper Intermediate | 60–74 |
| C1 | Advanced | 75–89 |
| C2 | Proficient | 90–100 |

---

## 9. Ambassador Program Applications

### What is the Ambassador Program?

Brand ambassador programs let you represent adidas on your campus or in your community. Accepted ambassadors gain early access to recruitment events, exclusive perks, and direct HR contacts.

**URL:** `/dashboard/ambassador/apply`

---

### Browsing Open Programs

1. Click **Ambassador** in the sidebar (or navigate directly to the URL above).
2. The page lists all **OPEN** programs with their title, cohort, location, deadline, and a short description.
3. Read through the requirements and perks for each program before applying.

> **Note:** Programs in `DRAFT` or `CLOSED` status are not shown to candidates.

---

### Submitting an Application

1. Click **Apply** on any open program card.
2. Complete the application form:

| Field | Required | Notes |
|-------|----------|-------|
| Motivation | Yes | Why do you want to be a brand ambassador? |
| University | Yes | Your current institution |
| Year of study | Yes | e.g. 1st, 2nd, 3rd... |
| Previous experience | No | Any prior ambassador or leadership roles |
| Pitch video URL | No | Link to a short self-introduction video |

3. Click **Submit Application**.

You'll receive a confirmation and the application status will be set to **SUBMITTED**.

---

### Application Status

You can re-visit the ambassador portal to check your application status:

| Status | Meaning |
|--------|---------|
| `SUBMITTED` | Received, awaiting HR review |
| `UNDER_REVIEW` | HR is actively reviewing your application |
| `ACCEPTED` | Congratulations! You've been accepted |
| `REJECTED` | Application not selected for this cohort |

> **Tip:** If accepted, the tag **"brand-ambassador"** is added to your candidate profile, which may be visible to HR when reviewing your CV for other roles.

---

## 10. Notifications

### Notification Center

Navigate to **Notifications** to see all messages and alerts.

#### Types of Notifications You Receive

| Category | Notification Types |
|----------|--------------------|
| **Jobs** | New Job Posted, New Internship Posted, Job Status Changed |
| **Applications** | Application Received (confirmation), Status Changed, Withdrawal Confirmed |
| **Assessments** | Assessment Invitation, Assessment Completed (results available) |
| **Profile** | CV Upload Confirmed, Candidate Status Change |
| **Direct Email** | Contact Email — when HR sends you a message directly through the platform |
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

## 11. Profile & Settings

### Editing Your Profile

Navigate to **Profile Settings** to manage your personal information.

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

## 12. Privacy & Data Control

- The platform stores only the data you upload (CV, documents, profile fields) plus a record of your applications, assessments, and notifications.
- Your CV is stored in Supabase Storage; structured data extracted by the AI pipeline lives in Postgres.
- HR sees your CV-derived data, your application history, your assessment results, and any contact emails sent through the platform. HR cannot see your password (there isn't one — auth goes through Google).
- You control notification opt-outs through Profile Settings.
- For account or data deletion, contact your HR contact at adidas; deletion is currently a manual process.

---

## 13. Troubleshooting

| Problem | What to do |
|---------|------------|
| AI Interview microphone not working | Use Chrome or Edge; grant microphone permission when prompted; reload the page. |
| TTS (the interviewer's voice) is silent | Check the browser tab is not muted; toggle the speaker icon in the interview UI. |
| CV parsing missed information | Open the editable preview after upload and correct fields manually. Re-uploading replaces the parsed data. |
| Magic link expired | Ask HR to resend the assessment invitation — links are one-shot and expire after 48 hours. |
| "Already applied" on a job you withdrew | This is intentional — withdrawn applications cannot be re-submitted. |
| Notifications missing | Check **Profile Settings → Notification Preferences** — you may have opted out of that category. |

> **Last updated:** May 2026
