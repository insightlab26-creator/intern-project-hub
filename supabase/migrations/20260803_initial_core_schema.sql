-- =========================================================
-- 1. 사용자 권한·상태 유형
-- =========================================================

do $$
begin
  create type public.app_role as enum (
    'ADMIN',
    'INTERN',
    'VIEWER'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.user_status as enum (
    'ACTIVE',
    'INACTIVE'
  );
exception
  when duplicate_object then null;
end
$$;


-- =========================================================
-- 2. 앱 사용자 프로필
-- Supabase Auth의 auth.users와 1:1로 연결
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  email text,
  display_name text not null,

  global_role public.app_role
    not null
    default 'VIEWER',

  status public.user_status
    not null
    default 'ACTIVE',

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


-- =========================================================
-- 3. 사용자 생성 시 profiles 자동 생성
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    global_role,
    status
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    'VIEWER',
    'ACTIVE'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();


-- =========================================================
-- 4. updated_at 자동 갱신
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at
on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute procedure public.set_updated_at();


-- =========================================================
-- 5. 관리자 여부 확인 함수
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and global_role = 'ADMIN'
      and status = 'ACTIVE'
  );
$$;

revoke all
on function public.is_admin()
from public;

grant execute
on function public.is_admin()
to authenticated;


-- =========================================================
-- 6. profiles 권한 및 RLS
-- =========================================================

grant select, update
on table public.profiles
to authenticated;

alter table public.profiles
enable row level security;

drop policy if exists
  "profiles_read_own_or_admin"
on public.profiles;

create policy
  "profiles_read_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or public.is_admin()
);

drop policy if exists
  "profiles_admin_update"
on public.profiles;

create policy
  "profiles_admin_update"
on public.profiles
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- =========================================================
-- 1. 프로젝트·Workstream 상태 타입
-- =========================================================

do $$
begin
  create type public.project_status as enum (
    'PLANNING',
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED',
    'ARCHIVED'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.workstream_status as enum (
    'PLANNING',
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED'
  );
exception
  when duplicate_object then null;
end
$$;


-- =========================================================
-- 2. Projects
-- =========================================================

create table if not exists public.projects (
  id uuid
    primary key
    default gen_random_uuid(),

  code text
    not null
    unique,

  name text
    not null,

  description text
    not null
    default '',

  status public.project_status
    not null
    default 'PLANNING',

  start_date date,
  target_end_date date,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  created_by uuid
    references public.profiles(id)
    on delete set null,

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  schema_version integer
    not null
    default 1,

  constraint projects_code_not_blank
    check (length(trim(code)) > 0),

  constraint projects_name_not_blank
    check (length(trim(name)) > 0),

  constraint projects_date_order
    check (
      start_date is null
      or target_end_date is null
      or start_date <= target_end_date
    )
);


-- =========================================================
-- 3. Workstreams
-- =========================================================

create table if not exists public.workstreams (
  id uuid
    primary key
    default gen_random_uuid(),

  project_id uuid
    not null
    references public.projects(id)
    on delete cascade,

  name text
    not null,

  description text
    not null
    default '',

  status public.workstream_status
    not null
    default 'PLANNING',

  sort_order integer
    not null
    default 1,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  created_by uuid
    references public.profiles(id)
    on delete set null,

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  constraint workstreams_name_not_blank
    check (length(trim(name)) > 0),

  constraint workstreams_sort_order_positive
    check (sort_order >= 1),

  constraint workstreams_project_order_unique
    unique (project_id, sort_order)
);


-- =========================================================
-- 4. 조회 성능용 인덱스
-- =========================================================

create index if not exists
  idx_projects_status
on public.projects(status);

create index if not exists
  idx_workstreams_project_id
on public.workstreams(project_id);

create index if not exists
  idx_workstreams_project_sort
on public.workstreams(project_id, sort_order);


-- =========================================================
-- 5. updated_at 자동 갱신
-- 앞에서 만든 public.set_updated_at() 함수 사용
-- =========================================================

drop trigger if exists
  set_projects_updated_at
on public.projects;

create trigger set_projects_updated_at
  before update on public.projects
  for each row
  execute procedure public.set_updated_at();


drop trigger if exists
  set_workstreams_updated_at
on public.workstreams;

create trigger set_workstreams_updated_at
  before update on public.workstreams
  for each row
  execute procedure public.set_updated_at();


-- =========================================================
-- 6. authenticated 역할 권한
-- 삭제 권한은 아직 부여하지 않음
-- =========================================================

grant select, insert, update
on table public.projects
to authenticated;

grant select, insert, update
on table public.workstreams
to authenticated;


-- =========================================================
-- 7. Row Level Security 활성화
-- =========================================================

alter table public.projects
enable row level security;

alter table public.workstreams
enable row level security;


-- =========================================================
-- 8. 초기 RLS 정책
-- 현재는 ADMIN만 전체 조회·생성·수정 가능
-- =========================================================

drop policy if exists
  "projects_admin_select"
on public.projects;

create policy
  "projects_admin_select"
on public.projects
for select
to authenticated
using (
  (select public.is_admin())
);


drop policy if exists
  "projects_admin_insert"
on public.projects;

create policy
  "projects_admin_insert"
on public.projects
for insert
to authenticated
with check (
  (select public.is_admin())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);


drop policy if exists
  "projects_admin_update"
on public.projects;

create policy
  "projects_admin_update"
on public.projects
for update
to authenticated
using (
  (select public.is_admin())
)
with check (
  (select public.is_admin())
  and updated_by = (select auth.uid())
);


drop policy if exists
  "workstreams_admin_select"
on public.workstreams;

create policy
  "workstreams_admin_select"
on public.workstreams
for select
to authenticated
using (
  (select public.is_admin())
);


drop policy if exists
  "workstreams_admin_insert"
on public.workstreams;

create policy
  "workstreams_admin_insert"
on public.workstreams
for insert
to authenticated
with check (
  (select public.is_admin())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);


drop policy if exists
  "workstreams_admin_update"
on public.workstreams;

create policy
  "workstreams_admin_update"
on public.workstreams
for update
to authenticated
using (
  (select public.is_admin())
)
with check (
  (select public.is_admin())
  and updated_by = (select auth.uid())
);

begin;

-- =========================================================
-- 1. Enum 유형
-- =========================================================

do $$
begin
  create type public.intern_status as enum (
    'PLANNED',
    'ACTIVE',
    'COMPLETED'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.task_status as enum (
    'TODO',
    'IN_PROGRESS',
    'REVIEW',
    'DONE',
    'HOLD'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.task_priority as enum (
    'LOW',
    'MEDIUM',
    'HIGH'
  );
exception
  when duplicate_object then null;
end
$$;


-- =========================================================
-- 2. Interns
-- 로그인 계정과 인턴 이력은 별도 관리
-- user_id는 필요할 때 profiles와 연결
-- =========================================================

create table if not exists public.interns (
  id uuid
    primary key
    default gen_random_uuid(),

  name text
    not null,

  school text
    not null
    default '',

  major text
    not null
    default '',

  cohort text
    not null
    default '',

  start_date date,
  end_date date,

  status public.intern_status
    not null
    default 'ACTIVE',

  user_id uuid
    unique
    references public.profiles(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  created_by uuid
    references public.profiles(id)
    on delete set null,

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  schema_version integer
    not null
    default 1,

  constraint interns_name_not_blank
    check (length(trim(name)) > 0),

  constraint interns_date_order
    check (
      start_date is null
      or end_date is null
      or start_date <= end_date
    )
);


-- =========================================================
-- 3. Tasks
-- project와 workstream에 직접 연결
-- parent_task_id로 상하위 Task 구성
-- =========================================================

create table if not exists public.tasks (
  id uuid
    primary key
    default gen_random_uuid(),

  project_id uuid
    not null
    references public.projects(id)
    on delete cascade,

  workstream_id uuid
    not null
    references public.workstreams(id)
    on delete restrict,

  parent_task_id uuid
    references public.tasks(id)
    on delete restrict,

  title text
    not null,

  description text
    not null
    default '',

  status public.task_status
    not null
    default 'TODO',

  priority public.task_priority
    not null
    default 'MEDIUM',

  start_date date,
  due_date date,

  sort_order integer
    not null
    default 1,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  created_by uuid
    references public.profiles(id)
    on delete set null,

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  schema_version integer
    not null
    default 1,

  constraint tasks_title_not_blank
    check (length(trim(title)) > 0),

  constraint tasks_sort_order_positive
    check (sort_order >= 1),

  constraint tasks_date_order
    check (
      start_date is null
      or due_date is null
      or start_date <= due_date
    )
);


-- =========================================================
-- 4. Task 담당 인턴
-- 현재 UI는 1명 선택이지만 DB는 다중 담당 지원
-- =========================================================

create table if not exists public.task_assignees (
  task_id uuid
    not null
    references public.tasks(id)
    on delete cascade,

  intern_id uuid
    not null
    references public.interns(id)
    on delete restrict,

  assigned_at timestamptz
    not null
    default now(),

  assigned_by uuid
    references public.profiles(id)
    on delete set null,

  primary key (
    task_id,
    intern_id
  )
);


-- =========================================================
-- 5. Task 관계 검증
-- Workstream과 Project 불일치 방지
-- 다른 Workstream의 Task를 부모로 지정하는 것 방지
-- 자기 자신 또는 자기 하위 Task를 부모로 지정하는 것 방지
-- =========================================================

create or replace function public.validate_task_relationships()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.workstreams
    where id = new.workstream_id
      and project_id = new.project_id
  ) then
    raise exception
      '선택한 Workstream이 해당 프로젝트에 속하지 않습니다.';
  end if;

  if new.parent_task_id is not null then
    if new.parent_task_id = new.id then
      raise exception
        'Task 자기 자신을 상위 Task로 지정할 수 없습니다.';
    end if;

    if not exists (
      select 1
      from public.tasks
      where id = new.parent_task_id
        and project_id = new.project_id
        and workstream_id = new.workstream_id
    ) then
      raise exception
        '상위 Task는 동일한 프로젝트와 Workstream에 속해야 합니다.';
    end if;

    if exists (
      with recursive ancestors as (
        select
          id,
          parent_task_id
        from public.tasks
        where id = new.parent_task_id

        union all

        select
          task.id,
          task.parent_task_id
        from public.tasks task
        join ancestors
          on task.id = ancestors.parent_task_id
      )
      select 1
      from ancestors
      where id = new.id
    ) then
      raise exception
        'Task 상하위 관계에 순환 구조를 만들 수 없습니다.';
    end if;
  end if;

  return new;
end;
$$;

revoke all
on function public.validate_task_relationships()
from public;

drop trigger if exists
  validate_tasks_relationships
on public.tasks;

create trigger validate_tasks_relationships
  before insert or update
  on public.tasks
  for each row
  execute procedure public.validate_task_relationships();


-- =========================================================
-- 6. updated_at 자동 갱신
-- 기존 public.set_updated_at() 함수 사용
-- =========================================================

drop trigger if exists
  set_interns_updated_at
on public.interns;

create trigger set_interns_updated_at
  before update on public.interns
  for each row
  execute procedure public.set_updated_at();


drop trigger if exists
  set_tasks_updated_at
on public.tasks;

create trigger set_tasks_updated_at
  before update on public.tasks
  for each row
  execute procedure public.set_updated_at();


-- =========================================================
-- 7. 조회 성능용 인덱스
-- =========================================================

create index if not exists
  idx_interns_status
on public.interns(status);

create index if not exists
  idx_tasks_project_id
on public.tasks(project_id);

create index if not exists
  idx_tasks_workstream_id
on public.tasks(workstream_id);

create index if not exists
  idx_tasks_parent_task_id
on public.tasks(parent_task_id);

create index if not exists
  idx_tasks_status
on public.tasks(status);

create index if not exists
  idx_tasks_due_date
on public.tasks(due_date);

create index if not exists
  idx_task_assignees_intern_id
on public.task_assignees(intern_id);


-- =========================================================
-- 8. authenticated 역할 권한
-- Intern과 Task 자체는 삭제하지 않음
-- 담당자 연결은 변경을 위해 삭제 허용
-- =========================================================

grant select, insert, update
on table public.interns
to authenticated;

grant select, insert, update
on table public.tasks
to authenticated;

grant select, insert, delete
on table public.task_assignees
to authenticated;


-- =========================================================
-- 9. RLS 활성화
-- =========================================================

alter table public.interns
enable row level security;

alter table public.tasks
enable row level security;

alter table public.task_assignees
enable row level security;


-- =========================================================
-- 10. Interns RLS
-- 현재는 ADMIN만 관리
-- =========================================================

drop policy if exists
  "interns_admin_select"
on public.interns;

create policy
  "interns_admin_select"
on public.interns
for select
to authenticated
using (
  (select public.is_admin())
);


drop policy if exists
  "interns_admin_insert"
on public.interns;

create policy
  "interns_admin_insert"
on public.interns
for insert
to authenticated
with check (
  (select public.is_admin())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);


drop policy if exists
  "interns_admin_update"
on public.interns;

create policy
  "interns_admin_update"
on public.interns
for update
to authenticated
using (
  (select public.is_admin())
)
with check (
  (select public.is_admin())
  and updated_by = (select auth.uid())
);


-- =========================================================
-- 11. Tasks RLS
-- =========================================================

drop policy if exists
  "tasks_admin_select"
on public.tasks;

create policy
  "tasks_admin_select"
on public.tasks
for select
to authenticated
using (
  (select public.is_admin())
);


drop policy if exists
  "tasks_admin_insert"
on public.tasks;

create policy
  "tasks_admin_insert"
on public.tasks
for insert
to authenticated
with check (
  (select public.is_admin())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);


drop policy if exists
  "tasks_admin_update"
on public.tasks;

create policy
  "tasks_admin_update"
on public.tasks
for update
to authenticated
using (
  (select public.is_admin())
)
with check (
  (select public.is_admin())
  and updated_by = (select auth.uid())
);


-- =========================================================
-- 12. Task Assignees RLS
-- =========================================================

drop policy if exists
  "task_assignees_admin_select"
on public.task_assignees;

create policy
  "task_assignees_admin_select"
on public.task_assignees
for select
to authenticated
using (
  (select public.is_admin())
);


drop policy if exists
  "task_assignees_admin_insert"
on public.task_assignees;

create policy
  "task_assignees_admin_insert"
on public.task_assignees
for insert
to authenticated
with check (
  (select public.is_admin())
  and assigned_by = (select auth.uid())
);


drop policy if exists
  "task_assignees_admin_delete"
on public.task_assignees;

create policy
  "task_assignees_admin_delete"
on public.task_assignees
for delete
to authenticated
using (
  (select public.is_admin())
);

commit;