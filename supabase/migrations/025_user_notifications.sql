-- user_notifications: in-app inbox for push fallback + general user-targeted notifications.
-- 푸시 구독이 없거나 권한 미허용인 사용자에게도 알림 도달 보장.

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text,
  url text,
  tag text,
  target_type text,
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id, read_at, created_at desc);
create index if not exists user_notifications_target_idx
  on public.user_notifications (target_type, target_id);

alter table public.user_notifications enable row level security;

drop policy if exists "own_select" on public.user_notifications;
create policy "own_select" on public.user_notifications
  for select using (auth.uid() = user_id);

drop policy if exists "own_update" on public.user_notifications;
create policy "own_update" on public.user_notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- INSERT: no policy → blocked for anon/authenticated. service_role bypasses RLS for server-side writes.
