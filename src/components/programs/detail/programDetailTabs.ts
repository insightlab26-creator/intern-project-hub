export const programDetailTabs = [{ id: "overview", label: "Overview" }, { id: "interns", label: "Interns" }, { id: "projects", label: "Projects" }, { id: "evaluations", label: "Evaluations" }] as const;
export type ProgramDetailTab = typeof programDetailTabs[number]["id"];
