type Props = { total: number; inReview: number; pendingUpdates: number; overdue: number; projects: number };

export default function ReviewQueueSummary({ total, inReview, pendingUpdates, overdue, projects }: Props) {
  const items = [["TOTAL WAITING", total], ["TASKS IN REVIEW", inReview], ["PENDING UPDATES", pendingUpdates], ["OVERDUE TASKS", overdue], ["PROJECTS", projects]];
  return <div className="v2-review-queue-summary" aria-label="Review inbox summary">{items.map(([label, value]) => <span key={String(label)}><small>{label}</small><strong>{value}</strong></span>)}</div>;
}
