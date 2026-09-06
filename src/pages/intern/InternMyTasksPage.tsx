import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "../../constants/domainLabels";
import { isOverdueTask } from "../../components/interns/internMetrics";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2Input } from "../../components/ui/V2Input";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { V2Select } from "../../components/ui/V2Select";
import { getCurrentIntern } from "../../services/internService";
import { getProjects } from "../../services/projectService";
import { getMyAssignedTasks } from "../../services/taskService";
import { getWorkstreamsForProjects } from "../../services/workstreamService";
import type { Project, Task, TaskPriority, TaskStatus, Workstream } from "../../types/domain";

const taskStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "HOLD"];
const statusVariant: Record<TaskStatus, "neutral" | "success" | "warning" | "info"> = {
  TODO: "neutral", IN_PROGRESS: "info", REVIEW: "warning", DONE: "success", HOLD: "neutral",
};
const priorityVariant: Record<TaskPriority, "neutral" | "warning" | "danger"> = {
  LOW: "neutral", MEDIUM: "warning", HIGH: "danger",
};

function todayStart() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";
}

function overdueDays(value: string, today: Date) {
  return Math.floor((today.getTime() - new Date(`${value}T00:00:00`).getTime()) / 86_400_000);
}

function sortTasks(tasks: Task[], today: Date) {
  const dueValue = (task: Task) => task.dueDate ? new Date(`${task.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  return [...tasks].sort((left, right) => {
    const overdueDifference = Number(isOverdueTask(right, today)) - Number(isOverdueTask(left, today));
    if (overdueDifference) return overdueDifference;
    const doneDifference = Number(left.status === "DONE") - Number(right.status === "DONE");
    if (doneDifference) return doneDifference;
    return dueValue(left) - dueValue(right) || left.title.localeCompare(right.title);
  });
}

type LoadState = { tasks: Task[]; projects: Project[]; workstreams: Workstream[] };

export default function InternMyTasksPage() {
  const [data, setData] = useState<LoadState>({ tasks: [], projects: [], workstreams: [] });
  const [loading, setLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | TaskStatus>("ALL");
  const [projectId, setProjectId] = useState("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const today = todayStart();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setProfileMissing(false);
    try {
      const [intern, tasks] = await Promise.all([getCurrentIntern(), getMyAssignedTasks()]);
      if (!intern) {
        setProfileMissing(true);
        setData({ tasks: [], projects: [], workstreams: [] });
        return;
      }

      const projectIds = [...new Set(tasks.map((task) => task.projectId))];
      const [projects, workstreams] = await Promise.all([
        getProjects(),
        getWorkstreamsForProjects(projectIds),
      ]);
      setData({ tasks, projects, workstreams });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "My Tasks를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, [load]);

  const projectsById = useMemo(() => new Map(data.projects.map((project) => [project.id, project])), [data.projects]);
  const workstreamsById = useMemo(() => new Map(data.workstreams.map((workstream) => [workstream.id, workstream])), [data.workstreams]);
  const taskProjects = useMemo(() => data.projects.filter((project) => data.tasks.some((task) => task.projectId === project.id)), [data.projects, data.tasks]);
  const metrics = useMemo(() => ({
    total: data.tasks.length,
    todo: data.tasks.filter((task) => task.status === "TODO").length,
    inProgress: data.tasks.filter((task) => task.status === "IN_PROGRESS").length,
    overdue: data.tasks.filter((task) => isOverdueTask(task, today)).length,
  }), [data.tasks, today]);
  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    return sortTasks(data.tasks.filter((task) => {
      const project = projectsById.get(task.projectId);
      const workstream = workstreamsById.get(task.workstreamId);
      const searchable = `${task.title} ${task.description} ${project?.name ?? ""} ${workstream?.name ?? ""}`.toLocaleLowerCase("ko-KR");
      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (status === "ALL" || task.status === status)
        && (projectId === "ALL" || task.projectId === projectId)
        && (!overdueOnly || isOverdueTask(task, today));
    }), today);
  }, [data.tasks, projectId, projectsById, query, status, today, overdueOnly, workstreamsById]);

  if (loading) return <V2EmptyState title="Loading My Tasks" description="배정된 업무를 불러오고 있습니다." />;
  if (profileMissing) return <V2EmptyState title="Intern profile not linked" description="현재 로그인 계정에 연결된 인턴 프로필이 없습니다. ADMIN에게 연결을 요청해주세요." />;
  if (error) return <section className="v2-intern-tasks"><V2PageHeader eyebrow="MY TASKS" title="My Tasks" description="나에게 배정된 업무를 확인합니다." /><V2Card><V2EmptyState title="Unable to load My Tasks" description={error} action={<button className="v2-button v2-button--secondary" type="button" onClick={() => void load()}>Try again</button>} /></V2Card></section>;

  return <section className="v2-intern-tasks">
    <V2PageHeader eyebrow="MY TASKS" title="My Tasks" description="나에게 배정된 업무를 우선순위와 마감일 기준으로 확인합니다." />
    <div className="v2-intern-tasks__summary" aria-label="My task summary">
      <Metric label="MY TASKS" value={metrics.total} />
      <Metric label="TO DO" value={metrics.todo} />
      <Metric label="IN PROGRESS" value={metrics.inProgress} />
      <Metric label="OVERDUE" value={metrics.overdue} danger />
    </div>
    <div className="v2-intern-tasks__filters">
      <V2Input aria-label="Search tasks" placeholder="Search tasks…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <V2Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as "ALL" | TaskStatus)}><option value="ALL">All statuses</option>{taskStatuses.map((item) => <option key={item} value={item}>{TASK_STATUS_LABELS[item]}</option>)}</V2Select>
      <V2Select aria-label="Filter by project" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="ALL">All projects</option>{taskProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</V2Select>
      <V2Select aria-label="Filter overdue tasks" value={overdueOnly ? "OVERDUE" : "ALL"} onChange={(event) => setOverdueOnly(event.target.value === "OVERDUE")}><option value="ALL">All due dates</option><option value="OVERDUE">Overdue</option></V2Select>
    </div>
    {data.tasks.length === 0 ? <V2Card><V2EmptyState title="No tasks assigned" description="현재 배정된 업무가 없습니다." /></V2Card> : filteredTasks.length === 0 ? <V2Card><V2EmptyState title="No matching tasks" description="검색어나 필터를 조정해보세요." /></V2Card> : <div className="v2-intern-tasks__table-wrap"><table className="v2-table v2-intern-tasks__table"><thead><tr><th>TASK</th><th>PROJECT</th><th>WORKSTREAM</th><th>STATUS</th><th>PRIORITY</th><th>DUE</th></tr></thead><tbody>{filteredTasks.map((task) => {
      const project = projectsById.get(task.projectId);
      const workstream = workstreamsById.get(task.workstreamId);
      const overdue = isOverdueTask(task, today);
      return <tr key={task.id}><td><Link to={`/intern/tasks/${task.id}`}>{task.title}</Link>{task.description && <small>{task.description}</small>}</td><td>{project?.name ?? "Project unavailable"}</td><td>{workstream?.name ?? "—"}</td><td><V2Badge variant={statusVariant[task.status]}>{TASK_STATUS_LABELS[task.status]}</V2Badge></td><td><V2Badge variant={priorityVariant[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</V2Badge></td><td className={overdue ? "v2-intern-tasks__due--overdue" : undefined}><span>{formatDate(task.dueDate)}</span>{overdue && task.dueDate && <small>{overdueDays(task.dueDate, today)}d overdue</small>}</td></tr>;
    })}</tbody></table></div>}
  </section>;
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <V2Card className={`v2-intern-tasks__metric${danger ? " v2-intern-tasks__metric--danger" : ""}`}><small>{label}</small><strong>{value}</strong></V2Card>;
}
