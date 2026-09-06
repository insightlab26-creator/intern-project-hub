import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2Input } from "../../components/ui/V2Input";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { V2Select } from "../../components/ui/V2Select";
import { PROJECT_STATUS_LABELS } from "../../constants/domainLabels";
import { getDocuments } from "../../services/documentService";
import { getCurrentIntern } from "../../services/internService";
import { getProjects } from "../../services/projectService";
import { getMyAssignedTasks } from "../../services/taskService";
import type { DocumentLink, Project, ProjectStatus, Task } from "../../types/domain";

type PageState = "loading" | "ready" | "profileMissing" | "error";
type ResourceData = { projects: Project[]; tasks: Task[]; documents: DocumentLink[] };
type TypeFilter = "ALL" | DocumentLink["source"];

const projectStatusVariant: Record<ProjectStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  PLANNING: "neutral", ACTIVE: "success", REVIEW: "info", REVISION: "warning", ON_HOLD: "warning", COMPLETED: "success", DROPPED: "danger", ARCHIVED: "neutral",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function isSafeSourceUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function sortDocuments(documents: DocumentLink[], projects: Map<string, Project>) {
  return [...documents].sort((left, right) => {
    const archivedDifference = Number(left.archived) - Number(right.archived);
    if (archivedDifference) return archivedDifference;
    const projectDifference = (projects.get(left.projectId)?.name ?? "").localeCompare(projects.get(right.projectId)?.name ?? "");
    if (projectDifference) return projectDifference;
    const updatedDifference = right.updatedAt.localeCompare(left.updatedAt);
    if (updatedDifference) return updatedDifference;
    return left.title.localeCompare(right.title);
  });
}

export default function InternResourcesPage() {
  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<ResourceData | null>(null);
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("ALL");
  const [type, setType] = useState<TypeFilter>("ALL");

  const load = useCallback(async () => {
    setState("loading"); setData(null);
    try {
      if (!await getCurrentIntern()) { setState("profileMissing"); return; }
      const [projects, tasks, documents] = await Promise.all([getProjects(), getMyAssignedTasks(), getDocuments()]);
      setData({ projects, tasks, documents }); setState("ready");
    } catch { setState("error"); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const projectById = useMemo(() => new Map((data?.projects ?? []).map((project) => [project.id, project])), [data]);
  const taskById = useMemo(() => new Map((data?.tasks ?? []).map((task) => [task.id, task])), [data]);
  const documents = useMemo(() => sortDocuments(data?.documents ?? [], projectById), [data, projectById]);
  const workspaceProjects = useMemo(() => (data?.projects ?? []).filter((project) => isSafeSourceUrl(project.teamsFolderUrl)).sort((left, right) => left.name.localeCompare(right.name)), [data]);
  const projectOptions = useMemo(() => [...new Map(documents.map((document) => [document.projectId, projectById.get(document.projectId)]).filter((entry): entry is [string, Project] => Boolean(entry[1]))).values()].sort((left, right) => left.name.localeCompare(right.name)), [documents, projectById]);
  const filteredDocuments = useMemo(() => {
    const term = query.trim().toLowerCase();
    return documents.filter((document) => {
      const project = projectById.get(document.projectId); const task = document.taskId ? taskById.get(document.taskId) : undefined;
      const text = [document.title, document.description, project?.name ?? "", task?.title ?? "", document.source].join(" ").toLowerCase();
      return (projectId === "ALL" || document.projectId === projectId) && (type === "ALL" || document.source === type) && (!term || text.includes(term));
    });
  }, [documents, projectById, projectId, query, taskById, type]);
  const summary = useMemo(() => ({ projects: data?.projects.length ?? 0, resources: documents.filter((document) => document.source === "RESOURCE").length, outputs: documents.filter((document) => document.source === "DOCUMENT").length }), [data, documents]);

  if (state === "loading") return <V2Card><V2EmptyState title="Loading your resources" description="프로젝트 작업공간과 원본 링크를 불러오고 있습니다." /></V2Card>;
  if (state === "profileMissing") return <V2Card><V2EmptyState title="Intern profile not linked" description="현재 로그인 계정에 연결된 인턴 프로필이 없습니다. ADMIN에게 연결을 요청해주세요." /></V2Card>;
  if (state === "error" || !data) return <section className="v2-intern-resources"><V2PageHeader eyebrow="RESOURCES" title="My Resources" description="Project workspaces and source links for your assigned work." /><V2Card><V2EmptyState title="Unable to load your resources." description="잠시 후 다시 시도해주세요." action={<V2Button type="button" variant="secondary" onClick={() => void load()}>Retry</V2Button>} /></V2Card></section>;

  const noResources = workspaceProjects.length === 0 && documents.length === 0;
  return <section className="v2-intern-resources">
    <V2PageHeader eyebrow="RESOURCES" title="My Resources" description="Project workspaces and source links for your assigned work." />
    <div className="v2-intern-resources__summary" aria-label="My resources summary"><Metric label="PROJECTS" value={summary.projects} /><Metric label="RESOURCES" value={summary.resources} /><Metric label="OUTPUTS" value={summary.outputs} /></div>
    {noResources ? <V2Card className="v2-intern-resources__empty"><V2EmptyState title="No resources available yet." description="Resources will appear here when source links are added to your projects or assigned tasks." /></V2Card> : <>
      {workspaceProjects.length > 0 && <section className="v2-intern-resources__workspaces"><header><p>PROJECT WORKSPACES</p><h2>Your connected project folders</h2></header><div>{workspaceProjects.map((project) => <V2Card key={project.id} className="v2-intern-resources__workspace"><div><Link to={`/intern/projects/${project.id}`}>{project.name}</Link><V2Badge variant={projectStatusVariant[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</V2Badge></div><a className="v2-button v2-button--secondary" href={project.teamsFolderUrl!} target="_blank" rel="noopener noreferrer">Open Workspace ↗</a></V2Card>)}</div></section>}
      <section className="v2-intern-resources__links"><header><p>SOURCE LINKS</p><h2>Documents &amp; outputs</h2></header>{documents.length === 0 ? <V2Card className="v2-intern-resources__empty"><V2EmptyState title="No source links available yet." description="Project and assigned-task source links will appear here." /></V2Card> : <><div className="v2-intern-resources__filters" aria-label="Resource filters"><V2Input aria-label="Search resources" placeholder="Search title, description, project, or task…" value={query} onChange={(event) => setQuery(event.target.value)} /><V2Select aria-label="Filter resources by project" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="ALL">All projects</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</V2Select><V2Select aria-label="Filter resource type" value={type} onChange={(event) => setType(event.target.value as TypeFilter)}><option value="ALL">All types</option><option value="DOCUMENT">Outputs</option><option value="RESOURCE">Resources</option></V2Select></div>{filteredDocuments.length === 0 ? <V2Card className="v2-intern-resources__empty"><V2EmptyState title="No source links match your filters." description="Try adjusting your search or filters." action={<V2Button type="button" variant="secondary" onClick={() => { setQuery(""); setProjectId("ALL"); setType("ALL"); }}>Clear filters</V2Button>} /></V2Card> : <div className="v2-intern-resources__list">{filteredDocuments.map((document) => <SourceLinkRow key={`${document.source}-${document.id}`} document={document} project={projectById.get(document.projectId)} task={document.taskId ? taskById.get(document.taskId) : undefined} />)}</div>}</>}</section>
    </>}
  </section>;
}

function Metric({ label, value }: { label: string; value: number }) { return <V2Card className="v2-intern-resources__metric"><small>{label}</small><strong>{value}</strong></V2Card>; }

function SourceLinkRow({ document, project, task }: { document: DocumentLink; project: Project | undefined; task: Task | undefined }) {
  const hasUrl = isSafeSourceUrl(document.url);
  return <article className="v2-intern-resources__row"><div className="v2-intern-resources__row-main"><header><V2Badge variant={document.source === "DOCUMENT" ? "info" : "neutral"}>{document.source === "DOCUMENT" ? "OUTPUT" : "RESOURCE"}</V2Badge><V2Badge variant={document.archived ? "neutral" : "success"}>{document.archived ? "ARCHIVED" : "ACTIVE"}</V2Badge></header><h3>{document.title}</h3>{document.description && <p>{document.description}</p>}</div><dl><div><dt>PROJECT</dt><dd>{project ? <Link to={`/intern/projects/${project.id}`}>{project.name}</Link> : "Project unavailable"}</dd></div><div><dt>LINKED TASK</dt><dd>{document.taskId ? task ? <Link to={`/intern/tasks/${task.id}`}>{task.title}</Link> : "Task unavailable" : "Project-level"}</dd></div><div><dt>UPDATED</dt><dd>{formatDate(document.updatedAt)}</dd></div></dl>{hasUrl ? <a className="v2-button v2-button--secondary" href={document.url} target="_blank" rel="noopener noreferrer">Open Source ↗</a> : <span className="v2-intern-resources__no-url">Source URL unavailable</span>}</article>;
}
