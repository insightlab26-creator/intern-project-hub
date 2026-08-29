begin;

select plan(33);

insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000000301', 'ia@x.test'),
  ('00000000-0000-0000-0000-000000000302', 'ib@x.test'),
  ('00000000-0000-0000-0000-000000000303', 'unlinked@x.test'),
  ('00000000-0000-0000-0000-000000000304', 'admin@x.test'),
  ('00000000-0000-0000-0000-000000000305', 'manager@x.test');

update public.profiles set global_role = 'INTERN', status = 'ACTIVE'
where id in ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000303');
update public.profiles set global_role = 'ADMIN', status = 'ACTIVE' where id = '00000000-0000-0000-0000-000000000304';
update public.profiles set global_role = 'MANAGER', status = 'ACTIVE' where id = '00000000-0000-0000-0000-000000000305';

insert into public.interns(id, name, school, major, cohort, user_id, created_by, updated_by) values
  ('30000000-0000-0000-0000-000000000301', 'A', '', '', '', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000304'),
  ('30000000-0000-0000-0000-000000000302', 'B', '', '', '', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000304');
insert into public.projects(id, code, name, operator_id, created_by, updated_by) values
  ('10000000-0000-0000-0000-000000000301', 'A', 'A', '00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000304'),
  ('10000000-0000-0000-0000-000000000302', 'B', 'B', '00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000304');
insert into public.workstreams(id, project_id, name, sort_order, created_by, updated_by) values
  ('20000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000301', 'A', 1, '00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000304'),
  ('20000000-0000-0000-0000-000000000302', '10000000-0000-0000-0000-000000000302', 'B', 1, '00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000304');
insert into public.tasks(id, project_id, workstream_id, title, created_by, updated_by) values
  ('50000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000301', '20000000-0000-0000-0000-000000000301', 'A', '00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000304'),
  ('50000000-0000-0000-0000-000000000302', '10000000-0000-0000-0000-000000000302', '20000000-0000-0000-0000-000000000302', 'B', '00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000304');
insert into public.task_assignees(task_id, intern_id, assigned_by) values
  ('50000000-0000-0000-0000-000000000301', '30000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000304'),
  ('50000000-0000-0000-0000-000000000302', '30000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000304');
insert into public.task_updates(id, task_id, progress, created_by, updated_by) values
  ('60000000-0000-0000-0000-000000000301', '50000000-0000-0000-0000-000000000301', 'A', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000301'),
  ('60000000-0000-0000-0000-000000000302', '50000000-0000-0000-0000-000000000302', 'B', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000302');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000301';

select is(public.current_intern_id(), '30000000-0000-0000-0000-000000000301'::uuid, 'linked intern');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000303';
select is(public.current_intern_id(), null::uuid, 'unlinked null');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000301';

select is((select count(*) from public.interns), 1::bigint, 'self intern');
select is((select count(*) from public.interns where id = '30000000-0000-0000-0000-000000000302'), 0::bigint, 'other intern denied');
select is((select count(*) from public.tasks), 1::bigint, 'assigned task');
select is((select count(*) from public.tasks where id = '50000000-0000-0000-0000-000000000302'), 0::bigint, 'other task denied');
select is((select count(*) from public.projects), 1::bigint, 'assigned project');
select is((select count(*) from public.projects where id = '10000000-0000-0000-0000-000000000302'), 0::bigint, 'other project denied');
select is((select count(*) from public.workstreams), 1::bigint, 'assigned workstream');
select is((select count(*) from public.workstreams where id = '20000000-0000-0000-0000-000000000302'), 0::bigint, 'other workstream denied');

select lives_ok($$insert into public.task_updates(task_id, progress, created_by, updated_by) values ('50000000-0000-0000-0000-000000000301', 'ok', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000301')$$, 'assigned insert');
select throws_ok($$insert into public.task_updates(task_id, progress, created_by, updated_by) values ('50000000-0000-0000-0000-000000000302', 'x', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000301')$$, null, null, 'unassigned insert');
select throws_ok($$insert into public.task_updates(task_id, progress, created_by, updated_by) values ('50000000-0000-0000-0000-000000000301', 'x', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000301')$$, null, null, 'spoof author');
select throws_ok($$insert into public.task_updates(task_id, progress, review_status, created_by, updated_by) values ('50000000-0000-0000-0000-000000000301', 'x', 'APPROVED', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000301')$$, null, null, 'approved denied');
select throws_ok($$insert into public.task_updates(task_id, progress, review_status, created_by, updated_by) values ('50000000-0000-0000-0000-000000000301', 'x', 'CHANGES_REQUESTED', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000301')$$, null, null, 'changes denied');
select throws_ok($$insert into public.task_updates(task_id, progress, manager_feedback, created_by, updated_by) values ('50000000-0000-0000-0000-000000000301', 'x', 'bad', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000301')$$, null, null, 'feedback denied');

select is((select count(*) from public.task_updates where id = '60000000-0000-0000-0000-000000000301'), 1::bigint, 'own update');
select is((select count(*) from public.task_updates where id = '60000000-0000-0000-0000-000000000302'), 0::bigint, 'other update denied');
select is((select review_status::text from public.task_updates where id = '60000000-0000-0000-0000-000000000301'), 'PENDING', 'status readable');
select is((select manager_feedback from public.task_updates where id = '60000000-0000-0000-0000-000000000301'), '', 'feedback readable');

-- UPDATE/DELETE policies can hide rows and complete without an exception. Verify fixture state after each INTERN attempt.
update public.task_updates set progress = 'x' where id = '60000000-0000-0000-0000-000000000301';
reset role;
select is((select progress from public.task_updates where id = '60000000-0000-0000-0000-000000000301'), 'A', 'progress immutable');
set local role authenticated;

update public.task_updates set learning = 'x' where id = '60000000-0000-0000-0000-000000000301';
reset role;
select is((select learning from public.task_updates where id = '60000000-0000-0000-0000-000000000301'), '', 'content immutable');
set local role authenticated;

update public.task_updates set review_status = 'APPROVED' where id = '60000000-0000-0000-0000-000000000301';
reset role;
select is((select review_status::text from public.task_updates where id = '60000000-0000-0000-0000-000000000301'), 'PENDING', 'review denied');
set local role authenticated;

update public.task_updates set manager_feedback = 'x' where id = '60000000-0000-0000-0000-000000000301';
reset role;
select is((select manager_feedback from public.task_updates where id = '60000000-0000-0000-0000-000000000301'), '', 'feedback update denied');
set local role authenticated;

delete from public.task_updates where id = '60000000-0000-0000-0000-000000000301';
reset role;
select is((select count(*) from public.task_updates where id = '60000000-0000-0000-0000-000000000301'), 1::bigint, 'delete denied');
set local role authenticated;

select is((select count(*) from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000301']::uuid[])), 1::bigint, 'intern author label');
select is((select count(*) from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000302']::uuid[])), 0::bigint, 'other author denied');
select is((select count(*) from public.get_task_update_author_labels(array['00000000-0000-0000-0000-000000000301']::uuid[])), 0::bigint, 'profile enumeration denied');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000304';
select is((select count(*) from public.tasks), 2::bigint, 'admin regression');
select is((select count(*) from public.task_updates), 3::bigint, 'admin updates regression');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000305';
select is((select count(*) from public.tasks), 2::bigint, 'manager tasks regression');
select is((select count(*) from public.task_updates where task_id = '50000000-0000-0000-0000-000000000301'), 2::bigint, 'manager reads updates for managed project');
select is((select count(*) from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000302']::uuid[])), 1::bigint, 'manager author regression');

reset role;
select * from finish();
rollback;
