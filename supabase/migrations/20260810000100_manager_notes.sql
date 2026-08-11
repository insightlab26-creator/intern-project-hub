begin;
create type public.manager_note_type as enum ('GENERAL','FEEDBACK','RISK','FOLLOW_UP');
create type public.manager_note_status as enum ('OPEN','RESOLVED','ARCHIVED');
create table public.manager_notes(
 id uuid primary key default gen_random_uuid(),
 project_id uuid references public.projects(id) on delete restrict,
 intern_id uuid references public.interns(id) on delete restrict,
 task_id uuid references public.tasks(id) on delete restrict,
 subject text not null,
 content text not null,
 note_type public.manager_note_type not null default 'GENERAL',
 status public.manager_note_status not null default 'OPEN',
 follow_up_on date,
 resolved_on date,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 created_by uuid references public.profiles(id) on delete set null,
 updated_by uuid references public.profiles(id) on delete set null,
 constraint manager_notes_target_required check(project_id is not null or intern_id is not null or task_id is not null),
 constraint manager_notes_subject_not_blank check(length(trim(subject))>0),
 constraint manager_notes_content_not_blank check(length(trim(content))>0),
 constraint manager_notes_resolution_required check(status<>'RESOLVED' or resolved_on is not null)
);
create index idx_manager_notes_project_status on public.manager_notes(project_id,status);
create index idx_manager_notes_intern_status on public.manager_notes(intern_id,status);
create index idx_manager_notes_follow_up on public.manager_notes(follow_up_on) where status='OPEN';
create function public.validate_manager_note_relationships()returns trigger language plpgsql set search_path=public as $$ begin
 if new.task_id is not null and new.project_id is not null and not exists(select 1 from public.tasks where id=new.task_id and project_id=new.project_id)then raise exception 'Manager Note의 Task는 선택한 Project에 속해야 합니다.';end if;
 return new;end;$$;
create trigger validate_manager_note_relationships before insert or update on public.manager_notes for each row execute procedure public.validate_manager_note_relationships();
create trigger set_manager_notes_updated_at before update on public.manager_notes for each row execute procedure public.set_updated_at();
grant select,insert,update on public.manager_notes to authenticated;
alter table public.manager_notes enable row level security;
create policy manager_notes_admin_all on public.manager_notes for all to authenticated using((select public.is_admin())) with check((select public.is_admin()) and updated_by=(select auth.uid()));
commit;
