# API Contracts — OneShot Crew

## 원칙
- **Server Component 직접 쿼리**: 페이지 초기 렌더링 데이터 (SSR). `lib/supabase-server.ts` 사용.
- **Route Handler (`app/api/`)**: 폼 제출, 상태 변경, 뮤테이션 전용. JSON `{ data } | { error }`.
- **Client Hook**: `hooks/` 에서 `useCallback` + `useEffect`. 실시간 UI 업데이트.

---

## Server Component 직접 쿼리 대상 (Route Handler 불필요)

| 페이지 | 쿼리 대상 | 이유 |
|--------|-----------|------|
| `/` (Dashboard) | projects, announcements (pinned), 본인 applications | 초기 통계 SSR |
| `/projects` | projects + 기본 applications count | 목록 SSR |
| `/projects/[id]` | project + schedule_dates + applications + announcements | 상세 SSR |
| `/apply/[id]` | project + schedule_dates + 본인 기존 votes | 폼 초기값 |
| `/calendar` | schedule_dates (approved projects) + votes | 월간 캘린더 |
| `/members` | crew_members | 멤버 목록 |
| `/announcements` | announcements | 목록 |
| `/manage/[id]` | project + applications + schedule_dates + payouts + announcements | 관리자 워크벤치 |
| `/settlements` | payouts (JOIN projects, users) GROUP BY month | 팀 정산 |
| `/mypage` | 본인 applications + payouts + presets | 마이페이지 |

---

## Route Handler 목록

### Auth
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|---------|
| POST | /api/auth/login | 없음 | `{ email, password }` | `{ data: { user } }` |
| POST | /api/auth/signup | 없음 | `{ email, password, name }` | `{ data: { user } }` |
| POST | /api/auth/logout | 인증 | - | `{ data: { ok } }` |

### Projects
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|---------|
| POST | /api/projects | admin | `CreateProjectInput` (Zod) | `{ data: Project }` |
| PATCH | /api/projects/[id] | admin | `UpdateProjectInput` (Zod) | `{ data: Project }` |
| PATCH | /api/projects/[id]/status | admin | `{ status: ProjectStatus }` | `{ data: { status } }` |
| DELETE | /api/projects/[id] | owner | - | `{ data: { ok } }` |

### Applications
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|---------|
| POST | /api/projects/[id]/apply | 없음(게스트 허용) | `ApplyInput` (Zod) | `{ data: { applicationId } }` |
| PATCH | /api/projects/[id]/apply | 인증 (본인) | `UpdateApplyInput` (Zod) | `{ data: Application }` |
| PATCH | /api/applications/[appId]/status | admin | `{ status, memo?, score? }` | `{ data: Application }` |
| POST | /api/applications/bulk-status | admin | `{ ids: string[], status }` | `{ data: { updated: number } }` |

### Schedule Votes
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|---------|
| POST | /api/projects/[id]/votes | 인증 | `VoteSubmitInput` (Zod) | `{ data: { upserted: number } }` |

`VoteSubmitInput`: `{ votes: Record<scheduleDateId, { status, time_slots, note? }> }`

### Announcements
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|---------|
| POST | /api/announcements | admin | `CreateAnnouncementInput` (Zod) | `{ data: Announcement }` |
| PATCH | /api/announcements/[id] | admin | `UpdateAnnouncementInput` (Zod) | `{ data: Announcement }` |
| DELETE | /api/announcements/[id] | admin | - | `{ data: { ok } }` |

### Payouts
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|---------|
| PATCH | /api/payouts/[id] | admin | `{ status, amount?, scheduled_at?, paid_at?, note? }` | `{ data: Payout }` |
| POST | /api/projects/[id]/payouts/generate | admin | - | `{ data: { created: number } }` |
| GET | /api/settlements | admin | `?month=2026-04` | `{ data: SettlementSummary }` |
| GET | /api/settlements/csv | admin | `?month=2026-04` | CSV 파일 |

### Members
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|---------|
| POST | /api/members | owner/admin | `CreateMemberInput` (Zod) | `{ data: CrewMember }` |
| PATCH | /api/members/[id] | owner/admin | `UpdateMemberInput` (Zod) | `{ data: CrewMember }` |
| PATCH | /api/members/[id]/role | owner | `{ role: UserRole }` | `{ data: { role } }` |

### Availability Presets
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|---------|
| POST | /api/presets | 인증 | `{ name, description?, config }` | `{ data: AvailabilityPreset }` |
| PATCH | /api/presets/[id] | 인증(본인) | `{ name?, description?, config? }` | `{ data: AvailabilityPreset }` |
| DELETE | /api/presets/[id] | 인증(본인) | - | `{ data: { ok } }` |

---

## Supabase RPC 계획

### rpc_availability_summary (선택적)
가용성 탭의 날짜별 집계. 데이터셋이 작으므로(12명 × 15일 = 180행) **클라이언트 집계** 채택.
별도 RPC 불필요.

### rpc_settlement_monthly
팀 정산 리포트 집계. SQL GROUP BY가 복잡하므로 RPC 권장.

```sql
-- 파라미터: target_month TEXT ('2026-04')
SELECT
  u.id AS user_id,
  u.name,
  cm.stage_name,
  COUNT(pa.id) AS project_count,
  SUM(po.amount) AS total_amount,
  SUM(CASE WHEN po.status = 'paid' THEN po.amount ELSE 0 END) AS paid_amount,
  SUM(CASE WHEN po.status = 'scheduled' THEN po.amount ELSE 0 END) AS scheduled_amount,
  SUM(CASE WHEN po.status = 'pending' THEN po.amount ELSE 0 END) AS pending_amount
FROM payouts po
JOIN project_applications pa ON pa.id = po.application_id
JOIN projects p ON p.id = po.project_id
JOIN users u ON u.id = po.user_id
JOIN crew_members cm ON cm.user_id = u.id
WHERE to_char(p.start_date, 'YYYY-MM') = target_month
   OR to_char(po.scheduled_at, 'YYYY-MM') = target_month
GROUP BY u.id, u.name, cm.stage_name;
```

❓ OPEN QUESTION: `target_month` 기준을 `project.start_date`로 할지 `payout.scheduled_at`으로 할지. 기본값: `payout.scheduled_at` 우선, NULL이면 `project.start_date`.

---

## 에러 응답 형식

모든 Route Handler:
```typescript
// 성공
{ data: T }
// 실패
{ error: string }
// HTTP 상태: 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found), 500 (server)
```

Zod 검증 실패 시:
```typescript
{ error: "입력값이 올바르지 않습니다", details: ZodIssue[] }
```

---

## Zod 스키마 이름 (validators.ts 추가 목록)

- `createProjectSchema` — POST /api/projects
- `updateProjectSchema` — PATCH /api/projects/[id]
- `applySchema` — POST /api/projects/[id]/apply
- `updateApplySchema` — PATCH /api/projects/[id]/apply
- `voteSubmitSchema` — POST /api/projects/[id]/votes
- `applicationStatusSchema` — PATCH /api/applications/[id]/status
- `bulkStatusSchema` — POST /api/applications/bulk-status
- `createAnnouncementSchema` — POST /api/announcements
- `updateAnnouncementSchema` — PATCH /api/announcements/[id]
- `updatePayoutSchema` — PATCH /api/payouts/[id]
- `createMemberSchema` — POST /api/members
- `updateMemberSchema` — PATCH /api/members/[id]
- `presetSchema` — POST/PATCH /api/presets
