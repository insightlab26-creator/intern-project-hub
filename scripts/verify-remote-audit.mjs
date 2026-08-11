const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) throw new Error("Supabase access token is not loaded.");

const endpoint = "https://api.supabase.com/v1/projects/jpcqwtjoygvpdznvyeit/database/query";

async function query(sql) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Remote SQL verification failed (${response.status}): ${body}`);
  }
  return response.json();
}

const objects = await query(`
  select
    to_regclass('public.audit_logs') is not null as audit_logs_exists,
    to_regprocedure('public.write_audit_log()') is not null as audit_trigger_function_exists,
    to_regprocedure('public.admin_delete_entity(text,uuid)') is not null as delete_rpc_exists,
    (select count(*) from pg_trigger where tgname like 'audit_%' and not tgisinternal) as audit_trigger_count,
    (select count(*) from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='audit_logs_admin_select') as admin_policy_count;
`);

const state = objects?.[0];
if (!state?.audit_logs_exists || !state?.audit_trigger_function_exists || !state?.delete_rpc_exists || Number(state.audit_trigger_count) !== 12 || Number(state.admin_policy_count) !== 1) {
  throw new Error("Audit objects do not match the expected shape.");
}

await query(`
  begin;
  do $verify$
  declare
    admin_id uuid;
    fixture_id uuid := gen_random_uuid();
    fixture_code text := 'VERIFY_' || substr(replace(fixture_id::text, '-', ''), 1, 12);
  begin
    select id into admin_id from public.profiles where global_role='ADMIN' and status='ACTIVE' order by created_at limit 1;
    if admin_id is null then raise exception 'No active admin profile is available for rollback verification'; end if;
    perform set_config('request.jwt.claim.sub', admin_id::text, true);

    insert into public.projects(id, code, name, created_by, updated_by)
    values(fixture_id, fixture_code, 'Rollback audit verification', admin_id, admin_id);
    update public.projects set name='Rollback audit verification updated', updated_by=admin_id where id=fixture_id;
    perform public.admin_delete_entity('project', fixture_id);

    if exists(select 1 from public.projects where id=fixture_id) then raise exception 'Delete RPC did not delete the fixture'; end if;
    if (select count(*) from public.audit_logs where entity_type='projects' and entity_id=fixture_id::text and action='INSERT') <> 1 then raise exception 'Insert audit verification failed'; end if;
    if (select count(*) from public.audit_logs where entity_type='projects' and entity_id=fixture_id::text and action='UPDATE') <> 1 then raise exception 'Update audit verification failed'; end if;
    if (select count(*) from public.audit_logs where entity_type='projects' and entity_id=fixture_id::text and action='DELETE') <> 1 then raise exception 'Delete audit verification failed'; end if;
  end
  $verify$;
  rollback;
`);

console.log("Remote audit objects: OK");
console.log("Rollback create/update/delete regression: OK");
