import { Link } from "react-router-dom";
import { V2Badge } from "../ui/V2Badge";
import { V2Button } from "../ui/V2Button";
import type { AuditLog } from "../../types/domain";

type Props = { item: AuditLog; actionLabel: string; entityLabel: string; changedFieldLabel: (field: string) => string; onClose: () => void };

const destinations: Partial<Record<string, (id: string) => string>> = {
  projects: (id) => `/admin/projects/${id}`,
  tasks: (id) => `/admin/tasks/${id}`,
  programs: (id) => `/admin/programs/${id}`,
  interns: (id) => `/admin/interns?internId=${id}`,
};

const formatDateTime = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AuditDetailPanel({ item, actionLabel, entityLabel, changedFieldLabel, onClose }: Props) {
  const canNavigate = Boolean(destinations[item.entityType]);
  const destination = item.action === "DELETE" ? undefined : destinations[item.entityType]?.(item.entityId);
  return <aside className="v2-audit-detail-panel" aria-label="Audit details"><header><div><span>AUDIT DETAIL</span><h2>{actionLabel}</h2><p>{entityLabel}</p></div><V2Button type="button" variant="ghost" aria-label="Close audit details" onClick={onClose}>×</V2Button></header><div className="v2-audit-detail-panel__body"><dl className="v2-audit-detail-facts"><div><dt>WHEN</dt><dd>{formatDateTime(item.occurredAt)}</dd></div><div><dt>ACTOR</dt><dd>{item.actorName ?? "Unknown / System"}</dd></div><div><dt>ACTION</dt><dd><V2Badge variant={item.action === "DELETE" || item.action === "DEACTIVATE" ? "danger" : item.action === "UPDATE" ? "warning" : "info"}>{actionLabel}</V2Badge></dd></div><div><dt>ENTITY TYPE</dt><dd>{entityLabel}</dd></div><div className="v2-audit-detail-facts__id"><dt>ENTITY ID</dt><dd>{item.entityId}</dd></div></dl><section className="v2-audit-detail-section"><h3>Changed fields</h3>{item.changedFields.length ? <ul>{item.changedFields.map((field) => <li key={field}>{changedFieldLabel(field)}</li>)}</ul> : <p>None recorded</p>}</section></div><footer>{destination ? <Link to={destination}>Open related item →</Link> : <span>{canNavigate ? "Related item unavailable" : "No direct link available"}</span>}</footer></aside>;
}
