import { TASK_PRIORITY_LABELS } from "../../constants/domainLabels";
import { overdueDays } from "../../pages/admin/projects/projectMetrics";
import type { Intern, Project, Task } from "../../types/domain";
import { V2Badge } from "../ui/V2Badge";
import { V2Button } from "../ui/V2Button";
import { V2EmptyState } from "../ui/V2EmptyState";

type Props = { tasks: Task[]; projects: Map<string, Project>; interns: Map<string, Intern>; selectedTaskId: string | null; onSelect: (taskId: string) => void };
const priorityVariant = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger" } as const;
const today = () => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };
const formatDate = (date: string | null) => date ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`)) : "—";

export default function ReviewTaskTable({ tasks, projects, interns, selectedTaskId, onSelect }: Props) {
  const currentDate = today();
  if (tasks.length === 0) return <V2EmptyState title="No tasks in review" description="현재 검토 단계에 있는 실행 업무가 없습니다." />;
  return <div className="v2-table-wrap"><table className="v2-table v2-review-task-table"><thead><tr><th>TASK</th><th>PROJECT</th><th>ASSIGNEE</th><th>PRIORITY</th><th>DUE</th><th aria-label="Action" /></tr></thead><tbody>{tasks.map((task) => { const overdue = Boolean(task.dueDate && new Date(`${task.dueDate}T00:00:00`) < currentDate); const names = task.assigneeInternIds.map((id) => interns.get(id)?.name).filter((name): name is string => Boolean(name)); return <tr key={task.id} className={selectedTaskId === task.id ? "v2-review-task-table__selected" : undefined}><td><strong>{task.title}</strong>{task.startDate && <small>Start {formatDate(task.startDate)}</small>}</td><td>{projects.get(task.projectId)?.name ?? "Project unavailable"}</td><td className={names.length ? "" : "v2-muted"}>{names.length ? names.join(", ") : "Unassigned"}</td><td><V2Badge variant={priorityVariant[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</V2Badge></td><td><div className="v2-review-task-due"><span>{formatDate(task.dueDate)}</span>{overdue && task.dueDate && <small className="v2-danger-text">{overdueDays(task.dueDate, currentDate)}d overdue</small>}</div></td><td><V2Button type="button" variant="ghost" onClick={() => onSelect(task.id)}>Open</V2Button></td></tr>; })}</tbody></table></div>;
}
