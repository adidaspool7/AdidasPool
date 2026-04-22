# 01 — Project Overview

## Talent Intelligence & Communication Verification Platform

---

## 1.1 Project Context

This platform was developed as an academic project within a multinational corporate context (adidas). The driving business challenge was:

> **"How can we retain, develop, and attract talent?"**

The company operates internationally and requires multilingual employees — particularly for customer-facing roles and finance-related positions. Traditional recruitment struggles with:

- **Volume**: Hundreds of CVs per opening, each manually screened
- **Inconsistency**: Different recruiters apply different standards
- **Language verification gaps**: Self-declared language levels are unreliable
- **Time-to-hire**: Lengthy manual screening creates bottlenecks
- **Talent waste**: Near-miss ("borderline") candidates are lost instead of developed

---

## 1.2 Strategic Purpose

The platform is a **standalone web application** designed to:

1. **Structure and organize** large volumes of candidate CVs using AI-powered extraction
2. **Enable intelligent filtering** and classification through deterministic scoring
3. **Verify communication and language ability** in a standardized way (CEFR-based)
4. **Provide a fair and transparent assessment process** — no black-box decisions
5. **Create a persistent, searchable talent pool** across hiring campaigns
6. **Support borderline candidates** through structured improvement paths

### What it IS NOT

The system deliberately excludes:
- Full ATS (Applicant Tracking System) replacement
- Interview scheduling or calendar management
- Payroll or performance management integration
- Automatic rejection without human review
- Real-time AI voice conversations

This is a **focused, early-stage screening tool** — not an enterprise HR suite.

---

## 1.3 Core Objectives (Prioritized)

| Priority | Objective | How the Platform Addresses It |
|----------|-----------|-------------------------------|
| 1 | **Increase hiring quality** | Deterministic scoring with transparent breakdowns; structured language verification |
| 2 | **Reduce recruiter workload** | AI-powered CV parsing eliminates manual data entry; automated matching ranks candidates |
| 3 | **Reduce time-to-hire** | Bulk upload processing; instant scoring; pre-filtered candidate pools |
| 4 | **Standardize language evaluation** | CEFR-based assessment framework with rubric-scored dimensions |

---

## 1.4 Guiding Principles

These principles were established at the start and guided every technical and design decision:

1. **Transparency over automation** — Every score can be traced to its components
2. **Deterministic scoring over black-box AI** — Pure formulas with configurable weights, not opaque ML models
3. **Modularity over feature sprawl** — Clean Architecture enforces strict boundaries
4. **Demonstrability over theoretical perfection** — Working features with real data (1,019 scraped jobs)
5. **Business alignment over technical novelty** — Technology choices serve recruitment workflow needs

---

## 1.5 Development Timeline

| Month | Focus Area | Status |
|-------|-----------|--------|
| Month 1 | Foundation — Schema design, CV upload/storage, parsing pipeline, structured extraction | ✅ Complete |
| Month 2 | Intelligence Layer — Scoring engine, matching engine, job scraper, filtering dashboard | ✅ Complete |
| Month 3 | Assessment & Communication — Assessment framework, notification system, internship management | ✅ Complete |
| Month 4 | AI Interviewer, Skill Verification, CEFR scoring, Analytics dashboard, Supabase migration | ✅ Complete |
| Month 5 | Hardening & Documentation — Auth/RBAC, dead-code cleanup, improvement tracks, demo dataset | 🔄 In progress |

---

## 1.6 Current Platform State (April 2026)

### By the Numbers

| Metric | Value |
|--------|-------|
| Database tables | 23 (Supabase / PostgreSQL) |
| SQL migrations | 4 (under `supabase/migrations/`) |
| API endpoints | 40+ HTTP handlers across the `src/app/api/` tree |
| Dashboard pages | 15+ pages + layouts |
| UI components | 20+ shadcn/ui components |
| Test cases | 101 passing (6 Vitest test files) |
| Scraped job openings | 1,019 (from adidas careers portal) |
| Fields of work extracted | 16 consolidated departments |
| Lines of backend code | ~6,500+ across domain/application/infrastructure |
| Production deployment | Vercel (serverless) + Supabase (DB, Auth, Storage) |
| AI Interviewer backend | FastAPI (Python) sidecar for real-time CEFR interviews |

### Architecture

- **Pattern**: Onion Architecture (Clean Architecture / Ports & Adapters)
- **Backend**: Next.js 16 API Routes → Application Use Cases → Domain Services → Infrastructure (Supabase)
- **Frontend**: React 19 + shadcn/ui + Recharts analytics
- **Database**: PostgreSQL managed by Supabase (migrations via `supabase/migrations/`, RLS enabled)
- **Authentication**: Supabase Auth with Google OAuth; role stored in `app_metadata.role` (`hr` / `candidate`)
- **Storage**: Supabase Storage (production) / Local filesystem (development fallback)
- **AI**: Groq (Llama 3.3 70B) primary / OpenAI GPT-4o fallback for CV parsing; OpenAI Whisper + GPT-4o mini for real-time interview evaluation
- **Async processing**: Next.js `after()` primitive for bulk CV parsing (no external queue)
- **Deployment**: Vercel (Next.js) + Supabase (DB/Auth/Storage) + separately hosted FastAPI interview backend

---

## 1.7 Dual-Role System

The platform serves two distinct user types through a role-based interface:

### HR Manager
- Upload and manage bulk CVs (sync + async pipeline via Next.js `after()`)
- Create and configure job openings with language/experience/education criteria
- Sync jobs from the adidas careers portal
- Review, filter, rescore, and rerank candidates (custom scoring weights + presets)
- Send language assessments via magic links (written mode) **or** invite to a real-time AI Interviewer (voice mode)
- Verify individual CV skills through short AI-driven skill checks
- Manage internship programs (including Erasmus + activation flow)
- Create and send promotional campaigns/announcements (TipTap rich text)
- View analytics dashboard (funnel, pipeline, top skills/languages, application trends)
- Export candidate data (CSV)

### Candidate
- Sign in via Google OAuth (Supabase Auth)
- Upload personal CV with AI-powered parsing + inline review of extracted data
- Browse job openings and internships (multi-word AND-of-ORs search)
- Apply to positions with one click
- Upload motivation letters and learning agreements
- Take language assessments — written (magic link) or real-time AI interview (dual mode)
- Complete on-demand skill verification when prompted by HR
- Receive targeted notifications (per-field, per-country, opt-out supported)
- Configure notification preferences

---

## 1.8 Document Structure

This report is organized into the following sections:

| Document | Topic |
|----------|-------|
| **01 — Project Overview** | This document. Context, objectives, principles, current state |
| **02 — Requirements Analysis** | Client requirements, user flows, scope boundaries |
| **03 — Technology Stack** | Every technology used, with justification for each choice |
| **04 — Architecture & Design Patterns** | Onion Architecture, DI, Repository Pattern, layer breakdown |
| **05 — Database Design** | Schema design, models, enums, relationships, migrations |
| **06 — Features & Implementation** | Detailed documentation of every implemented feature |
| **07 — API Documentation** | Complete REST API reference with endpoints, methods, parameters |
| **08 — Testing Strategy** | Test coverage, test types, what's tested and why |
| **09 — Security, Deployment & Infrastructure** | Security considerations, deployment pipeline, environment management |
| **10 — UI/UX Design Decisions** | Design system, component choices, role-based interface patterns |
