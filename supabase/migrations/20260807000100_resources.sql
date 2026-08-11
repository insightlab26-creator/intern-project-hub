begin;

create type public.resource_type as enum ('DOCUMENT', 'LINK', 'REFERENCE', 'TEMPLATE');
create type public.resource_status as enum ('ACTIVE', 'ARCHIVED');

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  task_id uuid references public.tasks(id) on delete restrict,
  title text not null,
  description text not null default '',
  resource_type public.resource_type not null default 'DOCUMENT',
  status public.resource_status not null default 'ACTIVE',
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint resources_title_not_blank check (length(trim(title)) > 0),
  constraint resources_url_not_blank check (length(trim(url)) > 0),
  constraint resources_url_http check (url ~* '^https?://')
);

create index idx_resources_project_status on public.resources(project_id, status);
create index idx_resources_task on public.resources(task_id) where task_id is not null;
create index idx_resources_updated_at on public.resources(updated_at desc);

create function public.validate_resource_task_project()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.task_id is not null and not exists (
    select 1 from public.tasks t where t.id = new.task_id and t.project_id = new.project_id
  ) then
    raise exception 'Resource의 Task는 같은 Project에 속해야 합니다.';
  end if;
  return new;
end;
$$;

create trigger validate_resource_task_project before insert or update on public.resources
for each row execute procedure public.validate_resource_task_project();
create trigger set_resources_updated_at before update on public.resources
for each row execute procedure public.set_updated_at();

grant select, insert, update on public.resources to authenticated;
alter table public.resources enable row level security;
create policy resources_admin_all on public.resources for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()) and updated_by = (select auth.uid()));

commit;
