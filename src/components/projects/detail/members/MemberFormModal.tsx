import { useState, type FormEvent } from "react";
import { MEMBERSHIP_STATUS_LABELS, PROJECT_MEMBER_ROLE_LABELS } from "../../../../constants/domainLabels";
import type { Intern, MembershipStatus, ProjectMember, ProjectMemberRole } from "../../../../types/domain";
import { V2Button } from "../../../ui/V2Button";
import { V2Modal } from "../../../ui/V2Modal";
import { V2Select } from "../../../ui/V2Select";

type Props = { interns: Intern[]; member?: ProjectMember; saving: boolean; error: string; onClose: () => void; onSave: (internId: string, role: ProjectMemberRole, status: MembershipStatus, id?: string) => Promise<void> };
const roles = Object.keys(PROJECT_MEMBER_ROLE_LABELS) as ProjectMemberRole[];
const statuses = Object.keys(MEMBERSHIP_STATUS_LABELS) as MembershipStatus[];

export default function MemberFormModal({ interns, member, saving, error, onClose, onSave }: Props) {
  const [internId, setInternId] = useState(member?.internId ?? ""); const [role, setRole] = useState<ProjectMemberRole>(member?.role ?? "MEMBER"); const [status, setStatus] = useState<MembershipStatus>(member?.status ?? "ACTIVE"); const [validationError, setValidationError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setValidationError(""); if (!internId) { setValidationError("Select an intern."); return; } try { await onSave(internId, role, status, member?.id); onClose(); } catch { /* The Members tab renders the service error in this form. */ } };
  return <V2Modal open title={member ? "Edit member" : "Add member"} onClose={onClose} footer={<><V2Button type="button" variant="secondary" onClick={onClose}>Cancel</V2Button><V2Button type="submit" form="v2-member-form" isLoading={saving}>{member ? "Save changes" : "Add member"}</V2Button></>}><form id="v2-member-form" className="v2-project-form" onSubmit={(event) => void submit(event)}>{(validationError || error) && <p className="v2-form-error">{validationError || error}</p>}<V2Select required disabled={Boolean(member)} label="Intern" value={internId} onChange={(event) => setInternId(event.target.value)}><option value="">Select intern</option>{interns.map((intern) => <option key={intern.id} value={intern.id}>{intern.name}</option>)}</V2Select><V2Select label="Role" value={role} onChange={(event) => setRole(event.target.value as ProjectMemberRole)}>{roles.map((item) => <option key={item} value={item}>{PROJECT_MEMBER_ROLE_LABELS[item]}</option>)}</V2Select><V2Select label="Participation status" value={status} onChange={(event) => setStatus(event.target.value as MembershipStatus)}>{statuses.map((item) => <option key={item} value={item}>{MEMBERSHIP_STATUS_LABELS[item]}</option>)}</V2Select>{member && <p className="v2-member-form__notice">Member 관계는 삭제하지 않습니다. 참여 종료 또는 재참여는 status를 변경해 기록합니다.</p>}</form></V2Modal>;
}
