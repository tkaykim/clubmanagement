-- 022_projects_admin_delete_rls.sql
-- DELETE /api/projects/[id] 는 requireAdmin() 으로 owner·admin 모두 허용하는데,
-- RLS 의 projects_owner_delete 는 owner 만 허용하여 admin 이 삭제 시 0행/실패함.
-- admin·owner 모두 삭제 가능하도록 정책을 맞춘다.

DROP POLICY IF EXISTS projects_owner_delete ON public.projects;
CREATE POLICY projects_admin_or_owner_delete ON public.projects
  FOR DELETE
  USING (public.is_admin_or_owner(auth.uid()));
