import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatInternDate, internPriorityLabel, internTaskStatusLabel, useInternLocale } from "../../i18n/internLocale";
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
  const { locale, t } = useInternLocale();
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

  if (loading) return <V2EmptyState title={t("state.loadingTasks")} description={t("tasks.description")} />;
  if (profileMissing) return <V2EmptyState title={t("state.internMissing")} description={t("state.internMissingDescription")} />;
  if (error) return <section className="v2-intern-tasks"><V2PageHeader eyebrow={t("tasks.eyebrow")} title={t("tasks.title")} description={t("tasks.description")} /><V2Card><V2EmptyState title={t("tasks.loadError")} description={error} action={<button className="v2-button v2-button--secondary" type="button" onClick={() => void load()}>{t("common.tryAgain")}</button>} /></V2Card></section>;

  return <section className="v2-intern-tasks">
    <V2PageHeader eyebrow={t("tasks.eyebrow")} title={t("tasks.title")} description={t("tasks.description")} />
    <div className="v2-intern-tasks__summary" aria-label={t("tasks.summary")}>
      <Metric label={t("tasks.title")} value={metrics.total} />
      <Metric label={t("tasks.todo")} value={metrics.todo} />
      <Metric label={t("tasks.inProgress")} value={metrics.inProgress} />
      <Metric label={t("tasks.overdue")} value={metrics.overdue} danger />
    </div>
    <div className="v2-intern-tasks__filters">
      <V2Input aria-label={t("tasks.search")} placeholder={t("tasks.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
      <V2Select aria-label={t("tasks.filterStatus")} value={status} onChange={(event) => setStatus(event.target.value as "ALL" | TaskStatus)}><option value="ALL">{t("tasks.allStatuses")}</option>{taskStatuses.map((item) => <option key={item} value={item}>{internTaskStatusLabel(item, locale)}</option>)}</V2Select>
      <V2Select aria-label={t("tasks.filterProject")} value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="ALL">{t("tasks.allProjects")}</option>{taskProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</V2Select>
      <V2Select aria-label={t("tasks.filterOverdue")} value={overdueOnly ? "OVERDUE" : "ALL"} onChange={(event) => setOverdueOnly(event.target.value === "OVERDUE")}><option value="ALL">{t("tasks.allDue")}</option><option value="OVERDUE">{t("tasks.overdueOption")}</option></V2Select>
    </div>
    {data.tasks.length === 0 ? <V2Card><V2EmptyState title={t("tasks.none")} description={t("home.noTasksDescription")} /></V2Card> : filteredTasks.length === 0 ? <V2Card><V2EmptyState title={t("tasks.noMatch")} description={t("tasks.adjust")} /></V2Card> : <div className="v2-intern-tasks__table-wrap"><table className="v2-table v2-intern-tasks__table"><thead><tr><th>{t("tasks.title")}</th><th>{t("common.project")}</th><th>{t("tasks.workstream")}</th><th>{t("common.status")}</th><th>{t("common.priority")}</th><th>{t("common.due")}</th></tr></thead><tbody>{filteredTasks.map((task) => {
      const project = projectsById.get(task.projectId);
      const workstream = workstreamsById.get(task.workstreamId);
      const overdue = isOverdueTask(task, today);
      return <tr key={task.id}><td><Link to={`/intern/tasks/${task.id}`}>{task.title}</Link>{task.description && <small>{task.description}</small>}</td><td>{project?.name ?? t("common.projectUnavailable")}</td><td>{workstream?.name ?? "—"}</td><td><V2Badge variant={statusVariant[task.status]}>{internTaskStatusLabel(task.status, locale)}</V2Badge></td><td><V2Badge variant={priorityVariant[task.priority]}>{internPriorityLabel(task.priority, locale)}</V2Badge></td><td className={overdue ? "v2-intern-tasks__due--overdue" : undefined}><span>{formatInternDate(task.dueDate, locale)}</span>{overdue && task.dueDate && <small>{t("common.overdueDays", { count: overdueDays(task.dueDate, today) })}</small>}</td></tr>;
    })}</tbody></table></div>}
  </section>;
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <V2Card className={`v2-intern-tasks__metric${danger ? " v2-intern-tasks__metric--danger" : ""}`}><small>{label}</small><strong>{value}</strong></V2Card>;
}
