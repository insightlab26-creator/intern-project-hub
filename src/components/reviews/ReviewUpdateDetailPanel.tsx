import { Link } from "react-router-dom";
import type { Project, Task, TaskUpdate } from "../../types/domain";
import TaskUpdateReviewActions from "../tasks/TaskUpdateReviewActions";
import { V2Button } from "../ui/V2Button";

type Props = { task: Task; project?: Project; update: TaskUpdate; saving: boolean; onClose: () => void; onReview: (id: string, status: "APPROVED" | "CHANGES_REQUESTED", feedback: string) => Promise<void> };
const formatDate = (date: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));

export default function ReviewUpdateDetailPanel({ task, project, update, saving, onClose, onReview }: Props) {
  return <aside className="v2-review-detail-panel" aria-label="Review update details"><header><div><span>UPDATE REVIEW</span><h2>{task.title}</h2><p>{project?.name ?? "Project unavailable"}</p></div><V2Button type="button" variant="ghost" aria-label="Close update details" onClick={onClose}>×</V2Button></header><div className="v2-review-detail-panel__body"><section className="v2-review-detail-facts"><div><small>OCCURRED ON</small><strong>{formatDate(update.occurredOn)}</strong></div><div><small>AUTHOR</small><strong>{update.authorName ?? "Unknown author"}</strong></div></section><section className="v2-review-detail-section v2-review-detail-section--update-fields"><h3>Update details</h3>{update.progress && <UpdateField label="Progress" value={update.progress} />}{update.learning && <UpdateField label="Learning" value={update.learning} />}{update.blockers && <UpdateField label="Blockers" value={update.blockers} />}{update.nextPlan && <UpdateField label="Next plan" value={update.nextPlan} />}</section><section className="v2-review-detail-section v2-review-detail-section--decision"><h3>Manager feedback</h3><TaskUpdateReviewActions update={update} saving={saving} onReview={onReview} /></section></div><footer><Link className="v2-review-detail-panel__open" to={`/admin/tasks/${task.id}`}>Open Task →</Link></footer></aside>;
}

function UpdateField({ label, value }: { label: string; value: string }) { return <div className="v2-review-update__field"><small>{label}</small><p>{value}</p></div>; }
