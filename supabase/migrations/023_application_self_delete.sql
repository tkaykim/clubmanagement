-- 본인이 대기·반려 상태 지원을 취소(삭제)할 수 있도록 DELETE RLS 추가
-- (API /api/projects/[id]/apply DELETE 가 인증 사용자 본인 행만 삭제)

DROP POLICY IF EXISTS applications_self_delete ON public.project_applications;
CREATE POLICY applications_self_delete
  ON public.project_applications
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('pending', 'rejected')
    AND public.current_user_is_active()
  );
