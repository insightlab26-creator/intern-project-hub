begin;
select plan(9);

select ok('MANAGER' = any(enum_range(null::public.app_role)::text[]), 'MANAGER role exists');
select has_function('public', 'is_manager', array[]::text[]);
select has_function('public', 'can_manage_project', array['uuid']);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000091', 'manager@example.com'),
  ('00000000-0000-0000-0000-000000000092', 'other-manager@example.com');
update public.profiles set global_role = 'MANAGER', status = 'ACTIVE' where id in (
  '00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000092'
);
insert into public.projects (id, code, name, operator_id, created_by, updated_by) values
  ('10000000-0000-0000-0000-000000000091', 'MANAGED-1', 'Managed Project', '00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000091'),
  ('10000000-0000-0000-0000-000000000092', 'MANAGED-2', 'Other Project', '00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000092');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000091';

select is((select count(*)::integer from public.projects), 1, 'Manager sees only assigned projects');
select ok(public.is_manager(), 'Active manager is recognized');
select ok(public.can_manage_project('10000000-0000-0000-0000-000000000091'), 'Manager can manage assigned project');
select isnt(public.can_manage_project('10000000-0000-0000-0000-000000000092'), true, 'Manager cannot manage another project');
select lives_ok($$update public.projects set current_stage = 'Review', updated_by = '00000000-0000-0000-0000-000000000091' where id = '10000000-0000-0000-0000-000000000091'$$, 'Manager can update assigned project');
select throws_ok($$update public.projects set operator_id = '00000000-0000-0000-0000-000000000092', updated_by = '00000000-0000-0000-0000-000000000091' where id = '10000000-0000-0000-0000-000000000091'$$, 'P0001', 'Project 운영 담당자는 총괄 관리자만 변경할 수 있습니다.', 'Manager cannot reassign operator');

select * from finish();
rollback;
