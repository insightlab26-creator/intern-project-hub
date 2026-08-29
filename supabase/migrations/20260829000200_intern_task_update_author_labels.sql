-- Allow an INTERN to resolve labels only for their own accessible updates.
create or replace function public.get_task_update_author_labels(p_update_ids uuid[])
returns table (update_id uuid, author_id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.created_by, p.display_name
  from public.task_updates u
  join public.tasks t on t.id = u.task_id
  join public.profiles p on p.id = u.created_by
  where u.id = any(coalesce(p_update_ids, array[]::uuid[]))
    and (select auth.uid()) is not null
    and (
      (select public.is_admin())
      or ((select public.is_manager()) and (select public.can_manage_project(t.project_id)))
      or (u.created_by = (select auth.uid()) and (select public.can_access_assigned_task(u.task_id)))
    );
$$;

revoke all on function public.get_task_update_author_labels(uuid[]) from public;
grant execute on function public.get_task_update_author_labels(uuid[]) to authenticated;
