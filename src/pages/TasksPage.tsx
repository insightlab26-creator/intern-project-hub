import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ScreenState from "../components/ScreenState";
import { getAllTasks } from "../services/taskService";
import { getProjects } from "../services/projectService";
import { getInterns } from "../services/internService";
import type { Intern, Project, Task, TaskStatus } from "../types/domain";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "../constants/domainLabels";

export default function TasksPage({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]); const [projects, setProjects] = useState<Project[]>([]); const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { await Promise.resolve(); try { setLoading(true); setError(""); const [t, p, i] = await Promise.all([getAllTasks(), getProjects(), getInterns()]); setTasks(t); setProjects(p); setInterns(i); } catch (e) { setError(e instanceof Error ? e.message : "실행 업무 목록을 불러오지 못했습니다."); } finally { setLoading(false); } }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const get = (name: string) => params.get(name) || "";
  const set = (name: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(name, value); else next.delete(name); setParams(next); };
  const filtered = tasks.filter((task) => {
    const query = get("q").toLowerCase(); const status = reviewOnly ? "REVIEW" : get("status");
    return (!query || `${task.title} ${task.description}`.toLowerCase().includes(query)) && (!get("project") || task.projectId === get("project")) && (!status || task.status === status) && (!get("assignee") || task.assigneeInternIds.includes(get("assignee"))) && (!get("from") || !!task.dueDate && task.dueDate >= get("from")) && (!get("to") || !!task.dueDate && task.dueDate <= get("to"));
  });
  return <>
    <header className="page-header"><p className="eyebrow">WORK</p><h1>{reviewOnly ? "검토 대기 실행 업무" : "실행 업무"}</h1><p>인턴에게 배정한 결과물 단위를 프로젝트·상태·담당자·기한으로 확인합니다.</p></header>
    <section className="filter-panel"><input placeholder="제목 또는 설명 검색" value={get("q")} onChange={(e) => set("q", e.target.value)} /><select value={get("project")} onChange={(e) => set("project", e.target.value)}><option value="">모든 프로젝트</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{!reviewOnly && <select value={get("status")} onChange={(e) => set("status", e.target.value)}><option value="">모든 상태</option>{Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}<select value={get("assignee")} onChange={(e) => set("assignee", e.target.value)}><option value="">모든 담당자</option>{interns.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select><label>마감 시작<input type="date" value={get("from")} onChange={(e) => set("from", e.target.value)} /></label><label>마감 종료<input type="date" value={get("to")} onChange={(e) => set("to", e.target.value)} /></label></section>
    {loading ? <ScreenState kind="loading" title="실행 업무 목록을 불러오는 중입니다." /> : error ? <ScreenState kind="error" title={error} onRetry={load} /> : filtered.length === 0 ? <ScreenState kind="empty" title="조건에 맞는 실행 업무가 없습니다." /> : <section className="task-list-panel">{filtered.map((task) => <Link className="task-list-row" to={`/tasks/${task.id}`} key={task.id}><div><strong>{task.title}</strong><span>{projects.find((p) => p.id === task.projectId)?.name || "알 수 없는 프로젝트"}</span></div><span>{task.assigneeInternIds.map((id) => interns.find((i) => i.id === id)?.name).filter(Boolean).join(", ") || "담당자 없음"}</span><span>{task.dueDate || "기한 없음"}</span><span className="status-badge">{TASK_STATUS_LABELS[task.status as TaskStatus]}</span><span>{TASK_PRIORITY_LABELS[task.priority]}</span></Link>)}</section>}
  </>;
}
