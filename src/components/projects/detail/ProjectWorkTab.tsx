import { Fragment, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, WORKSTREAM_STATUS_LABELS } from "../../../constants/domainLabels";
import { overdueDays } from "../../../pages/admin/projects/projectMetrics";
import type { Intern, Task, TaskPriority, TaskStatus, Workstream } from "../../../types/domain";
import { V2Badge } from "../../ui/V2Badge";
import { V2Card } from "../../ui/V2Card";
import { V2Button } from "../../ui/V2Button";
import { V2EmptyState } from "../../ui/V2EmptyState";
import { V2Input } from "../../ui/V2Input";
import { V2Select } from "../../ui/V2Select";

type Props = { workstreams: Workstream[]; tasks: Task[]; interns: Intern[]; loading: boolean; error: string; onRetry: () => void };
type TaskStatusVariant = "neutral" | "success" | "warning" | "danger" | "info";

const taskStatuses = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];
const taskStatusVariants: Record<TaskStatus, TaskStatusVariant> = { TODO: "neutral", IN_PROGRESS: "info", REVIEW: "warning", DONE: "success", HOLD: "warning" };
const priorityVariants: Record<TaskPriority, TaskStatusVariant> = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger" };
const workstreamVariants: Record<Workstream["status"], TaskStatusVariant> = { PLANNING: "neutral", ACTIVE: "success", ON_HOLD: "warning", COMPLETED: "success" };
const localToday = () => { const today = new Date(); return new Date(today.getFullYear(), today.getMonth(), today.getDate()); };
const taskOverdue = (task: Task, today = localToday()) => Boolean(task.dueDate && new Date(`${task.dueDate}T00:00:00`) < today && task.status !== "DONE");
const formatDate = (date: string | null) => date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T00:00:00`)) : "—";

export default function ProjectWorkTab({ workstreams, tasks, interns, loading, error, onRetry }: Props) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("");
  const internNames = useMemo(() => new Map(interns.map((intern) => [intern.id, intern.name])), [interns]);
  const today = useMemo(() => localToday(), []);
  const summary = useMemo(() => ({ total: tasks.length, done: tasks.filter((task) => task.status === "DONE").length, inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length, inReview: tasks.filter((task) => task.status === "REVIEW").length, overdue: tasks.filter((task) => taskOverdue(task, today)).length, hold: tasks.filter((task) => task.status === "HOLD").length }), [tasks, today]);
  const needle = query.trim().toLocaleLowerCase("ko-KR");
  const visibleTasks = useMemo(() => tasks.filter((task) => { const assignees = task.assigneeInternIds.map((id) => internNames.get(id) ?? "").join(" "); return (!needle || `${task.title} ${assignees}`.toLocaleLowerCase("ko-KR").includes(needle)) && (!status || task.status === status); }), [tasks, internNames, needle, status]);
  const visibleTaskIds = useMemo(() => new Set(visibleTasks.map((task) => task.id)), [visibleTasks]);
  const isFiltering = Boolean(needle || status);
  const tasksByWorkstream = useMemo(() => { const result = new Map<string, Task[]>(); tasks.forEach((task) => result.set(task.workstreamId, [...(result.get(task.workstreamId) ?? []), task])); return result; }, [tasks]);
  const knownWorkstreamIds = useMemo(() => new Set(workstreams.map((workstream) => workstream.id)), [workstreams]);
  const fallbackTasks = tasks.filter((task) => !knownWorkstreamIds.has(task.workstreamId));
  if (loading) return <V2Card><V2EmptyState title="Loading work" description="프로젝트 실행 구조를 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load work" description={error} action={<V2Button type="button" onClick={onRetry}>Try again</V2Button>} /></V2Card>;
  const orderedWorkstreams = [...workstreams].sort((left, right) => left.order - right.order);
  return <section className="v2-work-board"><WorkSummary summary={summary} /><div className="v2-work-toolbar"><V2Input aria-label="Search tasks" placeholder="Search task or assignee…" value={query} onChange={(event) => setQuery(event.target.value)} /><V2Select aria-label="Filter tasks by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All status</option>{taskStatuses.map((item) => <option key={item} value={item}>{TASK_STATUS_LABELS[item]}</option>)}</V2Select></div>{workstreams.length === 0 && <V2Card><V2EmptyState title="No workstreams yet" description="프로젝트 업무 영역이 아직 등록되지 않았습니다." /></V2Card>}{orderedWorkstreams.map((workstream) => { const streamTasks = tasksByWorkstream.get(workstream.id) ?? []; const displayTasks = streamTasks.filter((task) => visibleTaskIds.has(task.id)); if (isFiltering && displayTasks.length === 0) return null; return <WorkstreamSection key={workstream.id} workstream={workstream} allTasks={streamTasks} tasks={displayTasks} internNames={internNames} today={today} />; })}{fallbackTasks.length > 0 && (!isFiltering || fallbackTasks.some((task) => visibleTaskIds.has(task.id))) && <WorkstreamSection fallback allTasks={fallbackTasks} tasks={fallbackTasks.filter((task) => visibleTaskIds.has(task.id))} internNames={internNames} today={today} />}{workstreams.length > 0 && isFiltering && visibleTasks.length === 0 && <V2Card><V2EmptyState title="No matching tasks" description="다른 검색어 또는 상태 필터를 사용해보세요." /></V2Card>}</section>;
}

function WorkSummary({ summary }: { summary: { total: number; done: number; inProgress: number; inReview: number; overdue: number; hold: number } }) { const items = [["TOTAL", summary.total], ["DONE", summary.done], ["IN PROGRESS", summary.inProgress], ["IN REVIEW", summary.inReview], ["OVERDUE", summary.overdue], ["HOLD", summary.hold]]; return <div className="v2-work-summary" aria-label="Work summary">{items.map(([label, value]) => <span key={String(label)}><small>{label}</small><strong>{value}</strong></span>)}</div>; }

function WorkstreamSection({ workstream, allTasks, tasks, internNames, today, fallback = false }: { workstream?: Workstream; allTasks: Task[]; tasks: Task[]; internNames: Map<string, string>; today: Date; fallback?: boolean }) {
  const done = allTasks.filter((task) => task.status === "DONE").length; const overdue = allTasks.filter((task) => taskOverdue(task, today)).length;
  return <V2Card className="v2-workstream-section"><header className="v2-workstream-header"><div><div className="v2-workstream-header__title"><h2>{fallback ? "Unassigned Workstream" : workstream?.name}</h2>{workstream && <V2Badge variant={workstreamVariants[workstream.status]}>{WORKSTREAM_STATUS_LABELS[workstream.status]}</V2Badge>}</div><p>{fallback ? "이 Task는 현재 Project의 Workstream 목록과 연결되지 않았습니다." : workstream?.description || "—"}</p></div><div className="v2-workstream-stats"><span>{allTasks.length} Tasks</span><span>{done} Done</span>{overdue > 0 && <V2Badge variant="danger">{overdue} overdue</V2Badge>}</div></header>{tasks.length === 0 ? <V2EmptyState title="No tasks in this workstream" description="현재 필터 조건에 맞는 Task가 없습니다." /> : <TaskTree tasks={tasks} internNames={internNames} today={today} />}</V2Card>;
}

function TaskTree({ tasks, internNames, today }: { tasks: Task[]; internNames: Map<string, string>; today: Date }) {
  const byId = new Map(tasks.map((task) => [task.id, task])); const children = new Map<string, Task[]>(); tasks.forEach((task) => { if (task.parentTaskId && byId.has(task.parentTaskId)) children.set(task.parentTaskId, [...(children.get(task.parentTaskId) ?? []), task]); });
  const roots = tasks.filter((task) => !task.parentTaskId || !byId.has(task.parentTaskId)); const visited = new Set<string>();
  const renderTask = (task: Task, depth: number, ancestors: Set<string>): ReactNode => { if (ancestors.has(task.id) || visited.has(task.id)) return null; visited.add(task.id); const nextAncestors = new Set(ancestors); nextAncestors.add(task.id); return <Fragment key={task.id}><WorkTaskRow task={task} internNames={internNames} today={today} depth={depth} />{(children.get(task.id) ?? []).map((child) => renderTask(child, depth + 1, nextAncestors))}</Fragment>; };
  const nodes = roots.map((task) => renderTask(task, 0, new Set<string>())); tasks.filter((task) => !visited.has(task.id)).forEach((task) => nodes.push(renderTask(task, 0, new Set<string>()))); return <div className="v2-work-task-list">{nodes}</div>;
}

function WorkTaskRow({ task, internNames, today, depth }: { task: Task; internNames: Map<string, string>; today: Date; depth: number }) {
  const assignees = task.assigneeInternIds.map((id) => internNames.get(id) ?? "Unknown intern"); const overdue = taskOverdue(task, today);
  return <article className="v2-work-task-row" style={{ "--task-depth": depth } as CSSProperties}><div className="v2-work-task-title"><strong>{task.title}</strong>{task.startDate && <small>Start {formatDate(task.startDate)}</small>}</div><V2Badge variant={taskStatusVariants[task.status]}>{TASK_STATUS_LABELS[task.status]}</V2Badge><V2Badge variant={priorityVariants[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</V2Badge><span className={assignees.length ? "" : "v2-muted"}>{assignees.length ? assignees.join(", ") : "Unassigned"}</span><div className="v2-work-task-due"><span>{formatDate(task.dueDate)}</span>{overdue && task.dueDate && <small className="v2-danger-text">{overdueDays(task.dueDate, today)}d overdue</small>}</div></article>;
}
