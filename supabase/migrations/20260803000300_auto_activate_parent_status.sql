begin;

-- =========================================================
-- Task 진행 시 프로젝트와 Workstream을 자동 활성화
-- =========================================================

create or replace function public.activate_parent_status_from_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in (
    'IN_PROGRESS'::public.task_status,
    'REVIEW'::public.task_status,
    'DONE'::public.task_status
  ) then

    update public.projects
    set
      status = 'ACTIVE'::public.project_status,
      updated_by = coalesce(auth.uid(), updated_by)
    where id = new.project_id
      and status = 'PLANNING'::public.project_status;

    update public.workstreams
    set
      status = 'ACTIVE'::public.workstream_status,
      updated_by = coalesce(auth.uid(), updated_by)
    where id = new.workstream_id
      and status = 'PLANNING'::public.workstream_status;

  end if;

  return new;
end;
$$;

revoke all
on function public.activate_parent_status_from_task()
from public;


drop trigger if exists
  activate_parent_status_after_task_change
on public.tasks;

create trigger activate_parent_status_after_task_change
  after insert or update
  on public.tasks
  for each row
  execute procedure public.activate_parent_status_from_task();


-- =========================================================
-- 이미 진행 상태인 Task가 있는 기존 데이터도 일괄 반영
-- =========================================================

update public.projects project
set status = 'ACTIVE'::public.project_status
where project.status = 'PLANNING'::public.project_status
  and exists (
    select 1
    from public.tasks task
    where task.project_id = project.id
      and task.status in (
        'IN_PROGRESS'::public.task_status,
        'REVIEW'::public.task_status,
        'DONE'::public.task_status
      )
  );


update public.workstreams workstream
set status = 'ACTIVE'::public.workstream_status
where workstream.status =
      'PLANNING'::public.workstream_status
  and exists (
    select 1
    from public.tasks task
    where task.workstream_id = workstream.id
      and task.status in (
        'IN_PROGRESS'::public.task_status,
        'REVIEW'::public.task_status,
        'DONE'::public.task_status
      )
  );

commit;
