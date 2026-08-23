import type { Project } from "../../../types/domain";
import type { ProjectTaskMetrics } from "../../../pages/admin/projects/projectMetrics";
import { V2Badge } from "../../ui/V2Badge";
import { V2Card } from "../../ui/V2Card";

type Props = { project: Project; managerName: string; metrics: ProjectTaskMetrics };
const value = (text: string | null | undefined) => text || "—";
const dateText = (date: string | null) => date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T00:00:00`)) : "—";

export default function ProjectOverviewTab({ project, managerName, metrics }: Props) {
  const information = [["Project Type", project.projectType], ["Field", value(project.field)], ["Manager", managerName], ["Status", project.status], ["Current Stage", value(project.currentStage)], ["Start Date", dateText(project.startDate)], ["Target End Date", dateText(project.targetEndDate)]];
  const workStatus = [["Total Tasks", metrics.total], ["Completed", metrics.done], ["In Review", metrics.inReview], ["Overdue", metrics.overdue], ["Hold", metrics.hold]];
  return <div className="v2-detail-overview"><div className="v2-detail-overview__primary"><V2Card><section className="v2-detail-section"><h2>Project Information</h2><dl className="v2-detail-information">{information.map(([label, item]) => <div key={String(label)}><dt>{label}</dt><dd>{item}</dd></div>)}</dl></section></V2Card><V2Card><section className="v2-detail-section"><h2>Current Work Status</h2><div className="v2-detail-work-status">{workStatus.map(([label, item]) => <div key={String(label)}><span>{label}</span><strong>{item}</strong></div>)}</div></section></V2Card></div><div className="v2-detail-overview__context"><V2Card><section className="v2-detail-section"><h2>Project Context</h2><ContextItem label="Purpose" value={project.purpose} /><ContextItem label="Description" value={project.description} /><ContextItem label="Background" value={project.background} /></section></V2Card><V2Card><section className="v2-detail-section"><h2>Keywords</h2>{project.keywords.length ? <div className="v2-detail-keywords">{project.keywords.map((keyword) => <V2Badge key={keyword} variant="neutral">{keyword}</V2Badge>)}</div> : <span className="v2-muted">—</span>}</section></V2Card><V2Card><section className="v2-detail-section"><h2>Teams Workspace</h2>{project.teamsFolderUrl ? <a className="v2-detail-external-link" href={project.teamsFolderUrl} target="_blank" rel="noreferrer">Open Teams folder ↗</a> : <span className="v2-muted">—</span>}<p>Files and version history remain in Teams; this workspace links to the source location.</p></section></V2Card></div></div>;
}

function ContextItem({ label, value: content }: { label: string; value: string }) { return <div className="v2-detail-context-item"><h3>{label}</h3><p>{value(content)}</p></div>; }
