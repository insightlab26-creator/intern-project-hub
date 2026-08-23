import { V2Card } from "../ui/V2Card";
import type { CommandCenterKpis } from "../../pages/admin/command-center/commandCenterMetrics";

export default function CommandCenterSummary({ kpis }: { kpis: CommandCenterKpis }) {
  const items = [["ACTIVE INTERNS", kpis.activeInterns, "●", "Working", "success"], ["ACTIVE PROJECTS", kpis.activeProjects, "▰", "In progress", "success"], ["TASKS IN REVIEW", kpis.tasksInReview, "▣", "Needs review", "info"], ["OVERDUE TASKS", kpis.overdueTasks, "◷", "Overdue", "danger"], ["ACTIVE PROGRAMS", kpis.activePrograms, "◇", "Running", "accent"]];
  return <section className="v2-command-summary" aria-label="Control Tower summary">{items.map(([label, value, marker, description, tone]) => <V2Card className={`v2-command-summary__item v2-command-summary__item--${tone}`} key={String(label)}><span aria-hidden="true">{marker}</span><div><small>{label}</small><strong>{value}</strong><em>{description}</em></div></V2Card>)}</section>;
}
