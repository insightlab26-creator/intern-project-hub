import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Intern, Project, Task, TaskUpdate, Workstream } from "../../types/domain";

const serviceMocks = vi.hoisted(() => ({ getCurrentIntern: vi.fn(), getTaskById: vi.fn(), getProjectById: vi.fn(), getWorkstreams: vi.fn(), getTaskUpdates: vi.fn() }));
vi.mock("../../services/internService", () => ({ getCurrentIntern: serviceMocks.getCurrentIntern }));
vi.mock("../../services/taskService", () => ({ getTaskById: serviceMocks.getTaskById }));
vi.mock("../../services/projectService", () => ({ getProjectById: serviceMocks.getProjectById }));
vi.mock("../../services/workstreamService", () => ({ getWorkstreams: serviceMocks.getWorkstreams }));
vi.mock("../../services/taskUpdateService", () => ({ getTaskUpdates: serviceMocks.getTaskUpdates }));

import InternTaskDetailPage from "./InternTaskDetailPage";

const intern: Intern = { id: "intern-1", name: "Intern", school: "", major: "", cohort: "", startDate: null, endDate: null, status: "ACTIVE", userUid: "user-1" };
const task: Task = { id: "task-1", projectId: "project-1", title: "Prepare research brief", description: "Read the interview notes and summarize the findings.", workstreamId: "workstream-1", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "IN_PROGRESS", priority: "HIGH", startDate: null, dueDate: "2000-01-01", order: 1 };
const project: Project = { id: "project-1", code: "P1", name: "Research Project", description: "", status: "ACTIVE", projectType: "BUILD", purpose: "", background: "", expectedOutcome: "", field: "", currentStage: "", teamsFolderUrl: null, keywords: [], operatorId: null, startDate: null, targetEndDate: null, ownerUids: [] };
const workstream: Workstream = { id: "workstream-1", projectId: "project-1", name: "Discovery", description: "", status: "ACTIVE", order: 1 };
const updates: TaskUpdate[] = [
  { id: "update-1", taskId: task.id, occurredOn: "2026-08-28", progress: "Interview synthesis complete", learning: "Themes need clearer grouping", blockers: "", nextPlan: "Draft the brief", reviewStatus: "PENDING", managerFeedback: "", authorName: "Intern", createdAt: "2026-08-28T09:00:00Z", updatedAt: "2026-08-28T09:00:00Z", createdBy: "user-1" },
  { id: "update-2", taskId: task.id, occurredOn: "2026-08-27", progress: "Drafted outline", learning: "", blockers: "Waiting for notes", nextPlan: "Revise structure", reviewStatus: "APPROVED", managerFeedback: "Good direction.", authorName: "Intern", createdAt: "2026-08-27T09:00:00Z", updatedAt: "2026-08-27T09:00:00Z", createdBy: "user-1" },
  { id: "update-3", taskId: task.id, occurredOn: "2026-08-26", progress: "Collected initial notes", learning: "", blockers: "", nextPlan: "Clarify scope", reviewStatus: "CHANGES_REQUESTED", managerFeedback: "Please add source links.", authorName: "Intern", createdAt: "2026-08-26T09:00:00Z", updatedAt: "2026-08-26T09:00:00Z", createdBy: "user-1" },
];

function renderPage(path = "/intern/tasks/task-1") {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/intern/tasks" element={<p>My Tasks destination</p>} /><Route path="/intern/tasks/:taskId" element={<InternTaskDetailPage />} /></Routes></MemoryRouter>);
}

describe("InternTaskDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.getCurrentIntern.mockResolvedValue(intern);
    serviceMocks.getTaskById.mockResolvedValue(task);
    serviceMocks.getProjectById.mockResolvedValue(project);
    serviceMocks.getWorkstreams.mockResolvedValue([workstream]);
    serviceMocks.getTaskUpdates.mockResolvedValue(updates);
  });

  it("renders assigned task context, overdue status, and own progress history", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Prepare research brief" })).toBeInTheDocument();
    expect(screen.getByText("Read the interview notes and summarize the findings.")).toBeInTheDocument();
    expect(screen.getByText("Research Project")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText("진행 중")).toBeInTheDocument();
    expect(screen.getByText("높음")).toBeInTheDocument();
    expect(screen.getByText(/d overdue/)).toBeInTheDocument();
    expect(screen.getByText("검토 대기")).toBeInTheDocument();
    expect(screen.getByText("승인")).toBeInTheDocument();
    expect(screen.getByText("보완 요청")).toBeInTheDocument();
    expect(screen.getByText("Good direction.")).toBeInTheDocument();
    expect(screen.getByText("Please add source links.")).toBeInTheDocument();
    expect(serviceMocks.getTaskUpdates).toHaveBeenCalledWith("task-1");
  });

  it("returns to My Tasks through an explicit route", async () => {
    renderPage();
    const back = await screen.findByRole("link", { name: /Back to My Tasks/ });
    expect(back).toHaveAttribute("href", "/intern/tasks");
  });

  it("shows the neutral no-workstream and no-update states", async () => {
    serviceMocks.getTaskById.mockResolvedValue({ ...task, workstreamId: "" });
    serviceMocks.getWorkstreams.mockResolvedValue([]);
    serviceMocks.getTaskUpdates.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No progress updates yet")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add|edit|delete|approve|request/i })).not.toBeInTheDocument();
  });

  it("does not disclose inaccessible tasks", async () => {
    serviceMocks.getTaskById.mockRejectedValue(new Error("no rows"));
    renderPage("/intern/tasks/other-task");
    expect(await screen.findByText("Task not available")).toBeInTheDocument();
    expect(screen.getByText("이 업무를 찾을 수 없거나 접근 권한이 없습니다.")).toBeInTheDocument();
  });

  it("shows the shared unlinked intern state", async () => {
    serviceMocks.getCurrentIntern.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByText("Intern profile not linked")).toBeInTheDocument();
    expect(serviceMocks.getTaskById).not.toHaveBeenCalled();
  });
});
