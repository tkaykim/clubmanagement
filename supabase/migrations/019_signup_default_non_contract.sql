-- 019_signup_default_non_contract.sql
-- 회원가입 시 기본 contract_type 을 'non_contract' (일반멤버) 로 변경.
-- 컬럼 DEFAULT 와 auto-create 트리거 둘 다 갱신.

ALTER TABLE public.crew_members
  ALTER COLUMN contract_type SET DEFAULT 'non_contract';

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
    VALUES (NEW.id, v_name, NEW.email, 'member', 'non_contract', false);
  END IF;

  RETURN NEW;
END;
$$;
