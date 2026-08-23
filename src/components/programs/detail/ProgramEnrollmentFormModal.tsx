import { useState, type FormEvent } from "react";
import { ENROLLMENT_STATUS_LABELS } from "../../../constants/domainLabels";
import type { EnrollmentStatus, Intern, ProgramEnrollment } from "../../../types/domain";
import { V2Button } from "../../ui/V2Button";
import { V2Input } from "../../ui/V2Input";
import { V2Modal } from "../../ui/V2Modal";
import { V2Select } from "../../ui/V2Select";

type Props = { interns: Intern[]; enrollment?: ProgramEnrollment; saving: boolean; error: string; onClose: () => void; onSave: (internId: string, status: EnrollmentStatus, startDate: string | null, endDate: string | null, id?: string) => Promise<void> };
const statuses = Object.keys(ENROLLMENT_STATUS_LABELS) as EnrollmentStatus[];

export default function ProgramEnrollmentFormModal({ interns, enrollment, saving, error, onClose, onSave }: Props) {
  const [internId, setInternId] = useState(enrollment?.internId ?? ""); const [status, setStatus] = useState<EnrollmentStatus>(enrollment?.status ?? "ACTIVE"); const [startDate, setStartDate] = useState(enrollment?.startDate ?? ""); const [endDate, setEndDate] = useState(enrollment?.endDate ?? ""); const [validationError, setValidationError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setValidationError(""); if (!internId) { setValidationError("Select an intern."); return; } if (startDate && endDate && startDate > endDate) { setValidationError("Start date must be on or before end date."); return; } try { await onSave(internId, status, startDate || null, endDate || null, enrollment?.id); onClose(); } catch { /* The Participants tab renders the service error in this form. */ } };
  return <V2Modal open title={enrollment ? "Edit enrollment" : "Add participant"} onClose={onClose} footer={<><V2Button type="button" variant="secondary" onClick={onClose}>Cancel</V2Button><V2Button type="submit" form="v2-enrollment-form" isLoading={saving}>{enrollment ? "Save changes" : "Add participant"}</V2Button></>}><form id="v2-enrollment-form" className="v2-project-form" onSubmit={(event) => void submit(event)}>{(error || validationError) && <p className="v2-form-error">{validationError || error}</p>}<V2Select required disabled={Boolean(enrollment)} label="Intern" value={internId} onChange={(event) => setInternId(event.target.value)}><option value="">Select intern</option>{interns.map((intern) => <option key={intern.id} value={intern.id}>{intern.name}</option>)}</V2Select><V2Select label="Enrollment status" value={status} onChange={(event) => setStatus(event.target.value as EnrollmentStatus)}>{statuses.map((item) => <option key={item} value={item}>{ENROLLMENT_STATUS_LABELS[item]}</option>)}</V2Select><div className="v2-form-grid"><V2Input label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><V2Input label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>{enrollment && <p className="v2-program-enrollment-form__notice">Enrollment 관계는 삭제하지 않습니다. 참여 종료는 COMPLETED 상태로 기록합니다.</p>}</form></V2Modal>;
}
