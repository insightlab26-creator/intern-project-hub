begin;

create type public.program_status as enum ('PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
create type public.enrollment_status as enum ('PLANNED', 'ACTIVE', 'COMPLETED');
create type public.project_member_role as enum ('OWNER', 'MEMBER');
create type public.membership_status as enum ('ACTIVE', 'INACTIVE');

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  status public.program_status not null default 'PLANNING',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint programs_code_not_blank check (length(trim(code)) > 0),
  constraint programs_name_not_blank check (length(trim(name)) > 0),
  constraint programs_date_order check (start_date is null or end_date is null or start_date <= end_date)
);

create table public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  intern_id uuid not null references public.interns(id) on delete restrict,
  status public.enrollment_status not null default 'PLANNED',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint program_enrollments_unique unique (program_id, intern_id),
  constraint program_enrollments_date_order check (start_date is null or end_date is null or start_date <= end_date)
);

create table public.program_projects (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  status public.membership_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint program_projects_unique unique (program_id, project_id)
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  intern_id uuid not null references public.interns(id) on delete restrict,
  role public.project_member_role not null default 'MEMBER',
  status public.membership_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint project_members_unique unique (project_id, intern_id)
);

create index idx_programs_status on public.programs(status);
create index idx_program_enrollments_program on public.program_enrollments(program_id);
create index idx_program_enrollments_intern on public.program_enrollments(intern_id);
create index idx_program_projects_program on public.program_projects(program_id);
create index idx_program_projects_project on public.program_projects(project_id);
create index idx_project_members_project on public.project_members(project_id);
create index idx_project_members_intern on public.project_members(intern_id);

create trigger set_programs_updated_at before update on public.programs
for each row execute procedure public.set_updated_at();
create trigger set_program_enrollments_updated_at before update on public.program_enrollments
for each row execute procedure public.set_updated_at();
create trigger set_program_projects_updated_at before update on public.program_projects
for each row execute procedure public.set_updated_at();
create trigger set_project_members_updated_at before update on public.project_members
for each row execute procedure public.set_updated_at();

grant select, insert, update on public.programs, public.program_enrollments, public.program_projects, public.project_members to authenticated;
alter table public.programs enable row level security;
alter table public.program_enrollments enable row level security;
alter table public.program_projects enable row level security;
alter table public.project_members enable row level security;

create policy programs_admin_all on public.programs for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()) and updated_by = (select auth.uid()));
create policy program_enrollments_admin_all on public.program_enrollments for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()) and updated_by = (select auth.uid()));
create policy program_projects_admin_all on public.program_projects for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()) and updated_by = (select auth.uid()));
create policy project_members_admin_all on public.project_members for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()) and updated_by = (select auth.uid()));

commit;
