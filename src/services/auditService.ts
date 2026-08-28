import { supabase } from "../supabase";
import type { AuditAction, AuditLog } from "../types/domain";

type AuditLogRow = { id: number; entity_type: string; entity_id: string; action: AuditAction; changed_fields: string[]; actor_id: string | null; occurred_at: string };
type ProfileRow = { id: string; display_name: string };

export type AuditLogCursor = { occurredAt: string; id: number };
export type AuditLogFilters = { entityType?: string; action?: AuditAction; actorId?: string; occurredAfter?: string };
export type AuditLogPage = { items: AuditLog[]; nextCursor: AuditLogCursor | null };

const columns = "id,entity_type,entity_id,action,changed_fields,actor_id,occurred_at";

function mapRows(rows: AuditLogRow[], profiles: ProfileRow[]): AuditLog[] {
  const names = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  return rows.map((row) => ({ id: row.id, entityType: row.entity_type, entityId: row.entity_id, action: row.action, changedFields: row.changed_fields, actorId: row.actor_id, actorName: row.actor_id ? names.get(row.actor_id) ?? null : null, occurredAt: row.occurred_at }));
}

/** Reads one bounded audit-log page; actor names resolve in one batch query. */
export async function getAuditLogPage({ pageSize = 50, cursor, filters = {} }: { pageSize?: number; cursor?: AuditLogCursor | null; filters?: AuditLogFilters } = {}): Promise<AuditLogPage> {
  let query = supabase.from("audit_logs").select(columns).order("occurred_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize + 1);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.occurredAfter) query = query.gte("occurred_at", filters.occurredAfter);
  if (cursor) query = query.or(`occurred_at.lt.${cursor.occurredAt},and(occurred_at.eq.${cursor.occurredAt},id.lt.${cursor.id})`);
  const { data, error } = await query;
  if (error) throw new Error(`감사 로그 조회 실패: ${error.message}`);

  const fetched = (data ?? []) as AuditLogRow[];
  const hasMore = fetched.length > pageSize;
  const rows = hasMore ? fetched.slice(0, pageSize) : fetched;
  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
  let profiles: ProfileRow[] = [];
  if (actorIds.length) {
    const { data: profileData } = await supabase.from("profiles").select("id,display_name").in("id", actorIds);
    // Missing actor profiles must not hide the audit evidence.
    profiles = (profileData ?? []) as ProfileRow[];
  }
  const last = rows.at(-1);
  return { items: mapRows(rows, profiles), nextCursor: hasMore && last ? { occurredAt: last.occurred_at, id: last.id } : null };
}

/** @deprecated V1 compatibility only. V2 must use getAuditLogPage. */
export async function getAuditLogs(): Promise<AuditLog[]> { return (await getAuditLogPage({ pageSize: 500 })).items; }
