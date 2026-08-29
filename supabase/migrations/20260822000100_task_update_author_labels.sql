-- Expose only Task Update author labels that the caller may already manage.
-- The input is Task Update IDs, never arbitrary profile IDs, so the function
-- cannot be used as a general profile-directory lookup.
create or replace function public.get_task_update_author_labels(p_update_ids uuid[])
returns table (
  update_id uuid,
  author_id uuid,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    task_update.id as update_id,
    task_update.created_by as author_id,
    profile.display_name
  from public.task_updates as task_update
  join public.tasks as task on task.id = task_update.task_id
  join public.profiles as profile on profile.id = task_update.created_by
  where task_update.id = any(coalesce(p_update_ids, array[]::uuid[]))
    and (select auth.uid()) is not null
    and (
      (select public.is_admin())
      or (
        (select public.is_manager())
        and (select public.can_manage_project(task.project_id))
      )
    );
$$;

revoke all on function public.get_task_update_author_labels(uuid[]) from public;
grant execute on function public.get_task_update_author_labels(uuid[]) to authenticated;
