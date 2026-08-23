import { Link } from "react-router-dom";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from "../../../constants/domainLabels";
import type { Project } from "../../../types/domain";
import { V2Badge } from "../../ui/V2Badge";
import { V2Button } from "../../ui/V2Button";

type Props = { project: Project; managerName: string; onEdit: () => void };
const badgeVariants: Record<Project["status"], "neutral" | "success" | "warning" | "danger" | "info"> = { PLANNING: "neutral", ACTIVE: "success", REVIEW: "info", REVISION: "warning", ON_HOLD: "warning", COMPLETED: "success", DROPPED: "danger", ARCHIVED: "neutral" };
const dateText = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";

export default function ProjectDetailHeader({ project, managerName, onEdit }: Props) {
  return <><nav className="v2-detail-breadcrumb" aria-label="Breadcrumb"><Link to="/admin/projects">Projects</Link><span>/</span><span>Project Detail</span></nav><header className="v2-detail-header"><div><div className="v2-detail-header__meta"><span>{project.code}</span><V2Badge variant="info">{PROJECT_TYPE_LABELS[project.projectType]}</V2Badge><V2Badge variant={badgeVariants[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</V2Badge></div><h1>{project.name}</h1><p>{project.purpose || project.description || "—"}</p><dl className="v2-detail-header__facts"><div><dt>Field</dt><dd>{project.field || "—"}</dd></div><div><dt>Manager</dt><dd>{managerName}</dd></div><div><dt>Period</dt><dd>{dateText(project.startDate)} — {dateText(project.targetEndDate)}</dd></div><div><dt>Current stage</dt><dd>{project.currentStage || "—"}</dd></div></dl></div><div className="v2-detail-header__actions"><V2Button variant="secondary" type="button" onClick={onEdit}>Edit Project</V2Button>{project.teamsFolderUrl ? <a className="v2-button v2-button--primary" href={project.teamsFolderUrl} target="_blank" rel="noreferrer">Teams Folder ↗</a> : <V2Button variant="secondary" type="button" disabled>Teams Folder</V2Button>}</div></header></>;
}
