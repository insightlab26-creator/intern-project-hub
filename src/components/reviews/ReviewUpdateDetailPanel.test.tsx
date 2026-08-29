import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { project, task } from "../../test/fixtures";
import type { TaskUpdate } from "../../types/domain";
import ReviewUpdateDetailPanel from "./ReviewUpdateDetailPanel";

const update: TaskUpdate = { id: "update-1", taskId: task.id, occurredOn: "2026-08-04", progress: "Progress", learning: "", blockers: "", nextPlan: "", reviewStatus: "PENDING", managerFeedback: "", authorName: "김도윤", createdAt: "2026-08-04T09:00:00Z", updatedAt: "2026-08-04T09:00:00Z", createdBy: "profile-1" };

it("delegates task and project navigation to callbacks", async () => {
  const user = userEvent.setup(); const onOpenTask = vi.fn(); const onOpenProject = vi.fn();
  render(<ReviewUpdateDetailPanel task={task} project={project} update={update} saving={false} onClose={vi.fn()} onReview={vi.fn()} onOpenTask={onOpenTask} onOpenProject={onOpenProject} />);
  await user.click(screen.getByRole("button", { name: project.name })); await user.click(screen.getByRole("button", { name: "Open Task →" }));
  expect(onOpenProject).toHaveBeenCalledWith(project.id); expect(onOpenTask).toHaveBeenCalledWith(task.id);
});
