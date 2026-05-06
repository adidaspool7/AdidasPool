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

export const candidateGuideSections: GuideSection[] = [
  {
    id: "intro",
    title: "Welcome",
    body: (
      <>
        <Lead>
          The Talent Intelligence &amp; Language Verification Platform helps
          you upload your CV, apply to adidas jobs and internships, and prove
          your skills through AI-graded assessments. This guide walks you
          through every candidate feature.
        </Lead>
        <Sub>What you can do</Sub>
        <Bullets
          items={[
            "Upload and manage your CV (auto-parsed by AI).",
            "Upload a motivation letter and a learning agreement (Erasmus / internships).",
            "Browse and apply to open jobs and internships.",
            "Track every application's status in one place.",
            "Take written language assessments and real-time AI interviews via secure magic links.",
            "Run per-skill role-play verifications.",
            "Receive notifications about new jobs, status updates, and announcements.",
            "Manage your profile and notification preferences.",
          ]}
        />
        <Sub>Sign in</Sub>
        <Steps
          items={[
            "Open the platform URL and click Sign in with Google.",
            "On first sign-in, confirm your role on the role-selection page.",
            "Your role is stored server-side and cannot be changed from the browser.",
          ]}
        />
        <Note>
          The platform never asks for a password. Authentication goes through
          Google OAuth via Supabase Auth.
        </Note>
      </>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard",
    body: (
      <>
        <Lead>
          Your home page summarises your activity at a glance and gives quick
          access to documents.
        </Lead>
        <Sub>KPI cards</Sub>
        <Bullets
          items={[
            "Total Applications — how many jobs you've applied to.",
            "In Progress — applications still under review.",
            "Completed — accepted, rejected, hired, or withdrawn.",
            "Quick upload zones for CV, motivation letter, and learning agreement.",
          ]}
        />
        <Sub>Sidebar</Sub>
        <p>
          The sidebar is grouped into Dashboard / Profile, Jobs and
          Internships, Assessments, and Documents. The footer gives you the
          User guide (this dialog) and Sign out.
        </p>
      </>
    ),
  },
  {
    id: "cv-upload",
    title: "CV Upload & Profile",
    body: (
      <>
        <Lead>
          Upload your CV once and the AI builds your profile automatically.
          You can re-upload at any time to refresh it.
        </Lead>
        <Sub>How to upload</Sub>
        <Steps
          items={[
            "Open Documents Upload from the sidebar (or use the dashboard upload zone).",
            "Drag and drop your file, or click to browse.",
            "Accepted formats: PDF, DOCX, TXT — max 10 MB.",
            "A progress bar shows the upload status.",
          ]}
        />
        <Sub>What gets extracted</Sub>
        <Bullets
          items={[
            "Personal info: name, email, phone, location, country, LinkedIn.",
            "Work experience: title, company, dates, description, current-role flag, plus canonical Field of Work tagging.",
            "Education: institution, degree, field, dates, level.",
            "Languages with self-declared proficiency (CEFR A1 → C2).",
            "Skills, categorised by type.",
          ]}
        />
        <Sub>Review and edit</Sub>
        <Steps
          items={[
            "After parsing, the editable preview shows everything the AI extracted.",
            "Correct any field — names, dates, language levels, descriptions.",
            "Use the CEFR dropdown (A1 → C2) for each language.",
            "Click Save to persist the profile.",
          ]}
        />
        <Sub>Duplicate detection</Sub>
        <Bullets
          items={[
            "Email match → 100% confidence: existing profile is updated.",
            "Name + location → 85% confidence: flagged as likely duplicate.",
            "Name only → 50% confidence: flagged for manual review.",
          ]}
        />
        <Sub>Your Quality score</Sub>
        <p>
          Each CV is auto-scored on Experience Quality (35%), Years (25%),
          Education (20%), and Location Match (20%). Colour codes:
          green ≥ 70, yellow ≥ 45, red &lt; 45. This score is intrinsic to
          your profile — independent of any specific job.
        </p>
        <Tip>
          A missing graduation date or location can move you from 45 → 60+.
          Filling in the editable preview is the fastest way to improve.
        </Tip>
      </>
    ),
  },
  {
    id: "documents",
    title: "Motivation Letter & Learning Agreement",
    body: (
      <>
        <Lead>
          Two extra documents that recruiters can use as filters when
          reviewing applications.
        </Lead>
        <Sub>Motivation letter</Sub>
        <Steps
          items={[
            "Open the Motivation Letter section in Documents Upload.",
            "Upload PDF, DOCX, or TXT (max 10 MB).",
            "Text is extracted and stored alongside your profile.",
            "HR sees the document when reviewing your application.",
          ]}
        />
        <Sub>Learning agreement (Erasmus / Internships)</Sub>
        <Steps
          items={[
            "Open the Learning Agreement section.",
            "Upload your signed agreement.",
            "The document is linked to your profile and surfaced on internship applications.",
          ]}
        />
        <Tip>
          Upload these <em>before</em> applying to internships — many
          recruiters use them as a first filter for Erasmus+ candidates.
        </Tip>
      </>
    ),
  },
  {
    id: "jobs",
    title: "Browsing & Applying to Jobs",
    body: (
      <>
        <Lead>
          Browse open positions, filter to what fits, and apply with a single
          click.
        </Lead>
        <Sub>Find jobs</Sub>
        <Bullets
          items={[
            "Open Job Openings from the sidebar.",
            "Search by title, department, location, or country.",
            "Filter by job type (Full-time, Part-time, Contract, Internship) and department.",
            "Results are paginated (default 100 per page).",
          ]}
        />
        <Sub>Job card</Sub>
        <Bullets
          items={[
            "Title, type badge, department, location, country.",
            "Status (Open, Draft, Closed, Archived) — only Open jobs are applyable.",
            "Link to the original posting if synced from external source.",
          ]}
        />
        <Sub>Apply</Sub>
        <Steps
          items={[
            "Hover a job card to reveal the Apply button.",
            "Click Apply — the application is submitted instantly.",
            "Confirmation appears: 'Application submitted' or 'Already applied'.",
            "One application per job — once you withdraw you can't re-apply to the same listing.",
          ]}
        />
      </>
    ),
  },
  {
    id: "internships",
    title: "Browsing & Applying to Internships",
    body: (
      <>
        <Lead>
          Internships have their own page so you can see start/end dates,
          stipends, and Erasmus+ markers easily.
        </Lead>
        <Sub>Find internships</Sub>
        <Bullets
          items={[
            "Open Internships in the sidebar (or filter Job Openings by type Internship).",
            "Only internships marked Active are applyable.",
            "Each card shows title, department, location, country, dates, stipend, Erasmus+ badge, mentor name and email.",
          ]}
        />
        <Sub>Apply</Sub>
        <p>
          The flow is identical to regular jobs — click Apply. If a learning
          agreement is required, upload it via Documents Upload before
          applying so HR sees it on your application.
        </p>
      </>
    ),
  },
  {
    id: "applications",
    title: "Tracking Your Applications",
    body: (
      <>
        <Lead>
          My Applications consolidates every submission you've made, with
          live status updates.
        </Lead>
        <Sub>Statuses</Sub>
        <Bullets
          items={[
            "Submitted — application received.",
            "Under Review — HR is reviewing.",
            "Invited — you've been invited for an assessment.",
            "Assessed — assessment completed and scored.",
            "Shortlisted — you've advanced to the next stage.",
            "Rejected — application not selected.",
            "Withdrawn — you withdrew the application.",
          ]}
        />
        <Sub>Layout</Sub>
        <Bullets
          items={[
            "Active applications appear at the top.",
            "Past (withdrawn / rejected) applications appear in a separate section.",
            "Stats cards show total active applications and pending review count.",
            "Internship applications are tagged with a graduation cap and may show a Learning Agreement link.",
          ]}
        />
        <Sub>Withdraw</Sub>
        <Steps
          items={[
            "On any active application, click Withdraw.",
            "Status changes to Withdrawn and the application moves to Past Applications.",
            "HR is automatically notified of the withdrawal.",
          ]}
        />
        <Note>
          You cannot re-apply to a job after withdrawing. Apply only when
          you're sure.
        </Note>
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
          by an LLM with structured rubrics. HR chooses the mode when
          inviting you; you take it through a magic link.
        </Lead>
        <Sub>How invitations work</Sub>
        <Bullets
          items={[
            "A notification appears in your Notifications panel.",
            "An email arrives with a magic link (Resend, with a copy-link fallback).",
            "Magic links expire after 48 hours by default — a countdown shows time remaining.",
            "No login required: the token in the link authorises access.",
          ]}
        />
        <Sub>Mode 1 — Written Assessment</Sub>
        <Bullets
          items={[
            "About 30 minutes, async, text prompts and written answers.",
            "Auto-graded by an LLM against a CEFR-aligned rubric.",
            "Scored immediately on submission with sub-scores (grammar, vocabulary, clarity, fluency).",
          ]}
        />
        <Sub>Mode 2 — Real-time AI Interview</Sub>
        <Bullets
          items={[
            "Live voice conversation backed by a FastAPI sidecar (Whisper STT + LLM interviewer).",
            "Browser TTS speaks the questions; browser STT transcribes your answers.",
            "Per-question timer counts down; clarification questions (input ending in '?') don't reset it.",
            "Sub-scores: pronunciation, fluency, grammar, vocabulary, coherence.",
            "Anti-hallucination guardrail: empty-evidence FAIL verdicts are auto-promoted to PASS.",
            "Typical duration: ~15–20 minutes, ~6–8 turns.",
          ]}
        />
        <Note>
          The AI Interview only works in Chrome or Edge — it relies on browser
          Speech Recognition. Firefox and Safari are not supported for the
          voice flow.
        </Note>
        <Sub>Two interview-mode flavours</Sub>
        <Bullets
          items={[
            "Technical — a specific skill from your profile, single-topic enforcement.",
            "Language — free-form English conversation graded on grammar/vocabulary/fluency. Pass threshold: CEFR B1 or higher.",
          ]}
        />
        <Sub>Per-skill verification (role-play)</Sub>
        <p>
          For specific skills on your CV, HR (or you, via AI Skill Validation
          in the sidebar) can launch a short scenario-based Q&amp;A. The LLM
          plays a partner, you answer, and the LLM grades the competency
          evidence. Results show on your profile alongside your CV.
        </p>
        <Sub>Taking an assessment</Sub>
        <Steps
          items={[
            "Click the magic link from your email or notification.",
            "For Interview mode, grant microphone (and camera if requested) when prompted.",
            "Follow the on-screen instructions — speak clearly, stay on-topic.",
            "Submit when complete.",
          ]}
        />
        <Sub>Reading your results</Sub>
        <Bullets
          items={[
            "Overall score (0–100) plus CEFR estimate: A1 (0–19), A2 (20–39), B1 (40–59), B2 (60–74), C1 (75–89), C2 (90–100).",
            "Dimension sub-scores depend on the mode.",
            "Evidence trail (interview mode): the specific turns that justified the verdict.",
            "Borderline indicator on scores 45–60 — HR may offer an improvement track.",
            "AI-generated feedback summary highlights strengths and gaps.",
          ]}
        />
      </>
    ),
  },
  {
    id: "notifications",
    title: "Notifications",
    body: (
      <>
        <Lead>
          The Notifications page is your inbox for everything the platform
          sends you.
        </Lead>
        <Sub>What you receive</Sub>
        <Bullets
          items={[
            "Jobs — new job posted, new internship posted, job status changed.",
            "Applications — application received, status changed, withdrawal confirmed.",
            "Assessments — invitations and result-ready alerts.",
            "Profile — CV upload confirmed, candidate status change.",
            "Direct emails sent to you by HR through the platform.",
            "Promotional campaigns — rich-text announcements with images and links.",
          ]}
        />
        <Sub>Managing the feed</Sub>
        <Bullets
          items={[
            "Bell icon shows the unread badge.",
            "Mark individual or all notifications as read.",
            "Pinned campaigns stay at the top.",
            "Archived campaigns are automatically hidden from your view.",
          ]}
        />
        <Note>
          Notifications respect your preferences — categories you opted out of
          (in Profile Settings) won't reach you.
        </Note>
      </>
    ),
  },
  {
    id: "profile",
    title: "Profile & Settings",
    body: (
      <>
        <Lead>Your single hub for personal info, career preferences, and notification opt-outs.</Lead>
        <Sub>Personal information</Sub>
        <Bullets
          items={[
            "First / last name.",
            "Email and phone.",
            "Location and country.",
            "LinkedIn URL.",
            "Date of birth.",
            "Nationality (searchable dropdown of 195+ entries).",
            "Bio — a short description about yourself.",
          ]}
        />
        <Sub>Career preferences</Sub>
        <Bullets
          items={[
            "Willing to relocate — yes / no toggle.",
            "Availability — Immediately, 1 month, 2 months, 3+ months.",
            "Work model — Remote, Hybrid, On-site.",
          ]}
        />
        <Sub>Notification preferences</Sub>
        <Bullets
          items={[
            "Job notifications — alerts for new jobs.",
            "Internship notifications — alerts for new internships.",
            "Only my country — restricts alerts to your home country.",
            "Highlights & announcements — promotional campaigns from HR.",
            "Field of work filter — narrow alerts to specific fields (Computer Science, Marketing, etc.). Empty means all.",
          ]}
        />
        <p>Toggle changes are saved automatically.</p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy & Data Control",
    body: (
      <>
        <Bullets
          items={[
            "The platform stores only what you upload (CV, documents, profile fields) plus a record of your applications, assessments, and notifications.",
            "CVs live in Supabase Storage; structured AI-extracted data lives in Postgres.",
            "HR sees your CV-derived data, application history, assessment results, and any contact emails sent through the platform.",
            "There is no password — auth is delegated to Google OAuth via Supabase.",
            "Notification opt-outs are controlled in Profile Settings.",
            "For account or data deletion, contact your HR contact at adidas; deletion is currently a manual process.",
          ]}
        />
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <Bullets
          items={[
            "AI Interview microphone not working → use Chrome / Edge, grant mic permission, reload.",
            "TTS (interviewer voice) silent → check tab is not muted, toggle the speaker icon in the interview UI.",
            "CV parsing missed information → open the editable preview after upload and correct fields manually; re-uploading replaces the parsed data.",
            "Magic link expired → ask HR to resend; links are one-shot and expire after 48 hours.",
            "'Already applied' on a job you withdrew → expected; withdrawn applications cannot be re-submitted.",
            "Notifications missing → check Profile Settings → Notification Preferences; you may have opted out of that category.",
          ]}
        />
      </>
    ),
  },
];
