-- 024_security_advisor_fixes.sql
-- Supabase database linter advisor가 잡은 ERROR/WARN 정리.
--
-- 처리 항목:
--   1) public.projects_with_range 뷰 → security_invoker=true (ERROR 0010)
--   2) link_guest_applications, sync_club_display_name, set_default_category_major
--      함수의 search_path 고정 (WARN 0011)
--   3) link_guest_applications anon EXECUTE 회수 (WARN 0028, anon이 직접 호출할 일 없음)
--   4) WITH CHECK (true) 공개 INSERT 정책에 의도 주석 (WARN 0024)
--
-- 의도적으로 처리하지 않는 advisor 경고:
--   - is_admin_or_owner / is_owner / current_user_is_*  : RLS 정책 표현식 안에서 호출되므로
--     호출자(anon/authenticated)에게 EXECUTE가 있어야 정책 평가가 동작.
--     anon이 호출 가능하다는 advisor WARN은 RLS 평가에 필요한 의도된 노출.
--   - get_project_application_count / get_project_application_counts : 의도된 공개 RPC.
--   - handle_new_auth_user / handle_new_user : 트리거 함수, REST 노출은 의도되지 않음이지만
--     이미 search_path가 설정되어 있고 EXECUTE 회수는 Auth 트리거 동작 영향 검증 필요 → 후속.
--   - Auth leaked-password protection : Supabase Studio 설정으로 처리 (마이그레이션 불가).

BEGIN;

-- ============================================================
-- 1) projects_with_range 뷰 → security_invoker
-- ============================================================
-- Postgres 15+ / Supabase 기본 환경에서 지원되는 뷰 옵션.
-- 기존 정의를 그대로 두고 옵션만 변경.
ALTER VIEW public.projects_with_range SET (security_invoker = true);

-- ============================================================
-- 2) 함수 search_path 고정
-- ============================================================
-- link_guest_applications: 본문이 `public.project_applications` 절대 참조라 안전.
ALTER FUNCTION public.link_guest_applications(uuid, text, text)
  SET search_path = '';

-- sync_club_display_name: 본문이 NEW 컬럼만 참조 (스키마 의존 없음).
ALTER FUNCTION public.sync_club_display_name()
  SET search_path = '';

-- set_default_category_major: 본문이 `public.category_major` 절대 참조라 안전.
ALTER FUNCTION public.set_default_category_major()
  SET search_path = '';

-- ============================================================
-- 3) link_guest_applications anon EXECUTE 회수
-- ============================================================
-- 이 함수는 회원가입 직후 인증된 클라이언트에서 RPC로 호출되어 게스트 지원을 본인 계정에
-- 연결한다. anon이 호출할 시나리오는 없다.
REVOKE EXECUTE ON FUNCTION public.link_guest_applications(uuid, text, text) FROM anon;

-- ============================================================
-- 4) 공개 INSERT 정책 의도 주석
-- ============================================================
-- WITH CHECK (true)는 advisor WARN 0024에 잡히지만 두 정책 모두 공개 폼(섭외 문의 / 게스트
-- 지원) 의도된 노출. honeypot 필드와 클라이언트 쿨다운, 서버 Zod 검증으로 남용을 막는다.
COMMENT ON POLICY "portfolio_inquiries_anyone_insert" ON public.portfolio_inquiries IS
  '의도된 공개 INSERT. 섭외 문의 폼은 비로그인 사용자도 제출 가능. honeypot + 서버 Zod 검증으로 남용 방지.';

COMMENT ON POLICY "applications_anyone_insert" ON public.project_applications IS
  '의도된 공개 INSERT. 게스트 지원 링크는 비로그인 사용자도 제출 가능. user_id IS NULL + guest_name/guest_phone 제출, 추후 link_guest_applications()로 본인 계정에 연결.';

COMMIT;
