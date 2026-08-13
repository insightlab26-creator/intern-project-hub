import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import WorkstreamsTab from "../components/WorkstreamsTab";
import TasksTab from "../components/TasksTab";
import ScreenState from "../components/ScreenState";
import ProjectMembersTab from "../components/ProjectMembersTab";
import DocumentsPage from "./DocumentsPage";
import ReviewGatePanel from "../components/ReviewGatePanel";
import { getProjectById } from "../services/projectService";
import type { Project, ProjectStatus } from "../types/domain";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from "../constants/domainLabels";

const tabs = [
  { key: "Overview", label: "개요" },
  { key: "Work Packages", label: "실행 업무" },
  { key: "Documents", label: "자료 링크" },
  { key: "Review", label: "검토 기록" },
  { key: "Project Areas", label: "업무 영역" },
  { key: "Members", label: "참여 인턴" },
] as const;

const primaryStatusFlow: ProjectStatus[] = ["PLANNING", "ACTIVE", "REVIEW", "REVISION", "COMPLETED"];
const exceptionStatuses: ProjectStatus[] = ["ON_HOLD", "DROPPED", "ARCHIVED"];

export default function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") || "Overview";
  const [project, setProject] = useState<Project | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { await Promise.resolve(); try { setLoading(true); setError(""); setProject(await getProjectById(projectId)); } catch (e) { setError(e instanceof Error ? e.message : "프로젝트를 불러오지 못했습니다."); } finally { setLoading(false); } }, [projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  if (loading) return <ScreenState kind="loading" title="프로젝트를 불러오는 중입니다." />;
  if (error || !project) return <ScreenState kind="error" title={error || "프로젝트를 찾을 수 없습니다."} onRetry={load} />;
  const taskSaved = async () => { await load(); setRefreshKey((x) => x + 1); };
  return <>
    <Link className="back-button project-back-button" to="/projects">← Projects</Link>
    <header className="project-detail-header"><div className="project-detail-heading"><div className="project-detail-meta"><span className="project-code">{project.code}</span><span className="status-badge">{PROJECT_TYPE_LABELS[project.projectType]}</span><span className={`status-badge status-${project.status.toLowerCase()}`}>{PROJECT_STATUS_LABELS[project.status]}</span></div><h1>{project.name}</h1><p>{project.purpose || project.description || "등록된 목적이 없습니다."}</p></div><div className="project-detail-actions"><Link className="secondary-button inline-link" to={`/projects?edit=${project.id}`}>프로젝트 수정</Link>{project.teamsFolderUrl&&<a className="primary-button project-teams-link" href={project.teamsFolderUrl} target="_blank" rel="noreferrer">Teams 작업 폴더 열기 <span>↗</span></a>}</div></header>
    <nav className="project-tabs">{tabs.map((tab) => <button key={tab.key} className={activeTab === tab.key ? "project-tab active" : "project-tab"} onClick={() => setParams(tab.key === "Overview" ? {} : { tab: tab.key })}>{tab.label}</button>)}</nav>
    {activeTab === "Overview" ? <div className="project-overview-layout"><ProjectStatusFlow currentStatus={project.status}/><section className="project-overview"><OverviewCard label="현재 작업 단계" value={project.currentStage||"-"}/><OverviewCard label="프로젝트 기간" value={`${project.startDate||"-"} — ${project.targetEndDate||"-"}`}/><OverviewCard label="분야" value={project.field||"-"}/></section><section className="project-context-panel"><div className="project-context-heading"><p className="eyebrow">CONTEXT</p><h2>프로젝트 맥락</h2></div><div className="project-context-grid"><ContextItem label="배경" value={project.background}/><ContextItem label="목적" value={project.purpose}/><ContextItem label="키워드" value={project.keywords.join(", ")} tags={project.keywords}/></div></section></div> : activeTab === "Project Areas" ? <WorkstreamsTab projectId={project.id} refreshKey={refreshKey} /> : activeTab === "Work Packages" ? <TasksTab projectId={project.id} onTaskSaved={taskSaved} /> : activeTab === "Review" ? <ReviewGatePanel targetType="PROJECT" targetId={project.id}/> : activeTab === "Documents" ? <DocumentsPage projectId={project.id} embedded /> : <ProjectMembersTab projectId={project.id} />}
  </>;
}

function OverviewCard({label,value}:{label:string;value:string}){return <article className="overview-card"><span>{label}</span><strong>{value}</strong></article>}
function ContextItem({label,value,tags}:{label:string;value:string;tags?:string[]}){return <article className="project-context-item"><span>{label}</span>{tags&&tags.length>0?<div className="project-keywords">{tags.map(tag=><b key={tag}>{tag}</b>)}</div>:<p>{value||"등록된 내용이 없습니다."}</p>}</article>}

function ProjectStatusFlow({currentStatus}:{currentStatus:ProjectStatus}){
  const exceptionStatus=exceptionStatuses.includes(currentStatus)?currentStatus:null;
  return <section className={`project-status-flow${exceptionStatus?" exception":""}`} aria-label={`현재 프로젝트 상태: ${PROJECT_STATUS_LABELS[currentStatus]}`}>
    <div className="project-status-flow-heading"><div><p className="eyebrow">STATUS FLOW</p><div className="project-status-title"><h2>프로젝트 진행 상태</h2>{exceptionStatus&&<strong>{PROJECT_STATUS_LABELS[exceptionStatus]}</strong>}</div></div><span>현재 상태는 진한 테두리로 표시됩니다.</span></div>
    <div className="project-status-primary">{primaryStatusFlow.map((status,index)=><div className="project-status-step-wrap" key={status}><StatusBox status={status} active={status===currentStatus}/>{index<primaryStatusFlow.length-1&&<i aria-hidden="true">→</i>}</div>)}</div>
  </section>;
}

function StatusBox({status,active}:{status:ProjectStatus;active:boolean}){
  return <div className={`project-status-box${active?" active":""}`} aria-current={active?"step":undefined}><strong>{PROJECT_STATUS_LABELS[status]}</strong><small>{statusDescription(status)}</small></div>;
}

function statusDescription(status:ProjectStatus){
  const descriptions:Record<ProjectStatus,string>={PLANNING:"시작 전 계획",ACTIVE:"업무 수행",REVIEW:"결과 검토",REVISION:"보완 작업",COMPLETED:"프로젝트 종료",ON_HOLD:"일시 정지",DROPPED:"진행 중단",ARCHIVED:"기록 보관"};
  return descriptions[status];
}
