import { useState, type FormEvent } from "react";
import { MEMBERSHIP_STATUS_LABELS } from "../../../constants/domainLabels";
import type { MembershipStatus, ProgramProject, Project } from "../../../types/domain";
import { V2Button } from "../../ui/V2Button";
import { V2Modal } from "../../ui/V2Modal";
import { V2Select } from "../../ui/V2Select";

type Props = { projects: Project[]; link?: ProgramProject; saving: boolean; error: string; onClose: () => void; onSave: (projectId: string, status: MembershipStatus, id?: string) => Promise<void> };
const statuses = Object.keys(MEMBERSHIP_STATUS_LABELS) as MembershipStatus[];

export default function ProgramProjectFormModal({ projects, link, saving, error, onClose, onSave }: Props) {
  const [projectId, setProjectId] = useState(link?.projectId ?? ""); const [status, setStatus] = useState<MembershipStatus>(link?.status ?? "ACTIVE"); const [validationError, setValidationError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setValidationError(""); if (!projectId) { setValidationError("Select a project."); return; } try { await onSave(projectId, status, link?.id); onClose(); } catch { /* The Projects tab renders the service error in this form. */ } };
  return <V2Modal open title={link ? "Edit connection" : "Link project"} onClose={onClose} footer={<><V2Button type="button" variant="secondary" onClick={onClose}>Cancel</V2Button><V2Button type="submit" form="v2-program-project-form" isLoading={saving}>{link ? "Save changes" : "Link project"}</V2Button></>}><form id="v2-program-project-form" className="v2-project-form" onSubmit={(event) => void submit(event)}>{(error || validationError) && <p className="v2-form-error">{validationError || error}</p>}<V2Select required disabled={Boolean(link)} label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name} ({project.code})</option>)}</V2Select><V2Select label="Connection status" value={status} onChange={(event) => setStatus(event.target.value as MembershipStatus)}>{statuses.map((item) => <option key={item} value={item}>{MEMBERSHIP_STATUS_LABELS[item]}</option>)}</V2Select>{link && <p className="v2-program-project-form__notice">연결 관계는 삭제하지 않습니다. Program에서 더 이상 운영하지 않는 Project는 INACTIVE로 기록합니다.</p>}</form></V2Modal>;
}
