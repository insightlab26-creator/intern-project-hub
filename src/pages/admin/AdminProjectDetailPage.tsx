import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ProjectFormModal from "../../components/projects/ProjectFormModal";
import ProjectDetailHeader from "../../components/projects/detail/ProjectDetailHeader";
import ProjectDetailTabs from "../../components/projects/detail/ProjectDetailTabs";
import { detailTabs, type ProjectDetailTab } from "../../components/projects/detail/projectDetailTabs";
import ProjectOverviewTab from "../../components/projects/detail/ProjectOverviewTab";
import ProjectSummaryMetrics from "../../components/projects/detail/ProjectSummaryMetrics";
import ProjectWorkTab from "../../components/projects/detail/ProjectWorkTab";
import ProjectReviewsTab from "../../components/projects/detail/reviews/ProjectReviewsTab";
import ProjectOutputsTab from "../../components/projects/detail/outputs/ProjectOutputsTab";
import ProjectMembersTab from "../../components/projects/detail/members/ProjectMembersTab";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { getUserProfiles, type UserProfile } from "../../services/authService";
import { getProjectById, updateProject } from "../../services/projectService";
import { createTask, getTasks, updateTask } from "../../services/taskService";
import { createWorkstream, getWorkstreams, updateWorkstream } from "../../services/workstreamService";
import { getInterns } from "../../services/internService";
import { createReviewGate, getReviewGates } from "../../services/reviewGateService";
import { getDocuments, saveDocument } from "../../services/documentService";
import { getProjectMembers, saveProjectMember } from "../../services/programService";
import type { CreateProjectInput, CreateTaskInput, CreateWorkstreamInput, DocumentLink, DocumentLinkInput, Intern, MembershipStatus, Project, ProjectMember, ProjectMemberRole, ReviewGate, ReviewGateResult, Task, Workstream } from "../../types/domain";
import { groupTaskMetrics, type ProjectTaskMetrics } from "./projects/projectMetrics";

const emptyMetrics: ProjectTaskMetrics = { total: 0, done: 0, inReview: 0, overdue: 0, hold: 0 };
const validTabs = new Set<ProjectDetailTab>(detailTabs.map((tab) => tab.id));

export default function AdminProjectDetailPage() {
  const { projectId = "" } = useParams(); const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null); const [tasks, setTasks] = useState<Task[]>([]); const [profiles, setProfiles] = useState<UserProfile[]>([]); const [workstreams, setWorkstreams] = useState<Workstream[] | null>(null); const [interns, setInterns] = useState<Intern[] | null>(null); const [workLoading, setWorkLoading] = useState(false); const [workError, setWorkError] = useState(""); const [workstreamSaving, setWorkstreamSaving] = useState(false); const [taskSaving, setTaskSaving] = useState(false); const [reviews, setReviews] = useState<ReviewGate[] | null>(null); const [reviewsLoading, setReviewsLoading] = useState(false); const [reviewsError, setReviewsError] = useState(""); const [reviewSaving, setReviewSaving] = useState(false); const [documents, setDocuments] = useState<DocumentLink[] | null>(null); const [outputsLoading, setOutputsLoading] = useState(false); const [outputsError, setOutputsError] = useState(""); const [outputSaving, setOutputSaving] = useState(false); const [members, setMembers] = useState<ProjectMember[] | null>(null); const [membersLoading, setMembersLoading] = useState(false); const [membersError, setMembersError] = useState(""); const [memberSaving, setMemberSaving] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState("");
  const activeTab = validTabs.has(params.get("tab") as ProjectDetailTab) ? params.get("tab") as ProjectDetailTab : "overview";
  const load = useCallback(async () => { if (!projectId) { setError("Project not found."); setLoading(false); return; } try { setLoading(true); setError(""); setWorkstreams(null); setWorkError(""); setReviews(null); setReviewsError(""); setDocuments(null); setOutputsError(""); setMembers(null); setMembersError(""); const [projectItem, taskItems, profileItems] = await Promise.all([getProjectById(projectId), getTasks(projectId), getUserProfiles()]); setProject(projectItem); setTasks(taskItems); setProfiles(profileItems); } catch (caught) { setError(caught instanceof Error ? caught.message : "Project not found or unavailable."); } finally { setLoading(false); } }, [projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const loadWork = useCallback(async () => { if (!projectId || workstreams !== null) return; try { setWorkLoading(true); setWorkError(""); const [workstreamItems, internItems] = await Promise.all([getWorkstreams(projectId), interns ? Promise.resolve(interns) : getInterns()]); setWorkstreams(workstreamItems); if (!interns) setInterns(internItems); } catch (caught) { setWorkError(caught instanceof Error ? caught.message : "프로젝트 업무 구조를 불러오지 못했습니다."); } finally { setWorkLoading(false); } }, [interns, projectId, workstreams]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (activeTab === "work" && workstreams === null) void loadWork(); }, [activeTab, loadWork, workstreams]);
  const loadReviews = useCallback(async () => { if (!projectId || reviews !== null) return; try { setReviewsLoading(true); setReviewsError(""); setReviews(await getReviewGates("PROJECT", projectId)); } catch (caught) { setReviewsError(caught instanceof Error ? caught.message : "프로젝트 검토 이력을 불러오지 못했습니다."); } finally { setReviewsLoading(false); } }, [projectId, reviews]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (activeTab === "reviews" && reviews === null) void loadReviews(); }, [activeTab, loadReviews, reviews]);
  const loadOutputs = useCallback(async () => { if (documents !== null) return; try { setOutputsLoading(true); setOutputsError(""); setDocuments(await getDocuments()); } catch (caught) { setOutputsError(caught instanceof Error ? caught.message : "프로젝트 결과물을 불러오지 못했습니다."); } finally { setOutputsLoading(false); } }, [documents]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (activeTab === "outputs" && documents === null) void loadOutputs(); }, [activeTab, documents, loadOutputs]);
  const loadMembers = useCallback(async () => { if (!projectId || members !== null) return; try { setMembersLoading(true); setMembersError(""); const [memberItems, internItems] = await Promise.all([getProjectMembers(projectId), interns ? Promise.resolve(interns) : getInterns()]); setMembers(memberItems); if (!interns) setInterns(internItems); } catch (caught) { setMembersError(caught instanceof Error ? caught.message : "프로젝트 멤버를 불러오지 못했습니다."); } finally { setMembersLoading(false); } }, [interns, members, projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (activeTab === "members" && members === null) void loadMembers(); }, [activeTab, loadMembers, members]);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const managerName = project?.operatorId ? profileMap.get(project.operatorId)?.display_name ?? "Manager unavailable" : "Unassigned";
  const metrics = useMemo(() => project ? groupTaskMetrics(tasks).get(project.id) ?? emptyMetrics : emptyMetrics, [project, tasks]);
  const saveProject = async (input: CreateProjectInput, id?: string) => { if (!id) return; try { setSaving(true); setFormError(""); setProject(await updateProject({ ...input, projectId: id })); setEditing(false); } catch (caught) { setFormError(caught instanceof Error ? caught.message : "Project could not be updated."); } finally { setSaving(false); } };
  const saveWorkstream = async (input: CreateWorkstreamInput, workstreamId?: string) => { if (!projectId) return; try { setWorkstreamSaving(true); if (workstreamId) await updateWorkstream({ ...input, workstreamId }); else await createWorkstream(input); setWorkstreams(await getWorkstreams(projectId)); } finally { setWorkstreamSaving(false); } };
  const saveTask = async (input: CreateTaskInput, taskId?: string) => { if (!projectId) return; try { setTaskSaving(true); if (taskId) await updateTask({ ...input, taskId }); else await createTask(input); setTasks(await getTasks(projectId)); } finally { setTaskSaving(false); } };
  const saveReview = async (result: ReviewGateResult, summary: string, nextAction: string, sourceUrl: string, dropReason: string) => { if (!projectId) return; try { setReviewSaving(true); await createReviewGate("PROJECT", projectId, result, summary, nextAction, sourceUrl, dropReason); setReviews(await getReviewGates("PROJECT", projectId)); } finally { setReviewSaving(false); } };
  const saveOutput = async (input: DocumentLinkInput, id?: string, previousUrl?: string) => { try { setOutputSaving(true); await saveDocument(input, id, previousUrl); setDocuments(await getDocuments()); } finally { setOutputSaving(false); } };
  const saveMember = async (internId: string, role: ProjectMemberRole, status: MembershipStatus, id?: string) => { if (!projectId) return; try { setMemberSaving(true); await saveProjectMember(projectId, internId, role, status, id); setMembers(await getProjectMembers(projectId)); } finally { setMemberSaving(false); } };
  if (loading) return <V2Card><V2EmptyState title="Loading project" description="프로젝트 Control Room을 불러오고 있습니다." /></V2Card>;
  if (error || !project) return <V2Card><V2EmptyState title="Project not found" description={error || "요청한 프로젝트를 찾을 수 없습니다."} action={<V2Button type="button" onClick={() => void load()}>Try again</V2Button>} /></V2Card>;
  return <><ProjectDetailHeader project={project} managerName={managerName} onEdit={() => { setFormError(""); setEditing(true); }} onBack={() => navigate("/admin/projects")} /><ProjectSummaryMetrics project={project} metrics={metrics} /><ProjectDetailTabs activeTab={activeTab} onChange={(tab) => setParams({ tab })} />{activeTab === "overview" ? <ProjectOverviewTab project={project} managerName={managerName} metrics={metrics} /> : activeTab === "work" ? <ProjectWorkTab projectId={project.id} workstreams={workstreams ?? []} tasks={tasks} interns={interns ?? []} loading={workLoading || workstreams === null} error={workError} workstreamSaving={workstreamSaving} taskSaving={taskSaving} onRetry={() => void loadWork()} onSaveWorkstream={saveWorkstream} onSaveTask={saveTask} onOpenTask={(taskId) => navigate(`/admin/tasks/${taskId}`)} /> : activeTab === "reviews" ? <ProjectReviewsTab reviews={reviews ?? []} loading={reviewsLoading || reviews === null} error={reviewsError} saving={reviewSaving} onRetry={() => void loadReviews()} onSave={saveReview} /> : activeTab === "outputs" ? <ProjectOutputsTab projectId={project.id} documents={(documents ?? []).filter((item) => item.projectId === project.id)} tasks={tasks} loading={outputsLoading || documents === null} error={outputsError} saving={outputSaving} onRetry={() => void loadOutputs()} onSave={saveOutput} /> : activeTab === "members" ? <ProjectMembersTab members={members ?? []} interns={interns ?? []} tasks={tasks} loading={membersLoading || members === null} error={membersError} saving={memberSaving} onRetry={() => void loadMembers()} onSave={saveMember} /> : <V2Card><V2EmptyState title={`${detailTabs.find((tab) => tab.id === activeTab)?.label} is coming next`} description="이 영역의 실제 데이터와 업무 기능은 다음 단계에서 연결합니다." /></V2Card>}{editing && <ProjectFormModal project={project} profiles={profiles} saving={saving} error={formError} onClose={() => setEditing(false)} onSave={saveProject} />}</>;
}
