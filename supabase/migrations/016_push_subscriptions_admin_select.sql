-- 016_push_subscriptions_admin_select.sql
-- admin/owner가 모든 push_subscriptions를 SELECT 할 수 있도록 정책 추가.
--
-- 이전 015 마이그레이션의 'own subscriptions' 정책(FOR ALL)은 본인 user_id 만
-- 허용하므로, /manage/push 페이지에서 구독자 수 표시와
-- /api/push/send 의 발송 대상 조회 모두 본인 1건만 반환되어
-- "전체 발송"이 본인에게만 가는 버그가 있었음.
--
-- INSERT/UPDATE/DELETE 는 여전히 본인 row만 가능 (own subscriptions 정책 유지).

drop policy if exists "admins read all subscriptions" on public.push_subscriptions;
create policy "admins read all subscriptions"
  on public.push_subscriptions
  for select
  using (
    exists (
      select 1 from public.crew_members
      where crew_members.user_id = auth.uid()
        and crew_members.role in ('admin', 'owner')
    )
  );
