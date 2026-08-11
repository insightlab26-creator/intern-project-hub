begin;
create type public.deliverable_status as enum ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'ARCHIVED');
create type public.deliverable_review_decision as enum ('APPROVED', 'CHANGES_REQUESTED');

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  task_id uuid references public.tasks(id) on delete restrict,
  title text not null,
  description text not null default '',
  status public.deliverable_status not null default 'DRAFT',
  current_version integer not null default 0 check (current_version >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint deliverables_title_not_blank check (length(trim(title)) > 0)
);
create table public.deliverable_versions (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  url text not null check (url ~* '^https?://'),
  notes text not null default '',
  submitted_at timestamptz not null default now(),
  submitted_by uuid references public.profiles(id) on delete set null,
  constraint deliverable_versions_unique unique (deliverable_id, version_number)
);
create table public.deliverable_reviews (
  id uuid primary key default gen_random_uuid(),
  deliverable_version_id uuid not null references public.deliverable_versions(id) on delete restrict,
  decision public.deliverable_review_decision not null,
  feedback text not null default '',
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index idx_deliverables_project_status on public.deliverables(project_id, status);
create index idx_deliverable_versions_timeline on public.deliverable_versions(deliverable_id, version_number desc);
create index idx_deliverable_reviews_version on public.deliverable_reviews(deliverable_version_id, reviewed_at desc);

create function public.validate_deliverable_task_project() returns trigger language plpgsql set search_path = public as $$
begin
  if new.task_id is not null and not exists (select 1 from public.tasks where id = new.task_id and project_id = new.project_id) then
    raise exception 'Deliverable의 Task는 같은 Project에 속해야 합니다.';
  end if;
  return new;
end; $$;
create trigger validate_deliverable_task_project before insert or update on public.deliverables for each row execute procedure public.validate_deliverable_task_project();
create trigger set_deliverables_updated_at before update on public.deliverables for each row execute procedure public.set_updated_at();

grant select, insert, update on public.deliverables to authenticated;
grant select on public.deliverable_versions, public.deliverable_reviews to authenticated;
alter table public.deliverables enable row level security;
alter table public.deliverable_versions enable row level security;
alter table public.deliverable_reviews enable row level security;
create policy deliverables_admin_all on public.deliverables for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()) and updated_by = (select auth.uid()));
create policy deliverable_versions_admin_select on public.deliverable_versions for select to authenticated using ((select public.is_admin()));
create policy deliverable_reviews_admin_select on public.deliverable_reviews for select to authenticated using ((select public.is_admin()));

create function public.submit_deliverable_version(p_deliverable_id uuid, p_url text, p_notes text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare v_version integer; v_id uuid;
begin
  if not public.is_admin() then raise exception 'Deliverable 버전 제출 권한이 없습니다.'; end if;
  if p_url !~* '^https?://' then raise exception 'Deliverable URL은 HTTP 또는 HTTPS여야 합니다.'; end if;
  update public.deliverables set current_version = current_version + 1, status = 'SUBMITTED', updated_by = auth.uid()
  where id = p_deliverable_id and status <> 'ARCHIVED' returning current_version into v_version;
  if v_version is null then raise exception '제출할 Deliverable을 찾을 수 없거나 보관 상태입니다.'; end if;
  insert into public.deliverable_versions (deliverable_id, version_number, url, notes, submitted_by)
  values (p_deliverable_id, v_version, trim(p_url), trim(coalesce(p_notes, '')), auth.uid()) returning id into v_id;
  return v_id;
end; $$;

create function public.review_deliverable_version(p_version_id uuid, p_decision public.deliverable_review_decision, p_feedback text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_deliverable_id uuid;
begin
  if not public.is_admin() then raise exception 'Deliverable 검토 권한이 없습니다.'; end if;
  select deliverable_id into v_deliverable_id from public.deliverable_versions where id = p_version_id;
  if v_deliverable_id is null then raise exception '검토할 Deliverable 버전을 찾을 수 없습니다.'; end if;
  insert into public.deliverable_reviews (deliverable_version_id, decision, feedback, reviewed_by)
  values (p_version_id, p_decision, trim(coalesce(p_feedback, '')), auth.uid()) returning id into v_id;
  update public.deliverables set status = p_decision::text::public.deliverable_status, updated_by = auth.uid() where id = v_deliverable_id;
  return v_id;
end; $$;
revoke all on function public.submit_deliverable_version(uuid, text, text) from public;
revoke all on function public.review_deliverable_version(uuid, public.deliverable_review_decision, text) from public;
grant execute on function public.submit_deliverable_version(uuid, text, text) to authenticated;
grant execute on function public.review_deliverable_version(uuid, public.deliverable_review_decision, text) to authenticated;
commit;
