# Talent Intelligence & Communication Verification Platform

---

# 1. Objective and Reason to Be

## Project Context
Academic project developed for a multinational company context.
Challenge: **"How can we retain, develop and attract talent?"**

The company operates internationally and requires multilingual employees for customer support and finance-related roles.

## Core Objectives (Prioritized)
1. **Increase hiring quality**
2. **Reduce recruiter workload**
3. **Reduce time-to-hire**
4. **Standardize language evaluation**

## Strategic Purpose
The platform is a standalone web application designed to:

- Structure and organize large volumes of candidate CVs
- Enable intelligent filtering and classification
- Verify communication and language ability in a standardized way
- Provide a fair and transparent assessment process
- Create a persistent and searchable talent pool
- Support borderline candidates through structured improvement paths

It is NOT intended to replace a full ATS or HRIS.
It focuses on early-stage screening and communication verification.

---

# 2. Architecture of the IT System

## High-Level Architecture

### Frontend (Web Application)
- HR Dashboard
- Candidate Assessment Interface
- Admin Management Interface

### Backend API Layer
- CV Ingestion Service
- Parsing & Classification Service
- Language Assessment Service
- Matching Engine
- Deduplication Engine
- Improvement Track Manager

### Database (Relational)
Structured schema with normalized tables:
- Candidates
- Experiences
- Education
- Languages
- Skills
- Jobs
- Assessments
- Improvement Tracks
- Assessment Results

### AI Service Layer
Used for:
- CV structured extraction (LLM-based schema enforcement)
- Experience relevance classification
- Language scoring (speech-to-text + rubric evaluation)
- Feedback generation

## Processing Model
- Bulk CV upload handled asynchronously
- Queue-based processing for parsing
- Structured JSON extraction stored in relational format
- Deterministic scoring formula for transparency

## Design Principles
- Modular separation of concerns
- Transparent scoring logic
- No black-box hiring decisions
- Standalone but API-ready architecture
- GDPR-aware design (data deletion capability, minimal inference)

---

# 3. Features

## A. Talent Pool Engine
- Bulk CV upload (ZIP or multiple files)
- Asynchronous parsing
- Structured extraction of:
  - Name
  - Location
  - Contact info
  - Education
  - Work experience
  - Skills
  - Languages
- Deduplication logic
- Experience relevance classification (e.g., customer service relevance)
- CV structured scoring components:
  - Experience relevance
  - Years of relevant experience
  - Education level
  - Location match
- Advanced filtering interface
- Candidate tagging

## B. Job Opening Configuration
- Create job opening
- Define:
  - Required language level (CEFR scale)
  - Required experience type
  - Required location
- Matching engine between candidates and job requirements

## C. Language Assessment Engine
Assessment types:
- Listening + written response
- Speaking task (speech-to-text evaluation)
- Optional reading aloud test

Scoring dimensions:
- Grammar
- Vocabulary
- Clarity
- Fluency
- Customer handling ability

Outputs:
- Structured sub-scores
- Overall language score
- CEFR estimation
- Feedback summary

## D. Borderline Improvement Track
- Automatic identification of borderline candidates
- Enrollment in 2-week structured micro-learning track
- Reassessment capability
- Progress tracking

## E. Internal Mobility (Optional Extension)
- Candidate type: External / Internal
- Matching internal employees to job openings
- Reuse of existing scoring and filtering logic

---

# 4. User Flows

## HR Manager Flow

### Flow 1: New Hiring Campaign
1. Create job opening
2. Upload bulk CVs
3. Monitor parsing progress
4. Filter candidates by:
   - Location
   - Experience relevance
   - Self-declared language
5. Invite selected candidates to language assessment
6. Review language scores
7. Shortlist candidates
8. Identify borderline candidates → assign improvement track

### Flow 2: Talent Pool Search
1. Search existing database
2. Filter by structured attributes
3. Match candidates to new job opening
4. Invite to assessment if needed

### Flow 3: Internal Mobility (Optional)
1. Filter internal candidates
2. Apply job matching engine
3. Identify internal potential matches

## IT Admin Flow

### System Management
- Upload synthetic datasets for demo
- Monitor parsing logs
- Review classification consistency
- Adjust scoring weights (if configurable)
- Manage improvement track content

---

# 5. Implementation Roadmap (4 Months)

## Month 1 – Foundation
- Define database schema
- Implement CV upload & storage
- Build asynchronous parsing pipeline
- Implement structured extraction

## Month 2 – Intelligence Layer
- Experience classification logic
- CV structured scoring model
- Job opening configuration
- Recruiter filtering dashboard

## Month 3 – Language Assessment
- Audio recording feature
- Speech-to-text integration
- Structured scoring rubric
- Feedback generation
- Borderline logic

## Month 4 – Finalization & Demo Preparation
- Improvement track logic
- Internal mobility extension
- Performance optimization
- Demo dataset generation
- Metrics simulation
- Documentation & architecture diagrams

---

# 6. Evaluation & Success Simulation

Since real-world deployment is not feasible within the timeframe, success will be demonstrated through:

- Simulated dataset of 200–500 structured CVs
- Measured classification consistency
- Demonstrated reduction in manual screening scope
- Realistic job description alignment
- Clear architectural documentation
- Ethical and GDPR considerations

Quantified example:
- 500 CVs → filtered to 120 relevant
- Language test → shortlist of 60
- Recruiter manual review reduced significantly

---

# 7. Boundaries (Scope Control)

The system will NOT include:
- Full ATS replacement features
- Interview scheduling
- Payroll integration
- Performance management
- Automatic rejection without human review
- Real-time AI voice conversation

---

# 8. Guiding Principles for Development

1. Transparency over automation
2. Deterministic scoring over black-box AI
3. Modularity over feature sprawl
4. Demonstrability over theoretical perfection
5. Business alignment over technical novelty

---

# 9. Long-Term Vision (Presentation Layer)

Future extensibility:
- API integration with HR systems
- Advanced analytics dashboards
- Internal upskilling for employees
- Cross-country talent intelligence insights

These are conceptual extensions, not part of MVP.

---

# End of Original Specification

This document serves as both:
- Implementation guide
- Presentation backbone
- Architectural reference
- Scope control mechanism

---

# Addendum: Implementation Status (2026-03-10)

> This section tracks what has been implemented vs. what remains from the original specification, and documents new features that emerged during development.

## Features Implemented (Beyond Original Spec)

### Internship Management System
A full internship lifecycle module was added based on business requirements not covered in the original spec:
- **JobType enum**: FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT — all jobs now have a type
- **InternshipStatus enum**: DRAFT, ACTIVE, INACTIVE, FINISHED — lifecycle state management
- **Erasmus Program Support**: `isErasmus` flag on jobs, Erasmus badge in UI, learning agreement upload per application
- **Internship-specific fields**: `startDate`, `endDate`, `stipend`, `mentorName`, `mentorEmail`
- **Role-aware filtering**: Candidates only see ACTIVE internships; HR can manage all states
- **Dedicated Internships page**: Create/edit dialogs (HR), apply + upload learning agreement (candidate)

### CV Parser Pipeline (Phase 1 — Candidate Self-Upload)
- **Two-stage pipeline**: File → Text Extraction → LLM Structuring → Zod Validation → Database
- **Text extraction**: `unpdf` for PDFs, `mammoth` for DOCX (replaced originally planned `pdf-parse`)
- **LLM provider**: Groq (Llama 3.3 70B, free tier) as primary, OpenAI GPT-4o as fallback (changed from spec's OpenAI-only)
- **Inline editing**: Candidates can review and edit all parsed fields before saving
- **Structured extraction**: Name, email, phone, location, experiences, education (including certifications/courses/formations), languages (with levels), skills
- **Deduplication**: Email + name-based duplicate detection

### Profile Settings
- Personal information editing (name, email, phone, location, date of birth)
- Nationality searchable combobox (European countries)
- Availability, work model, bio fields
- LinkedIn URL with automatic protocol normalization

### Motivation Letter Upload
- Separate upload endpoint for motivation letters
- Linked to candidate profile

### Multi-word Job Search
- Search queries are split into terms with AND-of-ORs matching across title, description, location, department

## Original Spec Features — Status

| Spec Feature | Status | Notes |
|---|---|---|
| CV Upload (candidate self-upload) | ✅ Complete | Synchronous pipeline with preview + edit |
| CV Upload (HR bulk) | ⚠️ Partial | Upload route exists, no async pipeline yet |
| Structured CV Extraction (LLM) | ✅ Complete | Groq primary, OpenAI fallback |
| CV Scoring Engine | ✅ Complete | Deterministic formula (experience, education, location, language) |
| Job-Candidate Matching | ✅ Complete | Location, language, experience, education criteria |
| Job Scraper (Adidas Portal) | ✅ Complete | Cheerio-based, all pages, all countries |
| Candidate Application Workflow | ✅ Complete | Apply, withdraw, re-apply with status tracking |
| HR Notifications | ✅ Complete | Auto-notify on application, read/unread, mark-all |
| Role-Based Navigation | ✅ Complete | Client-side (candidate/hr), localStorage persistence |
| Assessment Templates | ⚠️ Partial | Config UI exists, execution flow not complete |
| Magic Link Assessments | ⚠️ Partial | Token generation works, full assessment flow pending |
| Speech-to-Text (Whisper) | ❌ Not started | Planned for Month 3 |
| CEFR Estimation | ✅ Complete | Algorithm in scoring.service.ts |
| Borderline Detection | ✅ Complete | Algorithm in scoring.service.ts |
| Improvement Tracks | ❌ Placeholder | Page exists, logic not implemented |
| Bias Detection Module | ❌ Not started | Statistical fairness + blind mode planned |
| Analytics Dashboard | ❌ Placeholder | Page exists, Recharts installed but not wired |
| CSV Export | ✅ Complete | Papaparse-based candidate export |
| PDF Export | ❌ Not started | |
| Deduplication | ✅ Complete | Email + name-based matching |
| Candidate List + Detail | ❌ Placeholder | Pages exist, not functional |
| Collaborative Notes | ✅ Complete | API endpoint, not yet used in UI |
| E2E Tests (Playwright) | ❌ Not started | |
| Synthetic Dataset | ❌ Not started | 200-500 CVs planned |

## Architectural Deviations from Spec

| Originally Planned | Actual Implementation | Reason |
|---|---|---|
| OpenAI GPT-4o only | Groq (Llama 3.3 70B) primary + OpenAI fallback | Free tier, faster inference |
| Vercel Blob for file storage | LocalStorageService (dev) + Vercel Blob (prod) | Better dev experience without cloud dependency |
| `pdf-parse` for PDFs | `unpdf` for PDFs | Better serverless compatibility |
| BullMQ for async processing | Synchronous processing | BullMQ installed but not needed for Phase 1 (single CV) |
| Zod 3.x | Zod 4.3.6 | Upgraded during development |
| 10 Prisma enums | 14 Prisma enums | Added JobType, InternshipStatus, WorkModel, EducationLevel |
