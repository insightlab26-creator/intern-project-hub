import { useState, type FormEvent } from "react";
import { REVIEW_GATE_RESULT_LABELS } from "../../../../constants/domainLabels";
import type { ReviewGateResult } from "../../../../types/domain";
import { V2Button } from "../../../ui/V2Button";
import { V2Input } from "../../../ui/V2Input";
import { V2Modal } from "../../../ui/V2Modal";
import { V2Select } from "../../../ui/V2Select";

type Props = { saving: boolean; error: string; onClose: () => void; onSave: (result: ReviewGateResult, summary: string, nextAction: string, sourceUrl: string, dropReason: string) => Promise<void> };
const results = Object.keys(REVIEW_GATE_RESULT_LABELS) as ReviewGateResult[];

export default function ReviewFormModal({ saving, error, onClose, onSave }: Props) {
  const [result, setResult] = useState<ReviewGateResult>("REVISE"); const [summary, setSummary] = useState(""); const [nextAction, setNextAction] = useState(""); const [sourceUrl, setSourceUrl] = useState(""); const [dropReason, setDropReason] = useState(""); const [validationError, setValidationError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setValidationError(""); if (result === "DROP" && !dropReason.trim()) { setValidationError("DROP reason is required when the result is DROP."); return; } try { await onSave(result, summary, nextAction, sourceUrl, dropReason); onClose(); } catch { /* The Reviews tab renders the service error in this form. */ } };
  return <V2Modal open title="Add review" onClose={onClose} footer={<><V2Button type="button" variant="secondary" onClick={onClose}>Cancel</V2Button><V2Button type="submit" form="v2-review-form" isLoading={saving}>Add review</V2Button></>}><form id="v2-review-form" className="v2-project-form" onSubmit={(event) => void submit(event)}>{(validationError || error) && <p className="v2-form-error">{validationError || error}</p>}<p className="v2-review-form__notice">Review date is recorded automatically when this decision is added. Existing reviews cannot be edited or replaced.</p><V2Select label="Result" value={result} onChange={(event) => setResult(event.target.value as ReviewGateResult)}>{results.map((item) => <option key={item} value={item}>{item} — {REVIEW_GATE_RESULT_LABELS[item]}</option>)}</V2Select><label className="v2-field"><span>Summary</span><textarea required className="v2-textarea" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="What was decided and why?" /></label><label className="v2-field"><span>Next action</span><textarea className="v2-textarea" value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="Optional follow-up action" /></label><V2Input label="Meeting / source URL" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" />{result === "DROP" && <label className="v2-field"><span>DROP reason</span><textarea required className="v2-textarea" value={dropReason} onChange={(event) => setDropReason(event.target.value)} placeholder="Why should this project stop?" /></label>}</form></V2Modal>;
}
