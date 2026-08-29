-- Minimal INTERN read/write foundation for the first vertical slice.
-- Existing ADMIN/MANAGER policies remain unchanged.

create or replace function public.is_intern()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and global_role::text = 'INTERN'
      and status = 'ACTIVE'
  );
$$;

create or replace function public.current_intern_id()
returns uuid
language sql stable security definer set search_path = '' as $$
  select i.id
  from public.interns i
  join public.profiles p on p.id = i.user_id
  where i.user_id = (select auth.uid())
    and p.global_role::text = 'INTERN'
    and p.status = 'ACTIVE'
  limit 1;
$$;

create or replace function public.can_access_assigned_task(p_task_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select (select public.is_intern())
    and exists (
      select 1 from public.task_assignees a
      where a.task_id = p_task_id
        and a.intern_id = (select public.current_intern_id())
    );
$$;

create or replace function public.can_access_intern_project(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select (select public.is_intern())
    and exists (
      select 1
      from public.tasks t
      join public.task_assignees a on a.task_id = t.id
      where t.project_id = p_project_id
        and a.intern_id = (select public.current_intern_id())
    );
$$;

create or replace function public.can_access_intern_workstream(p_workstream_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select (select public.is_intern())
    and exists (
      select 1
      from public.tasks t
      join public.task_assignees a on a.task_id = t.id
      where t.workstream_id = p_workstream_id
        and a.intern_id = (select public.current_intern_id())
    );
$$;

revoke all on function public.is_intern(), public.current_intern_id(), public.can_access_assigned_task(uuid), public.can_access_intern_project(uuid), public.can_access_intern_workstream(uuid) from public;
grant execute on function public.is_intern(), public.current_intern_id(), public.can_access_assigned_task(uuid), public.can_access_intern_project(uuid), public.can_access_intern_workstream(uuid) to authenticated;

create policy interns_self_select on public.interns
for select to authenticated using ((select public.is_intern()) and user_id = (select auth.uid()));

create policy tasks_intern_select on public.tasks
for select to authenticated using ((select public.can_access_assigned_task(id)));

create policy task_assignees_intern_select on public.task_assignees
for select to authenticated using ((select public.can_access_assigned_task(task_id)));

create policy projects_intern_context_select on public.projects
for select to authenticated using ((select public.can_access_intern_project(id)));

create policy workstreams_intern_context_select on public.workstreams
for select to authenticated using ((select public.can_access_intern_workstream(id)));

create policy task_updates_intern_select on public.task_updates
for select to authenticated using (
  created_by = (select auth.uid())
  and (select public.can_access_assigned_task(task_id))
);

create policy task_updates_intern_insert on public.task_updates
for insert to authenticated with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and review_status = 'PENDING'
  and manager_feedback = ''
  and (select public.can_access_assigned_task(task_id))
);

commit;
