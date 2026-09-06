import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isOverdueTask } from "../../components/interns/internMetrics";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2Input } from "../../components/ui/V2Input";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { V2Select } from "../../components/ui/V2Select";
import { PROJECT_STATUS_LABELS } from "../../constants/domainLabels";
import { getCurrentIntern } from "../../services/internService";
import { getProjects } from "../../services/projectService";
import { getMyAssignedTasks } from "../../services/taskService";
import type { Intern, Project, ProjectStatus, Task } from "../../types/domain";

const projectStatuses: ProjectStatus[] = ["PLANNING", "ACTIVE", "REVIEW", "REVISION", "ON_HOLD", "COMPLETED", "DROPPED", "ARCHIVED"];
const statusVariant: Record<ProjectStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  PLANNING: "neutral", ACTIVE: "success", REVIEW: "info", REVISION: "warning", ON_HOLD: "warning", COMPLETED: "success", DROPPED: "danger", ARCHIVED: "neutral",
};

type ProjectItem = {
  project: Project;
  assigned: number;
  done: number;
  inProgress: number;
  overdue: number;
  nextDue: string | null;
};

function startOfToday() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dueTime(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";
}

function preview(value: string, limit = 180) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function buildProjectItems(projects: Project[], tasks: Task[], today: Date): ProjectItem[] {
  const tasksByProject = new Map<string, Task[]>();
  tasks.forEach((task) => {
    const projectTasks = tasksByProject.get(task.projectId);
    if (projectTasks) projectTasks.push(task);
    else tasksByProject.set(task.projectId, [task]);
  });

  return projects.flatMap((project) => {
    const assignedTasks = tasksByProject.get(project.id) ?? [];
    if (assignedTasks.length === 0) return [];
    const nextDue = assignedTasks
      .filter((task) => task.status !== "DONE" && task.dueDate)
      .sort((left, right) => dueTime(left.dueDate) - dueTime(right.dueDate))[0]?.dueDate ?? null;
    return [{
      project,
      assigned: assignedTasks.length,
      done: assignedTasks.filter((task) => task.status === "DONE").length,
      inProgress: assignedTasks.filter((task) => task.status === "IN_PROGRESS").length,
      overdue: assignedTasks.filter((task) => isOverdueTask(task, today)).length,
      nextDue,
    }];
  });
}

function sortProjectItems(items: ProjectItem[]) {
  return [...items].sort((left, right) => {
    const overdueDifference = right.overdue - left.overdue;
    if (overdueDifference) return overdueDifference;
    const dueDifference = dueTime(left.nextDue) - dueTime(right.nextDue);
    if (dueDifference) return dueDifference;
    const activeDifference = (right.assigned - right.done) - (left.assigned - left.done);
    if (activeDifference) return activeDifference;
    const completedDifference = Number(left.project.status === "COMPLETED" || left.project.status === "ARCHIVED") - Number(right.project.status === "COMPLETED" || right.project.status === "ARCHIVED");
    if (completedDifference) return completedDifference;
    return left.project.name.localeCompare(right.project.name);
  });
}

export default function InternProjectsPage() {
  const [intern, setIntern] = useState<Intern | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | ProjectStatus>("ALL");
  const today = startOfToday();

  const load = useCallback(async () => {
    setLoading(true); setError(false); setProfileMissing(false);
    try {
      const [currentIntern, assignedTasks] = await Promise.all([getCurrentIntern(), getMyAssignedTasks()]);
      if (!currentIntern) {
        setIntern(null); setTasks([]); setProjects([]); setProfileMissing(true);
        return;
      }
      const visibleProjects = assignedTasks.length ? await getProjects() : [];
      setIntern(currentIntern); setTasks(assignedTasks); setProjects(visibleProjects);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, [load]);

  const items = useMemo(() => buildProjectItems(projects, tasks, today), [projects, tasks, today]);
  const summary = useMemo(() => ({ projects: items.length, assigned: tasks.length, overdue: items.reduce((total, item) => total + item.overdue, 0) }), [items, tasks.length]);
  const visibleItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ko-KR");
    return sortProjectItems(items.filter((item) => {
      const matchesSearch = !needle || `${item.project.name} ${item.project.description}`.toLocaleLowerCase("ko-KR").includes(needle);
      return matchesSearch && (status === "ALL" || item.project.status === status);
    }));
  }, [items, query, status]);

  if (loading) return <V2Card><V2EmptyState title="Loading My Projects" description="배정된 프로젝트를 불러오고 있습니다." /></V2Card>;
  if (profileMissing) return <V2Card><V2EmptyState title="Intern profile not linked" description="현재 로그인 계정에 연결된 인턴 프로필이 없습니다. ADMIN에게 연결을 요청해주세요." /></V2Card>;
  if (error) return <section className="v2-intern-projects-page"><V2PageHeader eyebrow="MY PROJECTS" title="My Projects" description="Your assigned work, grouped by project." /><V2Card><V2EmptyState title="Unable to load your projects." description="잠시 후 다시 시도해주세요." action={<V2Button type="button" variant="secondary" onClick={() => void load()}>Retry</V2Button>} /></V2Card></section>;

  return <section className="v2-intern-projects-page">
    <V2PageHeader eyebrow="MY PROJECTS" title="My Projects" description={`Projects you're contributing to, ${intern?.name ?? "Intern"}.`} />
    <div className="v2-intern-projects-page__summary" aria-label="My project summary">
      <SummaryMetric label="PROJECTS" value={summary.projects} />
      <SummaryMetric label="ASSIGNED TASKS" value={summary.assigned} />
      <SummaryMetric label="OVERDUE" value={summary.overdue} danger />
    </div>
    <div className="v2-intern-projects-page__filters">
      <V2Input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <V2Select aria-label="Filter by project status" value={status} onChange={(event) => setStatus(event.target.value as "ALL" | ProjectStatus)}><option value="ALL">All statuses</option>{projectStatuses.map((item) => <option key={item} value={item}>{PROJECT_STATUS_LABELS[item]}</option>)}</V2Select>
    </div>
    {items.length === 0 ? <V2Card><V2EmptyState title="No projects yet." description="Projects will appear here when you're assigned work." /></V2Card> : visibleItems.length === 0 ? <V2Card><V2EmptyState title="No matching projects" description="검색어나 필터를 조정해보세요." /></V2Card> : <div className="v2-intern-projects-page__grid">{visibleItems.map((item) => <ProjectCard key={item.project.id} item={item} />)}</div>}
  </section>;
}

function SummaryMetric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <V2Card className={`v2-intern-projects-page__metric${danger ? " v2-intern-projects-page__metric--danger" : ""}`}><small>{label}</small><strong>{value}</strong></V2Card>;
}

function ProjectCard({ item }: { item: ProjectItem }) {
  const { project } = item;
  return <V2Card className={`v2-intern-projects-page__card${item.overdue ? " v2-intern-projects-page__card--overdue" : ""}`}>
    <header><div><h2><Link to={`/intern/projects/${project.id}`}>{project.name}</Link></h2>{project.description && <p>{preview(project.description)}</p>}</div><V2Badge variant={statusVariant[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</V2Badge></header>
    <div className="v2-intern-projects-page__metrics" aria-label={`${project.name} task metrics`}><span><strong>{item.assigned}</strong> Assigned</span><span><strong>{item.done}</strong> Done</span><span><strong>{item.inProgress}</strong> In Progress</span></div>
    <footer><span className={item.overdue ? "v2-intern-projects-page__overdue" : undefined}>{item.overdue ? `${item.overdue} Overdue` : "No overdue tasks"}</span><span>{item.nextDue ? `Next due ${formatDate(item.nextDue)}` : "No upcoming due"}</span></footer>
  </V2Card>;
}
