-- 동아리 한글/영문 이름 (둘 중 하나 필수)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS name_ko TEXT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS name_en TEXT;

UPDATE public.clubs SET name_ko = name WHERE name_ko IS NULL AND name IS NOT NULL;

ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS clubs_name_required;
ALTER TABLE public.clubs ADD CONSTRAINT clubs_name_required
  CHECK (
    (name_ko IS NOT NULL AND trim(name_ko) <> '') OR
    (name_en IS NOT NULL AND trim(name_en) <> '')
  );

CREATE OR REPLACE FUNCTION public.sync_club_display_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := COALESCE(NULLIF(trim(NEW.name_ko), ''), NULLIF(trim(NEW.name_en), ''), COALESCE(NEW.name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_club_name_trigger ON public.clubs;
CREATE TRIGGER sync_club_name_trigger
  BEFORE INSERT OR UPDATE OF name_ko, name_en, name ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.sync_club_display_name();

UPDATE public.clubs SET name_ko = COALESCE(name_ko, name), name_en = name_en WHERE name IS NOT NULL;
