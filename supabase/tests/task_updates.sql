begin;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000021', 'task-update-test@example.com');
insert into public.profiles (id, email, display_name, global_role, status)
values ('00000000-0000-0000-0000-000000000021', 'task-update-test@example.com', 'Task Update Test', 'ADMIN', 'ACTIVE');
insert into public.projects (id, code, name, created_by, updated_by)
values ('10000000-0000-0000-0000-000000000021', 'UPDATE-TEST', 'Update Test', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021');
insert into public.workstreams (id, project_id, name, sort_order, created_by, updated_by)
values ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021', 'Main', 1, '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021');
insert into public.tasks (id, project_id, workstream_id, title, created_by, updated_by)
values ('50000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000021', 'Update Target', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000021';
select lives_ok($$insert into public.task_updates (id, task_id, occurred_on, progress, learning, created_by, updated_by) values ('60000000-0000-0000-0000-000000000021', '50000000-0000-0000-0000-000000000021', date '2026-08-06', 'API 연결 완료', 'RLS 테스트', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021')$$, 'Admin can append a task update');
select is((select review_status::text from public.task_updates), 'PENDING', 'New update waits for review');
select throws_ok($$insert into public.task_updates (task_id, created_by, updated_by) values ('50000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021')$$, '23514', null, 'At least one content field is required');
select throws_ok($$update public.task_updates set progress = '덮어쓰기'$$, 'P0001', 'Task 진행 기록 본문은 작성 후 변경할 수 없습니다.', 'Update history content is immutable');
select lives_ok($$update public.task_updates set review_status = 'CHANGES_REQUESTED', manager_feedback = '근거를 보완해주세요.', updated_by = '00000000-0000-0000-0000-000000000021'$$, 'Manager review fields can be updated');
select is((select manager_feedback from public.task_updates), '근거를 보완해주세요.', 'Manager feedback is retained');
select is((select count(*) from public.task_updates), 1::bigint, 'Failed writes do not add or overwrite history');
select * from finish();
rollback;
