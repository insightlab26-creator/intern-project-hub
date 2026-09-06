-- Read-only source-link visibility for INTERN Resources.
-- Existing ADMIN and MANAGER policies remain unchanged.

create policy resources_intern_select on public.resources
for select to authenticated
using (
  (select public.is_intern())
  and (select public.can_access_intern_project(project_id))
  and (
    task_id is null
    or (select public.can_access_assigned_task(task_id))
  )
);

create policy deliverables_intern_select on public.deliverables
for select to authenticated
using (
  (select public.is_intern())
  and (select public.can_access_intern_project(project_id))
  and (
    task_id is null
    or (select public.can_access_assigned_task(task_id))
  )
);

create policy deliverable_versions_intern_select on public.deliverable_versions
for select to authenticated
using (
  (select public.is_intern())
  and exists (
    select 1
    from public.deliverables d
    where d.id = deliverable_versions.deliverable_id
      and (select public.can_access_intern_project(d.project_id))
      and (
        d.task_id is null
        or (select public.can_access_assigned_task(d.task_id))
      )
  )
);
