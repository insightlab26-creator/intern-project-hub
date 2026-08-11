const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token)throw new Error("Supabase access token is not loaded.");
const endpoint="https://api.supabase.com/v1/projects/jpcqwtjoygvpdznvyeit/database/query";
async function query(sql){const response=await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({query:sql})});if(!response.ok)throw new Error(`Remote SQL verification failed (${response.status}): ${await response.text()}`);return response.json();}

const objects=await query(`select to_regprocedure('public.import_project_plan(jsonb,jsonb,jsonb)') is not null as rpc_exists,(select proacl::text from pg_proc where oid=to_regprocedure('public.import_project_plan(jsonb,jsonb,jsonb)')) as grants;`);
if(!objects?.[0]?.rpc_exists)throw new Error("Plan import RPC does not exist.");

await query(`
begin;
do $verify$
declare
  admin_id uuid;intern_name text;code_ok text:='VERIFY_PLAN_'||substr(replace(gen_random_uuid()::text,'-',''),1,10);code_bad text:='VERIFY_BAD_'||substr(replace(gen_random_uuid()::text,'-',''),1,10);result jsonb;fixture_project_id uuid;fixture_ws_id uuid;fixture_parent_id uuid;fixture_child_id uuid;fixture_child_parent_id uuid;failed boolean:=false;
begin
  select id into admin_id from public.profiles where global_role='ADMIN' and status='ACTIVE' order by created_at limit 1;
  select name into intern_name from public.interns where status<>'COMPLETED' group by name having count(*)=1 order by name limit 1;
  if admin_id is null then raise exception 'No active admin';end if;
  if intern_name is null then raise exception 'No uniquely named active intern';end if;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);

  result:=public.import_project_plan(
    jsonb_build_array(jsonb_build_object('project_code',code_ok,'project_name','Rollback plan','description','verification','status','PLANNING','start_date','2026-08-05','target_end_date','2026-08-20')),
    jsonb_build_array(jsonb_build_object('project_code',code_ok,'workstream_name','Verification WS','description','verification','status','PLANNING','sort_order',1)),
    jsonb_build_array(
      jsonb_build_object('project_code',code_ok,'workstream_name','Verification WS','task_title','Parent task','description','','status','IN_PROGRESS','priority','HIGH','parent_task_title',null,'assignee_names',jsonb_build_array(intern_name),'start_date','2026-08-05','due_date','2026-08-10'),
      jsonb_build_object('project_code',code_ok,'workstream_name','Verification WS','task_title','Child task','description','','status','TODO','priority','MEDIUM','parent_task_title','Parent task','assignee_names','[]'::jsonb,'start_date','2026-08-06','due_date','2026-08-12')
    )
  );
  if result->>'project_count'<>'1' or result->>'workstream_count'<>'1' or result->>'task_count'<>'2' or result->>'assignee_count'<>'1' then raise exception 'Unexpected import result: %',result;end if;
  select p.id into fixture_project_id from public.projects p where p.code=code_ok;select w.id into fixture_ws_id from public.workstreams w where w.project_id=fixture_project_id;select t.id into fixture_parent_id from public.tasks t where t.workstream_id=fixture_ws_id and t.title='Parent task';select t.id,t.parent_task_id into fixture_child_id,fixture_child_parent_id from public.tasks t where t.workstream_id=fixture_ws_id and t.title='Child task';
  if fixture_project_id is null or fixture_ws_id is null or fixture_child_id is null or fixture_child_parent_id is distinct from fixture_parent_id then raise exception 'Imported relationship verification failed';end if;
  if (select count(*) from public.task_assignees ta join public.tasks t on t.id=ta.task_id where t.project_id=fixture_project_id)<>1 then raise exception 'Assignee verification failed';end if;

  begin
    perform public.import_project_plan(
      jsonb_build_array(jsonb_build_object('project_code',code_bad,'project_name','Must rollback','description','','status','PLANNING')),
      jsonb_build_array(jsonb_build_object('project_code',code_bad,'workstream_name','WS','description','','status','PLANNING','sort_order',1)),
      jsonb_build_array(jsonb_build_object('project_code',code_bad,'workstream_name','WS','task_title','Task','description','','status','TODO','priority','MEDIUM','assignee_names',jsonb_build_array('__UNKNOWN_INTERN__')))
    );
  exception when others then failed:=true;end;
  if not failed then raise exception 'Invalid assignee did not fail';end if;
  if exists(select 1 from public.projects where code=code_bad) then raise exception 'Invalid import left partial project data';end if;
end
$verify$;
rollback;
`);
console.log("Remote plan import RPC: OK");
console.log("Project/workstream/task/parent/assignee rollback regression: OK");
console.log("Invalid assignee full rollback regression: OK");
