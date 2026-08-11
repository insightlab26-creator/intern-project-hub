begin;
select plan(8);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000011', 'program-test@example.com');
insert into public.profiles (id, email, display_name, global_role, status)
values ('00000000-0000-0000-0000-000000000011', 'program-test@example.com', 'Program Test', 'ADMIN', 'ACTIVE');
insert into public.interns (id, name, cohort, created_by, updated_by)
values ('30000000-0000-0000-0000-000000000011', 'Program Intern', 'Legacy Cohort',
  '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011');
insert into public.projects (id, code, name, created_by, updated_by)
values ('10000000-0000-0000-0000-000000000011', 'PROGRAM-TEST', 'Program Project',
  '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000011';

select lives_ok($$
  insert into public.programs (id, code, name, start_date, end_date, created_by, updated_by)
  values ('40000000-0000-0000-0000-000000000011', '2026-SUMMER', '2026 Summer', '2026-07-01', '2026-08-31',
    '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011')
$$, 'Admin can create a program');
select throws_ok($$
  insert into public.programs (code, name, start_date, end_date, created_by, updated_by)
  values ('INVALID-DATE', 'Invalid Date', '2026-09-01', '2026-08-01',
    '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011')
$$, '23514', null, 'Program date order is enforced');
select lives_ok($$
  insert into public.program_enrollments (program_id, intern_id, status, created_by, updated_by)
  values ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011', 'ACTIVE',
    '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011')
$$, 'An intern can be enrolled');
select throws_ok($$
  insert into public.program_enrollments (program_id, intern_id, created_by, updated_by)
  values ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011')
$$, '23505', null, 'Duplicate enrollment is rejected');
select lives_ok($$
  insert into public.program_projects (program_id, project_id, created_by, updated_by)
  values ('40000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011')
$$, 'A project can be linked to a program');
select lives_ok($$
  insert into public.project_members (project_id, intern_id, role, created_by, updated_by)
  values ('10000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011', 'OWNER',
    '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011')
$$, 'An intern can become a project member');
select is((select role::text from public.project_members), 'OWNER', 'Project member role is retained');
select is((select cohort from public.interns), 'Legacy Cohort', 'Legacy cohort remains unchanged');

select * from finish();
rollback;
