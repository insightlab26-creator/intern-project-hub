type Props = { total: number; active: number; planned: number; overdueTasks: number; inReview: number };

export default function InternsSummary({ total, active, planned, overdueTasks, inReview }: Props) {
  const items = [["TOTAL", total], ["ACTIVE", active], ["PLANNED", planned], ["OVERDUE TASKS", overdueTasks], ["IN REVIEW", inReview]];
  return <div className="v2-interns-summary" aria-label="Interns summary">{items.map(([label, value]) => <span key={String(label)}><small>{label}</small><strong>{value}</strong></span>)}</div>;
}
