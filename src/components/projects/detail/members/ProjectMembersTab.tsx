import { useMemo, useState } from "react";
import { MEMBERSHIP_STATUS_LABELS, PROJECT_MEMBER_ROLE_LABELS } from "../../../../constants/domainLabels";
import type { Intern, MembershipStatus, ProjectMember, ProjectMemberRole, Task } from "../../../../types/domain";
import { V2Badge } from "../../../ui/V2Badge";
import { V2Button } from "../../../ui/V2Button";
import { V2Card } from "../../../ui/V2Card";
import { V2EmptyState } from "../../../ui/V2EmptyState";
import { V2Input } from "../../../ui/V2Input";
import { V2Select } from "../../../ui/V2Select";
import MemberFormModal from "./MemberFormModal";

type Filter = "ALL" | MembershipStatus;
type Props = { members: ProjectMember[]; interns: Intern[]; tasks: Task[]; loading: boolean; error: string; saving: boolean; onRetry: () => void; onSave: (internId: string, role: ProjectMemberRole, status: MembershipStatus, id?: string) => Promise<void> };
const errorMessage = (caught: unknown) => caught instanceof Error ? caught.message : "Member could not be saved.";

export default function ProjectMembersTab({ members, interns, tasks, loading, error, saving, onRetry, onSave }: Props) {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState<Filter>("ALL"); const [editing, setEditing] = useState<ProjectMember | "create" | null>(null); const [formError, setFormError] = useState("");
  const internMap = useMemo(() => new Map(interns.map((intern) => [intern.id, intern])), [interns]); const memberIds = useMemo(() => new Set(members.map((member) => member.internId)), [members]); const addCandidates = interns.filter((intern) => !memberIds.has(intern.id));
  const assignedCount = useMemo(() => new Map(interns.map((intern) => [intern.id, tasks.filter((task) => task.assigneeInternIds.includes(intern.id)).length])), [interns, tasks]);
  const counts = useMemo(() => ({ total: members.length, active: members.filter((member) => member.status === "ACTIVE").length, inactive: members.filter((member) => member.status === "INACTIVE").length }), [members]);
  const visible = useMemo(() => members.filter((member) => { const name = internMap.get(member.internId)?.name ?? ""; return (filter === "ALL" || member.status === filter) && (!query.trim() || name.toLocaleLowerCase("ko-KR").includes(query.trim().toLocaleLowerCase("ko-KR"))); }), [filter, internMap, members, query]);
  const openForm = (member?: ProjectMember) => { setFormError(""); setEditing(member ?? "create"); };
  const save = async (internId: string, role: ProjectMemberRole, status: MembershipStatus, id?: string) => { try { setFormError(""); await onSave(internId, role, status, id); } catch (caught) { setFormError(errorMessage(caught)); throw caught; } };
  if (loading) return <V2Card><V2EmptyState title="Loading members" description="프로젝트 참여 인턴을 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load members" description={error} action={<V2Button type="button" onClick={onRetry}>Try again</V2Button>} /></V2Card>;
  return <section className="v2-members">
    <header className="v2-members__header"><div><h2>Members</h2><p>프로젝트에 참여하는 인턴과 역할을 관리합니다.</p></div><V2Button type="button" onClick={() => openForm()}>+ Add Member</V2Button></header>
    <div className="v2-member-stats"><span><small>TOTAL</small><strong>{counts.total}</strong></span><span><small>ACTIVE</small><strong>{counts.active}</strong></span><span><small>INACTIVE</small><strong>{counts.inactive}</strong></span></div>
    {members.length === 0 ? <V2Card><V2EmptyState title="No members yet" description="프로젝트에 참여할 인턴을 추가하세요." action={<V2Button type="button" onClick={() => openForm()}>+ Add Member</V2Button>} /></V2Card> : <>
      <div className="v2-member-toolbar"><V2Input aria-label="Search members" placeholder="Search intern…" value={query} onChange={(event) => setQuery(event.target.value)} /><V2Select aria-label="Filter members by status" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}><option value="ALL">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></V2Select></div>
      {visible.length === 0 ? <V2Card><V2EmptyState title="No matching members" description="다른 검색어 또는 상태 필터를 사용해보세요." /></V2Card> : <div className="v2-member-list">{visible.map((member) => <MemberListItem key={member.id} member={member} intern={internMap.get(member.internId)} assignedTaskCount={assignedCount.get(member.internId) ?? 0} onEdit={() => openForm(member)} />)}</div>}
    </>}
    {editing && <MemberFormModal interns={editing === "create" ? addCandidates : interns} member={editing === "create" ? undefined : editing} saving={saving} error={formError} onClose={() => setEditing(null)} onSave={save} />}
  </section>;
}

function MemberListItem({ member, intern, assignedTaskCount, onEdit }: { member: ProjectMember; intern?: Intern; assignedTaskCount: number; onEdit: () => void }) { return <V2Card className={`v2-member-item${member.status === "INACTIVE" ? " v2-member-item--inactive" : ""}`}><div className="v2-member-item__identity"><strong>{intern?.name ?? "Intern unavailable"}</strong><span>{intern ? `Intern status: ${intern.status}` : "Intern record unavailable"}</span></div><V2Badge variant={member.role === "OWNER" ? "info" : "neutral"}>{PROJECT_MEMBER_ROLE_LABELS[member.role]}</V2Badge><V2Badge variant={member.status === "ACTIVE" ? "success" : "neutral"}>{MEMBERSHIP_STATUS_LABELS[member.status]}</V2Badge><span className="v2-member-item__tasks">Assigned Tasks {assignedTaskCount}</span><details className="v2-member-actions"><summary aria-label={`${intern?.name ?? "Member"} actions`}>•••</summary><button type="button" onClick={onEdit}>Edit member</button></details></V2Card>; }
