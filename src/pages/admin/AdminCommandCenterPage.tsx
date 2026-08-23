import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActiveProgramsPreview from "../../components/command-center/ActiveProgramsPreview";
import AttentionRequired from "../../components/command-center/AttentionRequired";
import CommandCenterSummary from "../../components/command-center/CommandCenterSummary";
import InternWorkStatusPreview from "../../components/command-center/InternWorkStatusPreview";
import ProjectPortfolioPreview from "../../components/command-center/ProjectPortfolioPreview";
import RecentOutputsPreview from "../../components/command-center/RecentOutputsPreview";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { getUserProfiles, type UserProfile } from "../../services/authService";
import { getDocuments } from "../../services/documentService";
import { getInterns } from "../../services/internService";
import { getPrograms, getProgramEnrollments } from "../../services/programService";
import { getProjects } from "../../services/projectService";
import { getAllTasks } from "../../services/taskService";
import type { DocumentLink, Intern, Program, Project, Task } from "../../types/domain";
import { buildCommandCenterMetrics } from "./command-center/commandCenterMetrics";

const errorMessage = (caught: unknown) => caught instanceof Error ? caught.message : "Control Tower를 불러오지 못했습니다.";

export default function AdminCommandCenterPage() {
  const [projects, setProjects] = useState<Project[]>([]); const [tasks, setTasks] = useState<Task[]>([]); const [interns, setInterns] = useState<Intern[]>([]); const [programs, setPrograms] = useState<Program[]>([]); const [profiles, setProfiles] = useState<UserProfile[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [activeEnrollments, setActiveEnrollments] = useState<Map<string, number> | null>(null); const [enrollmentError, setEnrollmentError] = useState(""); const enrollmentRequest = useRef<Promise<void> | null>(null); const [documents, setDocuments] = useState<DocumentLink[] | null>(null); const [documentsError, setDocumentsError] = useState(""); const [documentsLoading, setDocumentsLoading] = useState(false); const documentsRequest = useRef<Promise<void> | null>(null);
  const load = useCallback(async () => { try { setLoading(true); setError(""); const [projectItems, taskItems, internItems, programItems, profileItems] = await Promise.all([getProjects(), getAllTasks(), getInterns(), getPrograms(), getUserProfiles()]); setProjects(projectItems); setTasks(taskItems); setInterns(internItems); setPrograms(programItems); setProfiles(profileItems); } catch (caught) { setError(errorMessage(caught)); } finally { setLoading(false); } }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const activePrograms = programs.filter((program) => program.status === "ACTIVE"); if (!activePrograms.length || activeEnrollments || enrollmentRequest.current) return; const request = (async () => { try { setEnrollmentError(""); const rows = await Promise.all(activePrograms.map(async (program) => [program.id, (await getProgramEnrollments(program.id)).filter((enrollment) => enrollment.status === "ACTIVE").length] as const)); setActiveEnrollments(new Map(rows)); } catch (caught) { setEnrollmentError(errorMessage(caught)); } finally { enrollmentRequest.current = null; } })(); enrollmentRequest.current = request; }, [activeEnrollments, programs]);
  useEffect(() => { if (loading || error || documents || documentsRequest.current) return; const request = (async () => { try { setDocumentsLoading(true); setDocumentsError(""); setDocuments(await getDocuments()); } catch (caught) { setDocumentsError(errorMessage(caught)); } finally { setDocumentsLoading(false); documentsRequest.current = null; } })(); documentsRequest.current = request; }, [documents, error, loading]);
  const metrics = useMemo(() => buildCommandCenterMetrics({ projects, tasks, interns, programs, profiles }), [interns, profiles, programs, projects, tasks]);
  if (loading) return <V2Card><V2EmptyState title="Loading Control Tower" description="주요 운영 상태를 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load Control Tower" description={error} /></V2Card>;
  return <section className="v2-command-center"><V2PageHeader title="Control Tower" description="프로젝트, 업무, 인턴 프로그램의 주요 운영 상태를 한눈에 확인합니다." /><CommandCenterSummary kpis={metrics.kpis} /><div className="v2-command-center__grid"><AttentionRequired items={metrics.attention} /><ProjectPortfolioPreview items={metrics.portfolio} /><InternWorkStatusPreview items={metrics.internWork} tasks={tasks} /><RecentOutputsPreview documents={documents} projects={projects} tasks={tasks} loading={documentsLoading} error={documentsError} /><ActiveProgramsPreview programs={metrics.activePrograms} activeEnrollments={activeEnrollments} enrollmentError={enrollmentError} /></div></section>;
}
