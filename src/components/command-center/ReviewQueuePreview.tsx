import { Link } from "react-router-dom";
import { TASK_PRIORITY_LABELS } from "../../constants/domainLabels";
import { V2Badge } from "../ui/V2Badge";
import { V2Card } from "../ui/V2Card";
import { V2EmptyState } from "../ui/V2EmptyState";
import { PanelHeader } from "./ProjectPortfolioPreview";
import { isOverdueTask } from "../interns/internMetrics";
import type { Intern, Project, Task } from "../../types/domain";

export default function ReviewQueuePreview({ tasks, projects, interns, excludeTaskIds = new Set<string>() }: { tasks: Task[]; projects: Project[]; interns: Intern[]; excludeTaskIds?: Set<string> }) { const projectMap = new Map(projects.map((item) => [item.id, item])); const internMap = new Map(interns.map((item) => [item.id, item])); const visibleTasks = tasks.filter((task) => !excludeTaskIds.has(task.id)); return <V2Card className="v2-command-panel v2-command-widget"><PanelHeader title="Needs Review" to="/v2/admin/reviews" />{visibleTasks.length === 0 ? <V2EmptyState title="No additional review tasks" description="Action Required에 표시된 검토 업무를 확인하세요." /> : <div className="v2-command-widget__list">{visibleTasks.slice(0, 3).map((task) => { const names = task.assigneeInternIds.map((id) => internMap.get(id)?.name).filter(Boolean).join(", ") || "Unassigned"; return <Link key={task.id} to={`/v2/admin/reviews?taskId=${task.id}`} className="v2-command-widget__row"><div><strong>{task.title}</strong><span>{projectMap.get(task.projectId)?.name ?? "Project unavailable"} · {names}</span></div><V2Badge variant={task.priority === "HIGH" ? "danger" : task.priority === "MEDIUM" ? "warning" : "neutral"}>{TASK_PRIORITY_LABELS[task.priority]}</V2Badge><small className={isOverdueTask(task) ? "v2-danger-text" : ""}>{isOverdueTask(task) ? "Overdue" : task.dueDate ?? "No due date"}</small></Link>; })}</div>}</V2Card>; }
