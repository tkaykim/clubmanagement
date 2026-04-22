-- =============================================================
-- 010_auto_crew_member_on_signup.sql
-- auth.users 신규 유저 생성 시 public.users + public.crew_members 자동 생성.
--
-- 기존 동작: signup API 가 public.users 만 upsert. crew_members 는 생성 안 됨.
--           → 신규 회원은 로그인해도 crew_members 가 없어 ActiveGuard 에서
--              영구 승인 대기 상태. 관리자가 수동으로 /api/members POST 해야 함.
--
-- 개선: auth.users AFTER INSERT 트리거로 두 레코드 동시 생성.
--       crew_members 는 is_active=false 로 생성 → 관리자 승인 대기.
--
-- 추가: auth.users 에 있으나 crew_members 에 없는 기존 유저 일괄 백필.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    '익명'
  );

  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, v_name)
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.crew_members WHERE user_id = NEW.id) THEN
    INSERT INTO public.crew_members (user_id, name, email, role, contract_type, is_active)
    VALUES (NEW.id, v_name, NEW.email, 'member', 'contract', false);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 백필: auth.users 에 있으나 crew_members 가 없는 유저
INSERT INTO public.crew_members (user_id, name, email, role, contract_type, is_active)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), '익명'),
  au.email,
  'member',
  'contract',
  false
FROM auth.users au
LEFT JOIN public.crew_members cm ON cm.user_id = au.id
WHERE cm.id IS NULL;

COMMIT;
