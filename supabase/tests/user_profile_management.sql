begin;select plan(4);
insert into auth.users(id,email)values('00000000-0000-0000-0000-000000000071','admin-user-test@example.com'),('00000000-0000-0000-0000-000000000072','viewer-user-test@example.com');
insert into public.profiles(id,email,display_name,global_role,status)values('00000000-0000-0000-0000-000000000071','admin-user-test@example.com','Admin Test','ADMIN','ACTIVE'),('00000000-0000-0000-0000-000000000072','viewer-user-test@example.com','Viewer Test','VIEWER','ACTIVE');
set local role authenticated;set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000071';
select lives_ok($$select public.admin_update_profile('00000000-0000-0000-0000-000000000072','Intern Test','INTERN','ACTIVE')$$,'Admin can update another profile');
select is((select global_role::text from public.profiles where id='00000000-0000-0000-0000-000000000072'),'INTERN','Role change is retained');
select throws_ok($$select public.admin_update_profile('00000000-0000-0000-0000-000000000071','Admin Test','VIEWER','ACTIVE')$$,'P0001','현재 로그인한 계정의 역할이나 상태는 직접 변경할 수 없습니다.','Admin cannot demote self');
select throws_ok($$select public.admin_update_profile('00000000-0000-0000-0000-000000000072','','VIEWER','ACTIVE')$$,'P0001','표시 이름을 입력해주세요.','Blank display name is rejected');
select*from finish();rollback;
