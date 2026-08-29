import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { project } from "../../test/fixtures";
import ProjectTable from "./ProjectTable";

describe("ProjectTable", () => {
  it("delegates project navigation to its caller", async () => {
    const onOpenProject = vi.fn();
    render(<ProjectTable projects={[project]} profilesById={new Map()} metricsByProject={new Map()} onEdit={vi.fn()} onOpenProject={onOpenProject} />);
    await userEvent.setup().click(screen.getByRole("button", { name: project.name }));
    expect(onOpenProject).toHaveBeenCalledWith(project.id);
  });
});
