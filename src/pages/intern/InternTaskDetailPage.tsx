import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { isOverdueTask } from "../../components/interns/internMetrics";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { formatInternDate, internPriorityLabel, internReviewStatusLabel, internTaskStatusLabel, useInternLocale } from "../../i18n/internLocale";
import { getCurrentIntern } from "../../services/internService";
import { getProjectById } from "../../services/projectService";
import { getTaskById } from "../../services/taskService";
import { createTaskUpdate, getTaskUpdates } from "../../services/taskUpdateService";
import { getWorkstreams } from "../../services/workstreamService";
import type { Project, Task, TaskPriority, TaskStatus, TaskUpdate, TaskUpdateReviewStatus, Workstream } from "../../types/domain";
import { localDateInputValue } from "../../utils/localDate";

type DetailContext = { task: Task; project: Project; workstream: Workstream | null };
type PageState = "loading" | "ready" | "profileMissing" | "unavailable" | "error";
type UpdateForm = { occurredOn: string; progress: string; learning: string; blockers: string; nextPlan: string };

const statusVariant: Record<TaskStatus, "neutral" | "success" | "warning" | "info"> = {
  TODO: "neutral", IN_PROGRESS: "info", REVIEW: "warning", DONE: "success", HOLD: "neutral",
};
const priorityVariant: Record<TaskPriority, "neutral" | "warning" | "danger"> = {
  LOW: "neutral", MEDIUM: "warning", HIGH: "danger",
};
const reviewVariant: Record<TaskUpdateReviewStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning", APPROVED: "success", CHANGES_REQUESTED: "danger",
};
const emptyUpdateForm = (): UpdateForm => ({ occurredOn: localDateInputValue(), progress: "", learning: "", blockers: "", nextPlan: "" });

function todayStart() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function overdueDays(value: string, today: Date) {
  return Math.floor((today.getTime() - new Date(`${value}T00:00:00`).getTime()) / 86_400_000);
}

export default function InternTaskDetailPage() {
  const { locale, t } = useInternLocale();
  const { taskId = "" } = useParams();
  const [state, setState] = useState<PageState>("loading");
  const [context, setContext] = useState<DetailContext | null>(null);
  const [updates, setUpdates] = useState<TaskUpdate[] | null>(null);
  const [updatesError, setUpdatesError] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UpdateForm>(emptyUpdateForm);
  const [formError, setFormError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const today = todayStart();

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    setUpdates(null);
    setUpdatesError("");

    try {
      const intern = await getCurrentIntern();
      if (!intern) {
        setState("profileMissing");
        return;
      }

      let task: Task;
      try {
        task = await getTaskById(taskId);
      } catch {
        setState("unavailable");
        return;
      }

      try {
        const [project, workstreams] = await Promise.all([
          getProjectById(task.projectId),
          getWorkstreams(task.projectId),
        ]);
        setContext({ task, project, workstream: workstreams.find((item) => item.id === task.workstreamId) ?? null });
        try {
          setUpdates(await getTaskUpdates(task.id));
        } catch (caught) {
          setUpdatesError(caught instanceof Error ? caught.message : "진행기록을 불러오지 못했습니다.");
          setUpdates([]);
        }
        setState("ready");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Task 정보를 불러오지 못했습니다.");
        setState("error");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "현재 인턴 정보를 확인하지 못했습니다.");
      setState("error");
    }
  }, [taskId]);

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, [load]);

  const overdue = Boolean(context && isOverdueTask(context.task, today));
  const updateItems = useMemo(() => updates ?? [], [updates]);
  const hasChangesRequested = updateItems.some((update) => update.reviewStatus === "CHANGES_REQUESTED");

  const openForm = () => {
    setForm(emptyUpdateForm());
    setFormError("");
    setSubmitSuccess("");
    setShowForm(true);
  };
  const cancelForm = () => {
    setForm(emptyUpdateForm());
    setFormError("");
    setShowForm(false);
  };
  const submitUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setFormError("");
    setSubmitSuccess("");
    if (![form.progress, form.learning, form.blockers, form.nextPlan].some((value) => value.trim())) {
      setFormError(t("task.validation"));
      return;
    }
    try {
      submittingRef.current = true;
      setSubmitting(true);
      await createTaskUpdate({ taskId: context?.task.id ?? taskId, ...form });
      const refreshed = await getTaskUpdates(context?.task.id ?? taskId);
      setUpdates(refreshed);
      setForm(emptyUpdateForm());
      setShowForm(false);
      setSubmitSuccess(t("task.submitSuccess"));
    } catch {
      setFormError(t("task.submitError"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (state === "loading") return <V2Card><V2EmptyState title={t("state.loadingTask")} description={t("tasks.description")} /></V2Card>;
  if (state === "profileMissing") return <V2Card><V2EmptyState title={t("state.internMissing")} description={t("state.internMissingDescription")} /></V2Card>;
  if (state === "unavailable") return <V2Card><V2EmptyState title={t("task.unavailable")} description={t("task.unavailable")} action={<Link className="v2-button v2-button--secondary" to="/intern/tasks">{t("task.back")}</Link>} /></V2Card>;
  if (state === "error" || !context) return <V2Card><V2EmptyState title={t("task.loadError")} description={error || t("task.loadError")} action={<V2Button type="button" variant="secondary" onClick={() => void load()}>{t("common.tryAgain")}</V2Button>} /></V2Card>;

  const { task, project, workstream } = context;
  return <section className="v2-intern-task-detail">
    <Link className="v2-intern-task-detail__back" to="/intern/tasks">← {t("task.back")}</Link>
    <V2PageHeader eyebrow={t("task.eyebrow")} title={task.title} description={`${project.name}${workstream ? ` · ${workstream.name}` : ""}`} />
    <div className="v2-intern-task-detail__metadata">
      <DetailFact label={t("common.project")} value={project.name} />
      <DetailFact label={t("tasks.workstream")} value={workstream?.name ?? "—"} />
      <DetailFact label={t("common.status")} value={<V2Badge variant={statusVariant[task.status]}>{internTaskStatusLabel(task.status, locale)}</V2Badge>} />
      <DetailFact label={t("common.priority")} value={<V2Badge variant={priorityVariant[task.priority]}>{internPriorityLabel(task.priority, locale)}</V2Badge>} />
      <DetailFact label={t("common.due")} value={<span className={overdue ? "v2-intern-task-detail__overdue" : undefined}>{formatInternDate(task.dueDate, locale, true)}{overdue && task.dueDate && <small>{t("common.overdueDays", { count: overdueDays(task.dueDate, today) })}</small>}</span>} />
    </div>
    <div className="v2-intern-task-detail__content">
      <V2Card className="v2-intern-task-detail__description"><h2>{t("task.whatToDo")}</h2>{task.description ? <p>{task.description}</p> : <p className="v2-muted">{t("common.noDescription")}</p>}</V2Card>
      <V2Card className="v2-intern-task-detail__updates"><header><div><h2>{t("task.updates")}</h2><p>{t("task.updatesDescription")}</p></div>{!showForm && <V2Button type="button" variant="secondary" onClick={openForm}>{t("task.addUpdate")}</V2Button>}</header>{showForm && <form className="v2-intern-task-detail__form" onSubmit={(event) => void submitUpdate(event)}><header><div><h3>{t("task.newUpdate")}</h3><p>{t("task.newUpdateDescription")}</p></div></header><label className="v2-field"><span>{t("common.date")}</span><input required type="date" value={form.occurredOn} onChange={(event) => setForm({ ...form, occurredOn: event.target.value })} /></label><UpdateTextarea label={t("task.progress")} helper={t("task.progressHelper")} value={form.progress} onChange={(progress) => setForm({ ...form, progress })} /><UpdateTextarea label={t("task.learning")} helper={t("task.learningHelper")} value={form.learning} onChange={(learning) => setForm({ ...form, learning })} /><UpdateTextarea label={t("task.blockers")} helper={t("task.blockersHelper")} value={form.blockers} onChange={(blockers) => setForm({ ...form, blockers })} /><UpdateTextarea label={t("task.nextPlan")} helper={t("task.nextPlanHelper")} value={form.nextPlan} onChange={(nextPlan) => setForm({ ...form, nextPlan })} />{formError && <p className="v2-form-error">{formError}</p>}<footer><V2Button type="button" variant="secondary" disabled={submitting} onClick={cancelForm}>{t("common.cancel")}</V2Button><V2Button type="submit" isLoading={submitting}>{t("common.submit")}</V2Button></footer></form>}{submitSuccess && <p className="v2-intern-task-detail__submit-success" role="status">{submitSuccess}</p>}{hasChangesRequested && !showForm && <p className="v2-intern-task-detail__revision-note">{t("task.revisionNote")}</p>}{updatesError ? <V2EmptyState title={t("task.loadUpdatesError")} description={updatesError} /> : !updates ? <V2EmptyState title={t("common.loading")} description={t("task.updates")} /> : updateItems.length === 0 ? <V2EmptyState title={t("task.noUpdates")} description={t("task.noUpdatesDescription")} /> : <div className="v2-intern-task-detail__timeline">{updateItems.map((update) => <ProgressUpdateItem key={update.id} update={update} />)}</div>}</V2Card>
    </div>
  </section>;
}

function DetailFact({ label, value }: { label: string; value: ReactNode }) {
  return <V2Card className="v2-intern-task-detail__fact"><small>{label}</small><div>{value}</div></V2Card>;
}

function ProgressUpdateItem({ update }: { update: TaskUpdate }) {
  const { locale, t } = useInternLocale();
  return <article className={`v2-intern-task-detail__update${update.reviewStatus === "CHANGES_REQUESTED" ? " v2-intern-task-detail__update--changes" : ""}`}>
    <header><div><small>{formatInternDate(update.occurredOn, locale, true)}</small>{update.authorName && <span>{update.authorName}</span>}</div><V2Badge variant={reviewVariant[update.reviewStatus]}>{internReviewStatusLabel(update.reviewStatus, locale)}</V2Badge></header>
    <UpdateFields update={update} />
    {update.managerFeedback && <section className="v2-intern-task-detail__feedback"><small>{t("task.managerFeedback")}</small><p>{update.managerFeedback}</p></section>}
  </article>;
}

function UpdateFields({ update }: { update: TaskUpdate }) {
  const { t } = useInternLocale();
  const fields = [[t("task.progress"), update.progress], [t("task.learning"), update.learning], [t("task.blockers"), update.blockers], [t("task.nextPlan"), update.nextPlan]].filter(([, value]) => Boolean(value));
  return fields.length ? <div className="v2-intern-task-detail__update-fields">{fields.map(([label, value]) => <div key={label}><small>{label}</small><p>{value}</p></div>)}</div> : <p className="v2-muted">—</p>;
}

function UpdateTextarea({ label, helper, value, onChange }: { label: string; helper: string; value: string; onChange: (value: string) => void }) {
  const inputId = `task-update-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return <div className="v2-field"><label htmlFor={inputId}>{label}</label><small>{helper}</small><textarea id={inputId} className="v2-textarea" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
