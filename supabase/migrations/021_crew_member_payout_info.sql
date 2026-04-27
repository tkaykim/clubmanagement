-- 021_crew_member_payout_info.sql
-- 멤버 정산 계좌 정보 (은행/계좌/예금주)
-- 정산 처리 시 admin이 활용. 본인 + admin/owner 만 SELECT/UPDATE.

ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS bank_code TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS bank_holder TEXT;

COMMENT ON COLUMN public.crew_members.bank_code IS '은행 코드 (KFTC 표준 3자리)';
COMMENT ON COLUMN public.crew_members.bank_name IS '은행명 (한글)';
COMMENT ON COLUMN public.crew_members.bank_account IS '계좌번호';
COMMENT ON COLUMN public.crew_members.bank_holder IS '예금주명';
