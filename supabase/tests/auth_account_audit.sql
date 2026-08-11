begin;
select plan(2);

insert into auth.users(id,email)
values('00000000-0000-0000-0000-000000000111','auth-audit-admin@example.com'),
      ('00000000-0000-0000-0000-000000000112','auth-audit-user@example.com');
insert into public.profiles(id,email,display_name,global_role,status)
values('00000000-0000-0000-0000-000000000111','auth-audit-admin@example.com','Auth Audit Admin','ADMIN','ACTIVE'),
      ('00000000-0000-0000-0000-000000000112','auth-audit-user@example.com','Auth Audit User','VIEWER','ACTIVE');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000111';
select lives_ok(
  $$select public.admin_update_profile('00000000-0000-0000-0000-000000000112','Updated User','INTERN','ACTIVE')$$,
  'Profile update succeeds with the audit trigger enabled'
);
select ok(
  (select count(*)=1 from public.audit_logs where entity_type='profiles' and entity_id='00000000-0000-0000-0000-000000000112' and action='UPDATE'),
  'Profile update leaves one audit record'
);

select * from finish();
rollback;
