import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AuditLog } from "../../types/domain";
import AuditDetailPanel from "./AuditDetailPanel";

const base: AuditLog = { id: 1, entityType: "projects", entityId: "project-1", action: "UPDATE", changedFields: ["status"], actorId: "actor-1", actorName: "Jordan", occurredAt: "2026-08-29T09:00:00Z" };
const renderPanel = (item: AuditLog) => render(<MemoryRouter><AuditDetailPanel item={item} actionLabel="Updated" entityLabel={item.entityType} changedFieldLabel={(field) => field} onClose={vi.fn()} /></MemoryRouter>);

describe("AuditDetailPanel", () => {
  it.each([["projects", "project-1", "/admin/projects/project-1"], ["tasks", "task-1", "/admin/tasks/task-1"], ["programs", "program-1", "/admin/programs/program-1"], ["interns", "intern-1", "/admin/interns?internId=intern-1"]])("links supported %s entities", (entityType, entityId, href) => {
    renderPanel({ ...base, entityType, entityId }); expect(screen.getByRole("link", { name: "Open related item →" })).toHaveAttribute("href", href);
  });

  it("distinguishes unavailable direct links from entity types without a direct route", () => {
    const { rerender } = renderPanel({ ...base, entityType: "tasks", action: "DELETE" }); expect(screen.getByText("Related item unavailable")).toBeInTheDocument(); rerender(<MemoryRouter><AuditDetailPanel item={{ ...base, entityType: "resources" }} actionLabel="Updated" entityLabel="Resource" changedFieldLabel={(field) => field} onClose={vi.fn()} /></MemoryRouter>); expect(screen.getByText("No direct link available")).toBeInTheDocument();
  });
});
