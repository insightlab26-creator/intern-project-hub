import { getInterns } from "./internService";
import { getProjects } from "./projectService";
import { getAllTasks } from "./taskService";
import type { Intern, Project, Task, TaskStatus } from "../types/domain";
import { isOverdueTask } from "../components/interns/internMetrics";

export type ReportScope = "PORTFOLIO" | "PROJECT" | "INTERN";
export type ReportFilters = { status: "ALL" | TaskStatus; startDate: string; endDate: string; projectId: string; internId: string };
export type ReportMetrics = { total: number; inProgress: number; inReview: number; done: number; overdue: number };
export type PortfolioReportRow = { projectId: string; projectCode: string; projectName: string; projectStatus: string; tasks: number; inProgress: number; inReview: number; done: number; overdue: number; targetEndDate: string | null };
export type ProjectReportRow = { taskId: string; task: string; workstreamId: string; status: TaskStatus; priority: string; assignees: string; startDate: string | null; dueDate: string | null };
export type InternTaskReportRow = { taskId: string; task: string; projectId: string; project: string; status: TaskStatus; priority: string; startDate: string | null; dueDate: string | null };

export type AdminReportData = { projects: Project[]; tasks: Task[]; interns: Intern[] };

export async function getAdminReportData(): Promise<AdminReportData> {
  const [projects, tasks, interns] = await Promise.all([getProjects(), getAllTasks(), getInterns()]);
  return { projects, tasks, interns };
}

export function hasInvalidScheduleRange({ startDate, endDate }: Pick<ReportFilters, "startDate" | "endDate">) {
  return Boolean(startDate && endDate && endDate < startDate);
}

export function matchesTaskFilters(task: Task, filters: Pick<ReportFilters, "status" | "startDate" | "endDate">) {
  if (filters.status !== "ALL" && task.status !== filters.status) return false;
  // Schedule range means overlap with Task start/due dates. Missing dates retain V1's permissive behavior.
  return (!filters.startDate || !task.dueDate || task.dueDate >= filters.startDate)
    && (!filters.endDate || !task.startDate || task.startDate <= filters.endDate);
}

export function metricsForTasks(tasks: Task[]): ReportMetrics {
  return tasks.reduce<ReportMetrics>((metrics, task) => ({
    total: metrics.total + 1,
    inProgress: metrics.inProgress + Number(task.status === "IN_PROGRESS"),
    inReview: metrics.inReview + Number(task.status === "REVIEW"),
    done: metrics.done + Number(task.status === "DONE"),
    overdue: metrics.overdue + Number(isOverdueTask(task)),
  }), { total: 0, inProgress: 0, inReview: 0, done: 0, overdue: 0 });
}

export function buildPortfolioRows(data: AdminReportData, filters: Pick<ReportFilters, "status" | "startDate" | "endDate">): PortfolioReportRow[] {
  const tasks = data.tasks.filter((task) => matchesTaskFilters(task, filters));
  return data.projects.map((project) => {
    const metrics = metricsForTasks(tasks.filter((task) => task.projectId === project.id));
    return { projectId: project.id, projectCode: project.code, projectName: project.name, projectStatus: project.status, tasks: metrics.total, inProgress: metrics.inProgress, inReview: metrics.inReview, done: metrics.done, overdue: metrics.overdue, targetEndDate: project.targetEndDate };
  }).sort((left, right) => left.projectName.localeCompare(right.projectName, "ko-KR"));
}

function assigneeNames(task: Task, interns: Map<string, Intern>) {
  const names = task.assigneeInternIds.map((id) => interns.get(id)?.name).filter((name): name is string => Boolean(name));
  return names.length ? names.join(", ") : "Unassigned";
}

export function buildProjectRows(data: AdminReportData, filters: Pick<ReportFilters, "projectId" | "status" | "startDate" | "endDate">): ProjectReportRow[] {
  const internMap = new Map(data.interns.map((intern) => [intern.id, intern]));
  return data.tasks.filter((task) => task.projectId === filters.projectId && matchesTaskFilters(task, filters)).map((task) => ({
    taskId: task.id, task: task.title, workstreamId: task.workstreamId, status: task.status, priority: task.priority, assignees: assigneeNames(task, internMap), startDate: task.startDate, dueDate: task.dueDate,
  }));
}

export function buildInternRows(data: AdminReportData, filters: Pick<ReportFilters, "internId" | "projectId" | "status" | "startDate" | "endDate">): InternTaskReportRow[] {
  const projectMap = new Map(data.projects.map((project) => [project.id, project]));
  return data.tasks.filter((task) => task.assigneeInternIds.includes(filters.internId) && (!filters.projectId || task.projectId === filters.projectId) && matchesTaskFilters(task, filters)).map((task) => ({
    taskId: task.id, task: task.title, projectId: task.projectId, project: projectMap.get(task.projectId)?.name ?? "Project unavailable", status: task.status, priority: task.priority, startDate: task.startDate, dueDate: task.dueDate,
  }));
}
