import { INTERN_STATUS_LABELS } from "../../constants/domainLabels";
import type { Intern, InternStatus } from "../../types/domain";
import { V2Badge } from "../ui/V2Badge";
import { V2Button } from "../ui/V2Button";
import { V2EmptyState } from "../ui/V2EmptyState";
import type { InternTaskMetrics } from "./internMetrics";
import type { KeyboardEvent } from "react";

export type InternTableItem = { intern: Intern; metrics: InternTaskMetrics };
type Props = { items: InternTableItem[]; selectedInternId: string | null; onSelect: (internId: string) => void };
const statusVariant: Record<InternStatus, "neutral" | "success" | "info"> = { PLANNED: "neutral", ACTIVE: "success", COMPLETED: "info" };

export default function InternsTable({ items, selectedInternId, onSelect }: Props) {
  if (!items.length) return <V2EmptyState title="No interns yet" description="등록된 인턴이 없습니다." />;
  const selectFromKey = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(id); } };
  return <div className="v2-table-wrap"><table className="v2-table v2-interns-table"><thead><tr><th>INTERN</th><th>STATUS</th><th>ASSIGNED TASKS</th><th>PROGRESS</th><th>IN REVIEW</th><th>OVERDUE</th><th aria-label="Action" /></tr></thead><tbody>{items.map(({ intern, metrics }) => {
    const secondary = [intern.school, intern.major].filter(Boolean).join(" · ");
    return <tr key={intern.id} className={selectedInternId === intern.id ? "v2-interns-table__selected" : undefined} tabIndex={0} role="button" aria-label={`${intern.name} details`} onClick={() => onSelect(intern.id)} onKeyDown={(event) => selectFromKey(event, intern.id)}><td><strong>{intern.name}</strong>{secondary && <small>{secondary}</small>}</td><td><V2Badge variant={statusVariant[intern.status]}>{INTERN_STATUS_LABELS[intern.status]}</V2Badge></td><td><strong>{metrics.assigned} assigned</strong><small>{metrics.done} done</small></td><td>{metrics.progress === null ? <span className="v2-muted">No tasks</span> : <div className="v2-intern-progress"><span><i style={{ width: `${metrics.progress}%` }} /></span><strong>{metrics.progress}%</strong></div>}</td><td>{metrics.inReview ? <V2Badge variant="warning">{metrics.inReview}</V2Badge> : <span className="v2-muted">—</span>}</td><td>{metrics.overdue ? <V2Badge variant="danger">{metrics.overdue}</V2Badge> : <span className="v2-muted">—</span>}</td><td><V2Button type="button" variant="ghost" onClick={(event) => { event.stopPropagation(); onSelect(intern.id); }}>Open</V2Button></td></tr>;
  })}</tbody></table></div>;
}
