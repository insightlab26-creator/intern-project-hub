import { TASK_PRIORITY_LABELS } from "../../constants/domainLabels";
import { overdueDays } from "../../pages/admin/projects/projectMetrics";
import type { Intern, Project, Task, TaskUpdate } from "../../types/domain";
import { V2Badge } from "../ui/V2Badge";
import { V2Button } from "../ui/V2Button";
import { V2EmptyState } from "../ui/V2EmptyState";

export type ReviewQueueItem =
  | { kind: "TASK"; key: string; task: Task }
  | { kind: "UPDATE"; key: string; task: Task; update: TaskUpdate };

type Props = { items: ReviewQueueItem[]; projects: Map<string, Project>; interns: Map<string, Intern>; selectedKey: string | null; onSelect: (item: ReviewQueueItem) => void; emptyTitle: string; emptyDescription: string };
const priorityVariant = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger" } as const;
const today = () => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };
const formatDate = (date: string | null) => date ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`)) : "—";

export default function ReviewTaskTable({ items, projects, interns, selectedKey, onSelect, emptyTitle, emptyDescription }: Props) {
  const currentDate = today();
  if (items.length === 0) return <V2EmptyState title={emptyTitle} description={emptyDescription} />;
  return <div className={selectedKey ? "v2-table-wrap v2-review-task-table-wrap--compact" : "v2-table-wrap"}><table className="v2-table v2-review-task-table"><thead><tr><th>TYPE</th><th>ITEM</th><th>PROJECT</th><th>PERSON</th><th>DATE / DUE</th><th aria-label="Action" /></tr></thead><tbody>{items.map((item) => {
    const { task } = item; const projectName = projects.get(task.projectId)?.name ?? "Project unavailable";
    const assignees = task.assigneeInternIds.map((id) => interns.get(id)?.name).filter((name): name is string => Boolean(name));
    const overdue = Boolean(task.dueDate && new Date(`${task.dueDate}T00:00:00`) < currentDate);
    const isUpdate = item.kind === "UPDATE";
    return <tr key={item.key} className={selectedKey === item.key ? "v2-review-task-table__selected" : undefined}>
      <td><V2Badge variant={isUpdate ? "info" : "warning"}>{isUpdate ? "UPDATE REVIEW" : "TASK REVIEW"}</V2Badge></td>
      <td><strong>{task.title}</strong>{isUpdate ? <small>Update review</small> : <small><V2Badge variant={priorityVariant[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</V2Badge></small>}</td>
      <td>{projectName}</td>
      <td className={isUpdate ? item.update.authorName ? "" : "v2-muted" : assignees.length ? "" : "v2-muted"}>{isUpdate ? item.update.authorName ?? "Unknown author" : assignees.length ? assignees.join(", ") : "Unassigned"}</td>
      <td><div className="v2-review-task-due"><span>{isUpdate ? formatDate(item.update.occurredOn) : formatDate(task.dueDate)}</span>{isUpdate ? <small>Occurred</small> : overdue && task.dueDate ? <small className="v2-danger-text">{overdueDays(task.dueDate, currentDate)}d overdue</small> : <small>Due</small>}</div></td>
      <td><V2Button type="button" variant="ghost" onClick={() => onSelect(item)}>{isUpdate ? "Review" : "Open"}</V2Button></td>
    </tr>;
  })}</tbody></table></div>;
}
