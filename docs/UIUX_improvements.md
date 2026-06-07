# UI/UX Improvements

> Analysis of the Talent Intelligence & Language Verification Platform front-end.
> Scope: `src/app/**` (App Router pages), `src/client/**` (components, design system), `src/app/globals.css`.
> Stack reviewed: Next.js 16 App Router, shadcn/ui, Tailwind 4, Recharts, Sonner, custom adidas fonts.
>
> Each item is tagged with effort (S / M / L) and impact (Low / Med / High). Items are ordered so the
> highest-leverage, lowest-cost fixes come first.

---

## TL;DR — Top 12 wins

| # | Improvement | Effort | Impact |
|---|---|---|---|
| 1 | Add reusable `PageHeader`, `EmptyState`, `LoadingState` components and apply everywhere | M | High |
| 2 | Stop silent failures — surface every fetch error via toast or inline error | M | High |
| 3 | Make tables responsive (card-stack on mobile, sticky header + horizontal scroll on tablet) | L | High |
| 4 | Add `error.tsx`, `loading.tsx`, `not-found.tsx` at app + dashboard level | S | High |
| 5 | Replace blank tables/grids with friendly empty states + CTAs | M | High |
| 6 | Add icons (not just color) to all status badges for color-blind accessibility | M | High |
| 7 | Add `aria-label` to all icon-only buttons; `aria-sort` to sortable headers | M | Med |
| 8 | Wire up dark-mode toggle (`next-themes` is already installed but unused) | S | Med |
| 9 | Remove the unused Bebas Neue font (wasted download) or actually use it | S | Low |
| 10 | Persist filters/pagination in URL params (Candidates, Jobs) | M | Med |
| 11 | Consistent loading skeletons on every list/table page | M | Med |
| 12 | Add "Clear all filters" + active-filter chips on the Candidates page | S | Med |

---

## 1. Design-system gaps (fix once, benefit everywhere)

These are missing shared primitives. Building them removes duplicated, inconsistent code across ~16 pages.

### 1.1 No reusable `PageHeader` — `M` / `High`
Every page hand-rolls its title block, so spacing, sizing, and the title/description/actions layout
drift between pages. Create `src/client/components/ui/page-header.tsx`:

```tsx
<PageHeader
  title="Candidates"
  description="Search, filter, and act on your talent pool."
  actions={<Button>Add candidate</Button>}
/>
```

Adopt it across all dashboard routes for consistent vertical rhythm and a single place to add
breadcrumbs later.

### 1.2 No reusable `EmptyState` — `M` / `High`
The only empty state is an inline helper in [src/app/dashboard/analytics/page.tsx](src/app/dashboard/analytics/page.tsx) —
just centered grey text, fixed `h-[280px]`, not reusable. Most list pages (Candidates, Jobs,
Applications, Ambassador, Outreach, Job Matching) render a **blank** grid/table when there's no data,
so users can't tell "loading" from "nothing here".

Build a shared component supporting an icon, title, description, and an optional CTA:

```tsx
<EmptyState
  icon={Users}
  title="No candidates yet"
  description="Upload CVs or wait for applications to populate your pool."
  action={<Button asChild><Link href="/dashboard/upload">Upload CVs</Link></Button>}
/>
```

### 1.3 No reusable `LoadingState` / consistent skeletons — `M` / `Med`
Loading is inconsistent: Analytics shows a skeleton, but Candidates, Jobs, Applications, Ambassador,
Outreach, and Job Matching show a **blank screen** while fetching. Ship a small set of skeleton
presets (`TableSkeleton`, `CardGridSkeleton`, `StatCardsSkeleton`) and use them on every list page.

### 1.4 No `DataTable` abstraction — `L` / `Med`
Tables are raw `<table>` markup re-implemented per page, each re-coding sorting, pagination, selection,
and (inconsistently) responsiveness. A thin `DataTable` wrapper (column defs + built-in sort/paginate/
empty/loading) would eliminate the largest source of UX drift. The Candidates and Match-Candidates
tables are the worst offenders.

### 1.5 Missing route boundaries — `S` / `High`
There are **no** `error.tsx`, `loading.tsx`, or `not-found.tsx` files anywhere in `src/app`.
- Add `src/app/error.tsx` and `src/app/dashboard/error.tsx` → a branded "Something went wrong" with a Retry button instead of Next.js's default error screen.
- Add `src/app/dashboard/loading.tsx` → instant skeleton on navigation.
- Add `src/app/not-found.tsx` → branded 404 with a link home.

---

## 2. Feedback & error handling

### 2.1 Silent failures everywhere — `M` / `High`
Many fetches swallow errors with `.catch(() => {})` or `.catch(() => setX([]))`, leaving the user staring
at an empty page on a network error with no idea anything failed. Examples: dashboard activity log,
candidate list, applications list, withdraw action, notes save.

**Fix:** every catch should either `toast.error(...)` or render an inline error block with a Retry button.
Reserve truly silent catches only for non-critical background polling (e.g. the unread-count poll in
[src/client/components/layout/sidebar.tsx](src/client/components/layout/sidebar.tsx)).

### 2.2 Inconsistent feedback channels — `S` / `Med`
Some flows use `toast.error()`, others render inline `<p className="text-destructive">`, others nothing.
Pick a convention: **toasts for actions** (save, send, delete), **inline messages for form-field validation**.

### 2.3 No optimistic / progress feedback on bulk ops — `M` / `Med`
Bulk email / bulk status change on the Candidates page only shows a final toast. For large batches the
user has no progress indicator and may navigate away. Add a progress indicator or a disabled-with-count
state ("Sending 12 of 40…").

---

## 3. Accessibility (WCAG AA gaps)

### 3.1 Color-only status badges — `M` / `High`
Status is conveyed purely by color (green = hired/passed/open, red = rejected/failed/closed, etc.) across
Candidates, Applications, Assessments, Notifications, Ambassador, Match-Candidates. Color-blind users
can't distinguish them. **Add a small icon and/or text inside each badge** (the codebase already imports
lucide icons like `CheckCircle2`, `XCircle`, `Trophy` — reuse them).

### 3.2 Icon-only buttons lack labels — `M` / `Med`
Row-action buttons (star/shortlist, edit, delete, pin, archive, contact) are icon-only with no
`aria-label`. Screen readers announce nothing meaningful. Add `aria-label` to each, and wrap in the
existing `Tooltip` for sighted users too.

### 3.3 Sortable headers and progress bars — `S` / `Med`
- Sortable `<TableHead>` buttons have no `aria-sort` / `aria-label`; the `ArrowUpDown` direction isn't announced.
- The candidate score bars use inline-width `<div>`s with no `role="progressbar"` / `aria-valuenow`.

### 3.4 Expandable rows / collapsibles — `S` / `Low`
Expandable match-criteria rows, upload-extraction sections, and assessment result cards lack
`aria-expanded`. Add it to the trigger and `aria-controls` pointing at the panel.

### 3.5 Skip link & focus management — `S` / `Low`
No "Skip to main content" link, and modals don't visibly trap/return focus. Add a skip link in the
dashboard layout and verify Escape/return-focus on dialogs.

### 3.6 Cookie consent ARIA — `S` / `Low`
[src/client/components/ui/cookie-consent.tsx](src/client/components/ui/cookie-consent.tsx) sets
`aria-modal="false"` — if it blocks interaction it should be `true`; if it's a non-blocking banner,
`role="region"` is more correct than `role="dialog"`.

---

## 4. Mobile & responsiveness

### 4.1 Dense tables break on mobile — `L` / `High`
Candidates (9 columns), Received Applications, and Match-Candidates compress columns into unreadable
slivers with no horizontal scroll, and row-action popovers can render off-screen. Options:
- Wrap tables in `overflow-x-auto` with a **sticky first column + header** (quick win), and/or
- Render a **card layout below `md:`** (each row → a stacked card). Best UX, more work.

### 4.2 Tap-target sizes — `S` / `Med`
Many icon-only actions are smaller than the 44×44px recommended touch target. Bump padding on mobile.

### 4.3 Dialog overflow — `S` / `Low`
`max-w-2xl` create/edit dialogs (Jobs, Ambassador) can overflow small viewports. Add
`max-h-[90vh] overflow-y-auto` and verify on a 375px-wide viewport.

---

## 5. Per-page UX friction

### 5.1 Candidates ([src/app/dashboard/candidates/page.tsx](src/app/dashboard/candidates/page.tsx)) — `M` / `High`
- Filters (6 of them) and pagination **reset on refresh** — persist in URL params.
- No **"Clear all filters"** button and no active-filter chips — add both.
- Blank table on empty results — add an empty state with the active query echoed back.
- 300ms search debounce gives no "searching…" affordance — add a subtle spinner in the input.
- Segment side-panel doesn't close after selecting — tighten the flow.

### 5.2 Jobs ([src/app/dashboard/jobs/page.tsx](src/app/dashboard/jobs/page.tsx)) — `M` / `Med`
- **No edit** — HR must delete + recreate a job. Add an edit dialog (the create form already exists).
- No filtering/search on the HR jobs list.
- Pagination not in URL → back button loses page.
- Section headers in the create dialog ("Requirements (optional)") are plain text — use real headings.

### 5.3 Applications ([src/app/dashboard/applications/page.tsx](src/app/dashboard/applications/page.tsx)) — `S` / `Med`
- No filter/sort (e.g. pending vs. completed, newest first).
- Withdraw failures are silent — add a toast.
- Blank grid when no applications — add an empty state + "Browse jobs" CTA.

### 5.4 Analytics ([src/app/dashboard/analytics/page.tsx](src/app/dashboard/analytics/page.tsx)) — `M` / `Med`
- No date-range filter on the application-trend line chart (always all-time).
- No drill-down (clicking a funnel stage → candidates in that stage).
- No PNG/CSV export of charts.
- Funnel labels use a hardcoded `fill="#888"` — invisible/low-contrast in dark mode. Use a token.
- Custom "My charts" section is visually disconnected from the default charts — unify the heading rhythm.

### 5.5 Upload ([src/app/dashboard/upload/page.tsx](src/app/dashboard/upload/page.tsx)) — `M` / `Med`
- Drag-and-drop zone has no `aria-label`; the hidden file input may be invisible to AT.
- No multi-file selection; no auto-save of the extraction review (explicit Save only).
- If extraction is wrong there's no "re-upload" path without starting over.

### 5.6 Notifications ([src/app/dashboard/notifications/page.tsx](src/app/dashboard/notifications/page.tsx)) — `S` / `Med`
- No search; no bulk actions (archive all / mark all read for a tab).
- Unread state is conveyed only via `opacity-60` — not announced to AT and low-contrast. Add a dot/badge.

### 5.7 Settings ([src/app/dashboard/settings/page.tsx](src/app/dashboard/settings/page.tsx)) — `S` / `Med`
- Unclear whether changes auto-save or need an explicit Save — make the Save button + dirty state obvious.
- No success confirmation pattern consistent with the rest of the app.

### 5.8 Ambassador / Outreach — `S` / `Med`
- Both render blank grids when empty — add empty states.
- Ambassador detail shows an application count but doesn't link to the applications — make it clickable.
- Outreach campaigns have no scheduling and no performance stats (open/click) — future enhancement.

### 5.9 Improvement ([src/app/dashboard/improvement/page.tsx](src/app/dashboard/improvement/page.tsx)) — `S` / `Low`
- Still a "feature in development" stub and it's hidden from nav. Either finish it or keep it hidden;
  don't ship a dead placeholder.

---

## 6. Theming & typography

### 6.1 Dark mode is built but unreachable — `S` / `Med`
`globals.css` defines a complete `.dark` palette and `next-themes@0.4.6` is installed, but it's only
consumed by [src/client/components/ui/sonner.tsx](src/client/components/ui/sonner.tsx). There is **no
`ThemeProvider`** in [src/app/layout.tsx](src/app/layout.tsx) and **no toggle**. Wire up
`next-themes` `ThemeProvider` and add a theme switch in the sidebar footer. Audit hardcoded colors
(e.g. chart `fill="#888"`, the Porto promo's `from-blue-50 to-sky-50`) so they respect the dark theme.

### 6.2 Unused Bebas Neue font — `S` / `Low`
`Bebas_Neue` is loaded in [src/app/layout.tsx](src/app/layout.tsx) and exposed as `--font-bebas-neue`,
but `font-bebas-neue` is never used anywhere. That's a wasted font download. Either remove it or assign
it to a deliberate display style (e.g. big stat numbers / hero headings).

### 6.3 Mixed font systems — `S` / `Low`
The app mixes Google `Geist` (loaded via `next/font`) with custom adidas `font-adihaus-*` /
`font-adineue-*` classes. Document which font is the canonical body vs. heading font so new pages stay
consistent.

---

## 7. Forms

### 7.1 No shared form approach — `M` / `Med`
Forms use ad-hoc `useState` + manual `handleSubmit`, with validation duplicated per form and error
display split between toasts and inline `<p>`. Standardize on **react-hook-form + the existing Zod
schemas** (or at least a small `useForm`-style wrapper) for consistent validation UX, disabled-submit-
while-pending, and field-level errors.

### 7.2 Required-field affordances — `S` / `Low`
Required fields aren't visually marked (no asterisk / "required" hint) until submit fails. Mark them up front.

---

## 8. Power-user / polish (nice-to-have)

- **Command palette (⌘K):** the `command` primitive already exists — wire a global quick-nav/search.
- **Export:** CSV/PDF export on Candidates, Match-Candidates, and Assessments tables.
- **Bulk actions** beyond Candidates: Jobs (close many), Notifications (archive many).
- **Keyboard shortcuts** for frequent actions (star, mark read).
- **Data freshness:** show "last updated" + a manual refresh on the dashboard activity log.
- **Onboarding:** there's a public welcome page but no post-sign-in onboarding; first-run users land on a
  cold dashboard.

---

## Suggested sequencing

1. **Foundations (week 1):** `PageHeader`, `EmptyState`, `LoadingState` components + `error.tsx` /
   `loading.tsx` / `not-found.tsx`. Apply to all list pages. (Items 1.1–1.5, 5.x empty states.)
2. **Reliability & a11y (week 2):** kill silent failures (2.1), badge icons (3.1), icon-button labels
   (3.2), `aria-sort` (3.3). (Items in §2 and §3.)
3. **Responsive tables (week 3):** mobile table strategy (4.1) + tap targets (4.2).
4. **Theming & forms (week 4):** dark-mode toggle (6.1), remove Bebas Neue (6.2), form standardization (7.1).
5. **Power-user polish (ongoing):** §8.

> None of these change data models or APIs — they're presentation-layer only, consistent with the onion
> architecture (Presentation layer in `src/app` + `src/client`).
