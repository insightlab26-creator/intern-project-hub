import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import InternProfilePanel from "../../components/interns/InternProfilePanel";
import InternsSummary from "../../components/interns/InternsSummary";
import InternsTable from "../../components/interns/InternsTable";
import { buildInternTaskMetrics, isOverdueTask } from "../../components/interns/internMetrics";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2Input } from "../../components/ui/V2Input";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { V2Select } from "../../components/ui/V2Select";
import { getInterns } from "../../services/internService";
import { getInternReviews } from "../../services/internReviewService";
import { getPrograms, getProgramEnrollments, getProjectMembers } from "../../services/programService";
import { getProjects } from "../../services/projectService";
import { getAllTasks } from "../../services/taskService";
import type { Intern, InternReview, InternStatus, Program, ProgramEnrollment, Project, ProjectMember, Task } from "../../types/domain";

const errorMessage = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;

export default function AdminInternsPage() {
  const [params, setParams] = useSearchParams();
  const [interns, setInterns] = useState<Intern[]>([]); const [tasks, setTasks] = useState<Task[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [query, setQuery] = useState(""); const [status, setStatus] = useState<"ALL" | InternStatus>("ALL");
  const [projects, setProjects] = useState<Project[] | null>(null); const [projectsError, setProjectsError] = useState(""); const projectsRequest = useRef<Promise<Project[]> | null>(null);
  const [projectMembers, setProjectMembers] = useState<Map<string, ProjectMember[]> | null>(null); const [projectMembersLoading, setProjectMembersLoading] = useState(false); const [projectMembersError, setProjectMembersError] = useState(""); const projectMembersRequest = useRef<Promise<void> | null>(null);
  const [programs, setPrograms] = useState<Program[] | null>(null); const [enrollments, setEnrollments] = useState<Map<string, ProgramEnrollment[]> | null>(null); const [programsLoading, setProgramsLoading] = useState(false); const [programsError, setProgramsError] = useState(""); const [enrollmentsError, setEnrollmentsError] = useState(""); const programsRequest = useRef<Promise<void> | null>(null);
  const [reviews, setReviews] = useState<InternReview[] | null>(null); const [reviewsLoading, setReviewsLoading] = useState(false); const [reviewsError, setReviewsError] = useState(""); const reviewsRequest = useRef<Promise<void> | null>(null);
  const selectedInternId = params.get("internId");

  const load = useCallback(async () => { try { setLoading(true); setError(""); const [internItems, taskItems] = await Promise.all([getInterns(), getAllTasks()]); setInterns(internItems); setTasks(taskItems); } catch (caught) { setError(errorMessage(caught, "인턴 목록을 불러오지 못했습니다.")); } finally { setLoading(false); } }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const metricMap = useMemo(() => buildInternTaskMetrics(interns, tasks), [interns, tasks]);
  const selectedIntern = interns.find((intern) => intern.id === selectedInternId) ?? null;
  const clearSelection = useCallback(() => setParams((current) => { const next = new URLSearchParams(current); next.delete("internId"); return next; }), [setParams]);
  useEffect(() => { if (selectedInternId && !loading && !selectedIntern) clearSelection(); }, [clearSelection, loading, selectedIntern, selectedInternId]);
  const selectIntern = (internId: string) => setParams((current) => { const next = new URLSearchParams(current); next.set("internId", internId); return next; });

  const loadProjects = useCallback(async (): Promise<Project[]> => {
    if (projects) return projects;
    if (projectsRequest.current) return projectsRequest.current;
    const request = getProjects().then((items) => { setProjects(items); setProjectsError(""); return items; }).catch((caught) => { setProjectsError(errorMessage(caught, "프로젝트 정보를 불러오지 못했습니다.")); throw caught; }).finally(() => { projectsRequest.current = null; });
    projectsRequest.current = request;
    return request;
  }, [projects]);
  const loadProjectMembers = useCallback(() => {
    if (projectMembers || projectMembersRequest.current) return projectMembersRequest.current ?? Promise.resolve();
    const request = (async () => { try { setProjectMembersLoading(true); setProjectMembersError(""); const projectItems = await loadProjects(); const rows = await Promise.all(projectItems.map(async (project) => [project.id, await getProjectMembers(project.id)] as const)); setProjectMembers(new Map(rows)); } catch (caught) { setProjectMembersError(errorMessage(caught, "프로젝트 참여 관계를 불러오지 못했습니다.")); } finally { setProjectMembersLoading(false); projectMembersRequest.current = null; } })();
    projectMembersRequest.current = request;
    return request;
  }, [loadProjects, projectMembers]);
  const loadPrograms = useCallback(() => {
    if (enrollments || programsRequest.current) return programsRequest.current ?? Promise.resolve();
    const request = (async () => { try { setProgramsLoading(true); setProgramsError(""); setEnrollmentsError(""); const programItems = await getPrograms(); const rows = await Promise.all(programItems.map(async (program) => [program.id, await getProgramEnrollments(program.id)] as const)); setPrograms(programItems); setEnrollments(new Map(rows)); } catch (caught) { setEnrollmentsError(errorMessage(caught, "프로그램 참여 관계를 불러오지 못했습니다.")); } finally { setProgramsLoading(false); programsRequest.current = null; } })();
    programsRequest.current = request;
    return request;
  }, [enrollments]);
  const loadReviews = useCallback(() => {
    if (reviews || reviewsRequest.current) return reviewsRequest.current ?? Promise.resolve();
    const request = (async () => { try { setReviewsLoading(true); setReviewsError(""); setReviews(await getInternReviews()); } catch (caught) { setReviewsError(errorMessage(caught, "인턴 평가를 불러오지 못했습니다.")); } finally { setReviewsLoading(false); reviewsRequest.current = null; } })();
    reviewsRequest.current = request;
    return request;
  }, [reviews]);

  const summary = useMemo(() => ({ total: interns.length, active: interns.filter((intern) => intern.status === "ACTIVE").length, planned: interns.filter((intern) => intern.status === "PLANNED").length, overdueTasks: tasks.filter((task) => isOverdueTask(task)).length, inReview: tasks.filter((task) => task.status === "REVIEW").length }), [interns, tasks]);
  const visibleInterns = useMemo(() => { const needle = query.trim().toLocaleLowerCase("ko-KR"); return interns.filter((intern) => { const matches = !needle || `${intern.name} ${intern.school} ${intern.major}`.toLocaleLowerCase("ko-KR").includes(needle); return matches && (status === "ALL" || intern.status === status); }).map((intern) => ({ intern, metrics: metricMap.get(intern.id)! })); }, [interns, metricMap, query, status]);
  if (loading) return <V2Card><V2EmptyState title="Loading interns" description="인턴 업무 현황을 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load interns" description={error} /></V2Card>;
  return <section className="v2-interns"><V2PageHeader title="Interns" description="인턴별 현재 업무 상태와 업무 부담을 확인합니다." /><InternsSummary {...summary} /><div className="v2-interns__filters"><V2Input aria-label="Search interns" placeholder="Search name, school, or major…" value={query} onChange={(event) => setQuery(event.target.value)} /><V2Select aria-label="Filter interns by status" value={status} onChange={(event) => setStatus(event.target.value as "ALL" | InternStatus)}><option value="ALL">All statuses</option><option value="PLANNED">Planned</option><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option></V2Select></div><div className={selectedIntern ? "v2-interns__body v2-interns__body--selected" : "v2-interns__body"}><InternsTable items={visibleInterns} selectedInternId={selectedInternId} onSelect={selectIntern} />{selectedIntern && <InternProfilePanel intern={selectedIntern} metrics={metricMap.get(selectedIntern.id)!} tasks={tasks.filter((task) => task.assigneeInternIds.includes(selectedIntern.id))} projects={projects} projectsError={projectsError} projectMembers={projectMembers} projectMembersLoading={projectMembersLoading} projectMembersError={projectMembersError} programs={programs} programsError={programsError} enrollments={enrollments} enrollmentsLoading={programsLoading} enrollmentsError={enrollmentsError} reviews={reviews} reviewsLoading={reviewsLoading} reviewsError={reviewsError} onClose={clearSelection} onLoadProjects={() => { void loadProjects().catch(() => undefined); }} onLoadProjectMembers={() => { void loadProjectMembers(); }} onLoadPrograms={() => { void loadPrograms(); }} onLoadReviews={() => { void loadReviews(); }} />}</div></section>;
}
