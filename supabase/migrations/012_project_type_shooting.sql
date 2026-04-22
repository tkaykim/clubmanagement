-- migrations/012_project_type_shooting.sql
-- OneShot Crew — projects.type CHECK 제약에 'shooting' (촬영) 추가
--
-- MCP 로 원격 DB 에 이미 적용됨 (2026-04-23).
-- 로컬/신규 환경에서 재현 가능하도록 파일로도 보관한다.

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_type_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_type_check
  CHECK (type = ANY (ARRAY['paid_gig'::text, 'practice'::text, 'audition'::text, 'workshop'::text, 'shooting'::text]));
