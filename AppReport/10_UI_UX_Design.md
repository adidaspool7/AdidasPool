# 10 — UI/UX Design

## Interface Design, Component Architecture, and User Experience

---

## 10.1 Design System Foundation

### 10.1.1 Technology Stack

| Technology | Role |
|-----------|------|
| **shadcn/ui** | Component library (copy-paste, fully customizable) |
| **Radix UI** | Accessible, unstyled primitives (underlying shadcn/ui) |
| **Tailwind CSS 4** | Utility-first CSS framework |
| **Lucide React** | Icon system (~15 icons used across navigation + pages) |
| **Geist (Sans + Mono)** | Typography — Google Fonts, CSS custom properties |
| **TipTap v2** | Rich text editor (notifications/campaigns) |
| **cmdk** | Command palette primitives (Combobox/MultiSelect patterns) |
| **tw-animate-css** | Animation utilities for transitions |

### 10.1.2 Color System

The design system uses **CSS custom properties** with OKLCH color space, supporting both light and dark themes:

| Token | Purpose |
|-------|---------|
| `--background` / `--foreground` | Base page colors |
| `--card` / `--card-foreground` | Card surface colors |
| `--primary` / `--primary-foreground` | Primary action colors |
| `--secondary` / `--secondary-foreground` | Secondary elements |
| `--muted` / `--muted-foreground` | Subdued text and backgrounds |
| `--accent` / `--accent-foreground` | Highlighted interactive elements |
| `--destructive` | Error/danger actions |
| `--border` / `--input` / `--ring` | Form element styling |
| `--chart-1` through `--chart-5` | Analytics chart palette |
| `--sidebar-*` | Sidebar-specific color tokens |
| `--radius` | Global border radius (0.625rem base) |

Dark mode is supported via the `.dark` CSS class with a full set of inverted OKLCH values.

### 10.1.3 Typography

| Font | CSS Variable | Usage |
|------|-------------|-------|
| Geist Sans | `--font-geist-sans` | Body text, UI labels, headings |
| Geist Mono | `--font-geist-mono` | Code snippets, technical data |

Fonts are loaded via `next/font/google` with `latin` subset for optimal performance.

---

## 10.2 Component Inventory

### 10.2.1 shadcn/ui Components (21 components)

| Component | File | Usage |
|-----------|------|-------|
| Avatar | `avatar.tsx` | Candidate profile images |
| Badge | `badge.tsx` | Status indicators, tags, skill labels |
| Button | `button.tsx` | All interactive actions (variants: default, outline, ghost, destructive) |
| Card | `card.tsx` | Content containers, stat cards, feature highlights |
| Command | `command.tsx` | Combobox search/select patterns (powered by cmdk) |
| Dialog | `dialog.tsx` | Modal dialogs (create job, send notification, confirmations) |
| Dropdown Menu | `dropdown-menu.tsx` | Context menus, action menus |
| Input | `input.tsx` | Text inputs across all forms |
| Label | `label.tsx` | Form field labels |
| Popover | `popover.tsx` | Floating panels (color picker, link insertion, multi-select) |
| Progress | `progress.tsx` | Score bars, upload progress |
| Rich Text Editor | `rich-text-editor.tsx` | TipTap-based editor (custom, see §10.5) |
| Select | `select.tsx` | Single-value dropdowns (status, type filters) |
| Separator | `separator.tsx` | Visual dividers between sections |
| Sheet | `sheet.tsx` | Slide-over panels (mobile navigation) |
| Skeleton | `skeleton.tsx` | Loading placeholders |
| Sonner (Toaster) | `sonner.tsx` | Toast notifications (success, error, info) |
| Table | `table.tsx` | Data tables (candidates, jobs, applications) |
| Tabs | `tabs.tsx` | Tab navigation (notification tabs, settings tabs) |
| Textarea | `textarea.tsx` | Multi-line text inputs (bio, description) |
| Tooltip | `tooltip.tsx` | Hover help text |

### 10.2.2 Custom Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Sidebar` | `components/layout/sidebar.tsx` | Role-aware navigation with sections |
| `RoleProvider` | `components/providers/role-provider.tsx` | Reads `user.app_metadata.role` from Supabase Auth and exposes role/session context |
| `Providers` | `components/providers/providers.tsx` | Composition root for client providers |
| `RichTextEditor` | `components/ui/rich-text-editor.tsx` | TipTap wrapper with toolbar |
| `FieldMultiSelect` | `notifications/page.tsx` (inline) | Combobox-based multi-select for departments |
| Analytics charts | `dashboard/analytics/page.tsx` | Recharts-based funnel, pipeline, top skills, top languages, score distribution, trend, country breakdown |

---

## 10.3 Layout Architecture

### 10.3.1 Root Layout (`app/layout.tsx`)

```
<html>
  <body className="geist-sans geist-mono antialiased">
    <TooltipProvider>
      <Providers>         ← RoleProvider wrapping all children
        {children}
      </Providers>
      <Toaster />         ← Global toast notifications
    </TooltipProvider>
  </body>
</html>
```

### 10.3.2 Dashboard Layout (`app/dashboard/layout.tsx`)

```
┌──────────────────────────────────────────────┐
│                                              │
│  ┌────────┐  ┌─────────────────────────────┐ │
│  │        │  │                             │ │
│  │ Sidebar│  │     Main Content Area       │ │
│  │ (w-64) │  │     (flex-1, p-6)           │ │
│  │        │  │     overflow-y-auto          │ │
│  │        │  │                             │ │
│  │        │  │                             │ │
│  └────────┘  └─────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

- **Sidebar:** Fixed 256px width (`w-64`), full height, border-right
- **Main area:** Fills remaining space, independently scrollable
- **Padding:** 24px (`p-6`) around all page content

### 10.3.3 Landing Page (`app/page.tsx`)

Full-screen centered layout with:
- Gradient background (`from-background to-muted`)
- Hero section with branded pill badge ("adidas Talent Platform")
- Role selection buttons (Candidate / HR)
- Feature highlight cards (3-column grid: Talent Pool, Job Matching, Analytics)

---

## 10.4 Dual-Role Navigation

The sidebar dynamically renders different navigation items based on the selected role.

### Candidate Navigation (3 sections, 9 items)

| Section | Items |
|---------|-------|
| **Personal** | Dashboard, Profile Settings, Notifications, Documents Upload |
| **Opportunities** | Job Openings, Internships, My Applications |
| **Development** | Assessments, Improvement Tracks |

### HR Navigation (4 sections, 10 items)

| Section | Items |
|---------|-------|
| **Core** | Dashboard, Profile Settings, Notifications |
| **Recruitment** | Job Openings, Job Applications, Candidates Evaluation |
| **Internships** | Internships, Internship Applications |
| **Operations** | CV Upload & Processing, Analytics |

### Navigation UX Patterns

- **Active state:** Current path highlighted with `bg-accent text-accent-foreground`
- **Icons:** Each item has a Lucide icon (LayoutDashboard, Users, Briefcase, etc.)
- **Role badge:** Shows "HR Manager" or "Candidate" below the brand logo
- **Role switching:** \"Switch Role\" button at sidebar bottom calls `clearRole()` which signs the user out of Supabase and redirects to the landing page for re-authentication under a different account
- **Loading state:** Sidebar returns `null` during hydration to prevent flash

---

## 10.5 Rich Text Editor (TipTap)

The promotional campaign system includes a full-featured rich text editor built on TipTap v2:

### Extensions (8 + TextStyle)

| Extension | Feature |
|-----------|---------|
| `StarterKit` | Bold, italic, strikethrough, lists, blockquote, headings, code |
| `Underline` | Underline text formatting |
| `TextAlign` | Left, center, right, justify alignment |
| `Image` | Inline image insertion via URL |
| `Link` | Hyperlink insertion with URL dialog |
| `Placeholder` | Ghost text when editor is empty |
| `Superscript` | Superscript text formatting |
| `Color` + `TextStyle` | Text color picker (9 preset colors + custom hex) |

### Toolbar Layout

```
[B] [I] [U] [S] [A^] | [H1] [H2] | [UL] [OL] [❝] | [←] [↔] [→] [⊞] | [🔗] [🖼] [🎨]
```

| Group | Actions |
|-------|---------|
| Formatting | Bold, Italic, Underline, Strikethrough, Superscript |
| Structure | Heading 1, Heading 2 |
| Lists/Blocks | Bullet List, Ordered List, Blockquote |
| Alignment | Left, Center, Right, Justify |
| Media | Link (Popover with URL input), Image (Popover with URL input) |
| Color | Text color picker (Popover with 9 presets + hex input) |

### Color Presets

```
Black, Red, Orange, Green, Blue, Purple, Pink, Brown, Gray
```

---

## 10.6 Page-Level UI Patterns

### 10.6.1 Data Tables

Used on: Candidates, Jobs, Internships, Applications, Notifications

Standard pattern:
1. Page header with title and action button(s)
2. Filter bar (search input + dropdowns + clear button)
3. Data table with headers and rows
4. Pagination controls (Previous/Next + page indicator)

### 10.6.2 Dashboard Cards

The main dashboard uses card-based layouts:
- **Stat cards:** Icon + number + label (e.g., "150 Total Candidates")
- **Quick action cards:** Description + CTA button
- **Role-specific cards:** Different widgets for Candidate vs HR

### 10.6.3 Detail Pages

Used on: Candidate Detail (`candidates/[id]`)

Pattern:
- Back navigation link
- Header card with avatar, name, key stats
- Tabbed sections (Profile, Documents, Assessment History, etc.)
- Inline editing where applicable

### 10.6.4 Forms

Used on: Settings, Job Creation, Notification Composition

Pattern:
- Card container with heading
- Form fields with Label + Input/Select/Textarea
- Zod client-side validation (mirroring server schemas)
- Submit button with loading state
- Toast notification on success/error

### 10.6.5 Modal Dialogs

Used on: Create Job, Send Notification, Campaign Composition

Pattern:
- Trigger button opens Dialog
- Dialog with title + description
- Form content inside dialog body
- Cancel + Confirm action buttons in footer

---

## 10.7 Responsive Design

| Technique | Implementation |
|-----------|---------------|
| Fixed sidebar | 256px on desktop, Sheet component on mobile |
| Fluid content | `flex-1` main area adapts to remaining space |
| Grid responsive | `sm:grid-cols-3` for feature cards, collapses to 1 column |
| Text scaling | `text-4xl sm:text-6xl` for hero headings |
| Spacing | `px-4` on mobile, wider on desktop |

---

## 10.8 Accessibility

| Feature | Implementation |
|---------|---------------|
| Semantic HTML | Radix UI primitives provide proper ARIA roles |
| Keyboard navigation | All Radix components support Tab, Enter, Escape |
| Focus management | Dialog/Popover/Sheet trap focus correctly |
| Screen reader | `aria-label` on icon-only buttons |
| Color contrast | OKLCH color system designed for sufficient contrast |
| Skip navigation | Not explicitly implemented (Radix provides baseline) |

---

## 10.9 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| shadcn/ui over Material UI | Full customization, no CSS-in-JS runtime overhead, copy-paste ownership |
| Tailwind CSS 4 over CSS Modules | Utility-first enables rapid iteration; v4 uses native CSS features |
| Lucide over Font Awesome | Tree-shakable, consistent design, React-native components |
| TipTap over Quill/Draft.js | Extensible, headless, modern API, better React integration |
| Client-side role state | Driven by Supabase Auth (`user.app_metadata.role`); HR vs candidate UI renders from the same session. Role cannot be spoofed because the server trusts `app_metadata.role` enforced by middleware |
| Inline FieldMultiSelect | Built on Popover+Command pattern from shadcn/ui; Combobox with multi-select |
| oklch() color space | Perceptually uniform; better dark mode transitions than hex/hsl |
| Geist font | Modern, clean, designed for developer tools — matches professional aesthetic |
