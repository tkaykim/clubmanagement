-- 002_extend_schema.sql
-- OneShot Crew — Design handoff schema extensions
-- Run after 001_oneshot_schema.sql

-- ============================================================
-- Extend: projects
-- ============================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'paid_gig'
  CHECK (type IN ('paid_gig', 'practice', 'audition', 'workshop'));

ALTER TABLE projects ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT;

-- Add 'selecting' to status check
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('recruiting', 'selecting', 'in_progress', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);

-- ============================================================
-- Extend: schedule_dates
-- ============================================================

ALTER TABLE schedule_dates ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'event'
  CHECK (kind IN ('event', 'practice'));

CREATE INDEX IF NOT EXISTS idx_schedule_dates_kind ON schedule_dates(kind);

-- ============================================================
-- Extend: project_applications
-- ============================================================

ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS score NUMERIC(4,1);
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS answers_note TEXT;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS fee_agreement TEXT NOT NULL DEFAULT 'yes'
  CHECK (fee_agreement IN ('yes', 'partial'));
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS motivation TEXT;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE project_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_project_applications_status ON project_applications(status);

DROP TRIGGER IF EXISTS trg_project_applications_updated_at ON project_applications;
CREATE TRIGGER trg_project_applications_updated_at
  BEFORE UPDATE ON project_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Extend: crew_members
-- ============================================================

ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS stage_name TEXT;
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'contract'
  CHECK (contract_type IN ('contract', 'non_contract', 'guest'));
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS joined_month TEXT;
-- Note: is_active already exists in 001

-- ============================================================
-- New table: announcements
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
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- New table: payouts
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
CREATE INDEX IF NOT EXISTS idx_payouts_scheduled_at ON payouts(scheduled_at);

CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- New table: availability_presets
-- ============================================================

CREATE TABLE IF NOT EXISTS availability_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- config structure: { dow?: number[], timeSlots?: [{start, end}], specificDates?: string[] }
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_availability_presets_user_id ON availability_presets(user_id);

CREATE TRIGGER trg_availability_presets_updated_at
  BEFORE UPDATE ON availability_presets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: enable on all tables
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_presets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- (see architect-schema.md for full strategy rationale)
-- ============================================================

-- users: self only
CREATE POLICY "users_self_select" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_self_update" ON users FOR UPDATE USING (auth.uid() = id);

-- crew_members: authenticated read, admin write
CREATE POLICY "crew_members_auth_select" ON crew_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "crew_members_admin_all" ON crew_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- projects: authenticated read, admin write
CREATE POLICY "projects_auth_select" ON projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "projects_admin_insert" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "projects_admin_update" ON projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "projects_owner_delete" ON projects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
  );

-- schedule_dates: authenticated read, admin write
CREATE POLICY "schedule_dates_auth_select" ON schedule_dates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "schedule_dates_admin_all" ON schedule_dates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- schedule_votes: self upsert, admin read all
CREATE POLICY "votes_self_all" ON schedule_votes
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "votes_admin_select" ON schedule_votes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- project_applications: guest insert allowed, self read, admin all
CREATE POLICY "applications_anyone_insert" ON project_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "applications_self_select" ON project_applications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "applications_admin_select" ON project_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "applications_self_update" ON project_applications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "applications_admin_update" ON project_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- announcements: member read (team scope = all, project scope = roster only)
CREATE POLICY "announcements_member_select" ON announcements
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      scope = 'team'
      OR EXISTS (
        SELECT 1 FROM project_applications pa
        WHERE pa.project_id = announcements.project_id
          AND pa.user_id = auth.uid()
          AND pa.status = 'approved'
      )
    )
  );

CREATE POLICY "announcements_admin_all" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- payouts: self read, admin all
CREATE POLICY "payouts_self_select" ON payouts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "payouts_admin_all" ON payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- availability_presets: self only
CREATE POLICY "presets_self_all" ON availability_presets
  FOR ALL USING (user_id = auth.uid());

-- form_fields: authenticated read, admin write
CREATE POLICY "form_fields_auth_select" ON form_fields
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "form_fields_admin_all" ON form_fields
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );
