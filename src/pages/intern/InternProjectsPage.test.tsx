import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Intern, Project, Task } from "../../types/domain";

const serviceMocks = vi.hoisted(() => ({
  getCurrentIntern: vi.fn(),
  getMyAssignedTasks: vi.fn(),
  getProjects: vi.fn(),
}));

vi.mock("../../services/internService", () => ({ getCurrentIntern: serviceMocks.getCurrentIntern }));
vi.mock("../../services/taskService", () => ({ getMyAssignedTasks: serviceMocks.getMyAssignedTasks }));
vi.mock("../../services/projectService", () => ({ getProjects: serviceMocks.getProjects }));

import InternProjectsPage from "./InternProjectsPage";

const intern: Intern = { id: "intern-1", name: "Kim Intern", school: "", major: "", cohort: "", startDate: null, endDate: null, status: "ACTIVE", userUid: "user-1" };
const projectA: Project = { id: "project-a", code: "A", name: "Alpha Project", description: "A carbon-neutral data analysis service.", status: "ACTIVE", projectType: "BUILD", purpose: "", background: "", expectedOutcome: "", field: "", currentStage: "", teamsFolderUrl: null, keywords: [], operatorId: null, startDate: null, targetEndDate: null, ownerUids: [] };
const projectB: Project = { ...projectA, id: "project-b", name: "Beta Project", description: "Finished research work.", status: "COMPLETED" };
const task = (id: string, projectId: string, status: Task["status"], dueDate: string | null): Task => ({ id, projectId, title: id, description: "", workstreamId: "workstream-1", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status, priority: "MEDIUM", startDate: null, dueDate, order: 1 });

describe("InternProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.getCurrentIntern.mockResolvedValue(intern);
    serviceMocks.getMyAssignedTasks.mockResolvedValue([
      task("overdue-task", "project-a", "TODO", "2000-01-01"),
      task("progress-task", "project-a", "IN_PROGRESS", "2099-01-02"),
      task("done-task", "project-a", "DONE", "2099-01-01"),
      task("completed-task", "project-b", "DONE", null),
    ]);
    serviceMocks.getProjects.mockResolvedValue([projectA, projectB, { ...projectA, id: "project-empty", name: "Empty Project" }]);
  });

  it("renders only assigned projects with assigned-task metrics and no project actions", async () => {
    render(<MemoryRouter><InternProjectsPage /></MemoryRouter>);

    const alpha = await screen.findByRole("heading", { name: "Alpha Project" });
    expect(screen.getByText(/Kim Intern/)).toBeInTheDocument();
    expect(screen.getByText("A carbon-neutral data analysis service.")).toBeInTheDocument();
    expect(screen.getByLabelText("My project summary")).toHaveTextContent("PROJECTS2");
    const alphaCard = alpha.closest("section")!;
    expect(within(alphaCard).getByText("3")).toBeInTheDocument();
    expect(within(alphaCard).getByText("1 Overdue")).toBeInTheDocument();
    expect(within(alphaCard).getByText(/Next due Jan/)).toBeInTheDocument();
    expect(screen.getByText("Beta Project")).toBeInTheDocument();
    expect(screen.queryByText("Empty Project")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alpha Project" })).toHaveAttribute("href", "/intern/projects/project-a");
    expect(serviceMocks.getProjects).toHaveBeenCalledTimes(1);
    expect(serviceMocks.getMyAssignedTasks).toHaveBeenCalledTimes(1);
  });

  it("sorts projects with overdue work first and supports search and status filters", async () => {
    render(<MemoryRouter><InternProjectsPage /></MemoryRouter>);
    await screen.findByText("Alpha Project");

    const cards = document.querySelectorAll<HTMLElement>(".v2-intern-projects-page__card");
    expect(within(cards[0]).getByText("Alpha Project")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search projects"), { target: { value: "finished" } });
    expect(screen.getByText("Beta Project")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Project")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search projects"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Filter by project status"), { target: { value: "ACTIVE" } });
    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.queryByText("Beta Project")).not.toBeInTheDocument();
  });

  it("shows an empty state when the current intern has no assigned projects", async () => {
    serviceMocks.getMyAssignedTasks.mockResolvedValue([]);
    render(<MemoryRouter><InternProjectsPage /></MemoryRouter>);
    expect(await screen.findByText("No projects yet.")).toBeInTheDocument();
    expect(serviceMocks.getProjects).not.toHaveBeenCalled();
  });

  it("distinguishes an unlinked intern profile and query errors", async () => {
    serviceMocks.getCurrentIntern.mockResolvedValueOnce(null);
    render(<MemoryRouter><InternProjectsPage /></MemoryRouter>);
    expect(await screen.findByText("Intern profile not linked")).toBeInTheDocument();

    serviceMocks.getCurrentIntern.mockRejectedValueOnce(new Error("network"));
    render(<MemoryRouter><InternProjectsPage /></MemoryRouter>);
    expect(await screen.findByText("Unable to load your projects.")).toBeInTheDocument();
  });

  it("uses no project query when an intern mapping is missing", async () => {
    serviceMocks.getCurrentIntern.mockResolvedValue(null);
    render(<InternProjectsPage />);
    await screen.findByText("Intern profile not linked");
    expect(serviceMocks.getProjects).not.toHaveBeenCalled();
  });
});
