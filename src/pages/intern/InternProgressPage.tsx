import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { TASK_UPDATE_REVIEW_STATUS_LABELS } from "../../constants/domainLabels";
import { getCurrentIntern } from "../../services/internService";
import { getProjects } from "../../services/projectService";
import { getMyAssignedTasks } from "../../services/taskService";
import { getMyTaskUpdates } from "../../services/taskUpdateService";
import { getWorkstreamsForProjects } from "../../services/workstreamService";
import type { Project, Task, TaskUpdate, TaskUpdateReviewStatus, Workstream } from "../../types/domain";

type PageState = "loading" | "ready" | "profileMissing" | "error";
type ProgressData = { tasks: Task[]; updates: TaskUpdate[]; projects: Project[]; workstreams: Workstream[] };
type HistoryItem = { update: TaskUpdate; task: Task; project: Project; workstream: Workstream | undefined };
const reviewVariant: Record<TaskUpdateReviewStatus, "warning" | "success" | "danger"> = { PENDING: "warning", APPROVED: "success", CHANGES_REQUESTED: "danger" };

function dateAtMidnight(value: string) { return new Date(`${value}T00:00:00`); }
function dateTime(value: string) { return new Date(value).getTime(); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(dateAtMidnight(value)); }
function monthLabel(value: string) { return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(dateAtMidnight(value)).toUpperCase(); }
function preview(value: string, limit = 180) { return value.length > limit ? `${value.slice(0, limit - 1)}…` : value; }
function updateOrder(left: TaskUpdate, right: TaskUpdate) { return dateAtMidnight(right.occurredOn).getTime() - dateAtMidnight(left.occurredOn).getTime() || dateTime(right.createdAt) - dateTime(left.createdAt); }

export default function InternProgressPage() {
  const [state, setState] = useState<PageState>("loading"); const [data, setData] = useState<ProgressData | null>(null); const [search, setSearch] = useState(""); const [review, setReview] = useState<"ALL" | TaskUpdateReviewStatus>("ALL"); const [projectId, setProjectId] = useState("ALL");
  const load = useCallback(async () => {
    setState("loading"); setData(null);
    try {
      if (!await getCurrentIntern()) { setState("profileMissing"); return; }
      const [tasks, updates, projects] = await Promise.all([getMyAssignedTasks(), getMyTaskUpdates(), getProjects()]);
      const taskById = new Map(tasks.map((task) => [task.id, task])); const projectIds = [...new Set(updates.map((update) => taskById.get(update.taskId)?.projectId).filter((id): id is string => Boolean(id)))];
      const workstreams = await getWorkstreamsForProjects(projectIds);
      setData({ tasks, updates, projects, workstreams }); setState("ready");
    } catch { setState("error"); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);
  const items = useMemo(() => {
    const taskById = new Map((data?.tasks ?? []).map((task) => [task.id, task])); const projectById = new Map((data?.projects ?? []).map((project) => [project.id, project])); const workstreamById = new Map((data?.workstreams ?? []).map((workstream) => [workstream.id, workstream]));
    return (data?.updates ?? []).map((update) => { const task = taskById.get(update.taskId); const project = task ? projectById.get(task.projectId) : undefined; return task && project ? { update, task, project, workstream: workstreamById.get(task.workstreamId) } : null; }).filter((item): item is HistoryItem => item !== null).sort((left, right) => updateOrder(left.update, right.update));
  }, [data]);
  const projectOptions = useMemo(() => [...new Map(items.map((item) => [item.project.id, item.project])).values()].sort((left, right) => left.name.localeCompare(right.name)), [items]);
  const filtered = useMemo(() => { const term = search.trim().toLowerCase(); return items.filter((item) => (review === "ALL" || item.update.reviewStatus === review) && (projectId === "ALL" || item.project.id === projectId) && (!term || [item.task.title, item.update.progress, item.update.learning, item.update.blockers, item.update.nextPlan, item.update.managerFeedback].some((value) => value.toLowerCase().includes(term)))); }, [items, projectId, review, search]);
  const monthGroups = useMemo(() => { const groups = new Map<string, HistoryItem[]>(); filtered.forEach((item) => { const key = monthLabel(item.update.occurredOn); groups.set(key, [...(groups.get(key) ?? []), item]); }); return [...groups.entries()]; }, [filtered]);
  const summary = useMemo(() => ({ updates: items.length, pending: items.filter((item) => item.update.reviewStatus === "PENDING").length, approved: items.filter((item) => item.update.reviewStatus === "APPROVED").length, changes: items.filter((item) => item.update.reviewStatus === "CHANGES_REQUESTED").length }), [items]);
  if (state === "loading") return <V2Card><V2EmptyState title="Loading your progress" description="진행기록과 검토 결과를 불러오고 있습니다." /></V2Card>;
  if (state === "profileMissing") return <V2Card><V2EmptyState title="Intern profile not linked" description="현재 로그인 계정에 연결된 인턴 프로필이 없습니다. ADMIN에게 연결을 요청해주세요." /></V2Card>;
  if (state === "error" || !data) return <V2Card><V2EmptyState title="Unable to load your progress." description="잠시 후 다시 시도해주세요." action={<V2Button type="button" variant="secondary" onClick={() => void load()}>Retry</V2Button>} /></V2Card>;
  return <section className="v2-intern-progress"><V2PageHeader eyebrow="PROGRESS" title="My Progress" description="Your work updates, reviews, and feedback in one place." /><div className="v2-intern-progress__summary" aria-label="My progress summary"><Metric label="UPDATES" value={summary.updates} /><Metric label="PENDING" value={summary.pending} /><Metric label="APPROVED" value={summary.approved} /><Metric label="CHANGES REQUESTED" value={summary.changes} danger /></div><section className="v2-intern-progress__filters" aria-label="Progress filters"><label className="v2-field"><span>SEARCH</span><input className="v2-input" aria-label="Search progress updates" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search updates" /></label><label className="v2-field"><span>REVIEW STATUS</span><select className="v2-select" aria-label="Filter by review status" value={review} onChange={(event) => setReview(event.target.value as "ALL" | TaskUpdateReviewStatus)}><option value="ALL">All statuses</option><option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="CHANGES_REQUESTED">CHANGES REQUESTED</option></select></label><label className="v2-field"><span>PROJECT</span><select className="v2-select" aria-label="Filter by project" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="ALL">All projects</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label></section><section className="v2-intern-progress__history"><header><p>ACTIVITY HISTORY</p><h2>Your submitted updates</h2></header>{items.length === 0 ? <V2EmptyState title="No progress updates yet." description="Submit an update from one of your assigned tasks to start building your work history." action={<Link className="v2-button v2-button--secondary" to="/intern/tasks">View My Tasks</Link>} /> : filtered.length === 0 ? <V2EmptyState title="No updates match your filters." description="Try adjusting your search or filters." action={<V2Button type="button" variant="secondary" onClick={() => { setSearch(""); setReview("ALL"); setProjectId("ALL"); }}>Clear filters</V2Button>} /> : <div className="v2-intern-progress__months">{monthGroups.map(([month, entries]) => <section key={month} className="v2-intern-progress__month"><h3>{month}</h3>{entries.map((item) => <HistoryItemCard key={item.update.id} item={item} />)}</section>)}</div>}</section></section>;
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) { return <V2Card className={`v2-intern-progress__metric${danger ? " v2-intern-progress__metric--danger" : ""}`}><small>{label}</small><strong>{value}</strong></V2Card>; }
function HistoryItemCard({ item }: { item: HistoryItem }) { const { update, task, project, workstream } = item; const fields = [["Progress", update.progress], ["Learning", update.learning], ["Blockers", update.blockers], ["Next Plan", update.nextPlan]].filter(([, value]) => Boolean(value.trim())); const hasFeedback = Boolean(update.managerFeedback.trim()); return <article className={`v2-intern-progress__item${update.reviewStatus === "CHANGES_REQUESTED" ? " v2-intern-progress__item--changes" : ""}`}><time dateTime={update.occurredOn}>{formatDate(update.occurredOn)}</time><div className="v2-intern-progress__item-body"><header><div><Link to={`/intern/tasks/${task.id}`}>{task.title}</Link><span><Link to={`/intern/projects/${project.id}`}>{project.name}</Link>{workstream && <> · {workstream.name}</>}</span></div><V2Badge variant={reviewVariant[update.reviewStatus]}>{TASK_UPDATE_REVIEW_STATUS_LABELS[update.reviewStatus]}</V2Badge></header>{update.progress && <p>{preview(update.progress)}</p>}{hasFeedback && <section className="v2-intern-progress__feedback"><small>MANAGER FEEDBACK</small><p>{update.managerFeedback}</p></section>}<details><summary>View details</summary><div>{fields.map(([label, value]) => <section key={label}><small>{label.toUpperCase()}</small><p>{value}</p></section>)}{hasFeedback && <section><small>MANAGER FEEDBACK</small><p>{update.managerFeedback}</p></section>}</div></details></div></article>; }
