import { useState, type FormEvent } from "react";
import { PROGRAM_STATUS_LABELS } from "../../constants/domainLabels";
import type { Program, ProgramInput, ProgramStatus } from "../../types/domain";
import { V2Button } from "../ui/V2Button";
import { V2Input } from "../ui/V2Input";
import { V2Modal } from "../ui/V2Modal";
import { V2Select } from "../ui/V2Select";

type FormState = { code: string; name: string; description: string; status: ProgramStatus; startDate: string; endDate: string };
type Props = { program?: Program; saving: boolean; error: string; onClose: () => void; onSave: (input: ProgramInput, id?: string) => Promise<void> };
const statuses = Object.keys(PROGRAM_STATUS_LABELS) as ProgramStatus[];
const defaultForm = (program?: Program): FormState => program ? { code: program.code, name: program.name, description: program.description, status: program.status, startDate: program.startDate ?? "", endDate: program.endDate ?? "" } : { code: "", name: "", description: "", status: "PLANNING", startDate: "", endDate: "" };

export default function ProgramFormModal({ program, saving, error, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(() => defaultForm(program)); const [validationError, setValidationError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setValidationError(""); if (form.startDate && form.endDate && form.startDate > form.endDate) { setValidationError("Start date must be on or before end date."); return; } try { await onSave({ ...form, startDate: form.startDate || null, endDate: form.endDate || null }, program?.id); } catch { /* The page renders the service error in this form. */ } };
  return <V2Modal open title={program ? "Edit program" : "New program"} onClose={onClose} footer={<><V2Button type="button" variant="secondary" onClick={onClose}>Cancel</V2Button><V2Button type="submit" form="v2-program-form" isLoading={saving}>{program ? "Save changes" : "Create program"}</V2Button></>}><form id="v2-program-form" className="v2-project-form" onSubmit={(event) => void submit(event)}>{(error || validationError) && <p className="v2-form-error">{validationError || error}</p>}<div className="v2-form-grid"><V2Input required label="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /><V2Input required label="Program name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><V2Select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProgramStatus })}>{statuses.map((status) => <option key={status} value={status}>{PROGRAM_STATUS_LABELS[status]}</option>)}</V2Select></div><label className="v2-field"><span>Description</span><textarea className="v2-textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="v2-form-grid"><V2Input label="Start date" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /><V2Input label="End date" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></div></form></V2Modal>;
}
