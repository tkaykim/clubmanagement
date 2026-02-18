-- 동아리 게시판 + 광장(익명) 게시판

CREATE TABLE public.club_board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_club_board_posts_club ON public.club_board_posts(club_id);
CREATE INDEX idx_club_board_posts_created ON public.club_board_posts(created_at DESC);

ALTER TABLE public.club_board_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_board_posts_read_member" ON public.club_board_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = club_board_posts.club_id AND m.user_id = auth.uid() AND m.status = 'approved')
);
CREATE POLICY "club_board_posts_insert_member" ON public.club_board_posts FOR INSERT WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = club_board_posts.club_id AND m.user_id = auth.uid() AND m.status = 'approved')
);
CREATE POLICY "club_board_posts_update_author" ON public.club_board_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "club_board_posts_delete_author_or_admin" ON public.club_board_posts FOR DELETE USING (
  auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = club_board_posts.club_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin'))
);

-- 광장: 익명 게시판 (누구나 읽기/쓰기)
CREATE TABLE public.plaza_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plaza_posts_created ON public.plaza_posts(created_at DESC);

ALTER TABLE public.plaza_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plaza_posts_read_all" ON public.plaza_posts FOR SELECT USING (true);
CREATE POLICY "plaza_posts_insert_anon" ON public.plaza_posts FOR INSERT WITH CHECK (true);
