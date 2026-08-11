begin;

create or replace function public.create_task_with_assignees(
  p_project_id uuid,
  p_workstream_id uuid,
  p_parent_task_id uuid,
  p_title text,
  p_description text,
  p_status public.task_status,
  p_priority public.task_priority,
  p_start_date date,
  p_due_date date,
  p_sort_order integer,
  p_assignee_intern_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_task_id uuid;
begin
  insert into public.tasks (
    project_id, workstream_id, parent_task_id, title, description,
    status, priority, start_date, due_date, sort_order,
    created_by, updated_by, schema_version
  ) values (
    p_project_id, p_workstream_id, p_parent_task_id, trim(p_title),
    trim(coalesce(p_description, '')), p_status, p_priority,
    p_start_date, p_due_date, p_sort_order, auth.uid(), auth.uid(), 1
  ) returning id into v_task_id;

  insert into public.task_assignees (task_id, intern_id, assigned_by)
  select v_task_id, assignee.intern_id, auth.uid()
  from (
    select distinct unnest(coalesce(p_assignee_intern_ids, array[]::uuid[]))
      as intern_id
  ) assignee;

  return v_task_id;
end;
$$;

create or replace function public.update_task_with_assignees(
  p_task_id uuid,
  p_project_id uuid,
  p_workstream_id uuid,
  p_parent_task_id uuid,
  p_title text,
  p_description text,
  p_status public.task_status,
  p_priority public.task_priority,
  p_start_date date,
  p_due_date date,
  p_sort_order integer,
  p_assignee_intern_ids uuid[] default array[]::uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated_task_id uuid;
begin
  if exists (
    select 1 from public.tasks child
    where child.parent_task_id = p_task_id
      and (child.project_id <> p_project_id
        or child.workstream_id <> p_workstream_id)
  ) then
    raise exception
      '하위 Task가 있는 Task는 다른 프로젝트 또는 Workstream으로 이동할 수 없습니다.';
  end if;

  update public.tasks set
    project_id = p_project_id,
    workstream_id = p_workstream_id,
    parent_task_id = p_parent_task_id,
    title = trim(p_title),
    description = trim(coalesce(p_description, '')),
    status = p_status,
    priority = p_priority,
    start_date = p_start_date,
    due_date = p_due_date,
    sort_order = p_sort_order,
    updated_by = auth.uid()
  where id = p_task_id and project_id = p_project_id
  returning id into v_updated_task_id;

  if v_updated_task_id is null then
    raise exception '수정할 Task를 찾을 수 없습니다.';
  end if;

  delete from public.task_assignees where task_id = p_task_id;

  insert into public.task_assignees (task_id, intern_id, assigned_by)
  select p_task_id, assignee.intern_id, auth.uid()
  from (
    select distinct unnest(coalesce(p_assignee_intern_ids, array[]::uuid[]))
      as intern_id
  ) assignee;
end;
$$;

revoke execute on function public.create_task_with_assignees(
  uuid, uuid, uuid, text, text, public.task_status, public.task_priority,
  date, date, integer, uuid[]
) from public, anon;
grant execute on function public.create_task_with_assignees(
  uuid, uuid, uuid, text, text, public.task_status, public.task_priority,
  date, date, integer, uuid[]
) to authenticated;

revoke execute on function public.update_task_with_assignees(
  uuid, uuid, uuid, uuid, text, text, public.task_status,
  public.task_priority, date, date, integer, uuid[]
) from public, anon;
grant execute on function public.update_task_with_assignees(
  uuid, uuid, uuid, uuid, text, text, public.task_status,
  public.task_priority, date, date, integer, uuid[]
) to authenticated;

commit;
