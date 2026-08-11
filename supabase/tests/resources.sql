begin;
select plan(5);
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000031', 'resource-test@example.com');
insert into public.profiles (id, email, display_name, global_role, status) values ('00000000-0000-0000-0000-000000000031', 'resource-test@example.com', 'Resource Test', 'ADMIN', 'ACTIVE');
insert into public.projects (id, code, name, created_by, updated_by) values
('10000000-0000-0000-0000-000000000031', 'RESOURCE-A', 'Resource A', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031'),
('10000000-0000-0000-0000-000000000032', 'RESOURCE-B', 'Resource B', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031');
insert into public.workstreams (id, project_id, name, sort_order, created_by, updated_by) values ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031', 'Main', 1, '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031');
insert into public.tasks (id, project_id, workstream_id, title, created_by, updated_by) values ('50000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000031', 'Resource Task', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000031';
select lives_ok($$insert into public.resources (project_id, task_id, title, url, created_by, updated_by) values ('10000000-0000-0000-0000-000000000031', '50000000-0000-0000-0000-000000000031', '설계 문서', 'https://example.com/design', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031')$$, 'Resource can link to a task in the same project');
select throws_ok($$insert into public.resources (project_id, task_id, title, url, created_by, updated_by) values ('10000000-0000-0000-0000-000000000032', '50000000-0000-0000-0000-000000000031', '잘못된 연결', 'https://example.com', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031')$$, 'P0001', 'Resource의 Task는 같은 Project에 속해야 합니다.', 'Cross-project task link is rejected');
select throws_ok($$insert into public.resources (project_id, title, url, created_by, updated_by) values ('10000000-0000-0000-0000-000000000031', '잘못된 URL', 'ftp://example.com', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031')$$, '23514', null, 'Only HTTP URLs are accepted');
select lives_ok($$update public.resources set status = 'ARCHIVED', updated_by = '00000000-0000-0000-0000-000000000031'$$, 'Resource can be archived without deletion');
select is((select status::text from public.resources), 'ARCHIVED', 'Archived status is retained');
select * from finish();
rollback;
