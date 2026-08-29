import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { intern, project, task } from "../../test/fixtures";
import type { TaskUpdate } from "../../types/domain";
import ReviewTaskDetailPanel from "./ReviewTaskDetailPanel";

const update: TaskUpdate = { id: "update-1", taskId: task.id, occurredOn: "2026-08-04", progress: "Progress", learning: "", blockers: "", nextPlan: "", reviewStatus: "PENDING", managerFeedback: "", authorName: "김도윤", createdAt: "2026-08-04T09:00:00Z", updatedAt: "2026-08-04T09:00:00Z", createdBy: "profile-1" };

describe("ReviewTaskDetailPanel", () => {
  it("keeps quick review and delegates Task navigation", async () => {
    const user = userEvent.setup(); const onOpenTask = vi.fn();
    render(<MemoryRouter><ReviewTaskDetailPanel task={{ ...task, status: "REVIEW" }} project={project} interns={new Map([[intern.id, intern]])} updates={[update]} loading={false} error="" savingUpdate={false} editLoading={false} editError="" onClose={vi.fn()} onEditTask={vi.fn()} onReviewUpdate={vi.fn()} onOpenTask={onOpenTask} /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Open Task →" }));
    expect(onOpenTask).toHaveBeenCalledWith(task.id);
    expect(screen.getByRole("button", { name: "Approve update" })).toBeInTheDocument();
  });
});
