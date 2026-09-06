import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2Input } from "../../components/ui/V2Input";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { V2Select } from "../../components/ui/V2Select";
import { formatInternDate, internProjectStatusLabel, useInternLocale } from "../../i18n/internLocale";
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
  const { t } = useInternLocale();
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

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

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

  if (state === "loading") return <V2Card><V2EmptyState title={t("state.loadingResources")} description={t("resources.description")} /></V2Card>;
  if (state === "profileMissing") return <V2Card><V2EmptyState title={t("state.internMissing")} description={t("state.internMissingDescription")} /></V2Card>;
  if (state === "error" || !data) return <section className="v2-intern-resources"><V2PageHeader eyebrow={t("resources.eyebrow")} title={t("resources.title")} description={t("resources.description")} /><V2Card><V2EmptyState title={t("resources.loadError")} description={t("tasks.adjust")} action={<V2Button type="button" variant="secondary" onClick={() => void load()}>{t("common.retry")}</V2Button>} /></V2Card></section>;

  const noResources = workspaceProjects.length === 0 && documents.length === 0;
  return <section className="v2-intern-resources">
    <V2PageHeader eyebrow={t("resources.eyebrow")} title={t("resources.title")} description={t("resources.description")} />
    <div className="v2-intern-resources__summary" aria-label={t("resources.summary")}><Metric label={t("common.project")} value={summary.projects} /><Metric label={t("resources.resources")} value={summary.resources} /><Metric label={t("resources.outputs")} value={summary.outputs} /></div>
    {noResources ? <V2Card className="v2-intern-resources__empty"><V2EmptyState title={t("resources.none")} description={t("resources.noneDescription")} /></V2Card> : <>
      {workspaceProjects.length > 0 && <section className="v2-intern-resources__workspaces"><header><p>{t("resources.workspaces")}</p><h2>{t("resources.connectedFolders")}</h2></header><div>{workspaceProjects.map((project) => <WorkspaceRow key={project.id} project={project} />)}</div></section>}
      <section className="v2-intern-resources__links"><header><p>{t("resources.sourceLinks")}</p><h2>{t("resources.documentsOutputs")}</h2></header>{documents.length === 0 ? <V2Card className="v2-intern-resources__empty"><V2EmptyState title={t("resources.noLinks")} description={t("resources.noLinksDescription")} /></V2Card> : <><div className="v2-intern-resources__filters" aria-label={t("resources.eyebrow")}><V2Input aria-label={t("resources.search")} placeholder={t("resources.search")} value={query} onChange={(event) => setQuery(event.target.value)} /><V2Select aria-label={t("resources.filterProject")} value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="ALL">{t("resources.allProjects")}</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</V2Select><V2Select aria-label={t("resources.filterType")} value={type} onChange={(event) => setType(event.target.value as TypeFilter)}><option value="ALL">{t("resources.allTypes")}</option><option value="DOCUMENT">{t("resources.output")}</option><option value="RESOURCE">{t("resources.resource")}</option></V2Select></div>{filteredDocuments.length === 0 ? <V2Card className="v2-intern-resources__empty"><V2EmptyState title={t("resources.noMatch")} description={t("resources.adjust")} action={<V2Button type="button" variant="secondary" onClick={() => { setQuery(""); setProjectId("ALL"); setType("ALL"); }}>{t("common.clearFilters")}</V2Button>} /></V2Card> : <div className="v2-intern-resources__list">{filteredDocuments.map((document) => <SourceLinkRow key={`${document.source}-${document.id}`} document={document} project={projectById.get(document.projectId)} task={document.taskId ? taskById.get(document.taskId) : undefined} />)}</div>}</>}</section>
    </>}
  </section>;
}

function Metric({ label, value }: { label: string; value: number }) { return <V2Card className="v2-intern-resources__metric"><small>{label}</small><strong>{value}</strong></V2Card>; }

function WorkspaceRow({ project }: { project: Project }) { const { locale, t } = useInternLocale(); return <V2Card className="v2-intern-resources__workspace"><div><Link to={`/intern/projects/${project.id}`}>{project.name}</Link><V2Badge variant={projectStatusVariant[project.status]}>{internProjectStatusLabel(project.status, locale)}</V2Badge></div><a className="v2-button v2-button--secondary" href={project.teamsFolderUrl!} target="_blank" rel="noopener noreferrer">{t("resources.openWorkspace")} ↗</a></V2Card>; }
function SourceLinkRow({ document, project, task }: { document: DocumentLink; project: Project | undefined; task: Task | undefined }) {
  const { locale, t } = useInternLocale();
  const hasUrl = isSafeSourceUrl(document.url);
  return <article className="v2-intern-resources__row"><div className="v2-intern-resources__row-main"><header><V2Badge variant={document.source === "DOCUMENT" ? "info" : "neutral"}>{document.source === "DOCUMENT" ? t("resources.output") : t("resources.resource")}</V2Badge><V2Badge variant={document.archived ? "neutral" : "success"}>{document.archived ? t("resources.archived") : t("resources.active")}</V2Badge></header><h3>{document.title}</h3>{document.description && <p>{document.description}</p>}</div><dl><div><dt>{t("common.project")}</dt><dd>{project ? <Link to={`/intern/projects/${project.id}`}>{project.name}</Link> : t("common.projectUnavailable")}</dd></div><div><dt>{t("resources.linkedTask")}</dt><dd>{document.taskId ? task ? <Link to={`/intern/tasks/${task.id}`}>{task.title}</Link> : t("common.taskUnavailable") : t("resources.projectLevel")}</dd></div><div><dt>{t("common.updated")}</dt><dd>{formatInternDate(document.updatedAt, locale, true)}</dd></div></dl>{hasUrl ? <a className="v2-button v2-button--secondary" href={document.url} target="_blank" rel="noopener noreferrer">{t("resources.openSource")} ↗</a> : <span className="v2-intern-resources__no-url">{t("resources.noUrl")}</span>}</article>;
}
