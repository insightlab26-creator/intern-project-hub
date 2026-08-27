import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getInterns } from "../../services/internService";
import { getProjectById } from "../../services/projectService";
import { getTaskById, getTasks, updateTask } from "../../services/taskService";
import { createTaskUpdate, getTaskUpdates, reviewTaskUpdate } from "../../services/taskUpdateService";
import { getWorkstreams } from "../../services/workstreamService";
import { intern, project, task } from "../../test/fixtures";
import type { TaskUpdate, Workstream } from "../../types/domain";
import AdminTaskDetailPage from "./AdminTaskDetailPage";

vi.mock("../../services/taskService", () => ({ getTaskById: vi.fn(), getTasks: vi.fn(), updateTask: vi.fn() }));
vi.mock("../../services/taskUpdateService", () => ({ createTaskUpdate: vi.fn(), getTaskUpdates: vi.fn(), reviewTaskUpdate: vi.fn() }));
vi.mock("../../services/projectService", () => ({ getProjectById: vi.fn() }));
vi.mock("../../services/workstreamService", () => ({ getWorkstreams: vi.fn() }));
vi.mock("../../services/internService", () => ({ getInterns: vi.fn() }));

const workstream: Workstream = { id: "ws-1", projectId: project.id, name: "Research", description: "", status: "ACTIVE", order: 1 };
let updates: TaskUpdate[];
const update: TaskUpdate = { id: "update-1", taskId: task.id, occurredOn: "2026-08-04", progress: "Initial research complete", learning: "Learned the domain", blockers: "", nextPlan: "Draft findings", reviewStatus: "PENDING", managerFeedback: "", authorName: "김도윤", createdAt: "2026-08-04T09:00:00Z", updatedAt: "2026-08-04T09:00:00Z", createdBy: "profile-1" };

function renderPage() {
  return render(<MemoryRouter initialEntries={[`/admin/tasks/${task.id}`]}><Routes><Route path="/admin/tasks/:taskId" element={<AdminTaskDetailPage />} /></Routes></MemoryRouter>);
}

describe("AdminTaskDetailPage", () => {
  beforeEach(() => {
    updates = [update];
    vi.mocked(getTaskById).mockResolvedValue(task); vi.mocked(getTasks).mockResolvedValue([task]); vi.mocked(updateTask).mockResolvedValue(task);
    vi.mocked(getProjectById).mockResolvedValue(project); vi.mocked(getWorkstreams).mockResolvedValue([workstream]); vi.mocked(getInterns).mockResolvedValue([intern]);
    vi.mocked(getTaskUpdates).mockImplementation(async () => updates); vi.mocked(createTaskUpdate).mockResolvedValue(); vi.mocked(reviewTaskUpdate).mockImplementation(async ({ id, reviewStatus, managerFeedback }) => { updates = updates.map((item) => item.id === id ? { ...item, reviewStatus, managerFeedback } : item); });
  });

  it("loads Task Context, timeline, and Project navigation", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: task.title })).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getAllByText("김도윤").length).toBeGreaterThan(0);
    expect(await screen.findByText("Initial research complete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: project.name })).toHaveAttribute("href", `/admin/projects/${project.id}?tab=work`);
  });

  it("keeps the Update form collapsed and opens it from the compact empty state", async () => {
    updates = [];
    const user = userEvent.setup(); renderPage();
    expect(await screen.findByText("No progress updates yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Progress")).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "+ Add Update" })[1]);
    await user.click(screen.getByRole("button", { name: "Add progress update" }));
    expect(screen.getByText("Enter progress, learning, blockers, or a next plan.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Progress"), "Started analysis");
    await user.click(screen.getByRole("button", { name: "Add progress update" }));
    await waitFor(() => expect(createTaskUpdate).toHaveBeenCalledWith(expect.objectContaining({ taskId: task.id, progress: "Started analysis" })));
  });

  it("prioritizes the timeline while keeping the Update form collapsed when updates exist", async () => {
    renderPage();
    expect(await screen.findByText("Initial research complete")).toBeInTheDocument();
    expect(screen.queryByLabelText("Progress")).not.toBeInTheDocument();
    expect(screen.queryByText("Task status and Update review status are managed independently.")).not.toBeInTheDocument();
  });

  it("reviews a Pending Update without changing the Task status and hides completed actions", async () => {
    const user = userEvent.setup(); renderPage();
    await screen.findByText("Initial research complete");
    await user.type(screen.getByLabelText("Manager feedback"), "Looks good");
    await user.click(screen.getByRole("button", { name: "Approve update" }));
    await waitFor(() => expect(reviewTaskUpdate).toHaveBeenCalledWith({ id: update.id, reviewStatus: "APPROVED", managerFeedback: "Looks good" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Approve update" })).not.toBeInTheDocument());
    expect(screen.getAllByText("진행 중").length).toBeGreaterThan(0);
    expect(getTaskById).toHaveBeenCalledTimes(1);
  });

  it("renders a not-found page when the Task lookup fails", async () => {
    vi.mocked(getTaskById).mockRejectedValue(new Error("missing"));
    renderPage();
    expect(await screen.findByRole("heading", { name: "Task not found" })).toBeInTheDocument();
  });
});
