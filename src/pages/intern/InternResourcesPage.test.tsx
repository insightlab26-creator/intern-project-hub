import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentLink, Intern, Project, Task } from "../../types/domain";

const serviceMocks = vi.hoisted(() => ({ getCurrentIntern: vi.fn(), getMyAssignedTasks: vi.fn(), getProjects: vi.fn(), getDocuments: vi.fn() }));
vi.mock("../../services/internService", () => ({ getCurrentIntern: serviceMocks.getCurrentIntern }));
vi.mock("../../services/taskService", () => ({ getMyAssignedTasks: serviceMocks.getMyAssignedTasks }));
vi.mock("../../services/projectService", () => ({ getProjects: serviceMocks.getProjects }));
vi.mock("../../services/documentService", () => ({ getDocuments: serviceMocks.getDocuments }));

import InternResourcesPage from "./InternResourcesPage";

const intern: Intern = { id: "intern-1", name: "Kim Intern", school: "", major: "", cohort: "", startDate: null, endDate: null, status: "ACTIVE", userUid: "user-1" };
const projectA: Project = { id: "project-a", code: "A", name: "Alpha Project", description: "", status: "ACTIVE", projectType: "BUILD", purpose: "", background: "", expectedOutcome: "", field: "", currentStage: "", teamsFolderUrl: "https://teams.example.test/alpha", keywords: [], operatorId: null, startDate: null, targetEndDate: null, ownerUids: [] };
const projectB: Project = { ...projectA, id: "project-b", name: "Beta Project", teamsFolderUrl: null };
const task = (id: string, projectId: string, title: string): Task => ({ id, projectId, title, description: "", workstreamId: "stream", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "IN_PROGRESS", priority: "MEDIUM", startDate: null, dueDate: null, order: 1 });
const output: DocumentLink = { id: "output-1", projectId: "project-a", taskId: "task-a", title: "Alpha output", description: "Latest output source", url: "https://sharepoint.example.test/output", archived: false, source: "DOCUMENT", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-05T00:00:00Z" };
const resource: DocumentLink = { id: "resource-1", projectId: "project-a", taskId: null, title: "Alpha reference", description: "Project-level reference", url: "https://teams.example.test/reference", archived: false, source: "RESOURCE", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-04T00:00:00Z" };

describe("InternResourcesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks(); serviceMocks.getCurrentIntern.mockResolvedValue(intern); serviceMocks.getProjects.mockResolvedValue([projectA, projectB]); serviceMocks.getMyAssignedTasks.mockResolvedValue([task("task-a", "project-a", "Assigned Alpha task"), task("task-b", "project-b", "Assigned Beta task")]); serviceMocks.getDocuments.mockResolvedValue([output, resource]);
  });

  it("renders RLS-visible source links, workspace context, and safe external navigation", async () => {
    render(<MemoryRouter><InternResourcesPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "My Resources" })).toBeInTheDocument();
    expect(screen.getByLabelText("My resources summary")).toHaveTextContent("PROJECTS2RESOURCES1OUTPUTS1");
    expect(screen.getByRole("link", { name: "Open Workspace ↗" })).toHaveAttribute("href", projectA.teamsFolderUrl);
    expect(screen.getByRole("link", { name: "Open Workspace ↗" })).toHaveAttribute("target", "_blank");
    expect(screen.getAllByRole("link", { name: "Open Source ↗" })[0]).toHaveAttribute("href", output.url);
    expect(screen.getAllByRole("link", { name: "Open Source ↗" })[0]).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getAllByRole("link", { name: "Alpha Project" })[0]).toHaveAttribute("href", "/intern/projects/project-a");
    expect(screen.getByRole("link", { name: "Assigned Alpha task" })).toHaveAttribute("href", "/intern/tasks/task-a");
    expect(screen.getByText("Project-level")).toBeInTheDocument();
    expect(serviceMocks.getDocuments).toHaveBeenCalledTimes(1); expect(serviceMocks.getProjects).toHaveBeenCalledTimes(1); expect(serviceMocks.getMyAssignedTasks).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /create|edit|delete|archive|review|upload/i })).not.toBeInTheDocument(); expect(screen.queryByText(/manager feedback|reviewer|operator/i)).not.toBeInTheDocument();
  });

  it("filters only its loaded RLS-visible links by search, project, and type", async () => {
    render(<MemoryRouter><InternResourcesPage /></MemoryRouter>); await screen.findByText("Alpha output");
    fireEvent.change(screen.getByLabelText("Search resources"), { target: { value: "project-level" } }); expect(screen.getByText("Alpha reference")).toBeInTheDocument(); expect(screen.queryByText("Alpha output")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search resources"), { target: { value: "" } }); fireEvent.change(screen.getByLabelText("Filter resource type"), { target: { value: "DOCUMENT" } }); expect(screen.getByText("Alpha output")).toBeInTheDocument(); expect(screen.queryByText("Alpha reference")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter resource type"), { target: { value: "ALL" } }); fireEvent.change(screen.getByLabelText("Filter resources by project"), { target: { value: "project-b" } }); expect(screen.getByText("No source links match your filters.")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Clear filters" })); expect(screen.getByText("Alpha reference")).toBeInTheDocument();
  });

  it("handles missing source URLs and workspace-only or source-only states", async () => {
    serviceMocks.getDocuments.mockResolvedValueOnce([{ ...resource, id: "resource-no-url", title: "No URL resource", url: "" }]); const missingUrl = render(<MemoryRouter><InternResourcesPage /></MemoryRouter>); expect(await screen.findByText("No URL resource")).toBeInTheDocument(); expect(screen.getByText("Source URL unavailable")).toBeInTheDocument(); missingUrl.unmount();
    serviceMocks.getDocuments.mockResolvedValueOnce([]); const workspaceOnly = render(<MemoryRouter><InternResourcesPage /></MemoryRouter>); expect(await screen.findByText("No source links available yet.")).toBeInTheDocument(); expect(screen.getByRole("link", { name: "Open Workspace ↗" })).toBeInTheDocument(); workspaceOnly.unmount();
    serviceMocks.getProjects.mockResolvedValueOnce([{ ...projectA, teamsFolderUrl: null }]); render(<MemoryRouter><InternResourcesPage /></MemoryRouter>); expect(await screen.findByText("Alpha output")).toBeInTheDocument(); expect(screen.queryByText("PROJECT WORKSPACES")).not.toBeInTheDocument();
  });

  it("distinguishes an empty resource set, unlinked intern, and query errors", async () => {
    serviceMocks.getProjects.mockResolvedValueOnce([]); serviceMocks.getDocuments.mockResolvedValueOnce([]); const empty = render(<MemoryRouter><InternResourcesPage /></MemoryRouter>); const emptyTitle = await screen.findByText("No resources available yet."); expect(emptyTitle).toBeInTheDocument(); expect(emptyTitle.closest(".v2-intern-resources__empty")).toBeInTheDocument(); empty.unmount();
    serviceMocks.getCurrentIntern.mockResolvedValueOnce(null); const unlinked = render(<MemoryRouter><InternResourcesPage /></MemoryRouter>); expect(await screen.findByText("Intern profile not linked")).toBeInTheDocument(); unlinked.unmount();
    serviceMocks.getDocuments.mockRejectedValueOnce(new Error("network")); render(<MemoryRouter><InternResourcesPage /></MemoryRouter>); expect(await screen.findByText("Unable to load your resources.")).toBeInTheDocument();
  });
});
