begin;
select plan(8);

insert into auth.users(id,email) values('00000000-0000-0000-0000-000000000131','plan-import-admin@example.com');
insert into public.profiles(id,email,display_name,global_role,status) values('00000000-0000-0000-0000-000000000131','plan-import-admin@example.com','Plan Import Admin','ADMIN','ACTIVE');
insert into public.interns(id,name,status,created_by,updated_by) values('30000000-0000-0000-0000-000000000131','Plan Import Intern','ACTIVE','00000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000131');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000131';

create temp table imported(result jsonb);
select lives_ok($$insert into imported select public.import_project_plan(
  '[{"project_code":"IMPORT-OK","project_name":"Import Project","description":"","status":"ACTIVE","start_date":"2026-08-01","target_end_date":"2026-08-31"}]'::jsonb,
  '[{"project_code":"IMPORT-OK","workstream_name":"Planning","description":"","status":"ACTIVE","sort_order":1}]'::jsonb,
  '[{"project_code":"IMPORT-OK","workstream_name":"Planning","task_title":"Parent","description":"","status":"TODO","priority":"HIGH","parent_task_title":null,"assignee_names":["Plan Import Intern"],"start_date":"2026-08-01","due_date":"2026-08-10"},{"project_code":"IMPORT-OK","workstream_name":"Planning","task_title":"Child","description":"","status":"TODO","priority":"MEDIUM","parent_task_title":"Parent","assignee_names":[],"start_date":"2026-08-02","due_date":"2026-08-11"}]'::jsonb
)$$,'Valid plan import succeeds');
select is((select (result->>'project_count')::int from imported),1,'Result reports one project');
select is((select count(*)::int from public.workstreams w join public.projects p on p.id=w.project_id where p.code='IMPORT-OK'),1,'One workstream is created');
select is((select count(*)::int from public.tasks t join public.projects p on p.id=t.project_id where p.code='IMPORT-OK'),2,'Two tasks are created');
select ok((select child.parent_task_id=parent.id from public.tasks child join public.tasks parent on parent.project_id=child.project_id where child.title='Child' and parent.title='Parent'),'Parent task relationship is retained');
select is((select count(*)::int from public.task_assignees a join public.tasks t on t.id=a.task_id where t.title='Parent'),1,'Assignee relationship is created');

select throws_ok($$select public.import_project_plan(
  '[{"project_code":"IMPORT-ROLLBACK","project_name":"Rollback Project","description":"","status":"ACTIVE"}]'::jsonb,
  '[{"project_code":"IMPORT-ROLLBACK","workstream_name":"Planning","description":"","status":"ACTIVE","sort_order":1}]'::jsonb,
  '[{"project_code":"IMPORT-ROLLBACK","workstream_name":"Planning","task_title":"Invalid","description":"","status":"TODO","priority":"HIGH","assignee_names":["Unknown Intern"]}]'::jsonb
)$$,'P0001','활동 중인 담당 인턴 이름을 하나로 확인할 수 없습니다: Unknown Intern','Invalid assignee rolls back the entire import');
select is((select count(*)::int from public.projects where code='IMPORT-ROLLBACK'),0,'Failed import leaves no project data');

select * from finish();
rollback;
