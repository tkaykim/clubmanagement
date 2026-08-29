-- OneShot Crew — 프로젝트 접근 판정의 호출자 신원과 활성 멤버 조건 고정

BEGIN;

CREATE OR REPLACE FUNCTION public.user_can_access_project(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT (
    auth.role() = 'service_role'
    OR p_user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.projects project
    JOIN public.crew_members member
      ON member.user_id = p_user_id
     AND member.is_active = true
    WHERE project.id = p_project_id
      AND (
        project.visibility = 'public'
        OR (project.visibility = 'admin' AND member.role IN ('owner', 'admin'))
        OR (
          project.visibility = 'contract'
          AND (member.role IN ('owner', 'admin') OR member.contract_type = 'contract')
        )
        OR (
          project.visibility = 'private'
          AND (project.owner_id = p_user_id OR member.role = 'owner')
        )
        OR EXISTS (
          SELECT 1
          FROM public.project_managers manager
          WHERE manager.project_id = project.id
            AND manager.user_id = p_user_id
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_access_project(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_project(UUID, UUID)
  TO authenticated, service_role;

COMMIT;
