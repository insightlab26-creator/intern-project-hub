import { useMemo, useState } from "react";
import type { DocumentLink, DocumentLinkInput, Task } from "../../../../types/domain";
import { V2Badge } from "../../../ui/V2Badge";
import { V2Button } from "../../../ui/V2Button";
import { V2Card } from "../../../ui/V2Card";
import { V2EmptyState } from "../../../ui/V2EmptyState";
import { V2Input } from "../../../ui/V2Input";
import { V2Select } from "../../../ui/V2Select";
import OutputFormModal from "./OutputFormModal";

type Filter = "ALL" | "DOCUMENT" | "RESOURCE" | "ARCHIVED";
type Props = { projectId: string; documents: DocumentLink[]; tasks: Task[]; loading: boolean; error: string; saving: boolean; onRetry: () => void; onSave: (input: DocumentLinkInput, id?: string, previousUrl?: string) => Promise<void> };
const formatDate = (date: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));
const errorMessage = (caught: unknown) => caught instanceof Error ? caught.message : "Output could not be saved.";

export default function ProjectOutputsTab({ projectId, documents, tasks, loading, error, saving, onRetry, onSave }: Props) {
  const [filter, setFilter] = useState<Filter>("ALL"); const [query, setQuery] = useState(""); const [editing, setEditing] = useState<DocumentLink | "create" | null>(null); const [formError, setFormError] = useState("");
  const counts = useMemo(() => ({ total: documents.length, outputs: documents.filter((item) => item.source === "DOCUMENT").length, resources: documents.filter((item) => item.source === "RESOURCE").length, archived: documents.filter((item) => item.archived).length }), [documents]);
  const visible = useMemo(() => documents.filter((item) => {
    const text = `${item.title} ${item.description}`.toLocaleLowerCase("ko-KR");
    const typeMatch = filter === "ALL" || filter === "ARCHIVED" ? filter !== "ARCHIVED" || item.archived : item.source === filter;
    return typeMatch && (!query.trim() || text.includes(query.trim().toLocaleLowerCase("ko-KR")));
  }), [documents, filter, query]);
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks]);
  const openForm = (document?: DocumentLink) => { setFormError(""); setEditing(document ?? "create"); };
  const save = async (input: DocumentLinkInput, id?: string, previousUrl?: string) => { try { setFormError(""); await onSave(input, id, previousUrl); } catch (caught) { setFormError(errorMessage(caught)); throw caught; } };
  if (loading) return <V2Card><V2EmptyState title="Loading outputs" description="프로젝트 결과물과 참고 자료를 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load outputs" description={error} action={<V2Button type="button" onClick={onRetry}>Try again</V2Button>} /></V2Card>;
  return <section className="v2-outputs">
    <header className="v2-outputs__header"><div><h2>Outputs</h2><p>프로젝트 결과물과 참고 자료를 Teams 원본 링크 기준으로 관리합니다.</p></div><V2Button type="button" onClick={() => openForm()}>+ Add Output</V2Button></header>
    <div className="v2-output-stats" aria-label="Output summary"><span><small>TOTAL</small><strong>{counts.total}</strong></span><span><small>OUTPUTS</small><strong>{counts.outputs}</strong></span><span><small>RESOURCES</small><strong>{counts.resources}</strong></span><span><small>ARCHIVED</small><strong>{counts.archived}</strong></span></div>
    {documents.length === 0 ? <V2Card><V2EmptyState title="No outputs yet" description="프로젝트 결과물이나 참고 자료의 Teams 링크를 등록하세요." action={<V2Button type="button" onClick={() => openForm()}>+ Add Output</V2Button>} /></V2Card> : <>
      <div className="v2-output-toolbar"><V2Input aria-label="Search outputs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or description…" /><V2Select aria-label="Filter outputs" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}><option value="ALL">All</option><option value="DOCUMENT">Outputs</option><option value="RESOURCE">Resources</option><option value="ARCHIVED">Archived</option></V2Select></div>
      {visible.length === 0 ? <V2Card><V2EmptyState title="No matching outputs" description="다른 검색어 또는 필터를 사용해보세요." /></V2Card> : <div className="v2-output-list">{visible.map((document) => <OutputListItem key={`${document.source}-${document.id}`} document={document} taskName={document.taskId ? taskMap.get(document.taskId) : undefined} onEdit={() => openForm(document)} />)}</div>}
    </>}
    {editing && <OutputFormModal projectId={projectId} tasks={tasks} document={editing === "create" ? undefined : editing} saving={saving} error={formError} onClose={() => setEditing(null)} onSave={save} />}
  </section>;
}

function OutputListItem({ document, taskName, onEdit }: { document: DocumentLink; taskName?: string; onEdit: () => void }) { return <V2Card className={`v2-output-item${document.archived ? " v2-output-item--archived" : ""}`}><header><div><div className="v2-output-item__meta"><V2Badge variant={document.source === "DOCUMENT" ? "info" : "neutral"}>{document.source === "DOCUMENT" ? "OUTPUT" : "RESOURCE"}</V2Badge>{document.archived && <V2Badge variant="neutral">ARCHIVED</V2Badge>}<small>Updated {formatDate(document.updatedAt)}</small></div><h3>{document.title}</h3></div><details className="v2-output-actions"><summary aria-label={`${document.title} actions`}>•••</summary><button type="button" onClick={onEdit}>Edit {document.source === "DOCUMENT" ? "output" : "resource"}</button></details></header>{document.description && <p>{document.description}</p>}<footer><span>{taskName ? `Linked task: ${taskName}` : "Project level"}</span>{document.url ? <a href={document.url} target="_blank" rel="noreferrer">Open in Teams ↗</a> : <span className="v2-muted">No source URL</span>}</footer></V2Card>; }
