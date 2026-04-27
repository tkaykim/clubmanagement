-- 017_activity_logs.sql
-- 활동 로그 — 프로젝트 생성/수정/삭제, 지원, 푸시 발송 등 추적
-- admin/owner만 조회 가능. 사용자 본인 행동 INSERT 가능.
-- UPDATE/DELETE는 정책 없음 = 거부 (service_role만 직접 DB로 가능 → 개발자 전용)

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_name text,
  action text not null,           -- 'project.create', 'project.update', 'project.delete', 'project.status_change', 'application.create', 'push.send', ...
  target_type text,               -- 'project', 'application', 'push', ...
  target_id uuid,
  target_label text,              -- human-readable label (snapshot)
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_at_idx
  on public.activity_logs (created_at desc);
create index if not exists activity_logs_actor_idx
  on public.activity_logs (actor_user_id);
create index if not exists activity_logs_target_idx
  on public.activity_logs (target_type, target_id);
create index if not exists activity_logs_action_idx
  on public.activity_logs (action);

alter table public.activity_logs enable row level security;

drop policy if exists "admin select activity logs" on public.activity_logs;
create policy "admin select activity logs"
  on public.activity_logs
  for select
  using (
    exists (
      select 1 from public.crew_members
      where crew_members.user_id = auth.uid()
        and crew_members.role in ('admin', 'owner')
    )
  );

drop policy if exists "auth insert activity logs" on public.activity_logs;
create policy "auth insert activity logs"
  on public.activity_logs
  for insert
  with check (
    auth.uid() is not null
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

drop policy if exists "guest insert activity logs" on public.activity_logs;
create policy "guest insert activity logs"
  on public.activity_logs
  for insert
  with check (
    auth.uid() is null
    and actor_user_id is null
  );

comment on table public.activity_logs is '활동 로그 — admin 조회 전용, 사용자 INSERT, 직접 DB 외 UPDATE/DELETE 불가';
