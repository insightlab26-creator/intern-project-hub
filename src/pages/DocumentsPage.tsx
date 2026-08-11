import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import ScreenState from "../components/ScreenState";
import { getDocuments, saveDocument } from "../services/documentService";
import { getProjects } from "../services/projectService";
import { getAllTasks } from "../services/taskService";
import type { DocumentLink, Project, Task } from "../types/domain";

const empty = { projectId: "", taskId: "", title: "", description: "", url: "", archived: false, source: "DOCUMENT" as DocumentLink["source"] };

export default function DocumentsPage({ projectId, embedded = false }: { projectId?: string; embedded?: boolean } = {}) {
  const [documents, setDocuments] = useState<DocumentLink[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string>();
  const [previousUrl, setPreviousUrl] = useState("");
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [documentItems, projectItems, taskItems] = await Promise.all([getDocuments(), getProjects(), getAllTasks()]);
      setDocuments(documentItems);
      setProjects(projectItems);
      setTasks(taskItems);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "문서를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const visibleDocuments = useMemo(() => documents.filter((document) => {
    const matchesProject = !projectId || document.projectId === projectId;
    const text = `${document.title} ${document.description} ${document.url}`.toLocaleLowerCase("ko-KR");
    return matchesProject && (!query || text.includes(query.toLocaleLowerCase("ko-KR")));
  }), [documents, projectId, query]);

  const openCreate = () => {
    setEditId(undefined);
    setPreviousUrl("");
    setForm({ ...empty, projectId: projectId ?? "" });
    setShow(true);
  };
  const openEdit = (document: DocumentLink) => {
    setEditId(document.id);
    setPreviousUrl(document.url);
    setForm({ projectId: document.projectId, taskId: document.taskId ?? "", title: document.title, description: document.description, url: document.url, archived: document.archived, source: document.source });
    setShow(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await saveDocument({ ...form, taskId: form.taskId || null }, editId, previousUrl);
      setShow(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "문서를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return <>
    <header className={`${embedded ? "embedded-page-header" : "page-header"} project-page-header`}>
      <div>{!embedded && <p className="eyebrow">KNOWLEDGE</p>}<h1>{embedded ? "Project Documents" : "Documents"}</h1><p>파일은 Teams에 보관하고 여기에는 찾기 쉬운 링크만 등록합니다.</p></div>
      <button className="primary-button" onClick={() => show ? setShow(false) : openCreate()}>{show ? "취소" : "+ 문서 링크"}</button>
    </header>
    {error && <div className="notice-message">{error}</div>}
    {show && <section className="project-form-card"><form className="project-form" onSubmit={submit}>
      <div className="form-grid">
        <label>Project *<select required disabled={Boolean(projectId)} value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value, taskId: "" })}><option value="">선택</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label>Work Package<select value={form.taskId} onChange={(event) => setForm({ ...form, taskId: event.target.value })}><option value="">연결 안 함</option>{tasks.filter((task) => task.projectId === form.projectId).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
      </div>
      <label>제목 *<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      <label>Teams 링크 *<input required type="url" placeholder="https://" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} /></label>
      <label>설명<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      {editId && <label className="document-archive-toggle"><input type="checkbox" checked={form.archived} onChange={(event) => setForm({ ...form, archived: event.target.checked })} />보관 처리</label>}
      <button className="primary-button" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
    </form></section>}
    <section className="filter-panel document-filter"><input placeholder="제목·설명·URL 검색" value={query} onChange={(event) => setQuery(event.target.value)} /></section>
    {loading ? <ScreenState kind="loading" title="문서를 불러오는 중입니다." /> : visibleDocuments.length === 0 ? <ScreenState kind="empty" title="등록된 문서 링크가 없습니다." /> : <section className="document-grid">{visibleDocuments.map((document) => <article className="document-card" key={`${document.source}-${document.id}`}>
      <div className="project-card-top"><span className="project-code">{projects.find((project) => project.id === document.projectId)?.name ?? "Project"}</span><span className="status-badge">{document.archived ? "보관" : "사용 중"}</span></div>
      <h2>{document.title}</h2><p>{document.description || "설명 없음"}</p>
      {document.taskId && <span className="document-task">{tasks.find((task) => task.id === document.taskId)?.title}</span>}
      <div className="document-actions">{document.url ? <a className="primary-button inline-link" href={document.url} target="_blank" rel="noreferrer">Teams에서 열기</a> : <span className="notice-message">등록된 링크 없음</span>}<button className="edit-button" onClick={() => openEdit(document)}>수정</button></div>
    </article>)}</section>}
  </>;
}
