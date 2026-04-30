# Proposta de Estágio — Talent Intelligence & Language Verification Platform

**Data:** 28 de abril de 2026
**Estudante:** Fernando
**Curso:** BSc Informatical Engineering
**Início:** 16/02/2026
**Fim:** 26/06/2026

---

## Problema (Proposta Original do Cliente)

Adidas Business, based in Portugal, provides services for other adidas companies located in Europe.
Main service areas: Finance, Human Resources, Accounts and Sales Management, Supply Chain, Digital Services and Tech.

As a business service company operating for several European countries, adidas in Porto has more than 900 employees with around 22% of our workforce being foreign. Our organization operates in a highly international environment, engaging daily across 15 different business languages. This diversity is a strength, but it also presents a strategic challenge: how can we attract, develop, and retain language capabilities in a sustainable way within our workforce in Portugal?

This would be a real-world project that addresses this challenge and the goal is to design a framework and sustainable strategy that enables us to:
1. Attract talent with critical language skills.
2. Maintain and develop these capabilities over time.
3. Ensure alignment with our long-term business objectives and cultural diversity.

This project offers students:
- Practical experience in HR strategy and global workforce planning.
- Exposure to multilingual and multicultural business environments.
- The opportunity to create a solution that could have a tangible impact on a leading international company.

### Objetivos do Cliente

Design a framework and sustainable strategy that enables Adidas to:
1. Attract talent with critical language skills.
2. Maintain and develop these capabilities over time.
3. Ensure alignment with our long-term business objectives and cultural diversity.

### Local de Desenvolvimento

O projeto é desenvolvido por uma equipa internacional e multidisciplinar com uma reunião de uma semana a realizar em Creta, na Hellenic Mediterranean University, no final de fevereiro. Após esta reunião o trabalho é desenvolvido no GILT.

---

## Motivação

Organizations operating in highly multilingual environments face a persistent challenge: language skills are difficult to objectively assess, inconsistently tracked across recruitment cycles, and rarely developed in a structured way after hiring. At adidas Porto, where over 22% of the workforce is international and daily operations span 15 business languages, this challenge directly impacts talent acquisition, team allocation, and long-term workforce planning. Current HR processes often rely on self-reported proficiency or informal interviews, leaving no scalable or data-driven mechanism to attract, verify, and develop language capabilities systematically. This project is motivated by the need to bridge that gap with a technology-supported framework grounded in objective evaluation and structured candidate management.

---

## Descrição

This project proposes and implements a **Talent Intelligence & Language Verification Platform** — a web-based HR tool designed to support the full lifecycle of language-capable talent: from sourcing and screening, to structured assessment, to ongoing development tracking. Acting as **product owner**, I led the end-to-end design and development of the platform, which includes AI-driven CV parsing to automatically extract and tag language skills from candidate profiles, a job-candidate matching engine that scores fit against specific role requirements, and a candidate management system that allows HR teams to track status, interaction history, assessment outcomes, and improvement trajectories over time. The solution is built on a modern, cloud-native stack (Next.js, Supabase) and is deployed as a production web application, providing a concrete proof-of-concept for how data-driven tooling can operationalize a language and talent strategy at scale.

---

## Objetivos

1. **Design a language talent framework** that defines the critical language profiles required across adidas Porto's service areas and establishes a structured process for attracting candidates who meet them.
2. **Build a data-driven candidate management platform** — as product owner — covering CV ingestion, automated skill extraction, job-fit scoring, and a full HR interaction audit trail per candidate.
3. **Enable longitudinal tracking** of language and professional capabilities — from initial screening through post-hire development — ensuring HR teams have a unified, persistent view of each candidate's journey.
4. **Validate the solution against real workforce needs** through structured surveys of adidas Porto employees and HR stakeholders, ensuring the framework addresses actual operational pain points and aligns with long-term business objectives.

---

## Solução Preconizada

A proposed solution is a web-based **Talent Intelligence & Language Verification Platform** that centralises the entire candidate lifecycle within a single HR tool. The platform automates CV ingestion and skill extraction via a large language model (LLM), scores candidates against specific job requirements using a multi-criteria fit engine, and provides HR teams with a structured interface to manage candidates, track all interactions, and monitor development over time. A language proficiency assessment module — integrating an AI interviewer aligned with the CEFR framework — completes the screening pipeline, enabling objective and reproducible language evaluation at scale.

---

## Validação Preconizada

The solution will be validated through two complementary approaches. First, a **functional validation** via a deployed production environment (cloud-hosted) accessible to HR stakeholders for real-world testing of core workflows — candidate upload, scoring, matching, and assessment. Second, a **survey-based validation** targeting current adidas Porto employees and HR team members, designed to measure whether the platform's features address real operational pain points (e.g. time spent on CV screening, confidence in language assessment, consistency of candidate evaluation across team members). Survey results will serve as data-driven evidence of the solution's relevance and impact.

---

## Planeamento

| Tarefa | Início | Fim |
|---|---|---|
| Problem analysis & requirements gathering | Feb 2026 | Feb 2026 |
| System architecture & database design | Feb 2026 | Mar 2026 |
| Core platform development (CV parsing, candidate management, job matching) | Mar 2026 | Apr 2026 |
| Language assessment module integration | Apr 2026 | Apr 2026 |
| Testing, deployment & stakeholder validation | Apr 2026 | May 2026 |
| Survey design, data collection & analysis | May 2026 | May 2026 |
| Final report & presentation | May 2026 | Jun 2026 |

---

## Descrição do Estágio

This project is developed in the academic context of a MSc dissertation/internship in partnership with adidas Porto (adidas Shared Services — Portugal). The internship takes place remotely with periodic meetings with the academic supervisor and company stakeholders. Duration: approximately 5 months (February – June 2026). Schedule: full-time equivalent, with flexible working hours aligned with academic calendar. Location: remote / Porto, Portugal.

---

## Perguntas para Inquérito — Validação junto de colaboradores adidas Porto

1. **CV screening workload** *(valida: AI CV parsing + job-fit scoring)*
   > "On average, how many hours per week does your team spend manually reviewing CVs and shortlisting candidates for a single open position?"
   > *(Scale: < 1h / 1–3h / 3–6h / > 6h)*

2. **Language proficiency verification** *(valida: avaliação de língua / CEFR)*
   > "How confident are you in your current process for objectively verifying a candidate's foreign language proficiency (e.g. English) before the first interview?"
   > *(Scale: 1 = Not confident at all → 5 = Very confident)*

3. **Evaluation consistency across the team** *(valida: scoring estruturado + templates de avaliação)*
   > "When multiple HR members or hiring managers evaluate the same candidate, how often do inconsistencies arise in how they are scored or ranked?"
   > *(Scale: Never / Rarely / Sometimes / Often / Always)*

4. **Tracking candidate communication history** *(valida: painel de histórico de interação)*
   > "How easy is it for your team to retrieve a complete history of all interactions with a specific candidate (emails, status changes, assessments) across different HR team members?"
   > *(Scale: 1 = Very difficult → 5 = Very easy)*
