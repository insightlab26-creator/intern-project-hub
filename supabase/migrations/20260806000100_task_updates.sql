begin;

create type public.task_update_review_status as enum ('PENDING', 'APPROVED', 'CHANGES_REQUESTED');

create table public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  occurred_on date not null default current_date,
  progress text not null default '',
  learning text not null default '',
  blockers text not null default '',
  next_plan text not null default '',
  review_status public.task_update_review_status not null default 'PENDING',
  manager_feedback text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint task_updates_content_required check (
    length(trim(progress)) > 0 or length(trim(learning)) > 0 or
    length(trim(blockers)) > 0 or length(trim(next_plan)) > 0
  )
);

create index idx_task_updates_task_timeline
  on public.task_updates(task_id, occurred_on desc, created_at desc);
create index idx_task_updates_review_status
  on public.task_updates(review_status) where review_status = 'PENDING';

create trigger set_task_updates_updated_at before update on public.task_updates
for each row execute procedure public.set_updated_at();

create function public.protect_task_update_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.task_id is distinct from old.task_id
    or new.occurred_on is distinct from old.occurred_on
    or new.progress is distinct from old.progress
    or new.learning is distinct from old.learning
    or new.blockers is distinct from old.blockers
    or new.next_plan is distinct from old.next_plan
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by then
    raise exception 'Task 진행 기록 본문은 작성 후 변경할 수 없습니다.';
  end if;
  return new;
end;
$$;

create trigger protect_task_update_history before update on public.task_updates
for each row execute procedure public.protect_task_update_history();

grant select, insert, update on public.task_updates to authenticated;
alter table public.task_updates enable row level security;

create policy task_updates_admin_select on public.task_updates for select to authenticated
using ((select public.is_admin()));
create policy task_updates_admin_insert on public.task_updates for insert to authenticated
with check (
  (select public.is_admin())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);
create policy task_updates_admin_update on public.task_updates for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()) and updated_by = (select auth.uid()));

commit;
