import { describe, expect, it } from "vitest";
import { buildInternRows, buildPortfolioRows, buildProjectRows, hasInvalidScheduleRange, matchesTaskFilters, metricsForTasks } from "./adminReportService";
import type { AdminReportData } from "./adminReportService";
import type { Intern, Project, Task } from "../types/domain";

const project: Project = { id: "project-1", code: "PDC-1", name: "Project Alpha", description: "", status: "ACTIVE", projectType: "BUILD", purpose: "", background: "", expectedOutcome: "", field: "", currentStage: "", teamsFolderUrl: null, keywords: [], operatorId: null, startDate: null, targetEndDate: "2026-08-20", ownerUids: [] };
const intern: Intern = { id: "intern-1", name: "Jones", school: "", major: "", cohort: "2026", startDate: null, endDate: null, status: "ACTIVE", userUid: null };
const task = (overrides: Partial<Task> = {}): Task => ({ id: "task-1", projectId: "project-1", title: "Research", description: "", workstreamId: "work-1", parentTaskId: null, assigneeInternIds: ["intern-1"], assigneeUids: [], status: "IN_PROGRESS", priority: "HIGH", startDate: "2026-08-10", dueDate: "2026-08-20", order: 1, ...overrides });
const data = (tasks: Task[]): AdminReportData => ({ projects: [project], interns: [intern], tasks });

describe("admin report view models", () => {
  it("uses Task schedule overlap semantics and rejects invalid ranges", () => {
    expect(matchesTaskFilters(task(), { status: "ALL", startDate: "2026-08-15", endDate: "2026-08-16" })).toBe(true);
    expect(matchesTaskFilters(task(), { status: "ALL", startDate: "2026-08-21", endDate: "" })).toBe(false);
    expect(matchesTaskFilters(task({ startDate: null, dueDate: null }), { status: "ALL", startDate: "2026-08-21", endDate: "2026-08-22" })).toBe(true);
    expect(hasInvalidScheduleRange({ startDate: "2026-08-20", endDate: "2026-08-19" })).toBe(true);
  });

  it("builds current-status Portfolio metrics without treating DONE as a completion date", () => {
    const rows = buildPortfolioRows(data([task({ id: "done", status: "DONE" }), task({ id: "review", status: "REVIEW", dueDate: "2020-01-01" })]), { status: "ALL", startDate: "", endDate: "" });
    expect(rows[0]).toMatchObject({ tasks: 2, done: 1, inReview: 1, overdue: 1 });
    expect(metricsForTasks([task({ status: "DONE" })]).done).toBe(1);
  });

  it("uses existing assignee IDs for Project and Intern rows without a relation query", () => {
    expect(buildProjectRows(data([task()]), { projectId: "project-1", status: "ALL", startDate: "", endDate: "" })[0]).toMatchObject({ assignees: "Jones", task: "Research" });
    expect(buildInternRows(data([task()]), { internId: "intern-1", projectId: "project-1", status: "ALL", startDate: "", endDate: "" })[0]).toMatchObject({ project: "Project Alpha", task: "Research" });
  });
});
