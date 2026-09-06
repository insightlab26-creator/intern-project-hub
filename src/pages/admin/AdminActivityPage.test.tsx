import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuditLogPage } from "../../services/auditService";
import type { AuditLog } from "../../types/domain";
import AdminActivityPage from "./AdminActivityPage";

vi.mock("../../services/auditService", () => ({ getAuditLogPage: vi.fn() }));

const first: AuditLog = { id: 12, entityType: "projects", entityId: "project-12345678", action: "UPDATE", changedFields: ["status", "target_end_date"], actorId: "actor-1", actorName: "Jordan", occurredAt: "2026-08-29T09:00:00Z" };
const authEvent: AuditLog = { id: 11, entityType: "auth_user", entityId: "user-12345678", action: "INVITE", changedFields: ["email", "display_name"], actorId: null, actorName: null, occurredAt: "2026-08-28T09:00:00Z" };
const taskEvent: AuditLog = { id: 10, entityType: "tasks", entityId: "task-12345678", action: "DELETE", changedFields: [], actorId: "actor-2", actorName: "Kai", occurredAt: "2026-08-27T09:00:00Z" };
const programEvent: AuditLog = { id: 9, entityType: "programs", entityId: "program-123456", action: "INSERT", changedFields: ["name", "status", "description", "code"], actorId: "actor-1", actorName: "Jordan", occurredAt: "2026-08-26T09:00:00Z" };

function renderPage() { return render(<MemoryRouter initialEntries={["/admin/activity"]}><Routes><Route path="/admin/activity" element={<AdminActivityPage />} /><Route path="/admin/projects/:id" element={<p>Project destination</p>} /><Route path="/admin/tasks/:id" element={<p>Task destination</p>} /><Route path="/admin/programs/:id" element={<p>Program destination</p>} /><Route path="/admin/interns" element={<p>Intern destination</p>} /></Routes></MemoryRouter>); }

describe("AdminActivityPage", () => {
  beforeEach(() => { vi.mocked(getAuditLogPage).mockResolvedValue({ items: [first, authEvent, taskEvent, programEvent], nextCursor: { occurredAt: taskEvent.occurredAt, id: taskEvent.id } }); });

  it("renders factual audit rows with friendly entity labels and no table UUID", async () => {
    renderPage(); expect(await screen.findByRole("heading", { name: "Activity" })).toBeInTheDocument(); expect(screen.getAllByText("Updated")).not.toHaveLength(0); expect(screen.getAllByText("Invited user")).not.toHaveLength(0); expect(screen.getByText("Target End Date")).toBeInTheDocument(); expect(screen.queryByText("project-…5678")).not.toBeInTheDocument(); expect(screen.queryByText("Before")).not.toBeInTheDocument(); expect(screen.queryByText("After")).not.toBeInTheDocument();
  });

  it("sends entity, action, actor, and date filters to the bounded server query", async () => {
    const user = userEvent.setup(); renderPage(); await screen.findByRole("heading", { name: "Activity" });
    await user.selectOptions(screen.getByLabelText("Filter audit records by entity type"), "projects"); await waitFor(() => expect(getAuditLogPage).toHaveBeenLastCalledWith(expect.objectContaining({ filters: expect.objectContaining({ entityType: "projects" }) })));
    await user.selectOptions(screen.getByLabelText("Filter audit records by action"), "UPDATE"); await waitFor(() => expect(getAuditLogPage).toHaveBeenLastCalledWith(expect.objectContaining({ filters: expect.objectContaining({ action: "UPDATE" }) })));
    await user.selectOptions(screen.getByLabelText("Filter audit records by actor"), "actor-1"); await waitFor(() => expect(getAuditLogPage).toHaveBeenLastCalledWith(expect.objectContaining({ filters: expect.objectContaining({ actorId: "actor-1" }) })));
    await user.selectOptions(screen.getByLabelText("Filter audit records by date"), "LAST_7_DAYS"); await waitFor(() => expect(getAuditLogPage).toHaveBeenLastCalledWith(expect.objectContaining({ filters: expect.objectContaining({ occurredAfter: expect.any(String) }) })));
  });

  it("searches only actor, entity type, entity ID, and changed fields", async () => {
    const user = userEvent.setup(); renderPage(); await screen.findByRole("heading", { name: "Activity" }); await user.type(screen.getByLabelText("Search audit records"), "target_end_date"); expect(screen.getByText("Target End Date")).toBeInTheDocument(); expect(screen.queryByText("user-12345678")).not.toBeInTheDocument();
  });

  it("opens a factual detail panel with no fake diff and navigates supported Project entities", async () => {
    const user = userEvent.setup(); renderPage(); await screen.findByRole("heading", { name: "Activity" }); await user.click(screen.getAllByRole("button")[0]); expect(screen.getByLabelText("Audit details")).toBeInTheDocument(); expect(screen.getByText("ENTITY ID")).toBeInTheDocument(); expect(screen.getByText("project-12345678")).toBeInTheDocument(); expect(screen.getByRole("link", { name: "Open related item →" })).toHaveAttribute("href", "/admin/projects/project-12345678"); expect(screen.queryByText("Metadata")).not.toBeInTheDocument();
  });

  it("marks DELETE and unsupported entities unavailable instead of creating a broken navigation link", async () => {
    const user = userEvent.setup(); renderPage(); await screen.findByRole("heading", { name: "Activity" }); await user.click(screen.getAllByRole("button")[2]); expect(screen.getByText("Related item unavailable")).toBeInTheDocument(); expect(screen.queryByRole("link", { name: "Open related item →" })).not.toBeInTheDocument(); await user.click(screen.getByLabelText("Close audit details")); await user.click(screen.getAllByRole("button")[1]); expect(screen.getByText("No direct link available")).toBeInTheDocument();
  });

  it("loads the next cursor page without reloading the initial page", async () => {
    vi.mocked(getAuditLogPage).mockResolvedValueOnce({ items: [first], nextCursor: { occurredAt: first.occurredAt, id: first.id } }).mockResolvedValueOnce({ items: [programEvent], nextCursor: null }); const user = userEvent.setup(); renderPage(); await screen.findByRole("heading", { name: "Activity" }); await user.click(screen.getByRole("button", { name: "Load more" })); await waitFor(() => expect(getAuditLogPage).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: { occurredAt: first.occurredAt, id: first.id } }))); expect(screen.getAllByText("Program")).not.toHaveLength(0);
  });

  it("distinguishes no records from no client-side search matches", async () => {
    const user = userEvent.setup(); renderPage(); await screen.findByRole("heading", { name: "Activity" }); await user.type(screen.getByLabelText("Search audit records"), "does-not-exist"); expect(screen.getByRole("heading", { name: "No matching audit records" })).toBeInTheDocument(); vi.mocked(getAuditLogPage).mockResolvedValue({ items: [], nextCursor: null }); await user.selectOptions(screen.getByLabelText("Filter audit records by action"), "DELETE"); expect(await screen.findByRole("heading", { name: "No audit records yet" })).toBeInTheDocument();
  });

  it("paginates filtered activity rows in groups of ten and resets on search", async () => {
    const manyEvents = Array.from({ length: 11 }, (_, index) => ({ ...first, id: 100 + index, entityId: `project-${index}`, actorName: `Actor ${index}` }));
    vi.mocked(getAuditLogPage).mockResolvedValue({ items: manyEvents, nextCursor: null });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Activity" });

    await waitFor(() => expect(document.querySelectorAll("tbody tr")).toHaveLength(10));
    await user.click(screen.getByRole("button", { name: "2" }));
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page");

    await user.type(screen.getByLabelText("Search audit records"), "Actor 0");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(screen.queryByRole("navigation", { name: "Activity pages" })).not.toBeInTheDocument();
  });
});
