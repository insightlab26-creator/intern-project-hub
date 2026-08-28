import type { AuditAction } from "../types/domain";

export const auditActions: AuditAction[] = ["INSERT", "UPDATE", "DELETE", "INVITE", "PASSWORD_RESET", "DEACTIVATE", "ACTIVATE"];
export const auditActionLabels: Record<AuditAction, string> = { INSERT: "Created", UPDATE: "Updated", DELETE: "Deleted", INVITE: "Invited user", PASSWORD_RESET: "Password reset", DEACTIVATE: "Deactivated user", ACTIVATE: "Activated user" };
export const auditEntityLabels: Record<string, string> = { projects: "Project", workstreams: "Workstream", interns: "Intern", tasks: "Task", programs: "Program", resources: "Resource", deliverables: "Output", decisions: "Decision", manager_notes: "Manager note", intern_reviews: "Intern review", kpi_definitions: "KPI definition", kpi_results: "KPI result", profiles: "User profile", auth_user: "User account" };

const changedFieldLabels: Record<string, string> = {
  current_version: "Current Version", problem_understanding: "Problem Understanding", reviewer_id: "Reviewer", target_end_date: "Target End Date", due_date: "Due Date", start_date: "Start Date", status: "Status", title: "Title", name: "Name", code: "Code", description: "Description", display_name: "Display Name", global_role: "Role", task_id: "Task", project_id: "Project", workstream_id: "Workstream", operator_id: "Operator",
};

/** Presentation-only mapping. Unrecognized audited DB fields remain intact. */
export const auditChangedFieldLabel = (field: string) => changedFieldLabels[field] ?? field;
