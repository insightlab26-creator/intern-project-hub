begin;

alter type public.audit_action add value if not exists 'INVITE';
alter type public.audit_action add value if not exists 'PASSWORD_RESET';
alter type public.audit_action add value if not exists 'DEACTIVATE';
alter type public.audit_action add value if not exists 'ACTIVATE';

create trigger audit_profiles
after update on public.profiles
for each row execute procedure public.write_audit_log();

commit;
