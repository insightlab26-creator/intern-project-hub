import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ProjectFormModal from "../../components/projects/ProjectFormModal";
import ProjectDetailHeader from "../../components/projects/detail/ProjectDetailHeader";
import ProjectDetailTabs from "../../components/projects/detail/ProjectDetailTabs";
import { detailTabs, type ProjectDetailTab } from "../../components/projects/detail/projectDetailTabs";
import ProjectOverviewTab from "../../components/projects/detail/ProjectOverviewTab";
import ProjectSummaryMetrics from "../../components/projects/detail/ProjectSummaryMetrics";
import ProjectWorkTab from "../../components/projects/detail/ProjectWorkTab";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { getUserProfiles, type UserProfile } from "../../services/authService";
import { getProjectById, updateProject } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import { getWorkstreams } from "../../services/workstreamService";
import { getInterns } from "../../services/internService";
import type { CreateProjectInput, Intern, Project, Task, Workstream } from "../../types/domain";
import { groupTaskMetrics, type ProjectTaskMetrics } from "./projects/projectMetrics";

const emptyMetrics: ProjectTaskMetrics = { total: 0, done: 0, inReview: 0, overdue: 0, hold: 0 };
const validTabs = new Set<ProjectDetailTab>(detailTabs.map((tab) => tab.id));

export default function AdminProjectDetailPage() {
  const { projectId = "" } = useParams(); const [params, setParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null); const [tasks, setTasks] = useState<Task[]>([]); const [profiles, setProfiles] = useState<UserProfile[]>([]); const [workstreams, setWorkstreams] = useState<Workstream[] | null>(null); const [interns, setInterns] = useState<Intern[] | null>(null); const [workLoading, setWorkLoading] = useState(false); const [workError, setWorkError] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState("");
  const activeTab = validTabs.has(params.get("tab") as ProjectDetailTab) ? params.get("tab") as ProjectDetailTab : "overview";
  const load = useCallback(async () => { if (!projectId) { setError("Project not found."); setLoading(false); return; } try { setLoading(true); setError(""); setWorkstreams(null); setWorkError(""); const [projectItem, taskItems, profileItems] = await Promise.all([getProjectById(projectId), getTasks(projectId), getUserProfiles()]); setProject(projectItem); setTasks(taskItems); setProfiles(profileItems); } catch (caught) { setError(caught instanceof Error ? caught.message : "Project not found or unavailable."); } finally { setLoading(false); } }, [projectId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const loadWork = useCallback(async () => { if (!projectId || workstreams !== null) return; try { setWorkLoading(true); setWorkError(""); const [workstreamItems, internItems] = await Promise.all([getWorkstreams(projectId), interns ? Promise.resolve(interns) : getInterns()]); setWorkstreams(workstreamItems); if (!interns) setInterns(internItems); } catch (caught) { setWorkError(caught instanceof Error ? caught.message : "프로젝트 업무 구조를 불러오지 못했습니다."); } finally { setWorkLoading(false); } }, [interns, projectId, workstreams]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (activeTab === "work" && workstreams === null) void loadWork(); }, [activeTab, loadWork, workstreams]);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const managerName = project?.operatorId ? profileMap.get(project.operatorId)?.display_name ?? "Manager unavailable" : "Unassigned";
  const metrics = useMemo(() => project ? groupTaskMetrics(tasks).get(project.id) ?? emptyMetrics : emptyMetrics, [project, tasks]);
  const saveProject = async (input: CreateProjectInput, id?: string) => { if (!id) return; try { setSaving(true); setFormError(""); setProject(await updateProject({ ...input, projectId: id })); setEditing(false); } catch (caught) { setFormError(caught instanceof Error ? caught.message : "Project could not be updated."); } finally { setSaving(false); } };
  if (loading) return <V2Card><V2EmptyState title="Loading project" description="프로젝트 Control Room을 불러오고 있습니다." /></V2Card>;
  if (error || !project) return <V2Card><V2EmptyState title="Project not found" description={error || "요청한 프로젝트를 찾을 수 없습니다."} action={<V2Button type="button" onClick={() => void load()}>Try again</V2Button>} /></V2Card>;
  return <><ProjectDetailHeader project={project} managerName={managerName} onEdit={() => { setFormError(""); setEditing(true); }} /><ProjectSummaryMetrics project={project} metrics={metrics} /><ProjectDetailTabs activeTab={activeTab} onChange={(tab) => setParams({ tab })} />{activeTab === "overview" ? <ProjectOverviewTab project={project} managerName={managerName} metrics={metrics} /> : activeTab === "work" ? <ProjectWorkTab workstreams={workstreams ?? []} tasks={tasks} interns={interns ?? []} loading={workLoading || workstreams === null} error={workError} onRetry={() => void loadWork()} /> : <V2Card><V2EmptyState title={`${detailTabs.find((tab) => tab.id === activeTab)?.label} is coming next`} description="이 영역의 실제 데이터와 업무 기능은 다음 단계에서 연결합니다." /></V2Card>}{editing && <ProjectFormModal project={project} profiles={profiles} saving={saving} error={formError} onClose={() => setEditing(false)} onSave={saveProject} />}</>;
}
