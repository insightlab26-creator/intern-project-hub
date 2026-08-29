import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { intern, task } from "../../../test/fixtures";
import type { Workstream } from "../../../types/domain";
import ProjectWorkTab from "./ProjectWorkTab";

const workstream: Workstream = { id: task.workstreamId, projectId: task.projectId, name: "Research", description: "", status: "ACTIVE", order: 1 };

describe("ProjectWorkTab", () => {
  it("keeps Edit Task available and delegates Task navigation", async () => {
    const user = userEvent.setup(); const onOpenTask = vi.fn();
    render(<MemoryRouter><ProjectWorkTab projectId={task.projectId} workstreams={[workstream]} tasks={[task]} interns={[intern]} loading={false} error="" workstreamSaving={false} taskSaving={false} onRetry={vi.fn()} onSaveWorkstream={vi.fn()} onSaveTask={vi.fn()} onOpenTask={onOpenTask} /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: task.title }));
    expect(onOpenTask).toHaveBeenCalledWith(task.id);
    expect(screen.getByText("Edit task")).toBeInTheDocument();
  });
});
