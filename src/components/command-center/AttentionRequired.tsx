import { Link } from "react-router-dom";
import { V2Badge } from "../ui/V2Badge";
import { V2Card } from "../ui/V2Card";
import { V2EmptyState } from "../ui/V2EmptyState";
import type { AttentionItem } from "../../pages/admin/command-center/commandCenterMetrics";

const details = { OVERDUE_PROJECT: { label: "OVERDUE PROJECT", tone: "danger" as const }, OVERDUE_TASK: { label: "OVERDUE TASK", tone: "danger" as const }, IN_REVIEW: { label: "IN REVIEW", tone: "info" as const }, HOLD: { label: "HOLD", tone: "warning" as const } };

export default function AttentionRequired({ items }: { items: AttentionItem[] }) {
  const visibleItems = items.slice(0, 5);
  return <V2Card className="v2-command-attention"><header><div><span className="v2-command-section-kicker">ACTION REQUIRED</span><h2>Action Required</h2><p>즉시 확인이 필요한 일정 지연 및 검토 업무입니다.</p></div><strong>{items.length}</strong></header>{items.length === 0 ? <V2EmptyState title="No urgent items" description="현재 즉시 확인이 필요한 일정 지연 또는 검토 업무가 없습니다." /> : <div className="v2-command-action-list">{visibleItems.map((item) => { const meta = details[item.kind]; const isReview = item.kind === "IN_REVIEW" && item.task; const href = isReview ? `/admin/reviews?taskId=${item.task!.id}` : item.task ? `/admin/tasks/${item.task.id}` : `/admin/projects/${item.project.id}`; const action = isReview ? "Review" : item.task ? "Open task" : "Open project"; return <Link key={item.id} to={href} className="v2-command-action"><V2Badge variant={meta.tone}>{meta.label.replace("_", " ")}</V2Badge><div><strong>{item.task?.title ?? item.project.name}</strong><span>{item.task ? item.project.name : item.project.code}{item.assigneeNames.length ? ` · ${item.assigneeNames.join(", ")}` : ""}</span><small>{item.overdueDays ? `Due · ${item.overdueDays}d overdue` : item.task?.dueDate ?? item.project.targetEndDate ?? "No due date"}</small></div><em>{action} →</em></Link>; })}</div>}<footer><Link to="/admin/projects">View all actions →</Link></footer></V2Card>;
}
