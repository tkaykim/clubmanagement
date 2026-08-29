-- OneShot Crew — 버그 제보 댓글 권한·인덱스 보강

BEGIN;

REVOKE ALL ON TABLE public.bug_report_comments FROM anon;
GRANT SELECT ON TABLE public.bug_report_comments TO authenticated;

CREATE INDEX idx_bug_report_comments_author_id
  ON public.bug_report_comments(author_id);

COMMIT;
