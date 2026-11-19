begin;
select plan(13);

insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000000081', 'workflow-admin@example.com'),
  ('00000000-0000-0000-0000-000000000082', 'workflow-manager@example.com'),
  ('00000000-0000-0000-0000-000000000083', 'workflow-intern@example.com');
update public.profiles set global_role = 'ADMIN' where id = '00000000-0000-0000-0000-000000000081';
update public.profiles set global_role = 'MANAGER' where id = '00000000-0000-0000-0000-000000000082';
update public.profiles set global_role = 'INTERN' where id = '00000000-0000-0000-0000-000000000083';

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000081';
insert into public.projects(id, code, name, operator_id, created_by, updated_by) values
  ('10000000-0000-0000-0000-000000000081', 'WORKFLOW-TEST', 'Workflow',
   '00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081');
insert into public.workstreams(id, project_id, name, created_by, updated_by) values
  ('20000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', 'Work',
   '00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081');
insert into public.interns(id, name, user_id, created_by, updated_by) values
  ('30000000-0000-0000-0000-000000000081', 'Intern', '00000000-0000-0000-0000-000000000083',
   '00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081');
insert into public.tasks(id, project_id, workstream_id, title, expected_output, reviewer_id, created_by, updated_by) values
  ('50000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081',
   '20000000-0000-0000-0000-000000000081', 'Result', 'A reviewed link',
   '00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081');
insert into public.task_assignees(task_id, intern_id, assigned_by) values
  ('50000000-0000-0000-0000-000000000081', '30000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081');
select is((select count(*)::integer from public.project_members where project_id = '10000000-0000-0000-0000-000000000081'), 1, 'Task assignment connects project member');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000083';
select is((select count(*)::integer from public.projects), 1, 'Assigned intern sees project');
select lives_ok($$select public.start_assigned_task('50000000-0000-0000-0000-000000000081')$$, 'Assigned intern starts task');
insert into public.task_updates(task_id, progress, created_by, updated_by) values
  ('50000000-0000-0000-0000-000000000081', 'Started', '00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000083');
select is((select review_status::text from public.task_updates where task_id = '50000000-0000-0000-0000-000000000081'), 'NOT_REQUIRED', 'Intermediate update has no approval gate');
select lives_ok($$select public.submit_assigned_task('50000000-0000-0000-0000-000000000081', 'Work', 'https://example.com/result', 'First', array['30000000-0000-0000-0000-000000000081']::uuid[])$$, 'Assigned intern submits');
select is((select status::text from public.tasks where id = '50000000-0000-0000-0000-000000000081'), 'REVIEW', 'Submission enters review');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000082';
select lives_ok($$select public.decide_task_submission((select id from public.task_submissions where task_id = '50000000-0000-0000-0000-000000000081'), 'CHANGES_REQUESTED', 'Improve result')$$, 'Reviewer requests changes');
select is((select status::text from public.tasks where id = '50000000-0000-0000-0000-000000000081'), 'IN_PROGRESS', 'Change request reopens task');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000083';
select lives_ok($$select public.submit_assigned_task('50000000-0000-0000-0000-000000000081', 'Work', 'https://example.com/result', 'Second', array['30000000-0000-0000-0000-000000000081']::uuid[])$$, 'Same URL can be resubmitted');
select is((select max(revision) from public.task_submissions where task_id = '50000000-0000-0000-0000-000000000081'), 2, 'Resubmission has a new revision');
select is((select current_version from public.deliverables where task_id = '50000000-0000-0000-0000-000000000081'), 2, 'Resubmission has a new link version');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000082';
select lives_ok($$select public.decide_task_submission((select id from public.task_submissions where task_id = '50000000-0000-0000-0000-000000000081' order by revision desc limit 1), 'APPROVED', 'Meets expectation')$$, 'Reviewer approves latest submission');
select is((select status::text from public.tasks where id = '50000000-0000-0000-0000-000000000081'), 'DONE', 'Approval completes task');

select * from finish();
rollback;
