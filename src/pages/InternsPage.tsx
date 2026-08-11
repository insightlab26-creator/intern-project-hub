import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createIntern, getInterns, linkInternProfile, updateIntern } from "../services/internService";
import { getUserProfiles, type UserProfile } from "../services/authService";
import type { Intern, InternStatus } from "../types/domain";
import { INTERN_STATUS_LABELS } from "../constants/domainLabels";
import ScreenState from "../components/ScreenState";

const statuses = Object.keys(INTERN_STATUS_LABELS) as InternStatus[];
const emptyForm = { name: "", school: "", major: "", cohort: "", startDate: "", endDate: "", status: "ACTIVE" as InternStatus };

export default function InternsPage() {
  const [items, setItems] = useState<Intern[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => { await Promise.resolve(); try { setLoading(true); setError(""); const [internList, profileList] = await Promise.all([getInterns(), getUserProfiles()]); setItems(internList); setProfiles(profileList); } catch (e) { setError(e instanceof Error ? e.message : "인턴 목록을 불러오지 못했습니다."); } finally { setLoading(false); } }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const openEdit = (x: Intern) => { setEditingId(x.id); setForm({ name: x.name, school: x.school, major: x.major, cohort: x.cohort, startDate: x.startDate ?? "", endDate: x.endDate ?? "", status: x.status }); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = async (e: FormEvent) => { e.preventDefault(); try { setSaving(true); setError(""); const input = { ...form, startDate: form.startDate || null, endDate: form.endDate || null }; const saved = editingId ? await updateIntern({ internId: editingId, ...input }) : await createIntern(input); setItems((old) => editingId ? old.map((x) => x.id === saved.id ? saved : x) : [saved, ...old]); setShowForm(false); } catch (err) { setError(err instanceof Error ? err.message : "인턴 저장에 실패했습니다."); } finally { setSaving(false); } };
  return <>
    <header className="page-header project-page-header"><div><p className="eyebrow">MANAGEMENT</p><h1>Interns</h1><p>인턴 참여 이력과 종료 상태를 관리합니다.</p></div><button className="primary-button" onClick={() => { if (showForm) setShowForm(false); else { setEditingId(null); setForm(emptyForm); setShowForm(true); } }}>{showForm ? "취소" : "+ 인턴 등록"}</button></header>
    {error && <div className="notice-message">{error}</div>}
    {showForm && <section className="project-form-card"><h2>{editingId ? "인턴 수정" : "새 인턴 등록"}</h2><form className="project-form" onSubmit={submit}><div className="form-grid"><label>이름 *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>상태<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as InternStatus })}>{statuses.map((s) => <option key={s} value={s}>{INTERN_STATUS_LABELS[s]}</option>)}</select></label></div><div className="form-grid"><label>학교<input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} /></label><label>전공<input value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} /></label></div><label>기수 / 프로그램<input value={form.cohort} onChange={(e) => setForm({ ...form, cohort: e.target.value })} /></label><div className="form-grid"><label>시작일<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label><label>종료일<input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label></div><div className="form-actions"><button className="primary-button" disabled={saving}>저장</button></div></form></section>}
    {loading ? <ScreenState kind="loading" title="인턴 목록을 불러오는 중입니다." /> : items.length === 0 ? <ScreenState kind="empty" title="등록된 인턴이 없습니다." /> : <section className="intern-table-card"><div className="intern-table-scroll"><div className="intern-table-header"><span>이름</span><span>학교 / 전공</span><span>기수</span><span>참여 기간</span><span>연결 계정</span><span>상태</span><span>관리</span></div>{items.map((x) => <div className="intern-table-row" key={x.id}><div className="intern-name-cell"><strong>{x.name}</strong><small>{profiles.find((p) => p.id === x.userUid)?.email || "이메일 정보 없음"}</small></div><div className="intern-detail-cell"><strong>{x.school || "-"}</strong><span>{x.major || "전공 정보 없음"}</span></div><span>{x.cohort || "-"}</span><span className="intern-period">{formatPeriod(x.startDate, x.endDate)}</span><select aria-label={`${x.name} 계정 연결`} value={x.userUid ?? ""} onChange={(e) => void linkInternProfile(x.id, e.target.value || null).then(load)}><option value="">계정 연결 없음</option>{profiles.map((p) => <option key={p.id} value={p.id}>{p.display_name} ({p.global_role})</option>)}</select><span><span className="status-badge">{INTERN_STATUS_LABELS[x.status]}</span></span><button className="edit-button" onClick={() => openEdit(x)}>수정</button></div>)}</div></section>}
  </>;
}

function formatPeriod(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "기간 미정";
  return `${startDate || "미정"} ~ ${endDate || "진행 중"}`;
}
