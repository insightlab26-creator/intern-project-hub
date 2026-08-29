begin;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000221', 'author-label-admin@example.com'),
  ('00000000-0000-0000-0000-000000000222', 'author-label-manager@example.com'),
  ('00000000-0000-0000-0000-000000000223', 'author-label-other-manager@example.com'),
  ('00000000-0000-0000-0000-000000000224', 'author-label-intern@example.com');

update public.profiles set global_role = 'ADMIN', status = 'ACTIVE', display_name = 'Admin Label' where id = '00000000-0000-0000-0000-000000000221';
update public.profiles set global_role = 'MANAGER', status = 'ACTIVE', display_name = 'Managed Manager' where id = '00000000-0000-0000-0000-000000000222';
update public.profiles set global_role = 'MANAGER', status = 'ACTIVE', display_name = 'Other Manager' where id = '00000000-0000-0000-0000-000000000223';
update public.profiles set global_role = 'INTERN', status = 'ACTIVE', display_name = 'Intern Author' where id = '00000000-0000-0000-0000-000000000224';

insert into public.projects (id, code, name, operator_id, created_by, updated_by) values
  ('10000000-0000-0000-0000-000000000221', 'LABEL-MANAGED', 'Managed labels', '00000000-0000-0000-0000-000000000222', '00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000221'),
  ('10000000-0000-0000-0000-000000000222', 'LABEL-OTHER', 'Other labels', '00000000-0000-0000-0000-000000000223', '00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000221');
insert into public.workstreams (id, project_id, name, sort_order, created_by, updated_by) values
  ('20000000-0000-0000-0000-000000000221', '10000000-0000-0000-0000-000000000221', 'Managed', 1, '00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000221'),
  ('20000000-0000-0000-0000-000000000222', '10000000-0000-0000-0000-000000000222', 'Other', 1, '00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000221');
insert into public.tasks (id, project_id, workstream_id, title, created_by, updated_by) values
  ('50000000-0000-0000-0000-000000000221', '10000000-0000-0000-0000-000000000221', '20000000-0000-0000-0000-000000000221', 'Managed task', '00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000221'),
  ('50000000-0000-0000-0000-000000000222', '10000000-0000-0000-0000-000000000222', '20000000-0000-0000-0000-000000000222', 'Other task', '00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000221');
insert into public.task_updates (id, task_id, progress, created_by, updated_by) values
  ('60000000-0000-0000-0000-000000000221', '50000000-0000-0000-0000-000000000221', 'Intern update', '00000000-0000-0000-0000-000000000224', '00000000-0000-0000-0000-000000000224'),
  ('60000000-0000-0000-0000-000000000222', '50000000-0000-0000-0000-000000000221', 'Manager update', '00000000-0000-0000-0000-000000000222', '00000000-0000-0000-0000-000000000222'),
  ('60000000-0000-0000-0000-000000000223', '50000000-0000-0000-0000-000000000222', 'Other project update', '00000000-0000-0000-0000-000000000224', '00000000-0000-0000-0000-000000000224'),
  ('60000000-0000-0000-0000-000000000224', '50000000-0000-0000-0000-000000000221', 'Missing author update', null, '00000000-0000-0000-0000-000000000221');

select has_function('public', 'get_task_update_author_labels', array['uuid[]']);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000221';
select is((select display_name from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000221']::uuid[])), 'Intern Author', 'Admin reads the author label');
select throws_ok($$select email from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000221']::uuid[])$$, '42703', null, 'The read model has no email field');
select throws_ok($$select global_role from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000221']::uuid[])$$, '42703', null, 'The read model has no role field');
select throws_ok($$select status from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000221']::uuid[])$$, '42703', null, 'The read model has no status field');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000222';
select is((select count(*)::integer from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000221', '60000000-0000-0000-0000-000000000222']::uuid[])), 2, 'Manager reads multiple managed-project author labels in one batch');
select is((select display_name from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000222']::uuid[])), 'Managed Manager', 'Manager reads their own update label');
select is((select count(*)::integer from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000223']::uuid[])), 0, 'Manager cannot resolve an unmanaged-project author');
select is((select count(*)::integer from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000224']::uuid[])), 0, 'Missing author has no label row');
select is((select count(*)::integer from public.get_task_update_author_labels(array['00000000-0000-0000-0000-000000000224']::uuid[])), 0, 'A profile ID cannot be used to enumerate a label');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000224';
select is((select count(*)::integer from public.get_task_update_author_labels(array['60000000-0000-0000-0000-000000000221']::uuid[])), 0, 'An unrelated caller cannot resolve a managed-project author');

reset role;
select * from finish();
rollback;
