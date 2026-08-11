begin;
create type public.decision_status as enum ('PROPOSED', 'DECIDED', 'SUPERSEDED', 'ARCHIVED');
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  task_id uuid references public.tasks(id) on delete restrict,
  supersedes_decision_id uuid references public.decisions(id) on delete restrict,
  title text not null,
  context text not null default '',
  alternatives text not null default '',
  decision text not null,
  impact text not null default '',
  follow_up_actions text not null default '',
  status public.decision_status not null default 'PROPOSED',
  decided_on date,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint decisions_title_not_blank check(length(trim(title))>0),
  constraint decisions_content_not_blank check(length(trim(decision))>0),
  constraint decisions_not_self_superseding check(supersedes_decision_id is null or supersedes_decision_id<>id),
  constraint decisions_decided_fields check(status<>'DECIDED' or (decided_on is not null and decided_by is not null))
);
create index idx_decisions_project_status on public.decisions(project_id,status);
create index idx_decisions_task on public.decisions(task_id) where task_id is not null;
create index idx_decisions_decided_on on public.decisions(decided_on desc);

create function public.validate_decision_relationships() returns trigger language plpgsql set search_path=public as $$
begin
 if new.task_id is not null and not exists(select 1 from public.tasks where id=new.task_id and project_id=new.project_id) then raise exception 'Decision의 Task는 같은 Project에 속해야 합니다.'; end if;
 if new.supersedes_decision_id is not null and not exists(select 1 from public.decisions where id=new.supersedes_decision_id and project_id=new.project_id) then raise exception '대체할 Decision은 같은 Project에 속해야 합니다.'; end if;
 return new;
end; $$;
create trigger validate_decision_relationships before insert or update on public.decisions for each row execute procedure public.validate_decision_relationships();
create trigger set_decisions_updated_at before update on public.decisions for each row execute procedure public.set_updated_at();
grant select,insert,update on public.decisions to authenticated;
alter table public.decisions enable row level security;
create policy decisions_admin_all on public.decisions for all to authenticated using((select public.is_admin())) with check((select public.is_admin()) and updated_by=(select auth.uid()));
commit;
