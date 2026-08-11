import { supabase } from "../supabase";
import type { GlobalSearchResult, SearchScope } from "../types/domain";

type Row = Record<string, unknown>;
type Spec = { scope:SearchScope;table:string;columns:string;title:string;description:string[];context:(row:Row)=>string;path:(row:Row)=>string;updatedAt?:string };
const specs:Spec[]=[
  {scope:"PROJECTS",table:"projects",columns:"id,code,name,description,status,updated_at",title:"name",description:["code","description"],context:(row)=>String(row.status),path:(row)=>`/projects/${row.id}`,updatedAt:"updated_at"},
  {scope:"WORKSTREAMS",table:"workstreams",columns:"id,project_id,name,description,status,updated_at",title:"name",description:["description"],context:(row)=>String(row.status),path:(row)=>`/projects/${row.project_id}?tab=Workstreams`,updatedAt:"updated_at"},
  {scope:"TASKS",table:"tasks",columns:"id,title,description,status,priority,updated_at",title:"title",description:["description"],context:(row)=>`${row.status} · ${row.priority}`,path:(row)=>`/tasks/${row.id}`,updatedAt:"updated_at"},
  {scope:"PROGRAMS",table:"programs",columns:"id,code,name,description,status,updated_at",title:"name",description:["code","description"],context:(row)=>String(row.status),path:(row)=>`/programs/${row.id}`,updatedAt:"updated_at"},
  {scope:"INTERNS",table:"interns",columns:"id,name,school,major,cohort,status,updated_at",title:"name",description:["school","major","cohort"],context:(row)=>String(row.status),path:()=>"/interns",updatedAt:"updated_at"},
  {scope:"DELIVERABLES",table:"deliverables",columns:"id,title,description,status,updated_at",title:"title",description:["description"],context:(row)=>row.status==="ARCHIVED"?"보관":"사용 중",path:()=>"/documents",updatedAt:"updated_at"},
  {scope:"MANAGER_NOTES",table:"manager_notes",columns:"id,subject,content,note_type,status,updated_at",title:"subject",description:["content"],context:(row)=>`${row.note_type} · ${row.status}`,path:()=>"/manager-notes",updatedAt:"updated_at"},
];
const clean=(value:unknown)=>String(value??"").trim();
export async function globalSearch(query:string,scopes:SearchScope[]):Promise<GlobalSearchResult[]>{const needle=query.trim().toLocaleLowerCase("ko-KR");if(needle.length<2)return[];const selected=specs.filter((spec)=>scopes.includes(spec.scope));const responses=await Promise.all(selected.map((spec)=>supabase.from(spec.table).select(spec.columns).limit(500)));const failed=responses.find((response)=>response.error);if(failed?.error)throw new Error(`통합 검색 실패: ${failed.error.message}`);return responses.flatMap((response,index)=>{const spec=selected[index];return((response.data??[]) as unknown as Row[]).filter((row)=>[row[spec.title],...spec.description.map((field)=>row[field])].some((value)=>clean(value).toLocaleLowerCase("ko-KR").includes(needle))).map((row)=>({id:clean(row.id),scope:spec.scope,title:clean(row[spec.title]),description:spec.description.map((field)=>clean(row[field])).filter(Boolean).join(" · ").slice(0,240),context:spec.context(row),path:spec.path(row),updatedAt:spec.updatedAt?clean(row[spec.updatedAt])||null:null}));}).sort((a,b)=>(b.updatedAt??"").localeCompare(a.updatedAt??"")).slice(0,100);}
