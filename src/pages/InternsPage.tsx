import { useCallback, useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { createIntern, getInterns, linkInternProfile, updateIntern } from "../services/internService";
import { getUserProfiles, type UserProfile } from "../services/authService";
import ScreenState from "../components/ScreenState";
import type { Intern, InternStatus } from "../types/domain";
import { INTERN_STATUS_LABELS } from "../constants/domainLabels";

const statuses = Object.keys(INTERN_STATUS_LABELS) as InternStatus[];
const emptyForm = { name: "", school: "", major: "", cohort: "", startDate: "", endDate: "", status: "ACTIVE" as InternStatus };
const statLabels = ["업무 완료율", "협업/피드백 점수", "제출 문서 품질", "리뷰 평점", "프로젝트 기여도", "일정 준수율", "성장 속도"];
const sampleCards = [
  { name: "안예중", team: "인턴팀", level: 21, rank: "D", portrait: 7, stats: [10, 10, 10, 10, 10, 10, 10] },
  { name: "가현", team: "인턴팀", level: 2, rank: "D", portrait: 7, stats: [20, 20, 20, 20, 20, 20, 20] },
  { name: "김진우", team: "인턴팀", level: 5, rank: "D", portrait: 6, stats: [30, 30, 30, 30, 30, 30, 30] },
  { name: "조선우", team: "D.서비스사업팀", level: 21, rank: "C", portrait: 5, stats: [58, 62, 55, 60, 57, 65, 50] },
  { name: "김민지", team: "D.플랫폼영업팀", level: 24, rank: "B", portrait: 3, stats: [70, 74, 68, 72, 75, 80, 60] },
  { name: "김동환", team: "사업지원팀", level: 27, rank: "A", portrait: 2, stats: [80, 92, 86, 88, 79, 85, 68] },
  { name: "정종진", team: "사업수행팀", level: 29, rank: "A", portrait: 1, stats: [85, 80, 78, 82, 88, 90, 72] },
  { name: "임재춘", team: "BX부문장", level: 32, rank: "S", portrait: 0, stats: [92, 88, 95, 90, 94, 87, 80] },
] as const;

const rankStyles: Record<string, { color: string; gradient: string; soft: string }> = {
  S: { color: "#f0a63a", gradient: "linear-gradient(135deg,#ffd36e,#f0a63a)", soft: "#fdf3e6" },
  A: { color: "#3b5bff", gradient: "linear-gradient(135deg,#8b7bf7,#3b5bff)", soft: "#eef1ff" },
  B: { color: "#22b07d", gradient: "linear-gradient(135deg,#5fd7a8,#22b07d)", soft: "#e0f7e9" },
  C: { color: "#9296a1", gradient: "linear-gradient(135deg,#c4c7d0,#9296a1)", soft: "#f2f3f6" },
  D: { color: "#ef5b5b", gradient: "linear-gradient(135deg,#ff9b9b,#ef5b5b)", soft: "#fdeeee" },
};

type Card = { key: string; intern: Intern | null; name: string; team: string; level: number; rank: string; stats: readonly number[]; portrait: string; total: number };

function formatPeriod(start: string | null, end: string | null) { return `${start || "시작일 미정"} ~ ${end || "진행 중"}`; }
function barColor(value: number) { if (value >= 85) return "#3b5bff"; if (value >= 70) return "#22b07d"; if (value >= 55) return "#f0a63a"; return "#ef5b5b"; }

export default function InternsPage() {
  const [items, setItems] = useState<Intern[]>([]); const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false); const [editingId, setEditingId] = useState<string | null>(null); const [selected, setSelected] = useState<Card | null>(null);
  const [form, setForm] = useState(emptyForm);
  const load = useCallback(async () => { await Promise.resolve(); try { setLoading(true); setError(""); const [internList, profileList] = await Promise.all([getInterns(), getUserProfiles()]); setItems(internList); setProfiles(profileList); } catch (e) { setError(e instanceof Error ? e.message : "인턴 목록을 불러오지 못했습니다."); } finally { setLoading(false); } }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!selected) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [selected]);

  const cards = useMemo<Card[]>(() => sampleCards.map((sample, index) => {
    const intern = items[index] ?? null; const stats = sample.stats; const total = Math.round(stats.reduce((sum, value) => sum + value, 0) / stats.length);
    return { key: `sample-${sample.name}`, intern, name: sample.name, team: sample.team, level: sample.level, rank: sample.rank, stats, portrait: `/intern-cards/portrait-${sample.portrait}.webp`, total };
  }), [items]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openEdit = (intern: Intern) => { setSelected(null); setEditingId(intern.id); setForm({ name: intern.name, school: intern.school, major: intern.major, cohort: intern.cohort, startDate: intern.startDate ?? "", endDate: intern.endDate ?? "", status: intern.status }); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = async (event: FormEvent) => { event.preventDefault(); try { setSaving(true); setError(""); const input = { ...form, startDate: form.startDate || null, endDate: form.endDate || null }; const saved = editingId ? await updateIntern({ internId: editingId, ...input }) : await createIntern(input); setItems((old) => editingId ? old.map((item) => item.id === saved.id ? saved : item) : [saved, ...old]); setShowForm(false); } catch (err) { setError(err instanceof Error ? err.message : "인턴 저장에 실패했습니다."); } finally { setSaving(false); } };
  const stop = (event: MouseEvent) => event.stopPropagation();

  return <div className="intern-collection-page">
    <header className="page-header intern-collection-header"><div><p className="eyebrow">INTERN COLLECTION</p><h1>인턴 컬렉션 카드</h1><p>이번 기수 인턴들의 성취를 캐릭터 카드로 비교해보세요.</p></div><div className="intern-header-actions"><span className="intern-card-count">등록 카드 {cards.length} / {cards.length}</span><button className="primary-button" onClick={() => showForm ? setShowForm(false) : openCreate()}>{showForm ? "취소" : "+ 인턴 등록"}</button></div></header>
    {showForm && <section className="project-form-card intern-form-card"><h2>{editingId ? "인턴 수정" : "새 인턴 등록"}</h2><form className="project-form" onSubmit={submit}><div className="form-grid"><label>이름 *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>상태<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as InternStatus })}>{statuses.map((status) => <option key={status} value={status}>{INTERN_STATUS_LABELS[status]}</option>)}</select></label></div><div className="form-grid"><label>학교<input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} /></label><label>전공<input value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} /></label></div><label>기수 / 프로그램<input value={form.cohort} onChange={(e) => setForm({ ...form, cohort: e.target.value })} /></label><div className="form-grid"><label>시작일<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label><label>종료일<input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label></div><div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? "저장 중..." : "저장"}</button></div></form></section>}
    {error && <div className="notice-message">{error}</div>}
    {loading ? <ScreenState kind="loading" title="인턴 컬렉션을 불러오는 중입니다." /> : <section className="intern-card-grid">{cards.map((card) => { const style = rankStyles[card.rank]; return <button type="button" className="intern-character-card" key={card.key} onClick={() => setSelected(card)}><span className="intern-card-art" style={{ background: style.gradient }}><img src={card.portrait} alt="" /><span className="intern-rank-chip" style={{ color: style.color }}>{card.rank}</span><span className="intern-level-chip">Lv.{card.level}</span><span className="intern-card-identity"><strong>{card.name}</strong><small>{card.team || "소속 미정"}</small></span></span><span className="intern-score-row"><strong>종합 {card.total}</strong><span><i style={{ width: `${card.total}%`, background: style.gradient }} /></span></span></button>; })}</section>}
    {selected && <div className="intern-detail-backdrop" onClick={() => setSelected(null)}><article className="intern-detail-modal" onClick={stop}><section className="intern-detail-art" style={{ backgroundImage: `url(/intern-cards/bg-rank-${selected.rank.toLowerCase()}.jpg)` }}><img src={selected.portrait} alt="" /><span className="intern-rank-chip" style={{ color: rankStyles[selected.rank].color }}>{selected.rank}</span><div><strong>{selected.name}</strong><span>{selected.team || "소속 미정"} · Lv.{selected.level}</span></div></section><section className="intern-detail-content"><header><h2>캐릭터 정보</h2><button type="button" aria-label="닫기" onClick={() => setSelected(null)}>×</button></header><div className="intern-detail-summary"><span>종합 점수</span><strong>{selected.total}</strong></div><div className="intern-detail-summary" style={{ background: rankStyles[selected.rank].soft, color: rankStyles[selected.rank].color }}><span>등급</span><strong>{selected.rank} 클래스</strong></div>{selected.intern && <div className="intern-record-meta"><div><span>학교 / 전공</span><strong>{selected.intern.school || "-"} · {selected.intern.major || "-"}</strong></div><div><span>참여 기간</span><strong>{formatPeriod(selected.intern.startDate, selected.intern.endDate)}</strong></div><div><span>상태</span><strong>{INTERN_STATUS_LABELS[selected.intern.status]}</strong></div></div>}<div className="intern-stat-list">{selected.stats.map((value, index) => <div key={statLabels[index]}><span>{statLabels[index]}</span><span className="intern-stat-value"><i><b style={{ width: `${value}%`, background: barColor(value) }} /></i><strong style={{ color: barColor(value) }}>{value}</strong></span></div>)}</div>{selected.intern && <div className="intern-detail-actions"><select aria-label={`${selected.name} 계정 연결`} value={selected.intern.userUid ?? ""} onChange={(e) => void linkInternProfile(selected.intern!.id, e.target.value || null).then(load)}><option value="">계정 연결 없음</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name} ({profile.global_role})</option>)}</select><button className="edit-button" type="button" onClick={() => openEdit(selected.intern!)}>인턴 정보 수정</button></div>}</section></article></div>}
  </div>;
}
