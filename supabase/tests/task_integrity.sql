begin;
select plan(10);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'task-test@example.com');
insert into public.profiles (id, email, display_name, global_role, status)
values ('00000000-0000-0000-0000-000000000001', 'task-test@example.com', 'Task Test', 'ADMIN', 'ACTIVE');
insert into public.projects (id, code, name, created_by, updated_by)
values ('10000000-0000-0000-0000-000000000001', 'TASK-TEST', 'Task Test',
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
insert into public.workstreams (id, project_id, name, sort_order, created_by, updated_by)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main', 1,
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Other', 2,
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
insert into public.interns (id, name, created_by, updated_by)
values
  ('30000000-0000-0000-0000-000000000001', 'Intern A', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'Intern B', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

select lives_ok($$select public.create_task_with_assignees(
  '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', null,
  'Parent', '', 'TODO', 'MEDIUM', null, null, 1,
  array['30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002']::uuid[]
)$$, 'Task and multiple assignees are saved atomically');
select is((select count(*) from public.task_assignees), 2::bigint, 'Both assignees are retained');
select throws_ok($$update public.tasks set parent_task_id = id$$, 'P0001',
  'Task 자기 자신을 상위 Task로 지정할 수 없습니다.', 'Self-parent is rejected');
select lives_ok($$
  insert into public.tasks (
    project_id, workstream_id, parent_task_id, title, sort_order,
    created_by, updated_by
  ) select
    project_id, workstream_id, id, 'Child', 2,
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  from public.tasks where title = 'Parent'
$$, 'A child task can be created in the same workstream');
select throws_ok($$
  update public.tasks
  set parent_task_id = (select id from public.tasks where title = 'Child')
  where title = 'Parent'
$$, 'P0001', 'Task 상하위 관계에 순환 구조를 만들 수 없습니다.',
  'A descendant cannot become its ancestor parent');
select lives_ok($$update public.tasks set status = 'IN_PROGRESS'$$, 'Progress status can be saved');
select is((select status::text from public.projects), 'ACTIVE', 'Project is activated');
select is((select status::text from public.workstreams where id = '20000000-0000-0000-0000-000000000001'), 'ACTIVE', 'Workstream is activated');
select throws_ok($$update public.tasks set workstream_id = '20000000-0000-0000-0000-000000000002', parent_task_id = id$$,
  'P0001', 'Task 자기 자신을 상위 Task로 지정할 수 없습니다.', 'Invalid hierarchy remains rejected');
select ok((select count(*) = 2 from public.task_assignees), 'Failed relationship updates do not lose assignees');

select * from finish();
rollback;
