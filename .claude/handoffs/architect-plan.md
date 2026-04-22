# Implementation Plan — OneShot Crew

## 1. Designer에게 전달할 범위

### CSS → Tailwind/CSS 변수 매핑 방식

디자인의 `styles.css`는 CSS 변수 + 커스텀 클래스 기반. Next.js 앱에서 두 가지 병행:

**A) CSS 변수 (globals.css에 `:root` 이식)**
```css
/* 그대로 이식 — 토큰 전체 */
--bg: #FAFAFA
--bg-elev: #FFFFFF
--fg: #0A0A0B
--fg-soft: #1F1F24
--muted: #F4F4F5
--muted-2: #EEEEF0
--border: #E4E4E7
--border-2: #D4D4D8
--mf: #71717A
--mf-2: #A1A1AA
--ok: #059669
--warn: #D97706
--danger: #DC2626
--info: #2563EB
--radius: 12px / --radius-sm: 8px / --radius-lg: 16px
--shadow-sm / --shadow-md
--sans: Pretendard Variable
--mono: IBM Plex Mono
--serif: Instrument Serif
```

**B) Tailwind 유틸리티로 컴포넌트 작성**
- Tailwind의 `bg-*`, `text-*`, `border-*` 클래스 대신 `bg-[var(--bg)]` 형태 사용.
- shadcn/ui 컴포넌트는 CSS 변수 테마 그대로 활용 (`--background`, `--foreground` 등 shadcn 변수 추가).
- `cn()` 유틸리티 (tailwind-merge + clsx) 이미 존재.

### 구현할 컴포넌트 목록 (Designer 담당)

#### 기초 (shadcn 기반 래퍼 또는 신규)
- `Badge` — kind: solid|outline|ok|warn|danger|info
- `StatusBadge` — status 자동 매핑
- `Avatar` — initials, size: sm|md|lg
- `AvatarStack` — 최대 5개 + 오버플로우 표시
- `Seg` (SegmentedControl) — full/inline 모드
- `KVList` — `<dl>` 기반 key-value
- `Switch` — toggle
- `Checkbox` — 커스텀 스타일

#### 레이아웃
- `Sidebar` — PC 고정 248px (brand + NavList + UserCard)
- `MobileHeader` — sticky, 메뉴/로고/제목/알림
- `MobileBottomNav` — 5탭, active indicator
- `MobileDrawer` — framer-motion slideLeft overlay
- `Topbar` — breadcrumb + search + CTA
- `FAB` — 원형 플로팅 버튼 (admin only)
- `PWABanner` — 홈 화면 추가 배너

#### 카드/블록
- `ProjectCard` — 포스터 + 메타 + 멤버 스택 + CTA
- `ProjectPosterHero` — 상세 페이지 히어로 (21:8 비율)
- `StatCard` — 통계 숫자 카드 (lab/num/delta)
- `AnnouncementCard` — 고정/일반 배너
- `Banner` — 상태 배너 (approved/pending/rejected)
- `TimelineDot` — 일정 타임라인

#### 관리 전용
- `ApplicantsTable` — 체크박스 + 정렬 + 일괄처리
- `HeatmapGrid` — 멤버 × 날짜 격자
- `AvailabilityBar` — 날짜별 누적 바차트
- `SettlementTable` — 정산 상태 테이블

#### 폼
- `ScheduleEditor` — 날짜별 가용성 (Seg + 타임슬롯 추가/삭제)
- `DateListEditor` — 이벤트 날짜 추가/삭제
- `PracticeDateGrid` — 연습일 3열 그리드

#### 기타
- `CalendarGrid` — 월간 달력 (42셀 + 이벤트 점)
- `CalendarDayPanel` — 선택일 이벤트 사이드패널
- `Toast` — sonner 래퍼 (check 아이콘)
- `Modal` — 복사 모달 등

---

## 2. Backend에게 전달할 구현 범위

### 우선순위 1 (핵심 기능)
1. `supabase/migrations/002_extend_schema.sql` 실행
2. RLS 정책 적용 (`supabase/migrations/003_rls.sql` 신규)
3. 시드 스크립트 (`scripts/seed.ts`) — MEMBERS/PROJECTS/VOTES_SEED → DB
4. `lib/supabase-server.ts` 패턴 확인 및 유지
5. Route Handlers 구현:
   - POST `/api/projects` — 프로젝트 생성
   - POST `/api/projects/[id]/apply` — 지원 + votes UPSERT
   - PATCH `/api/applications/[id]/status` — 개별 확정/탈락
   - POST `/api/applications/bulk-status` — 일괄
   - PATCH `/api/projects/[id]/status` — 프로젝트 상태 변경

### 우선순위 2
6. POST `/api/projects/[id]/votes` — 가용성 일괄 UPSERT
7. POST `/api/projects/[id]/payouts/generate` — approved → payouts 생성
8. PATCH `/api/payouts/[id]` — 정산 상태 전환
9. POST `/api/announcements`, PATCH/DELETE

### 우선순위 3
10. GET `/api/settlements?month=` — RPC 또는 SQL 쿼리
11. GET `/api/settlements/csv` — 클라이언트 blob 또는 서버 스트리밍
12. `/api/members` CRUD
13. `/api/presets` CRUD

### 시드 데이터 매핑
```
MEMBERS 배열 (shared.jsx) → users + crew_members 9행
PROJECTS 배열 → projects 4행 + schedule_dates (event/practice 분리)
VOTES_SEED → schedule_votes (schedule_date_id 조인 필요)
ANNOUNCEMENTS → announcements 4행
approved applicants → payouts (amount = project.fee)
```

---

## 3. Frontend에게 전달할 페이지 구현 순서

### Phase A — 셸 + 공통 컴포넌트 (최우선)
1. `app/globals.css` — 디자인 토큰 CSS 변수 이식
2. `app/(main)/layout.tsx` — AppShell (Sidebar + Topbar + MobileHeader + BottomNav + Drawer + FAB)
3. `components/layout/` — Sidebar, MobileHeader, MobileBottomNav, MobileDrawer, Topbar, FAB, PWABanner
4. `components/ui/` — Badge, StatusBadge, Avatar, AvatarStack, Seg, KVList, StatCard

### Phase B — 핵심 멤버 플로우
5. `app/(main)/page.tsx` — Dashboard
6. `app/(main)/projects/page.tsx` — ProjectList + ProjectCard
7. `app/(main)/projects/[id]/page.tsx` — ProjectDetail
8. `app/(main)/apply/[id]/page.tsx` — ApplyPage (Step 1 + Step 2)
9. `app/apply/[id]/page.tsx` — 공개 게스트 지원 폼

### Phase C — 개인 페이지 + 캘린더
10. `app/(main)/mypage/page.tsx` — MyPage 4탭
11. `app/(main)/calendar/page.tsx` — CalendarPage
12. `app/(main)/announcements/page.tsx` + `[id]/page.tsx`
13. `app/(main)/members/page.tsx`

### Phase D — 관리자 워크벤치
14. `app/(main)/manage/projects/[id]/page.tsx` — ManagePage 6탭
    - applicants 탭 (ApplicantsTable + 일괄처리)
    - roster 탭 (RosterCard + 충돌 표시)
    - availability 탭 (AvailabilityBar + HeatmapGrid)
    - settlement 탭 (SettlementTable)
    - announce 탭 (공지 작성 + 목록)
    - settings 탭 (편집 + 공개링크)
15. `app/(main)/manage/projects/new/page.tsx` — ProjectNew
16. `app/(main)/manage/members/page.tsx` — 멤버 관리 (어드민용)
17. `app/(main)/manage/settlements/page.tsx` — 팀 정산 리포트

### Phase E — 마무리
18. middleware.ts — 인증/권한 가드
19. 검색 (Topbar SearchBar — 프로젝트/멤버)
20. PWA manifest + 서비스워커 (기존 있으면 재활용)
21. E2E 테스트 (QA 에이전트에 전달)

---

## 4. 디자인 정합성 체크리스트 (Frontend 필독)

- [ ] CSS 변수 `--fg`, `--bg`, `--muted` 등 직접 사용. Tailwind 기본 색상 혼용 금지.
- [ ] 폰트: Pretendard (sans), IBM Plex Mono (mono), Instrument Serif italic (serif-tag).
- [ ] `.tabnum` = `font-variant-numeric: tabular-nums` — 금액/숫자에 항상 적용.
- [ ] `.mono` 클래스 또는 `font-mono` Tailwind — 날짜, 코드, 배지에 사용.
- [ ] Badge는 항상 uppercase, letter-spacing 0.06em.
- [ ] 버튼 높이: sm=28px, default=34px, lg=42px.
- [ ] 카드 border-radius = var(--radius) = 12px.
- [ ] 테이블 헤더: 10.5px mono uppercase muted.
- [ ] 모바일 bottom safe-area: `padding-bottom: env(safe-area-inset-bottom)`.
- [ ] 히트맵 셀: `data-lvl` 속성 0~4 → CSS로 색상 표현 (background opacity).
- [ ] PC 사이드바 너비: 248px 고정 (`grid-template-columns: 248px 1fr`).
- [ ] 공지 배너: `.banner` 클래스 = `display:flex, align-items:center, gap:12px, padding:14px, background:var(--muted), border:1px solid var(--border), border-radius:var(--radius-sm)`.
