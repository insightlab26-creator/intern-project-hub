import { supabase } from "../supabase";
import type { DashboardProjectItem, DashboardSummary, DashboardTaskItem, DashboardTeamLoad, ProjectStatus, ProjectType, TaskPriority, TaskStatus } from "../types/domain";

type TaskRow = { id:string;project_id:string;title:string;status:TaskStatus;priority:TaskPriority;start_date:string|null;due_date:string|null;updated_at:string };
type ProjectRow = { id:string;name:string;status:ProjectStatus;project_type:ProjectType;target_end_date:string|null;next_review_date:string|null;current_stage:string };
type AssigneeRow = { task_id:string;intern_id:string };
type InternRow = { id:string;name:string;status:string };

const day = (date: Date) => date.toISOString().slice(0, 10);
function weekBounds() { const now=new Date(),weekday=(now.getDay()+6)%7,monday=new Date(now);monday.setDate(now.getDate()-weekday);const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);return{start:day(monday),end:day(sunday)}; }

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [tasksResult,projectsResult,assigneesResult,internsResult,programsResult,deliverablesResult,notesResult,reviewsResult] = await Promise.all([
    supabase.from("tasks").select("id,project_id,title,status,priority,start_date,due_date,updated_at").order("updated_at",{ascending:false}),
    supabase.from("projects").select("id,name,status,project_type,target_end_date,next_review_date,current_stage"),
    supabase.from("task_assignees").select("task_id,intern_id"),
    supabase.from("interns").select("id,name,status"),
    supabase.from("programs").select("id,status"),
    supabase.from("deliverables").select("id,status"),
    supabase.from("manager_notes").select("id,status"),
    supabase.from("intern_reviews").select("id,status"),
  ]);
  const results=[tasksResult,projectsResult,assigneesResult,internsResult,programsResult,deliverablesResult,notesResult,reviewsResult];
  const failed=results.find((result)=>result.error);
  if(failed?.error) throw new Error(`Dashboard 조회 실패: ${failed.error.message}`);

  const tasks=(tasksResult.data??[]) as TaskRow[], projects=(projectsResult.data??[]) as ProjectRow[],assignees=(assigneesResult.data??[]) as AssigneeRow[],interns=(internsResult.data??[]) as InternRow[];
  const projectNames=new Map(projects.map((project)=>[project.id,project.name])),internNames=new Map(interns.map((intern)=>[intern.id,intern.name])),internIdsByTask=new Map<string,string[]>();
  assignees.forEach((assignee)=>internIdsByTask.set(assignee.task_id,[...(internIdsByTask.get(assignee.task_id)??[]),assignee.intern_id]));
  const mapTask=(task:TaskRow):DashboardTaskItem=>({id:task.id,title:task.title,projectName:projectNames.get(task.project_id)??"알 수 없는 프로젝트",status:task.status,priority:task.priority,dueDate:task.due_date,updatedAt:task.updated_at,assigneeNames:(internIdsByTask.get(task.id)??[]).map((id)=>internNames.get(id)).filter((name):name is string=>Boolean(name))});

  const today=day(new Date()),soon=new Date();soon.setDate(soon.getDate()+7);const soonDay=day(soon),incomplete=tasks.filter((task)=>task.status!=="DONE");
  const dueAlerts=incomplete.filter((task)=>task.due_date&&task.due_date<=soonDay).sort((a,b)=>(a.due_date??"").localeCompare(b.due_date??""));
  const {start,end}=weekBounds();
  const weekly=tasks.filter((task)=>(task.start_date!==null&&task.start_date<=end&&(!task.due_date||task.due_date>=start))||(task.due_date!==null&&task.due_date>=start&&task.due_date<=end));
  const weeklyStatusCounts:Record<TaskStatus,number>={TODO:0,IN_PROGRESS:0,REVIEW:0,DONE:0,HOLD:0};weekly.forEach((task)=>weeklyStatusCounts[task.status]++);
  const loads=new Map<string|null,DashboardTeamLoad>();
  incomplete.forEach((task)=>{const ids=internIdsByTask.get(task.id)??[null];ids.forEach((id)=>{const current=loads.get(id)??{internId:id,name:id?internNames.get(id)??"알 수 없는 인턴":"미배정",total:0,todo:0,inProgress:0,review:0,hold:0};current.total++;if(task.status==="TODO")current.todo++;if(task.status==="IN_PROGRESS")current.inProgress++;if(task.status==="REVIEW")current.review++;if(task.status==="HOLD")current.hold++;loads.set(id,current);});});
  const done=tasks.filter((task)=>task.status==="DONE").length,weeklyDone=weeklyStatusCounts.DONE;

  return {
    exploreProjectCount:projects.filter(project=>project.project_type==="EXPLORE").length,buildProjectCount:projects.filter(project=>project.project_type==="BUILD").length,projectReviewCount:projects.filter(project=>project.status==="REVIEW").length,revisionProjectCount:projects.filter(project=>project.status==="REVISION").length,overdueProjectCount:projects.filter(project=>project.target_end_date&&project.target_end_date<today&&!['COMPLETED','ARCHIVED','DROPPED'].includes(project.status)).length,upcomingReviewProjects:projects.filter(project=>project.next_review_date&&project.next_review_date>=today).sort((a,b)=>(a.next_review_date??'').localeCompare(b.next_review_date??'')).slice(0,5).map((project):DashboardProjectItem=>({id:project.id,name:project.name,projectType:project.project_type,status:project.status,targetEndDate:project.target_end_date,nextReviewDate:project.next_review_date,currentStage:project.current_stage})),
    totalTaskCount:tasks.length,inProgressTaskCount:tasks.filter((task)=>task.status==="IN_PROGRESS").length,completionRate:tasks.length?Math.round(done/tasks.length*100):0,dueSoonCount:incomplete.filter((task)=>task.due_date&&task.due_date>=today&&task.due_date<=soonDay).length,
    activeProjectCount:projects.filter((project)=>project.status==="ACTIVE").length,activeProgramCount:((programsResult.data??[]) as {status:string}[]).filter((program)=>program.status==="ACTIVE").length,activeInternCount:interns.filter((intern)=>intern.status==="ACTIVE").length,
    overdueTaskCount:incomplete.filter((task)=>task.due_date&&task.due_date<today).length,unassignedTaskCount:incomplete.filter((task)=>(internIdsByTask.get(task.id)??[]).length===0).length,reviewTaskCount:tasks.filter((task)=>task.status==="REVIEW").length,
    pendingDeliverableCount:((deliverablesResult.data??[]) as {status:string}[]).filter((item)=>item.status!=="ARCHIVED").length,openManagerNoteCount:((notesResult.data??[]) as {status:string}[]).filter((note)=>note.status==="OPEN").length,
    finalizedReviewCount:((reviewsResult.data??[]) as {status:string}[]).filter((review)=>review.status==="FINALIZED").length,
    resourceCount:0,
    weeklyTotal:weekly.length,weeklyDone,weeklyProgressRate:weekly.length?Math.round(weeklyDone/weekly.length*100):0,weeklyStatusCounts,teamLoads:[...loads.values()].sort((a,b)=>b.total-a.total),recentTasks:tasks.slice(0,5).map(mapTask),dueAlerts:dueAlerts.slice(0,7).map(mapTask),reviewTasks:tasks.filter((task)=>task.status==="REVIEW").slice(0,5).map(mapTask),
  };
}
