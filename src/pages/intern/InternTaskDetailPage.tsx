import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { isOverdueTask } from "../../components/interns/internMetrics";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_UPDATE_REVIEW_STATUS_LABELS } from "../../constants/domainLabels";
import { getCurrentIntern } from "../../services/internService";
import { getProjectById } from "../../services/projectService";
import { getTaskById } from "../../services/taskService";
import { getTaskUpdates } from "../../services/taskUpdateService";
import { getWorkstreams } from "../../services/workstreamService";
import type { Project, Task, TaskPriority, TaskStatus, TaskUpdate, TaskUpdateReviewStatus, Workstream } from "../../types/domain";

type DetailContext = { task: Task; project: Project; workstream: Workstream | null };
type PageState = "loading" | "ready" | "profileMissing" | "unavailable" | "error";

const statusVariant: Record<TaskStatus, "neutral" | "success" | "warning" | "info"> = {
  TODO: "neutral", IN_PROGRESS: "info", REVIEW: "warning", DONE: "success", HOLD: "neutral",
};
const priorityVariant: Record<TaskPriority, "neutral" | "warning" | "danger"> = {
  LOW: "neutral", MEDIUM: "warning", HIGH: "danger",
};
const reviewVariant: Record<TaskUpdateReviewStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning", APPROVED: "success", CHANGES_REQUESTED: "danger",
};

function todayStart() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";
}

function overdueDays(value: string, today: Date) {
  return Math.floor((today.getTime() - new Date(`${value}T00:00:00`).getTime()) / 86_400_000);
}

export default function InternTaskDetailPage() {
  const { taskId = "" } = useParams();
  const [state, setState] = useState<PageState>("loading");
  const [context, setContext] = useState<DetailContext | null>(null);
  const [updates, setUpdates] = useState<TaskUpdate[] | null>(null);
  const [updatesError, setUpdatesError] = useState("");
  const [error, setError] = useState("");
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
    const initialLoad = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const overdue = Boolean(context && isOverdueTask(context.task, today));
  const updateItems = useMemo(() => updates ?? [], [updates]);

  if (state === "loading") return <V2Card><V2EmptyState title="Loading Task" description="업무 정보를 불러오고 있습니다." /></V2Card>;
  if (state === "profileMissing") return <V2Card><V2EmptyState title="Intern profile not linked" description="현재 로그인 계정에 연결된 인턴 프로필이 없습니다. ADMIN에게 연결을 요청해주세요." /></V2Card>;
  if (state === "unavailable") return <V2Card><V2EmptyState title="Task not available" description="이 업무를 찾을 수 없거나 접근 권한이 없습니다." action={<Link className="v2-button v2-button--secondary" to="/intern/tasks">Back to My Tasks</Link>} /></V2Card>;
  if (state === "error" || !context) return <V2Card><V2EmptyState title="Unable to load Task" description={error || "Task 정보를 불러오지 못했습니다."} action={<V2Button type="button" variant="secondary" onClick={() => void load()}>Try again</V2Button>} /></V2Card>;

  const { task, project, workstream } = context;
  return <section className="v2-intern-task-detail">
    <Link className="v2-intern-task-detail__back" to="/intern/tasks">← Back to My Tasks</Link>
    <V2PageHeader eyebrow="TASK DETAIL" title={task.title} description={`${project.name}${workstream ? ` · ${workstream.name}` : ""}`} />
    <div className="v2-intern-task-detail__metadata">
      <DetailFact label="PROJECT" value={project.name} />
      <DetailFact label="WORKSTREAM" value={workstream?.name ?? "—"} />
      <DetailFact label="STATUS" value={<V2Badge variant={statusVariant[task.status]}>{TASK_STATUS_LABELS[task.status]}</V2Badge>} />
      <DetailFact label="PRIORITY" value={<V2Badge variant={priorityVariant[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</V2Badge>} />
      <DetailFact label="DUE" value={<span className={overdue ? "v2-intern-task-detail__overdue" : undefined}>{formatDate(task.dueDate)}{overdue && task.dueDate && <small>{overdueDays(task.dueDate, today)}d overdue</small>}</span>} />
    </div>
    <div className="v2-intern-task-detail__content">
      <V2Card className="v2-intern-task-detail__description"><h2>What I need to do</h2>{task.description ? <p>{task.description}</p> : <p className="v2-muted">No description provided.</p>}</V2Card>
      <V2Card className="v2-intern-task-detail__updates"><header><div><h2>Progress Updates</h2><p>내가 작성한 진행기록과 관리자 피드백을 확인합니다.</p></div></header>{updatesError ? <V2EmptyState title="Unable to load progress updates" description={updatesError} /> : !updates ? <V2EmptyState title="Loading updates" description="진행기록을 불러오고 있습니다." /> : updateItems.length === 0 ? <V2EmptyState title="No progress updates yet" description="아직 작성된 진행기록이 없습니다." /> : <div className="v2-intern-task-detail__timeline">{updateItems.map((update) => <ProgressUpdateItem key={update.id} update={update} />)}</div>}</V2Card>
    </div>
  </section>;
}

function DetailFact({ label, value }: { label: string; value: ReactNode }) {
  return <V2Card className="v2-intern-task-detail__fact"><small>{label}</small><div>{value}</div></V2Card>;
}

function ProgressUpdateItem({ update }: { update: TaskUpdate }) {
  return <article className={`v2-intern-task-detail__update${update.reviewStatus === "CHANGES_REQUESTED" ? " v2-intern-task-detail__update--changes" : ""}`}>
    <header><div><small>{formatDate(update.occurredOn)}</small>{update.authorName && <span>{update.authorName}</span>}</div><V2Badge variant={reviewVariant[update.reviewStatus]}>{TASK_UPDATE_REVIEW_STATUS_LABELS[update.reviewStatus]}</V2Badge></header>
    <UpdateFields update={update} />
    {update.managerFeedback && <section className="v2-intern-task-detail__feedback"><small>MANAGER FEEDBACK</small><p>{update.managerFeedback}</p></section>}
  </article>;
}

function UpdateFields({ update }: { update: TaskUpdate }) {
  const fields = [["Progress", update.progress], ["Learning", update.learning], ["Blockers", update.blockers], ["Next plan", update.nextPlan]].filter(([, value]) => Boolean(value));
  return fields.length ? <div className="v2-intern-task-detail__update-fields">{fields.map(([label, value]) => <div key={label}><small>{label}</small><p>{value}</p></div>)}</div> : <p className="v2-muted">—</p>;
}
