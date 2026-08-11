import { useCallback, useEffect, useState, type FormEvent } from "react";
import ScreenState from "./ScreenState";
import { getInterns } from "../services/internService";
import { getProjectMembers, saveProjectMember } from "../services/programService";
import type { Intern, MembershipStatus, ProjectMember, ProjectMemberRole } from "../types/domain";
import { MEMBERSHIP_STATUS_LABELS, PROJECT_MEMBER_ROLE_LABELS } from "../constants/domainLabels";

export default function ProjectMembersTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ProjectMember[]>([]); const [interns, setInterns] = useState<Intern[]>([]); const [internId, setInternId] = useState(""); const [role, setRole] = useState<ProjectMemberRole>("MEMBER"); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { await Promise.resolve(); try { setLoading(true); const [m, i] = await Promise.all([getProjectMembers(projectId), getInterns()]); setItems(m); setInterns(i); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "멤버를 불러오지 못했습니다."); } finally { setLoading(false); } }, [projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const submit = async (e: FormEvent) => { e.preventDefault(); try { await saveProjectMember(projectId, internId, role, "ACTIVE"); setInternId(""); await load(); } catch (x) { setError(x instanceof Error ? x.message : "멤버 저장에 실패했습니다."); } };
  const toggle = async (m: ProjectMember, status: MembershipStatus) => { await saveProjectMember(projectId, m.internId, m.role, status, m.id); await load(); };
  return <><div className="tab-toolbar"><div><h2>Members</h2><p>프로젝트 참여 인턴과 역할을 관리합니다.</p></div></div><form className="relation-form panel" onSubmit={submit}><select required value={internId} onChange={(e) => setInternId(e.target.value)}><option value="">인턴 선택</option>{interns.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select><select value={role} onChange={(e) => setRole(e.target.value as ProjectMemberRole)}>{Object.entries(PROJECT_MEMBER_ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><button className="primary-button">멤버 추가</button></form>{error && <div className="notice-message">{error}</div>}{loading ? <ScreenState kind="loading" title="멤버를 불러오는 중입니다." /> : items.length === 0 ? <ScreenState kind="empty" title="등록된 멤버가 없습니다." /> : <div className="panel">{items.map((m) => <div className="relation-row" key={m.id}><strong>{interns.find((i) => i.id === m.internId)?.name}</strong><span>{PROJECT_MEMBER_ROLE_LABELS[m.role]}</span><span>{MEMBERSHIP_STATUS_LABELS[m.status]}</span><button className="edit-button" onClick={() => void toggle(m, m.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>상태 변경</button></div>)}</div>}</>;
}
