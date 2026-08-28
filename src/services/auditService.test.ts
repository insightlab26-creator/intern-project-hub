import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const builder: Record<string, ReturnType<typeof vi.fn> | ((resolve: (value: unknown) => unknown) => Promise<unknown>)> = {};
  const profileIn = vi.fn().mockResolvedValue({ data: [{ id: "actor-1", display_name: "Jordan" }, { id: "actor-2", display_name: "Kai" }], error: null });
  const rows = [{ id: 4, entity_type: "projects", entity_id: "project-4", action: "UPDATE", changed_fields: ["status"], actor_id: "actor-1", occurred_at: "2026-08-29T09:00:00Z" }, { id: 3, entity_type: "tasks", entity_id: "task-3", action: "DELETE", changed_fields: [], actor_id: "actor-2", occurred_at: "2026-08-28T09:00:00Z" }, { id: 2, entity_type: "programs", entity_id: "program-2", action: "INSERT", changed_fields: ["name"], actor_id: "actor-1", occurred_at: "2026-08-27T09:00:00Z" }];
  Object.assign(builder, { select: vi.fn(() => builder), order: vi.fn(() => builder), limit: vi.fn(() => builder), eq: vi.fn(() => builder), gte: vi.fn(() => builder), or: vi.fn(() => builder), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve) });
  return { builder, profileIn, from: vi.fn((table: string) => table === "audit_logs" ? builder : { select: vi.fn(() => ({ in: profileIn })) }) };
});
vi.mock("../supabase", () => ({ supabase: { from: mocks.from } }));

import { getAuditLogPage } from "./auditService";

describe("getAuditLogPage", () => {
  it("uses ordered keyset filtering and resolves all actor names in one batch", async () => {
    const page = await getAuditLogPage({ pageSize: 2, cursor: { occurredAt: "2026-08-30T00:00:00Z", id: 9 }, filters: { entityType: "projects", action: "UPDATE", actorId: "actor-1", occurredAfter: "2026-08-01T00:00:00Z" } });
    expect(mocks.builder.order).toHaveBeenNthCalledWith(1, "occurred_at", { ascending: false }); expect(mocks.builder.order).toHaveBeenNthCalledWith(2, "id", { ascending: false }); expect(mocks.builder.limit).toHaveBeenCalledWith(3); expect(mocks.builder.eq).toHaveBeenCalledWith("entity_type", "projects"); expect(mocks.builder.eq).toHaveBeenCalledWith("action", "UPDATE"); expect(mocks.builder.eq).toHaveBeenCalledWith("actor_id", "actor-1"); expect(mocks.builder.gte).toHaveBeenCalledWith("occurred_at", "2026-08-01T00:00:00Z"); expect(mocks.builder.or).toHaveBeenCalledTimes(1); expect(mocks.profileIn).toHaveBeenCalledTimes(1); expect(mocks.profileIn).toHaveBeenCalledWith("id", ["actor-1", "actor-2"]); expect(page.items).toHaveLength(2); expect(page.items[0].actorName).toBe("Jordan"); expect(page.nextCursor).toEqual({ occurredAt: "2026-08-28T09:00:00Z", id: 3 });
  });
});
