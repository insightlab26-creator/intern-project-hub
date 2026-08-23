type Props = { inReview: number; overdue: number; projects: number; assignees: number };

export default function ReviewQueueSummary({ inReview, overdue, projects, assignees }: Props) {
  const items = [["IN REVIEW", inReview], ["OVERDUE", overdue], ["PROJECTS", projects], ["ASSIGNEES", assignees]];
  return <div className="v2-review-queue-summary" aria-label="Review queue summary">{items.map(([label, value]) => <span key={String(label)}><small>{label}</small><strong>{value}</strong></span>)}</div>;
}
