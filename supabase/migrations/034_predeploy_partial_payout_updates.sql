-- OneShot Crew — 정산정보 PATCH에서 전달되지 않은 기존 필드를 보존

BEGIN;

CREATE OR REPLACE FUNCTION public.service_update_member_profile_and_payout(
  p_member_id UUID,
  p_profile_updates JSONB DEFAULT '{}'::JSONB,
  p_payout_updates JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.crew_members member
  SET name = CASE WHEN p_profile_updates ? 'name' THEN p_profile_updates->>'name' ELSE member.name END,
      stage_name = CASE WHEN p_profile_updates ? 'stage_name' THEN p_profile_updates->>'stage_name' ELSE member.stage_name END,
      phone = CASE WHEN p_profile_updates ? 'phone' THEN p_profile_updates->>'phone' ELSE member.phone END,
      gender = CASE WHEN p_profile_updates ? 'gender' THEN p_profile_updates->>'gender' ELSE member.gender END,
      birth_date = CASE WHEN p_profile_updates ? 'birth_date' THEN (p_profile_updates->>'birth_date')::DATE ELSE member.birth_date END,
      youtube_url = CASE WHEN p_profile_updates ? 'youtube_url' THEN p_profile_updates->>'youtube_url' ELSE member.youtube_url END,
      instagram_handle = CASE WHEN p_profile_updates ? 'instagram_handle' THEN p_profile_updates->>'instagram_handle' ELSE member.instagram_handle END,
      height_cm = CASE WHEN p_profile_updates ? 'height_cm' THEN (p_profile_updates->>'height_cm')::SMALLINT ELSE member.height_cm END,
      top_size = CASE WHEN p_profile_updates ? 'top_size' THEN p_profile_updates->>'top_size' ELSE member.top_size END,
      bottom_size = CASE WHEN p_profile_updates ? 'bottom_size' THEN p_profile_updates->>'bottom_size' ELSE member.bottom_size END,
      shoe_size = CASE WHEN p_profile_updates ? 'shoe_size' THEN p_profile_updates->>'shoe_size' ELSE member.shoe_size END,
      wardrobe_notes = CASE WHEN p_profile_updates ? 'wardrobe_notes' THEN p_profile_updates->>'wardrobe_notes' ELSE member.wardrobe_notes END,
      profile_image_url = CASE WHEN p_profile_updates ? 'profile_image_url' THEN p_profile_updates->>'profile_image_url' ELSE member.profile_image_url END,
      public_bio = CASE WHEN p_profile_updates ? 'public_bio' THEN p_profile_updates->>'public_bio' ELSE member.public_bio END,
      is_public = CASE WHEN p_profile_updates ? 'is_public' THEN (p_profile_updates->>'is_public')::BOOLEAN ELSE member.is_public END,
      specialties = CASE
        WHEN p_profile_updates ? 'specialties' AND jsonb_typeof(p_profile_updates->'specialties') = 'null' THEN NULL
        WHEN p_profile_updates ? 'specialties' THEN ARRAY(
          SELECT jsonb_array_elements_text(p_profile_updates->'specialties')
        )
        ELSE member.specialties
      END
  WHERE member.id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_payout_updates IS NOT NULL THEN
    IF jsonb_typeof(p_payout_updates) <> 'object' THEN
      RAISE EXCEPTION 'p_payout_updates must be a JSON object' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.crew_member_payout_accounts AS payout (
      crew_member_id, bank_code, bank_name, bank_account, bank_holder, updated_at
    ) VALUES (
      p_member_id,
      p_payout_updates->>'bank_code',
      p_payout_updates->>'bank_name',
      p_payout_updates->>'bank_account',
      p_payout_updates->>'bank_holder',
      now()
    )
    ON CONFLICT (crew_member_id) DO UPDATE SET
      bank_code = CASE
        WHEN p_payout_updates ? 'bank_code' THEN EXCLUDED.bank_code
        ELSE payout.bank_code
      END,
      bank_name = CASE
        WHEN p_payout_updates ? 'bank_name' THEN EXCLUDED.bank_name
        ELSE payout.bank_name
      END,
      bank_account = CASE
        WHEN p_payout_updates ? 'bank_account' THEN EXCLUDED.bank_account
        ELSE payout.bank_account
      END,
      bank_holder = CASE
        WHEN p_payout_updates ? 'bank_holder' THEN EXCLUDED.bank_holder
        ELSE payout.bank_holder
      END,
      updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.service_update_member_profile_and_payout(UUID, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_update_member_profile_and_payout(UUID, JSONB, JSONB)
  TO service_role;

COMMIT;
