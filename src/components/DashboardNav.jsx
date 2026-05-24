# Visual Consistency Rollout Plan

**Goal:** Apply the **Deep Trust Blue + Warm Slate** palette and shared layout patterns across all routes in `src/app`, using existing shadcn/ui primitives and CSS variables—not a parallel design system.

**Reference:** [`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md), [`docs/COLOR_PALETTE.md`](./COLOR_PALETTE.md), [`docs/COMPONENT_LIBRARY.md`](./COMPONENT_LIBRARY.md).

**Already aligned:** CSS variables in `src/app/globals.css`, `prefers-color-scheme: dark` overrides, shadcn mapping in `tailwind.config.ts`, sidebar (nav-item / nav-section), dashboard chart utils (`src/lib/chart-colors.ts`), and partial dashboard styling.

---

## Phase 0: Inventory & Baseline (Do First)

**Objective:** Know every surface to touch and every drift pattern before bulk edits.

### 0.1 Route matrix

| Tier | Area | Routes (`src/app`) |
|------|------|---------------------|
| **Auth** | Login, register, onboarding | `(auth)/login`, `(auth)/register`, `(auth)/onboarding` |
| **App shell** | Shared chrome | `(dashboard)/layout.tsx`, `DashboardSidebar`, `DashboardNav`, `UserMenu` |
| **Dashboard** | Home | `(dashboard)/dashboard/page.tsx` |
| **Campaigns** | CRUD + detail | `(dashboard)/campaigns`, `[id]`, `new` |
| **Users** | Admin users | `(dashboard)/users`, `[id]` |
| **Tracking** | Sources | `(dashboard)/tracking/sources` |
| **Affiliate** | Program + settings | `(dashboard)/affiliate`, `(dashboard)/affiliate/settings` |
| **Public** | Marketing / legal | `(public)/page.tsx`, `(public)/layout.tsx`, `(public)/terms`, `(public)/privacy` |

**Parallel work:** One owner per tier; share a short **audit row** per route (see template below).

### 0.2 Drift patterns to hunt (grep-friendly)

| Pattern | Problem | Preferred fix |
|---------|---------|---------------|
| `bg-blue-500`, `text-green-600`, `border-gray-200` | Tailwind default hues | `bg-primary`, `text-success`, `border-border`, `bg-muted` |
| `#2563eb`, `#fff`, inline `style={{ color:` | Hard-coded hex | CSS vars / semantic Tailwind |
| `shadow-xl` everywhere | Inconsistent elevation | `.card-elevated` or `shadow-sm` + `border` |
| Custom `<button className="...">` | Misses focus/variants | `<Button variant="...">` |
| Chart `stroke="#888"` | Off-palette series | `CHART_COLORS`, `chartGridStroke`, `chartAxisStroke` from `@/lib/chart-colors` |
| Missing loading/empty | Broken trust on slow API | `LoadingSpinner`, `EmptyState`, skeleton grids |

### 0.3 Per-route audit template

Copy into issues or a spreadsheet:

```markdown
### Route: /path
- [ ] Page background: `bg-background`
- [ ] Typography: h1 `text-3xl font-bold tracking-tight`, body `text-muted-foreground` for secondary
- [ ] Cards: `card-elevated` or Card + border
- [ ] Primary actions: Button default / brand
- [ ] Status: badge-success | warning | destructive | primary
- [ ] Tables: `.table-header-cell`, row hover `hover:bg-muted/50`
- [ ] Mobile: filters stack, table scroll or card list
- [ ] No raw hex / default Tailwind color-* for UI chrome
- Notes:
```

### 0.4 Acceptance baseline

- **Light + dark:** Toggle or system theme; no unreadable contrast on `--primary` buttons.
- **Build:** `npm run build` clean after each tier merge.
- **Single source of truth:** Colors only in `globals.css` (+ `chart-colors.ts` for Recharts).

---

## Phase 1: Global Foundation (Single PR, Low Conflict)

**Objective:** Extend tokens and utilities so pages stop inventing one-offs.

### 1.1 CSS variables (`src/app/globals.css`)

**Keep existing** `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--success`, `--warning`, `--border`, `--ring`, `--radius`, dark block, `.dark`, `.nav-item`, `.nav-section`, `.badge-*`.

**Add (recommended):**

```css
/* Sidebar / app chrome — optional explicit tokens */
:root {
  --sidebar-background: 0 0% 100%;
  --sidebar-foreground: var(--foreground);
  --sidebar-border: var(--border);
  --sidebar-accent: var(--accent);
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --sidebar-background: var(--card);
    --sidebar-foreground: var(--foreground);
    --sidebar-border: var(--border);
  }
}

.dark {
  --sidebar-background: var(--card);
}

/* Focus visible — keyboard parity */
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Page rhythm utilities */
.page-container {
  @apply mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8;
}

.page-header {
  @apply mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between;
}

.page-title {
  @apply text-3xl font-bold tracking-tight text-foreground;
}

.page-description {
  @apply text-muted-foreground;
}

.section-title {
  @apply text-lg font-semibold text-foreground;
}
```

Wire sidebar tokens in `tailwind.config.ts` only if components reference `bg-sidebar` / `border-sidebar-border` (optional; else keep `--card` for sidebar background).

### 1.2 Tailwind (`tailwind.config.ts`)

- Confirm `primary`, `secondary`, `success`, `warning`, `destructive`, `muted`, `accent`, `border`, `input`, `ring`, `card`, `popover` map to `hsl(var(--*))`.
- Optional: `sidebar: { DEFAULT, foreground, border, accent }` if Phase 1.1 sidebar vars are added.

### 1.3 Shared utilities (use everywhere)

| Class / module | Use |
|----------------|-----|
| `.page-container`, `.page-header`, `.page-title`, `.page-description` | All dashboard routes |
| `.card-elevated` | Stat blocks, auth card, settings sections |
| `.table-header-cell` | `<TableHead>` |
| `.nav-item` / `.nav-item.active` | Sidebar links |
| `@/lib/chart-colors` | All Recharts in dashboard |

**Exit criteria:** New pages can be built without new color definitions; grep shows fewer `blue-500` / `#` in `src/app`.

---

## Phase 2: Page-by-Page Implementation Order

Implement in **dependency order**: shell → highest traffic → admin → public.

| Order | Tier | Routes | Focus |
|-------|------|--------|--------|
| 1 | Auth | login, register, onboarding | Centered card, brand header, OAuth outline buttons, full-width primary |
| 2 | Shell | `(dashboard)/layout`, sidebar, nav | `.nav-item.active`, `border-sidebar-border`, mobile Sheet |
| 3 | Dashboard | `/dashboard` | Stat grid, chart card, quick actions, `LoadingSpinner` / skeletons |
| 4 | Campaigns | list, `[id]`, `new` | Filter bar, table in card, status badges, detail header actions |
| 5 | Users | list, `[id]` | Same list patterns; role badges |
| 6 | Tracking | sources | Table + empty state |
| 7 | Affiliate | program, settings | Settings layout `max-w-2xl`, section cards |
| 8 | Public | home, terms, privacy | Public `layout`, hero + prose `text-muted-foreground`, footer links |

**Per-page checklist (minimum):**

1. Wrap main content in `page-container` (or existing `main` + equivalent padding).
2. Page header: `page)

fix typo nav-item again - maybe use cursor skill

StrReplace