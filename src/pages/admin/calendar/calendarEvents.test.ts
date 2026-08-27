import { describe, expect, it } from "vitest";
import { intern, project, task } from "../../../test/fixtures";
import { buildCalendarEvents } from "./calendarEvents";

describe("buildCalendarEvents", () => {
  it("normalizes the four supported Project and Task date events", () => {
    const events = buildCalendarEvents([project], [task], [intern], { projectId: "", internId: "", eventType: "ALL" });
    expect(events.map((event) => event.type)).toEqual(["PROJECT_START", "TASK_START", "TASK_DUE", "PROJECT_END"]);
    expect(events.find((event) => event.type === "TASK_DUE")).toMatchObject({ taskId: task.id, title: task.title, projectName: project.name, assigneeNames: [intern.name] });
  });

  it("keeps only an intern's Task events and Project dates for Projects with an assigned Task", () => {
    const otherProject = { ...project, id: "project-2", name: "Other project", startDate: "2026-08-02", targetEndDate: "2026-08-22" };
    const otherTask = { ...task, id: "task-2", projectId: otherProject.id, assigneeInternIds: ["intern-2"], startDate: "2026-08-04", dueDate: "2026-08-12" };
    const events = buildCalendarEvents([project, otherProject], [task, otherTask], [intern, { ...intern, id: "intern-2", name: "Other intern" }], { projectId: "", internId: intern.id, eventType: "ALL" });
    expect(events).toHaveLength(4);
    expect(events.every((event) => event.projectId === project.id)).toBe(true);
  });

  it("applies Project and broad event-type filters without creating other event types", () => {
    const events = buildCalendarEvents([project], [task], [intern], { projectId: project.id, internId: "", eventType: "TASK" });
    expect(events.map((event) => event.type)).toEqual(["TASK_START", "TASK_DUE"]);
  });
});
