-- 프로젝트 최대 참여 인원 컬럼 추가
ALTER TABLE public.projects ADD COLUMN max_participants INTEGER DEFAULT NULL;
COMMENT ON COLUMN public.projects.max_participants IS '최대 참여 인원. NULL이면 제한 없음';
