import { buildInternTaskMetrics, isOverdueTask, type InternTaskMetrics } from "../../../components/interns/internMetrics";
import { groupTaskMetrics, isProjectOverdue, type ProjectTaskMetrics } from "../projects/projectMetrics";
import type { Intern, Program, Project, Task } from "../../../types/domain";
import type { UserProfile } from "../../../services/authService";

export type CommandCenterKpis = { activeProjects: number; overdueProjects: number; overdueTasks: number; tasksInReview: number; activeInterns: number; activePrograms: number };
export type AttentionKind = "OVERDUE_PROJECT" | "OVERDUE_TASK" | "IN_REVIEW" | "HOLD";
export type AttentionItem = { id: string; kind: AttentionKind; project: Project; task?: Task; overdueDays?: number; assigneeNames: string[] };
export type PortfolioItem = { project: Project; metrics: ProjectTaskMetrics; managerName: string };
export type InternWorkItem = { intern: Intern; metrics: InternTaskMetrics };

const dateValue = (value: string | null) => value ? new Date(`${value}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
const daysOverdue = (value: string | null, today = new Date()) => value ? Math.max(0, Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - dateValue(value)) / 86_400_000)) : 0;

function compareDue(left: { dueDate?: string | null; targetEndDate?: string | null }, right: { dueDate?: string | null; targetEndDate?: string | null }) {
  return dateValue(left.dueDate ?? left.targetEndDate ?? null) - dateValue(right.dueDate ?? right.targetEndDate ?? null);
}

export function buildCommandCenterMetrics({ projects, tasks, interns, programs, profiles }: { projects: Project[]; tasks: Task[]; interns: Intern[]; programs: Program[]; profiles: UserProfile[] }) {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const internMap = new Map(interns.map((intern) => [intern.id, intern]));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const metricsByProject = groupTaskMetrics(tasks);
  const internMetrics = buildInternTaskMetrics(interns, tasks);
  const assigneeNames = (task: Task) => task.assigneeInternIds.map((id) => internMap.get(id)?.name).filter((name): name is string => Boolean(name));
  const overdueProjects = projects.filter((project) => isProjectOverdue(project));
  const overdueTasks = tasks.filter((task) => isOverdueTask(task));
  const reviewTasks = tasks.filter((task) => task.status === "REVIEW");
  const holdTasks = tasks.filter((task) => task.status === "HOLD");
  const attention: AttentionItem[] = [
    ...overdueProjects.map<AttentionItem>((project) => ({ id: `project-${project.id}`, kind: "OVERDUE_PROJECT", project, overdueDays: daysOverdue(project.targetEndDate), assigneeNames: [] })),
    ...overdueTasks.flatMap<AttentionItem>((task) => { const project = projectMap.get(task.projectId); return project ? [{ id: `task-${task.id}`, kind: "OVERDUE_TASK", project, task, overdueDays: daysOverdue(task.dueDate), assigneeNames: assigneeNames(task) }] : []; }),
    ...reviewTasks.filter((task) => !isOverdueTask(task)).flatMap<AttentionItem>((task) => { const project = projectMap.get(task.projectId); return project ? [{ id: `task-${task.id}`, kind: "IN_REVIEW", project, task, assigneeNames: assigneeNames(task) }] : []; }),
    ...holdTasks.filter((task) => !isOverdueTask(task)).flatMap<AttentionItem>((task) => { const project = projectMap.get(task.projectId); return project ? [{ id: `task-${task.id}`, kind: "HOLD", project, task, assigneeNames: assigneeNames(task) }] : []; }),
  ].sort((left, right) => {
    const order: Record<AttentionKind, number> = { OVERDUE_PROJECT: 0, OVERDUE_TASK: 1, IN_REVIEW: 2, HOLD: 3 };
    if (order[left.kind] !== order[right.kind]) return order[left.kind] - order[right.kind];
    if ((right.overdueDays ?? 0) !== (left.overdueDays ?? 0)) return (right.overdueDays ?? 0) - (left.overdueDays ?? 0);
    return compareDue(left.task ?? left.project, right.task ?? right.project);
  });
  const portfolio = projects.map((project) => ({ project, metrics: metricsByProject.get(project.id) ?? { total: 0, done: 0, inReview: 0, overdue: 0, hold: 0 }, managerName: project.operatorId ? profileMap.get(project.operatorId)?.display_name ?? "Manager unavailable" : "Unassigned" })).sort((left, right) => {
    const priority = (item: PortfolioItem) => isProjectOverdue(item.project) ? 0 : item.metrics.overdue ? 1 : item.metrics.inReview ? 2 : item.project.status === "ACTIVE" ? 3 : 4;
    if (priority(left) !== priority(right)) return priority(left) - priority(right);
    return compareDue(left.project, right.project);
  });
  const internWork = interns.map((intern) => ({ intern, metrics: internMetrics.get(intern.id)! })).sort((left, right) => right.metrics.overdue - left.metrics.overdue || right.metrics.inReview - left.metrics.inReview || right.metrics.assigned - left.metrics.assigned || left.intern.name.localeCompare(right.intern.name));
  return {
    kpis: { activeProjects: projects.filter((project) => project.status === "ACTIVE").length, overdueProjects: overdueProjects.length, overdueTasks: overdueTasks.length, tasksInReview: reviewTasks.length, activeInterns: interns.filter((intern) => intern.status === "ACTIVE").length, activePrograms: programs.filter((program) => program.status === "ACTIVE").length },
    attention, portfolio, reviewTasks: [...reviewTasks].sort((left, right) => Number(isOverdueTask(right)) - Number(isOverdueTask(left)) || compareDue(left, right)), internWork,
    activePrograms: programs.filter((program) => program.status === "ACTIVE"),
  };
}
