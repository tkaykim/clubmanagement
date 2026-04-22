# Frontend Handoff

## Status
COMPLETE — `npx tsc --noEmit` passes, `npm run build` passes.

## What Was Built

### Foundation
- `app/layout.tsx` — IBM_Plex_Mono + Instrument_Serif via next/font/google as CSS vars; Pretendard via CDN; Toaster added
- `app/globals.css` — Full design token system (colors, typography, spacing, component classes)
- CSS-only responsive: `.pc-only` / `.mob-only` classes, no useMediaQuery (prevents hydration mismatch)

### Layout System
- `components/layout/AppShell.tsx` — Client component managing drawer state; renders Sidebar (PC), MobileHeader (mobile), MobileDrawer, BottomNav, Fab, PWABanner
- `components/layout/Sidebar.tsx` — Server component; brand + 3 nav groups (MAIN / PERSONAL / ADMIN); role-gated admin section
- `components/layout/NavItem.tsx` — Client component using usePathname() for active detection
- `components/layout/BottomNav.tsx` — 5-tab mobile bottom nav (홈/프로젝트/지원/캘린더/마이)
- `components/layout/MobileHeader.tsx` — Client; accepts `title` + `onMenuClick` (NOT backHref)
- `components/layout/MobileDrawer.tsx` — Client; closes on pathname change
- `components/layout/PWABanner.tsx` — Client; beforeinstallprompt with localStorage dismiss key `oc.pwa-dismissed`
- `app/(main)/layout.tsx` — Server; fetches user/member/counts, wraps ActiveGuard + AppShell

### Auth
- `app/(auth)/login/page.tsx` — Native CSS classes; POST to /api/auth/login
- `app/(auth)/signup/page.tsx` — With "pending approval" done state
- `components/auth/ActiveGuard.tsx` — Blocks inactive/anonymous users; shows pending banner

### UI Components
- `components/ui/StatusBadge.tsx` — Maps status strings to badge classes (ok/warn/danger/info/solid/outline)
- `components/ui/OsAvatar.tsx` — Initials-based avatar with color hash
- `components/common/Skeleton.tsx` — SkeletonCard, SkeletonStat, SkeletonRow
- `components/common/EmptyState.tsx` — Icon + message + optional CTA

### Pages
- `/` (dashboard) — 4 stat cards, pinned announcements, active projects grid, past projects
- `/projects` — Project grid with StatusBadge, type, fee, venue
- `/projects/[id]` — Detail with KV list, apply button, schedule dates
- `/projects/[id]/apply` — Member apply form with schedule voting + timeslots
- `/apply` — Redirect to first recruiting project or empty state
- `/apply/[id]` — Public guest apply form (no auth required)
- `/calendar` — Month calendar with schedule dots and availability voting
- `/announcements` — Pinned + regular announcements list
- `/announcements/[id]` — Detail page
- `/members` — Member cards grid
- `/mypage` — 4-tab: profile / applications / schedules / payouts
- `/manage` — Admin console overview with project list
- `/manage/members` — Member approval queue + role management
- `/manage/settlements` — Payout totals + table
- `/manage/projects/[id]` — 5-tab manage console: applications / availability / settlement / announcements / settings
- `/manage/projects/[id]/applicants` — Full applicant list with approve/reject actions
- `/manage/projects/new` — New project form
- `/manage/projects/[id]/schedule` — Schedule aggregation view

### Components
- `components/project/ApplyForm.tsx` — Member apply form (client)
- `components/project/PublicApplyForm.tsx` — Guest apply form (client)
- `components/project/NewProjectForm.tsx` — Project creation form (client)
- `components/project/ScheduleAggregationView.tsx` — Availability heatmap (client)
- `components/calendar/CalendarView.tsx` — Month grid calendar (client)
- `components/mypage/MyPageClient.tsx` — 4-tab mypage (client)
- `components/manage/ManageProjectClient.tsx` — 5-tab project console (client)
- `app/(main)/manage/projects/[id]/applicants/ApplicantList.tsx` — Applicant table with status actions (client)

## Technical Decisions

### CSS Strategy
- All components use native CSS classes from globals.css: `.card`, `.btn`, `.badge`, `.stat`, `.tbl`, `.field`, `.input`, etc.
- No shadcn/ui usage in new components (legacy files like ApplicantList still have some; cleaned up)
- CSS variables for all colors: `var(--bg)`, `var(--fg)`, `var(--accent)`, `var(--mf)`, etc.

### Supabase Join Type Casting
- Supabase returns foreign key joins as arrays, not single objects
- All join casts use `as unknown as TargetType` pattern to satisfy TypeScript strict mode

### Server vs Client Components
- Default: Server Components (data fetching, layout, static content)
- Client Components only where needed: forms, interactive state, usePathname/useRouter

## Known Issues / Limitations
- `ScheduleAggregationView` fetches directly via client supabase (not API route)
- PWABanner only shows on pages inside `(main)` layout (correct behavior)
- `manage/members` page is client-only (uses real-time updates); could be converted to server + client split
- The `applicants/ApplicantList.tsx` still uses direct supabase client for status updates (acceptable — admin-only page)

## Build Output Summary
- 42 routes total
- 4 static routes (login, signup, manage/members, manage/projects/new)
- 38 dynamic (server-rendered on demand)
- Build time: ~10s compile + page generation
