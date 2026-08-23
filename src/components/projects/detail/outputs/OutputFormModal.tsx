import { useState, type FormEvent } from "react";
import type { DocumentLink, DocumentLinkInput, Task } from "../../../../types/domain";
import { V2Button } from "../../../ui/V2Button";
import { V2Input } from "../../../ui/V2Input";
import { V2Modal } from "../../../ui/V2Modal";
import { V2Select } from "../../../ui/V2Select";

type Props = { projectId: string; tasks: Task[]; document?: DocumentLink; saving: boolean; error: string; onClose: () => void; onSave: (input: DocumentLinkInput, id?: string, previousUrl?: string) => Promise<void> };

export default function OutputFormModal({ projectId, tasks, document, saving, error, onClose, onSave }: Props) {
  const [title, setTitle] = useState(document?.title ?? ""); const [description, setDescription] = useState(document?.description ?? ""); const [url, setUrl] = useState(document?.url ?? ""); const [taskId, setTaskId] = useState(document?.taskId ?? ""); const [archived, setArchived] = useState(document?.archived ?? false);
  const isResource = document?.source === "RESOURCE";
  const submit = async (event: FormEvent) => { event.preventDefault(); try { await onSave({ projectId, taskId: taskId || null, title, description, url, archived, source: document?.source ?? "DOCUMENT" }, document?.id, document?.url ?? ""); onClose(); } catch { /* The Outputs tab renders the service error in this form. */ } };
  return <V2Modal open title={document ? `Edit ${isResource ? "resource" : "output"}` : "Add output"} onClose={onClose} footer={<><V2Button type="button" variant="secondary" onClick={onClose}>Cancel</V2Button><V2Button type="submit" form="v2-output-form" isLoading={saving}>{document ? "Save changes" : "Add output"}</V2Button></>}><form id="v2-output-form" className="v2-project-form" onSubmit={(event) => void submit(event)}>{error && <p className="v2-form-error">{error}</p>}<V2Select label="Type" disabled value={document?.source ?? "DOCUMENT"}><option value="DOCUMENT">OUTPUT</option>{isResource && <option value="RESOURCE">RESOURCE</option>}</V2Select>{!document && <p className="v2-output-form__notice">새 Resource 등록은 현재 service에서 지원하지 않습니다. Output은 Teams 원본 링크를 인덱싱합니다.</p>}<V2Input required label="Title" value={title} onChange={(event) => setTitle(event.target.value)} /><label className="v2-field"><span>Description</span><textarea className="v2-textarea" value={description} onChange={(event) => setDescription(event.target.value)} /></label><V2Select label="Linked task" value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">Project level</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</V2Select><V2Input required label="Teams / source URL" type="url" placeholder="https://" value={url} onChange={(event) => setUrl(event.target.value)} />{document && <label className="v2-checkbox-field"><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />Archived</label>}</form></V2Modal>;
}
