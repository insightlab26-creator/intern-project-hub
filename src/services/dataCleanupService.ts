import { supabase } from "../supabase";
import type { DeletableEntity } from "./deleteService";

export type CleanupRecord = { id: string; entityType: DeletableEntity; typeLabel: string; name: string; context: string };
const specs: { table: string; entityType: DeletableEntity; typeLabel: string; name: string; context?: string }[] = [
  { table: "projects", entityType: "project", typeLabel: "Project", name: "name", context: "code" },
  { table: "workstreams", entityType: "workstream", typeLabel: "Workstream", name: "name" },
  { table: "tasks", entityType: "task", typeLabel: "Task", name: "title" },
  { table: "interns", entityType: "intern", typeLabel: "Intern", name: "name", context: "cohort" },
  { table: "programs", entityType: "program", typeLabel: "Program", name: "name", context: "code" },
  { table: "resources", entityType: "resource", typeLabel: "Resource", name: "title" },
  { table: "deliverables", entityType: "deliverable", typeLabel: "Document", name: "title" },
  { table: "manager_notes", entityType: "manager_note", typeLabel: "Manager Note", name: "subject" },
  { table: "intern_reviews", entityType: "intern_review", typeLabel: "Intern Review", name: "review_cycle" },
];

export async function getCleanupRecords(): Promise<CleanupRecord[]> {
  const results = await Promise.all(specs.map((spec) => supabase.from(spec.table).select(["id", spec.name, spec.context].filter(Boolean).join(","))));
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(`삭제 대상 조회 실패: ${failed.error.message}`);
  return results.flatMap((result, index) => {
    const spec = specs[index];
    return ((result.data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
      id: String(row.id), entityType: spec.entityType, typeLabel: spec.typeLabel,
      name: String(row[spec.name] ?? "이름 없음"), context: spec.context ? String(row[spec.context] ?? "") : "",
    }));
  }).sort((a, b) => a.typeLabel.localeCompare(b.typeLabel) || a.name.localeCompare(b.name));
}
