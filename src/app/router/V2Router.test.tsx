import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../providers/authContext";
import { V2Router } from "./V2Router";

vi.mock("../../pages/intern/InternMyTasksPage", () => ({ default: () => <p>My tasks destination</p> }));
vi.mock("../../pages/intern/InternTaskDetailPage", () => ({ default: () => <p>Task detail destination</p> }));
vi.mock("../../pages/intern/InternProjectsPage", () => ({ default: () => <p>Projects destination</p> }));
vi.mock("../../pages/intern/InternProjectDetailPage", () => ({ default: () => <p>Project detail destination</p> }));
vi.mock("../../pages/intern/InternProgressPage", () => ({ default: () => <p>Progress destination</p> }));

describe("V2Router INTERN routes", () => {
  it("redirects the legacy My Quests route to the My Tasks screen", () => {
    render(<MemoryRouter initialEntries={["/intern/my-quests"]}><AuthContext.Provider value={{ profile: { id: "intern", email: null, display_name: "Intern", global_role: "INTERN", status: "ACTIVE" }, isLoading: false, signInCurrentUser: vi.fn(), signOutCurrentUser: vi.fn() }}><V2Router /></AuthContext.Provider></MemoryRouter>);
    expect(screen.getByText("My tasks destination")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My Tasks" })).toHaveAttribute("href", "/intern/tasks");
  });

  it("renders the INTERN task-detail route", () => {
    render(<MemoryRouter initialEntries={["/intern/tasks/task-1"]}><AuthContext.Provider value={{ profile: { id: "intern", email: null, display_name: "Intern", global_role: "INTERN", status: "ACTIVE" }, isLoading: false, signInCurrentUser: vi.fn(), signOutCurrentUser: vi.fn() }}><V2Router /></AuthContext.Provider></MemoryRouter>);
    expect(screen.getByText("Task detail destination")).toBeInTheDocument();
  });

  it("renders the INTERN projects route", () => {
    render(<MemoryRouter initialEntries={["/intern/projects"]}><AuthContext.Provider value={{ profile: { id: "intern", email: null, display_name: "Intern", global_role: "INTERN", status: "ACTIVE" }, isLoading: false, signInCurrentUser: vi.fn(), signOutCurrentUser: vi.fn() }}><V2Router /></AuthContext.Provider></MemoryRouter>);
    expect(screen.getByText("Projects destination")).toBeInTheDocument();
  });

  it("renders the INTERN project-detail route", () => {
    render(<MemoryRouter initialEntries={["/intern/projects/project-1"]}><AuthContext.Provider value={{ profile: { id: "intern", email: null, display_name: "Intern", global_role: "INTERN", status: "ACTIVE" }, isLoading: false, signInCurrentUser: vi.fn(), signOutCurrentUser: vi.fn() }}><V2Router /></AuthContext.Provider></MemoryRouter>);
    expect(screen.getByText("Project detail destination")).toBeInTheDocument();
  });

  it("renders the INTERN progress route", () => {
    render(<MemoryRouter initialEntries={["/intern/progress"]}><AuthContext.Provider value={{ profile: { id: "intern", email: null, display_name: "Intern", global_role: "INTERN", status: "ACTIVE" }, isLoading: false, signInCurrentUser: vi.fn(), signOutCurrentUser: vi.fn() }}><V2Router /></AuthContext.Provider></MemoryRouter>);
    expect(screen.getByText("Progress destination")).toBeInTheDocument();
  });
});
