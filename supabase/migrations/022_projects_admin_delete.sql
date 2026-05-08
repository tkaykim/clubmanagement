-- 022_projects_admin_delete.sql
-- DELETE 정책을 admin/owner 모두 허용으로 완화.
--
-- 배경: PR #8 (#feat: 활동 로그 + 프로젝트 admin 삭제 권한) 에서 라우트 가드를
--       requireOwner → requireAdmin 으로 완화했지만 DB RLS 가 따라오지 않아
--       admin 사용자가 삭제 시도하면 supabase-js 가 error 없이 0 rows 만 반환,
--       라우트는 200 OK + 활동 로그 기록 → 사용자는 "삭제됨" 토스트 보지만
--       실제로는 프로젝트가 살아 있는 silent fail 발생.
--
-- 라우트도 .select() 후 deletedRows.length 검사로 추가 방어.

DROP POLICY IF EXISTS "projects_owner_delete" ON public.projects;
CREATE POLICY "projects_admin_delete" ON public.projects
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));
