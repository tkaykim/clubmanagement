-- 프로젝트 포스터 이미지 URL 컬럼 추가
ALTER TABLE public.projects ADD COLUMN poster_url TEXT DEFAULT NULL;
COMMENT ON COLUMN public.projects.poster_url IS '프로젝트 포스터 이미지 URL';
