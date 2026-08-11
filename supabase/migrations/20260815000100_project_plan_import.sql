begin;

create function public.import_project_plan(p_projects jsonb,p_workstreams jsonb,p_tasks jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_project record;v_workstream record;v_task record;v_project_id uuid;v_workstream_id uuid;v_task_id uuid;v_parent_id uuid;v_intern_id uuid;v_assignee text;v_task_order integer:=0;v_assignee_count integer:=0;
begin
  if not public.is_admin() then raise exception '계획 일괄 등록 권한이 없습니다.';end if;
  if jsonb_typeof(p_projects)<>'array' or jsonb_typeof(p_workstreams)<>'array' or jsonb_typeof(p_tasks)<>'array' then raise exception '가져오기 데이터 형식이 올바르지 않습니다.';end if;
  if jsonb_array_length(p_projects)=0 or jsonb_array_length(p_projects)>50 or jsonb_array_length(p_workstreams)>500 or jsonb_array_length(p_tasks)>5000 then raise exception '한 번에 등록할 수 있는 데이터 수를 초과했습니다.';end if;
  if exists(select 1 from jsonb_to_recordset(p_projects) x(project_code text,project_name text) group by upper(trim(project_code)) having count(*)>1) then raise exception 'Project 코드가 중복됩니다.';end if;
  if exists(select 1 from jsonb_to_recordset(p_projects) x(project_code text) join public.projects p on upper(p.code)=upper(trim(x.project_code))) then raise exception '이미 존재하는 Project 코드가 포함되어 있습니다.';end if;
  if exists(select 1 from jsonb_to_recordset(p_workstreams) x(project_code text,workstream_name text) group by upper(trim(project_code)),trim(workstream_name) having count(*)>1) then raise exception 'Workstream 이름이 중복됩니다.';end if;
  if exists(select 1 from jsonb_to_recordset(p_tasks) x(project_code text,workstream_name text,task_title text) group by upper(trim(project_code)),trim(workstream_name),trim(task_title) having count(*)>1) then raise exception '같은 Workstream 안의 Task 제목이 중복됩니다.';end if;

  for v_project in select * from jsonb_to_recordset(p_projects) x(project_code text,project_name text,description text,status text,start_date date,target_end_date date) loop
    if nullif(trim(v_project.project_code),'') is null or nullif(trim(v_project.project_name),'') is null then raise exception 'Project 코드와 이름은 필수입니다.';end if;
    insert into public.projects(code,name,description,status,start_date,target_end_date,created_by,updated_by)
    values(trim(v_project.project_code),trim(v_project.project_name),coalesce(trim(v_project.description),''),v_project.status::public.project_status,v_project.start_date,v_project.target_end_date,auth.uid(),auth.uid());
  end loop;

  for v_workstream in select * from jsonb_to_recordset(p_workstreams) x(project_code text,workstream_name text,description text,status text,sort_order integer) loop
    select id into v_project_id from public.projects where upper(code)=upper(trim(v_workstream.project_code));
    if v_project_id is null then raise exception 'Workstream의 Project를 찾을 수 없습니다: %',v_workstream.project_code;end if;
    insert into public.workstreams(project_id,name,description,status,sort_order,created_by,updated_by)
    values(v_project_id,trim(v_workstream.workstream_name),coalesce(trim(v_workstream.description),''),v_workstream.status::public.workstream_status,v_workstream.sort_order,auth.uid(),auth.uid());
  end loop;

  for v_task in select * from jsonb_to_recordset(p_tasks) x(project_code text,workstream_name text,task_title text,description text,status text,priority text,parent_task_title text,assignee_names jsonb,start_date date,due_date date) loop
    select p.id,w.id into v_project_id,v_workstream_id from public.projects p join public.workstreams w on w.project_id=p.id where upper(p.code)=upper(trim(v_task.project_code)) and w.name=trim(v_task.workstream_name);
    if v_project_id is null or v_workstream_id is null then raise exception 'Task의 Workstream을 찾을 수 없습니다: % / %',v_task.project_code,v_task.workstream_name;end if;
    v_task_order:=v_task_order+1;
    insert into public.tasks(project_id,workstream_id,title,description,status,priority,start_date,due_date,sort_order,created_by,updated_by)
    values(v_project_id,v_workstream_id,trim(v_task.task_title),coalesce(trim(v_task.description),''),v_task.status::public.task_status,v_task.priority::public.task_priority,v_task.start_date,v_task.due_date,v_task_order,auth.uid(),auth.uid()) returning id into v_task_id;
    for v_assignee in select jsonb_array_elements_text(coalesce(v_task.assignee_names,'[]'::jsonb)) loop
      if (select count(*) from public.interns where name=trim(v_assignee) and status<>'COMPLETED')<>1 then raise exception '활동 중인 담당 인턴 이름을 하나로 확인할 수 없습니다: %',v_assignee;end if;
      select id into v_intern_id from public.interns where name=trim(v_assignee) and status<>'COMPLETED';
      insert into public.task_assignees(task_id,intern_id,assigned_by)values(v_task_id,v_intern_id,auth.uid());v_assignee_count:=v_assignee_count+1;
    end loop;
  end loop;

  for v_task in select * from jsonb_to_recordset(p_tasks) x(project_code text,workstream_name text,task_title text,parent_task_title text) where nullif(trim(parent_task_title),'') is not null loop
    select child.id,parent.id into v_task_id,v_parent_id from public.projects p join public.workstreams w on w.project_id=p.id join public.tasks child on child.workstream_id=w.id and child.title=trim(v_task.task_title) join public.tasks parent on parent.workstream_id=w.id and parent.title=trim(v_task.parent_task_title) where upper(p.code)=upper(trim(v_task.project_code)) and w.name=trim(v_task.workstream_name);
    if v_task_id is null or v_parent_id is null then raise exception '상위 Task 관계를 연결할 수 없습니다: %',v_task.task_title;end if;
    update public.tasks set parent_task_id=v_parent_id,updated_by=auth.uid() where id=v_task_id;
  end loop;
  return jsonb_build_object('project_count',jsonb_array_length(p_projects),'workstream_count',jsonb_array_length(p_workstreams),'task_count',jsonb_array_length(p_tasks),'assignee_count',v_assignee_count);
end;
$$;

revoke all on function public.import_project_plan(jsonb,jsonb,jsonb) from public;
grant execute on function public.import_project_plan(jsonb,jsonb,jsonb) to authenticated;

commit;
