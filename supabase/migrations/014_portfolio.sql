-- =============================================================
-- 014_portfolio.sql
-- ONESHOT 크루 포트폴리오 + 섭외 문의 기능
--
-- 신규 테이블 4개:
--   portfolio_sections   — 페이지 섹션 키/값 설정
--   portfolio_media      — 사진·영상 통합 미디어
--   portfolio_media_members — 미디어-멤버 M:N 태깅
--   portfolio_careers    — 팀 경력 타임라인
--   portfolio_inquiries  — 섭외 문의
--
-- 기존 테이블 ALTER:
--   crew_members         — 공개 프로필 컬럼 4개 추가
--
-- Storage:
--   portfolio 버킷 생성 (public read)
--
-- 권한:
--   is_admin_or_owner() 헬퍼는 009 마이그레이션에서 정의됨 — 재사용
-- =============================================================

BEGIN;

-- ============================================================
-- 0. updated_at 트리거 함수 (001에서 이미 생성된 경우 덮어쓰기 안전)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. portfolio_sections — 페이지 상단 소개 콘텐츠 (key/value)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.portfolio_sections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE
              CHECK (key IN (
                'hero_title', 'hero_subtitle', 'about_team',
                'genres', 'contact_email', 'contact_phone'
              )),
  value       TEXT        NOT NULL DEFAULT '',
  updated_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_sections_key ON public.portfolio_sections(key);

-- ============================================================
-- 2. portfolio_media — 대표/갤러리/공연·커버 영상 통합
-- ============================================================

CREATE TABLE IF NOT EXISTS public.portfolio_media (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT        NOT NULL
                CHECK (kind IN (
                  'hero_image', 'hero_video', 'photo',
                  'performance', 'cover', 'other_video'
                )),
  title         TEXT,
  description   TEXT,
  image_url     TEXT,
  youtube_url   TEXT,
  thumbnail_url TEXT,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  is_featured   BOOLEAN     NOT NULL DEFAULT false,
  event_date    DATE,
  venue         TEXT,
  created_by    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_media_kind       ON public.portfolio_media(kind);
CREATE INDEX IF NOT EXISTS idx_portfolio_media_is_featured ON public.portfolio_media(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_portfolio_media_sort_order ON public.portfolio_media(sort_order);
CREATE INDEX IF NOT EXISTS idx_portfolio_media_event_date ON public.portfolio_media(event_date DESC);

DROP TRIGGER IF EXISTS trg_portfolio_media_updated_at ON public.portfolio_media;
CREATE TRIGGER trg_portfolio_media_updated_at
  BEFORE UPDATE ON public.portfolio_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3. portfolio_media_members — 영상별 참여 멤버 태깅 (M:N)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.portfolio_media_members (
  media_id        UUID    NOT NULL REFERENCES public.portfolio_media(id)  ON DELETE CASCADE,
  crew_member_id  UUID    NOT NULL REFERENCES public.crew_members(id)     ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (media_id, crew_member_id)
);

CREATE INDEX IF NOT EXISTS idx_pmm_crew_member ON public.portfolio_media_members(crew_member_id);

-- ============================================================
-- 4. portfolio_careers — 팀 경력 타임라인
-- ============================================================

CREATE TABLE IF NOT EXISTS public.portfolio_careers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  category    TEXT
              CHECK (category IN (
                'performance', 'broadcast', 'commercial',
                'competition', 'workshop'
              )),
  event_date  DATE,
  location    TEXT,
  description TEXT,
  link_url    TEXT,
  media_id    UUID        REFERENCES public.portfolio_media(id) ON DELETE SET NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_careers_category   ON public.portfolio_careers(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_careers_event_date ON public.portfolio_careers(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_careers_sort_order ON public.portfolio_careers(sort_order);

DROP TRIGGER IF EXISTS trg_portfolio_careers_updated_at ON public.portfolio_careers;
CREATE TRIGGER trg_portfolio_careers_updated_at
  BEFORE UPDATE ON public.portfolio_careers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 5. portfolio_inquiries — 섭외 문의
-- ============================================================

CREATE TABLE IF NOT EXISTS public.portfolio_inquiries (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type           TEXT        NOT NULL
                        CHECK (target_type IN ('team', 'member')),
  target_member_id      UUID        REFERENCES public.crew_members(id) ON DELETE SET NULL,
  reference_media_id    UUID        REFERENCES public.portfolio_media(id) ON DELETE SET NULL,
  inquiry_type          TEXT        NOT NULL
                        CHECK (inquiry_type IN (
                          'performance', 'broadcast', 'commercial', 'workshop', 'other'
                        )),
  requester_name        TEXT        NOT NULL,
  requester_organization TEXT,
  requester_email       TEXT        NOT NULL,
  requester_phone       TEXT,
  region                TEXT,
  event_date_start      DATE,
  event_date_end        DATE,
  event_time            TEXT,
  budget_type           TEXT        NOT NULL DEFAULT 'tbd'
                        CHECK (budget_type IN ('fixed', 'range', 'tbd')),
  budget_amount         INTEGER,
  budget_min            INTEGER,
  budget_max            INTEGER,
  message               TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'in_review', 'contacted', 'closed')),
  admin_memo            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_inquiries_status       ON public.portfolio_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_inquiries_created_at   ON public.portfolio_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_inquiries_target_member ON public.portfolio_inquiries(target_member_id) WHERE target_member_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_portfolio_inquiries_updated_at ON public.portfolio_inquiries;
CREATE TRIGGER trg_portfolio_inquiries_updated_at
  BEFORE UPDATE ON public.portfolio_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. crew_members ALTER — 공개 프로필 컬럼 추가
-- ============================================================

ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_public         BOOLEAN  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_bio        TEXT,
  ADD COLUMN IF NOT EXISTS specialties       TEXT[];

CREATE INDEX IF NOT EXISTS idx_crew_members_is_public
  ON public.crew_members(is_public, is_active)
  WHERE is_public = true AND is_active = true;

-- ============================================================
-- 7. RLS — 테이블 활성화
-- ============================================================

ALTER TABLE public.portfolio_sections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_media         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_media_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_careers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_inquiries     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. RLS 정책 — portfolio_sections
--    SELECT: anon + authenticated 모두 허용 (공개 페이지용)
--    CUD:    admin/owner 전용
-- ============================================================

DROP POLICY IF EXISTS "portfolio_sections_public_select" ON public.portfolio_sections;
CREATE POLICY "portfolio_sections_public_select" ON public.portfolio_sections
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "portfolio_sections_admin_insert" ON public.portfolio_sections;
CREATE POLICY "portfolio_sections_admin_insert" ON public.portfolio_sections
  FOR INSERT
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "portfolio_sections_admin_update" ON public.portfolio_sections;
CREATE POLICY "portfolio_sections_admin_update" ON public.portfolio_sections
  FOR UPDATE
  USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "portfolio_sections_admin_delete" ON public.portfolio_sections;
CREATE POLICY "portfolio_sections_admin_delete" ON public.portfolio_sections
  FOR DELETE
  USING (public.is_admin_or_owner(auth.uid()));

-- ============================================================
-- 9. RLS 정책 — portfolio_media
-- ============================================================

DROP POLICY IF EXISTS "portfolio_media_public_select" ON public.portfolio_media;
CREATE POLICY "portfolio_media_public_select" ON public.portfolio_media
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "portfolio_media_admin_insert" ON public.portfolio_media;
CREATE POLICY "portfolio_media_admin_insert" ON public.portfolio_media
  FOR INSERT
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "portfolio_media_admin_update" ON public.portfolio_media;
CREATE POLICY "portfolio_media_admin_update" ON public.portfolio_media
  FOR UPDATE
  USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "portfolio_media_admin_delete" ON public.portfolio_media;
CREATE POLICY "portfolio_media_admin_delete" ON public.portfolio_media
  FOR DELETE
  USING (public.is_admin_or_owner(auth.uid()));

-- ============================================================
-- 10. RLS 정책 — portfolio_media_members
-- ============================================================

DROP POLICY IF EXISTS "portfolio_media_members_public_select" ON public.portfolio_media_members;
CREATE POLICY "portfolio_media_members_public_select" ON public.portfolio_media_members
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "portfolio_media_members_admin_insert" ON public.portfolio_media_members;
CREATE POLICY "portfolio_media_members_admin_insert" ON public.portfolio_media_members
  FOR INSERT
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "portfolio_media_members_admin_update" ON public.portfolio_media_members;
CREATE POLICY "portfolio_media_members_admin_update" ON public.portfolio_media_members
  FOR UPDATE
  USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "portfolio_media_members_admin_delete" ON public.portfolio_media_members;
CREATE POLICY "portfolio_media_members_admin_delete" ON public.portfolio_media_members
  FOR DELETE
  USING (public.is_admin_or_owner(auth.uid()));

-- ============================================================
-- 11. RLS 정책 — portfolio_careers
-- ============================================================

DROP POLICY IF EXISTS "portfolio_careers_public_select" ON public.portfolio_careers;
CREATE POLICY "portfolio_careers_public_select" ON public.portfolio_careers
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "portfolio_careers_admin_insert" ON public.portfolio_careers;
CREATE POLICY "portfolio_careers_admin_insert" ON public.portfolio_careers
  FOR INSERT
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "portfolio_careers_admin_update" ON public.portfolio_careers;
CREATE POLICY "portfolio_careers_admin_update" ON public.portfolio_careers
  FOR UPDATE
  USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "portfolio_careers_admin_delete" ON public.portfolio_careers;
CREATE POLICY "portfolio_careers_admin_delete" ON public.portfolio_careers
  FOR DELETE
  USING (public.is_admin_or_owner(auth.uid()));

-- ============================================================
-- 12. RLS 정책 — portfolio_inquiries
--    INSERT: anon + authenticated 모두 허용 (비로그인 문의 폼용)
--    SELECT/UPDATE/DELETE: admin/owner 전용 (PII 보호)
-- ============================================================

DROP POLICY IF EXISTS "portfolio_inquiries_anyone_insert" ON public.portfolio_inquiries;
CREATE POLICY "portfolio_inquiries_anyone_insert" ON public.portfolio_inquiries
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "portfolio_inquiries_admin_select" ON public.portfolio_inquiries;
CREATE POLICY "portfolio_inquiries_admin_select" ON public.portfolio_inquiries
  FOR SELECT
  USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "portfolio_inquiries_admin_update" ON public.portfolio_inquiries;
CREATE POLICY "portfolio_inquiries_admin_update" ON public.portfolio_inquiries
  FOR UPDATE
  USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "portfolio_inquiries_admin_delete" ON public.portfolio_inquiries;
CREATE POLICY "portfolio_inquiries_admin_delete" ON public.portfolio_inquiries
  FOR DELETE
  USING (public.is_admin_or_owner(auth.uid()));

-- ============================================================
-- 13. RLS 정책 — crew_members anon 공개 조회
--    기존 정책(009, 003)은 그대로 유지하고 anon용 정책만 추가.
--    공개 필드만 노출: 뷰(public_crew_members_view) 방식 대신
--    RLS 정책으로 행 수준 필터 + 컬럼 노출은 API 라우트에서 select 제한.
--    (Supabase RLS는 column-level security 미지원 — API에서 필드 선택 필수)
-- ============================================================

DROP POLICY IF EXISTS "crew_members_anon_public_select" ON public.crew_members;
CREATE POLICY "crew_members_anon_public_select" ON public.crew_members
  FOR SELECT
  TO anon
  USING (is_active = true AND is_public = true);

-- ============================================================
-- 14. 공개 멤버 뷰 — anon 및 포트폴리오 페이지에서 안전하게 조회
--    민감 컬럼(email, phone)을 뷰에서 제외.
--    API 라우트 및 서버 컴포넌트에서 이 뷰를 SELECT 하거나
--    테이블 직접 쿼리 시 반드시 공개 컬럼만 select할 것.
-- ============================================================

-- security_invoker=true 로 뷰가 querying 유저의 권한/RLS를 따르도록 강제.
-- (기본값이 SECURITY DEFINER 로 생성되어 Supabase 린터가 경고함)
DROP VIEW IF EXISTS public.public_crew_members_view;
CREATE VIEW public.public_crew_members_view
  WITH (security_invoker = true)
AS
  SELECT
    id,
    stage_name,
    name,
    position,
    profile_image_url,
    public_bio,
    specialties,
    is_public,
    is_active,
    joined_month
  FROM public.crew_members
  WHERE is_active = true AND is_public = true;

GRANT SELECT ON public.public_crew_members_view TO anon, authenticated;

-- ============================================================
-- 15. Storage — portfolio 버킷 생성 (멱등)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio',
  'portfolio',
  true,        -- public read
  52428800,    -- 50 MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/avif', 'video/mp4', 'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage 정책: public=true 버킷은 URL 접근에 SELECT 정책이 필요 없음.
-- SELECT 정책을 두면 LIST API로 파일 열거가 가능해지는 부작용(Supabase 린터 경고 0025)이 있어 SELECT 정책은 두지 않는다.
-- 업로드/수정/삭제는 admin/owner만 — signed upload URL 경유
DROP POLICY IF EXISTS "portfolio_storage_public_select" ON storage.objects;

DROP POLICY IF EXISTS "portfolio_storage_admin_insert" ON storage.objects;
CREATE POLICY "portfolio_storage_admin_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio'
    AND public.is_admin_or_owner(auth.uid())
  );

DROP POLICY IF EXISTS "portfolio_storage_admin_update" ON storage.objects;
CREATE POLICY "portfolio_storage_admin_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'portfolio'
    AND public.is_admin_or_owner(auth.uid())
  );

DROP POLICY IF EXISTS "portfolio_storage_admin_delete" ON storage.objects;
CREATE POLICY "portfolio_storage_admin_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'portfolio'
    AND public.is_admin_or_owner(auth.uid())
  );

-- ============================================================
-- 16. 개발 시드 — portfolio_sections 기본 키 삽입
--    실제 운영 전 관리자가 /manage/portfolio 에서 값을 채운다.
-- ============================================================

INSERT INTO public.portfolio_sections (key, value) VALUES
  ('hero_title',    'ONESHOT 크루'),
  ('hero_subtitle', '춤으로 하나가 되는 곳'),
  ('about_team',    'ONESHOT은 2010년 창단된 댄스 크루입니다. K-pop, 현대무용, 한국무용 등 다양한 장르를 아우르는 전문 댄서들로 구성되어 있습니다.'),
  ('genres',        'K-pop,한국무용,현대무용,댄스스포츠,창작안무'),
  ('contact_email', ''),
  ('contact_phone', '')
ON CONFLICT (key) DO NOTHING;

COMMIT;
