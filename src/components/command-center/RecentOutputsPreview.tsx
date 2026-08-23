import { Link } from "react-router-dom";
import type { DocumentLink, Project, Task } from "../../types/domain";
import { V2Badge } from "../ui/V2Badge";
import { V2Card } from "../ui/V2Card";
import { V2EmptyState } from "../ui/V2EmptyState";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));

export default function RecentOutputsPreview({ documents, projects, tasks, loading, error }: { documents: DocumentLink[] | null; projects: Project[]; tasks: Task[]; loading: boolean; error: string }) {
  const projectMap = new Map(projects.map((project) => [project.id, project])); const taskMap = new Map(tasks.map((task) => [task.id, task])); const recent = (documents ?? []).filter((document) => !document.archived).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 3);
  return <V2Card className="v2-command-panel v2-command-widget"><header className="v2-command-panel__header"><h2>Recent Outputs</h2></header>{loading ? <p className="v2-command-widget__state">Loading outputs…</p> : error ? <p className="v2-command-widget__state">{error}</p> : recent.length === 0 ? <V2EmptyState title="No recent outputs" description="최근 등록된 결과물이나 자료가 없습니다." /> : <div className="v2-command-widget__list">{recent.map((document) => { const project = projectMap.get(document.projectId); const task = document.taskId ? taskMap.get(document.taskId) : undefined; return <article className="v2-command-output" key={`${document.source}-${document.id}`}><V2Badge variant={document.source === "DOCUMENT" ? "info" : "neutral"}>{document.source === "DOCUMENT" ? "OUTPUT" : "RESOURCE"}</V2Badge><div><Link to={`/v2/admin/projects/${document.projectId}?tab=outputs`}>{document.title}</Link><span>{project?.name ?? "Project unavailable"}{task ? ` · ${task.title}` : ""}</span><small>Updated {formatDate(document.updatedAt)}</small></div>{document.url && <a href={document.url} target="_blank" rel="noreferrer">Open in Teams ↗</a>}</article>; })}</div>}</V2Card>;
}
