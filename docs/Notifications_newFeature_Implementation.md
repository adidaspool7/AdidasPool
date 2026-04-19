# Notifications — New Feature Implementation Plan

Date: 2026-03-11
Status: **IN PROGRESS**

---

## 0) Codebase Audit — Findings (resolved)

### Candidate profile fields (already in Prisma)
| Field | Model | Column | Notes |
|-------|-------|--------|-------|
| Country | `Candidate` | `country String?` | Indexed. Populated from CV parse or self-declared in Settings |
| Location | `Candidate` | `location String?` | City-level |
| Nationality | `Candidate` | `nationality String?` | Self-declared |
| Field of study | `Education` (1:N) | `fieldOfStudy String?` | Per-education record |
| Education level | `Education` | `level EducationLevel?` | Enum: HIGH_SCHOOL, BACHELOR, MASTER, PHD, VOCATIONAL, OTHER |
| Skills | `Skill` (1:N) | `name String`, `category String?` | Extracted from CV |
| Experience | `Experience` (1:N) | `jobTitle`, `company`, etc. | Relevance-scored |

**Decision**: For notification targeting, use `Candidate.country` for country filter and collect `Education.fieldOfStudy` values as set of fields. No new profile columns needed.

### Background worker / queue infra
- **BullMQ v5.70.0** + **ioredis v5.9.3** are installed in `package.json` but **NOT wired**.
- Bulk upload uses Next.js `after()` for pseudo-background processing.
- **Decision**: For MVP, use synchronous batched inserts within the API request (wrapped in try/catch, non-blocking). For promotional campaigns with large audiences, use `after()` from Next.js. BullMQ wiring deferred to Phase 3.

### Existing notification system (what we have today)
- **Prisma model**: `Notification` with `type: NotificationType` (enum), `message`, `read`, `jobId?`, `candidateId?`, `applicationId?`.
- **Stale enum**: `NotificationType { APPLICATION_RECEIVED, ASSESSMENT_COMPLETED, CV_UPLOADED, STATUS_CHANGE }` — but use-cases already write `JOB_POSTED`, `APPLICATION_WITHDRAWN`, `APPLICATION_STATUS_CHANGED`, `ASSESSMENT_INVITE` via `as any` casts.
- **Repository**: `PrismaNotificationRepository` — basic CRUD (findAll, findUnread, create, markAsRead, markAllAsRead). No filtering by candidateId or role.
- **API**: `GET /api/notifications` returns ALL notifications (no scoping). `PATCH` marks read.
- **UI**: Single flat list, HR-oriented ("candidate applied to job" cards). No candidate view. No preferences.
- **Use-case wiring**: `job.use-cases` creates JOB_POSTED for ALL candidates (no targeting); `application.use-cases` creates APPLICATION_RECEIVED/WITHDRAWN/STATUS_CHANGED; `assessment.use-cases` creates ASSESSMENT_INVITE.

---

## 1) Requirements

### 1.1 System Notifications (event-driven)

**Candidate-side:**
| ID | Event | Trigger | Target |
|----|-------|---------|--------|
| S1 | New internship posted | HR creates internship with status=ACTIVE | All candidates (filtered by prefs) |
| S2 | New job posted | HR creates a non-internship job | All candidates (filtered by prefs) |
| S3 | Job/internship state changed | HR updates internshipStatus or job status | Candidates who applied to that job |
| S4 | Application status changed | HR changes application to UNDER_REVIEW / INVITED / SHORTLISTED / REJECTED | The candidate who owns the application |
| S5 | Assessment invite | HR creates assessment for candidate | The candidate |
| S6 | Application received confirmation | Candidate applies | The candidate (confirmation) |

**HR-side:**
| ID | Event | Trigger | Target |
|----|-------|---------|--------|
| H1 | Candidate applied | Candidate submits application | HR (all) |
| H2 | Candidate withdrew | Candidate withdraws application | HR (all) |
| H3 | Assessment completed | Candidate submits assessment | HR (all) |
| H4 | New CV uploaded | Candidate uploads CV | HR (all) |

### 1.2 Candidate Notification Preferences
Candidates can configure (in `/dashboard/notifications`):
- **Receive job notifications**: yes/no (default: yes)
- **Receive internship notifications**: yes/no (default: yes)
- **Only my country**: yes/no — filter JOB_POSTED/INTERNSHIP_POSTED to `job.country === candidate.country` (default: no)
- **Only my fields**: multi-select of fields of interest — filter by `job.department` intersection (default: empty = all)
- **Receive promotional**: yes/no (default: yes)

### 1.3 Promotional Notifications (new feature)
- HR can compose a message: **title**, **body** (rich text / markdown), optional **image URL**, optional **survey/link URL**.
- **Targeting**: all candidates, or filtered by country / education level / field of study / tags.
- **Audience preview**: show estimated count before sending.
- **Status lifecycle**: DRAFT → SENT (immediate) or DRAFT → SCHEDULED → SENT.
- **Audit**: who sent, when, how many recipients.
- Extra ideas:
  - **Pinned announcements**: mark a promo as "pinned" so it stays at the top of the notification feed.
  - **Read receipt stats**: HR can see how many candidates read the promo.

---

## 2) Data Model Changes

### 2.1 Expand `NotificationType` enum
```prisma
enum NotificationType {
  // System — candidate-facing
  JOB_POSTED
  INTERNSHIP_POSTED
  JOB_STATE_CHANGED
  APPLICATION_RECEIVED     // confirmation to candidate
  APPLICATION_STATUS_CHANGED
  APPLICATION_WITHDRAWN
  ASSESSMENT_INVITE
  ASSESSMENT_COMPLETED

  // System — HR-facing
  HR_APPLICATION_RECEIVED
  HR_APPLICATION_WITHDRAWN
  HR_ASSESSMENT_COMPLETED
  HR_CV_UPLOADED

  // Promotional
  PROMOTIONAL
}
```

### 2.2 Extend `Notification` model
```prisma
model Notification {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  type    NotificationType
  message String
  read    Boolean @default(false)

  // Audience scoping
  targetRole  String?  // "CANDIDATE" | "HR" | null (both)

  // Related entities
  jobId         String?
  job           Job?       @relation(fields: [jobId], references: [id], onDelete: Cascade)
  candidateId   String?
  candidate     Candidate? @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  applicationId String?
  campaignId    String?    // links to PromoCampaign if type=PROMOTIONAL

  @@index([candidateId])
  @@index([targetRole])
  @@index([read])
  @@index([createdAt])
  @@index([type])
}
```

### 2.3 New model: `NotificationPreference`
```prisma
model NotificationPreference {
  id          String   @id @default(cuid())
  candidateId String   @unique
  candidate   Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  // System notification filters
  jobNotifications        Boolean @default(true)
  internshipNotifications Boolean @default(true)
  onlyMyCountry           Boolean @default(false)
  fieldFilters            String[] // array of department/field strings; empty = all

  // Promotional
  promotionalNotifications Boolean @default(true)

  updatedAt DateTime @updatedAt
}
```

### 2.4 New model: `PromoCampaign`
```prisma
model PromoCampaign {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  title     String
  body      String    // Markdown or plain text
  imageUrl  String?   // Optional image (Vercel Blob URL)
  linkUrl   String?   // Optional CTA / survey link
  isPinned  Boolean   @default(false)

  // Targeting
  targetAll       Boolean  @default(true)
  targetCountries String[] // empty = all countries
  targetFields    String[] // empty = all fields
  targetEducation String[] // education level filters

  // Status
  status      CampaignStatus @default(DRAFT)
  sentAt      DateTime?
  sentBy      String?        // HR user identifier
  recipientCount Int?        // filled after send

  @@index([status])
}

enum CampaignStatus {
  DRAFT
  SENT
  CANCELLED
}
```

### 2.5 Add relation on Candidate
```prisma
// In Candidate model, add:
notificationPreference NotificationPreference?
```

---

## 3) API Surface

### 3.1 Updated endpoints
| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | `/api/notifications` | Both | List notifications scoped to role. Candidate sees own (candidateId match + targetRole=CANDIDATE). HR sees HR-targeted. Query params: `?unread=true&type=PROMOTIONAL&limit=50&offset=0` |
| PATCH | `/api/notifications` | Both | `{ id }` to mark one read, or `{ markAllRead: true }` |
| GET | `/api/notifications/preferences` | Candidate | Get candidate's notification preferences |
| PUT | `/api/notifications/preferences` | Candidate | Update preferences |
| POST | `/api/notifications/campaigns` | HR | Create a promo campaign |
| GET | `/api/notifications/campaigns` | HR | List all campaigns (with stats) |
| POST | `/api/notifications/campaigns/:id/send` | HR | Send campaign (creates Notification rows) |
| DELETE | `/api/notifications/campaigns/:id` | HR | Cancel/delete a draft campaign |

### 3.2 Repository interface changes
```typescript
export interface INotificationRepository {
  // Queries
  findForCandidate(candidateId: string, filters?: { unread?: boolean; type?: string; limit?: number; offset?: number }): Promise<any[]>;
  findForHR(filters?: { unread?: boolean; type?: string; limit?: number; offset?: number }): Promise<any[]>;
  countUnread(candidateId?: string, targetRole?: string): Promise<number>;

  // Mutations
  create(data: { type: string; message: string; targetRole?: string; jobId?: string; candidateId?: string; applicationId?: string; campaignId?: string }): Promise<any>;
  createMany(data: Array<{ type: string; message: string; targetRole?: string; jobId?: string; candidateId?: string; campaignId?: string }>): Promise<number>;
  markAsRead(id: string): Promise<any>;
  markAllAsRead(candidateId?: string, targetRole?: string): Promise<void>;

  // Preferences
  getPreferences(candidateId: string): Promise<any | null>;
  upsertPreferences(candidateId: string, prefs: any): Promise<any>;

  // Campaigns
  createCampaign(data: any): Promise<any>;
  findCampaigns(): Promise<any[]>;
  updateCampaign(id: string, data: any): Promise<any>;
  deleteCampaign(id: string): Promise<void>;
}
```

---

## 4) Targeting Logic (server-side)

### 4.1 System notification targeting (on JOB_POSTED / INTERNSHIP_POSTED)
```
function getTargetCandidates(job, allCandidates, allPreferences):
  targets = []
  for each candidate:
    prefs = allPreferences[candidate.id] or DEFAULTS
    if job.type == INTERNSHIP and !prefs.internshipNotifications: skip
    if job.type != INTERNSHIP and !prefs.jobNotifications: skip
    if prefs.onlyMyCountry and candidate.country != job.country: skip
    if prefs.fieldFilters.length > 0:
      if job.department not in prefs.fieldFilters: skip
    targets.push(candidate.id)
  return targets
```

### 4.2 Promotional targeting
```
function getPromoTargets(campaign, allCandidates, allPreferences):
  targets = []
  for each candidate:
    prefs = allPreferences[candidate.id] or DEFAULTS
    if !prefs.promotionalNotifications: skip
    if !campaign.targetAll:
      if campaign.targetCountries.length > 0 and candidate.country not in campaign.targetCountries: skip
      if campaign.targetFields.length > 0:
        candidateFields = candidate.education.map(e => e.fieldOfStudy)
        if no intersection: skip
      if campaign.targetEducation.length > 0:
        candidateLevels = candidate.education.map(e => e.level)
        if no intersection: skip
    targets.push(candidate.id)
  return targets
```

---

## 5) UI Changes

### 5.1 `/dashboard/notifications` — Candidate view
- **Tabs**: "All" | "System" | "Promotional"
- **Each card** shows: icon by type, message, time ago, job/internship link if applicable
- **Promotional cards**: show title, body preview, image thumbnail, link button
- **Pinned promos**: sticky at top with a pin icon
- **Preferences section** (collapsible panel or link to modal):
  - Checkboxes: Jobs, Internships, Only my country, Promotional
  - Multi-select: Fields of interest
  - Save button

### 5.2 `/dashboard/notifications` — HR view
- **Tabs**: "All" | "Applications" | "Assessments" | "Campaigns"
- **Campaigns tab**: list of promos with status badges, recipient count, "Create Campaign" button
- **Create Campaign dialog**: title, body (textarea), image upload, link URL, targeting (country multi-select, field multi-select, education), "Preview audience" button, "Send Now" button

### 5.3 Sidebar badge
- Show unread count badge on the Notifications nav item (both roles)

---

## 6) Security & Privacy
- Candidate API endpoints verify candidateId from session/cookie — never expose other candidates' notifications
- HR endpoints gated by role check
- Campaign body rendered with sanitized HTML (no raw `dangerouslySetInnerHTML`; use markdown renderer or text-only)
- Image URLs validated (must be from our storage domain or allowed external domains)
- `createMany` limited to reasonable batch sizes (max 5000 per call)

---

## 7) Implementation Checklist

### Phase 1 — Schema + Backend (current sprint)
- [ ] **7.1** Expand `NotificationType` enum in Prisma (add all new types)
- [ ] **7.2** Add `targetRole` field to `Notification` model
- [ ] **7.3** Create `NotificationPreference` model
- [ ] **7.4** Create `PromoCampaign` model + `CampaignStatus` enum
- [ ] **7.5** Add `notificationPreference` relation to `Candidate`
- [ ] **7.6** Run migration: `prisma migrate dev --name notifications_v2`
- [ ] **7.7** Update `INotificationRepository` port with new methods
- [ ] **7.8** Update `PrismaNotificationRepository` implementation (scoped queries, createMany, preferences, campaigns)
- [ ] **7.9** Update `NotificationUseCases` (add preference-aware targeting, campaign CRUD, scoped listing)
- [ ] **7.10** Update job/application/assessment use-cases (use `targetRole`, respect preferences for bulk sends)
- [ ] **7.11** Add API routes: `GET/PUT /api/notifications/preferences`, `POST/GET /api/notifications/campaigns`, `POST /api/notifications/campaigns/:id/send`
- [ ] **7.12** Update `GET /api/notifications` to scope by role + candidateId

### Phase 2 — Frontend
- [ ] **7.13** Rewrite `/dashboard/notifications` page: dual-role view (candidate tabs + HR tabs)
- [ ] **7.14** Add Preferences panel UI for candidates
- [ ] **7.15** Add Campaign creation dialog for HR
- [ ] **7.16** Add unread badge to sidebar nav
- [ ] **7.17** Rich notification cards (type-specific icons, promo cards with images)

### Phase 3 — Polish & Test
- [ ] **7.18** Unit tests: targeting logic, preference filtering
- [ ] **7.19** Build verification
- [ ] **7.20** Smoke test: create job → candidate sees notification; create campaign → candidates see promo

---

## 8) Extra Ideas Implemented
- **H3 / H4**: HR notified on assessment completion and CV upload (added to enum)
- **Pinned promos**: `isPinned` field on PromoCampaign, rendered sticky in candidate feed
- **Read receipt stats**: `recipientCount` on campaign + count read notifications per campaign for HR dashboard
- **Audience preview**: query candidate count matching targeting before send
- **Unread badge**: sidebar shows live unread count
