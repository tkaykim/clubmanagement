# Architect Overview — OneShot Crew

## 1. Domain Model (ER 다이어그램 — 텍스트)

```
users (Supabase Auth)
  |
  |-- crew_members (1:1 user_id nullable — 비가입 게스트 지원 가능)
        |
        |--< project_applications (N:M projects via application)
        |       |-- schedule_votes (per schedule_date)
        |       |-- payouts (per application, one per approved member)
        |
        |--< announcements (author_id)

projects
  |--< schedule_dates (event | practice kind)
  |       |--< schedule_votes
  |--< project_applications
  |--< payouts
  |--< announcements (scope=project)
  |-- announcements (scope=team, project_id nullable)

crew_members
  |--< availability_presets (user preset library)
```

**핵심 관계:**
- `project_applications` = 지원 레코드. user_id OR (guest_name + guest_email) 중 하나 필수.
- `schedule_votes` = `schedule_dates` + `user_id` UNIQUE → 날짜별 1인 1투표.
- `payouts` = `project_applications.id` 기반. 확정(approved) 이후 생성.
- `announcements` = scope(team|project) + optional project_id.

---

## 2. 역할 × 리소스 권한 매트릭스

| 리소스 | guest (비인증) | member | admin | owner |
|--------|---------------|--------|-------|-------|
| 프로젝트 목록 조회 | O (공개링크) | O | O | O |
| 프로젝트 상세 조회 | X | O | O | O |
| 지원 제출 (공개링크) | O | O | O | O |
| 지원 수정 (본인) | X | O | O | O |
| 가용성 제출 (본인) | X | O | O | O |
| 지원자 목록 조회 | X | X | O | O |
| 지원 상태 변경 (확정/탈락) | X | X | O | O |
| 프로젝트 생성 | X | X | O | O |
| 프로젝트 설정 편집 | X | X | O | O |
| 로스터 조회 | X | O | O | O |
| 정산 생성/수정 | X | X | O | O |
| 정산 조회 (본인 분) | X | O | O | O |
| 멤버 목록 조회 | X | O | O | O |
| 멤버 역할 변경 | X | X | X | O |
| 멤버 계약 유형 변경 | X | X | O | O |
| 공지 작성 | X | X | O | O |
| 공지 조회 | X | O | O | O |
| 가용성 프리셋 (본인) | X | O | O | O |
| 팀 정산 리포트 | X | X | O | O |

**계약 유형(contract_type)은 권한이 아님** — 페이 계산, 필수참여 여부 표시용.

---

## 3. 주요 사용자 플로우

### 3-1. 지원 플로우 (member)
1. 프로젝트 상세(`/projects/[id]`) → "지원하기" 버튼
2. `/apply/[id]` — STEP 01: 지원 정보 (이름/예명/동기/페이 동의)
3. STEP 02: 가용성 제출 (schedule_dates 기반 날짜별 available/maybe/unavailable + 시간대)
4. 복사 단축키: 다른 프로젝트에서 복사, 멤버와 동일하게
5. 제출 → `project_applications` INSERT + `schedule_votes` UPSERT
6. 관리자가 확정 → 상태 approved, `payouts` 레코드 생성

### 3-2. 관리자 확정 플로우
1. `/manage/[id]` — 지원자 탭: 필터/정렬/점수/메모 확인
2. 개별 또는 일괄 확정/탈락 처리
3. 확정 시 payouts 자동 생성(amount = project.fee, status = pending)
4. 로스터 탭에서 멤버별 충돌 확인 (동일 날짜 다른 프로젝트 approved)

### 3-3. 가용성 집계 플로우
1. `/manage/[id]` — 가용성 탭
2. 날짜별 bar chart (available/maybe/unavailable 누적)
3. 히트맵: 멤버 × 날짜 격자 (DB에서 전체 votes 조회, 서버사이드 집계)
4. ❓ OPEN QUESTION: RPC로 집계할지 클라이언트 집계할지 → 기본값: 클라이언트 집계 (데이터 크지 않음)

### 3-4. 정산 플로우
1. 프로젝트 확정 후 payouts 레코드 자동 생성
2. `/manage/[id]?tab=settlement` — 금액 수정, pending→scheduled→paid 상태 전환
3. `/settlements` — 팀 전체 월별 리포트 (month 파라미터, CSV 다운로드)
4. `/mypage?tab=payouts` — 본인 정산 이력

### 3-5. 공지 플로우
1. admin이 `/manage/[id]?tab=announce` 또는 `/announcements` 에서 작성
2. scope=team: 전체 멤버 노출, scope=project: 해당 프로젝트 로스터에만 노출
3. pinned=true이면 대시보드 홈 배너에 표시

---

## 4. 기술 스택 확정

| 항목 | 선택 | 근거 |
|------|------|------|
| Framework | Next.js 16 (App Router) | 기존 설치 |
| Language | TypeScript strict | 기존 설정 |
| Styling | Tailwind CSS v4 + CSS 변수 | 기존. 디자인 토큰을 CSS var로 추가 |
| shadcn/ui | 기존 설치 (components.json 존재) | Dialog, Table, Tabs 활용 |
| Database | Supabase PostgreSQL | 기존 |
| Auth | Supabase Auth + @supabase/auth-helpers-nextjs | 기존 |
| Validation | Zod | 기존 |
| Icons | lucide-react | 기존. 디자인의 I.* 아이콘과 1:1 매핑 |
| Date | date-fns | 기존 설치 |
| Forms | react-hook-form + @hookform/resolvers | 기존 설치 |
| Toast | sonner | 기존 설치 |
| Animation | framer-motion | 기존 설치. 드로어 슬라이드, FAB에 활용 |
| Testing | Playwright | 기존 |

**추가 필요 없음.** 모든 의존성 이미 설치됨.

---

## 5. Assumptions

- 단일 크루(원샷크루) 전용 앱. 멀티 크루 지원 불필요.
- 게스트 지원은 이름+이메일+전화번호만 필요. 계정 생성 불필요.
- 가용성 히트맵은 SSR로 초기 데이터 로딩, 클라이언트에서 인터랙션.
- 포스터 이미지 업로드는 Supabase Storage 사용 (별도 구현 범위).
- CSV 다운로드는 클라이언트사이드 blob 생성.
