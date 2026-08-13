import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ScreenState from "../components/ScreenState";
import { TeamDistribution, WeeklyProgress } from "../components/dashboard/DashboardCharts";
import { TASK_STATUS_LABELS } from "../constants/domainLabels";
import type { UserProfile } from "../services/authService";
import { getDashboardSummary } from "../services/dashboardService";
import { DEFAULT_DASHBOARD_WIDGETS, getDashboardWidgets, saveDashboardWidgets } from "../services/preferenceService";
import type { DashboardSummary, DashboardTaskItem, DashboardWidgetKey } from "../types/domain";

const today = () => new Date().toISOString().slice(0, 10);

export default function DashboardPage({ profile }: { profile: UserProfile }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [widgetKeys, setWidgetKeys] = useState<DashboardWidgetKey[]>(DEFAULT_DASHBOARD_WIDGETS);
  const [editingWidgets, setEditingWidgets] = useState(false);
  const [savingWidgets, setSavingWidgets] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [nextSummary, nextWidgets] = await Promise.all([getDashboardSummary(profile.global_role), profile.global_role === "ADMIN" ? getDashboardWidgets() : Promise.resolve(DEFAULT_DASHBOARD_WIDGETS)]);
      setSummary(nextSummary);
      setWidgetKeys(nextWidgets);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "대시보드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [profile.global_role]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  if (loading && !summary) return <ScreenState kind="loading" title="대시보드를 불러오는 중입니다." />;
  if (error && !summary) return <ScreenState kind="error" title={error} onRetry={load} />;
  if (!summary) return null;

  const dateLabel = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const saveWidgets = async () => { try { setSavingWidgets(true); setError(""); await saveDashboardWidgets(widgetKeys); setEditingWidgets(false); } catch (caught) { setError(caught instanceof Error ? caught.message : "Dashboard 설정을 저장하지 못했습니다."); } finally { setSavingWidgets(false); } };

  return <div className="dashboard-page">
    <div className="dashboard-controlbar">{profile.global_role === "ADMIN" ? <Link className="dashboard-search-shortcut" to="/search"><span aria-hidden="true" />검색...<kbd>⌘K</kbd></Link> : <div />}<div />{profile.global_role === "ADMIN"&&<button className="secondary-button" onClick={() => setEditingWidgets((current) => !current)}>{editingWidgets ? "설정 닫기" : "지표 설정"}</button>}<Link className="dashboard-new-task" to="/tasks">+ 새 업무</Link></div>
    <header className="dashboard-titlebar">
      <div>
        <h1>대시보드</h1>
        <p>{dateLabel} · 오늘 완료할 일이 {summary.dueAlerts.filter((task) => task.dueDate === today()).length}개 있어요</p>
      </div>
    </header>

    {error && <div className="notice-message">{error}</div>}

    {editingWidgets && <WidgetEditor selected={widgetKeys} setSelected={setWidgetKeys} saving={savingWidgets} onSave={() => void saveWidgets()} />}
    <section className="dashboard-metrics dashboard-primary-metrics dashboard-metrics-configurable">{widgetKeys.map((key) => { const metric=getMetric(key,summary); return <Metric key={key} {...metric} />; })}</section>

    <section className="dashboard-card portfolio-card"><div className="dashboard-card-heading"><div><span>CONTROL TOWER</span><h2>Project 포트폴리오</h2></div><Link to="/projects">전체 보기</Link></div><div className="dashboard-metrics portfolio-metrics"><Metric label="EXPLORE" value={`${summary.exploreProjectCount}개`} description="아이디어 탐색·검증" tone="blue"/><Metric label="BUILD" value={`${summary.buildProjectCount}개`} description="신규 결과물 구축" tone="green"/><Metric label="REFINE" value={`${summary.refineProjectCount}개`} description="기존 결과물 고도화" tone="blue"/><Metric label="Review / Revision" value={`${summary.projectReviewCount} / ${summary.revisionProjectCount}`} description="검토 / 수정 중" tone="orange"/><Metric label="지연 Project" value={`${summary.overdueProjectCount}개`} description="목표 종료일 초과" tone="red"/></div></section>

    <section className="dashboard-chart-grid">
      <WeeklyProgress summary={summary} />
      <TeamDistribution loads={summary.teamLoads} />
    </section>

    <section className="dashboard-bottom-grid">
      <TaskPanel title="할 일 목록" items={summary.recentTasks} />
      <DueAlerts items={summary.dueAlerts} />
    </section>

    {profile.global_role === "ADMIN" && <section className="dashboard-admin-section">
      <div className="admin-section-label">관리자 전용</div>
      <TaskPanel title="검토 대기 업무" items={summary.reviewTasks} review />
    </section>}
  </div>;
}

const widgetLabels:Record<DashboardWidgetKey,string>={TOTAL_TASKS:"전체 업무",IN_PROGRESS:"진행 중",COMPLETION_RATE:"완료율",DUE_SOON:"마감 임박",ACTIVE_PROJECTS:"활성 Project",ACTIVE_PROGRAMS:"활성 Program",ACTIVE_INTERNS:"활동 Intern",OVERDUE_TASKS:"지연 업무",UNASSIGNED_TASKS:"미배정 업무",REVIEW_TASKS:"검토 대기",PENDING_DELIVERABLES:"등록 Documents",OPEN_MANAGER_NOTES:"미해결 Manager Note",FINALIZED_REVIEWS:"확정 평가",RESOURCE_COUNT:"기존 Resource"};
const widgetKeys=(Object.keys(widgetLabels) as DashboardWidgetKey[]).filter((key)=>key!=="RESOURCE_COUNT"&&key!=="OPEN_MANAGER_NOTES");
function getMetric(key:DashboardWidgetKey,summary:DashboardSummary){const values:Record<DashboardWidgetKey,{value:string;description:string;tone:string}>={TOTAL_TASKS:{value:`${summary.totalTaskCount}건`,description:"등록된 전체 업무",tone:"blue"},IN_PROGRESS:{value:`${summary.inProgressTaskCount}건`,description:`이번 주 ${summary.weeklyStatusCounts.IN_PROGRESS}건 진행`,tone:"orange"},COMPLETION_RATE:{value:`${summary.completionRate}%`,description:"전체 업무 완료 기준",tone:"green"},DUE_SOON:{value:`${summary.dueSoonCount}건`,description:`${summary.overdueTaskCount}건 지연`,tone:"red"},ACTIVE_PROJECTS:{value:`${summary.activeProjectCount}개`,description:"현재 진행 Project",tone:"blue"},ACTIVE_PROGRAMS:{value:`${summary.activeProgramCount}개`,description:"현재 운영 Program",tone:"blue"},ACTIVE_INTERNS:{value:`${summary.activeInternCount}명`,description:"활동 중인 Intern",tone:"green"},OVERDUE_TASKS:{value:`${summary.overdueTaskCount}건`,description:"기한이 지난 미완료 업무",tone:"red"},UNASSIGNED_TASKS:{value:`${summary.unassignedTaskCount}건`,description:"담당자가 없는 업무",tone:"orange"},REVIEW_TASKS:{value:`${summary.reviewTaskCount}건`,description:"관리자 검토 대기",tone:"orange"},PENDING_DELIVERABLES:{value:`${summary.pendingDeliverableCount}건`,description:"보관되지 않은 문서 링크",tone:"blue"},OPEN_MANAGER_NOTES:{value:`${summary.openManagerNoteCount}건`,description:"미해결 운영 메모",tone:"red"},FINALIZED_REVIEWS:{value:`${summary.finalizedReviewCount}건`,description:"확정된 Intern 평가",tone:"green"},RESOURCE_COUNT:{value:`${summary.resourceCount}건`,description:"이전 자료 데이터",tone:"blue"}};return{label:widgetLabels[key],...values[key]};}

function WidgetEditor({selected,setSelected,saving,onSave}:{selected:DashboardWidgetKey[];setSelected:(keys:DashboardWidgetKey[])=>void;saving:boolean;onSave:()=>void}){const toggle=(key:DashboardWidgetKey)=>setSelected(selected.includes(key)?selected.filter((item)=>item!==key):[...selected,key]);const move=(index:number,direction:-1|1)=>{const next=[...selected],target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];setSelected(next);};return <section className="dashboard-widget-editor"><div><h2>Dashboard 지표 설정</h2><p>표시할 지표를 선택하고 순서를 조정합니다.</p></div><div className="widget-catalog">{widgetKeys.map((key)=><label key={key}><input type="checkbox" checked={selected.includes(key)} disabled={selected.length===1&&selected.includes(key)} onChange={()=>toggle(key)}/>{widgetLabels[key]}</label>)}</div><div className="widget-order-list">{selected.map((key,index)=><div key={key}><span>{index+1}. {widgetLabels[key]}</span><button disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button disabled={index===selected.length-1} onClick={()=>move(index,1)}>↓</button></div>)}</div><div className="form-actions"><button className="primary-button" disabled={saving||selected.length===0} onClick={onSave}>{saving?"저장 중...":"설정 저장"}</button></div></section>;}

function Metric({ label, value, description, tone }: { label: string; value: string; description: string; tone: string }) {
  return <article className={`metric-card metric-${tone}`}>
    <span>{label}</span><i /><strong>{value}</strong><p>{description}</p>
  </article>;
}

function TaskPanel({ title, items, review = false }: { title: string; items: DashboardTaskItem[]; review?: boolean }) {
  return <section className="dashboard-card task-panel">
    <div className="dashboard-card-heading"><h2>{title}</h2><Link to={review ? "/tasks/review" : "/tasks"}>전체 보기</Link></div>
    {items.length === 0 ? <p className="dashboard-empty">표시할 업무가 없습니다.</p> : <div className="modern-task-list">
      {items.map((item) => <Link to={`/tasks/${item.id}`} className="modern-task-row" key={item.id}>
        <span className={`task-status-mark status-${item.status.toLowerCase()}`} />
        <div><strong>{item.title}</strong><span>{item.projectName} · {item.assigneeNames.join(", ") || "미배정"}</span></div>
        <span className="status-badge">{TASK_STATUS_LABELS[item.status]}</span>
      </Link>)}
    </div>}
  </section>;
}

function DueAlerts({ items }: { items: DashboardTaskItem[] }) {
  return <section className="dashboard-card due-alert-card">
    <div className="dashboard-card-heading"><h2>마감 임박 알림</h2><Link to="/tasks">전체 보기</Link></div>
    {items.length === 0 ? <p className="dashboard-empty">마감 위험 업무가 없습니다.</p> : <div className="due-alert-list">
      {items.map((item) => {
        const remaining = Math.ceil((new Date(`${item.dueDate}T00:00:00`).getTime() - new Date(`${today()}T00:00:00`).getTime()) / 86400000);
        const level = remaining <= 0 ? "danger" : remaining <= 2 ? "warning" : "notice";
        const label = remaining < 0 ? `D+${Math.abs(remaining)}` : remaining === 0 ? "D-Day" : `D-${remaining}`;
        return <Link to={`/tasks/${item.id}`} className={`due-alert-row due-alert-${level}`} key={item.id}>
          <div><strong>{item.title}</strong><span>{item.assigneeNames.join(", ") || item.projectName}</span></div><b>{label}</b>
        </Link>;
      })}
    </div>}
  </section>;
}
