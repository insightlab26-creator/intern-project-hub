import { PROJECT_STATUS_LABELS } from "../../constants/domainLabels";
import type { UserProfile } from "../../services/authService";
import type { Project } from "../../types/domain";
import { V2Badge } from "../ui/V2Badge";
import { V2Button } from "../ui/V2Button";
import { V2Table, type V2TableColumn, type V2TableRow } from "../ui/V2Table";
import type { ProjectTaskMetrics } from "../../pages/admin/projects/projectMetrics";
import { isProjectOverdue, overdueDays } from "../../pages/admin/projects/projectMetrics";

type ProjectTableProps = { projects: Project[]; profilesById: Map<string, UserProfile>; metricsByProject: Map<string, ProjectTaskMetrics>; onEdit: (project: Project) => void; onOpenProject: (projectId: string) => void };

const columns: V2TableColumn[] = [
  { key: "project", label: "PROJECT" }, { key: "status", label: "STATUS" }, { key: "progress", label: "PROGRESS" }, { key: "tasks", label: "TASKS" }, { key: "due", label: "DUE" }, { key: "manager", label: "MANAGER" }, { key: "action", label: "ACTION" },
];

const statusVariants: Record<Project["status"], "neutral" | "success" | "warning" | "danger" | "info"> = { PLANNING: "neutral", ACTIVE: "success", REVIEW: "info", REVISION: "warning", ON_HOLD: "warning", COMPLETED: "success", DROPPED: "danger", ARCHIVED: "neutral" };
const statusVariant = (status: Project["status"]) => statusVariants[status];
const shortDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));

export default function ProjectTable({ projects, profilesById, metricsByProject, onEdit, onOpenProject }: ProjectTableProps) {
  const rows: V2TableRow[] = projects.map((project) => {
    const metrics = metricsByProject.get(project.id) ?? { total: 0, done: 0, inReview: 0, overdue: 0 };
    const percentage = metrics.total ? Math.round(metrics.done / metrics.total * 100) : null;
    const manager = project.operatorId ? profilesById.get(project.operatorId) : undefined;
    const projectIsOverdue = isProjectOverdue(project);
    return { id: project.id, cells: {
      project: <div className="v2-project-cell"><button className="v2-project-link" type="button" onClick={() => onOpenProject(project.id)}>{project.name}</button><span>{project.code}{project.field ? ` · ${project.field}` : ""}</span></div>,
      status: <V2Badge variant={statusVariant(project.status)}>{PROJECT_STATUS_LABELS[project.status]}</V2Badge>,
      progress: percentage === null ? <span className="v2-muted">No tasks</span> : <div className="v2-progress"><div className="v2-progress__track"><span style={{ width: `${percentage}%` }} /></div><strong>{percentage}%</strong></div>,
      tasks: <div className="v2-task-count"><strong>{metrics.done} / {metrics.total}</strong>{metrics.overdue > 0 ? <V2Badge variant="danger">{metrics.overdue} overdue</V2Badge> : metrics.inReview > 0 ? <V2Badge variant="info">{metrics.inReview} in review</V2Badge> : null}</div>,
      due: project.targetEndDate ? <div className="v2-due-date"><span>{shortDate(project.targetEndDate)}</span>{projectIsOverdue && <small className="v2-danger-text">Overdue {overdueDays(project.targetEndDate)}d</small>}</div> : <span className="v2-muted">—</span>,
      manager: <span className={manager ? "" : "v2-muted"}>{manager?.display_name ?? "Unassigned"}</span>,
      action: <ProjectRowActions project={project} onEdit={onEdit} onOpenProject={onOpenProject} />,
    } };
  });
  return <ProjectTableView rows={rows} />;
}

function ProjectTableView({ rows }: { rows: V2TableRow[] }) { return <V2Table columns={columns} rows={rows} emptyMessage="No projects match the current filters." />; }

function ProjectRowActions({ project, onEdit, onOpenProject }: { project: Project; onEdit: (project: Project) => void; onOpenProject: (projectId: string) => void }) {
  return <details className="v2-row-actions"><summary aria-label={`${project.name} actions`}>•••</summary><div className="v2-row-actions__menu" role="menu"><V2Button variant="ghost" type="button" role="menuitem" onClick={() => onOpenProject(project.id)}>View details</V2Button><V2Button variant="ghost" type="button" role="menuitem" onClick={() => onEdit(project)}>Edit project</V2Button></div></details>;
}
