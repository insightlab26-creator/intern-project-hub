import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Intern, Project, Task, TaskUpdate, Workstream } from "../../types/domain";

const serviceMocks = vi.hoisted(() => ({ getCurrentIntern: vi.fn(), getMyAssignedTasks: vi.fn(), getMyTaskUpdates: vi.fn(), getProjects: vi.fn(), getWorkstreamsForProjects: vi.fn() }));
vi.mock("../../services/internService", () => ({ getCurrentIntern: serviceMocks.getCurrentIntern }));
vi.mock("../../services/taskService", () => ({ getMyAssignedTasks: serviceMocks.getMyAssignedTasks }));
vi.mock("../../services/taskUpdateService", () => ({ getMyTaskUpdates: serviceMocks.getMyTaskUpdates }));
vi.mock("../../services/projectService", () => ({ getProjects: serviceMocks.getProjects }));
vi.mock("../../services/workstreamService", () => ({ getWorkstreamsForProjects: serviceMocks.getWorkstreamsForProjects }));

import InternProgressPage from "./InternProgressPage";

const intern: Intern = { id: "intern-1", name: "Kim Intern", school: "", major: "", cohort: "", startDate: null, endDate: null, status: "ACTIVE", userUid: "user-1" };
const projectA: Project = { id: "project-a", code: "A", name: "Alpha Project", description: "", status: "ACTIVE", projectType: "BUILD", purpose: "", background: "", expectedOutcome: "", field: "", currentStage: "", teamsFolderUrl: null, keywords: [], operatorId: null, startDate: null, targetEndDate: null, ownerUids: [] };
const projectB: Project = { ...projectA, id: "project-b", name: "Beta Project" };
const task = (id: string, projectId: string, title: string, workstreamId = "stream-a"): Task => ({ id, projectId, title, description: "", workstreamId, parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "IN_PROGRESS", priority: "MEDIUM", startDate: null, dueDate: null, order: 1 });
const update = (id: string, taskId: string, occurredOn: string, createdAt: string, reviewStatus: TaskUpdate["reviewStatus"], values: Partial<TaskUpdate> = {}): TaskUpdate => ({ id, taskId, occurredOn, progress: "Progress summary", learning: "Learning note", blockers: "", nextPlan: "Next action", reviewStatus, managerFeedback: "", authorName: null, createdAt, updatedAt: createdAt, createdBy: "user-1", ...values });

describe("InternProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks(); serviceMocks.getCurrentIntern.mockResolvedValue(intern); serviceMocks.getMyAssignedTasks.mockResolvedValue([task("task-a", "project-a", "Research task"), task("task-b", "project-b", "Build task", "stream-b")]); serviceMocks.getProjects.mockResolvedValue([projectA, projectB]); serviceMocks.getWorkstreamsForProjects.mockResolvedValue([{ id: "stream-a", projectId: "project-a", name: "Research", description: "", status: "ACTIVE", order: 1 }, { id: "stream-b", projectId: "project-b", name: "Build", description: "", status: "ACTIVE", order: 1 }] as Workstream[]); serviceMocks.getMyTaskUpdates.mockResolvedValue([
      update("pending-newer", "task-a", "2026-09-05", "2026-09-05T12:00:00Z", "PENDING", { progress: "Newer same day" }),
      update("approved-earlier", "task-a", "2026-09-05", "2026-09-05T08:00:00Z", "APPROVED"),
      update("changes", "task-b", "2026-08-30", "2026-08-30T10:00:00Z", "CHANGES_REQUESTED", { progress: "Needs revision", learning: "", blockers: "Blocked by source", nextPlan: "Revise source", managerFeedback: "Please add the source links." }),
    ]);
  });

  it("renders own update history with real metrics, context, review badges, and navigation", async () => {
    render(<MemoryRouter><InternProgressPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "My Progress" })).toBeInTheDocument();
    expect(screen.getByLabelText("My progress summary")).toHaveTextContent("UPDATES3PENDING1APPROVED1CHANGES REQUESTED1");
    expect(screen.getAllByText("Research task")[0]).toHaveAttribute("href", "/intern/tasks/task-a");
    expect(screen.getAllByRole("link", { name: "Alpha Project" })[0]).toHaveAttribute("href", "/intern/projects/project-a");
    expect(screen.getAllByText("Please add the source links.").length).toBeGreaterThan(0);
    expect(screen.getByText("검토 대기")).toBeInTheDocument();
    expect(screen.getByText("승인")).toBeInTheDocument();
    expect(screen.getByText("보완 요청")).toBeInTheDocument();
    const items = document.querySelectorAll<HTMLElement>(".v2-intern-progress__item");
    expect(within(items[0]).getAllByText("Newer same day").length).toBeGreaterThan(0);
    expect(within(items[1]).getAllByText("Progress summary").length).toBeGreaterThan(0);
    expect(serviceMocks.getMyTaskUpdates).toHaveBeenCalledTimes(1);
    expect(serviceMocks.getMyAssignedTasks).toHaveBeenCalledTimes(1);
    expect(serviceMocks.getProjects).toHaveBeenCalledTimes(1);
    expect(serviceMocks.getWorkstreamsForProjects).toHaveBeenCalledTimes(1);
  });

  it("filters by search, review status, and project while retaining immutable history", async () => {
    render(<MemoryRouter><InternProgressPage /></MemoryRouter>); await screen.findAllByText("Research task");
    fireEvent.change(screen.getByLabelText("Search progress updates"), { target: { value: "blocked by source" } });
    expect(screen.getByText("Build task")).toBeInTheDocument(); expect(screen.queryByText("Research task")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search progress updates"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Filter by review status"), { target: { value: "APPROVED" } });
    expect(screen.getByText("Research task")).toBeInTheDocument(); expect(screen.queryByText("Build task")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter by review status"), { target: { value: "ALL" } }); fireEvent.change(screen.getByLabelText("Filter by project"), { target: { value: "project-b" } });
    expect(screen.getByText("Build task")).toBeInTheDocument(); expect(screen.queryByText("Research task")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit|delete|resubmit/i })).not.toBeInTheDocument(); expect(screen.queryByText(/score|ranking|xp|achievement/i)).not.toBeInTheDocument();
  });

  it("shows only non-empty fields when details are expanded and supports a filter empty state", async () => {
    render(<MemoryRouter><InternProgressPage /></MemoryRouter>); await screen.findByText("Build task");
    const changes = screen.getByText("Build task").closest("article")!; fireEvent.click(within(changes).getByText("View details"));
    expect(within(changes).getByText("BLOCKERS")).toBeInTheDocument(); expect(within(changes).getByText("NEXT PLAN")).toBeInTheDocument(); expect(within(changes).queryByText("LEARNING")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search progress updates"), { target: { value: "no matching content" } });
    expect(screen.getByText("No updates match your filters.")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Clear filters" })); expect(screen.getByText("Build task")).toBeInTheDocument();
  });

  it("distinguishes no updates, an unlinked intern, and query errors", async () => {
    serviceMocks.getMyTaskUpdates.mockResolvedValue([]); render(<MemoryRouter><InternProgressPage /></MemoryRouter>); expect(await screen.findByText("No progress updates yet.")).toBeInTheDocument(); expect(screen.getByRole("link", { name: "View My Tasks" })).toHaveAttribute("href", "/intern/tasks");
    serviceMocks.getCurrentIntern.mockResolvedValueOnce(null); render(<MemoryRouter><InternProgressPage /></MemoryRouter>); expect(await screen.findByText("Intern profile not linked")).toBeInTheDocument();
    serviceMocks.getCurrentIntern.mockRejectedValueOnce(new Error("network")); render(<MemoryRouter><InternProgressPage /></MemoryRouter>); expect(await screen.findByText("Unable to load your progress.")).toBeInTheDocument();
  });
});
