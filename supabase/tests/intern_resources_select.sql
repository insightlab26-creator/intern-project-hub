begin;

select plan(38);

insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000000401', 'resource-intern-a@x.test'),
  ('00000000-0000-0000-0000-000000000402', 'resource-intern-b@x.test'),
  ('00000000-0000-0000-0000-000000000403', 'resource-unlinked@x.test'),
  ('00000000-0000-0000-0000-000000000404', 'resource-admin@x.test'),
  ('00000000-0000-0000-0000-000000000405', 'resource-manager@x.test');

update public.profiles set global_role = 'INTERN', status = 'ACTIVE'
where id in (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000402',
  '00000000-0000-0000-0000-000000000403'
);
update public.profiles set global_role = 'ADMIN', status = 'ACTIVE'
where id = '00000000-0000-0000-0000-000000000404';
update public.profiles set global_role = 'MANAGER', status = 'ACTIVE'
where id = '00000000-0000-0000-0000-000000000405';

insert into public.interns(id, name, school, major, cohort, user_id, created_by, updated_by) values
  ('30000000-0000-0000-0000-000000000401', 'Resource Intern A', '', '', '', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('30000000-0000-0000-0000-000000000402', 'Resource Intern B', '', '', '', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404');

insert into public.projects(id, code, name, operator_id, created_by, updated_by) values
  ('10000000-0000-0000-0000-000000000401', 'RESOURCE-A', 'Resource Project A', '00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('10000000-0000-0000-0000-000000000402', 'RESOURCE-B', 'Resource Project B', '00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404');
insert into public.workstreams(id, project_id, name, sort_order, created_by, updated_by) values
  ('20000000-0000-0000-0000-000000000401', '10000000-0000-0000-0000-000000000401', 'Project A Workstream', 1, '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('20000000-0000-0000-0000-000000000402', '10000000-0000-0000-0000-000000000402', 'Project B Workstream', 1, '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404');
insert into public.tasks(id, project_id, workstream_id, title, created_by, updated_by) values
  ('50000000-0000-0000-0000-000000000401', '10000000-0000-0000-0000-000000000401', '20000000-0000-0000-0000-000000000401', 'Project A task for Intern A', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('50000000-0000-0000-0000-000000000402', '10000000-0000-0000-0000-000000000401', '20000000-0000-0000-0000-000000000401', 'Project A task for Intern B', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('50000000-0000-0000-0000-000000000403', '10000000-0000-0000-0000-000000000402', '20000000-0000-0000-0000-000000000402', 'Project B task for Intern B', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404');
insert into public.task_assignees(task_id, intern_id, assigned_by) values
  ('50000000-0000-0000-0000-000000000401', '30000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000404'),
  ('50000000-0000-0000-0000-000000000402', '30000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000404'),
  ('50000000-0000-0000-0000-000000000403', '30000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000404');

insert into public.resources(id, project_id, task_id, title, url, created_by, updated_by) values
  ('70000000-0000-0000-0000-000000000401', '10000000-0000-0000-0000-000000000401', null, 'Project A shared resource', 'https://example.test/resources/a-project', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('70000000-0000-0000-0000-000000000402', '10000000-0000-0000-0000-000000000401', '50000000-0000-0000-0000-000000000401', 'Project A Intern A resource', 'https://example.test/resources/a-a1', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('70000000-0000-0000-0000-000000000403', '10000000-0000-0000-0000-000000000401', '50000000-0000-0000-0000-000000000402', 'Project A Intern B resource', 'https://example.test/resources/a-a2', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('70000000-0000-0000-0000-000000000404', '10000000-0000-0000-0000-000000000402', null, 'Project B shared resource', 'https://example.test/resources/b-project', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('70000000-0000-0000-0000-000000000405', '10000000-0000-0000-0000-000000000402', '50000000-0000-0000-0000-000000000403', 'Project B Intern B resource', 'https://example.test/resources/b-b1', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404');

insert into public.deliverables(id, project_id, task_id, title, created_by, updated_by) values
  ('72000000-0000-0000-0000-000000000401', '10000000-0000-0000-0000-000000000401', null, 'Project A shared deliverable', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('72000000-0000-0000-0000-000000000402', '10000000-0000-0000-0000-000000000401', '50000000-0000-0000-0000-000000000401', 'Project A Intern A deliverable', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('72000000-0000-0000-0000-000000000403', '10000000-0000-0000-0000-000000000401', '50000000-0000-0000-0000-000000000402', 'Project A Intern B deliverable', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('72000000-0000-0000-0000-000000000404', '10000000-0000-0000-0000-000000000402', null, 'Project B shared deliverable', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404'),
  ('72000000-0000-0000-0000-000000000405', '10000000-0000-0000-0000-000000000402', '50000000-0000-0000-0000-000000000403', 'Project B Intern B deliverable', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000404');
insert into public.deliverable_versions(id, deliverable_id, version_number, url, submitted_by) values
  ('73000000-0000-0000-0000-000000000401', '72000000-0000-0000-0000-000000000401', 1, 'https://example.test/versions/a-project', '00000000-0000-0000-0000-000000000404'),
  ('73000000-0000-0000-0000-000000000402', '72000000-0000-0000-0000-000000000402', 1, 'https://example.test/versions/a-a1', '00000000-0000-0000-0000-000000000404'),
  ('73000000-0000-0000-0000-000000000403', '72000000-0000-0000-0000-000000000403', 1, 'https://example.test/versions/a-a2', '00000000-0000-0000-0000-000000000404'),
  ('73000000-0000-0000-0000-000000000404', '72000000-0000-0000-0000-000000000404', 1, 'https://example.test/versions/b-project', '00000000-0000-0000-0000-000000000404'),
  ('73000000-0000-0000-0000-000000000405', '72000000-0000-0000-0000-000000000405', 1, 'https://example.test/versions/b-b1', '00000000-0000-0000-0000-000000000404');
insert into public.deliverable_reviews(deliverable_version_id, decision, feedback, reviewed_by) values
  ('73000000-0000-0000-0000-000000000401', 'APPROVED', 'Only administrators and managers may read this review.', '00000000-0000-0000-0000-000000000404');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000401';

select is((select count(*) from public.resources), 2::bigint, 'Intern A reads only shared and assigned resources in Project A');
select is((select count(*) from public.resources where id = '70000000-0000-0000-0000-000000000401'), 1::bigint, 'Intern A reads Project A shared resource');
select is((select count(*) from public.resources where id = '70000000-0000-0000-0000-000000000402'), 1::bigint, 'Intern A reads its assigned-task resource');
select is((select count(*) from public.resources where id = '70000000-0000-0000-0000-000000000403'), 0::bigint, 'Intern A cannot read Intern B task resource in Project A');
select is((select count(*) from public.resources where id = '70000000-0000-0000-0000-000000000404'), 0::bigint, 'Intern A cannot read Project B shared resource');
select is((select count(*) from public.resources where id = '70000000-0000-0000-0000-000000000405'), 0::bigint, 'Intern A cannot read Project B task resource');

select is((select count(*) from public.deliverables), 2::bigint, 'Intern A reads only shared and assigned deliverables in Project A');
select is((select count(*) from public.deliverables where id = '72000000-0000-0000-0000-000000000401'), 1::bigint, 'Intern A reads Project A shared deliverable');
select is((select count(*) from public.deliverables where id = '72000000-0000-0000-0000-000000000402'), 1::bigint, 'Intern A reads its assigned-task deliverable');
select is((select count(*) from public.deliverables where id = '72000000-0000-0000-0000-000000000403'), 0::bigint, 'Intern A cannot read Intern B task deliverable in Project A');
select is((select count(*) from public.deliverables where id = '72000000-0000-0000-0000-000000000404'), 0::bigint, 'Intern A cannot read Project B shared deliverable');
select is((select count(*) from public.deliverables where id = '72000000-0000-0000-0000-000000000405'), 0::bigint, 'Intern A cannot read Project B task deliverable');

select is((select count(*) from public.deliverable_versions), 2::bigint, 'Intern A reads versions only through visible parent deliverables');
select is((select count(*) from public.deliverable_versions where id = '73000000-0000-0000-0000-000000000401'), 1::bigint, 'Intern A reads shared deliverable version');
select is((select count(*) from public.deliverable_versions where id = '73000000-0000-0000-0000-000000000402'), 1::bigint, 'Intern A reads assigned-task deliverable version');
select is((select count(*) from public.deliverable_versions where id = '73000000-0000-0000-0000-000000000403'), 0::bigint, 'Intern A cannot read Intern B deliverable version');
select is((select count(*) from public.deliverable_versions where id = '73000000-0000-0000-0000-000000000404'), 0::bigint, 'Intern A cannot read Project B shared deliverable version');
select is((select count(*) from public.deliverable_versions where id = '73000000-0000-0000-0000-000000000405'), 0::bigint, 'Intern A cannot read Project B task deliverable version');
select is((select count(*) from public.deliverable_reviews), 0::bigint, 'Intern A cannot read deliverable reviews');

select throws_ok($$insert into public.resources(id, project_id, title, url, created_by, updated_by) values ('70000000-0000-0000-0000-000000000499', '10000000-0000-0000-0000-000000000401', 'Denied resource', 'https://example.test/denied-resource', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000401')$$, null, null, 'Intern A cannot insert resources');
update public.resources set title = 'Changed by Intern A' where id = '70000000-0000-0000-0000-000000000401';
reset role;
select is((select title from public.resources where id = '70000000-0000-0000-0000-000000000401'), 'Project A shared resource', 'Intern A cannot update resources');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000401';
delete from public.resources where id = '70000000-0000-0000-0000-000000000401';
reset role;
select is((select count(*) from public.resources where id = '70000000-0000-0000-0000-000000000401'), 1::bigint, 'Intern A cannot delete resources');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000401';

select throws_ok($$insert into public.deliverables(id, project_id, title, created_by, updated_by) values ('72000000-0000-0000-0000-000000000499', '10000000-0000-0000-0000-000000000401', 'Denied deliverable', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000401')$$, null, null, 'Intern A cannot insert deliverables');
update public.deliverables set title = 'Changed by Intern A' where id = '72000000-0000-0000-0000-000000000401';
reset role;
select is((select title from public.deliverables where id = '72000000-0000-0000-0000-000000000401'), 'Project A shared deliverable', 'Intern A cannot update deliverables');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000401';
delete from public.deliverables where id = '72000000-0000-0000-0000-000000000401';
reset role;
select is((select count(*) from public.deliverables where id = '72000000-0000-0000-0000-000000000401'), 1::bigint, 'Intern A cannot delete deliverables');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000401';

select throws_ok($$insert into public.deliverable_versions(id, deliverable_id, version_number, url, submitted_by) values ('73000000-0000-0000-0000-000000000499', '72000000-0000-0000-0000-000000000401', 2, 'https://example.test/denied-version', '00000000-0000-0000-0000-000000000401')$$, null, null, 'Intern A cannot insert deliverable versions');
update public.deliverable_versions set url = 'https://example.test/changed-version' where id = '73000000-0000-0000-0000-000000000401';
reset role;
select is((select url from public.deliverable_versions where id = '73000000-0000-0000-0000-000000000401'), 'https://example.test/versions/a-project', 'Intern A cannot update deliverable versions');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000401';
delete from public.deliverable_versions where id = '73000000-0000-0000-0000-000000000401';
reset role;
select is((select count(*) from public.deliverable_versions where id = '73000000-0000-0000-0000-000000000401'), 1::bigint, 'Intern A cannot delete deliverable versions');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000401';

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000403';
select is((select count(*) from public.resources), 0::bigint, 'unlinked INTERN cannot read resources');
select is((select count(*) from public.deliverables), 0::bigint, 'unlinked INTERN cannot read deliverables');
select is((select count(*) from public.deliverable_versions), 0::bigint, 'unlinked INTERN cannot read deliverable versions');

reset role;
update public.profiles set status = 'INACTIVE' where id = '00000000-0000-0000-0000-000000000401';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000401';
select is((select count(*) from public.resources), 0::bigint, 'inactive INTERN cannot read resources');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000404';
select is((select count(*) from public.resources), 5::bigint, 'ADMIN resources regression');
select is((select count(*) from public.deliverables), 5::bigint, 'ADMIN deliverables regression');
select is((select count(*) from public.deliverable_versions), 5::bigint, 'ADMIN deliverable versions regression');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000405';
select is((select count(*) from public.resources), 5::bigint, 'MANAGER resources regression');
select is((select count(*) from public.deliverables), 5::bigint, 'MANAGER deliverables regression');
select is((select count(*) from public.deliverable_versions), 5::bigint, 'MANAGER deliverable versions regression');

reset role;
select * from finish();
rollback;
