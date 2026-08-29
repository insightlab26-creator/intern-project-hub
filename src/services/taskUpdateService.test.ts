import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.fn();
const rpc = vi.fn();
const getUser = vi.fn();
vi.mock("../supabase", () => ({ supabase: { from, rpc, auth: { getUser } } }));

const update = {
  id: "update-1", task_id: "task-1", occurred_on: "2026-08-29", progress: "Progress", learning: "", blockers: "", next_plan: "", review_status: "PENDING", manager_feedback: "", created_at: "2026-08-29T09:00:00Z", updated_at: "2026-08-29T09:00:00Z", created_by: "author-1",
} as const;

function mockUpdateQuery(rows: unknown[]) {
  const secondOrder = vi.fn().mockResolvedValue({ data: rows, error: null });
  const firstOrder = vi.fn().mockReturnValue({ order: secondOrder });
  const eq = vi.fn().mockReturnValue({ order: firstOrder });
  const select = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ select });
  return { eq, select };
}

describe("Task Update author labels", () => {
  beforeEach(() => { from.mockReset(); rpc.mockReset(); getUser.mockReset(); });

  it("creates an INTERN-safe PENDING payload with the authenticated author only", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    from.mockReturnValue({ insert });
    getUser.mockResolvedValue({ data: { user: { id: "intern-profile-id" } }, error: null });
    const { createTaskUpdate } = await import("./taskUpdateService");

    await createTaskUpdate({ taskId: "task-1", occurredOn: "2026-08-29", progress: "  Progress  ", learning: "", blockers: "", nextPlan: "" });

    expect(insert).toHaveBeenCalledWith({ task_id: "task-1", occurred_on: "2026-08-29", progress: "Progress", learning: "", blockers: "", next_plan: "", review_status: "PENDING", manager_feedback: "", created_by: "intern-profile-id", updated_by: "intern-profile-id" });
  });

  it("uses one authorized batch RPC for task updates instead of querying profiles", async () => {
    mockUpdateQuery([update]);
    rpc.mockResolvedValue({ data: [{ update_id: update.id, author_id: update.created_by, display_name: "Intern Author" }], error: null });
    const { getTaskUpdates } = await import("./taskUpdateService");

    await expect(getTaskUpdates("task-1")).resolves.toMatchObject([{ authorName: "Intern Author" }]);
    expect(rpc).toHaveBeenCalledWith("get_task_update_author_labels", { p_update_ids: [update.id] });
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalledWith("profiles");
  });

  it("keeps authorized updates visible with the neutral missing-author fallback when label resolution fails", async () => {
    mockUpdateQuery([update]);
    rpc.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { getTaskUpdates } = await import("./taskUpdateService");

    await expect(getTaskUpdates("task-1")).resolves.toMatchObject([{ id: update.id, authorName: null }]);
    expect(consoleError).toHaveBeenCalledWith("진행 기록 작성자 표시 이름 조회 실패:", "permission denied");
    consoleError.mockRestore();
  });

  it("queries only PENDING updates once and resolves their authors in one batch", async () => {
    const { eq, select } = mockUpdateQuery([update]);
    rpc.mockResolvedValue({ data: [], error: null });
    const { getPendingTaskUpdates } = await import("./taskUpdateService");

    await expect(getPendingTaskUpdates()).resolves.toHaveLength(1);
    expect(eq).toHaveBeenCalledWith("review_status", "PENDING");
    expect(select).toHaveBeenCalledTimes(1); expect(from).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_task_update_author_labels", { p_update_ids: [update.id] });
  });
});
