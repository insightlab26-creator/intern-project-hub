import type { Project } from "../../../types/domain";
import type { ProjectTaskMetrics } from "../../../pages/admin/projects/projectMetrics";
import { V2Card } from "../../ui/V2Card";

export default function ProjectSummaryMetrics({ project, metrics }: { project: Project; metrics: ProjectTaskMetrics }) {
  const progress = metrics.total ? `${Math.round(metrics.done / metrics.total * 100)}%` : "No tasks";
  const due = project.targetEndDate ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${project.targetEndDate}T00:00:00`)) : "—";
  const items = [["PROGRESS", progress], ["TASKS", `${metrics.done} / ${metrics.total}`], ["IN REVIEW", metrics.inReview], ["OVERDUE", metrics.overdue], ["DUE", due]];
  return <section className="v2-detail-summary" aria-label="Project summary metrics">{items.map(([label, value]) => <V2Card className="v2-detail-summary__item" key={String(label)}><span>{label}</span><strong>{value}</strong></V2Card>)}</section>;
}
