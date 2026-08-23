import type { Project, Task } from "../../../types/domain";

export type ProjectTaskMetrics = {
  total: number;
  done: number;
  inReview: number;
  overdue: number;
};

export type PortfolioSummary = {
  total: number;
  active: number;
  overdue: number;
  review: number;
  completed: number;
};

const terminalStatuses = new Set(["COMPLETED", "ARCHIVED", "DROPPED"]);

function todayAsDate() { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function parseDate(value: string) { return new Date(`${value}T00:00:00`); }

export function isProjectOverdue(project: Project, today = todayAsDate()) {
  return Boolean(project.targetEndDate && parseDate(project.targetEndDate) < today && !terminalStatuses.has(project.status));
}

export function overdueDays(targetEndDate: string, today = todayAsDate()) {
  return Math.floor((today.getTime() - parseDate(targetEndDate).getTime()) / 86_400_000);
}

export function groupTaskMetrics(tasks: Task[], today = todayAsDate()) {
  const metricsByProject = new Map<string, ProjectTaskMetrics>();
  tasks.forEach((task) => {
    const metrics = metricsByProject.get(task.projectId) ?? { total: 0, done: 0, inReview: 0, overdue: 0 };
    metrics.total += 1;
    if (task.status === "DONE") metrics.done += 1;
    if (task.status === "REVIEW") metrics.inReview += 1;
    if (task.dueDate && parseDate(task.dueDate) < today && task.status !== "DONE") metrics.overdue += 1;
    metricsByProject.set(task.projectId, metrics);
  });
  return metricsByProject;
}

export function getPortfolioSummary(projects: Project[]): PortfolioSummary {
  return projects.reduce<PortfolioSummary>((summary, project) => ({
    total: summary.total + 1,
    active: summary.active + Number(project.status === "ACTIVE"),
    overdue: summary.overdue + Number(isProjectOverdue(project)),
    review: summary.review + Number(project.status === "REVIEW"),
    completed: summary.completed + Number(project.status === "COMPLETED"),
  }), { total: 0, active: 0, overdue: 0, review: 0, completed: 0 });
}
