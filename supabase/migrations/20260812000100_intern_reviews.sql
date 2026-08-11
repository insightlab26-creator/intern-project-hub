begin;
create type public.intern_review_status as enum('DRAFT','FINALIZED');
create table public.intern_reviews(
 id uuid primary key default gen_random_uuid(),
 intern_id uuid not null references public.interns(id) on delete restrict,
 program_id uuid references public.programs(id) on delete restrict,
 project_id uuid references public.projects(id) on delete restrict,
 review_cycle text not null,
 problem_understanding smallint not null check(problem_understanding between 1 and 5),
 research_analysis smallint not null check(research_analysis between 1 and 5),
 work_quality smallint not null check(work_quality between 1 and 5),
 communication smallint not null check(communication between 1 and 5),
 feedback_application smallint not null check(feedback_application between 1 and 5),
 ownership_growth smallint not null check(ownership_growth between 1 and 5),
 strengths text not null default '',improvements text not null default '',growth_goals text not null default '',
 status public.intern_review_status not null default 'DRAFT',finalized_at timestamptz,
 reviewer_id uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 created_by uuid references public.profiles(id) on delete set null,updated_by uuid references public.profiles(id) on delete set null,
 constraint intern_reviews_cycle_not_blank check(length(trim(review_cycle))>0),
 constraint intern_reviews_unique unique nulls not distinct(intern_id,reviewer_id,review_cycle,program_id,project_id),
 constraint intern_reviews_finalized_at check(status<>'FINALIZED' or finalized_at is not null)
);
create index idx_intern_reviews_intern_cycle on public.intern_reviews(intern_id,review_cycle);
create index idx_intern_reviews_program on public.intern_reviews(program_id) where program_id is not null;
create function public.protect_finalized_intern_review()returns trigger language plpgsql set search_path=public as $$ begin
 if old.status='FINALIZED' and new is distinct from old then raise exception '확정된 인턴 평가는 변경할 수 없습니다.';end if;return new;end;$$;
create trigger protect_finalized_intern_review before update on public.intern_reviews for each row execute procedure public.protect_finalized_intern_review();
create trigger set_intern_reviews_updated_at before update on public.intern_reviews for each row execute procedure public.set_updated_at();
grant select,insert,update on public.intern_reviews to authenticated;alter table public.intern_reviews enable row level security;
create policy intern_reviews_admin_all on public.intern_reviews for all to authenticated using((select public.is_admin())) with check((select public.is_admin()) and reviewer_id=(select auth.uid()) and updated_by=(select auth.uid()));
commit;
