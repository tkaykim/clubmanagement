CREATE OR REPLACE FUNCTION public.link_guest_applications(p_user_id UUID, p_name TEXT, p_phone TEXT)
RETURNS INTEGER AS $$
DECLARE
  matched INTEGER;
BEGIN
  UPDATE public.project_applications
  SET user_id = p_user_id,
      guest_name = NULL,
      guest_phone = NULL
  WHERE user_id IS NULL
    AND guest_name = p_name
    AND guest_phone = p_phone;
  GET DIAGNOSTICS matched = ROW_COUNT;
  RETURN matched;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
