-- 006_bug_reports.sql
-- OneShot Crew — 버그 제보 시스템
-- Run after 005_project_visibility.sql
--
-- 설계 원칙: 사용자는 "제목 + 설명 + 심각도" 3개만 입력. 나머지(URL/UA/viewport)는
-- 클라이언트에서 자동 캡처한다. 개발자(AI)가 이슈를 재현 가능한 수준의 컨텍스트를
-- 자동으로 확보하는 것이 목표.

BEGIN;

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- 신고 시점의 표시 이름 스냅샷 (리포터가 추후 탈퇴해도 식별 가능)
  reporter_name TEXT,

  -- 사용자가 직접 입력 (3개만)
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'blocker')),

  -- 자동 캡처되는 기술 컨텍스트 (개발자가 재현하기 위해 필요)
  page_url TEXT,
  user_agent TEXT,
  viewport TEXT, -- '1920x1080' 등

  -- 관리자 작업
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'wontfix', 'duplicate')),
  admin_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON public.bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter_id ON public.bug_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON public.bug_reports(created_at DESC);

-- updated_at 트리거
DROP TRIGGER IF EXISTS trg_bug_reports_updated_at ON public.bug_reports;
CREATE TRIGGER trg_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- INSERT: 활성 멤버가 자기 id 로만 리포트 가능
DROP POLICY IF EXISTS "bug_reports_insert" ON public.bug_reports;
CREATE POLICY "bug_reports_insert" ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND public.current_user_is_active()
  );

-- SELECT: 본인 리포트는 항상 조회 가능 (내가 낸 리포트 확인)
DROP POLICY IF EXISTS "bug_reports_self_select" ON public.bug_reports;
CREATE POLICY "bug_reports_self_select" ON public.bug_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- SELECT/UPDATE/DELETE (admin 전체 관리)
DROP POLICY IF EXISTS "bug_reports_admin_all" ON public.bug_reports;
CREATE POLICY "bug_reports_admin_all" ON public.bug_reports
  FOR ALL TO authenticated
  USING (public.current_user_is_active_admin())
  WITH CHECK (public.current_user_is_active_admin());

COMMIT;
