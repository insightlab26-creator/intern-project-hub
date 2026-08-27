import { describe, expect, it, vi } from "vitest";

const from = vi.fn();
vi.mock("../supabase", () => ({ supabase: { from } }));

describe("getPendingTaskUpdates", () => {
  it("queries only PENDING updates once, excluding approved and changes-requested history at the database boundary", async () => {
    const secondOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const firstOrder = vi.fn().mockReturnValue({ order: secondOrder });
    const eq = vi.fn().mockReturnValue({ order: firstOrder });
    const select = vi.fn().mockReturnValue({ eq }); from.mockReturnValue({ select });
    const { getPendingTaskUpdates } = await import("./taskUpdateService");

    await expect(getPendingTaskUpdates()).resolves.toEqual([]);
    expect(from).toHaveBeenCalledWith("task_updates"); expect(eq).toHaveBeenCalledWith("review_status", "PENDING");
    expect(select).toHaveBeenCalledTimes(1); expect(from).toHaveBeenCalledTimes(1);
  });
});
