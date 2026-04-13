-- 크루 멤버 테이블 (원샷크루 단일 동아리용)
CREATE TABLE public.crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crew_members_user_id ON public.crew_members(user_id);
CREATE INDEX idx_crew_members_role ON public.crew_members(role);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 멤버 목록 조회 가능
CREATE POLICY "crew_members_read_all" ON public.crew_members
  FOR SELECT USING (true);

-- 운영진(admin) 또는 대표(owner)만 멤버 추가 가능
CREATE POLICY "crew_members_insert_admin" ON public.crew_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- 운영진(admin) 또는 대표(owner)만 멤버 수정 가능
CREATE POLICY "crew_members_update_admin" ON public.crew_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- 운영진(admin) 또는 대표(owner)만 멤버 삭제 가능
CREATE POLICY "crew_members_delete_admin" ON public.crew_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- 초기 데이터: 김현준 운영진 등록
-- INSERT INTO public.crew_members (name, role) VALUES ('김현준', 'admin');
