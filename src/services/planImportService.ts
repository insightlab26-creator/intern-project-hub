import type ExcelJS from "exceljs";
import { supabase } from "../supabase";
import type { PlanImportData, PlanImportProject, PlanImportResult, PlanImportTask, PlanImportWorkstream, ProjectStatus, TaskPriority, TaskStatus, WorkstreamStatus } from "../types/domain";

const projectHeaders = ["project_code","project_name","description","status","start_date","target_end_date"];
const workstreamHeaders = ["project_code","workstream_name","description","status","sort_order"];
const taskHeaders = ["project_code","workstream_name","task_title","description","status","priority","parent_task_title","assignees","start_date","due_date"];
const projectStatuses = new Set(["PLANNING","ACTIVE","ON_HOLD","COMPLETED","ARCHIVED"]);
const workstreamStatuses = new Set(["PLANNING","ACTIVE","ON_HOLD","COMPLETED"]);
const taskStatuses = new Set(["TODO","IN_PROGRESS","REVIEW","DONE","HOLD"]);
const priorities = new Set(["LOW","MEDIUM","HIGH"]);

const sample: PlanImportData = {
  projects:[{projectCode:"VAI-2026-01",projectName:"영상·AI 융합 기술 아이템 기획",description:"영상과 AI를 결합한 기술 아이템을 발굴하고 서비스 콘셉트를 기획한다.",status:"ACTIVE",startDate:"2026-08-03",targetEndDate:"2026-09-18"}],
  workstreams:[{projectCode:"VAI-2026-01",workstreamName:"시장 및 기술 조사",description:"영상 AI 기술 동향과 사례를 조사한다.",status:"ACTIVE",sortOrder:1},{projectCode:"VAI-2026-01",workstreamName:"서비스 기획",description:"아이템과 사용자 흐름을 구체화한다.",status:"PLANNING",sortOrder:2}],
  tasks:[{projectCode:"VAI-2026-01",workstreamName:"시장 및 기술 조사",taskTitle:"영상 AI 기술 동향 조사",description:"국내외 기술 및 서비스 사례 조사",status:"IN_PROGRESS",priority:"HIGH",parentTaskTitle:null,assigneeNames:["김도윤","이서연"],startDate:"2026-08-03",dueDate:"2026-08-10"},{projectCode:"VAI-2026-01",workstreamName:"서비스 기획",taskTitle:"기술 아이템 후보 도출",description:"후보 아이템 5개와 평가 기준 작성",status:"TODO",priority:"HIGH",parentTaskTitle:null,assigneeNames:["김도윤","최유나"],startDate:"2026-08-17",dueDate:"2026-08-24"}],
};

export async function downloadPlanImportTemplate() {
  const ExcelRuntime=(await import("exceljs")).default;
  const workbook = new ExcelRuntime.Workbook();
  workbook.creator = "Intern Project Hub";
  addSheet(workbook,"Projects",projectHeaders,sample.projects.map(x=>[x.projectCode,x.projectName,x.description,x.status,x.startDate,x.targetEndDate]));
  addSheet(workbook,"Workstreams",workstreamHeaders,sample.workstreams.map(x=>[x.projectCode,x.workstreamName,x.description,x.status,x.sortOrder]));
  addSheet(workbook,"Tasks",taskHeaders,sample.tasks.map(x=>[x.projectCode,x.workstreamName,x.taskTitle,x.description,x.status,x.priority,x.parentTaskTitle??"",x.assigneeNames.join(","),x.startDate,x.dueDate]));
  const guide=workbook.addWorksheet("Guide");
  guide.addRows([["항목","허용 값 / 작성 방법"],["Project status","PLANNING, ACTIVE, ON_HOLD, COMPLETED, ARCHIVED"],["Workstream status","PLANNING, ACTIVE, ON_HOLD, COMPLETED"],["Task status","TODO, IN_PROGRESS, REVIEW, DONE, HOLD"],["Task priority","LOW, MEDIUM, HIGH"],["assignees","Interns에 등록된 정확한 이름을 쉼표로 구분"],["parent_task_title","같은 Project와 Workstream에 포함된 상위 Task 제목"],["날짜","YYYY-MM-DD"]]);
  guide.columns=[{width:24},{width:70}]; styleHeader(guide.getRow(1));
  const buffer=await workbook.xlsx.writeBuffer();
  const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob); const anchor=document.createElement("a");anchor.href=url;anchor.download="project-plan-import-template.xlsx";anchor.click();URL.revokeObjectURL(url);
}

export async function parsePlanImportFile(file:File):Promise<{data:PlanImportData;errors:string[]}>{
  const ExcelRuntime=(await import("exceljs")).default;const workbook=new ExcelRuntime.Workbook();await workbook.xlsx.load(await file.arrayBuffer());
  const errors:string[]=[];
  const projects=readRows(workbook,"Projects",projectHeaders,errors).map(r=>({projectCode:r.project_code,projectName:r.project_name,description:r.description,status:r.status as ProjectStatus,startDate:date(r.start_date),targetEndDate:date(r.target_end_date)} satisfies PlanImportProject));
  const workstreams=readRows(workbook,"Workstreams",workstreamHeaders,errors).map(r=>({projectCode:r.project_code,workstreamName:r.workstream_name,description:r.description,status:r.status as WorkstreamStatus,sortOrder:Number(r.sort_order)} satisfies PlanImportWorkstream));
  const tasks=readRows(workbook,"Tasks",taskHeaders,errors).map(r=>({projectCode:r.project_code,workstreamName:r.workstream_name,taskTitle:r.task_title,description:r.description,status:r.status as TaskStatus,priority:r.priority as TaskPriority,parentTaskTitle:r.parent_task_title||null,assigneeNames:r.assignees.split(",").map(x=>x.trim()).filter(Boolean),startDate:date(r.start_date),dueDate:date(r.due_date)} satisfies PlanImportTask));
  validate({projects,workstreams,tasks},errors);return{data:{projects,workstreams,tasks},errors};
}

export async function importPlan(data:PlanImportData):Promise<PlanImportResult>{
  const {data:result,error}=await supabase.rpc("import_project_plan",{p_projects:data.projects.map(x=>({project_code:x.projectCode,project_name:x.projectName,description:x.description,status:x.status,start_date:x.startDate,target_end_date:x.targetEndDate})),p_workstreams:data.workstreams.map(x=>({project_code:x.projectCode,workstream_name:x.workstreamName,description:x.description,status:x.status,sort_order:x.sortOrder})),p_tasks:data.tasks.map(x=>({project_code:x.projectCode,workstream_name:x.workstreamName,task_title:x.taskTitle,description:x.description,status:x.status,priority:x.priority,parent_task_title:x.parentTaskTitle,assignee_names:x.assigneeNames,start_date:x.startDate,due_date:x.dueDate}))});
  if(error)throw new Error(`계획 일괄 등록 실패: ${error.message}`);const x=result as Record<string,number>;return{projectCount:x.project_count,workstreamCount:x.workstream_count,taskCount:x.task_count,assigneeCount:x.assignee_count};
}

function addSheet(workbook:ExcelJS.Workbook,name:string,headers:string[],rows:(string|number|null)[][]){const sheet=workbook.addWorksheet(name);sheet.addRow(headers);rows.forEach(row=>sheet.addRow(row));sheet.columns=headers.map((_,i)=>({width:i===2?45:22}));styleHeader(sheet.getRow(1));sheet.views=[{state:"frozen",ySplit:1}];sheet.autoFilter={from:"A1",to:`${String.fromCharCode(64+headers.length)}1`};}
function styleHeader(row:ExcelJS.Row){row.font={bold:true,color:{argb:"FFFFFFFF"}};row.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF3B82F6"}};row.alignment={vertical:"middle"};}
function readRows(workbook:ExcelJS.Workbook,name:string,headers:string[],errors:string[]){const sheet=workbook.getWorksheet(name);if(!sheet){errors.push(`${name} 시트가 없습니다.`);return[];}const actual=(sheet.getRow(1).values as unknown[]).slice(1).map(String);headers.forEach((h,i)=>{if(actual[i]!==h)errors.push(`${name} 시트 ${i+1}열은 ${h}여야 합니다.`)});const rows:Record<string,string>[]=[];sheet.eachRow((row,n)=>{if(n===1)return;const values=headers.map((_,i)=>cellText(row.getCell(i+1)));if(values.every(x=>!x))return;rows.push(Object.fromEntries(headers.map((h,i)=>[h,values[i]])));});return rows;}
function cellText(cell:ExcelJS.Cell){if(cell.value instanceof Date)return cell.value.toISOString().slice(0,10);return cell.text.trim();}
function date(value:string){return value||null;}
function validate(data:PlanImportData,errors:string[]){const codes=new Set<string>(),ws=new Set<string>(),tasks=new Set<string>();data.projects.forEach((x,i)=>{if(!x.projectCode||!x.projectName)errors.push(`Projects ${i+2}행: 코드와 이름은 필수입니다.`);if(codes.has(x.projectCode))errors.push(`Projects ${i+2}행: 프로젝트 코드가 중복됩니다.`);codes.add(x.projectCode);if(!projectStatuses.has(x.status))errors.push(`Projects ${i+2}행: 상태가 올바르지 않습니다.`);if(x.startDate&&x.targetEndDate&&x.startDate>x.targetEndDate)errors.push(`Projects ${i+2}행: 기간이 올바르지 않습니다.`)});data.workstreams.forEach((x,i)=>{const key=`${x.projectCode}|${x.workstreamName}`;if(!codes.has(x.projectCode))errors.push(`Workstreams ${i+2}행: Project 코드가 없습니다.`);if(ws.has(key))errors.push(`Workstreams ${i+2}행: Workstream이 중복됩니다.`);ws.add(key);if(!x.workstreamName||!workstreamStatuses.has(x.status)||!Number.isInteger(x.sortOrder)||x.sortOrder<1)errors.push(`Workstreams ${i+2}행: 이름, 상태 또는 순서를 확인하세요.`)});data.tasks.forEach((x,i)=>{const wsKey=`${x.projectCode}|${x.workstreamName}`,key=`${wsKey}|${x.taskTitle}`;if(!ws.has(wsKey))errors.push(`Tasks ${i+2}행: Workstream을 찾을 수 없습니다.`);if(tasks.has(key))errors.push(`Tasks ${i+2}행: Task 제목이 중복됩니다.`);tasks.add(key);if(!x.taskTitle||!taskStatuses.has(x.status)||!priorities.has(x.priority))errors.push(`Tasks ${i+2}행: 제목, 상태 또는 우선순위를 확인하세요.`);if(x.startDate&&x.dueDate&&x.startDate>x.dueDate)errors.push(`Tasks ${i+2}행: 기간이 올바르지 않습니다.`)});data.tasks.forEach((x,i)=>{if(x.parentTaskTitle&&!tasks.has(`${x.projectCode}|${x.workstreamName}|${x.parentTaskTitle}`))errors.push(`Tasks ${i+2}행: 상위 Task를 찾을 수 없습니다.`)});if(!data.projects.length)errors.push("등록할 Project가 없습니다.");}
