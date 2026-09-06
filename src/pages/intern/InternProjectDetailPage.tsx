import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { isOverdueTask } from "../../components/interns/internMetrics";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { PROJECT_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_UPDATE_REVIEW_STATUS_LABELS } from "../../constants/domainLabels";
import { getCurrentIntern } from "../../services/internService";
import { getProjectById } from "../../services/projectService";
import { getMyAssignedTasks } from "../../services/taskService";
import { getMyTaskUpdates } from "../../services/taskUpdateService";
import { getWorkstreamsForProjects } from "../../services/workstreamService";
import type { Project, ProjectStatus, Task, TaskPriority, TaskStatus, TaskUpdate, TaskUpdateReviewStatus, Workstream } from "../../types/domain";

type PageState = "loading" | "ready" | "profileMissing" | "unavailable" | "error";
type Workspace = { project: Project; tasks: Task[]; workstreams: Workstream[]; updates: TaskUpdate[] };
type WorkGroup = { id: string; name: string; order: number; tasks: Task[] };
const projectVariant: Record<ProjectStatus, "neutral" | "success" | "warning" | "danger" | "info"> = { PLANNING: "neutral", ACTIVE: "success", REVIEW: "info", REVISION: "warning", ON_HOLD: "warning", COMPLETED: "success", DROPPED: "danger", ARCHIVED: "neutral" };
const taskVariant: Record<TaskStatus, "neutral" | "success" | "warning" | "info"> = { TODO: "neutral", IN_PROGRESS: "info", REVIEW: "warning", DONE: "success", HOLD: "neutral" };
const priorityVariant: Record<TaskPriority, "neutral" | "warning" | "danger"> = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger" };
const reviewVariant: Record<TaskUpdateReviewStatus, "warning" | "success" | "danger"> = { PENDING: "warning", APPROVED: "success", CHANGES_REQUESTED: "danger" };

function startOfToday() { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function dueTime(value: string | null) { return value ? new Date(`${value}T00:00:00`).getTime() : Number.POSITIVE_INFINITY; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—"; }
function preview(value: string, limit = 140) { return value.length > limit ? `${value.slice(0, limit - 1)}…` : value; }

function sortTasks(tasks: Task[], today: Date) {
  const statusRank: Record<TaskStatus, number> = { IN_PROGRESS: 0, TODO: 1, REVIEW: 2, HOLD: 3, DONE: 4 };
  return [...tasks].sort((left, right) => Number(isOverdueTask(right, today)) - Number(isOverdueTask(left, today)) || dueTime(left.dueDate) - dueTime(right.dueDate) || statusRank[left.status] - statusRank[right.status] || left.title.localeCompare(right.title));
}

function groupTasks(tasks: Task[], workstreams: Workstream[], today: Date): WorkGroup[] {
  const byId = new Map(workstreams.map((item) => [item.id, item])); const groups = new Map<string, WorkGroup>();
  tasks.forEach((task) => { const workstream = byId.get(task.workstreamId); const id = workstream?.id ?? "general"; const group = groups.get(id) ?? { id, name: workstream?.name ?? "GENERAL", order: workstream?.order ?? Number.POSITIVE_INFINITY, tasks: [] }; group.tasks.push(task); groups.set(id, group); });
  return [...groups.values()].map((group) => ({ ...group, tasks: sortTasks(group.tasks, today) })).sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
}

export default function InternProjectDetailPage() {
  const { projectId = "" } = useParams(); const [state, setState] = useState<PageState>("loading"); const [workspace, setWorkspace] = useState<Workspace | null>(null); const today = startOfToday();
  const load = useCallback(async () => {
    setState("loading"); setWorkspace(null);
    try {
      if (!await getCurrentIntern()) { setState("profileMissing"); return; }
      let project: Project; try { project = await getProjectById(projectId); } catch { setState("unavailable"); return; }
      const [assignedTasks, updates] = await Promise.all([getMyAssignedTasks(), getMyTaskUpdates()]);
      const tasks = assignedTasks.filter((task) => task.projectId === project.id); const workstreams = tasks.length ? await getWorkstreamsForProjects([project.id]) : []; const taskIds = new Set(tasks.map((task) => task.id));
      setWorkspace({ project, tasks, workstreams, updates: updates.filter((update) => taskIds.has(update.taskId)) }); setState("ready");
    } catch { setState("error"); }
  }, [projectId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const groups = useMemo(() => groupTasks(workspace?.tasks ?? [], workspace?.workstreams ?? [], today), [workspace?.tasks, workspace?.workstreams, today]);
  const summary = useMemo(() => { const tasks = workspace?.tasks ?? []; return { assigned: tasks.length, done: tasks.filter((task) => task.status === "DONE").length, inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length, overdue: tasks.filter((task) => isOverdueTask(task, today)).length, nextDue: tasks.filter((task) => task.status !== "DONE" && task.dueDate).sort((left, right) => dueTime(left.dueDate) - dueTime(right.dueDate))[0]?.dueDate ?? null }; }, [today, workspace?.tasks]);
  const recentUpdates = useMemo(() => [...(workspace?.updates ?? [])].sort((left, right) => dueTime(right.occurredOn) - dueTime(left.occurredOn) || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, 5), [workspace?.updates]);
  const feedbackIds = useMemo(() => new Set(recentUpdates.filter((item) => Boolean(item.managerFeedback.trim())).slice(0, 3).map((item) => item.id)), [recentUpdates]);
  if (state === "loading") return <V2Card><V2EmptyState title="Loading project workspace" description="프로젝트와 배정된 업무를 불러오고 있습니다." /></V2Card>;
  if (state === "profileMissing") return <V2Card><V2EmptyState title="Intern profile not linked" description="현재 로그인 계정에 연결된 인턴 프로필이 없습니다. ADMIN에게 연결을 요청해주세요." /></V2Card>;
  if (state === "unavailable") return <V2Card><V2EmptyState title="Project not available" description="This project could not be found or you do not have access." action={<Link className="v2-button v2-button--secondary" to="/intern/projects">Back to My Projects</Link>} /></V2Card>;
  if (state === "error" || !workspace) return <V2Card><V2EmptyState title="Unable to load project workspace" description="잠시 후 다시 시도해주세요." action={<V2Button type="button" variant="secondary" onClick={() => void load()}>Retry</V2Button>} /></V2Card>;
  return <section className="v2-intern-project-detail"><Link className="v2-intern-project-detail__back" to="/intern/projects">← Back to My Projects</Link><header className="v2-intern-project-detail__header"><V2PageHeader eyebrow="PROJECT WORKSPACE" title={workspace.project.name} description={workspace.project.description || "No project description provided."} /><V2Badge variant={projectVariant[workspace.project.status]}>{PROJECT_STATUS_LABELS[workspace.project.status]}</V2Badge></header><div className="v2-intern-project-detail__summary" aria-label="My work summary"><Metric label="MY TASKS" value={summary.assigned} /><Metric label="DONE" value={summary.done} /><Metric label="IN PROGRESS" value={summary.inProgress} /><Metric label="OVERDUE" value={summary.overdue} danger /><Metric label="NEXT DUE" value={summary.nextDue ? formatDate(summary.nextDue) : "—"} /></div><section className="v2-intern-project-detail__section"><header><p>MY WORK</p><h2>Your assigned tasks</h2></header>{groups.length === 0 ? <V2EmptyState title="No assigned tasks in this project." description="업무가 배정되면 여기에서 확인할 수 있습니다." /> : <div className="v2-intern-project-detail__groups">{groups.map((group) => <WorkstreamGroup key={group.id} group={group} today={today} />)}</div>}</section><section className="v2-intern-project-detail__section v2-intern-project-detail__progress"><header><p>MY RECENT PROGRESS</p><h2>Recent updates</h2></header>{recentUpdates.length === 0 ? <p className="v2-muted">No progress updates yet.</p> : <div>{recentUpdates.map((update) => <ProgressItem key={update.id} update={update} task={workspace.tasks.find((task) => task.id === update.taskId)} showFeedback={feedbackIds.has(update.id)} />)}</div>}</section></section>;
}

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) { return <V2Card className={`v2-intern-project-detail__metric${danger ? " v2-intern-project-detail__metric--danger" : ""}`}><small>{label}</small><strong>{value}</strong></V2Card>; }
function WorkstreamGroup({ group, today }: { group: WorkGroup; today: Date }) { const done = group.tasks.filter((task) => task.status === "DONE").length; return <V2Card className="v2-intern-project-detail__group"><header><div><h3>{group.name}</h3><span>{group.tasks.length} Tasks · {done} Done</span></div></header><div>{group.tasks.map((task) => <TaskRow key={task.id} task={task} today={today} />)}</div></V2Card>; }
function TaskRow({ task, today }: { task: Task; today: Date }) { const overdue = isOverdueTask(task, today); return <article className="v2-intern-project-detail__task"><div><Link to={`/intern/tasks/${task.id}`}>{task.title}</Link>{task.description && <p>{preview(task.description)}</p>}</div><V2Badge variant={taskVariant[task.status]}>{TASK_STATUS_LABELS[task.status]}</V2Badge><V2Badge variant={priorityVariant[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</V2Badge><span className={overdue ? "v2-intern-project-detail__overdue" : undefined}>{formatDate(task.dueDate)}{overdue && <small>Overdue</small>}</span></article>; }
function ProgressItem({ update, task, showFeedback }: { update: TaskUpdate; task: Task | undefined; showFeedback: boolean }) { return <article className={`v2-intern-project-detail__update${update.reviewStatus === "CHANGES_REQUESTED" ? " v2-intern-project-detail__update--changes" : ""}`}><header><div><small>{formatDate(update.occurredOn)} · {task?.title ?? "Task unavailable"}</small><V2Badge variant={reviewVariant[update.reviewStatus]}>{TASK_UPDATE_REVIEW_STATUS_LABELS[update.reviewStatus]}</V2Badge></div>{update.progress && <p>{preview(update.progress, 180)}</p>}</header>{showFeedback && <section><small>RECENT FEEDBACK</small><p>{update.managerFeedback}</p></section>}</article>; }
