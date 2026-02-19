-- 동아리 공식 인스타그램 URL
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS instagram_url TEXT;
COMMENT ON COLUMN public.clubs.instagram_url IS '공식 인스타그램 URL 또는 @핸들';
