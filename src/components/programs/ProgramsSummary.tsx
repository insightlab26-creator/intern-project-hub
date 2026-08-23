type Props = { total: number; active: number; planning: number; completed: number; activeEnrollments: number };

export default function ProgramsSummary({ total, active, planning, completed, activeEnrollments }: Props) {
  const items = [["TOTAL", total], ["ACTIVE", active], ["PLANNING", planning], ["COMPLETED", completed], ["ACTIVE ENROLLMENTS", activeEnrollments]];
  return <div className="v2-programs-summary" aria-label="Programs summary">{items.map(([label, value]) => <span key={String(label)}><small>{label}</small><strong>{value}</strong></span>)}</div>;
}
