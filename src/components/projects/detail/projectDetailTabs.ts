export const detailTabs = [{ id: "overview", label: "Overview" }, { id: "work", label: "Work" }, { id: "reviews", label: "Reviews" }, { id: "outputs", label: "Outputs" }, { id: "members", label: "Members" }] as const;
export type ProjectDetailTab = typeof detailTabs[number]["id"];
