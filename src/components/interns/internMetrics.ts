import type { Intern, Task } from "../../types/domain";

export type InternTaskMetrics = {
  assigned: number;
  done: number;
  inProgress: number;
  inReview: number;
  hold: number;
  overdue: number;
  progress: number | null;
};

const startOfToday = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export function isOverdueTask(task: Task, today = startOfToday()) {
  return Boolean(task.dueDate && new Date(`${task.dueDate}T00:00:00`) < today && task.status !== "DONE");
}

export function buildInternTaskMetrics(interns: Intern[], tasks: Task[]) {
  const today = startOfToday();
  const metrics = new Map<string, InternTaskMetrics>(interns.map((intern) => [intern.id, { assigned: 0, done: 0, inProgress: 0, inReview: 0, hold: 0, overdue: 0, progress: null }]));
  tasks.forEach((task) => task.assigneeInternIds.forEach((internId) => {
    const current = metrics.get(internId);
    if (!current) return;
    current.assigned += 1;
    if (task.status === "DONE") current.done += 1;
    if (task.status === "IN_PROGRESS") current.inProgress += 1;
    if (task.status === "REVIEW") current.inReview += 1;
    if (task.status === "HOLD") current.hold += 1;
    if (isOverdueTask(task, today)) current.overdue += 1;
  }));
  metrics.forEach((item) => { item.progress = item.assigned ? Math.round(item.done / item.assigned * 100) : null; });
  return metrics;
}
