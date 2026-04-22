# Routes & Layout — OneShot Crew

## 1. Next.js App Router 트리

```
app/
├── layout.tsx                       # Root layout: HTML, CSS 변수, font 로드
├── globals.css                      # 디자인 토큰 CSS 변수 (styles.css → 이식)
│
├── (auth)/                          # 인증 불필요 그룹
│   ├── layout.tsx                   # 최소 레이아웃 (브랜드 로고만)
│   ├── login/page.tsx
│   └── signup/page.tsx
│
├── (main)/                          # 인증 필요 그룹 — PC 사이드바 + 모바일 헤더/바텀탭
│   ├── layout.tsx                   # ★ 핵심: AppShell 렌더링
│   ├── page.tsx                     # Dashboard (홈)
│   ├── projects/
│   │   ├── page.tsx                 # ProjectList
│   │   └── [id]/
│   │       └── page.tsx             # ProjectDetail
│   ├── apply/
│   │   └── [id]/
│   │       └── page.tsx             # ApplyPage (지원 + 가용성)
│   ├── calendar/
│   │   └── page.tsx                 # CalendarPage
│   ├── members/
│   │   └── page.tsx                 # MembersPage (전체 멤버)
│   ├── announcements/
│   │   ├── page.tsx                 # AnnouncementsPage
│   │   └── [id]/page.tsx            # AnnouncementDetail
│   ├── mypage/
│   │   └── page.tsx                 # MyPage (탭: apps/payouts/presets/profile)
│   ├── manage/                      # admin/owner 전용
│   │   ├── layout.tsx               # role guard (member → redirect)
│   │   ├── page.tsx                 # 관리 대시보드 (프로젝트 선택)
│   │   ├── projects/
│   │   │   ├── new/page.tsx         # ProjectNew
│   │   │   └── [id]/
│   │   │       └── page.tsx         # ManagePage (6탭 — searchParams?tab=)
│   │   ├── members/page.tsx         # 멤버 관리 (어드민용)
│   │   └── settlements/page.tsx     # 팀 정산 리포트
│   └── projects/new/page.tsx        # ★ 주의: 관리자가 topbar에서 새 프로젝트 클릭 시
│                                    #   → /manage/projects/new 로 리디렉트
│
├── apply/                           # 공개 지원 링크 (비인증 허용)
│   └── [id]/
│       └── page.tsx                 # PublicApplyPage (게스트 지원 폼)
│
└── api/
    ├── auth/
    │   ├── login/route.ts
    │   ├── signup/route.ts
    │   └── logout/route.ts
    ├── projects/
    │   ├── route.ts                 # POST (생성)
    │   └── [id]/
    │       ├── route.ts             # PATCH, DELETE
    │       ├── status/route.ts      # PATCH
    │       ├── apply/route.ts       # POST (지원), PATCH (수정)
    │       ├── votes/route.ts       # POST (가용성 일괄 UPSERT)
    │       └── payouts/
    │           └── generate/route.ts # POST (approved → payouts 생성)
    ├── applications/
    │   ├── [id]/
    │   │   └── status/route.ts      # PATCH
    │   └── bulk-status/route.ts     # POST
    ├── announcements/
    │   ├── route.ts                 # POST
    │   └── [id]/route.ts            # PATCH, DELETE
    ├── payouts/
    │   └── [id]/route.ts            # PATCH
    ├── members/
    │   ├── route.ts                 # POST
    │   └── [id]/
    │       ├── route.ts             # PATCH
    │       └── role/route.ts        # PATCH (owner only)
    ├── presets/
    │   ├── route.ts                 # POST
    │   └── [id]/route.ts            # PATCH, DELETE
    └── settlements/
        ├── route.ts                 # GET (JSON 리포트)
        └── csv/route.ts             # GET (CSV 다운로드)
```

---

## 2. ManagePage 탭 구조 (searchParams 방식)

`/manage/projects/[id]?tab=applicants` (기본값: applicants)

| tab 값 | 내용 |
|--------|------|
| `applicants` | 지원자 테이블 (필터/정렬/일괄처리) |
| `roster` | 확정 로스터 카드 + 충돌 표시 |
| `availability` | 날짜별 바차트 + 멤버×날짜 히트맵 |
| `settlement` | 정산 요약 + 멤버별 payout 테이블 |
| `announce` | 프로젝트 공지 작성 + 목록 |
| `settings` | 프로젝트 편집 + 공개링크/QR |

탭은 URL searchParam으로 관리 → 새로고침 시 상태 유지, 공유 가능.

---

## 3. AppShell — PC/모바일 레이아웃 처리

`app/(main)/layout.tsx`에서 단일 레이아웃으로 처리. CSS + Tailwind로 반응형 분기.

```
PC (≥900px):
  ┌──────────────┬────────────────────────────┐
  │  Sidebar     │  Topbar                    │
  │  248px fixed │  (breadcrumb + search +    │
  │              │   notifications + CTA)     │
  │  - 브랜드    ├────────────────────────────┤
  │  - NavList   │  <page content>            │
  │  - 사용자    │                            │
  │    카드      │                            │
  └──────────────┴────────────────────────────┘

Mobile (<900px):
  ┌────────────────────────────┐
  │  MobileHeader (sticky)     │  ← 메뉴 + 로고 + 제목 + 알림
  ├────────────────────────────┤
  │  <page content>            │
  │  (padding-bottom: 84px)    │
  ├────────────────────────────┤
  │  BottomNav (fixed)         │  ← 5탭
  └────────────────────────────┘
  + MobileDrawer (overlay, 슬라이드)
  + FAB (admin/owner only)
```

### 구현 방식

- `Sidebar`: `hidden lg:flex` (Tailwind, breakpoint = 900px 대신 `lg` 재정의)
- `MobileHeader`: `flex lg:hidden`
- `MobileBottomNav`: `flex lg:hidden fixed bottom-0`
- `MobileDrawer`: Client Component (`'use client'`), framer-motion slideLeft
- `FAB`: Client Component, role 체크 후 조건부 렌더

CSS 변수 breakpoint 선택: Tailwind 기본 `lg` = 1024px 이지만 디자인은 900px.
`tailwind.config` 또는 globals.css에 `@media (min-width: 900px)` 클래스 직접 정의.

❓ OPEN QUESTION: Tailwind v4에서 커스텀 breakpoint `screen-md2` 추가할지, CSS media query 직접 사용할지. 기본값: globals.css에 `.pc-only { display: none; } @media (min-width: 900px) { .pc-only { display: flex; } }` 패턴.

---

## 4. 서버/클라이언트 컴포넌트 경계

### Server Components (기본)
- 모든 `page.tsx` — 초기 데이터 SSR
- `layout.tsx` (서버에서 auth 체크 + role 확인)
- 목록/상세 컴포넌트 (데이터 props 받아 렌더링)

### Client Components (`'use client'`)
- `AppShell` (drawer 상태, mobile 메뉴 상태)
- `MobileDrawer` (framer-motion 애니메이션)
- `BottomNav` (현재 경로 highlight)
- `ProjectTabNav` (ManagePage 탭 — URL 조작)
- `ApplyForm` (STEP 01/02 인터랙션, 복사 모달)
- `AvailabilityEditor` (날짜별 가용성 토글 + 타임슬롯)
- `CalendarGrid` (날짜 선택 상태)
- `ApplicantsTable` (체크박스, 일괄처리)
- `HeatmapGrid` (hover 툴팁)
- `SettlementTable` (상태 전환 버튼)
- `PWABanner` (localStorage 기반)
- `SearchBar` (topbar 검색 — 추후 구현)
- `Toast` — sonner 사용

### 경계 원칙
- 인터랙티브 UI 단위로만 `'use client'` 지정.
- 데이터 패칭은 Server Component에서, Client는 props 수신 후 UI만 관리.
- 폼 제출: Client Component에서 `fetch('/api/...')` → router.refresh().

---

## 5. 인증 미들웨어

`middleware.ts` (Next.js):
- `(main)` 그룹 전체: 미인증 → `/login` 리디렉트
- `apply/[id]` (공개 경로): 통과
- `manage/` 하위: admin/owner 아닌 경우 → `/` 리디렉트
- Supabase Auth session 체크: `@supabase/auth-helpers-nextjs`의 `createMiddlewareClient` 사용

---

## 6. 페이지별 데이터 의존성 요약

| 페이지 | 주요 테이블 | SSR 여부 | Client fetch |
|--------|------------|----------|-------------|
| Dashboard | projects, announcements, applications | O | X |
| ProjectList | projects | O | X |
| ProjectDetail | projects, schedule_dates, applications, announcements | O | X |
| ApplyPage | projects, schedule_dates, votes (본인) | O | 제출 시 POST |
| CalendarPage | schedule_dates (approved), votes | O | X |
| Members | crew_members | O | X |
| Announcements | announcements | O | X |
| ManagePage | projects, applications, schedule_votes, payouts, announcements | O | 탭 전환 시 일부 |
| MyPage | applications, payouts, presets | O | X |
| Settlements | payouts (GROUP BY month) | O | CSV download |
