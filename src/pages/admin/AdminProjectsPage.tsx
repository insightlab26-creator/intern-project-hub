import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectFilters from "../../components/projects/ProjectFilters";
import ProjectFormModal from "../../components/projects/ProjectFormModal";
import ProjectPortfolioSummary from "../../components/projects/ProjectPortfolioSummary";
import ProjectTable from "../../components/projects/ProjectTable";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { getUserProfiles, type UserProfile } from "../../services/authService";
import { createProject, getProjects, updateProject } from "../../services/projectService";
import { getAllTasks } from "../../services/taskService";
import type { CreateProjectInput, Project } from "../../types/domain";
import { getPortfolioSummary, groupTaskMetrics } from "./projects/projectMetrics";

export default function AdminProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]); const [profiles, setProfiles] = useState<UserProfile[]>([]); const [tasks, setTasks] = useState<Awaited<ReturnType<typeof getAllTasks>>>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState(""); const [editingProject, setEditingProject] = useState<Project | undefined>(); const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState(""); const [projectType, setProjectType] = useState(""); const [managerId, setManagerId] = useState("");
  const load = useCallback(async () => { try { setLoading(true); setError(""); const [projectItems, taskItems, profileItems] = await Promise.all([getProjects(), getAllTasks(), getUserProfiles()]); setProjects(projectItems); setTasks(taskItems); setProfiles(profileItems); } catch (caught) { setError(caught instanceof Error ? caught.message : "프로젝트를 불러오지 못했습니다."); } finally { setLoading(false); } }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const profilesById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const managers = useMemo(() => profiles.filter((profile) => profile.global_role === "ADMIN" || profile.global_role === "MANAGER").sort((left, right) => left.display_name.localeCompare(right.display_name, "ko-KR")), [profiles]);
  const metricsByProject = useMemo(() => groupTaskMetrics(tasks), [tasks]);
  const summary = useMemo(() => getPortfolioSummary(projects), [projects]);
  const filteredProjects = useMemo(() => { const needle = query.trim().toLocaleLowerCase("ko-KR"); return projects.filter((project) => { const searchable = `${project.name} ${project.code} ${project.purpose} ${project.description}`.toLocaleLowerCase("ko-KR"); return (!needle || searchable.includes(needle)) && (!status || project.status === status) && (!projectType || project.projectType === projectType) && (!managerId || (managerId === "UNASSIGNED" ? !project.operatorId : project.operatorId === managerId)); }); }, [projects, query, status, projectType, managerId]);
  const openCreate = () => { setFormError(""); setEditingProject(undefined); setIsFormOpen(true); };
  const openEdit = (project: Project) => { setFormError(""); setEditingProject(project); setIsFormOpen(true); };
  const saveProject = async (input: CreateProjectInput, projectId?: string) => { try { setSaving(true); setFormError(""); const saved = projectId ? await updateProject({ ...input, projectId }) : await createProject(input); setProjects((current) => projectId ? current.map((project) => project.id === saved.id ? saved : project) : [saved, ...current]); setIsFormOpen(false); } catch (caught) { setFormError(caught instanceof Error ? caught.message : "프로젝트를 저장하지 못했습니다."); } finally { setSaving(false); } };
  if (loading) return <V2Card><V2EmptyState title="Loading projects" description="프로젝트 포트폴리오를 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load projects" description={error} action={<V2Button type="button" onClick={() => void load()}>Try again</V2Button>} /></V2Card>;
  return <><V2PageHeader title="Projects" description="프로젝트 포트폴리오와 진행 현황을 관리합니다." actions={<V2Button type="button" onClick={openCreate}>+ New Project</V2Button>} /><ProjectPortfolioSummary summary={summary} /><ProjectFilters query={query} status={status} projectType={projectType} managerId={managerId} managers={managers} onQueryChange={setQuery} onStatusChange={setStatus} onProjectTypeChange={setProjectType} onManagerChange={setManagerId} />{projects.length === 0 ? <V2Card><V2EmptyState title="No projects yet" description="첫 Project를 만들면 포트폴리오 현황을 이곳에서 관리할 수 있습니다." action={<V2Button type="button" onClick={openCreate}>+ New Project</V2Button>} /></V2Card> : <ProjectTable projects={filteredProjects} profilesById={profilesById} metricsByProject={metricsByProject} onEdit={openEdit} onOpenProject={(projectId) => navigate(`/admin/projects/${projectId}`)} />}{isFormOpen && <ProjectFormModal project={editingProject} profiles={profiles} saving={saving} error={formError} onClose={() => setIsFormOpen(false)} onSave={saveProject} />}</>;
}
