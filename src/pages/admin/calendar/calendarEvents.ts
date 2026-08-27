import type { Intern, Project, Task, TaskStatus } from "../../../types/domain";

export type CalendarEventType = "PROJECT_START" | "PROJECT_END" | "TASK_START" | "TASK_DUE";

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  date: string;
  title: string;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  status: TaskStatus | null;
  assigneeInternIds: string[];
  assigneeNames: string[];
};

export type CalendarFilters = {
  projectId: string;
  internId: string;
  eventType: "ALL" | "PROJECT" | "TASK";
};

export const calendarEventLabels: Record<CalendarEventType, string> = {
  PROJECT_START: "Project start",
  PROJECT_END: "Project due",
  TASK_START: "Task start",
  TASK_DUE: "Task due",
};

export function buildCalendarEvents(projects: Project[], tasks: Task[], interns: Intern[], filters: CalendarFilters): CalendarEvent[] {
  const internNameById = new Map(interns.map((intern) => [intern.id, intern.name]));
  // V1-compatible semantics: an intern filter retains dates for Projects that have at least one Task assigned to that intern.
  const eligibleProjectIds = new Set(filters.internId ? tasks.filter((task) => task.assigneeInternIds.includes(filters.internId)).map((task) => task.projectId) : projects.map((project) => project.id));
  const events: CalendarEvent[] = [];

  if (filters.eventType !== "TASK") {
    projects.forEach((project) => {
      if ((filters.projectId && project.id !== filters.projectId) || !eligibleProjectIds.has(project.id)) return;
      if (project.startDate) events.push({ id: `project-start-${project.id}`, type: "PROJECT_START", date: project.startDate, title: project.name, projectId: project.id, projectName: project.name, taskId: null, taskTitle: null, status: null, assigneeInternIds: [], assigneeNames: [] });
      if (project.targetEndDate) events.push({ id: `project-end-${project.id}`, type: "PROJECT_END", date: project.targetEndDate, title: project.name, projectId: project.id, projectName: project.name, taskId: null, taskTitle: null, status: null, assigneeInternIds: [], assigneeNames: [] });
    });
  }

  if (filters.eventType !== "PROJECT") {
    tasks.forEach((task) => {
      if ((filters.projectId && task.projectId !== filters.projectId) || (filters.internId && !task.assigneeInternIds.includes(filters.internId))) return;
      const project = projects.find((item) => item.id === task.projectId);
      const assigneeNames = task.assigneeInternIds.map((id) => internNameById.get(id)).filter((name): name is string => Boolean(name));
      const base = { projectId: task.projectId, projectName: project?.name ?? "Project unavailable", taskId: task.id, taskTitle: task.title, status: task.status, assigneeInternIds: task.assigneeInternIds, assigneeNames };
      if (task.startDate) events.push({ id: `task-start-${task.id}`, type: "TASK_START", date: task.startDate, title: task.title, ...base });
      if (task.dueDate) events.push({ id: `task-due-${task.id}`, type: "TASK_DUE", date: task.dueDate, title: task.title, ...base });
    });
  }

  return events.sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getMonthDays(current: Date): Date[] {
  const year = current.getFullYear();
  const month = current.getMonth();
  const start = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - start.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

export function formatCalendarDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}
