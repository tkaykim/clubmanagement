-- 015_push_subscriptions.sql
-- Web Push 구독 정보 저장 테이블

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- 본인 구독만 select / insert / update / delete 가능
drop policy if exists "own subscriptions" on public.push_subscriptions;
create policy "own subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- service_role은 RLS 우회. 별도 정책 불필요.

comment on table public.push_subscriptions is 'PWA Web Push 구독 endpoint 저장';
