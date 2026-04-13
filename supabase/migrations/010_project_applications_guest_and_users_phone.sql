-- 1) users 테이블에 phone 컬럼 추가 (추후 매칭용)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;

-- 2) project_applications: user_id를 nullable로 변경
ALTER TABLE public.project_applications ALTER COLUMN user_id DROP NOT NULL;

-- 3) guest 정보 컬럼 추가
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- 4) guest 전용 partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_applications_guest_unique
  ON public.project_applications(project_id, guest_phone)
  WHERE user_id IS NULL AND guest_phone IS NOT NULL;

-- 5) check: user_id가 있거나 (guest_name + guest_phone)이 있어야 함
DO $$ BEGIN
  ALTER TABLE public.project_applications
    ADD CONSTRAINT chk_user_or_guest
    CHECK (user_id IS NOT NULL OR (guest_name IS NOT NULL AND guest_phone IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6) 수기 추가는 리더/관리자가 하므로 INSERT 정책 추가
CREATE POLICY "project_applications_insert_admin" ON public.project_applications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.members m ON m.club_id = p.club_id
        WHERE p.id = project_applications.project_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner', 'admin')
          AND m.status = 'approved'
      )
    )
  );
