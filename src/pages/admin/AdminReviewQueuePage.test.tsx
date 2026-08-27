import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getInterns } from "../../services/internService";
import { getProjects } from "../../services/projectService";
import { getAllTasks, updateTask } from "../../services/taskService";
import { getPendingTaskUpdates, getTaskUpdates, reviewTaskUpdate } from "../../services/taskUpdateService";
import { getWorkstreams } from "../../services/workstreamService";
import { intern, project, task } from "../../test/fixtures";
import type { Task, TaskUpdate } from "../../types/domain";
import AdminReviewQueuePage from "./AdminReviewQueuePage";

vi.mock("../../services/taskService", () => ({ getAllTasks: vi.fn(), updateTask: vi.fn() }));
vi.mock("../../services/taskUpdateService", () => ({ getPendingTaskUpdates: vi.fn(), getTaskUpdates: vi.fn(), reviewTaskUpdate: vi.fn() }));
vi.mock("../../services/projectService", () => ({ getProjects: vi.fn() }));
vi.mock("../../services/internService", () => ({ getInterns: vi.fn() }));
vi.mock("../../services/workstreamService", () => ({ getWorkstreams: vi.fn() }));

const reviewTask: Task = { ...task, id: "task-review", title: "Task waiting review", status: "REVIEW", dueDate: "2026-08-28" };
const doneTask: Task = { ...task, id: "task-done", title: "Done task with pending update", status: "DONE" };
const progressTask: Task = { ...task, id: "task-progress", title: "In-progress task with pending update", status: "IN_PROGRESS" };
const pendingDone: TaskUpdate = { id: "update-done", taskId: doneTask.id, occurredOn: "2026-08-05", progress: "Awaiting confirmation", learning: "", blockers: "", nextPlan: "", reviewStatus: "PENDING", managerFeedback: "", authorName: "김도윤", createdAt: "2026-08-05T09:00:00Z", updatedAt: "2026-08-05T09:00:00Z", createdBy: "profile-1" };
const pendingProgress: TaskUpdate = { id: "update-progress", taskId: progressTask.id, occurredOn: "2026-08-04", progress: "Analysis started", learning: "Learned scope", blockers: "", nextPlan: "Continue", reviewStatus: "PENDING", managerFeedback: "", authorName: "김도윤", createdAt: "2026-08-04T09:00:00Z", updatedAt: "2026-08-04T09:00:00Z", createdBy: "profile-1" };

function renderPage(entry = "/admin/reviews") { return render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/admin/reviews" element={<AdminReviewQueuePage />} /></Routes></MemoryRouter>); }

describe("AdminReviewQueuePage", () => {
  beforeEach(() => {
    vi.mocked(getAllTasks).mockResolvedValue([reviewTask, doneTask, progressTask]); vi.mocked(getProjects).mockResolvedValue([project]); vi.mocked(getInterns).mockResolvedValue([intern]); vi.mocked(getPendingTaskUpdates).mockResolvedValue([pendingDone, pendingProgress]); vi.mocked(getTaskUpdates).mockResolvedValue([]); vi.mocked(reviewTaskUpdate).mockResolvedValue(); vi.mocked(updateTask).mockResolvedValue(task); vi.mocked(getWorkstreams).mockResolvedValue([]);
  });

  it("shows Task reviews and pending updates independently without an initial N+1 timeline read", async () => {
    renderPage();
    expect(await screen.findByText("Task waiting review")).toBeInTheDocument();
    expect(screen.getByText("Done task with pending update")).toBeInTheDocument();
    expect(screen.getByText("In-progress task with pending update")).toBeInTheDocument();
    expect(screen.getByText("TASK REVIEW")).toBeInTheDocument(); expect(screen.getAllByText("UPDATE REVIEW")).toHaveLength(2);
    expect(getPendingTaskUpdates).toHaveBeenCalledTimes(1); expect(getTaskUpdates).not.toHaveBeenCalled();
  });

  it("filters the unified inbox by review type and provides type-specific empty states", async () => {
    const user = userEvent.setup(); renderPage(); await screen.findByText("Task waiting review");
    await user.click(screen.getByRole("tab", { name: /TASKS IN REVIEW 1/ }));
    expect(screen.getByText("Task waiting review")).toBeInTheDocument(); expect(screen.queryByText("Done task with pending update")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /PENDING UPDATES 2/ }));
    expect(screen.getByText("Done task with pending update")).toBeInTheDocument(); expect(screen.queryByText("Task waiting review")).not.toBeInTheDocument();
    vi.mocked(getPendingTaskUpdates).mockResolvedValue([]);
  });

  it("opens a pending update by updateId and removes it after approval without changing Task status", async () => {
    const user = userEvent.setup(); renderPage(`/admin/reviews?updateId=${pendingDone.id}`);
    expect(await screen.findByLabelText("Review update details")).toBeInTheDocument(); expect(screen.getByText("Awaiting confirmation")).toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Manager feedback" })).toBeInTheDocument(); expect(document.querySelector(".v2-review-task-table-wrap--compact")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Manager feedback"), "Approved"); await user.click(screen.getByRole("button", { name: "Approve update" }));
    await waitFor(() => expect(reviewTaskUpdate).toHaveBeenCalledWith({ id: pendingDone.id, reviewStatus: "APPROVED", managerFeedback: "Approved" }));
    await waitFor(() => expect(screen.queryByText("Done task with pending update")).not.toBeInTheDocument());
    expect(updateTask).not.toHaveBeenCalled(); expect(getAllTasks).toHaveBeenCalledTimes(1);
  });

  it("removes a pending update after requesting changes and preserves the Task review deep link", async () => {
    const user = userEvent.setup(); renderPage(`/admin/reviews?taskId=${reviewTask.id}`);
    expect(await screen.findByLabelText("Review task details")).toBeInTheDocument(); expect(screen.getByRole("link", { name: "Open Task →" })).toHaveAttribute("href", `/admin/tasks/${reviewTask.id}`);
    await user.click(screen.getByRole("button", { name: "Close task details" }));
    await user.click(screen.getAllByRole("button", { name: "Review" })[0]);
    await user.type(screen.getByLabelText("Manager feedback"), "Add detail"); await user.click(screen.getByRole("button", { name: "Request changes" }));
    await waitFor(() => expect(reviewTaskUpdate).toHaveBeenCalledWith({ id: pendingDone.id, reviewStatus: "CHANGES_REQUESTED", managerFeedback: "Add detail" }));
    await waitFor(() => expect(screen.queryByText("Done task with pending update")).not.toBeInTheDocument());
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("shows the pending-update empty state when that filter has no items", async () => {
    vi.mocked(getPendingTaskUpdates).mockResolvedValue([]); const user = userEvent.setup(); renderPage(); await screen.findByText("Task waiting review");
    await user.click(screen.getByRole("tab", { name: /PENDING UPDATES 0/ }));
    expect(screen.getByRole("heading", { name: "No pending updates" })).toBeInTheDocument();
  });
});
