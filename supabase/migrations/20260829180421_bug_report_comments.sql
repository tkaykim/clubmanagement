-- OneShot Crew — 버그 제보 댓글

BEGIN;

CREATE TABLE public.bug_report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id UUID NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 100),
  author_kind TEXT NOT NULL CHECK (author_kind IN ('reporter', 'staff')),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bug_report_comments_report_created
  ON public.bug_report_comments(bug_report_id, created_at);

ALTER TABLE public.bug_report_comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.bug_report_comments TO authenticated;
GRANT ALL ON TABLE public.bug_report_comments TO service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.bug_report_comments FROM anon, authenticated;

CREATE POLICY "bug_report_comments_visible_to_participants"
  ON public.bug_report_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bug_reports report
      WHERE report.id = bug_report_id
        AND (
          report.reporter_id = (SELECT auth.uid())
          OR (SELECT public.current_user_is_active_admin())
        )
    )
  );

COMMIT;
