-- 013: 관리자(활성 owner/admin) 가 타 사용자의 schedule_votes 를 INSERT/UPDATE/DELETE 할 수 있도록 RLS 추가
-- 배경:
--   - 002/003 에서 schedule_votes 는 votes_self_all (자기 것만 전 작업) + votes_admin_select (읽기만 전체)
--   - 담당자 조율 후 관리자가 지원자의 가능시간을 직접 수정할 수 있어야 함 → admin write 필요
-- 주의:
--   - is_admin_or_owner(uid) 헬퍼는 009_auth_ssot_crew_members.sql 에서 정의됨
--   - 기존 votes_self_all 은 유지 (본인은 여전히 자기 것만 수정 가능)

DROP POLICY IF EXISTS "votes_admin_insert" ON schedule_votes;
CREATE POLICY "votes_admin_insert" ON schedule_votes
  FOR INSERT
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "votes_admin_update" ON schedule_votes;
CREATE POLICY "votes_admin_update" ON schedule_votes
  FOR UPDATE
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "votes_admin_delete" ON schedule_votes;
CREATE POLICY "votes_admin_delete" ON schedule_votes
  FOR DELETE
  USING (public.is_admin_or_owner(auth.uid()));
