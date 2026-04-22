# QA Report — OneShot Crew Management Platform
> Generated: 2026-04-22
> Build status: PASS (npm run build)
> TypeScript: PASS (npx tsc --noEmit)
> ESLint: FAIL — 159 problems (138 errors in _handoff/ reference files + 3 production errors)
> Total issues: 16 (CRITICAL: 3, HIGH: 4, MEDIUM: 5, LOW: 4)

---

## Build Results

- `npm run build`: **PASS** — 43 routes, no compilation errors
- `npx tsc --noEmit`: **PASS** — no type errors
- `npm run lint`: **FAIL** (see below)
  - 138 errors in `_handoff/**/*.jsx` — reference design files, not production code, but ESLint config includes them which is a configuration defect
  - 1 PRODUCTION error: `ScheduleAggregationView.tsx:121` — React Compiler lint error (setState in effect body)
  - 1 PRODUCTION error: `components/ui/sidebar.tsx:611` — `Math.random()` called during render (impure function)
  - 2 warnings: unused imports in `MyPageClient.tsx` (`useSearchParams`, `toast`)
  - 2 warnings: `<img>` instead of `<Image />` in Sidebar and OsAvatar

---

## Issues

### [CRITICAL-1] ScheduleAggregationView 가 존재하지 않는 테이블을 참조 [FIXED: see qa-report-fix.md]
- **파일**: `components/project/ScheduleAggregationView.tsx:87, 146, 165`
- **문제**: 코드 전체에서 `project_schedule_dates` 테이블을 참조하지만 마이그레이션에는 해당 테이블이 존재하지 않는다. 실제 테이블 이름은 `schedule_dates`다. 이 컴포넌트를 사용하는 모든 화면(관리자 스케줄 집계 뷰)이 런타임에 Supabase 쿼리 오류로 빈 화면을 반환한다.
- **재현**: `/manage/projects/[id]/schedule` 페이지 접속 시 일정 데이터가 전혀 로드되지 않음
- **영향**: 관리자 가용성 집계 기능 완전 미작동. 날짜 추가/삭제 API 호출도 모두 실패.
- **수정 제안**:
  ```diff
  - .from("project_schedule_dates")
  + .from("schedule_dates")
  ```
  (3곳: line 87, 146, 165)
- **담당**: frontend

### [CRITICAL-2] manage/members 페이지 — 승인/비활성화 작업이 API 라우트 없이 직접 Supabase 클라이언트 호출 [FIXED: see qa-report-fix.md]
- **파일**: `app/(main)/manage/members/page.tsx:83-91, 114`
- **문제**: `handleApprove`(is_active=true), `handleDeactivate`(is_active=false), `handleDelete` 함수가 클라이언트에서 `supabase.from("crew_members").update(...).eq("id", id)` 를 직접 호출한다. API 라우트를 거치지 않으므로 서버사이드 역할 검증(requireAdmin)이 없다. RLS 정책 `crew_members_admin_all`은 관리자 여부를 체크하지만, RLS가 비활성화되거나 우회되는 경우 일반 멤버도 이 작업을 수행할 수 있다.
- **재현**: 인증된 일반 멤버(role=member)가 직접 supabase 클라이언트로 `crew_members.update({is_active: true})`를 호출하면 RLS가 막지 않을 가능성.
- **영향**: 비활성 멤버가 스스로 자신을 활성화할 수 있는 잠재적 권한 우회.
- **수정 제안**: `/api/members/[id]/activate` 및 `/api/members/[id]/deactivate` API 라우트를 추가하고 `requireAdmin()` 체크 후 처리. 또는 기존 `/api/members/[id]` PATCH 라우트를 사용:
  ```typescript
  // handleApprove 수정 전
  await supabase.from("crew_members").update({ is_active: true }).eq("id", id);
  // 수정 후
  await fetch(`/api/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: true }),
  });
  ```
- **담당**: frontend + backend

### [CRITICAL-3] RLS — 비활성 멤버(is_active=false)가 인증 후 모든 데이터를 조회할 수 있음 [FIXED: see qa-report-fix.md]
- **파일**: `supabase/migrations/002_extend_schema.sql:161-162`
- **문제**: `crew_members_auth_select` 정책이 `USING (auth.role() = 'authenticated')` 만 체크한다. 비활성 멤버도 인증 상태이므로 `projects`, `schedule_dates`, `schedule_votes`, `announcements` 등 모든 테이블을 조회할 수 있다. ActiveGuard는 클라이언트사이드 UI 차단이므로 API 직접 호출이나 RLS 수준에서는 막히지 않는다.
- **재현**: 비활성 멤버가 `GET /api/members/me`나 Supabase 클라이언트로 `projects` 테이블 직접 조회 → 성공.
- **영향**: 승인 대기 중인 멤버가 팀 내 모든 프로젝트 정보, 공지, 가용성 데이터를 열람 가능.
- **수정 제안**: 핵심 테이블 정책에 `is_active` 필터 추가:
  ```sql
  -- crew_members_auth_select 수정
  DROP POLICY "crew_members_auth_select" ON crew_members;
  CREATE POLICY "crew_members_auth_select" ON crew_members
    FOR SELECT USING (
      auth.role() = 'authenticated' AND (
        -- 본인 레코드는 항상 조회 가능 (ActiveGuard 동작에 필요)
        user_id = auth.uid()
        OR
        -- 활성 멤버만 타인 레코드 조회 가능
        EXISTS (SELECT 1 FROM crew_members cm WHERE cm.user_id = auth.uid() AND cm.is_active = true)
      )
    );

  -- projects_auth_select 수정
  DROP POLICY "projects_auth_select" ON projects;
  CREATE POLICY "projects_auth_select" ON projects
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM crew_members cm WHERE cm.user_id = auth.uid() AND cm.is_active = true)
    );
  ```
- **담당**: backend (DBA)

---

### [HIGH-1] SQL Injection — projects/[id]/payouts 라우트에서 raw SQL string interpolation [FIXED: see qa-report-fix.md]
- **파일**: `app/api/projects/[id]/payouts/route.ts:39-43`
- **문제**: Supabase JS 클라이언트의 `.not()` 필터에 `projectId`를 문자열로 직접 삽입한다:
  ```typescript
  .not(
    "id",
    "in",
    `(SELECT application_id FROM payouts WHERE project_id = '${projectId}')`
  )
  ```
  `projectId`는 URL 파라미터에서 오며, Supabase `.not()` 의 값 파라미터가 raw SQL 서브쿼리 문자열로 사용되고 있다. `projectId`가 UUID 형식이 아닌 경우(예: `'; DROP TABLE payouts; --`) SQL injection이 가능할 수 있다.
- **재현**: UUID 검증 없이 `projectId`가 raw SQL에 삽입됨
- **영향**: DB 데이터 손상 가능성
- **수정 제안**: 서브쿼리 대신 두 번의 쿼리로 분리:
  ```typescript
  // 기존 payout의 application_id 목록 먼저 조회
  const { data: existingPayouts } = await supabase
    .from("payouts")
    .select("application_id")
    .eq("project_id", projectId);
  const existingAppIds = (existingPayouts ?? []).map(p => p.application_id);

  let query = supabase
    .from("project_applications")
    .select("id, user_id")
    .eq("project_id", projectId)
    .eq("status", "approved");

  if (existingAppIds.length > 0) {
    query = query.not("id", "in", `(${existingAppIds.map(id => `'${id}'`).join(",")})`);
    // 더 안전하게: .filter("id", "not.in", `(${existingAppIds.join(",")})`)
  }
  ```
  또는 UUID 파라미터 검증 추가:
  ```typescript
  import { z } from "zod";
  const uuidSchema = z.string().uuid();
  const projectIdParsed = uuidSchema.safeParse(projectId);
  if (!projectIdParsed.success) return NextResponse.json({ error: "잘못된 프로젝트 ID" }, { status: 400 });
  ```
- **담당**: backend

### [HIGH-2] 미들웨어 — `getSession()` 사용 (보안 취약) [FIXED: see qa-report-fix.md]
- **파일**: `middleware.ts:36`
- **문제**: 미들웨어에서 `supabase.auth.getSession()`을 사용한다. Supabase 공식 문서에 따르면 서버사이드 보안 검증에는 `getSession()` 대신 `getUser()`를 사용해야 한다. `getSession()`은 쿠키에서 세션 데이터를 그대로 반환하며 서버사이드 토큰 검증을 수행하지 않아, 조작된 쿠키로 인증을 우회할 수 있다.
- **영향**: 토큰 위조로 인증된 척 관리자 페이지 접근 가능성
- **수정 제안**:
  ```typescript
  // 변경 전
  const { data: { session } } = await supabase.auth.getSession();
  // 변경 후
  const { data: { user } } = await supabase.auth.getUser();
  // 이후 session 참조를 user 참조로 변경
  if (!user) { /* redirect to login */ }
  ```
- **담당**: backend

### [HIGH-3] manage/members — 멤버 삭제가 API 라우트 없이 직접 Supabase 호출 (권한 우회) [FIXED: see qa-report-fix.md]
- **파일**: `app/(main)/manage/members/page.tsx:114`
- **문제**: `handleDelete`가 `supabase.from("crew_members").delete().eq("id", id)`를 직접 클라이언트에서 호출한다. `crew_members_admin_all` RLS 정책이 보호하지만, 이 정책은 `FOR ALL`로 선언되어 있어 DELETE에도 적용되는지 PostgreSQL 정책 적용 순서에 따라 예상과 다를 수 있다.
- **수정 제안**: API 라우트 `/api/members/[id]`에 DELETE 핸들러 추가:
  ```typescript
  export async function DELETE(_req: Request, { params }: Params) {
    const ownerOrResponse = await requireOwner(); // owner만 영구 삭제
    if (isNextResponse(ownerOrResponse)) return ownerOrResponse;
    const supabase = createRouteSupabaseClient();
    await supabase.from("crew_members").delete().eq("id", id);
    return NextResponse.json({ data: { ok: true } });
  }
  ```
- **담당**: backend

### [HIGH-4] MyPageClient — `useSearchParams` import 되었지만 사용 안 됨 + Suspense 누락
- **파일**: `components/mypage/MyPageClient.tsx:4`
- **문제**: `useSearchParams`가 import됐지만 실제로 사용되지 않는다 (lint 경고). 만약 향후 사용 시 Next.js App Router 규칙에 따라 `useSearchParams()`를 사용하는 클라이언트 컴포넌트는 `<Suspense>`로 감싸야 한다. 현재는 미사용이므로 제거가 맞다.
- **수정 제안**:
  ```typescript
  // 변경 전
  import { useRouter, useSearchParams } from "next/navigation";
  // 변경 후
  import { useRouter } from "next/navigation";
  ```
  마찬가지로 미사용 `toast` import 제거:
  ```typescript
  // 변경 전
  import { toast } from "sonner";
  // 제거
  ```
- **담당**: frontend

---

### [MEDIUM-1] manage/settlements 페이지 — month 파라미터 필터링 미적용
- **파일**: `app/(main)/manage/settlements/page.tsx:23-31`
- **문제**: 페이지에서 `currentMonth` 변수를 사용하지만 Supabase 쿼리에 month 필터가 없다. 모든 payout 데이터를 불러온 후 클라이언트에서 필터링하지 않고 전체를 표시한다. 통계 합계도 month 필터 없이 전체 합계를 표시한다.
- **영향**: 잘못된 월별 통계 표시. 데이터가 많아지면 성능 저하.
- **수정 제안**:
  ```typescript
  const { data } = await supabase
    .from("payouts")
    .select("...")
    .or(`scheduled_at.gte.${currentMonth}-01,scheduled_at.is.null`)
    // 또는 getSettlementsMonthly(currentMonth) API 함수 활용
  ```
- **담당**: frontend

### [MEDIUM-2] ApplyForm — 동일 프로젝트 중복 지원 시 409 처리 UI 없음
- **파일**: `components/project/ApplyForm.tsx:91-93`
- **문제**: 이미 지원한 프로젝트에 재제출하면 서버에서 409 응답이 오지만, 클라이언트 코드는 `json.error ?? "지원에 실패했습니다"`를 toast로 표시한다. 사실 API는 `{ error: "이미 이 프로젝트에 지원했습니다" }`를 반환하므로 메시지는 표시되지만, 페이지 상단의 "지원하기" 버튼이 서버사이드에서 `canApply` 체크로 숨겨져야 하는데 이미 인증된 사용자에게도 URL 직접 접근(/projects/[id]/apply)으로 폼에 도달할 수 있다.
- **영향**: UX 혼란 (폼을 다 채우고 제출해야 이미 지원했다는 사실을 알 수 있음)
- **수정 제안**: `/projects/[id]/apply` 서버 컴포넌트에서 기존 지원 여부 확인 후 이미 지원한 경우 지원 완료 메시지 표시 또는 리디렉션.

### [MEDIUM-3] ScheduleAggregationView — 가용성 탭 실제 vote 데이터 표시 안 됨
- **파일**: `components/manage/ManageProjectClient.tsx:348-363`
- **문제**: ManageProjectClient의 가용성 탭은 `approvedApps`를 행으로 나열하지만 실제 `schedule_votes` 데이터를 로드하지 않는다. 각 셀이 `data-lvl="0"`으로 하드코딩된 빈 점(`·`)만 표시한다. 실제 가용성 히트맵은 동작하지 않는다.
- **영향**: 관리자가 멤버 가용성을 확인할 수 없음 — 핵심 기능 미구현.
- **수정 제안**: 서버 컴포넌트(`manage/projects/[id]/page.tsx`)에서 `schedule_votes`를 쿼리하여 `ManageProjectClient`에 전달하거나, `ScheduleAggregationView` 컴포넌트를 사용하되 테이블명 오류(CRITICAL-1) 수정 후 통합.

### [MEDIUM-4] announcements 공지 탭 — "공지 작성" 버튼이 동작 없음
- **파일**: `components/manage/ManageProjectClient.tsx:468`
- **문제**: `<button className="btn primary sm">공지 작성</button>`에 onClick 핸들러가 없다. 클릭해도 아무 일도 일어나지 않는다.
- **영향**: 관리자가 프로젝트 공지를 작성할 수 없음.
- **수정 제안**: 공지 작성 모달/폼 구현 또는 `/api/announcements` POST를 호출하는 핸들러 추가.

### [MEDIUM-5] settings 탭 — 프로젝트 설정 편집 폼 없음
- **파일**: `components/manage/ManageProjectClient.tsx:496-521`
- **문제**: settings 탭에 "위험 구역 — 프로젝트 삭제" 버튼만 있고 프로젝트 제목/설명/날짜/상태 변경 폼이 없다. `PATCH /api/projects/[id]` API가 구현되어 있지만 UI에서 호출하지 않는다.
- **영향**: 관리자가 UI에서 프로젝트 정보를 수정할 수 없음.

---

### [LOW-1] ESLint 설정 — _handoff/ 디렉토리가 lint 대상에 포함
- **파일**: `eslint.config.mjs`
- **문제**: `_handoff/` 아래 디자인 참고용 `.jsx` 파일들이 ESLint 적용 대상이 되어 138개의 에러가 발생한다. 이 파일들은 production 코드가 아니다.
- **수정 제안**: eslint.config.mjs에 ignore 추가:
  ```js
  { ignores: ["_handoff/**", "scripts/**"] }
  ```

### [LOW-2] sidebar.tsx — Math.random() 렌더 중 호출 (React Compiler 경고)
- **파일**: `components/ui/sidebar.tsx:611`
- **문제**: `SidebarMenuSkeleton` 컴포넌트가 `useMemo` 안에서 `Math.random()`을 사용한다. React Compiler가 이를 불순 함수 호출로 감지하여 에러로 보고한다. 실제 런타임 동작에는 문제없으나 React strict mode에서 예상치 못한 width 불일치가 발생할 수 있다.
- **수정 제안**: `useRef`로 초기값을 고정하거나, seed 기반 의사난수 사용.

### [LOW-3] Sidebar — `<img>` 대신 `<Image />` 사용 권장
- **파일**: `components/layout/Sidebar.tsx:33`, `components/ui/OsAvatar.tsx:14`
- **문제**: Next.js `<Image />` 대신 일반 `<img>` 태그를 사용하여 LCP 최적화를 놓치고 있다.

### [LOW-4] ManageProjectClient — 정산 탭 CSV 내보내기 버튼이 동작 없음
- **파일**: `components/manage/ManageProjectClient.tsx:396-399`
- **문제**: "CSV 내보내기" 버튼에 onClick 핸들러가 없다. 프로젝트별 정산 CSV 다운로드 기능이 동작하지 않는다.
- **수정 제안**:
  ```tsx
  <button
    className="btn sm"
    onClick={() => window.open(`/api/settlements/csv?month=${currentMonth}`, "_blank")}
  >
  ```

---

## Security Checklist

| 항목 | 상태 | 비고 |
|------|------|------|
| API 인증 체크 (requireAuth/requireAdmin) | PASS | 모든 mutation 라우트에 적용됨 |
| 미들웨어 세션 검증 | WARN | getSession() 사용 — getUser()로 변경 필요 (HIGH-2) |
| RLS 정책 존재 | PASS | 002_extend_schema.sql에 전체 테이블 RLS 정책 정의됨 |
| 비활성 멤버 RLS 차단 | FAIL | is_active 체크가 RLS에 없음 (CRITICAL-3) |
| Zod 입력 검증 | PASS | 모든 mutation 라우트에서 Zod safeParse 사용 |
| XSS — dangerouslySetInnerHTML | PASS | app/layout.tsx의 SW 등록 스크립트만 사용 (정적 문자열, 사용자 입력 없음) |
| SQL Injection | WARN | /api/projects/[id]/payouts에서 raw string interpolation (HIGH-1) |
| SUPABASE_SERVICE_ROLE_KEY 클라이언트 노출 | PASS | 클라이언트 코드에서 미사용 |
| 공개 지원 링크 게스트 INSERT | PASS | applications_anyone_insert 정책으로 허용됨 |
| 중복 지원 방지 | PASS | POST /api/projects/[id]/apply에서 인증된 사용자 중복 체크 |
| Payout 상태 역전 방지 | PASS | pending→scheduled→paid 단방향 전이 강제됨 |
| 직접 Supabase 클라이언트 호출 (관리 작업) | FAIL | manage/members 승인/삭제가 API 우회 (CRITICAL-2, HIGH-3) |
| 투표 date_id ownership 검증 | PASS | votes API에서 해당 프로젝트의 유효한 date_id만 허용 |
| env 변수 노출 | PASS | NEXT_PUBLIC_ 변수만 클라이언트에 노출, SERVICE_ROLE_KEY 서버 전용 |

---

## E2E Test Coverage

| 테스트 파일 | 커버리지 | 실행 환경 |
|-------------|----------|-----------|
| `tests/e2e/auth.spec.ts` | 로그인 페이지 구조, 미인증 리디렉션, API 인증 체크 | 로컬 dev 서버 |
| `tests/e2e/project-apply.spec.ts` | 공개 지원 폼, API 입력 검증, 비인증 401 | 로컬 dev 서버 |
| `tests/e2e/manage-tabs.spec.ts` | 관리자 라우트 보호, API 권한 체크, Payout 상태 전이 | 로컬 dev 서버 |

Playwright 설정: `playwright.config.ts` (새로 생성)
Supabase 연결이 필요한 실제 플로우 테스트는 `SUPABASE_E2E=true` 환경변수 시에만 실행.

---

## 수정한 파일 목록

| 파일 | 액션 | 설명 |
|------|------|------|
| `playwright.config.ts` | 신규 생성 | Playwright E2E 설정 |
| `tests/e2e/auth.spec.ts` | 신규 생성 | 인증 E2E 테스트 |
| `tests/e2e/project-apply.spec.ts` | 신규 생성 | 지원 플로우 E2E 테스트 |
| `tests/e2e/manage-tabs.spec.ts` | 신규 생성 | 관리자 탭 E2E 테스트 |
| `.claude/handoffs/qa-report.md` | 신규 생성 | 본 보고서 |

프로덕션 코드는 직접 수정하지 않음. 모든 결함은 이 보고서에 수정안으로 제시.

---

## 남은 TODO (다음 이터레이션)

1. **[CRITICAL-1]** `ScheduleAggregationView.tsx`의 `project_schedule_dates` → `schedule_dates` 테이블명 수정
2. **[CRITICAL-2]** `manage/members` 승인/비활성화 작업을 API 라우트로 이전 (`requireAdmin` 체크)
3. **[CRITICAL-3]** RLS 정책에 `is_active` 필터 추가 (비활성 멤버 데이터 접근 차단)
4. **[HIGH-1]** `/api/projects/[id]/payouts` raw SQL 문자열 interpolation → 파라미터화 쿼리로 변경
5. **[HIGH-2]** `middleware.ts` `getSession()` → `getUser()` 교체
6. **[HIGH-3]** 멤버 삭제 API 라우트 구현 및 클라이언트 직접 호출 제거
7. **[MEDIUM-3]** ManageProjectClient 가용성 탭에 실제 vote 데이터 연결
8. **[MEDIUM-4]** 공지 작성 버튼 핸들러 구현
9. **[LOW-1]** eslint.config.mjs에 `_handoff/**` ignore 추가
10. Playwright 테스트를 실제 Supabase 로컬 CLI와 연동하여 full flow 검증
