import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Intern, Project, Task, TaskUpdate } from "../../types/domain";

const serviceMocks = vi.hoisted(() => ({ getCurrentIntern: vi.fn(), getMyAssignedTasks: vi.fn(), getProjects: vi.fn(), getMyTaskUpdates: vi.fn() }));
vi.mock("../../services/internService", () => ({ getCurrentIntern: serviceMocks.getCurrentIntern }));
vi.mock("../../services/taskService", () => ({ getMyAssignedTasks: serviceMocks.getMyAssignedTasks }));
vi.mock("../../services/projectService", () => ({ getProjects: serviceMocks.getProjects }));
vi.mock("../../services/taskUpdateService", () => ({ getMyTaskUpdates: serviceMocks.getMyTaskUpdates }));

import InternHomePage from "./InternHomePage";

function dateOffset(days: number) { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + days); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
const intern: Intern = { id: "intern-1", name: "Jisoo", school: "", major: "", cohort: "", startDate: null, endDate: null, status: "ACTIVE", userUid: "user-1" };
const projects: Project[] = [
  { id: "project-a", code: "A", name: "Alpha Project", description: "", status: "ACTIVE", projectType: "BUILD", purpose: "", background: "", expectedOutcome: "", field: "", currentStage: "", teamsFolderUrl: null, keywords: [], operatorId: null, startDate: null, targetEndDate: null, ownerUids: [] },
  { id: "project-b", code: "B", name: "Beta Project", description: "", status: "PLANNING", projectType: "EXPLORE", purpose: "", background: "", expectedOutcome: "", field: "", currentStage: "", teamsFolderUrl: null, keywords: [], operatorId: null, startDate: null, targetEndDate: null, ownerUids: [] },
];
const tasks = (): Task[] => [
  { id: "task-change", projectId: "project-a", title: "Revise service brief", description: "", workstreamId: "w-1", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "IN_PROGRESS", priority: "HIGH", startDate: null, dueDate: dateOffset(4), order: 1 },
  { id: "task-overdue", projectId: "project-a", title: "Overdue research", description: "", workstreamId: "w-1", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "TODO", priority: "HIGH", startDate: null, dueDate: dateOffset(-2), order: 2 },
  { id: "task-soon", projectId: "project-b", title: "Prepare workshop", description: "", workstreamId: "w-2", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "TODO", priority: "MEDIUM", startDate: null, dueDate: dateOffset(2), order: 3 },
  { id: "task-replaced", projectId: "project-b", title: "Resubmitted analysis", description: "", workstreamId: "w-2", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "TODO", priority: "MEDIUM", startDate: null, dueDate: dateOffset(5), order: 4 },
  { id: "task-done", projectId: "project-a", title: "Completed notes", description: "", workstreamId: "w-1", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "DONE", priority: "LOW", startDate: null, dueDate: dateOffset(1), order: 5 },
];
const update = (id: string, taskId: string, occurredOn: string, reviewStatus: TaskUpdate["reviewStatus"], progress: string, managerFeedback = ""): TaskUpdate => ({ id, taskId, occurredOn, progress, learning: "", blockers: "", nextPlan: "", reviewStatus, managerFeedback, authorName: null, createdAt: `${occurredOn}T09:00:00Z`, updatedAt: `${occurredOn}T09:00:00Z`, createdBy: "user-1" });
const updates = (): TaskUpdate[] => [
  update("u-pending", "task-replaced", dateOffset(0), "PENDING", "Resubmitted analysis with sources."),
  update("u-changes", "task-change", dateOffset(-1), "CHANGES_REQUESTED", "Revised the service brief.", "Please make the next action concrete."),
  update("u-feedback", "task-overdue", dateOffset(-2), "APPROVED", "Completed the research draft.", "The summary is clear and useful."),
  update("u-old-changes", "task-replaced", dateOffset(-3), "CHANGES_REQUESTED", "Initial analysis.", "Add the missing sources."),
];

function renderPage() { return render(<MemoryRouter><InternHomePage /></MemoryRouter>); }

describe("InternHomePage", () => {
  beforeEach(() => { vi.clearAllMocks(); serviceMocks.getCurrentIntern.mockResolvedValue(intern); serviceMocks.getMyAssignedTasks.mockResolvedValue(tasks()); serviceMocks.getProjects.mockResolvedValue(projects); serviceMocks.getMyTaskUpdates.mockResolvedValue(updates()); });

  it("renders the workspace welcome, current focus, actual review summary, and task route", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Welcome back, Jisoo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Revise service brief" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open task/ })).toHaveAttribute("href", "/intern/tasks/task-change");
    expect(screen.getByLabelText("Review status")).toHaveTextContent("APPROVED 1");
    expect(screen.getByLabelText("Review status")).toHaveTextContent("PENDING 1");
    expect(screen.getByLabelText("Review status")).toHaveTextContent("CHANGES REQUESTED 1");
    expect(serviceMocks.getProjects).toHaveBeenCalledTimes(1);
  });

  it("prioritizes current changes, then overdue and due-soon work without keeping stale changes requested", async () => {
    renderPage(); await screen.findByText("TODAY'S FOCUS");
    const focus = screen.getByText("TODAY'S FOCUS").closest("section");
    expect(focus).toHaveTextContent("Revise service brief");
    expect(focus).toHaveTextContent("CHANGES REQUESTED");
    expect(screen.getAllByText("Overdue research").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Prepare workshop").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Resubmitted analysis").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Review status")).toHaveTextContent("CHANGES REQUESTED 1");
    expect(screen.getByRole("link", { name: /Open task/ })).toHaveAttribute("href", "/intern/tasks/task-change");
  });

  it("shows actionable feedback, project context, and real completion counts", async () => {
    renderPage(); await screen.findByText("FEEDBACK");
    expect(screen.getByText(/Please make the next action concrete/)).toBeInTheDocument();
    expect(screen.getByText("View feedback →")).toBeInTheDocument();
    expect(screen.getAllByText("Alpha Project").length).toBeGreaterThan(0);
    expect(screen.getByText(/3 ASSIGNED · 1 DONE/)).toBeInTheDocument();
    expect(screen.getAllByText("Beta Project").length).toBeGreaterThan(0);
    expect(screen.getByText(/2 ASSIGNED · 0 DONE/)).toBeInTheDocument();
    expect(screen.getByLabelText("1 of 5 assigned tasks completed")).toBeInTheDocument();
    expect(screen.queryByText(/XP|Level|Achievement/i)).not.toBeInTheDocument();
  });

  it("uses compact empty states for no assignments and no feedback", async () => {
    serviceMocks.getMyAssignedTasks.mockResolvedValue([]); serviceMocks.getMyTaskUpdates.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No tasks assigned")).toBeInTheDocument();
    expect(serviceMocks.getProjects).not.toHaveBeenCalled();
    expect(screen.getByText("TODAY'S FOCUS")).toBeInTheDocument();
    expect(screen.getByText("No feedback yet.")).toBeInTheDocument();
  });

  it("shows only a real internship period and real task/completion counts", async () => {
    serviceMocks.getCurrentIntern.mockResolvedValue({ ...intern, startDate: dateOffset(-14), endDate: dateOffset(13) });
    renderPage();
    expect(await screen.findByLabelText("Internship program progress")).toHaveTextContent("Week 3 of 4");
    expect(screen.getByRole("tab", { name: /Active 4/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Completed 1/ })).toBeInTheDocument();
    expect(screen.getByLabelText("1 of 5 assigned tasks completed")).toBeInTheDocument();
  });

  it("stops before data queries when the account has no linked Intern", async () => {
    serviceMocks.getCurrentIntern.mockResolvedValue(null); renderPage();
    expect(await screen.findByText("Intern profile not linked")).toBeInTheDocument();
    expect(serviceMocks.getMyAssignedTasks).not.toHaveBeenCalled(); expect(serviceMocks.getMyTaskUpdates).not.toHaveBeenCalled(); expect(serviceMocks.getProjects).not.toHaveBeenCalled();
  });

  it("keeps query failures generic and offers retry", async () => {
    serviceMocks.getMyAssignedTasks.mockRejectedValue(new Error("sensitive database detail")); renderPage();
    expect(await screen.findByText("Unable to load your workspace.")).toBeInTheDocument();
    expect(screen.queryByText("sensitive database detail")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
