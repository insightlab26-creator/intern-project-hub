import { useCallback, useEffect, useMemo, useState } from "react";
import AuditDetailPanel from "../../components/activity/AuditDetailPanel";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2Input } from "../../components/ui/V2Input";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { V2Select } from "../../components/ui/V2Select";
import { getAuditLogPage, type AuditLogCursor, type AuditLogFilters } from "../../services/auditService";
import type { AuditAction, AuditLog } from "../../types/domain";
import { auditActionLabels, auditActions, auditChangedFieldLabel, auditEntityLabels } from "../../utils/auditLabels";
import { useLocale } from "../../i18n/internLocale";

type DateFilter = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";
const dateAfter = (filter: DateFilter | "") => { if (filter === "ALL" || !filter) return undefined; const date = new Date(); date.setHours(0, 0, 0, 0); if (filter === "LAST_7_DAYS") date.setDate(date.getDate() - 6); if (filter === "LAST_30_DAYS") date.setDate(date.getDate() - 29); return date.toISOString(); };
const errorMessage = (caught: unknown) => caught instanceof Error ? caught.message : "Audit records could not be loaded.";

export default function AdminActivityPage() {
  const { locale } = useLocale();
  const formatDateTime = (value: string) => new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const [items, setItems] = useState<AuditLog[]>([]); const [nextCursor, setNextCursor] = useState<AuditLogCursor | null>(null); const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState(""); const [query, setQuery] = useState(""); const [entityType, setEntityType] = useState(""); const [action, setAction] = useState<"" | AuditAction>(""); const [actorId, setActorId] = useState(""); const [dateFilter, setDateFilter] = useState<DateFilter>("ALL"); const [selected, setSelected] = useState<AuditLog | null>(null); const [page, setPage] = useState(1);
  const filters = useMemo<AuditLogFilters>(() => ({ entityType: entityType || undefined, action: action || undefined, actorId: actorId || undefined, occurredAfter: dateAfter(dateFilter) }), [action, actorId, dateFilter, entityType]);
  const load = useCallback(async () => { try { setLoading(true); setError(""); setSelected(null); const page = await getAuditLogPage({ filters }); setItems(page.items); setNextCursor(page.nextCursor); } catch (caught) { setError(errorMessage(caught)); } finally { setLoading(false); } }, [filters]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const loadMore = async () => { if (!nextCursor) return; try { setLoadingMore(true); const page = await getAuditLogPage({ filters, cursor: nextCursor }); setItems((current) => [...current, ...page.items]); setNextCursor(page.nextCursor); } catch (caught) { setError(errorMessage(caught)); } finally { setLoadingMore(false); } };
  const entities = useMemo(() => Object.keys(auditEntityLabels).sort(), []);
  const actors = useMemo(() => [...new Map(items.filter((item) => item.actorId).map((item) => [item.actorId as string, item.actorName ?? "Unknown / System"])).entries()].sort((left, right) => left[1].localeCompare(right[1])), [items]);
  const visible = useMemo(() => { const needle = query.trim().toLocaleLowerCase("en-US"); if (!needle) return items; return items.filter((item) => `${item.actorName ?? ""} ${item.entityType} ${item.entityId} ${item.changedFields.join(" ")}`.toLocaleLowerCase("en-US").includes(needle)); }, [items, query]);
  const pageSize = 10; const pageCount = Math.max(1, Math.ceil(visible.length / pageSize)); const pagedItems = visible.slice((page - 1) * pageSize, page * pageSize);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [query, entityType, action, actorId, dateFilter]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const empty = !items.length ? { title: "No audit records yet", description: "No audit records are available for this filter." } : { title: "No matching audit records", description: "Try a different search term or filter." };
  if (loading) return <V2Card><V2EmptyState title="Loading Activity" description="관리자 감사 기록을 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load Activity" description={error} action={<V2Button type="button" onClick={() => void load()}>Try again</V2Button>} /></V2Card>;
  return <section className="v2-activity">
    <V2PageHeader title="Activity" description="관리자 감사 기록 — 데이터 변경 사실과 변경 필드를 확인합니다." />
    <div className="v2-activity__filters"><V2Input aria-label="Search audit records" placeholder="Search actor, entity, ID, or changed field…" value={query} onChange={(event) => setQuery(event.target.value)} /><V2Select aria-label="Filter audit records by entity type" value={entityType} onChange={(event) => setEntityType(event.target.value)}><option value="">All entity types</option>{entities.map((type) => <option key={type} value={type}>{auditEntityLabels[type] ?? type}</option>)}</V2Select><V2Select aria-label="Filter audit records by action" value={action} onChange={(event) => setAction(event.target.value as "" | AuditAction)}><option value="">All actions</option>{auditActions.map((value) => <option key={value} value={value}>{auditActionLabels[value]}</option>)}</V2Select><V2Select aria-label="Filter audit records by actor" value={actorId} onChange={(event) => setActorId(event.target.value)}><option value="">All actors</option>{actors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</V2Select><V2Select aria-label="Filter audit records by date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}><option value="ALL">All time</option><option value="TODAY">Today</option><option value="LAST_7_DAYS">Last 7 days</option><option value="LAST_30_DAYS">Last 30 days</option></V2Select></div>
    <div className={selected ? "v2-activity__body v2-activity__body--selected" : "v2-activity__body"}>{visible.length === 0 ? <V2Card><V2EmptyState title={empty.title} description={empty.description} /></V2Card> : <div className="v2-table-wrap"><table className="v2-table v2-activity__table"><thead><tr><th>WHEN</th><th>ACTOR</th><th>ACTION</th><th>ENTITY</th><th>CHANGED FIELDS</th></tr></thead><tbody>{pagedItems.map((item) => <tr key={item.id} className={selected?.id === item.id ? "v2-activity__selected" : undefined} onClick={() => setSelected(item)} tabIndex={0} role="button" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(item); }}><td>{formatDateTime(item.occurredAt)}</td><td>{item.actorName ?? "Unknown / System"}</td><td><V2Badge variant={item.action === "DELETE" || item.action === "DEACTIVATE" ? "danger" : item.action === "UPDATE" ? "warning" : "info"}>{auditActionLabels[item.action]}</V2Badge></td><td><strong>{auditEntityLabels[item.entityType] ?? item.entityType}</strong></td><td>{item.changedFields.length ? <span className="v2-activity__fields">{item.changedFields.slice(0, 3).map((field) => <span key={field}>{auditChangedFieldLabel(field)}</span>)}{item.changedFields.length > 3 && <span>+{item.changedFields.length - 3} more</span>}</span> : "—"}</td></tr>)}</tbody></table></div>}{selected && <AuditDetailPanel item={selected} actionLabel={auditActionLabels[selected.action]} entityLabel={auditEntityLabels[selected.entityType] ?? selected.entityType} changedFieldLabel={auditChangedFieldLabel} onClose={() => setSelected(null)} />}</div>
    {visible.length > pageSize && <nav className="v2-activity__pagination" aria-label={locale === "ko" ? "활동 기록 페이지" : "Activity pages"}><V2Button type="button" variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>{locale === "ko" ? "이전" : "Previous"}</V2Button><div>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button key={number} type="button" className={number === page ? "active" : undefined} aria-current={number === page ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}</div><V2Button type="button" variant="secondary" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>{locale === "ko" ? "다음" : "Next"}</V2Button></nav>}
    {nextCursor && <div className="v2-activity__more"><V2Button type="button" variant="secondary" isLoading={loadingMore} onClick={() => void loadMore()}>Load more</V2Button></div>}
  </section>;
}
