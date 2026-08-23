import { INTERN_REVIEW_STATUS_LABELS } from "../../../constants/domainLabels";
import type { ReactNode } from "react";
import type { Intern, InternReview, Project } from "../../../types/domain";
import { V2Badge } from "../../ui/V2Badge";
import { V2Button } from "../../ui/V2Button";

type Props = { review: InternReview; intern?: Intern; project?: Project; onClose: () => void };
const formatDateTime = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)) : "—";

export default function ProgramEvaluationDetailPanel({ review, intern, project, onClose }: Props) {
  const scores = [["Problem understanding", review.problemUnderstanding], ["Research & analysis", review.researchAnalysis], ["Work quality", review.workQuality], ["Communication", review.communication], ["Feedback application", review.feedbackApplication], ["Ownership & growth", review.ownershipGrowth]];
  return <aside className="v2-program-evaluation-panel" aria-label="Evaluation details"><header><div><span>INTERN EVALUATION</span><h2>{intern?.name ?? "Intern unavailable"}</h2><p>{review.reviewCycle}</p></div><V2Button type="button" variant="ghost" aria-label="Close evaluation details" onClick={onClose}>×</V2Button></header><div className="v2-program-evaluation-panel__body"><section className="v2-program-evaluation-facts"><Fact label="STATUS" value={<V2Badge variant={review.status === "FINALIZED" ? "success" : "neutral"}>{INTERN_REVIEW_STATUS_LABELS[review.status]}</V2Badge>} /><Fact label="CONTEXT" value={project?.name ?? "Program-level evaluation"} /><Fact label="CREATED" value={formatDateTime(review.createdAt)} /><Fact label="UPDATED" value={formatDateTime(review.updatedAt)} />{review.status === "FINALIZED" && <Fact label="FINALIZED" value={formatDateTime(review.finalizedAt)} />}</section><section className="v2-program-evaluation-panel-section"><h3>Competencies</h3><div className="v2-program-evaluation-score-list">{scores.map(([label, score]) => <span key={String(label)}><small>{label}</small><strong>{score} / 5</strong></span>)}</div></section><ReviewText title="Strengths" value={review.strengths} /><ReviewText title="Improvements" value={review.improvements} /><ReviewText title="Growth goals" value={review.growthGoals} /></div></aside>;
}

function Fact({ label, value }: { label: string; value: ReactNode }) { return <div><small>{label}</small><strong>{value}</strong></div>; }
function ReviewText({ title, value }: { title: string; value: string }) { return value ? <section className="v2-program-evaluation-panel-section"><h3>{title}</h3><p>{value}</p></section> : null; }
