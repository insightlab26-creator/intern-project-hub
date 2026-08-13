-- Project-scoped intern manager access. Existing ADMIN access remains unchanged.
alter type public.app_role add value if not exists 'MANAGER';

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and global_role::text = 'MANAGER'
      and status = 'ACTIVE'
  );
$$;

create or replace function public.can_manage_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select public.is_admin()) or exists (
    select 1 from public.projects
    where id = p_project_id
      and operator_id = (select auth.uid())
      and (select public.is_manager())
  );
$$;

revoke all on function public.is_manager() from public;
revoke all on function public.can_manage_project(uuid) from public;
grant execute on function public.is_manager(), public.can_manage_project(uuid) to authenticated;

create or replace function public.protect_project_operator_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.operator_id is distinct from old.operator_id and not public.is_admin() then
    raise exception 'Project 운영 담당자는 총괄 관리자만 변경할 수 있습니다.';
  end if;
  if new.operator_id is not null and not exists (
    select 1 from public.profiles
    where id = new.operator_id
      and status = 'ACTIVE'
      and global_role::text in ('ADMIN', 'MANAGER')
  ) then
    raise exception '활성 총괄 관리자 또는 인턴 관리자만 Project 운영 담당자로 지정할 수 있습니다.';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_project_operator_assignment() from public;
drop trigger if exists protect_project_operator_assignment on public.projects;
create trigger protect_project_operator_assignment before update on public.projects
for each row execute procedure public.protect_project_operator_assignment();

create policy projects_manager_select on public.projects for select to authenticated
using ((select public.is_manager()) and operator_id = (select auth.uid()));
create policy projects_manager_update on public.projects for update to authenticated
using ((select public.is_manager()) and operator_id = (select auth.uid()))
with check ((select public.is_manager()) and operator_id = (select auth.uid()) and updated_by = (select auth.uid()));

create policy workstreams_manager_all on public.workstreams for all to authenticated
using ((select public.can_manage_project(project_id)))
with check ((select public.can_manage_project(project_id)) and updated_by = (select auth.uid()));
create policy tasks_manager_all on public.tasks for all to authenticated
using ((select public.can_manage_project(project_id)))
with check ((select public.can_manage_project(project_id)) and updated_by = (select auth.uid()));
create policy task_assignees_manager_select on public.task_assignees for select to authenticated
using ((select public.can_manage_project((select t.project_id from public.tasks t where t.id = task_id))));
create policy task_assignees_manager_insert on public.task_assignees for insert to authenticated
with check ((select public.can_manage_project((select t.project_id from public.tasks t where t.id = task_id))) and assigned_by = (select auth.uid()));
create policy task_assignees_manager_delete on public.task_assignees for delete to authenticated
using ((select public.can_manage_project((select t.project_id from public.tasks t where t.id = task_id))));

create policy interns_manager_select on public.interns for select to authenticated
using ((select public.is_manager()));
create policy project_members_manager_all on public.project_members for all to authenticated
using ((select public.can_manage_project(project_id)))
with check ((select public.can_manage_project(project_id)) and updated_by = (select auth.uid()));

create policy task_updates_manager_select on public.task_updates for select to authenticated
using ((select public.can_manage_project((select t.project_id from public.tasks t where t.id = task_id))));
create policy task_updates_manager_insert on public.task_updates for insert to authenticated
with check ((select public.can_manage_project((select t.project_id from public.tasks t where t.id = task_id))) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy task_updates_manager_update on public.task_updates for update to authenticated
using ((select public.can_manage_project((select t.project_id from public.tasks t where t.id = task_id))))
with check ((select public.can_manage_project((select t.project_id from public.tasks t where t.id = task_id))) and updated_by = (select auth.uid()));

create policy resources_manager_all on public.resources for all to authenticated
using ((select public.can_manage_project(project_id)))
with check ((select public.can_manage_project(project_id)) and updated_by = (select auth.uid()));
create policy deliverables_manager_all on public.deliverables for all to authenticated
using ((select public.can_manage_project(project_id)))
with check ((select public.can_manage_project(project_id)) and updated_by = (select auth.uid()));
create policy deliverable_versions_manager_select on public.deliverable_versions for select to authenticated
using ((select public.can_manage_project((select d.project_id from public.deliverables d where d.id = deliverable_id))));
create policy deliverable_reviews_manager_select on public.deliverable_reviews for select to authenticated
using ((select public.can_manage_project((select d.project_id from public.deliverable_versions v join public.deliverables d on d.id = v.deliverable_id where v.id = deliverable_version_id))));

create or replace function public.submit_deliverable_version(p_deliverable_id uuid, p_url text, p_notes text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare v_version integer; v_id uuid; v_project_id uuid;
begin
  select project_id into v_project_id from public.deliverables where id = p_deliverable_id;
  if v_project_id is null or not public.can_manage_project(v_project_id) then raise exception 'Document 링크 등록 권한이 없습니다.'; end if;
  if p_url !~* '^https?://' then raise exception 'Document URL은 HTTP 또는 HTTPS여야 합니다.'; end if;
  update public.deliverables set current_version = current_version + 1, status = 'SUBMITTED', updated_by = auth.uid()
  where id = p_deliverable_id and status <> 'ARCHIVED' returning current_version into v_version;
  if v_version is null then raise exception '등록할 Document를 찾을 수 없거나 보관 상태입니다.'; end if;
  insert into public.deliverable_versions (deliverable_id, version_number, url, notes, submitted_by)
  values (p_deliverable_id, v_version, trim(p_url), trim(coalesce(p_notes, '')), auth.uid()) returning id into v_id;
  return v_id;
end; $$;

create policy decisions_manager_all on public.decisions for all to authenticated
using ((select public.can_manage_project(project_id)))
with check ((select public.can_manage_project(project_id)) and updated_by = (select auth.uid()));
create policy review_gates_manager_select on public.review_gates for select to authenticated
using (project_id is not null and (select public.can_manage_project(project_id)));
create policy review_gates_manager_insert on public.review_gates for insert to authenticated
with check (target_type = 'PROJECT' and project_id is not null and (select public.can_manage_project(project_id)) and reviewed_by = (select auth.uid()));
