import type { ProgramRelations } from "../programRelations";
import { getProgramRelationMetrics } from "../programRelations";

export default function ProgramSummaryMetrics({ relations }: { relations: ProgramRelations }) {
  const metrics = getProgramRelationMetrics(relations); const items = [["ENROLLMENTS", metrics.enrollments], ["ACTIVE", metrics.activeEnrollments], ["PLANNED", metrics.plannedEnrollments], ["COMPLETED", metrics.completedEnrollments], ["PROJECTS", metrics.projects]];
  return <div className="v2-program-detail-summary" aria-label="Program relationship summary">{items.map(([label, value]) => <span key={String(label)}><small>{label}</small><strong>{value}</strong></span>)}</div>;
}
