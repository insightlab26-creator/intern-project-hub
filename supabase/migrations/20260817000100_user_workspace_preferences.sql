begin;

create table public.dashboard_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  widget_keys text[] not null default array['TOTAL_TASKS','IN_PROGRESS','COMPLETION_RATE','DUE_SOON'],
  updated_at timestamptz not null default now(),
  constraint dashboard_widget_keys_not_empty check(cardinality(widget_keys)>0)
);

create table public.search_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  scopes text[] not null default array['PROJECTS','TASKS','RESOURCES','DELIVERABLES','DECISIONS'],
  updated_at timestamptz not null default now(),
  constraint search_scopes_not_empty check(cardinality(scopes)>0)
);

create trigger set_dashboard_preferences_updated_at before update on public.dashboard_preferences for each row execute procedure public.set_updated_at();
create trigger set_search_preferences_updated_at before update on public.search_preferences for each row execute procedure public.set_updated_at();

grant select,insert,update on public.dashboard_preferences to authenticated;
grant select,insert,update on public.search_preferences to authenticated;
alter table public.dashboard_preferences enable row level security;
alter table public.search_preferences enable row level security;

create policy dashboard_preferences_admin_own on public.dashboard_preferences for all to authenticated
using(profile_id=auth.uid() and (select public.is_admin()))
with check(profile_id=auth.uid() and (select public.is_admin()));
create policy search_preferences_own on public.search_preferences for all to authenticated
using(profile_id=auth.uid()) with check(profile_id=auth.uid());

commit;
