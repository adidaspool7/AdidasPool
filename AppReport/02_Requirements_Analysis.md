# 02 — Requirements Analysis

## Client Requirements, User Flows & Scope Boundaries

---

## 2.1 Business Requirements

The client (multinational company operating in 50+ countries) presented the following core challenge:

> Attract, evaluate, and develop talent — particularly for roles requiring multilingual communication skills.

### Functional Requirements (from Client Brief)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Bulk CV upload with automated parsing into structured data | Must-have | ✅ Implemented |
| FR-02 | Persistent, searchable talent pool across hiring campaigns | Must-have | ✅ Implemented |
| FR-03 | Deterministic candidate scoring (no black-box) | Must-have | ✅ Implemented |
| FR-04 | Job opening configuration with language/experience requirements | Must-have | ✅ Implemented |
| FR-05 | Automated candidate-to-job matching engine | Must-have | ✅ Implemented |
| FR-06 | CEFR-based language assessment framework | Must-have | ✅ Implemented (written mode + real-time AI interview mode) |
| FR-07 | Deduplication of candidate records | Must-have | ✅ Implemented |
| FR-08 | CSV/PDF export of candidate data | Should-have | ✅ CSV complete, PDF planned |
| FR-09 | HR notification system for pipeline events | Should-have | ✅ Implemented (full system) |
| FR-10 | Borderline candidate identification | Should-have | ✅ Algorithm implemented |
| FR-11 | Structured improvement tracks for borderline candidates | Could-have | ❌ Placeholder only |
| FR-12 | Analytics dashboard with recruitment metrics | Could-have | ✅ Implemented (Recharts: funnel, pipeline, top skills/languages, trends) |
| FR-13 | Bias detection and fairness module | Could-have | ❌ Not started |
| FR-14 | Internal mobility matching for existing employees | Won't-have (v1) | ❌ Deferred |
| FR-15 | Real-time voice AI interviewer (CEFR evaluation) | Emerged | ✅ Implemented (FastAPI backend, Whisper + GPT-4o mini) |
| FR-16 | Per-skill verification (on-demand skill checks) | Emerged | ✅ Implemented |
| FR-17 | Authentication & role-based access control | Emerged | ✅ Supabase Auth + Google OAuth + middleware-level RBAC |

### Non-Functional Requirements

| ID | Requirement | How Addressed |
|----|-------------|---------------|
| NFR-01 | Transparency of all scoring decisions | Deterministic formulas with per-component breakdowns; weights defined as domain constants |
| NFR-02 | No automatic rejection without human review | System scores and ranks only — all final decisions require HR action |
| NFR-03 | GDPR-aware data handling | Minimal inference stored; data deletion capability via standard DB operations |
| NFR-04 | Ability to run without paid API keys | Groq (free tier) as primary LLM; local storage fallback; Supabase free tier covers DB/Auth/Storage |
| NFR-05 | Deployable to cloud (Vercel + Supabase) | Serverless-compatible architecture; Next.js `after()` handles async bulk parsing without an external queue |
| NFR-06 | Demonstrable with realistic data | 1,019 real job openings scraped from adidas careers portal |

---

## 2.2 Additional Requirements (Emerged During Development)

Several features were added beyond the original specification based on practical needs:

| Requirement | Origin | Status |
|-------------|--------|--------|
| Internship management with lifecycle states | Business need — adidas runs large internship programs | ✅ Full CRUD + lifecycle |
| Erasmus program support (learning agreements) | EU academic context — Erasmus internships are common | ✅ Upload + per-application linking |
| Candidate self-service portal | UX improvement — candidates shouldn't depend on HR to upload CVs | ✅ Self-upload with inline editing |
| Job scraper for adidas careers portal | Data acquisition — needed real job data for demo | ✅ Cheerio-based scraper |
| Notification preferences (field/country filters) | Candidate preference — don't spam irrelevant jobs | ✅ Preference-aware targeting |
| Promotional campaigns with rich text | HR communication need — announcements beyond system notifications | ✅ TipTap rich text editor |
| Motivation letter upload | Application completeness — some positions require cover letters | ✅ Separate upload endpoint |
| Role-based navigation (candidate vs HR) | Dual persona requirement — same app, different views | ✅ Supabase Auth + `app_metadata.role` drives server + client navigation |
| Real-time AI interviewer (voice) | Richer CEFR assessment beyond written text | ✅ FastAPI backend with OpenAI Whisper (STT) + GPT-4o mini (scoring) |
| Per-skill verification | HR needs to validate single skills without a full assessment | ✅ Dedicated verification endpoint + candidate UI |
| Analytics dashboard (wired with data) | Stakeholder visibility into funnel and pipeline | ✅ `/api/analytics` + Recharts on `dashboard/analytics` |

---

## 2.3 User Flows

### Flow 1: HR — New Hiring Campaign

```
1. HR creates a job opening
   → Defines title, department, location, country
   → Sets language requirement (language + CEFR level)
   → Sets experience requirement (type + minimum years)
   → Sets education requirement (minimum level)

2. HR uploads bulk CVs (ZIP or multiple files)
   → System creates a ParsingJob for tracking
   → Each file: validate → extract text → parse via LLM → validate → dedup → store
   → HR monitors progress via polling (parsed/failed/total counts)

3. HR reviews talent pool
   → Filter candidates by: status, country, score range, language, source type
   → Sort by score, name, date
   → View candidate details (parsed CV data, experiences, education, languages, skills)

4. HR runs matching engine on a job
   → System loads all eligible candidates (non-NEW, non-duplicate)
   → Applies matching criteria (location, language, experience, education)
   → Each candidate receives: overall score, per-criterion breakdown, eligibility flag
   → Results sorted by match score

5. HR invites candidates to language assessment
   → Chooses mode: WRITTEN (magic link + text prompts) or INTERVIEW (real-time AI voice)
   → Creates assessment with type, language, expiry (default 48 hours)
   → System generates magic link token
   → Sends email via Resend with magic link
   → Candidate status updates to INVITED

6. HR verifies specific skills (optional)
   → Selects one skill on the candidate profile
   → System generates a short verification interaction (AI-driven prompts)
   → Persists PASS / FAIL / INCONCLUSIVE outcome with rationale

7. HR reviews results and shortlists
   → Reviews assessment scores (5 sub-dimensions + overall)
   → Identifies borderline candidates (score 45-60)
   → Routes borderline to improvement tracks (planned)
   → Shortlists top candidates
```

### Flow 2: HR — Internship Management

```
1. HR creates internship (Job with type=INTERNSHIP)
   → Sets start date, end date, stipend, mentor details
   → Marks if Erasmus-eligible
   → Status starts as DRAFT

2. HR activates internship → ACTIVE
   → System auto-notifies eligible candidates (preference-aware)
   → Candidates can now see and apply

3. Candidates apply + upload learning agreement (if Erasmus)

4. HR reviews applications → UNDER_REVIEW → INVITED → ASSESSED → SHORTLISTED

5. HR deactivates → INACTIVE (no new applications)

6. Internship completes → FINISHED
```

### Flow 3: HR — Communication & Notifications

```
1. System auto-generates notifications for:
   → New application received (HR)
   → Application withdrawn (HR + candidate)
   → Assessment invitation sent (candidate)
   → Job/internship posted (eligible candidates)
   → Application status changed (candidate)

2. HR creates promotional campaign
   → Rich text content (TipTap editor with images, links, formatting)
   → Targeting: all candidates, by country, by field of work, by education level, by individual email
   → Optional: schedule for future delivery, pin to top

3. HR sends campaign
   → System evaluates targeting criteria against candidate pool
   → Creates individual notifications for each matched candidate
   → Respects opt-out preferences (promotionalNotifications toggle)
```

### Flow 4: Candidate — Self-Service

```
1. Candidate arrives at platform
   → Selects "Candidate" role
   → Auto-created demo profile (via /api/me)

2. Candidate uploads CV
   → Drag-and-drop or file picker (PDF, DOCX, TXT, max 10MB)
   → System: store → extract text → parse via LLM → validate → return preview
   → Candidate reviews ALL extracted data (name, contact, experiences, education, languages, skills)
   → Candidate edits any incorrect fields inline
   → Candidate saves → data persisted with all relations

3. Candidate browses jobs
   → Searches by title, department, location (multi-word AND-of-ORs)
   → Filters by field of work (16 standardized departments from real data)
   → Applies with one click
   → Gets confirmation notification

4. Candidate browses internships
   → Same search + filter capabilities
   → Applies + uploads learning agreement (if Erasmus)

5. Candidate manages profile
   → Edits personal info, nationality, availability, work model, bio
   → Configures notification preferences:
     - Job notifications on/off
     - Internship notifications on/off
     - Country filter (only my country)
     - Field of work filter (select relevant departments)
     - Promotional notifications on/off

6. Candidate takes assessment (when invited)
   → Receives magic link via email (or notification)
   → Opens link → public assessment page (no login required)
   → Token validates, loads assessment context
   → WRITTEN mode: answers text prompts scored by rubric
   → INTERVIEW mode: connects to FastAPI backend for real-time voice interview; turns are transcribed (Whisper) and scored live (GPT-4o mini) against CEFR sub-dimensions
```

### Flow 5: Candidate — Application Management

```
1. Candidate views "My Applications"
   → Sees all submitted applications with job details
   → Each shows: position title, department, location, status, date

2. Candidate withdraws application
   → Status changes to WITHDRAWN
   → HR receives notification
   → Candidate receives confirmation
   → Can re-apply later (status resets to SUBMITTED)
```

---

## 2.4 Scope Boundaries

### Explicitly Excluded

| Feature | Reason for Exclusion |
|---------|---------------------|
| Full ATS replacement | Out of scope — platform focuses on early-stage screening only |
| Interview scheduling | Requires calendar integration complexity not aligned with core mission |
| Payroll integration | Entirely different domain; no overlap with talent screening |
| Performance management | Post-hire concern, not relevant to recruitment screening |
| Real-time AI voice conversations | Technical complexity + data privacy; Whisper STT is sufficient |
| Automatic rejection | Against guiding principle #1 (transparency) — human must confirm |

### Deferred to Future Phases

| Feature | Reason | Dependencies |
|---------|--------|-------------|
| Improvement tracks (content + UI) | Curriculum generation for borderline candidates | LLM content generator + track UI |
| Bias detection module | Important for fairness, requires statistical analysis | Analytics foundation |
| E2E tests (Playwright) | Quality assurance for critical user flows | Playwright setup |
| PDF export | Nice-to-have export format | PDF generation library |
| Synthetic dataset (200-500 CVs) | Demo data for presentation | Scripting |

---

## 2.5 Success Criteria

Since real-world deployment is not feasible within the academic timeframe, success is demonstrated through:

1. **Working prototype** with real data (1,019 scraped jobs, functional CV parsing pipeline)
2. **Measured classification consistency** — deterministic scoring produces same results for same inputs
3. **Demonstrated workload reduction** — automated parsing + scoring eliminates manual CV reading
4. **Realistic job alignment** — matching engine compares candidates against real job requirements
5. **Clear architectural documentation** — this report series + inline documentation
6. **Ethical/GDPR considerations** — transparent scoring, no automatic rejection, data deletion capability

### Quantified Example (from specification)

```
500 CVs uploaded → Parsed and scored automatically
→ Filtered to ~120 relevant candidates (by location, experience, language)
→ Language assessment → Shortlist of ~60 candidates
→ Recruiter manual review scope reduced by ~88%
```
