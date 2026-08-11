import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ScreenState from "../components/ScreenState";
import { getProjects } from "../services/projectService";
import { getAllTasks } from "../services/taskService";
import { getInterns } from "../services/internService";
import type { Intern, Project, Task } from "../types/domain";

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  kind: "project-start" | "project-end" | "project-review" | "task-start" | "task-due";
  projectId: string;
  taskId: string | null;
  assigneeIds: string[];
};

const kindLabels: Record<CalendarEvent["kind"], string> = {
  "project-start": "프로젝트 시작",
  "project-end": "프로젝트 종료",
  "project-review": "Next Review",
  "task-start": "업무 시작",
  "task-due": "업무 마감",
};

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

export default function CalendarPage() {
  const [current, setCurrent] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [internFilter, setInternFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [nextProjects, nextTasks, nextInterns] = await Promise.all([getProjects(), getAllTasks(), getInterns()]);
        if (active) { setProjects(nextProjects); setTasks(nextTasks); setInterns(nextInterns); }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "일정을 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedDate(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedDate]);

  const events = useMemo(() => {
    const result: CalendarEvent[] = [];
    const eligibleProjects = new Set(internFilter ? tasks.filter((task) => task.assigneeInternIds.includes(internFilter)).map((task) => task.projectId) : projects.map((project) => project.id));
    projects.forEach((project) => {
      if ((projectFilter && project.id !== projectFilter) || !eligibleProjects.has(project.id)) return;
      if (project.startDate) result.push({ id: `ps-${project.id}`, date: project.startDate, title: `${project.name} 시작`, kind: "project-start", projectId: project.id, taskId: null, assigneeIds: [] });
      if (project.targetEndDate) result.push({ id: `pe-${project.id}`, date: project.targetEndDate, title: `${project.name} 종료 예정`, kind: "project-end", projectId: project.id, taskId: null, assigneeIds: [] });
      if (project.nextReviewDate) result.push({ id: `pr-${project.id}`, date: project.nextReviewDate, title: `${project.name} Next Review`, kind: "project-review", projectId: project.id, taskId: null, assigneeIds: [] });
    });
    tasks.forEach((task) => {
      if ((projectFilter && task.projectId !== projectFilter) || (internFilter && !task.assigneeInternIds.includes(internFilter))) return;
      if (task.startDate) result.push({ id: `ts-${task.id}`, date: task.startDate, title: `${task.title} 시작`, kind: "task-start", projectId: task.projectId, taskId: task.id, assigneeIds: task.assigneeInternIds });
      if (task.dueDate) result.push({ id: `td-${task.id}`, date: task.dueDate, title: `${task.title} 마감`, kind: "task-due", projectId: task.projectId, taskId: task.id, assigneeIds: task.assigneeInternIds });
    });
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [projects, tasks, projectFilter, internFilter]);

  if (loading) return <ScreenState kind="loading" title="캘린더를 불러오는 중입니다." />;
  if (error) return <ScreenState kind="error" title={error} />;

  const year = current.getFullYear();
  const month = current.getMonth();
  const start = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - start.getDay());
  const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(gridStart); date.setDate(gridStart.getDate() + index); return date; });
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEvents = events.filter((event) => event.date.startsWith(monthPrefix));
  const selectedEvents = selectedDate ? events.filter((event) => event.date === selectedDate) : [];

  return <>
    <header className="page-header calendar-header"><div><p className="eyebrow">SCHEDULE</p><h1>Calendar</h1><p>프로젝트와 Task의 시작·마감 일정을 확인합니다.</p></div><button className="secondary-button" onClick={() => setCurrent(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>오늘</button></header>
    <section className="calendar-filters"><label>팀원<select value={internFilter} onChange={(event) => setInternFilter(event.target.value)}><option value="">전체 팀원</option>{interns.map((intern) => <option key={intern.id} value={intern.id}>{intern.name}</option>)}</select></label><label>프로젝트<select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="">전체 프로젝트</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><button className="text-button" onClick={() => { setInternFilter(""); setProjectFilter(""); }}>필터 초기화</button></section>
    <div className="calendar-layout">
      <section className="calendar-card">
        <div className="calendar-toolbar"><button aria-label="이전 달" onClick={() => setCurrent(new Date(year, month - 1, 1))}>←</button><h2>{year}년 {month + 1}월</h2><button aria-label="다음 달" onClick={() => setCurrent(new Date(year, month + 1, 1))}>→</button></div>
        <div className="calendar-weekdays">{["일", "월", "화", "수", "목", "금", "토"].map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
        <div className="calendar-grid">{days.map((day) => {
          const value = iso(day);
          const items = events.filter((event) => event.date === value);
          return <div className={`calendar-day ${day.getMonth() !== month ? "outside" : ""} ${value === iso(new Date()) ? "today" : ""}`} key={value}>
            <button type="button" className="calendar-date" aria-label={`${dateLabel(value)} 일정 보기`} onClick={() => setSelectedDate(value)}>{day.getDate()}</button>
            <div className="calendar-day-events">{items.slice(0, 3).map((item) => <span title={item.title} className={`calendar-event event-${item.kind}`} key={item.id}><i />{item.title}</span>)}{items.length > 3 && <small>+{items.length - 3}개 더 보기</small>}</div>
          </div>;
        })}</div>
      </section>
      <aside className="month-schedule"><div className="dashboard-card-heading"><div><span>MONTHLY</span><h2>{month + 1}월 일정</h2></div><small>{monthEvents.length}건</small></div>{monthEvents.length === 0 ? <p className="dashboard-empty">이번 달 일정이 없습니다.</p> : <div className="month-event-list">{monthEvents.map((event) => <Link to={event.taskId ? `/tasks/${event.taskId}` : `/projects/${event.projectId}`} key={event.id}><time>{Number(event.date.slice(8))}일</time><i className={`event-${event.kind}`} /><div><strong>{event.title}</strong><span>{projects.find((project) => project.id === event.projectId)?.name}</span></div></Link>)}</div>}</aside>
    </div>
    {selectedDate && <div className="modal-backdrop calendar-modal-backdrop" role="presentation" onMouseDown={() => setSelectedDate(null)}><section className="calendar-day-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>SCHEDULE</span><h2 id="calendar-modal-title">{dateLabel(selectedDate)}</h2><p>이 날짜에 등록된 전체 일정입니다.</p></div><button aria-label="일정 팝업 닫기" onClick={() => setSelectedDate(null)}>×</button></header>
      {selectedEvents.length === 0 ? <p className="calendar-modal-empty">등록된 일정이 없습니다.</p> : <div className="calendar-modal-list">{selectedEvents.map((event) => {
        const project = projects.find((item) => item.id === event.projectId);
        const assignees = interns.filter((intern) => event.assigneeIds.includes(intern.id)).map((intern) => intern.name);
        return <Link to={event.taskId ? `/tasks/${event.taskId}` : `/projects/${event.projectId}`} className={`calendar-modal-event event-${event.kind}`} key={event.id}><i /><div><span>{kindLabels[event.kind]}</span><strong>{event.title}</strong><small>{[project?.name, assignees.join(", ")].filter(Boolean).join(" · ")}</small></div><b>상세 보기 →</b></Link>;
      })}</div>}
    </section></div>}
  </>;
}
