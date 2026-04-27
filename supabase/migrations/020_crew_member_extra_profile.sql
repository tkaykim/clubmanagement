-- 020_crew_member_extra_profile.sql
-- 마이페이지 프로필 확장 필드:
--   기본 (필수): gender, birth_date, youtube_url, instagram_handle
--   추가 (선택): height_cm, top_size, bottom_size, shoe_size, wardrobe_notes
--
-- name, phone 은 기존 컬럼 활용. NOT NULL 제약은 코드 레벨에서 검증.

ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS height_cm SMALLINT
    CHECK (height_cm IS NULL OR (height_cm > 50 AND height_cm < 250)),
  ADD COLUMN IF NOT EXISTS top_size TEXT,
  ADD COLUMN IF NOT EXISTS bottom_size TEXT,
  ADD COLUMN IF NOT EXISTS shoe_size TEXT,
  ADD COLUMN IF NOT EXISTS wardrobe_notes TEXT;

COMMENT ON COLUMN public.crew_members.gender IS 'male | female | other';
COMMENT ON COLUMN public.crew_members.instagram_handle IS '인스타그램 ID (@ 제외)';
COMMENT ON COLUMN public.crew_members.youtube_url IS '유튜브 채널/계정 URL';
COMMENT ON COLUMN public.crew_members.height_cm IS '키 (cm)';
