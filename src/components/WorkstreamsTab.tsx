import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createWorkstream, getWorkstreams, updateWorkstream } from "../services/workstreamService";
import type { Workstream, WorkstreamStatus } from "../types/domain";
import { WORKSTREAM_STATUS_LABELS } from "../constants/domainLabels";
import ScreenState from "./ScreenState";

type Props = { projectId: string; refreshKey?: number };
const statuses = Object.keys(WORKSTREAM_STATUS_LABELS) as WorkstreamStatus[];
const emptyForm = { name: "", description: "", status: "PLANNING" as WorkstreamStatus, order: 1 };

export default function WorkstreamsTab({ projectId, refreshKey = 0 }: Props) {
  const [items, setItems] = useState<Workstream[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => { await Promise.resolve(); try { setLoading(true); setError(""); setItems(await getWorkstreams(projectId)); } catch (e) { setError(e instanceof Error ? e.message : "Workstream을 불러오지 못했습니다."); } finally { setLoading(false); } }, [projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load, refreshKey]);
  const openNew = () => { setEditingId(null); setForm({ ...emptyForm, order: Math.max(0, ...items.map((x) => x.order)) + 1 }); setShowForm(true); };
  const openEdit = (x: Workstream) => { setEditingId(x.id); setForm({ name: x.name, description: x.description, status: x.status, order: x.order }); setShowForm(true); };
  const submit = async (e: FormEvent) => { e.preventDefault(); try { setSaving(true); setError(""); const saved = editingId ? await updateWorkstream({ workstreamId: editingId, projectId, ...form }) : await createWorkstream({ projectId, ...form }); setItems((old) => (editingId ? old.map((x) => x.id === saved.id ? saved : x) : [...old, saved]).sort((a, b) => a.order - b.order)); setShowForm(false); } catch (err) { setError(err instanceof Error ? err.message : "Workstream 저장에 실패했습니다."); } finally { setSaving(false); } };
  return <>
    <div className="tab-toolbar"><div><h2>Project Areas</h2><p>Work Package를 묶는 프로젝트 단계 또는 업무 영역을 관리합니다.</p></div><button className="primary-button" onClick={showForm ? () => setShowForm(false) : openNew}>{showForm ? "취소" : "+ 영역 추가"}</button></div>
    {error && <div className="notice-message">{error}</div>}
    {showForm && <section className="project-form-card"><h2>{editingId ? "프로젝트 영역 수정" : "새 프로젝트 영역"}</h2><form className="project-form" onSubmit={submit}><label>이름 *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>설명<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="form-grid"><label>상태<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkstreamStatus })}>{statuses.map((s) => <option key={s} value={s}>{WORKSTREAM_STATUS_LABELS[s]}</option>)}</select></label><label>순서<input type="number" min="1" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></label></div><div className="form-actions"><button className="primary-button" disabled={saving}>저장</button></div></form></section>}
    {loading ? <ScreenState kind="loading" title="프로젝트 영역을 불러오는 중입니다." /> : items.length === 0 ? <ScreenState kind="empty" title="등록된 프로젝트 영역이 없습니다." /> : <div className="workstream-list">{items.map((x) => <article className="workstream-card" key={x.id}><div className="workstream-order">{x.order}</div><div className="workstream-content"><div className="workstream-title-row"><h3>{x.name}</h3><span className="status-badge">{WORKSTREAM_STATUS_LABELS[x.status]}</span></div><p>{x.description || "등록된 설명이 없습니다."}</p></div><button className="edit-button" onClick={() => openEdit(x)}>수정</button></article>)}</div>}
  </>;
}
