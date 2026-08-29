import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { project, task } from "../../test/fixtures";
import type { DocumentLink } from "../../types/domain";
import DocumentDetailPanel from "./DocumentDetailPanel";

const document: DocumentLink = { id: "document-1", projectId: project.id, taskId: task.id, title: "Output", description: "", url: "https://example.com", archived: false, source: "DOCUMENT", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" };

describe("DocumentDetailPanel", () => {
  it("delegates project and task navigation when callbacks are supplied", async () => {
    const user = userEvent.setup(); const onOpenProject = vi.fn(); const onOpenTask = vi.fn();
    render(<DocumentDetailPanel document={document} project={project} task={task} onClose={vi.fn()} onEdit={vi.fn()} onArchiveToggle={vi.fn()} onOpenProject={onOpenProject} onOpenTask={onOpenTask} />);
    await user.click(screen.getByRole("button", { name: project.name })); await user.click(screen.getByRole("button", { name: task.title }));
    expect(onOpenProject).toHaveBeenCalledWith(project.id); expect(onOpenTask).toHaveBeenCalledWith(task.id);
  });

  it("renders connections as non-clickable text without navigation callbacks", () => {
    render(<DocumentDetailPanel document={document} project={project} task={task} onClose={vi.fn()} onEdit={vi.fn()} onArchiveToggle={vi.fn()} />);
    expect(screen.queryByRole("button", { name: project.name })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: task.title })).not.toBeInTheDocument();
  });
});
