import { PROGRAM_STATUS_LABELS } from "../../constants/domainLabels";
import type { Program, ProgramStatus } from "../../types/domain";
import { V2Badge } from "../ui/V2Badge";
import { V2EmptyState } from "../ui/V2EmptyState";
import { getProgramRelationMetrics, type ProgramRelations } from "./programRelations";
import type { KeyboardEvent } from "react";

type Props = { programs: Program[]; relationsByProgram: Map<string, ProgramRelations>; onView: (id: string) => void; onEdit: (program: Program) => void };
const statusVariant: Record<ProgramStatus, "neutral" | "success" | "info"> = { PLANNING: "neutral", ACTIVE: "success", COMPLETED: "info", ARCHIVED: "neutral" };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";

export default function ProgramsTable({ programs, relationsByProgram, onView, onEdit }: Props) {
  if (!programs.length) return <V2EmptyState title="No matching programs" description="다른 검색어 또는 상태 필터를 사용해보세요." />;
  const selectFromKey = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onView(id); } };
  return <div className="v2-table-wrap"><table className="v2-table v2-programs-table"><thead><tr><th>PROGRAM</th><th>STATUS</th><th>PERIOD</th><th>INTERNS</th><th>ACTIVE ENROLLMENTS</th><th>PROJECTS</th><th aria-label="Action" /></tr></thead><tbody>{programs.map((program) => { const relations = relationsByProgram.get(program.id); const metrics = getProgramRelationMetrics(relations); const unavailable = Boolean(relations?.error); return <tr key={program.id} tabIndex={0} role="button" aria-label={`${program.name} details`} onClick={() => onView(program.id)} onKeyDown={(event) => selectFromKey(event, program.id)}><td><strong>{program.name}</strong><small>{program.code}</small></td><td><V2Badge variant={statusVariant[program.status]}>{PROGRAM_STATUS_LABELS[program.status]}</V2Badge></td><td>{formatDate(program.startDate)} — {formatDate(program.endDate)}</td><td>{unavailable ? "—" : metrics.enrollments}</td><td>{unavailable ? "—" : metrics.activeEnrollments}</td><td><strong>{unavailable ? "—" : metrics.projects}</strong>{!unavailable && metrics.projects > 0 && <small>{metrics.activeProjects} active</small>}</td><td><details className="v2-program-actions" onClick={(event) => event.stopPropagation()}><summary aria-label={`${program.name} actions`}>•••</summary><button type="button" onClick={() => onView(program.id)}>View details</button><button type="button" onClick={() => onEdit(program)}>Edit program</button></details></td></tr>; })}</tbody></table></div>;
}
