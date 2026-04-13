# 1st Intermediate Meeting — Project Presentation Guide

> **Meeting:** End of April 2026
> **Audience:** Stakeholders & Design team
> **Purpose:** Present project progress, current state, and next steps
> **Note to Designers:** This document provides the content and structure for the presentation slides. Screenshots referenced below should be captured from the live app.

---

## Suggested Slide Structure

---

### SLIDE 1 — Title

- **Project Name:** Talent Intelligence & Communication Verification Platform
- **Context:** adidas — Academic project within multinational corporate context
- **Tagline:** _"AI-powered CV screening, scoring & talent pool management for smarter hiring"_
- **Live & deployed** at Vercel (production)

---

### SLIDE 2 — The Problem

> "How can we retain, develop, and attract talent?"

Present these pain points that the platform addresses:

| Pain Point | Impact |
|------------|--------|
| Hundreds of CVs per opening, each manually screened | Recruiter overload |
| Different recruiters apply different evaluation standards | Inconsistent hiring |
| Self-declared language levels are unreliable | Language verification gap |
| Lengthy manual screening cycles | Slow time-to-hire |
| Near-miss candidates are lost instead of developed | Talent waste |

---

### SLIDE 3 — The Solution (What We Built)

A **standalone web application** that:

1. **Parses CVs automatically** using AI (PDF, DOCX, TXT — single or bulk ZIP upload)
2. **Scores candidates transparently** with deterministic, formula-based scoring (no black-box AI decisions)
3. **Matches candidates to jobs** scraped from the adidas careers portal (1,019+ job openings)
4. **Manages the talent pool** with filtering, shortlisting, and status tracking
5. **Verifies language ability** through CEFR-based assessments (magic-link, no login required)
6. **Communicates with candidates** via notifications and promotional campaigns

Key principle: **Every score can be traced back to its components — full transparency.**

---

### SLIDE 4 — Two User Roles

#### HR Manager
- Upload & manage bulk CVs
- Create and sync job openings from adidas careers portal
- Review, filter, score & shortlist candidates
- Configure scoring weights (custom presets)
- Send assessments via magic links
- Manage internship programs (Erasmus included)
- Create email campaigns with rich text editor
- Export data (CSV)

#### Candidate
- Upload personal CV (AI-powered parsing with review/edit)
- Browse jobs and internships
- Apply with one click
- Take language assessments (no login needed)
- Receive targeted notifications
- Configure notification preferences

> **Screenshot suggestion:** Side-by-side of HR dashboard vs Candidate dashboard

---

### SLIDE 5 — Technology at a Glance

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (React 19) |
| Language | TypeScript 5 (strict mode) |
| Database | PostgreSQL (Neon — serverless) |
| ORM | Prisma 6 |
| AI / LLM | Groq (Llama 3.3 70B) + OpenAI GPT-4o fallback |
| UI Components | shadcn/ui (Radix UI primitives) |
| File Storage | Vercel Blob (private) |
| Deployment | Vercel (auto-deploy on push) |
| Architecture | Onion Architecture (Clean Architecture) |
| Testing | Vitest — 65 tests across 6 test files |

---

### SLIDE 6 — Architecture Overview (optional — for technical audience)

```
┌─────────────────────────────────────────┐
│          Presentation Layer             │
│   (Next.js Pages + API Routes)          │
├─────────────────────────────────────────┤
│          Application Layer              │
│   (Use Cases, DTOs, Validation)         │
├─────────────────────────────────────────┤
│           Domain Layer                  │
│   (Ports / Interfaces / Business Rules) │
├─────────────────────────────────────────┤
│        Infrastructure Layer             │
│   (Prisma Repos, Blob Storage, LLM)    │
└─────────────────────────────────────────┘
```

- **21 database models**, **15 enums**, **40+ API endpoints**, **14 dashboard pages**
- Dependencies always point inward — infrastructure depends on domain, never the reverse

---

### SLIDE 7 — Development Timeline

| Phase | Period | Focus | Status |
|-------|--------|-------|--------|
| **Phase 1** | Feb 2026 | Foundation — DB schema, CV upload & storage, AI parsing pipeline, text extraction, candidate deduplication | ✅ Complete |
| **Phase 2** | Early Mar 2026 | Intelligence Layer — CV scoring engine, job-candidate matching, adidas job scraper (1,019 jobs), filtering dashboard | ✅ Complete |
| **Phase 3** | Mid Mar 2026 | Communication & Management — Notification system, promotional campaigns (rich text), internship management (Erasmus), job application flow, candidate self-service portal | ✅ Complete |
| **Phase 4** | Late Mar 2026 | Candidate Evaluation — Candidates page redesign, scoring weights with adjustable sliders, custom scoring presets, shortlisting, review tracking, status assignment, location filtering | ✅ Complete |
| **Phase 5** | Apr 2026 | Assessment & Analytics _(next)_ | 🔜 Planned |

---

### SLIDE 8 — CV Parsing Pipeline (Key Feature)

The 9-step automated pipeline:

1. **File Validation** — accepts PDF, DOCX, TXT (max 10 MB)
2. **File Storage** — securely stored in private Vercel Blob
3. **Text Extraction** — unpdf / mammoth / direct read
4. **Text Validation** — minimum content checks
5. **LLM Parsing** — AI extracts structured data (name, experience, education, languages, skills...)
6. **Schema Validation** — Zod enforces data structure
7. **Deduplication** — email + name matching prevents duplicates
8. **Database Upsert** — creates or updates candidate record
9. **Auto-Scoring** — immediate score calculation on upload

Supports **single upload** (candidate) and **bulk upload** (HR — multiple files or ZIP archives).

> **Screenshot suggestion:** The upload page showing the drag-and-drop area + processing feedback

---

### SLIDE 9 — Scoring Engine (Key Feature)

Candidates are scored with a **transparent, deterministic formula** — not a black-box AI model.

**Five scoring dimensions:**

| Dimension | Default Weight | What It Measures |
|-----------|---------------|-----------------|
| Experience Relevance | 30% | Match between candidate's experience and job field |
| Years of Experience | 20% | Career duration tier (Junior / Mid / Senior / Expert) |
| Education Level | 20% | Highest completed degree level |
| Location Match | 15% | Physical proximity to job location |
| Language Proficiency | 15% | CEFR-based language level assessment |

- HR can **adjust weights in real-time** using sliders
- **Quick presets** available: Balanced, Experience-focused, Education-focused, Language-focused, Location-focused
- HR can **save custom presets** with a name for reuse
- Scores re-rank instantly when weights change
- Every score shows a **breakdown with confidence indicators**

> **Screenshot suggestion:** The candidates page with the scoring weights modal open, showing sliders and presets

---

### SLIDE 10 — Candidates Evaluation Page (Key Feature)

The main HR workspace for reviewing the talent pool:

- **Score breakdown** per candidate (color-coded confidence: high/medium/low)
- **Filters:** Department, status, shortlist, review state, location (city/country)
- **Shortlist toggle** (star icon per row)
- **3-state review tracking:** No state → Needs Review → Reviewed
- **Status assignment dropdown:** SCREENED → INVITED → ASSESSED → SHORTLISTED → BORDERLINE → ON_IMPROVEMENT_TRACK → REJECTED → HIRED
- **CSV export** of filtered results

> **Screenshot suggestion:** Full candidates table with filters active, showing score breakdowns, stars, and status badges

---

### SLIDE 11 — Notifications & Campaigns (Key Feature)

**Dual-channel communication system:**

| Feature | Description |
|---------|------------|
| HR Notifications | Compact list with read/unread, archive, category badges |
| Candidate Notifications | Personal notification inbox with preferences |
| Promotional Campaigns | Rich text editor (TipTap), targeted by department, scheduled delivery |
| Campaign Lifecycle | Draft → Sent → Terminated → Archived |

> **Screenshot suggestion:** HR notifications page + campaign creation with rich text editor

---

### SLIDE 12 — Jobs & Internships

**Job Management:**
- CRUD for job openings
- Auto-sync from adidas careers portal (1,019 scraped jobs with departments)
- Job type support: Full-time, Part-time, Internship, Contract, Temporary

**Internship Management:**
- Full lifecycle (create, edit, clone, preview, delete)
- Erasmus program support (learning agreements)
- Active/expired validation
- One-click candidate applications

> **Screenshot suggestion:** Jobs listing page + internship management page

---

### SLIDE 13 — Platform by the Numbers

| Metric | Value |
|--------|-------|
| Database models | 21 |
| API endpoints | 40+ |
| Dashboard pages | 14 |
| UI components | 20+ |
| Automated tests | 65 passing |
| Scraped job openings | 1,019 |
| Department categories | 16 |
| Candidate status states | 10 |
| Commit history | 21 commits across ~1 month |
| Features completed | 15 of 18 planned |

---

### SLIDE 14 — What's Completed (Feature Status)

| # | Feature | Status |
|---|---------|--------|
| 1 | CV Upload & Parsing Pipeline | ✅ |
| 2 | CV Scoring Engine | ✅ |
| 3 | Job-Candidate Matching Engine | ✅ |
| 4 | Job Scraper (adidas Portal) | ✅ |
| 5 | Job Management (CRUD + Search) | ✅ |
| 6 | Internship Management (Lifecycle) | ✅ |
| 7 | Job Application System | ✅ |
| 8 | Candidate Self-Service Portal | ✅ |
| 9 | Notification System (Dual-Role) | ✅ |
| 10 | Promotional Campaigns (Rich Text) | ✅ |
| 11 | Notification Preferences | ✅ |
| 12 | Fields of Work (Department Filters) | ✅ |
| 13 | Candidate Deduplication | ✅ |
| 14 | CSV Export | ✅ |
| 15 | HR Scoring Weights & Presets | ✅ |

---

### SLIDE 15 — Next Phase: What's Coming (April → End of April)

| Feature | Description | Priority |
|---------|------------|----------|
| **Language Assessment Completion** | Full CEFR-based assessment flow — candidates receive magic-link, complete structured evaluation across reading/writing/listening dimensions, scores feed back into candidate profile | High |
| **Analytics Dashboard** | Visual statistics for HR: candidates by department, score distributions, pipeline funnel (New → Screened → Hired), time-to-hire metrics, top candidates overview | High |
| **Improvement Tracks** | Structured development paths for borderline candidates — suggested courses, follow-up schedules, progress tracking toward re-evaluation | Medium |
| **Bias Detection Module** | Statistical analysis to flag potential bias patterns in scoring across demographics, ensuring fair evaluation | Medium |
| **Demo Dataset & Polishing** | Populate platform with realistic demonstration data, final UI polish, edge case handling | Medium |

---

### SLIDE 16 — Roadmap Summary (Visual)

```
FEB 2026          MAR 2026                    APR 2026
─────────────────────────────────────────────────────────►

Phase 1           Phase 2      Phase 3    Phase 4    Phase 5
Foundation        Intelligence Comms &     Candidate  Assessment
& CV Pipeline     & Scoring    Mgmt       Evaluation & Analytics

[██████████████]  [██████████] [████████] [████████] [░░░░░░░░]
   COMPLETE         COMPLETE    COMPLETE   COMPLETE    NEXT
```

---

### SLIDE 17 — Screenshot Guide for Designers

Capture these screens from the live application to include in the presentation:

| # | Screen | What to Show | Suggested Slide |
|---|--------|-------------|-----------------|
| 1 | **HR Dashboard** (main page) | Overview with sidebar navigation visible | Slide 4 |
| 2 | **Candidate Dashboard** | Candidate-facing view for comparison | Slide 4 |
| 3 | **CV Upload page** | Drag-and-drop area, file type icons | Slide 8 |
| 4 | **Candidates table** | Full table with score columns, filters active | Slide 10 |
| 5 | **Scoring Weights modal** | Sliders, presets grid, save preset input | Slide 9 |
| 6 | **Candidate row details** | Score breakdown popup / confidence badges | Slide 9 |
| 7 | **Jobs listing page** | Job cards with department badges | Slide 12 |
| 8 | **Internship management** | List with clone/preview/delete actions | Slide 12 |
| 9 | **Notifications page** | HR compact view with categories | Slide 11 |
| 10 | **Campaign creation** | Rich text editor with targeting options | Slide 11 |
| 11 | **Candidate self-upload** | Candidate-side CV upload + parsed data review | Slide 8 |
| 12 | **Status dropdown on candidate** | Showing the assignable status options | Slide 10 |

---

### SLIDE 18 — Closing / Key Takeaways

- **15 of 18 planned features delivered** in ~1 month of development
- **Live in production** — deployed and accessible
- **AI-powered but transparent** — every decision is traceable
- **Dual-role platform** — serves both HR managers and candidates
- **Next milestone (end of April):** Language assessments, analytics dashboard, improvement tracks
- **Built for adidas context** — real job data, real organizational structure

---

## Appendix — Presentation Tips

- **Keep text minimal on slides** — use the tables above as bullet points, not full paragraphs
- **Lead with screenshots** — the app is visual and the best way to communicate progress
- **The scoring engine is the highlight** — spend the most time on how it works and why it's transparent
- **Compare before/after** — "Manual CV screening" vs "AI-parsed + auto-scored in seconds"
- **The 1,019 real jobs** from adidas careers portal are a strong demo point — this isn't hypothetical data
