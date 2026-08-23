import { useState } from "react";
import { REVIEW_GATE_RESULT_LABELS } from "../../../../constants/domainLabels";
import type { ReviewGate, ReviewGateResult } from "../../../../types/domain";
import { V2Badge } from "../../../ui/V2Badge";
import { V2Button } from "../../../ui/V2Button";
import { V2Card } from "../../../ui/V2Card";
import { V2EmptyState } from "../../../ui/V2EmptyState";
import ReviewFormModal from "./ReviewFormModal";

type Props = { reviews: ReviewGate[]; loading: boolean; error: string; saving: boolean; onRetry: () => void; onSave: (result: ReviewGateResult, summary: string, nextAction: string, sourceUrl: string, dropReason: string) => Promise<void> };
type Variant = "neutral" | "success" | "warning" | "danger" | "info";
const variants: Record<ReviewGateResult, Variant> = { REVISE: "warning", KEEP: "info", ASSET: "success", DROP: "danger" };
const formatDate = (date: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date));
const errorMessage = (caught: unknown) => caught instanceof Error ? caught.message : "Review could not be saved.";

export default function ProjectReviewsTab({ reviews, loading, error, saving, onRetry, onSave }: Props) {
  const [adding, setAdding] = useState(false); const [formError, setFormError] = useState("");
  const save = async (result: ReviewGateResult, summary: string, nextAction: string, sourceUrl: string, dropReason: string) => { try { setFormError(""); await onSave(result, summary, nextAction, sourceUrl, dropReason); } catch (caught) { setFormError(errorMessage(caught)); throw caught; } };
  const openForm = () => { setFormError(""); setAdding(true); };
  if (loading) return <V2Card><V2EmptyState title="Loading reviews" description="프로젝트 검토 이력을 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load reviews" description={error} action={<V2Button type="button" onClick={onRetry}>Try again</V2Button>} /></V2Card>;
  return <section className="v2-reviews"><header className="v2-reviews__header"><div><h2>Reviews</h2><p>프로젝트 주요 검토 결과와 후속 조치를 기록합니다.</p></div><V2Button type="button" onClick={openForm}>+ Add Review</V2Button></header>{reviews.length === 0 ? <V2Card><V2EmptyState title="No reviews yet" description="첫 번째 프로젝트 검토 결과를 기록하세요." action={<V2Button type="button" onClick={openForm}>+ Add Review</V2Button>} /></V2Card> : <div className="v2-review-history">{reviews.map((review) => <ReviewHistoryItem key={review.id} review={review} />)}</div>}{adding && <ReviewFormModal saving={saving} error={formError} onClose={() => setAdding(false)} onSave={save} />}</section>;
}

function ReviewHistoryItem({ review }: { review: ReviewGate }) { return <V2Card className="v2-review-history-item"><header><time dateTime={review.reviewedAt}>{formatDate(review.reviewedAt)}</time><V2Badge variant={variants[review.result]}>{review.result} · {REVIEW_GATE_RESULT_LABELS[review.result]}</V2Badge></header><div className="v2-review-history-item__summary"><h3>Summary</h3><p>{review.comments}</p></div>{review.nextAction && <div><h3>Next action</h3><p>{review.nextAction}</p></div>}{review.sourceUrl && <a href={review.sourceUrl} target="_blank" rel="noreferrer">Meeting notes ↗</a>}{review.result === "DROP" && review.dropReason && <div className="v2-review-history-item__drop"><h3>DROP reason</h3><p>{review.dropReason}</p></div>}</V2Card>; }
