begin;
revoke update on public.profiles from authenticated;
drop policy if exists profiles_admin_update on public.profiles;

create function public.admin_update_profile(p_profile_id uuid,p_display_name text,p_global_role public.app_role,p_status public.user_status)
returns void language plpgsql security definer set search_path=public as $$
declare v_current_role public.app_role;v_current_status public.user_status;v_admin_count integer;
begin
 if not public.is_admin() then raise exception '사용자 관리 권한이 없습니다.';end if;
 if length(trim(coalesce(p_display_name,'')))=0 then raise exception '표시 이름을 입력해주세요.';end if;
 select global_role,status into v_current_role,v_current_status from public.profiles where id=p_profile_id for update;
 if not found then raise exception '수정할 사용자 프로필을 찾을 수 없습니다.';end if;
 if p_profile_id=auth.uid() and (p_global_role<>v_current_role or p_status<>v_current_status) then raise exception '현재 로그인한 계정의 역할이나 상태는 직접 변경할 수 없습니다.';end if;
 if v_current_role='ADMIN' and v_current_status='ACTIVE' and (p_global_role<>'ADMIN' or p_status<>'ACTIVE') then
  select count(*) into v_admin_count from public.profiles where global_role='ADMIN' and status='ACTIVE';
  if v_admin_count<=1 then raise exception '마지막 활성 ADMIN 계정은 변경할 수 없습니다.';end if;
 end if;
 update public.profiles set display_name=trim(p_display_name),global_role=p_global_role,status=p_status,updated_at=now() where id=p_profile_id;
end;$$;
revoke all on function public.admin_update_profile(uuid,text,public.app_role,public.user_status) from public;
grant execute on function public.admin_update_profile(uuid,text,public.app_role,public.user_status) to authenticated;
commit;
