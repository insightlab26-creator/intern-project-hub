import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Intern, Project, Task, Workstream } from "../../types/domain";

const serviceMocks = vi.hoisted(() => ({
  getCurrentIntern: vi.fn(),
  getMyAssignedTasks: vi.fn(),
  getProjects: vi.fn(),
  getWorkstreamsForProjects: vi.fn(),
}));

vi.mock("../../services/internService", () => ({ getCurrentIntern: serviceMocks.getCurrentIntern }));
vi.mock("../../services/taskService", () => ({ getMyAssignedTasks: serviceMocks.getMyAssignedTasks }));
vi.mock("../../services/projectService", () => ({ getProjects: serviceMocks.getProjects }));
vi.mock("../../services/workstreamService", () => ({ getWorkstreamsForProjects: serviceMocks.getWorkstreamsForProjects }));

import InternMyTasksPage from "./InternMyTasksPage";

const intern: Intern = { id: "intern-1", name: "Intern", school: "", major: "", cohort: "", startDate: null, endDate: null, status: "ACTIVE", userUid: "user-1" };
const projectA: Project = { id: "project-a", code: "A", name: "Project Alpha", description: "", status: "ACTIVE", projectType: "BUILD", purpose: "", background: "", expectedOutcome: "", field: "", currentStage: "", teamsFolderUrl: null, keywords: [], operatorId: null, startDate: null, targetEndDate: null, ownerUids: [] };
const projectB: Project = { ...projectA, id: "project-b", name: "Project Beta" };
const workstream: Workstream = { id: "workstream-a", projectId: "project-a", name: "Research", description: "", status: "ACTIVE", order: 1 };
const tasks: Task[] = [
  { id: "task-overdue", projectId: "project-a", title: "Overdue research", description: "Customer interviews", workstreamId: "workstream-a", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "TODO", priority: "HIGH", startDate: null, dueDate: "2000-01-01", order: 1 },
  { id: "task-progress", projectId: "project-b", title: "Build prototype", description: "", workstreamId: "", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "IN_PROGRESS", priority: "MEDIUM", startDate: null, dueDate: "2099-10-31", order: 2 },
  { id: "task-done", projectId: "project-a", title: "Done task", description: "", workstreamId: "workstream-a", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "DONE", priority: "LOW", startDate: null, dueDate: null, order: 3 },
];

describe("InternMyTasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.getCurrentIntern.mockResolvedValue(intern);
    serviceMocks.getMyAssignedTasks.mockResolvedValue(tasks);
    serviceMocks.getProjects.mockResolvedValue([projectA, projectB]);
    serviceMocks.getWorkstreamsForProjects.mockResolvedValue([workstream]);
  });

  it("renders assigned task context, status metrics, and overdue state", async () => {
    render(<MemoryRouter><InternMyTasksPage /></MemoryRouter>);

    expect(await screen.findByText("Overdue research")).toBeInTheDocument();
    expect(screen.getAllByText("Project Alpha").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Research").length).toBe(2);
    expect(screen.getByText(/d overdue/)).toBeInTheDocument();
    expect(screen.getByLabelText("My task summary")).toHaveTextContent("MY TASKS3");
    expect(screen.getByLabelText("My task summary")).toHaveTextContent("TO DO1");
    expect(screen.getByLabelText("My task summary")).toHaveTextContent("IN PROGRESS1");
    expect(serviceMocks.getWorkstreamsForProjects).toHaveBeenCalledWith(["project-a", "project-b"]);
    expect(screen.getByRole("link", { name: "Overdue research" })).toHaveAttribute("href", "/intern/tasks/task-overdue");
  });

  it("filters loaded tasks by search, status, project, and overdue", async () => {
    render(<MemoryRouter><InternMyTasksPage /></MemoryRouter>);
    await screen.findByText("Overdue research");

    fireEvent.change(screen.getByLabelText("Search tasks"), { target: { value: "prototype" } });
    expect(screen.getByText("Build prototype")).toBeInTheDocument();
    expect(screen.queryByText("Overdue research")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search tasks"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "DONE" } });
    expect(screen.getByText("Done task")).toBeInTheDocument();
    expect(screen.queryByText("Build prototype")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "ALL" } });
    fireEvent.change(screen.getByLabelText("Filter by project"), { target: { value: "project-b" } });
    expect(screen.getByText("Build prototype")).toBeInTheDocument();
    expect(screen.queryByText("Overdue research")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by project"), { target: { value: "ALL" } });
    fireEvent.change(screen.getByLabelText("Filter overdue tasks"), { target: { value: "OVERDUE" } });
    expect(screen.getByText("Overdue research")).toBeInTheDocument();
    expect(screen.queryByText("Build prototype")).not.toBeInTheDocument();
  });

  it("shows an explicit unlinked intern state without loading context", async () => {
    serviceMocks.getCurrentIntern.mockResolvedValue(null);
    render(<MemoryRouter><InternMyTasksPage /></MemoryRouter>);

    expect(await screen.findByText("Intern profile not linked")).toBeInTheDocument();
    expect(screen.getByText(/ADMIN에게 연결을 요청/)).toBeInTheDocument();
    expect(serviceMocks.getProjects).not.toHaveBeenCalled();
  });

  it("shows the no-assignment state and exposes no task mutation actions", async () => {
    serviceMocks.getMyAssignedTasks.mockResolvedValue([]);
    render(<MemoryRouter><InternMyTasksPage /></MemoryRouter>);

    expect(await screen.findByText("No tasks assigned")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add|edit|delete/i })).not.toBeInTheDocument();
  });
});
