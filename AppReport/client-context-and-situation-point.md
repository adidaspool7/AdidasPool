# Client Context, Motivation & Situation Point (Reference)

> Source-of-truth notes compiled from the client brief, the meeting/motivation
> report and the end-of-April 2026 "Situation Point" deliverable. Kept so the
> report (abstract + chapters) stays aligned with the **actual adidas business
> framing**, which is primarily about **language capabilities in a multilingual
> workforce**, with GDPR/recruitment tooling as the operational layer.

---

## 1. The Company Problem (adidas GBS Porto brief)

adidas Business, based in Portugal, provides services for other adidas
companies located in Europe. Main service areas:

- Finance
- Human Resources
- Accounts and Sales Management
- Supply Chain
- Digital Services
- Tech

**Scale & diversity facts (use verbatim in the report):**

- More than **900 employees** in Porto.
- Around **22% of the workforce is foreign**.
- Daily operations span **15 different business languages**.

**Strategic challenge (verbatim):** "How can we attract, develop, and retain
language capabilities in a sustainable way within our workforce in Portugal?"

The brief is a **real-world project** to design a *framework and sustainable
strategy* that enables adidas to:

1. **Attract** talent with critical language skills.
2. **Maintain and develop** these capabilities over time.
3. **Ensure alignment** with long-term business objectives and cultural diversity.

Student value: practical experience in HR strategy and global workforce
planning; exposure to multilingual/multicultural business environments; a
solution with tangible impact on a leading international company.

---

## 2. Motivation (meeting report)

Organizations in highly multilingual environments face a persistent challenge:
language skills are **difficult to objectively assess**, **inconsistently
tracked** across recruitment cycles, and **rarely developed in a structured
way** after hiring.

At adidas Porto (22% international workforce, 15 business languages), this
directly impacts **talent acquisition, team allocation, and long-term
workforce planning**. Current HR processes rely on **self-reported proficiency
or informal interviews** — no scalable, data-driven mechanism to attract,
verify, and develop language capabilities systematically. The project bridges
that gap with a technology-supported framework grounded in **objective
evaluation** and **structured candidate management**.

---

## 3. Description (meeting report)

The project proposes and implements a **Talent Intelligence & Language
Verification Platform** — a web-based HR tool supporting the full lifecycle of
language-capable talent: from **sourcing and screening**, to **structured
assessment**, to **ongoing development tracking**.

Acting as **product owner**, the author led end-to-end design and development:

- AI-driven CV parsing to extract and tag language skills.
- A job–candidate matching engine scoring fit against specific role requirements.
- A candidate management system tracking status, interaction history, assessment
  outcomes, and improvement trajectories over time.

Built on a modern, cloud-native stack (Next.js, Supabase), deployed as a
production web application — a concrete proof-of-concept for how data-driven
tooling can **operationalize a language and talent strategy at scale**.

---

## 4. Objectives (meeting report)

1. **Design a language talent framework** defining the critical language
   profiles required across adidas Porto's service areas and a structured
   process for attracting candidates who meet them.
2. **Build a data-driven candidate management platform** (as product owner):
   CV ingestion, automated skill extraction, job-fit scoring, full HR
   interaction audit trail per candidate.
3. **Enable longitudinal tracking** of language and professional capabilities —
   from initial screening through post-hire development — for a unified,
   persistent view of each candidate's journey.
4. **Validate against real workforce needs** through structured surveys of
   adidas Porto employees and HR stakeholders, ensuring the framework addresses
   actual operational pain points and aligns with long-term business objectives.

---

## 5. Situation Point — delivered end of April 2026

### Changes to the initial proposal
- Single technical change to the database: **migration from Prisma/Neon to
  Supabase**, to leverage the integrated authentication system.

### Tasks already done
- **Analysis & architecture** — requirements gathering with client; scope
  defined (talent pool + communication verification, **not a full ATS**);
  Onion architecture (Domain/Application/Infrastructure/Presentation) with
  TypeScript and Next.js.
- **Platforms & technologies** — full stack implemented: Next.js + Tailwind +
  shadcn/ui (frontend); Supabase (PostgreSQL, Auth via Google OAuth, Storage)
  backend; FastAPI (Python) for the AI interview module; Groq (Llama 3.3 70B)
  primary LLM, OpenAI GPT-4o fallback. Prisma/Neon → Supabase migration
  complete. Production deploy on Vercel (https://adidas-pool.vercel.app).
- **Data modelling** — canonical schema with 25 tables and 27 ENUMs.
- **Implemented features:**
  1. Individual and bulk CV upload (ZIP extraction, async processing).
  2. Structured CV parsing via LLM with Zod validation and deduplication.
  3. CV quality scoring (experience, years, education, location) with
     HR-adjustable weights.
  4. Full job management (including internships with Erasmus/Learning Agreement).
  5. Job-Anchored Matching: automatic JD parsing, classification of experiences
     into 16 functional areas, pure `computeJobFit` with 7 criteria, per-job
     candidate ranking page.
  6. AI Interviewer dual-mode: technical evaluation (single-scope skill
     validation) and language evaluation (CEFR rubric — grammar, vocabulary,
     fluency), browser TTS/STT, proctoring (camera, tab-change detection),
     HMAC tokens with TTL.
  7. Evaluator hardening: turn counting, FAIL only with cited evidence, skill
     verification with HR override.
  8. Notification system with per-candidate interaction history (status
     changes, contact emails sent, applications, campaigns).
  9. Analytics dashboard (funnel, pipeline, top skills/languages, score
     distributions, trends).
  10. Google OAuth authentication with role selection (Candidate / HR).
- **Results** — functional platform in production, end-to-end candidate and HR
  flows. **155/155 unit tests passing** on critical components (matching,
  parsing, scoring) at the situation-point date (later grown — see report).
- Technical documentation and User Manual under construction.

### Changes to the planning
- Creation of an extra **"welcome page"** at the specific request of the Design
  team (https://adidas-pool.vercel.app/welcome).
