import { supabase } from "../supabase";
import type { ReportKind, ReportRow, TaskStatus } from "../types/domain";

export type ReportFilters={startDate:string;endDate:string;projectId:string;internId:string};
type Row=Record<string,unknown>;
const text=(value:unknown)=>String(value??"");
const date=(value:unknown)=>value?text(value):"-";

export async function getReport(kind:ReportKind,filters:ReportFilters):Promise<ReportRow[]>{
  const[projectsResult,tasksResult,assigneesResult,internsResult,reviewsResult]=await Promise.all([
    supabase.from("projects").select("id,code,name,project_type,status,current_stage,start_date,target_end_date,next_review_date,field"),
    supabase.from("tasks").select("id,project_id,title,status,priority,start_date,due_date"),
    supabase.from("task_assignees").select("task_id,intern_id"),
    supabase.from("interns").select("id,name,cohort,status"),
    supabase.from("intern_reviews").select("intern_id,status,problem_understanding,research_analysis,work_quality,communication,feedback_application,ownership_growth"),
  ]);
  const responses=[projectsResult,tasksResult,assigneesResult,internsResult,reviewsResult],failed=responses.find((response)=>response.error);if(failed?.error)throw new Error(`보고서 조회 실패: ${failed.error.message}`);
  const projects=(projectsResult.data??[]) as unknown as Row[],tasks=(tasksResult.data??[]) as unknown as Row[],assignees=(assigneesResult.data??[]) as unknown as Row[],interns=(internsResult.data??[]) as unknown as Row[],reviews=(reviewsResult.data??[]) as unknown as Row[];
  const projectNames=new Map(projects.map((row)=>[text(row.id),text(row.name)])),internNames=new Map(interns.map((row)=>[text(row.id),text(row.name)]));
  const assigneeIdsByTask=new Map<string,string[]>();assignees.forEach((row)=>assigneeIdsByTask.set(text(row.task_id),[...(assigneeIdsByTask.get(text(row.task_id))??[]),text(row.intern_id)]));
  const inPeriod=(task:Row)=>{const start=text(task.start_date),due=text(task.due_date);return(!filters.startDate||!due||due>=filters.startDate)&&(!filters.endDate||!start||start<=filters.endDate)};
  const filteredTasks=tasks.filter((task)=>(!filters.projectId||text(task.project_id)===filters.projectId)&&(!filters.internId||(assigneeIdsByTask.get(text(task.id))??[]).includes(filters.internId))&&inPeriod(task));
  const today=new Date().toISOString().slice(0,10);
  if(kind==="PROJECT_PROGRESS")return projects.filter((project)=>!filters.projectId||text(project.id)===filters.projectId).map((project)=>{const list=filteredTasks.filter((task)=>text(task.project_id)===text(project.id)),done=list.filter((task)=>task.status==="DONE").length;return{"프로젝트 코드":text(project.code),"프로젝트명":text(project.name),"상태":text(project.status),"시작일":date(project.start_date),"목표 종료일":date(project.target_end_date),"전체 업무":list.length,"진행 중":list.filter((task)=>task.status==="IN_PROGRESS").length,"검토":list.filter((task)=>task.status==="REVIEW").length,"완료":done,"지연":list.filter((task)=>task.status!=="DONE"&&text(task.due_date)&&text(task.due_date)<today).length,"완료율(%)":list.length?Math.round(done/list.length*100):0};});
  if(kind==="INTERN_PERFORMANCE")return interns.filter((intern)=>!filters.internId||text(intern.id)===filters.internId).map((intern)=>{const taskIds=new Set(assignees.filter((row)=>text(row.intern_id)===text(intern.id)).map((row)=>text(row.task_id))),list=filteredTasks.filter((task)=>taskIds.has(text(task.id))),finalReviews=reviews.filter((review)=>text(review.intern_id)===text(intern.id)&&review.status==="FINALIZED");const scores=finalReviews.map((review)=>(Number(review.problem_understanding)+Number(review.research_analysis)+Number(review.work_quality)+Number(review.communication)+Number(review.feedback_application)+Number(review.ownership_growth))/6);return{"인턴명":text(intern.name),"기수":text(intern.cohort)||"-","상태":text(intern.status),"배정 업무":list.length,"진행 중":list.filter((task)=>task.status==="IN_PROGRESS").length,"검토":list.filter((task)=>task.status==="REVIEW").length,"완료":list.filter((task)=>task.status==="DONE").length,"지연":list.filter((task)=>task.status!=="DONE"&&text(task.due_date)&&text(task.due_date)<today).length,"확정 평가":finalReviews.length,"평균 평가":scores.length?Number((scores.reduce((sum,score)=>sum+score,0)/scores.length).toFixed(2)):null};});
  return filteredTasks.map((task)=>({"프로젝트":projectNames.get(text(task.project_id))??"-","업무":text(task.title),"상태":text(task.status as TaskStatus),"우선순위":text(task.priority),"담당자":(assigneeIdsByTask.get(text(task.id))??[]).map((id)=>internNames.get(id)).filter(Boolean).join(", ")||"미배정","시작일":date(task.start_date),"마감일":date(task.due_date)}));
}

const fileDate=()=>new Date().toISOString().slice(0,10);
const safeName=(value:string)=>value.replace(/[^a-zA-Z0-9가-힣_-]+/g,"_");
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download=name;anchor.click();URL.revokeObjectURL(url)}
export function exportReportCsv(rows:ReportRow[],title:string){if(!rows.length)throw new Error("내보낼 데이터가 없습니다.");const headers=Object.keys(rows[0]),escape=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`,csv=[headers.map(escape).join(","),...rows.map((row)=>headers.map((header)=>escape(row[header])).join(","))].join("\r\n");download(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}),`${safeName(title)}_${fileDate()}.csv`)}
export async function exportReportExcel(rows:ReportRow[],title:string){if(!rows.length)throw new Error("내보낼 데이터가 없습니다.");const ExcelJS=await import("exceljs");const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet(title.slice(0,31)),headers=Object.keys(rows[0]);sheet.columns=headers.map((header)=>({header,key:header,width:Math.min(40,Math.max(14,header.length+4))}));rows.forEach((row)=>sheet.addRow(row));sheet.getRow(1).font={bold:true};sheet.views=[{state:"frozen",ySplit:1}];const buffer=await workbook.xlsx.writeBuffer();download(new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),`${safeName(title)}_${fileDate()}.xlsx`)}
