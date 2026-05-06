import type { ReactNode } from "react";

interface GuideSection {
  id: string;
  title: string;
  body: ReactNode;
}

const Lead = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground">{children}</p>
);

const Bullets = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc pl-5 space-y-1">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

const Steps = ({ items }: { items: ReactNode[] }) => (
  <ol className="list-decimal pl-5 space-y-1">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ol>
);

const Tip = ({ children }: { children: ReactNode }) => (
  <div className="rounded-md border-l-4 border-primary/60 bg-primary/5 px-3 py-2 text-xs text-foreground/80">
    <span className="font-semibold mr-1">Tip:</span>
    {children}
  </div>
);

const Note = ({ children }: { children: ReactNode }) => (
  <div className="rounded-md border-l-4 border-amber-500/60 bg-amber-500/5 px-3 py-2 text-xs text-foreground/80">
    <span className="font-semibold mr-1">Note:</span>
    {children}
  </div>
);

const Sub = ({ children }: { children: ReactNode }) => (
  <h3 className="text-sm font-semibold mt-4 mb-1 text-foreground">{children}</h3>
);

export const hrGuideSections: GuideSection[] = [
  {
    id: "intro",
    title: "Welcome",
    body: (
      <>
        <Lead>
          The Talent Intelligence &amp; Language Verification Platform is a
          recruiter-side tool to source, screen, evaluate, and track
          multilingual talent. This guide walks you through every HR feature.
        </Lead>
        <Sub>What this platform does</Sub>
        <Bullets
          items={[
            "AI-powered CV parsing extracts structured data from candidate CVs.",
            "Job-anchored fit scoring ranks candidates against a specific job.",
            "Language assessments — written rubric tests and real-time AI interviews graded against CEFR.",
            "Per-skill verification through short role-play Q&A sessions.",
            "End-to-end candidate audit trail: status changes, emails, assessments, and HR notes.",
            "Promotional campaigns to broadcast announcements to targeted candidate segments.",
          ]}
        />
        <Sub>Sign in</Sub>
        <Steps
          items={[
            "Open the platform URL and click Sign in with Google.",
            "Your role (HR vs candidate) is set server-side and cannot be changed from the browser.",
            "On first login, you select your role; afterwards you go straight to the HR dashboard.",
          ]}
        />
        <Note>
          HR-only API endpoints are protected at the middleware layer — non-HR
          accounts receive <code>403</code>.
        </Note>
      </>
    ),
  },
  {
    id: "dashboard",
    title: "HR Dashboard",
    body: (
      <>
        <Lead>The Dashboard is your high-level recruitment snapshot.</Lead>
        <Sub>KPI cards</Sub>
        <Bullets
          items={[
            "Total Candidates — every candidate profile in the system.",
            "Open Positions — currently open job listings.",
            "Total Applications — applications received across all jobs.",
            "Shortlisted — candidates flagged as shortlisted.",
          ]}
        />
        <p>
          All data is loaded live from <code>/api/analytics</code>. For deeper
          breakdowns (charts, trends, score distribution) open the{" "}
          <strong>Analytics</strong> page.
        </p>
      </>
    ),
  },
  {
    id: "jobs",
    title: "Job Openings",
    body: (
      <>
        <Lead>
          Manage every position your team is recruiting for. Create your own
          listings or sync them from the adidas careers website.
        </Lead>
        <Sub>List view</Sub>
        <Bullets
          items={[
            "Each card shows title, department, location, country, status, and type.",
            "Status badges: Open, Draft, Closed, Archived.",
            "Type badges: Full-time, Part-time, Internship, Contract.",
            "Counters show how many candidates have been matched and how many assessments were created.",
            "Search across title, department, location, and country; filter by department or country; paginate at 20 per page.",
          ]}
        />
        <Sub>Create a new job</Sub>
        <Steps
          items={[
            "Click New Job in the toolbar.",
            "Required: Title. Optional: Type, Department, Location, Country, Description.",
            "Expand Optional Requirements to set required language + CEFR, experience type and minimum years, and education level — these power the Fit score.",
            "Save — the job is created as a Draft until you change its status to Open.",
          ]}
        />
        <Sub>Edit / delete</Sub>
        <p>
          Use the pencil icon to edit, the trash icon to delete. Deletion
          removes the job and its associated matches and applications.
        </p>
        <Sub>Sync jobs from adidas careers</Sub>
        <Steps
          items={[
            "Click the Sync Jobs button (refresh icon).",
            "The system scrapes the adidas careers site and either creates new listings or updates existing ones (matched by external ID).",
            "A results banner shows scraped / created / updated / failed counts and total duration.",
          ]}
        />
        <Tip>
          The scraper supports the full ~1,019 adidas listings across 50+
          countries and 16 departments.
        </Tip>
      </>
    ),
  },
  {
    id: "internships",
    title: "Internships",
    body: (
      <>
        <Lead>
          Internships are managed in their own page so you can track
          start/end dates, mentors, stipends, and Erasmus+ programmes.
        </Lead>
        <Sub>Create an internship</Sub>
        <Bullets
          items={[
            "Standard fields — title, department, location, country, description.",
            "Internship-specific — start date, end date, status (Draft, Active, Inactive, Finished), stipend, Erasmus+ flag, mentor name and email.",
            "Optional language / experience / education requirements (same as jobs).",
          ]}
        />
        <Note>
          Only <strong>Active</strong> internships are visible to candidates.
          Use Draft to prepare a listing before publishing.
        </Note>
      </>
    ),
  },
  {
    id: "cv-upload",
    title: "CV Upload & Processing",
    body: (
      <>
        <Lead>
          Upload candidate CVs individually or in bulk. Every CV is processed
          through a 9-stage AI pipeline that extracts structured data and
          scores the candidate.
        </Lead>
        <Sub>Single upload</Sub>
        <Steps
          items={[
            "Drag and drop a CV file (PDF, DOCX, or TXT — max 10 MB) onto the upload zone.",
            "The pipeline runs: validation → cloud storage → text extraction → LLM parsing → schema validation → deduplication → candidate creation/update → CV scoring → complete.",
            "Review the editable preview; correct any extracted fields if needed.",
            "Click Save to persist the candidate profile.",
          ]}
        />
        <Sub>What the AI extracts</Sub>
        <Bullets
          items={[
            "Personal info: full name, email, phone, location, country, LinkedIn.",
            "Work experience: title, company, dates, description — each tagged with one or more canonical Fields of Work.",
            "Education: institution, degree, field, dates, level.",
            "Languages and self-declared proficiency.",
            "Skills categorised by type.",
          ]}
        />
        <Sub>Duplicate handling</Sub>
        <Bullets
          items={[
            "Email match → 100% confidence: existing candidate is updated.",
            "Name + location → 85% confidence: flagged as likely duplicate.",
            "Name only → 50% confidence: flagged for manual review.",
            "Duplicates show a Duplicate Of link to the existing profile.",
          ]}
        />
        <Sub>Bulk upload</Sub>
        <Steps
          items={[
            "Drop a ZIP archive or multiple files into the upload zone.",
            "The endpoint returns 202 Accepted with a parsing job ID and processes asynchronously.",
            "The UI polls the parsing job and shows a live counter of parsed and failed files.",
            "Scanned/image-only PDFs are flagged in the job's error log for manual review.",
          ]}
        />
        <Sub>CV scoring (Quality)</Sub>
        <p>
          Each CV is scored on Experience Quality (35%), Years of Experience
          (25%), Education Level (20%), and Location Match (20%). Colour
          codes: green ≥ 70, yellow ≥ 45, red &lt; 45. This is the candidate's
          intrinsic <strong>Quality</strong> score, independent of any job.
        </p>
      </>
    ),
  },
  {
    id: "candidates",
    title: "Candidate Evaluation",
    body: (
      <>
        <Lead>
          The Candidates page is your full talent pool with sortable columns,
          filters, and per-row actions.
        </Lead>
        <Sub>Columns</Sub>
        <Bullets
          items={[
            "Name, location, status (pipeline stage), CV Quality score with bar.",
            "Per-dimension breakdown with confidence indicators (high / medium / low).",
            "Languages, departments, added date.",
            "Shortlist toggle and 3-state review toggle (no state → Needs Review → Reviewed).",
            "When a job is selected from the toolbar dropdown, a Fit column overlays the per-job score.",
          ]}
        />
        <Sub>Pipeline statuses</Sub>
        <p>
          NEW → PARSED → SCREENED → INVITED → ASSESSED → SHORTLISTED →
          BORDERLINE → ON_IMPROVEMENT_TRACK → REJECTED → HIRED. Updating a
          candidate's status fires a <code>STATUS_CHANGE</code> notification
          to the candidate, attributed to your account.
        </p>
        <Sub>Scoring weights &amp; presets</Sub>
        <Bullets
          items={[
            "Open Scoring Weights to adjust the five dimensions (experience relevance, years, education, location, language).",
            "Sliders auto-normalise to 100% and the table re-ranks in real time.",
            "Built-in presets: Balanced, Experience-focused, Education-focused, Language-focused, Location-focused.",
            "Save your own presets by name and reuse them later.",
          ]}
        />
        <Sub>Candidate detail page</Sub>
        <Bullets
          items={[
            "Full parsed CV: personal info, experiences, education, languages, skills.",
            "Application history, assessment results with evidence trails, skill verification outcomes.",
            "Recruiter Notes — collaborative rich-text notes (TipTap editor), timestamped, reverse chronological.",
            "Interaction History panel — every notification, status change, email, and campaign linked to the candidate, with HR sender attribution and read tracking.",
            "Contact Candidate — send an email directly; the message is recorded as a CONTACT_EMAIL_SENT event in the interaction history.",
          ]}
        />
      </>
    ),
  },
  {
    id: "matching",
    title: "Job Matching & Fit",
    body: (
      <>
        <Lead>
          Matching is always <strong>candidate × specific job</strong>. The
          platform exposes two distinct scores so you never confuse a
          general-quality signal with a hiring signal.
        </Lead>
        <Sub>Quality vs Fit</Sub>
        <Bullets
          items={[
            "Quality — CV-intrinsic profile score (always shown on the Candidates list). Useful as a prefilter, not as a hiring decision.",
            "Fit — computed live for a chosen job across 7 criteria: field, experience-in-field, seniority, required skills, preferred skills, languages, education. Persisted in the job_matches cache.",
          ]}
        />
        <Sub>How JD parsing works</Sub>
        <p>
          The first time you open <strong>Rank candidates</strong> for a job,
          the JD is parsed by Groq (with OpenAI fallback) into structured
          requirements. The result is cached on the job row; if the source URL
          later changes, the cache is invalidated automatically.
        </p>
        <Sub>Ranking workflow</Sub>
        <Steps
          items={[
            "From a job card click Rank candidates for this job.",
            "The orchestrator lazy-parses the JD, loads candidates with experiences/languages/education/skills, runs the fit engine, and persists the top 100.",
            "You can also pick a job from the Candidates page toolbar to overlay Fit scores in the candidate list directly.",
          ]}
        />
        <Note>
          A candidate is only <em>eligible</em> when every applicable
          must-have criterion is met. Overall Fit is the average of
          applicable criteria — irrelevant ones are skipped, not penalised.
        </Note>
      </>
    ),
  },
  {
    id: "applications",
    title: "Applications & Internship Applications",
    body: (
      <>
        <Lead>
          Track every application in one place, separated by job vs internship.
        </Lead>
        <Sub>Job Applications</Sub>
        <Bullets
          items={[
            "Each card shows the job, candidate name and email, applied date, status badge, and link to the external posting if synced.",
            "Search across title, candidate, email, department, location, country.",
            "Statuses: Submitted, Under Review, Invited, Assessed, Shortlisted, Rejected, Withdrawn (withdrawn applications are hidden).",
          ]}
        />
        <Sub>Internship Applications</Sub>
        <Bullets
          items={[
            "Same view filtered to internship-type jobs only.",
            "Adds a Learning Agreement link when the candidate has uploaded one.",
            "Withdrawn applications excluded.",
          ]}
        />
      </>
    ),
  },
  {
    id: "assessments",
    title: "Language Assessments & AI Interviews",
    body: (
      <>
        <Lead>
          Two assessment modes plus a per-skill verification flow, all graded
          by an LLM with structured rubrics.
        </Lead>
        <Sub>Mode A — Written Assessment</Sub>
        <Bullets
          items={[
            "Async, ~30 minutes, text prompts and written answers.",
            "LLM-graded against a CEFR-aligned rubric; output is Zod-validated.",
            "Scored immediately on submission.",
          ]}
        />
        <Sub>Mode B — Real-time AI Interview</Sub>
        <Bullets
          items={[
            "Voice conversation backed by a FastAPI sidecar (Whisper STT + GPT-4o-mini).",
            "Browser TTS (window.speechSynthesis) and STT (window.SpeechRecognition) — Chrome / Edge only.",
            "Per-question timer; clarification questions don't reset the timer.",
            "Sub-scores: pronunciation, fluency, grammar, vocabulary, coherence.",
            "Anti-hallucination guardrail: empty-evidence FAIL verdicts are auto-promoted to PASS.",
            "Two interview modes — Technical (skill validation, single-topic enforcement) or Language (CEFR conversation; B1+ to pass).",
          ]}
        />
        <Sub>Per-skill verification</Sub>
        <p>
          For any skill on a candidate's profile you can launch a short
          role-play Q&amp;A. The LLM plays a scenario partner, the candidate
          answers, and the LLM grades the competency evidence. Results appear
          on the candidate profile.
        </p>
        <Sub>Creating an assessment</Sub>
        <Steps
          items={[
            "Pick a candidate and a job.",
            "Choose Written or Interview mode (or use a saved template).",
            "The system generates a magic link with a 10-minute HMAC-SHA256 token, sent via Resend with a copy-link fallback.",
            "Default expiry: 48 hours. Status flow: Pending → In Progress → Submitted → Scored → Reviewed (or Expired).",
          ]}
        />
        <Sub>Reviewing results</Sub>
        <Bullets
          items={[
            "Overall score (0–100) plus CEFR estimation: A1 (0–19), A2 (20–39), B1 (40–59), B2 (60–74), C1 (75–89), C2 (90–100).",
            "Dimension scores depend on the mode.",
            "Evidence trail (interview mode): the specific user turns and prompts justifying the verdict.",
            "Borderline indicator on scores 45–60 — eligible for the Improvement Track flow.",
          ]}
        />
      </>
    ),
  },
  {
    id: "campaigns",
    title: "Promotional Campaigns",
    body: (
      <>
        <Lead>
          Send rich-text announcements to targeted candidate segments. Campaigns
          surface in candidates' notification feeds and respect their
          opt-out preferences.
        </Lead>
        <Sub>Lifecycle</Sub>
        <p>Draft → Sent → Terminated → Archived.</p>
        <Sub>Create a campaign</Sub>
        <Steps
          items={[
            "Open Notifications and click New Campaign.",
            "Title (required), rich-text body (TipTap with bold/italic/links/images/colors/alignment), optional CTA URL, optional pin and schedule.",
            "Targeting: All Candidates, By Country, By Field of Work, By Education Level, or By Email.",
            "An audience preview shows estimated recipients before you send.",
            "Save as Draft to edit later, or Send to deliver immediately.",
          ]}
        />
        <Sub>Sending</Sub>
        <Bullets
          items={[
            "Resolves matching candidates, checks each candidate's notification preferences, and creates notifications in batches of 500.",
            "After sending, the card displays read statistics (e.g. 72% read, 36/50).",
            "Clone any campaign to start a new Draft with the same content and targeting.",
          ]}
        />
        <Note>
          Delete is only available for Draft and Archived campaigns and
          requires confirmation. Terminated campaigns can be archived but
          remain visible in candidates' history.
        </Note>
      </>
    ),
  },
  {
    id: "notifications",
    title: "Notifications & Interaction History",
    body: (
      <>
        <Lead>
          Stay on top of recruitment events and keep a complete record of
          every touchpoint with each candidate.
        </Lead>
        <Sub>HR notifications</Sub>
        <Bullets
          items={[
            "HR Application Received — a candidate applied to a job.",
            "HR Application Withdrawn — a candidate withdrew.",
            "HR Assessment Completed — a candidate finished an assessment.",
            "HR CV Uploaded — a new CV finished processing.",
            "Unread badge on the Bell icon; mark individual or all as read.",
          ]}
        />
        <Sub>Per-candidate interaction history</Sub>
        <Bullets
          items={[
            "Below Recruiter Notes on the candidate detail page.",
            "Lists every notification linked to the candidate, ordered most-recent first.",
            "Shows the type badge, status changes, campaign title, expandable email body for sent emails, the HR sender, and read state.",
            "Aggregates STATUS_CHANGE, CONTACT_EMAIL_SENT, PROMOTIONAL, and system events in one place.",
          ]}
        />
      </>
    ),
  },
  {
    id: "analytics",
    title: "Analytics",
    body: (
      <>
        <Lead>
          Aggregate insight across the recruitment pipeline. Charts are
          rendered with Recharts and served from a single endpoint that runs
          7 parallel queries.
        </Lead>
        <Bullets
          items={[
            "Overview cards — total candidates, open positions, applications, shortlisted, assessments.",
            "Candidate Pipeline bar chart — count per status.",
            "Candidates by Country pie chart — top 10.",
            "Top Skills horizontal bar chart — top 15.",
            "Applications per Job bar chart — top 10 jobs.",
            "Application Trend line chart — last 30 days.",
            "Score Distribution histogram — 5 score buckets.",
          ]}
        />
      </>
    ),
  },
  {
    id: "data-export",
    title: "Data Export",
    body: (
      <>
        <Lead>Export filter-aware candidate data for offline analysis.</Lead>
        <Sub>CSV export</Sub>
        <Bullets
          items={[
            "Driven by papaparse on the client.",
            "Includes personal info, pipeline status, CV scores (overall + per dimension), languages, and skill summaries.",
            "Respects all currently active search and filter criteria.",
          ]}
        />
        <Note>
          PDF export for individual candidate profiles, assessment results,
          and fairness reports is planned but not yet implemented.
        </Note>
      </>
    ),
  },
  {
    id: "improvement",
    title: "Improvement Tracks",
    body: (
      <>
        <Lead>
          Designed for borderline candidates (assessment score 45–60) who
          are close to meeting requirements. Currently a placeholder — the
          data model is in place; daily content and reassessment flow are
          planned.
        </Lead>
        <Sub>Planned status lifecycle</Sub>
        <p>
          Enrolled → In Progress → Completed → Reassessment Pending →
          Reassessed.
        </p>
      </>
    ),
  },
  {
    id: "tips",
    title: "Tips & Conventions",
    body: (
      <>
        <Bullets
          items={[
            <>
              Quality is candidate-intrinsic. <strong>Fit is the hiring
              signal.</strong> Always rank against a specific job before
              short-listing.
            </>,
            "Re-rank candidates after editing job requirements — the cache rebuilds on demand.",
            "Use Sync Jobs sparingly; the scraper is best-effort and can fail per-listing without blocking the rest.",
            "Notifications respect candidate opt-out preferences automatically — no manual filtering needed.",
            "All HR actions on candidates (status changes, emails, assessments) are recorded in the candidate's interaction history with your account as the sender.",
          ]}
        />
      </>
    ),
  },
];
