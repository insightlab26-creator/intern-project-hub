import { useState, type FormEvent } from "react";
import { WORKSTREAM_STATUS_LABELS } from "../../../../constants/domainLabels";
import type { CreateWorkstreamInput, Workstream, WorkstreamStatus } from "../../../../types/domain";
import { V2Button } from "../../../ui/V2Button";
import { V2Input } from "../../../ui/V2Input";
import { V2Modal } from "../../../ui/V2Modal";
import { V2Select } from "../../../ui/V2Select";

type FormState = Pick<CreateWorkstreamInput, "name" | "description" | "status" | "order">;
type Props = { projectId: string; workstream?: Workstream; suggestedOrder: number; saving: boolean; error: string; onClose: () => void; onSave: (input: CreateWorkstreamInput, workstreamId?: string) => Promise<void> };
const statuses = Object.keys(WORKSTREAM_STATUS_LABELS) as WorkstreamStatus[];

export default function WorkstreamFormModal({ projectId, workstream, suggestedOrder, saving, error, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(() => workstream ? { name: workstream.name, description: workstream.description, status: workstream.status, order: workstream.order } : { name: "", description: "", status: "PLANNING", order: suggestedOrder });
  const submit = async (event: FormEvent) => { event.preventDefault(); try { await onSave({ projectId, name: form.name, description: form.description, status: form.status, order: form.order }, workstream?.id); onClose(); } catch { /* The calling tab renders the service error in this form. */ } };
  return <V2Modal open title={workstream ? "Edit workstream" : "Add workstream"} onClose={onClose} footer={<><V2Button variant="secondary" type="button" onClick={onClose}>Cancel</V2Button><V2Button type="submit" form="v2-workstream-form" isLoading={saving}>{workstream ? "Save changes" : "Add workstream"}</V2Button></>}><form id="v2-workstream-form" className="v2-project-form" onSubmit={(event) => void submit(event)}>{error && <p className="v2-form-error">{error}</p>}<V2Input required label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><label className="v2-field"><span>Description</span><textarea className="v2-textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="v2-form-grid"><V2Select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as WorkstreamStatus })}>{statuses.map((status) => <option key={status} value={status}>{WORKSTREAM_STATUS_LABELS[status]}</option>)}</V2Select><V2Input required label="Sort order" min={1} type="number" value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) || 1 })} /></div></form></V2Modal>;
}
