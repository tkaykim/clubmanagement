-- Finance needs names for assigned managers and historic recipients without
-- weakening the crew member directory's ordinary row-level security.

BEGIN;

CREATE OR REPLACE FUNCTION public.finance_get_member_directory(p_actor_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  name TEXT,
  stage_name TEXT,
  profile_image_url TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);

  IF public.finance_is_global(p_actor_user_id)
     OR EXISTS (
       SELECT 1
       FROM public.finance_project_managers manager
       JOIN public.crew_members member
         ON member.id = manager.crew_member_id
        AND member.user_id = manager.user_id
        AND member.is_active = true
       WHERE manager.user_id = p_actor_user_id
     ) THEN
    RETURN QUERY
    SELECT member.id, member.user_id, member.name, member.stage_name,
           member.profile_image_url, member.is_active
    FROM public.crew_members member
    ORDER BY member.name, member.id;
  ELSE
    RETURN QUERY
    SELECT member.id, member.user_id, member.name, member.stage_name,
           member.profile_image_url, member.is_active
    FROM public.crew_members member
    WHERE member.user_id = p_actor_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.finance_get_member_directory(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_get_member_directory(UUID)
  TO authenticated, service_role;

COMMIT;
