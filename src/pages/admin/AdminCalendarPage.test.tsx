import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getInterns } from "../../services/internService";
import { getProjects } from "../../services/projectService";
import { getAllTasks } from "../../services/taskService";
import { intern, project, task } from "../../test/fixtures";
import AdminCalendarPage from "./AdminCalendarPage";

vi.mock("../../services/projectService", () => ({ getProjects: vi.fn() }));
vi.mock("../../services/taskService", () => ({ getAllTasks: vi.fn() }));
vi.mock("../../services/internService", () => ({ getInterns: vi.fn() }));

describe("AdminCalendarPage", () => {
  beforeEach(() => {
    vi.mocked(getProjects).mockResolvedValue([project]);
    vi.mocked(getInterns).mockResolvedValue([intern, { ...intern, id: "intern-2", name: "Other intern" }]);
    vi.mocked(getAllTasks).mockResolvedValue([task, { ...task, id: "task-2", title: "Other task", assigneeInternIds: ["intern-2"], startDate: "2026-08-04", dueDate: "2026-08-12" }]);
  });

  it("filters the Calendar by intern and opens a date detail with production navigation", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><AdminCalendarPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText("기술 조사").length).toBeGreaterThan(0));
    await user.selectOptions(screen.getByLabelText("Filter calendar by intern"), intern.id);
    expect(screen.queryByText("Other task")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /August 3, 2026.*events/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByText("Task start").length).toBeGreaterThan(0);
    expect(within(dialog).getByRole("link", { name: /기술 조사/ })).toHaveAttribute("href", `/admin/tasks/${task.id}`);
  });

  it("shows an empty date detail when the selected date has no events", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><AdminCalendarPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText("기술 조사").length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: /August 20, 2026.*events/i }));
    expect(within(screen.getByRole("dialog")).getByText("No events")).toBeInTheDocument();
  });

  it("moves between months", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><AdminCalendarPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText("기술 조사").length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
  });

  it("shows an empty state when no Project or Task dates exist", async () => {
    vi.mocked(getProjects).mockResolvedValue([{ ...project, startDate: null, targetEndDate: null }]);
    vi.mocked(getAllTasks).mockResolvedValue([{ ...task, startDate: null, dueDate: null }]);
    render(<MemoryRouter><AdminCalendarPage /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText("Loading calendar")).not.toBeInTheDocument());
    expect(screen.getByText("No events")).toBeInTheDocument();
  });
});
