import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { formatInternDate, internReviewStatusLabel, useInternLocale } from "../../i18n/internLocale";
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
function preview(value: string, limit = 180) { return value.length > limit ? `${value.slice(0, limit - 1)}…` : value; }
function updateOrder(left: TaskUpdate, right: TaskUpdate) { return dateAtMidnight(right.occurredOn).getTime() - dateAtMidnight(left.occurredOn).getTime() || dateTime(right.createdAt) - dateTime(left.createdAt); }

export default function InternProgressPage() {
  const { locale, t } = useInternLocale();
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
  const monthGroups = useMemo(() => { const groups = new Map<string, HistoryItem[]>(); filtered.forEach((item) => { const key = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", { month: "long", year: "numeric" }).format(dateAtMidnight(item.update.occurredOn)); groups.set(key, [...(groups.get(key) ?? []), item]); }); return [...groups.entries()]; }, [filtered, locale]);
  const summary = useMemo(() => ({ updates: items.length, pending: items.filter((item) => item.update.reviewStatus === "PENDING").length, approved: items.filter((item) => item.update.reviewStatus === "APPROVED").length, changes: items.filter((item) => item.update.reviewStatus === "CHANGES_REQUESTED").length }), [items]);
  if (state === "loading") return <V2Card><V2EmptyState title={t("state.loadingProgress")} description={t("progress.description")} /></V2Card>;
  if (state === "profileMissing") return <V2Card><V2EmptyState title={t("state.internMissing")} description={t("state.internMissingDescription")} /></V2Card>;
  if (state === "error" || !data) return <V2Card><V2EmptyState title={t("progress.loadError")} description={t("tasks.adjust")} action={<V2Button type="button" variant="secondary" onClick={() => void load()}>{t("common.retry")}</V2Button>} /></V2Card>;
  return <section className="v2-intern-progress"><V2PageHeader eyebrow={t("progress.eyebrow")} title={t("progress.title")} description={t("progress.description")} /><div className="v2-intern-progress__summary" aria-label={t("progress.summary")}><Metric label={t("progress.updates")} value={summary.updates} /><Metric label={internReviewStatusLabel("PENDING", locale)} value={summary.pending} /><Metric label={internReviewStatusLabel("APPROVED", locale)} value={summary.approved} /><Metric label={internReviewStatusLabel("CHANGES_REQUESTED", locale)} value={summary.changes} danger /></div><section className="v2-intern-progress__filters" aria-label={t("progress.eyebrow")}><label className="v2-field"><span>{t("common.search")}</span><input className="v2-input" aria-label={t("progress.search")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("progress.search")} /></label><label className="v2-field"><span>{t("progress.filterReview")}</span><select className="v2-select" aria-label={t("progress.filterReview")} value={review} onChange={(event) => setReview(event.target.value as "ALL" | TaskUpdateReviewStatus)}><option value="ALL">{t("progress.allReviews")}</option>{(["PENDING", "APPROVED", "CHANGES_REQUESTED"] as TaskUpdateReviewStatus[]).map((item) => <option key={item} value={item}>{internReviewStatusLabel(item, locale)}</option>)}</select></label><label className="v2-field"><span>{t("common.project")}</span><select className="v2-select" aria-label={t("progress.filterProject")} value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="ALL">{t("progress.allProjects")}</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label></section><section className="v2-intern-progress__history"><header><p>{t("progress.activity")}</p><h2>{t("progress.submitted")}</h2></header>{items.length === 0 ? <V2EmptyState title={t("progress.noUpdates")} description={t("progress.noUpdatesDescription")} action={<Link className="v2-button v2-button--secondary" to="/intern/tasks">{t("progress.viewTasks")}</Link>} /> : filtered.length === 0 ? <V2EmptyState title={t("progress.noMatch")} description={t("tasks.adjust")} action={<V2Button type="button" variant="secondary" onClick={() => { setSearch(""); setReview("ALL"); setProjectId("ALL"); }}>{t("common.clearFilters")}</V2Button>} /> : <div className="v2-intern-progress__months">{monthGroups.map(([month, entries]) => <section key={month} className="v2-intern-progress__month"><h3>{month}</h3>{entries.map((item) => <HistoryItemCard key={item.update.id} item={item} />)}</section>)}</div>}</section></section>;
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) { return <V2Card className={`v2-intern-progress__metric${danger ? " v2-intern-progress__metric--danger" : ""}`}><small>{label}</small><strong>{value}</strong></V2Card>; }
function HistoryItemCard({ item }: { item: HistoryItem }) { const { locale, t } = useInternLocale(); const { update, task, project, workstream } = item; const fields = [[t("task.progress"), update.progress], [t("task.learning"), update.learning], [t("task.blockers"), update.blockers], [t("task.nextPlan"), update.nextPlan]].filter(([, value]) => Boolean(value.trim())); const hasFeedback = Boolean(update.managerFeedback.trim()); return <article className={`v2-intern-progress__item${update.reviewStatus === "CHANGES_REQUESTED" ? " v2-intern-progress__item--changes" : ""}`}><time dateTime={update.occurredOn}>{formatInternDate(update.occurredOn, locale, true)}</time><div className="v2-intern-progress__item-body"><header><div><Link to={`/intern/tasks/${task.id}`}>{task.title}</Link><span><Link to={`/intern/projects/${project.id}`}>{project.name}</Link>{workstream && <> · {workstream.name}</>}</span></div><V2Badge variant={reviewVariant[update.reviewStatus]}>{internReviewStatusLabel(update.reviewStatus, locale)}</V2Badge></header>{update.progress && <p>{preview(update.progress)}</p>}{hasFeedback && <section className="v2-intern-progress__feedback"><small>{t("task.managerFeedback")}</small><p>{update.managerFeedback}</p></section>}<details><summary>{t("progress.viewDetails")}</summary><div>{fields.map(([label, value]) => <section key={label}><small>{label}</small><p>{value}</p></section>)}{hasFeedback && <section><small>{t("task.managerFeedback")}</small><p>{update.managerFeedback}</p></section>}</div></details></div></article>; }
