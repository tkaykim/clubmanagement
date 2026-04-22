# Schema Design — OneShot Crew

## 1. 변경 전/후 스키마 Diff

### 001_oneshot_schema.sql 에서 변경/추가 사항

#### projects 테이블
```sql
-- 추가할 컬럼
ALTER TABLE projects ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'paid_gig'
  CHECK (type IN ('paid_gig', 'practice', 'audition', 'workshop'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT;

-- status에 'selecting' 추가
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('recruiting', 'selecting', 'in_progress', 'completed', 'cancelled'));

-- recruitment_end_at 컬럼 이름 통일 (기존 recruitment_end_at 유지)
-- fee는 음수 허용 (참가비 케이스), 기존 INTEGER 유지
```

#### schedule_dates 테이블
```sql
-- kind 컬럼 추가
ALTER TABLE schedule_dates ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'event'
  CHECK (kind IN ('event', 'practice'));
```

#### project_applications 테이블
```sql
-- 심사 관련 컬럼 추가
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS score NUMERIC(4,1);
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS answers_note TEXT;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS fee_agreement TEXT
  CHECK (fee_agreement IN ('yes', 'partial')) DEFAULT 'yes';
-- motivation 필드 (지원 동기)
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS motivation TEXT;
-- 게스트 이메일
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS guest_email TEXT;
-- updated_at 추가
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
```

#### crew_members 테이블
```sql
-- 디자인에서 확인된 필드 추가
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS stage_name TEXT;
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'contract'
  CHECK (contract_type IN ('contract', 'non_contract', 'guest'));
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS joined_month TEXT; -- 'YYYY-MM' 형식
-- is_active 이미 존재
```

---

## 2. 새 마이그레이션 파일 계획

### supabase/migrations/002_extend_schema.sql

기존 001 테이블에 컬럼 추가 + 신규 3개 테이블 생성.

```sql
-- ============================================================
-- 002_extend_schema.sql
-- OneShot Crew 디자인 핸드오프 기반 스키마 확장
-- ============================================================

-- ---- projects 확장 ----
ALTER TABLE projects ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'paid_gig'
  CHECK (type IN ('paid_gig', 'practice', 'audition', 'workshop'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('recruiting', 'selecting', 'in_progress', 'completed', 'cancelled'));

-- ---- schedule_dates 확장 ----
ALTER TABLE schedule_dates ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'event'
  CHECK (kind IN ('event', 'practice'));

-- ---- project_applications 확장 ----
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS score NUMERIC(4,1);
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS answers_note TEXT;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS fee_agreement TEXT DEFAULT 'yes'
  CHECK (fee_agreement IN ('yes', 'partial'));
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS motivation TEXT;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_project_applications_status ON project_applications(status);

-- ---- crew_members 확장 ----
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS stage_name TEXT;
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'contract'
  CHECK (contract_type IN ('contract', 'non_contract', 'guest'));
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS joined_month TEXT;

-- ============================================================
-- 신규: announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'team' CHECK (scope IN ('team', 'project')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_project_id ON announcements(project_id);
CREATE INDEX IF NOT EXISTS idx_announcements_scope ON announcements(scope);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(pinned) WHERE pinned = true;

-- ============================================================
-- 신규: payouts
-- ============================================================
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES project_applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'paid')),
  scheduled_at DATE,
  paid_at DATE,
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS idx_payouts_project_id ON payouts(project_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- ============================================================
-- 신규: availability_presets
-- ============================================================
CREATE TABLE IF NOT EXISTS availability_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  -- config 구조: { dow: [1,3,5], timeSlots: [{start:"20:00", end:"23:00"}] }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_availability_presets_user_id ON availability_presets(user_id);

-- ============================================================
-- Triggers for updated_at
-- ============================================================
CREATE TRIGGER trg_project_applications_updated_at
  BEFORE UPDATE ON project_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_availability_presets_updated_at
  BEFORE UPDATE ON availability_presets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 3. RLS 정책 전략

### 원칙
- **공개 지원 링크**: `project_applications`에 비인증 INSERT 허용 (guest 지원).
- **인증 사용자**: 본인 데이터 SELECT/UPDATE.
- **admin/owner**: 프로젝트별 모든 데이터 SELECT/UPDATE/DELETE.
- **crew_members**: 인증 사용자 전체 조회 가능 (멤버 목록은 공개).

### 테이블별 정책

#### users
```sql
-- 본인만 자기 row 조회
CREATE POLICY "users: self read" ON users FOR SELECT USING (auth.uid() = id);
-- 본인 정보 수정
CREATE POLICY "users: self update" ON users FOR UPDATE USING (auth.uid() = id);
```

#### crew_members
```sql
-- 인증 사용자 전체 조회 (멤버 목록 필요)
CREATE POLICY "crew_members: authenticated read" ON crew_members
  FOR SELECT USING (auth.role() = 'authenticated');
-- owner만 삽입/수정/삭제
CREATE POLICY "crew_members: owner manage" ON crew_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner','admin'))
  );
```

#### projects
```sql
-- 인증 사용자 전체 조회
CREATE POLICY "projects: authenticated read" ON projects
  FOR SELECT USING (auth.role() = 'authenticated');
-- admin/owner 생성
CREATE POLICY "projects: admin create" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner','admin'))
  );
-- admin/owner 수정 (owner_id 또는 role)
CREATE POLICY "projects: admin update" ON projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner','admin'))
  );
```

#### project_applications
```sql
-- 비인증 INSERT 허용 (게스트 공개 지원링크)
CREATE POLICY "applications: guest insert" ON project_applications
  FOR INSERT WITH CHECK (true);
-- 본인 지원 조회
CREATE POLICY "applications: self read" ON project_applications
  FOR SELECT USING (user_id = auth.uid());
-- admin/owner 전체 조회
CREATE POLICY "applications: admin read" ON project_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner','admin'))
  );
-- admin/owner 상태 변경
CREATE POLICY "applications: admin update" ON project_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner','admin'))
  );
```

#### schedule_votes
```sql
-- 인증 사용자 본인 투표 UPSERT
CREATE POLICY "votes: self upsert" ON schedule_votes
  FOR ALL USING (user_id = auth.uid());
-- admin/owner 전체 조회 (가용성 집계)
CREATE POLICY "votes: admin read" ON schedule_votes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner','admin'))
  );
```

#### announcements
```sql
-- 인증 사용자 조회 (team scope)
-- project scope는 해당 프로젝트 로스터만
CREATE POLICY "announcements: member read" ON announcements
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      scope = 'team' OR
      EXISTS (
        SELECT 1 FROM project_applications pa
        WHERE pa.project_id = announcements.project_id
          AND pa.user_id = auth.uid()
          AND pa.status = 'approved'
      )
    )
  );
-- admin 작성
CREATE POLICY "announcements: admin write" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner','admin'))
  );
```

#### payouts
```sql
-- 본인 정산 조회
CREATE POLICY "payouts: self read" ON payouts
  FOR SELECT USING (user_id = auth.uid());
-- admin 전체 조회/수정
CREATE POLICY "payouts: admin manage" ON payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner','admin'))
  );
```

#### availability_presets
```sql
-- 본인 CRUD
CREATE POLICY "presets: self" ON availability_presets
  FOR ALL USING (user_id = auth.uid());
```

### RLS 활성화 (모든 테이블)
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_presets ENABLE ROW LEVEL SECURITY;
```

---

## 4. 시드 데이터 계획 (Backend 전달)

`scripts/seed.ts`에서 아래 순서로 삽입:
1. users (MEMBERS 배열 → 9명 + auth 계정)
2. crew_members (users와 연결)
3. projects (4개 프로젝트)
4. schedule_dates (event/practice kind 구분)
5. project_applications (지원자 시드)
6. schedule_votes (VOTES_SEED 기반)
7. announcements (4개)
8. payouts (approved 지원자 기반 자동 생성)

❓ OPEN QUESTION: 시드 실행 시 기존 Supabase Auth 계정과 연동할지, 더미 UUID만 사용할지. 기본값: 더미 UUID (로컬 개발용).
