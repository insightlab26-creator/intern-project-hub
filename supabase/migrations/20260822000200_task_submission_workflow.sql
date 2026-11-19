begin;
alter table public.tasks
  add column expected_output text not null default '',
  add column reviewer_id uuid references public.profiles(id) on delete set null,
  add column external_requester text not null default '';

alter table public.task_updates alter column review_status set default 'NOT_REQUIRED';

create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  revision integer not null check (revision > 0),
  deliverable_version_id uuid not null references public.deliverable_versions(id) on delete restrict,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  title text not null,
  note text not null default '',
  decision text not null default 'PENDING' check (decision in ('PENDING', 'APPROVED', 'CHANGES_REQUESTED')),
  feedback text not null default '',
  decided_by uuid references public.profiles(id) on delete restrict,
  decided_at timestamptz,
  unique (task_id, revision),
  unique (deliverable_version_id),
  constraint task_submission_decision_complete check (
    (decision = 'PENDING' and decided_by is null and decided_at is null)
    or (decision <> 'PENDING' and decided_by is not null and decided_at is not null)
  )
);

create table public.task_submission_contributors (
  submission_id uuid not null references public.task_submissions(id) on delete restrict,
  intern_id uuid not null references public.interns(id) on delete restrict,
  primary key (submission_id, intern_id)
);

create table public.task_legacy_resolutions (
  task_id uuid primary key references public.tasks(id) on delete restrict,
  action text not null check (action in ('RESUBMIT', 'COMPLETE')),
  reason text not null check (length(trim(reason)) > 0),
  resolved_by uuid not null references public.profiles(id) on delete restrict,
  resolved_at timestamptz not null default now()
);

create index task_submissions_latest on public.task_submissions(task_id, revision desc);
create index tasks_reviewer_queue on public.tasks(reviewer_id, status) where reviewer_id is not null;

create function public.is_task_assignee(p_task_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.task_assignees a
    join public.interns i on i.id = a.intern_id
    join public.profiles p on p.id = i.user_id
    where a.task_id = p_task_id and p.id = (select auth.uid())
      and p.global_role = 'INTERN' and p.status = 'ACTIVE'
  );
$$;

create function public.can_read_assigned_task(p_task_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t
    where t.id = p_task_id and (
      public.is_task_assignee(t.id)
      or (t.reviewer_id = (select auth.uid()) and exists (
        select 1 from public.profiles p where p.id = (select auth.uid())
          and p.status = 'ACTIVE' and p.global_role in ('ADMIN', 'MANAGER')
      ))
    )
  );
$$;

revoke all on function public.is_task_assignee(uuid), public.can_read_assigned_task(uuid) from public;
grant execute on function public.is_task_assignee(uuid), public.can_read_assigned_task(uuid) to authenticated;

create policy tasks_assignee_select on public.tasks for select to authenticated
using (public.is_task_assignee(id));
create policy tasks_reviewer_select on public.tasks for select to authenticated
using (reviewer_id = (select auth.uid()) and (select public.is_manager()));
create policy task_assignees_assigned_select on public.task_assignees for select to authenticated
using (public.can_read_assigned_task(task_id));
create policy interns_assigned_task_select on public.interns for select to authenticated
using (exists (
  select 1 from public.task_assignees a where a.intern_id = id
    and public.can_read_assigned_task(a.task_id)
));
create policy projects_assigned_task_select on public.projects for select to authenticated
using (exists (
  select 1 from public.tasks t where t.project_id = projects.id
    and public.can_read_assigned_task(t.id)
));
create policy task_updates_assigned_select on public.task_updates for select to authenticated
using (public.can_read_assigned_task(task_id));
create policy task_updates_assignee_insert on public.task_updates for insert to authenticated
with check (public.is_task_assignee(task_id) and created_by = (select auth.uid())
  and updated_by = (select auth.uid()) and review_status = 'NOT_REQUIRED'
  and exists (select 1 from public.tasks t where t.id = task_id and t.status = 'IN_PROGRESS'));

create function public.protect_new_task_update_review()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.review_status = 'NOT_REQUIRED' and new.review_status is distinct from old.review_status then
    raise exception '중간 진행 기록에는 승인 상태를 적용하지 않습니다.';
  end if;
  return new;
end;
$$;
create trigger protect_new_task_update_review before update on public.task_updates
for each row execute procedure public.protect_new_task_update_review();

create function public.validate_task_reviewer_and_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_decision text;
begin
  if new.reviewer_id is not null and not exists (
    select 1 from public.profiles p where p.id = new.reviewer_id
      and p.status = 'ACTIVE' and p.global_role in ('ADMIN', 'MANAGER')
  ) then raise exception '활성 관리자 또는 부문장만 검토자로 지정할 수 있습니다.'; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'REVIEW' and new.reviewer_id is distinct from old.reviewer_id then
      raise exception '검토 중에는 검토자를 변경할 수 없습니다.';
    end if;
    if old.status is distinct from new.status then
      select s.decision into v_decision from public.task_submissions s
      where s.task_id = new.id order by s.revision desc limit 1;
      if old.status = 'DONE' then
        raise exception '완료된 업무는 상태를 직접 변경할 수 없습니다.';
      end if;
      if old.status = 'REVIEW' and new.status not in ('DONE', 'IN_PROGRESS') then
        raise exception '검토 중 업무는 판정 또는 기존 업무 전환으로만 상태를 변경할 수 있습니다.';
      end if;
      if new.status in ('REVIEW', 'DONE') and old.status not in ('IN_PROGRESS', 'REVIEW') then
        raise exception '이전 업무 상태를 확인해주세요.';
      end if;
      if new.status = 'DONE' and old.status <> 'REVIEW' then
        raise exception '검토 중인 업무만 완료할 수 있습니다.';
      end if;
      if new.status = 'REVIEW' and v_decision is distinct from 'PENDING' then
        raise exception '최종 제출 없이 검토 상태로 변경할 수 없습니다.';
      end if;
      if new.status = 'DONE' and v_decision is distinct from 'APPROVED'
        and not exists (select 1 from public.task_legacy_resolutions r
          where r.task_id = new.id and r.action = 'COMPLETE') then
        raise exception '최종 승인 없이 업무를 완료할 수 없습니다.';
      end if;
      if old.status = 'REVIEW' and new.status = 'IN_PROGRESS'
        and v_decision is distinct from 'CHANGES_REQUESTED'
        and not exists (select 1 from public.task_legacy_resolutions r
          where r.task_id = new.id and r.action = 'RESUBMIT') then
        raise exception '수정 요청 또는 기존 업무 전환이 필요합니다.';
      end if;
    end if;
  elsif new.status in ('REVIEW', 'DONE') then
    raise exception '새 업무는 검토 또는 완료 상태로 시작할 수 없습니다.';
  end if;
  return new;
end;
$$;
create trigger validate_task_reviewer_and_transition before insert or update on public.tasks
for each row execute procedure public.validate_task_reviewer_and_transition();

create function public.connect_task_assignee_to_project()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_project_id uuid; v_member_status public.membership_status;
begin
  select project_id into v_project_id from public.tasks where id = new.task_id;
  select status into v_member_status from public.project_members
  where project_id = v_project_id and intern_id = new.intern_id;
  if v_member_status = 'INACTIVE' then
    raise exception '비활성 프로젝트 멤버는 관리자가 재활성화해야 합니다.';
  end if;
  if v_member_status is null then
    insert into public.project_members(project_id, intern_id, role, status, created_by, updated_by)
    values (v_project_id, new.intern_id, 'MEMBER', 'ACTIVE', auth.uid(), auth.uid())
    on conflict (project_id, intern_id) do nothing;
  end if;
  select status into v_member_status from public.project_members
  where project_id = v_project_id and intern_id = new.intern_id for update;
  if v_member_status is distinct from 'ACTIVE' then
    raise exception '비활성 프로젝트 멤버는 관리자가 재활성화해야 합니다.';
  end if;
  return new;
end;
$$;
create trigger connect_task_assignee_to_project after insert on public.task_assignees
for each row execute procedure public.connect_task_assignee_to_project();

-- Preserve explicit INACTIVE memberships and fill only missing relationships.
insert into public.project_members(project_id, intern_id, role, status)
select distinct t.project_id, a.intern_id, 'MEMBER'::public.project_member_role,
  'ACTIVE'::public.membership_status
from public.task_assignees a
join public.tasks t on t.id = a.task_id
where not exists (
  select 1 from public.project_members m
  where m.project_id = t.project_id and m.intern_id = a.intern_id
)
on conflict (project_id, intern_id) do nothing;

grant select on public.task_submissions, public.task_submission_contributors, public.task_legacy_resolutions to authenticated;
alter table public.task_submissions enable row level security;
alter table public.task_submission_contributors enable row level security;
alter table public.task_legacy_resolutions enable row level security;
create policy task_submissions_read on public.task_submissions for select to authenticated
using (public.can_manage_project((select t.project_id from public.tasks t where t.id = task_id))
  or public.can_read_assigned_task(task_id));
create policy task_submission_contributors_read on public.task_submission_contributors for select to authenticated
using (exists (select 1 from public.task_submissions s where s.id = submission_id));
create policy task_legacy_resolutions_read on public.task_legacy_resolutions for select to authenticated
using (public.can_manage_project((select t.project_id from public.tasks t where t.id = task_id))
  or public.can_read_assigned_task(task_id));
create policy deliverables_assigned_read on public.deliverables for select to authenticated
using (task_id is not null and public.can_read_assigned_task(task_id));
create policy deliverable_versions_assigned_read on public.deliverable_versions for select to authenticated
using (exists (select 1 from public.deliverables d where d.id = deliverable_id
  and d.task_id is not null and public.can_read_assigned_task(d.task_id)));

create function public.start_assigned_task(p_task_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_task_assignee(p_task_id) then raise exception '배정된 인턴만 업무를 시작할 수 있습니다.'; end if;
  update public.tasks set status = 'IN_PROGRESS', updated_by = auth.uid()
  where id = p_task_id and status = 'TODO';
  if not found then raise exception '시작할 수 있는 업무 상태가 아닙니다.'; end if;
end;
$$;

create function public.list_task_reviewers()
returns table(id uuid, display_name text, global_role public.app_role)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.global_role from public.profiles p
  where p.status = 'ACTIVE' and p.global_role in ('ADMIN', 'MANAGER')
    and (public.is_admin() or public.is_manager())
  order by p.display_name;
$$;

create function public.set_task_brief(p_task_id uuid, p_expected_output text,
  p_reviewer_id uuid, p_external_requester text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_project_id uuid;
begin
  select project_id into v_project_id from public.tasks where id = p_task_id for update;
  if v_project_id is null or not public.can_manage_project(v_project_id) then
    raise exception '이 업무의 배정 정보를 수정할 권한이 없습니다.';
  end if;
  update public.tasks set expected_output = trim(coalesce(p_expected_output, '')),
    reviewer_id = p_reviewer_id, external_requester = trim(coalesce(p_external_requester, '')),
    updated_by = auth.uid() where id = p_task_id;
end;
$$;

create function public.save_task_with_workflow(
  p_task_id uuid, p_project_id uuid, p_workstream_id uuid, p_parent_task_id uuid,
  p_title text, p_description text, p_expected_output text, p_reviewer_id uuid,
  p_external_requester text, p_status public.task_status, p_priority public.task_priority,
  p_start_date date, p_due_date date, p_sort_order integer, p_assignee_intern_ids uuid[]
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_task_id uuid;
begin
  if p_task_id is null then
    v_task_id := public.create_task_with_assignees(p_project_id, p_workstream_id,
      p_parent_task_id, p_title, p_description, p_status, p_priority,
      p_start_date, p_due_date, p_sort_order, p_assignee_intern_ids);
  else
    perform public.update_task_with_assignees(p_task_id, p_project_id, p_workstream_id,
      p_parent_task_id, p_title, p_description, p_status, p_priority,
      p_start_date, p_due_date, p_sort_order, p_assignee_intern_ids);
    v_task_id := p_task_id;
  end if;
  update public.tasks set expected_output = trim(coalesce(p_expected_output, '')),
    reviewer_id = p_reviewer_id, external_requester = trim(coalesce(p_external_requester, '')),
    updated_by = auth.uid() where id = v_task_id;
  return v_task_id;
end;
$$;

create function public.submit_assigned_task(
  p_task_id uuid, p_title text, p_url text, p_note text, p_contributor_ids uuid[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_task public.tasks%rowtype; v_intern_id uuid; v_deliverable_id uuid;
  v_version_id uuid; v_version integer; v_revision integer; v_submission_id uuid;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found or not public.is_task_assignee(p_task_id) then raise exception '배정된 인턴만 제출할 수 있습니다.'; end if;
  if v_task.status <> 'IN_PROGRESS' or v_task.reviewer_id is null
    or length(trim(v_task.expected_output)) = 0 then
    raise exception '진행 중인 업무에 기대 산출물과 검토자가 필요합니다.';
  end if;
  if length(trim(p_title)) = 0 or p_url !~* '^https?://' then
    raise exception '작업물 제목과 HTTP/HTTPS 링크가 필요합니다.';
  end if;
  select i.id into v_intern_id from public.interns i
  join public.task_assignees a on a.intern_id = i.id
  where a.task_id = p_task_id and i.user_id = auth.uid();
  if v_intern_id is null or p_contributor_ids is null
    or not (v_intern_id = any(p_contributor_ids))
    or exists (select 1 from unnest(p_contributor_ids) contributor_id
      where not exists (select 1 from public.task_assignees a
        where a.task_id = p_task_id and a.intern_id = contributor_id)) then
    raise exception '공동 기여자는 배정 인턴 중에서 선택하고 제출자를 포함해야 합니다.';
  end if;
  select d.id into v_deliverable_id from public.task_submissions s
  join public.deliverable_versions v on v.id = s.deliverable_version_id
  join public.deliverables d on d.id = v.deliverable_id
  where s.task_id = p_task_id order by s.revision desc limit 1;
  if v_deliverable_id is null then
    insert into public.deliverables(project_id, task_id, title, status, created_by, updated_by)
    values (v_task.project_id, p_task_id, trim(p_title), 'DRAFT', auth.uid(), auth.uid())
    returning id into v_deliverable_id;
  end if;
  update public.deliverables set title = trim(p_title), current_version = current_version + 1,
    status = 'SUBMITTED', updated_by = auth.uid()
  where id = v_deliverable_id returning current_version into v_version;
  insert into public.deliverable_versions(deliverable_id, version_number, url, notes, submitted_by)
  values (v_deliverable_id, v_version, trim(p_url), trim(coalesce(p_note, '')), auth.uid())
  returning id into v_version_id;
  select coalesce(max(revision), 0) + 1 into v_revision from public.task_submissions where task_id = p_task_id;
  insert into public.task_submissions(task_id, revision, deliverable_version_id, submitted_by, title, note)
  values (p_task_id, v_revision, v_version_id, auth.uid(), trim(p_title), trim(coalesce(p_note, '')))
  returning id into v_submission_id;
  insert into public.task_submission_contributors(submission_id, intern_id)
  select v_submission_id, contributor_id from unnest(p_contributor_ids) contributor_id
  group by contributor_id;
  update public.tasks set status = 'REVIEW', updated_by = auth.uid() where id = p_task_id;
  return v_submission_id;
end;
$$;

create function public.decide_task_submission(p_submission_id uuid, p_decision text, p_feedback text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_submission public.task_submissions%rowtype; v_task public.tasks%rowtype;
begin
  select t.* into v_task from public.tasks t join public.task_submissions s on s.task_id = t.id
  where s.id = p_submission_id for update of t;
  select * into v_submission from public.task_submissions where id = p_submission_id for update;
  if not found or v_task.status <> 'REVIEW' or v_submission.decision <> 'PENDING'
    or v_task.reviewer_id <> auth.uid() or not exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and p.status = 'ACTIVE' and p.global_role in ('ADMIN', 'MANAGER')) then
    raise exception '현재 지정된 검토자만 대기 중인 제출을 판정할 수 있습니다.';
  end if;
  if p_decision not in ('APPROVED', 'CHANGES_REQUESTED')
    or (p_decision = 'CHANGES_REQUESTED' and length(trim(coalesce(p_feedback, ''))) = 0) then
    raise exception '검토 결과와 수정 요청 사유를 확인해주세요.';
  end if;
  if exists (select 1 from public.task_submissions s where s.task_id = v_task.id
    and s.revision > v_submission.revision) then raise exception '최신 제출만 검토할 수 있습니다.'; end if;
  update public.task_submissions set decision = p_decision, feedback = trim(coalesce(p_feedback, '')),
    decided_by = auth.uid(), decided_at = now() where id = p_submission_id;
  update public.tasks set status = case when p_decision = 'APPROVED' then 'DONE'::public.task_status
    else 'IN_PROGRESS'::public.task_status end, updated_by = auth.uid() where id = v_task.id;
end;
$$;

create function public.resolve_legacy_review(p_task_id uuid, p_action text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_task public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found or not public.can_manage_project(v_task.project_id)
    or v_task.status <> 'REVIEW' or exists (
      select 1 from public.task_submissions where task_id = p_task_id) then
    raise exception '기존 방식의 검토 대기 업무만 전환할 수 있습니다.';
  end if;
  if p_action not in ('RESUBMIT', 'COMPLETE') or length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception '전환 결과와 사유가 필요합니다.';
  end if;
  insert into public.task_legacy_resolutions(task_id, action, reason, resolved_by)
  values (p_task_id, p_action, trim(p_reason), auth.uid());
  update public.tasks set status = case when p_action = 'COMPLETE' then 'DONE'::public.task_status
    else 'IN_PROGRESS'::public.task_status end, updated_by = auth.uid() where id = p_task_id;
end;
$$;

revoke all on function public.start_assigned_task(uuid),
  public.submit_assigned_task(uuid,text,text,text,uuid[]),
  public.decide_task_submission(uuid,text,text),
  public.resolve_legacy_review(uuid,text,text) from public;
revoke all on function public.save_task_with_workflow(uuid,uuid,uuid,uuid,text,text,text,uuid,text,public.task_status,public.task_priority,date,date,integer,uuid[]),
  public.list_task_reviewers(), public.set_task_brief(uuid,text,uuid,text) from public;
grant execute on function public.start_assigned_task(uuid),
  public.submit_assigned_task(uuid,text,text,text,uuid[]),
  public.decide_task_submission(uuid,text,text),
  public.resolve_legacy_review(uuid,text,text) to authenticated;
grant execute on function public.save_task_with_workflow(uuid,uuid,uuid,uuid,text,text,text,uuid,text,public.task_status,public.task_priority,date,date,integer,uuid[]) to authenticated;
grant execute on function public.list_task_reviewers(), public.set_task_brief(uuid,text,uuid,text) to authenticated;

commit;
