# Club Management Platform (동아리 관리 플랫폼)

## Overview
동아리 회원, 일정, 프로젝트를 관리하는 웹 플랫폼.
5개의 팀 에이전트(Architect, Designer, Backend, Frontend, QA)가 분업하여 구축한다.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Supabase (PostgreSQL) / SQLite (local test)
- **Auth**: Supabase Auth + @supabase/auth-helpers-nextjs
- **Validation**: Zod
- **Icons**: lucide-react
- **Testing**: Playwright (E2E)

## Current Phase
> **Phase**: SETUP
> **Last Agent**: -
> **Status**: 프로젝트 초기화 완료, 에이전트 세팅 중

## Conventions

### File Naming
- Pages: `app/(group)/route/page.tsx`
- API: `app/api/resource/route.ts`
- Components: PascalCase (`MemberCard.tsx`)
- Hooks: `use` prefix camelCase (`useMembers.ts`)

### Code Rules
- Server Components 기본. `'use client'`는 필요시만
- Path alias `@/*` (project root)
- UI 텍스트: 한국어 / 코드: 영어
- API 응답 형식: `{ data: T } | { error: string }`
- 모든 폼 Zod 검증 필수

### Data Fetching
- Server: `lib/supabase-server.ts` 직접 쿼리
- Client: `hooks/` 에서 `useCallback` + `useEffect` 패턴

## Database Tables (동아리 도메인)
동아리 전용: `club_categories`, `clubs`, `club_members`, `club_applications`, `projects`, `project_members`, `project_tasks`, `project_attendances`, 동아리용 `schedules` 등.  
전체 요구사항·단계별 계획: **`docs/IMPLEMENTATION_PLAN.md`** 참고.

## Agent Team Structure
각 에이전트는 `.claude/agents/` 에 정의됨. 실행 순서:
1. `architect` → 2. `designer` + `backend` (병렬) → 3. `frontend` → 4. `qa` → 5. 반복

## Handoff Protocol
- 완료 시 `.claude/handoffs/` 에 핸드오프 문서 작성
- 완료 시그널: `.claude/handoffs/.done-<agent>` 파일 생성
- 다음 에이전트는 이전 핸드오프 문서를 반드시 읽고 시작
