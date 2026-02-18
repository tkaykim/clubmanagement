-- 관심사 마스터 + 유저 MBTI, user_interests, club_interests
CREATE TABLE IF NOT EXISTS public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mbti TEXT;

CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, interest_id)
);

CREATE TABLE IF NOT EXISTS public.club_interests (
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, interest_id)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON public.user_interests(interest_id);
CREATE INDEX IF NOT EXISTS idx_club_interests_club ON public.club_interests(club_id);
CREATE INDEX IF NOT EXISTS idx_club_interests_interest ON public.club_interests(interest_id);

ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interests_read_all" ON public.interests;
CREATE POLICY "interests_read_all" ON public.interests FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_interests_read_own" ON public.user_interests;
CREATE POLICY "user_interests_read_own" ON public.user_interests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_interests_insert_own" ON public.user_interests;
CREATE POLICY "user_interests_insert_own" ON public.user_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_interests_delete_own" ON public.user_interests;
CREATE POLICY "user_interests_delete_own" ON public.user_interests FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "club_interests_read_all" ON public.club_interests;
CREATE POLICY "club_interests_read_all" ON public.club_interests FOR SELECT USING (true);
DROP POLICY IF EXISTS "club_interests_insert_admin" ON public.club_interests;
CREATE POLICY "club_interests_insert_admin" ON public.club_interests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = club_interests.club_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin'))
);
DROP POLICY IF EXISTS "club_interests_delete_admin" ON public.club_interests;
CREATE POLICY "club_interests_delete_admin" ON public.club_interests FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = club_interests.club_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin'))
);
