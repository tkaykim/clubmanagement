-- 007_app_ux_v2.sql
-- 우동 - 지원 UX v2
-- 1) schedule_votes.status 4단계 확장: available / partial / adjustable / unavailable
-- 2) 지원자 카운트용 SECURITY DEFINER 뷰 — RLS 우회로 목록 카드에서 수 표시 가능
-- 3) schedule_votes SELECT 정책 완화 — 본인 투표는 항상 읽기 가능 (지원서 수정 UX)
--
-- 배경:
-- - 기존에는 status = 'maybe' 3단계 ('available','unavailable','maybe')
-- - 사용자가 지원을 제출해도 `getProjects` nested select가 RLS에 걸려 일반 사용자는 0으로 보임
-- - 관리자 화면에서도 is_active=false 인 owner/admin 이면 0으로 보임
-- - 일정 라벨/kind 는 이미 존재하므로 DDL 불필요

-- ============================================================
-- 1) schedule_votes.status 4단계 확장
-- ============================================================

-- 기존 데이터 중 'maybe' 는 의미가 "협의 가능" 에 가까우므로 'adjustable' 로 이관
UPDATE schedule_votes
   SET status = 'adjustable'
 WHERE status = 'maybe';

-- CHECK 제약 재정의
ALTER TABLE schedule_votes
  DROP CONSTRAINT IF EXISTS schedule_votes_status_check;

ALTER TABLE schedule_votes
  ADD CONSTRAINT schedule_votes_status_check
  CHECK (status IN ('available', 'partial', 'adjustable', 'unavailable'));

-- ============================================================
-- 2) 지원자 카운트 뷰 (RLS 우회, SECURITY DEFINER 함수 래핑)
-- ============================================================
-- 목록 카드·프로젝트 상세 페이지에서 "지원자 N명" 을 비관리자도 볼 수 있어야 함.
-- project_applications 자체는 RLS 로 보호되므로 카운트 전용 함수를 SECURITY DEFINER 로 공개한다.

CREATE OR REPLACE FUNCTION public.get_project_application_counts(p_project_ids uuid[])
RETURNS TABLE (
  project_id uuid,
  total bigint,
  approved bigint,
  pending bigint,
  rejected bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    pa.project_id,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE pa.status = 'approved')::bigint AS approved,
    COUNT(*) FILTER (WHERE pa.status = 'pending')::bigint AS pending,
    COUNT(*) FILTER (WHERE pa.status = 'rejected')::bigint AS rejected
  FROM public.project_applications pa
  WHERE pa.project_id = ANY(p_project_ids)
  GROUP BY pa.project_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_application_counts(uuid[]) TO anon, authenticated;

-- 단일 프로젝트용 편의 함수
CREATE OR REPLACE FUNCTION public.get_project_application_count(p_project_id uuid)
RETURNS TABLE (
  total bigint,
  approved bigint,
  pending bigint,
  rejected bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE status = 'approved')::bigint AS approved,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint AS pending,
    COUNT(*) FILTER (WHERE status = 'rejected')::bigint AS rejected
  FROM public.project_applications
  WHERE project_id = p_project_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_application_count(uuid) TO anon, authenticated;

-- ============================================================
-- 3) schedule_votes 본인 읽기 정책 (지원 수정 시 내 투표 다시 로드)
-- ============================================================

DROP POLICY IF EXISTS "votes_self_select" ON schedule_votes;
CREATE POLICY "votes_self_select" ON schedule_votes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- admin SELECT 는 003 에서 정의된 "votes_admin_select" 유지

-- ============================================================
-- 4) 관리자용: schedule_votes 조인 조회를 위한 헬퍼
-- ============================================================
-- 열지도 (/manage/projects/[id]) 에서 approved 지원자 × schedule_dates 매트릭스를 그리기 위함.
-- admin 은 schedule_votes 전체를 읽을 수 있으므로(votes_admin_select) 별도 처리 불필요.
-- 단, getAvailabilityMatrix 가 참조하는 쿼리를 단순화할 수 있도록 인덱스만 확인

CREATE INDEX IF NOT EXISTS idx_schedule_votes_date_user
  ON schedule_votes(schedule_date_id, user_id);
