-- =============================================================
-- 011_applications_admin_delete.sql
-- admin/owner 가 프로젝트 참여자(project_applications) 를 삭제할 수 있도록
-- DELETE RLS 정책을 추가한다.
--
-- 배경: 관리자가 수동으로 참여자를 추가·수정·삭제하는 UX 추가 시,
--        기존 RLS 에는 applications_admin_delete 가 없어 DELETE 요청이
--        모두 0행 반환 되던 문제. (CRUD 중 D 만 누락.)
-- =============================================================

DROP POLICY IF EXISTS applications_admin_delete ON public.project_applications;
CREATE POLICY applications_admin_delete
  ON public.project_applications
  FOR DELETE
  USING (is_admin_or_owner(auth.uid()));
