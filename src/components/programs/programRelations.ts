import type { ProgramEnrollment, ProgramProject } from "../../types/domain";

export type ProgramRelations = { enrollments: ProgramEnrollment[] | null; projects: ProgramProject[] | null; error?: string };

export type ProgramRelationMetrics = { enrollments: number; activeEnrollments: number; plannedEnrollments: number; completedEnrollments: number; projects: number; activeProjects: number };

export function getProgramRelationMetrics(relations?: ProgramRelations): ProgramRelationMetrics {
  const enrollments = relations?.enrollments ?? [];
  const projects = relations?.projects ?? [];
  return { enrollments: enrollments.length, activeEnrollments: enrollments.filter((item) => item.status === "ACTIVE").length, plannedEnrollments: enrollments.filter((item) => item.status === "PLANNED").length, completedEnrollments: enrollments.filter((item) => item.status === "COMPLETED").length, projects: projects.length, activeProjects: projects.filter((item) => item.status === "ACTIVE").length };
}
