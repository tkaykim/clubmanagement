# QA Report Fix Log
> 수정 완료: 2026-04-22
> npx tsc --noEmit: PASS
> npm run build: PASS (43 routes)

---

## [CRITICAL-1] ScheduleAggregationView 테이블 참조 오류

**수정 파일**: `components/project/ScheduleAggregationView.tsx`

**핵심 변경점**:
- `loadData` 함수 (line 87): `.from("project_schedule_dates")` → `.from("schedule_dates")`
- `addScheduleDate` 함수 (line 146): `.from("project_schedule_dates")` → `.from("schedule_dates")`
- `removeScheduleDate` 함수 (line 165): `.from("project_schedule_dates")` → `.from("schedule_dates")`

총 3곳의 `.from("project_schedule_dates")` 호출을 `.from("schedule_dates")`로 교체. 컬럼명(id, date, label, sort_order, project_id)은 실제 스키마와 일치하여 추가 변경 불필요.

**검증**: 빌드 통과, TypeScript 오류 없음.

---

## [CRITICAL-2] manage/members 클라이언트 Supabase 직접 호출 → API 라우트 경유

**수정 파일**:
- `app/(main)/manage/members/page.tsx`
- `app/api/members/[id]/route.ts`

**핵심 변경점 — page.tsx**:
- `handleApprove`: `supabase.from("crew_members").update({ is_active: true }).eq("id", id)` → `fetch("/api/members/${id}", { method: "PATCH", body: JSON.stringify({ action: "approve" }) })`
- `handleDeactivate`: `supabase.from("crew_members").update({ is_active: false }).eq("id", id)` → `fetch("/api/members/${id}", { method: "PATCH", body: JSON.stringify({ action: "deactivate" }) })`
- 각 fetch 응답에 `json.error` 체크 및 toast.error 처리 추가

**핵심 변경점 — route.ts**:
- `PATCH` 핸들러 확장: `{ action: 'approve' | 'deactivate' | 'activate' }` body를 먼저 파싱하여 처리, 기존 updateMemberSchema 필드 업데이트는 fallback으로 유지
- 두 경우 모두 `requireAdmin()` 선행 호출 (서버사이드 권한 검증)

**검증**: 빌드 통과, TypeScript 오류 없음.

---

## [HIGH-3] 멤버 삭제 API 라우트 추가

**수정 파일**: `app/api/members/[id]/route.ts`

**핵심 변경점**:
- `DELETE` 핸들러 신규 추가
- `requireOwner()` 호출 — owner 전용 영구 삭제 보호
- `supabase.from("crew_members").delete().eq("id", id)` 서버사이드 실행

**수정 파일**: `app/(main)/manage/members/page.tsx`

**핵심 변경점**:
- `handleDelete`: `supabase.from("crew_members").delete().eq("id", id)` → `fetch("/api/members/${id}", { method: "DELETE" })`
- fetch 응답에 `json.error` 체크 및 toast.error 처리 추가

**검증**: 빌드 통과, TypeScript 오류 없음.

---

## [CRITICAL-3] RLS — 비활성 멤버 데이터 접근 차단

**수정 파일**: `supabase/migrations/003_active_guard_rls.sql` (신규 생성)

**핵심 변경점**: 아래 테이블의 SELECT 정책에 `crew_members.is_active = true` 조건 추가

| 테이블 | 기존 정책 | 변경 내용 |
|--------|-----------|-----------|
| `crew_members` | `auth.role() = 'authenticated'` | 본인 레코드는 항상 허용, 타인 레코드는 is_active=true 멤버만 조회 |
| `projects` | `auth.role() = 'authenticated'` | is_active=true 멤버만 조회 |
| `schedule_dates` | `auth.role() = 'authenticated'` | is_active=true 멤버만 조회 |
| `schedule_votes` | admin SELECT만 존재 | admin 조건에 is_active=true 추가 |
| `project_applications` | self + admin SELECT 분리 | 두 정책 모두 is_active=true 추가 |
| `announcements` | `auth.role() = 'authenticated'` + scope 조건 | is_active=true 추가 |
| `payouts` | `user_id = auth.uid()` | is_active=true 추가 |
| `availability_presets` | `user_id = auth.uid()` | is_active=true 추가 |

마이그레이션은 Supabase 원격에 자동 적용되지 않으므로 수동 apply 필요.

---

## [HIGH-1] SQL Injection — /api/projects/[id]/payouts

**수정 파일**: `app/api/projects/[id]/payouts/route.ts`

**핵심 변경점**:
1. 함수 진입 직후 `z.string().uuid().safeParse(projectId)` 검증 추가 — 비UUID 값은 400 반환
2. raw SQL 서브쿼리 `.not("id", "in", \`(SELECT application_id FROM payouts WHERE project_id = '${projectId}')\`)` 제거
3. 두 단계 쿼리로 분리:
   - 1단계: `payouts` 테이블에서 `application_id` 목록 조회
   - 2단계: `project_applications`에서 조회된 ID를 `.not("id", "in", ...)` 으로 제외 (UUID 목록만 사용, 사용자 입력 없음)

**검증**: 빌드 통과, TypeScript 오류 없음.

---

## [HIGH-2] 미들웨어 getSession() → getUser()

**수정 파일**: `middleware.ts`

**핵심 변경점**:
- `supabase.auth.getSession()` → `supabase.auth.getUser()` 로 변경
- `session` 변수 → `authUser` 변수로 rename
- 이후 `session.user.id` 참조 → `authUser.id` 로 변경
- `getUser()`는 서버에서 JWT를 재검증하므로 조작된 쿠키로 인증 우회 불가

**검증**: 빌드 통과, TypeScript 오류 없음.
