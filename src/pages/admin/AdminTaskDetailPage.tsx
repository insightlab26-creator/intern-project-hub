import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TaskFormModal from "../../components/projects/detail/work/TaskFormModal";
import TaskUpdateReviewActions from "../../components/tasks/TaskUpdateReviewActions";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { getInterns } from "../../services/internService";
import { getProjectById } from "../../services/projectService";
import { getTaskById, getTasks, updateTask } from "../../services/taskService";
import { createTaskUpdate, getTaskUpdates, reviewTaskUpdate } from "../../services/taskUpdateService";
import { getWorkstreams } from "../../services/workstreamService";
import type { CreateTaskInput, Intern, Project, Task, TaskUpdate, Workstream } from "../../types/domain";
import { localDateInputValue } from "../../utils/localDate";
import { adminPriorityLabel, adminReviewStatusLabel, adminTaskStatusLabel, formatAppDate, useLocale } from "../../i18n/internLocale";

type ContextData = { task: Task; project: Project; workstreams: Workstream[]; interns: Intern[]; parentTask: Task | null };
const statusVariant = { TODO: "neutral", IN_PROGRESS: "info", REVIEW: "warning", DONE: "success", HOLD: "warning" } as const;
const priorityVariant = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger" } as const;
const updateVariant = { PENDING: "warning", APPROVED: "success", CHANGES_REQUESTED: "danger" } as const;
const formatDate = (value: string | null, locale: "ko" | "en" = "en") => formatAppDate(value, locale);
const errorMessage = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;

export default function AdminTaskDetailPage() {
  const { locale, t } = useLocale();
  const { taskId = "" } = useParams(); const navigate = useNavigate();
  const [context, setContext] = useState<ContextData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [updates, setUpdates] = useState<TaskUpdate[] | null>(null); const [updatesLoading, setUpdatesLoading] = useState(true); const [updatesError, setUpdatesError] = useState(""); const [updateSaving, setUpdateSaving] = useState(false);
  const [form, setForm] = useState({ occurredOn: localDateInputValue(), progress: "", learning: "", blockers: "", nextPlan: "" }); const [formError, setFormError] = useState("");
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [editing, setEditing] = useState(false); const [editTasks, setEditTasks] = useState<Task[]>([]); const [editLoading, setEditLoading] = useState(false); const [editSaving, setEditSaving] = useState(false); const [editError, setEditError] = useState("");

  const loadContext = useCallback(async () => {
    if (!taskId) { setError("Task not found."); setLoading(false); return; }
    try {
      setLoading(true); setError("");
      const task = await getTaskById(taskId);
      const [project, workstreams, interns, parentTask] = await Promise.all([
        getProjectById(task.projectId), getWorkstreams(task.projectId), getInterns(), task.parentTaskId ? getTaskById(task.parentTaskId) : Promise.resolve(null),
      ]);
      setContext({ task, project, workstreams, interns, parentTask });
    } catch (caught) { setError(errorMessage(caught, "Task not found or unavailable.")); }
    finally { setLoading(false); }
  }, [taskId]);

  const loadUpdates = useCallback(async () => {
    if (!taskId) { setUpdatesLoading(false); return; }
    try { setUpdatesLoading(true); setUpdatesError(""); setUpdates(await getTaskUpdates(taskId)); }
    catch (caught) { setUpdatesError(errorMessage(caught, "Progress updates could not be loaded.")); }
    finally { setUpdatesLoading(false); }
  }, [taskId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadContext(); }, [loadContext]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadUpdates(); }, [loadUpdates]);

  const submitUpdate = async (event: FormEvent) => {
    event.preventDefault(); setFormError("");
    if (![form.progress, form.learning, form.blockers, form.nextPlan].some((value) => value.trim())) { setFormError("Enter progress, learning, blockers, or a next plan."); return; }
    try {
      setUpdateSaving(true);
      await createTaskUpdate({ taskId, ...form });
      setForm({ occurredOn: localDateInputValue(), progress: "", learning: "", blockers: "", nextPlan: "" });
      setShowUpdateForm(false);
      await loadUpdates();
    } catch (caught) { setFormError(errorMessage(caught, "Progress update could not be saved.")); }
    finally { setUpdateSaving(false); }
  };

  const saveReview = async (id: string, reviewStatus: "APPROVED" | "CHANGES_REQUESTED", managerFeedback: string) => {
    try { setUpdateSaving(true); await reviewTaskUpdate({ id, reviewStatus, managerFeedback }); await loadUpdates(); }
    finally { setUpdateSaving(false); }
  };

  const openEdit = async () => {
    if (!context) return;
    try { setEditLoading(true); setEditError(""); setEditTasks(await getTasks(context.task.projectId)); setEditing(true); }
    catch (caught) { setEditError(errorMessage(caught, "Task edit context could not be loaded.")); }
    finally { setEditLoading(false); }
  };

  const saveTask = async (input: CreateTaskInput, id?: string) => {
    if (!id) return;
    try { setEditSaving(true); setEditError(""); await updateTask({ ...input, taskId: id }); setEditing(false); await loadContext(); }
    catch (caught) { const message = errorMessage(caught, "Task could not be updated."); setEditError(message); throw caught; }
    finally { setEditSaving(false); }
  };

  const workstream = useMemo(() => context?.workstreams.find((item) => item.id === context.task.workstreamId) ?? null, [context]);
  const assignees = useMemo(() => context ? context.task.assigneeInternIds.map((id) => context.interns.find((intern) => intern.id === id)?.name).filter((name): name is string => Boolean(name)) : [], [context]);

  if (loading) return <V2Card><V2EmptyState title={locale === "ko" ? "업무를 불러오는 중" : "Loading task"} description={locale === "ko" ? "업무 정보를 불러오고 있습니다." : "Loading task context."} /></V2Card>;
  if (error || !context) return <V2Card><V2EmptyState title="Task not found" description={error || "요청한 Task를 찾을 수 없습니다."} action={<V2Button type="button" onClick={() => void loadContext()}>Try again</V2Button>} /></V2Card>;
  const { task, project, parentTask } = context;

  return <section className="v2-task-detail">
    <nav className="v2-detail-breadcrumb" aria-label="Breadcrumb"><Link to="/admin/projects">Projects</Link><span>›</span><Link to={`/admin/projects/${project.id}?tab=work`}>{project.name}</Link><span>›</span><span aria-current="page">{task.title}</span></nav>
    <V2PageHeader eyebrow={locale === "ko" ? "업무 상세" : "TASK DETAIL"} title={task.title} description={`${project.name} · ${workstream?.name ?? (locale === "ko" ? "업무 영역 없음" : "Workstream unavailable")}`} actions={<V2Button type="button" variant="secondary" isLoading={editLoading} onClick={() => void openEdit()}>{locale === "ko" ? "업무 수정" : "Edit Task"}</V2Button>} />
    <div className="v2-task-detail__badges"><V2Badge variant={statusVariant[task.status]}>{adminTaskStatusLabel(task.status, locale)}</V2Badge><V2Badge variant={priorityVariant[task.priority]}>{adminPriorityLabel(task.priority, locale)}</V2Badge></div>
    <div className="v2-task-detail__layout">
      <div className="v2-task-detail__main">
        <V2Card className="v2-task-detail__section"><h2>Task Context</h2>{task.description && <div className="v2-task-detail__description"><small>DESCRIPTION</small><p>{task.description}</p></div>}{parentTask && <div className="v2-task-detail__parent"><small>PARENT TASK</small><strong>{parentTask.title}</strong></div>}</V2Card>
        <V2Card className="v2-task-detail__section"><header className="v2-task-detail__section-header"><h2>Progress Updates</h2><V2Button type="button" variant="secondary" onClick={() => setShowUpdateForm((open) => !open)} aria-expanded={showUpdateForm}>{showUpdateForm ? "Cancel" : "+ Add Update"}</V2Button></header>{showUpdateForm && <form className="v2-task-update-form" onSubmit={(event) => void submitUpdate(event)}><label className="v2-field"><span>Occurred on</span><input required type="date" value={form.occurredOn} onChange={(event) => setForm({ ...form, occurredOn: event.target.value })} /></label><label className="v2-field"><span>Progress</span><textarea className="v2-textarea" value={form.progress} onChange={(event) => setForm({ ...form, progress: event.target.value })} /></label><label className="v2-field"><span>Learning</span><textarea className="v2-textarea" value={form.learning} onChange={(event) => setForm({ ...form, learning: event.target.value })} /></label><label className="v2-field"><span>Blockers</span><textarea className="v2-textarea" value={form.blockers} onChange={(event) => setForm({ ...form, blockers: event.target.value })} /></label><label className="v2-field"><span>Next plan</span><textarea className="v2-textarea" value={form.nextPlan} onChange={(event) => setForm({ ...form, nextPlan: event.target.value })} /></label>{formError && <p className="v2-form-error">{formError}</p>}<div><V2Button type="submit" isLoading={updateSaving}>Add progress update</V2Button></div></form>}{updatesLoading && !updates ? <V2EmptyState title="Loading updates" description="진행 기록을 불러오고 있습니다." /> : updatesError ? <V2EmptyState title="Unable to load updates" description={updatesError} action={<V2Button type="button" variant="secondary" onClick={() => void loadUpdates()}>Retry</V2Button>} /> : !updates?.length ? <div className="v2-task-update-empty"><div><strong>No progress updates yet</strong><p>첫 번째 주요 진행 업데이트를 기록하세요.</p></div>{!showUpdateForm && <V2Button type="button" onClick={() => setShowUpdateForm(true)}>+ Add Update</V2Button>}</div> : <div className="v2-task-update-timeline">{updates.map((update) => <TaskUpdateRecord key={`${update.id}-${update.reviewStatus}-${update.managerFeedback}`} update={update} saving={updateSaving} onReview={saveReview} />)}</div>}</V2Card>
      </div>
      <aside className="v2-task-detail__facts"><V2Card><h2>{locale === "ko" ? "업무 정보" : "Task Facts"}</h2><dl><Fact label={t("common.project")} value={project.name} /><Fact label={t("common.workstream")} value={workstream?.name ?? "—"} /><Fact label={t("common.assignee")} value={assignees.length ? assignees.join(", ") : (locale === "ko" ? "미지정" : "Unassigned")} /><Fact label={t("common.status")} value={adminTaskStatusLabel(task.status, locale)} /><Fact label={t("common.priority")} value={adminPriorityLabel(task.priority, locale)} /><Fact label={locale === "ko" ? "시작일" : "Start"} value={formatDate(task.startDate, locale)} /><Fact label={t("common.due")} value={formatDate(task.dueDate, locale)} /></dl><Link to={`/admin/projects/${project.id}?tab=work`} className="v2-task-detail__project-link">{locale === "ko" ? "프로젝트 업무 보기" : "Open Project Work"} →</Link></V2Card></aside>
    </div>
    {editing && <TaskFormModal projectId={task.projectId} workstreams={context.workstreams} tasks={editTasks} interns={context.interns} task={task} saving={editSaving} error={editError} onClose={() => setEditing(false)} onAddWorkstream={() => navigate(`/admin/projects/${task.projectId}?tab=work`)} onSave={saveTask} />}
  </section>;
}

function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }

function TaskUpdateRecord({ update, saving, onReview }: { update: TaskUpdate; saving: boolean; onReview: (id: string, status: "APPROVED" | "CHANGES_REQUESTED", feedback: string) => Promise<void> }) {
  const { locale } = useLocale();
  return <article className="v2-task-update-record"><header><div><strong>{formatDate(update.occurredOn, locale)}</strong><small>{update.authorName ?? (locale === "ko" ? "작성자 없음" : "Unknown author")}</small></div><V2Badge variant={updateVariant[update.reviewStatus]}>{adminReviewStatusLabel(update.reviewStatus, locale)}</V2Badge></header>{update.progress && <UpdateField label={locale === "ko" ? "진행 내용" : "Progress"} value={update.progress} />}{update.learning && <UpdateField label={locale === "ko" ? "배운 점" : "Learning"} value={update.learning} />}{update.blockers && <UpdateField label={locale === "ko" ? "장애 요소" : "Blockers"} value={update.blockers} />}{update.nextPlan && <UpdateField label={locale === "ko" ? "다음 계획" : "Next plan"} value={update.nextPlan} />}{update.managerFeedback && update.reviewStatus !== "PENDING" && <UpdateField label={locale === "ko" ? "관리자 피드백" : "Manager feedback"} value={update.managerFeedback} />}<TaskUpdateReviewActions update={update} saving={saving} onReview={onReview} /></article>;
}

function UpdateField({ label, value }: { label: string; value: string }) { return <div className="v2-task-update-record__field"><small>{label}</small><p>{value}</p></div>; }
