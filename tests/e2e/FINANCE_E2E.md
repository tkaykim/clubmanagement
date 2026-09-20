# Finance E2E fixture contract

이 검증은 mock이 아니라 적용 대상 Supabase의 실제 Auth, Data API RLS, Next.js Route Handler, 브라우저 SSR을 함께 검사한다.

운영 DB를 사용할 때도 실제 고객·멤버·금액을 재사용하지 않고 `finance-e2e-*` 합성 계정과 식별 가능한 합성 프로젝트 두 건만 사용한다.

## 실행 전 준비

1. `tests/e2e/finance.fixture.example.json`을 저장소 밖의 비공개 경로 또는 `.finance-e2e.local.json`으로 복사한다.
2. CEO, 전역 재무, 프로젝트 담당자 A/B, 미배정 admin, 미배정 owner, 일반 참여자 A/B의 합성 Auth 계정 여덟 개를 만든다.
3. `finance_access_grants`에는 CEO와 전역 재무만 넣는다.
4. `finance_project_managers`에는 담당자 A→프로젝트 A, 담당자 B→프로젝트 B만 넣는다.
5. 미배정 admin/owner는 기존 `crew_members.role`만 admin 또는 owner로 두고 어떤 finance grant도 주지 않는다.
6. 참여자 A/B에는 각각 자기 프로젝트의 confirmed 수당 한 건을 만들고 서로 겹치지 않는 합성 금액을 쓴다.
7. 비공개 fixture 파일에 실제 user UUID, project UUID, 이메일, 임시 비밀번호와 합성 금액을 기록한다.

승인된 사설 환경에서는 migration 적용 뒤 `scripts/finance-e2e-seed.cjs`를 사용해 3~7단계의 합성 finance 행만 만들 수 있다.
이 스크립트는 `FINANCE_E2E_FIXTURE_PATH`와 런타임 service credential을 요구하며, 실데이터를 탐색하거나 알림을 보내지 않는다.

테스트는 fixture를 만들거나 삭제하지 않는다.

프로덕션 fixture 생성·정리는 별도 승인된 운영 절차에서 수행한다.

## 필수 환경 변수

```powershell
$env:FINANCE_E2E = "1"
$env:FINANCE_E2E_FIXTURE_PATH = "C:\secure\oneshot-finance-e2e.json"
$env:BASE_URL = "http://localhost:3000"
npm run test:e2e:finance
```

앱과 테스트 프로세스에는 같은 `NEXT_PUBLIC_SUPABASE_URL`과 anon/publishable key가 필요하다.

service-role key는 테스트에 필요하지 않으며 테스트 프로세스에 전달하지 않는다.

## 검증 범위

- CEO와 전역 재무는 A/B 프로젝트를 모두 직접 DB와 API에서 읽는다.
- 담당자 A/B는 각자 배정된 프로젝트만 읽는다.
- 미배정 admin/owner는 역할 이름만으로 예산, 팀 수당, 레거시 전체 정산을 읽지 못한다.
- 일반 참여자는 프로젝트 예산과 동료 수당을 읽지 못하고 본인의 confirmed 수당만 읽는다.
- 레거시 payout 생성·상태 변경 endpoint는 인증 사용자에게도 `410`을 반환하고, 과거 조회도 명시적 finance 범위를 벗어나지 않는다.
- 기존 프로젝트 관리 SSR에 레거시 payout 금액이나 정산 탭이 포함되지 않는다.
- `/finance`, finance JSON, 레거시 settlements JSON/CSV의 브라우저 요청도 동일한 경계를 지킨다.
- 합성 프로젝트에서 draft 동시 저장, 제출, 전역 확정, 증빙 없는 지급 거절, 부분·전액 지급, 중복 거래, 예산 초과, 담당자 즉시 회수를 검증한다.
