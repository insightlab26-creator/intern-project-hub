begin;

alter type public.project_status add value if not exists 'REVIEW';
alter type public.project_status add value if not exists 'REVISION';
alter type public.project_status add value if not exists 'DROPPED';

create type public.project_type as enum ('EXPLORE', 'BUILD');
create type public.review_gate_result as enum ('REVISE', 'KEEP', 'ASSET', 'DROP');
create type public.review_gate_target as enum ('PROJECT', 'DELIVERABLE');

alter table public.projects
  add column project_type public.project_type not null default 'EXPLORE',
  add column purpose text not null default '',
  add column background text not null default '',
  add column expected_outcome text not null default '',
  add column field text not null default '',
  add column current_stage text not null default '',
  add column next_review_date date,
  add column teams_folder_url text,
  add column keywords text[] not null default '{}',
  add column operator_id uuid references public.profiles(id) on delete set null;

alter table public.projects add constraint projects_teams_folder_url_http
  check (teams_folder_url is null or teams_folder_url ~* '^https?://');

alter table public.decisions
  add column change_before text not null default '',
  add column change_after text not null default '',
  add column reason text not null default '';

create table public.review_gates (
  id uuid primary key default gen_random_uuid(),
  target_type public.review_gate_target not null,
  project_id uuid references public.projects(id) on delete restrict,
  deliverable_id uuid references public.deliverables(id) on delete restrict,
  result public.review_gate_result not null,
  comments text not null default '',
  drop_reason text not null default '',
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint review_gates_target_check check (
    (target_type = 'PROJECT' and project_id is not null and deliverable_id is null)
    or (target_type = 'DELIVERABLE' and deliverable_id is not null and project_id is null)
  ),
  constraint review_gates_drop_reason_check check (result <> 'DROP' or length(trim(drop_reason)) > 0)
);

create index idx_projects_control_tower on public.projects(project_type, status, next_review_date);
create index idx_review_gates_project on public.review_gates(project_id, reviewed_at desc) where project_id is not null;
create index idx_review_gates_deliverable on public.review_gates(deliverable_id, reviewed_at desc) where deliverable_id is not null;

grant select, insert on public.review_gates to authenticated;
alter table public.review_gates enable row level security;
create policy review_gates_admin_select on public.review_gates for select to authenticated using ((select public.is_admin()));
create policy review_gates_admin_insert on public.review_gates for insert to authenticated with check ((select public.is_admin()) and reviewed_by = (select auth.uid()));

commit;
