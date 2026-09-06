import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Intern, Project, Task, TaskUpdate, Workstream } from "../../types/domain";

const serviceMocks = vi.hoisted(() => ({ getCurrentIntern: vi.fn(), getProjectById: vi.fn(), getMyAssignedTasks: vi.fn(), getMyTaskUpdates: vi.fn(), getWorkstreamsForProjects: vi.fn() }));
vi.mock("../../services/internService", () => ({ getCurrentIntern: serviceMocks.getCurrentIntern }));
vi.mock("../../services/projectService", () => ({ getProjectById: serviceMocks.getProjectById }));
vi.mock("../../services/taskService", () => ({ getMyAssignedTasks: serviceMocks.getMyAssignedTasks }));
vi.mock("../../services/taskUpdateService", () => ({ getMyTaskUpdates: serviceMocks.getMyTaskUpdates }));
vi.mock("../../services/workstreamService", () => ({ getWorkstreamsForProjects: serviceMocks.getWorkstreamsForProjects }));

import InternProjectDetailPage from "./InternProjectDetailPage";

const intern: Intern = { id: "intern-1", name: "Intern", school: "", major: "", cohort: "", startDate: null, endDate: null, status: "ACTIVE", userUid: "user-1" };
const project: Project = { id: "project-1", code: "P1", name: "Research Project", description: "A complete project description.", status: "ACTIVE", projectType: "BUILD", purpose: "", background: "", expectedOutcome: "", field: "", currentStage: "", teamsFolderUrl: null, keywords: [], operatorId: null, startDate: null, targetEndDate: null, ownerUids: [] };
const task = (id: string, workstreamId: string, status: Task["status"], dueDate: string | null): Task => ({ id, projectId: "project-1", title: id, description: "Task context", workstreamId, parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status, priority: "HIGH", startDate: null, dueDate, order: 1 });
const tasks = [task("Overdue task", "workstream-1", "TODO", "2000-01-01"), task("Progress task", "workstream-1", "IN_PROGRESS", "2099-01-02"), task("General done task", "missing-workstream", "DONE", null)];
const workstream: Workstream = { id: "workstream-1", projectId: "project-1", name: "Discovery", description: "", status: "ACTIVE", order: 1 };
const updates: TaskUpdate[] = [
  { id: "update-pending", taskId: "Progress task", occurredOn: "2026-08-30", progress: "Latest progress", learning: "", blockers: "", nextPlan: "", reviewStatus: "PENDING", managerFeedback: "", authorName: null, createdAt: "2026-08-30T10:00:00Z", updatedAt: "", createdBy: "user-1" },
  { id: "update-approved", taskId: "Overdue task", occurredOn: "2026-08-29", progress: "Approved progress", learning: "", blockers: "", nextPlan: "", reviewStatus: "APPROVED", managerFeedback: "Looks good.", authorName: null, createdAt: "2026-08-29T10:00:00Z", updatedAt: "", createdBy: "user-1" },
  { id: "update-changes", taskId: "Overdue task", occurredOn: "2026-08-28", progress: "Earlier progress", learning: "", blockers: "", nextPlan: "", reviewStatus: "CHANGES_REQUESTED", managerFeedback: "Please add sources.", authorName: null, createdAt: "2026-08-28T10:00:00Z", updatedAt: "", createdBy: "user-1" },
  { id: "other-project-update", taskId: "other-task", occurredOn: "2026-08-31", progress: "Private other update", learning: "", blockers: "", nextPlan: "", reviewStatus: "PENDING", managerFeedback: "", authorName: null, createdAt: "2026-08-31T10:00:00Z", updatedAt: "", createdBy: "user-1" },
];

function renderPage(path = "/intern/projects/project-1") { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/intern/projects" element={<p>My Projects destination</p>} /><Route path="/intern/projects/:projectId" element={<InternProjectDetailPage />} /><Route path="/intern/tasks/:taskId" element={<p>Task destination</p>} /></Routes></MemoryRouter>); }

describe("InternProjectDetailPage", () => {
  beforeEach(() => { vi.clearAllMocks(); serviceMocks.getCurrentIntern.mockResolvedValue(intern); serviceMocks.getProjectById.mockResolvedValue(project); serviceMocks.getMyAssignedTasks.mockResolvedValue(tasks); serviceMocks.getMyTaskUpdates.mockResolvedValue(updates); serviceMocks.getWorkstreamsForProjects.mockResolvedValue([workstream]); });

  it("renders only my project work, grouping, metrics, and recent progress", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Research Project" })).toBeInTheDocument();
    expect(screen.getByText("A complete project description.")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText("GENERAL")).toBeInTheDocument();
    expect(screen.getByLabelText("My work summary")).toHaveTextContent("MY TASKS3");
    expect(screen.getByText("Overdue task")).toBeInTheDocument();
    expect(screen.getAllByText("진행 중")).toHaveLength(2);
    expect(screen.getAllByText("높음")).toHaveLength(3);
    expect(screen.getByText("검토 대기")).toBeInTheDocument();
    expect(screen.getByText("승인")).toBeInTheDocument();
    expect(screen.getByText("보완 요청")).toBeInTheDocument();
    expect(screen.getByText("Looks good.")).toBeInTheDocument();
    expect(screen.getByText("Please add sources.")).toBeInTheDocument();
    expect(screen.queryByText("Private other update")).not.toBeInTheDocument();
    expect(serviceMocks.getWorkstreamsForProjects).toHaveBeenCalledWith(["project-1"]);
    expect(serviceMocks.getMyTaskUpdates).toHaveBeenCalledTimes(1);
  });

  it("provides explicit project and task navigation without actions", async () => {
    renderPage();
    expect((await screen.findByRole("link", { name: /Back to My Projects/ }))).toHaveAttribute("href", "/intern/projects");
    expect(screen.getByRole("link", { name: "Overdue task" })).toHaveAttribute("href", "/intern/tasks/Overdue task");
    expect(screen.queryByRole("button", { name: /edit|delete|create/i })).not.toBeInTheDocument();
  });

  it("handles unavailable projects, unlinked profiles, and no progress", async () => {
    serviceMocks.getProjectById.mockRejectedValueOnce(new Error("no rows")); renderPage("/intern/projects/private");
    expect(await screen.findByText("Project not available")).toBeInTheDocument();

    serviceMocks.getCurrentIntern.mockResolvedValueOnce(null); renderPage();
    expect(await screen.findByText("Intern profile not linked")).toBeInTheDocument();

    serviceMocks.getMyTaskUpdates.mockResolvedValueOnce([]); renderPage();
    expect(await screen.findByText("No progress updates yet.")).toBeInTheDocument();
  });
});
