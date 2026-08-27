import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReviewQueueSummary from "../../components/reviews/ReviewQueueSummary";
import ReviewTaskDetailPanel from "../../components/reviews/ReviewTaskDetailPanel";
import ReviewTaskTable, { type ReviewQueueItem } from "../../components/reviews/ReviewTaskTable";
import ReviewUpdateDetailPanel from "../../components/reviews/ReviewUpdateDetailPanel";
import TaskFormModal from "../../components/projects/detail/work/TaskFormModal";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2Input } from "../../components/ui/V2Input";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { V2Select } from "../../components/ui/V2Select";
import { getInterns } from "../../services/internService";
import { getProjects } from "../../services/projectService";
import { getAllTasks, updateTask } from "../../services/taskService";
import { getPendingTaskUpdates, getTaskUpdates, reviewTaskUpdate } from "../../services/taskUpdateService";
import { getWorkstreams } from "../../services/workstreamService";
import type { CreateTaskInput, Intern, Project, Task, TaskPriority, TaskUpdate, Workstream } from "../../types/domain";

type DueFilter = "ALL" | "OVERDUE" | "ON_TRACK" | "NO_DUE_DATE";
type ReviewFilter = "ALL" | "TASKS" | "UPDATES";
type UpdateReviewQueueItem = Extract<ReviewQueueItem, { kind: "UPDATE" }>;
const localToday = () => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };
const errorMessage = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;
const isOverdue = (task: Task, today: Date) => Boolean(task.dueDate && new Date(`${task.dueDate}T00:00:00`) < today);

export default function AdminReviewQueuePage() {
  const [params, setParams] = useSearchParams(); const [tasks, setTasks] = useState<Task[]>([]); const [projects, setProjects] = useState<Project[]>([]); const [interns, setInterns] = useState<Intern[]>([]); const [pendingUpdates, setPendingUpdates] = useState<TaskUpdate[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [pendingUpdatesError, setPendingUpdatesError] = useState(""); const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("ALL"); const [query, setQuery] = useState(""); const [projectFilter, setProjectFilter] = useState(""); const [priorityFilter, setPriorityFilter] = useState<"" | TaskPriority>(""); const [dueFilter, setDueFilter] = useState<DueFilter>("ALL"); const [updatesByTaskId, setUpdatesByTaskId] = useState<Map<string, TaskUpdate[]>>(new Map()); const [updatesLoading, setUpdatesLoading] = useState(false); const [updatesError, setUpdatesError] = useState(""); const [updateSaving, setUpdateSaving] = useState(false); const [editingTask, setEditingTask] = useState<Task | null>(null); const [editWorkstreams, setEditWorkstreams] = useState<Workstream[] | null>(null); const [workstreamsByProject, setWorkstreamsByProject] = useState<Map<string, Workstream[]>>(new Map()); const [editLoading, setEditLoading] = useState(false); const [editError, setEditError] = useState(""); const [taskSaving, setTaskSaving] = useState(false);
  const selectedTaskId = params.get("taskId"); const selectedUpdateId = params.get("updateId");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(""); setPendingUpdatesError("");
      const [[taskItems, projectItems, internItems], pendingResult] = await Promise.all([
        Promise.all([getAllTasks(), getProjects(), getInterns()]),
        getPendingTaskUpdates().then((items) => ({ items, error: "" })).catch((caught: unknown) => ({ items: [], error: errorMessage(caught, "검토 대기 진행 기록을 불러오지 못했습니다.") })),
      ]);
      setTasks(taskItems); setProjects(projectItems); setInterns(internItems); setPendingUpdates(pendingResult.items); setPendingUpdatesError(pendingResult.error);
    } catch (caught) { setError(errorMessage(caught, "Review Inbox를 불러오지 못했습니다.")); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]); const internMap = useMemo(() => new Map(interns.map((intern) => [intern.id, intern])), [interns]); const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const taskItems = useMemo<ReviewQueueItem[]>(() => tasks.filter((task) => task.status === "REVIEW").map((task) => ({ kind: "TASK", key: `task:${task.id}`, task })), [tasks]);
  const updateItems = useMemo<UpdateReviewQueueItem[]>(() => pendingUpdates.flatMap((update) => { const task = taskMap.get(update.taskId); return task ? [{ kind: "UPDATE" as const, key: `update:${update.id}`, task, update }] : []; }), [pendingUpdates, taskMap]);
  const inboxItems = useMemo(() => {
    const today = localToday();
    return [...taskItems, ...updateItems].sort((left, right) => {
      const rank = (item: ReviewQueueItem) => item.kind === "TASK" ? isOverdue(item.task, today) ? 0 : 2 : 1;
      const rankDifference = rank(left) - rank(right); if (rankDifference) return rankDifference;
      if (left.kind === "UPDATE" && right.kind === "UPDATE") return right.update.createdAt.localeCompare(left.update.createdAt);
      const leftDate = left.task.dueDate ?? "9999-12-31"; const rightDate = right.task.dueDate ?? "9999-12-31";
      return leftDate.localeCompare(rightDate);
    });
  }, [taskItems, updateItems]);
  const selectedItem = useMemo(() => selectedTaskId ? taskItems.find((item) => item.task.id === selectedTaskId) ?? null : selectedUpdateId ? updateItems.find((item) => item.update.id === selectedUpdateId) ?? null : null, [selectedTaskId, selectedUpdateId, taskItems, updateItems]);
  const selectedTask = selectedItem?.kind === "TASK" ? selectedItem.task : null; const selectedUpdate = selectedItem?.kind === "UPDATE" ? selectedItem : null;
  const clearSelection = useCallback(() => setParams((current) => { const next = new URLSearchParams(current); next.delete("taskId"); next.delete("updateId"); return next; }), [setParams]);
  useEffect(() => { if (!loading && (selectedTaskId && !selectedTask || selectedUpdateId && !selectedUpdate)) clearSelection(); }, [clearSelection, loading, selectedTask, selectedTaskId, selectedUpdate, selectedUpdateId]);
  const loadUpdates = useCallback(async (taskId: string, force = false) => { if (!force && updatesByTaskId.has(taskId)) return; try { setUpdatesLoading(true); setUpdatesError(""); const items = await getTaskUpdates(taskId); setUpdatesByTaskId((current) => new Map(current).set(taskId, items)); } catch (caught) { setUpdatesError(errorMessage(caught, "진행 기록을 불러오지 못했습니다.")); } finally { setUpdatesLoading(false); } }, [updatesByTaskId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (selectedTask) void loadUpdates(selectedTask.id); }, [loadUpdates, selectedTask]);

  const summary = useMemo(() => { const today = localToday(); return { total: inboxItems.length, inReview: taskItems.length, pendingUpdates: updateItems.length, overdue: taskItems.filter((item) => isOverdue(item.task, today)).length, projects: new Set(inboxItems.map((item) => item.task.projectId)).size }; }, [inboxItems, taskItems, updateItems]);
  const visibleItems = useMemo(() => { const today = localToday(); const needle = query.trim().toLocaleLowerCase("ko-KR"); return inboxItems.filter((item) => { const { task } = item; const projectName = projectMap.get(task.projectId)?.name ?? ""; const assigneeNames = task.assigneeInternIds.map((id) => internMap.get(id)?.name ?? "").join(" "); const authorName = item.kind === "UPDATE" ? item.update.authorName ?? "" : ""; const matchesText = !needle || `${task.title} ${projectName} ${assigneeNames} ${authorName}`.toLocaleLowerCase("ko-KR").includes(needle); const overdue = isOverdue(task, today); const dueMatch = dueFilter === "ALL" || dueFilter === "OVERDUE" && overdue || dueFilter === "ON_TRACK" && Boolean(task.dueDate) && !overdue || dueFilter === "NO_DUE_DATE" && !task.dueDate; const typeMatch = reviewFilter === "ALL" || reviewFilter === "TASKS" && item.kind === "TASK" || reviewFilter === "UPDATES" && item.kind === "UPDATE"; return typeMatch && matchesText && (!projectFilter || task.projectId === projectFilter) && (!priorityFilter || task.priority === priorityFilter) && dueMatch; }); }, [dueFilter, inboxItems, internMap, priorityFilter, projectFilter, projectMap, query, reviewFilter]);
  const selectItem = (item: ReviewQueueItem) => setParams((current) => { const next = new URLSearchParams(current); if (item.kind === "TASK") { next.set("taskId", item.task.id); next.delete("updateId"); } else { next.set("updateId", item.update.id); next.delete("taskId"); } return next; });
  const saveUpdateReview = async (id: string, reviewStatus: "APPROVED" | "CHANGES_REQUESTED", managerFeedback: string) => { try { setUpdateSaving(true); await reviewTaskUpdate({ id, reviewStatus, managerFeedback }); setPendingUpdates((items) => items.filter((item) => item.id !== id)); setUpdatesByTaskId((current) => new Map([...current].map(([taskId, items]) => [taskId, items.map((item) => item.id === id ? { ...item, reviewStatus, managerFeedback } : item)]))); if (selectedUpdate?.update.id === id) clearSelection(); } finally { setUpdateSaving(false); } };
  const openEdit = async () => { if (!selectedTask) return; try { setEditLoading(true); setEditError(""); const cached = workstreamsByProject.get(selectedTask.projectId); const streams = cached ?? await getWorkstreams(selectedTask.projectId); if (!cached) setWorkstreamsByProject((current) => new Map(current).set(selectedTask.projectId, streams)); setEditWorkstreams(streams); setEditingTask(selectedTask); } catch (caught) { setEditError(errorMessage(caught, "Task 편집에 필요한 Workstream을 불러오지 못했습니다.")); } finally { setEditLoading(false); } };
  const saveTask = async (input: CreateTaskInput, taskId?: string) => { if (!taskId) return; try { setTaskSaving(true); setEditError(""); await updateTask({ ...input, taskId }); const refreshed = await getAllTasks(); setTasks(refreshed); if (selectedTaskId && !refreshed.some((task) => task.id === taskId && task.status === "REVIEW")) clearSelection(); } catch (caught) { setEditError(errorMessage(caught, "Task를 수정하지 못했습니다.")); throw caught; } finally { setTaskSaving(false); } };
  const emptyState = reviewFilter === "TASKS" ? { title: "No tasks in review", description: "현재 검토 단계에 있는 실행 업무가 없습니다." } : reviewFilter === "UPDATES" ? { title: "No pending updates", description: "검토 대기 중인 진행 기록이 없습니다." } : { title: "No reviews waiting", description: "현재 확인하거나 검토할 항목이 없습니다." };

  if (loading) return <V2Card><V2EmptyState title="Loading Review Inbox" description="검토 대상을 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load Review Inbox" description={error} /></V2Card>;
  return <section className="v2-review-queue"><V2PageHeader title="Review Queue" description="관리자가 지금 확인하거나 검토해야 하는 업무 항목을 처리합니다." /><ReviewQueueSummary {...summary} /><div className="v2-review-queue__tabs" role="tablist" aria-label="Review type filters">{([ ["ALL", "ALL", summary.total], ["TASKS", "TASKS IN REVIEW", summary.inReview], ["UPDATES", "PENDING UPDATES", summary.pendingUpdates] ] as const).map(([value, label, count]) => <button type="button" role="tab" aria-selected={reviewFilter === value} className={reviewFilter === value ? "v2-review-queue__tab v2-review-queue__tab--active" : "v2-review-queue__tab"} key={value} onClick={() => setReviewFilter(value)}>{label} <span>{count}</span></button>)}</div>{pendingUpdatesError && <p className="v2-review-queue__partial-error">Pending Updates unavailable: {pendingUpdatesError}</p>}<div className="v2-review-queue__filters"><V2Input aria-label="Search review inbox" placeholder="Search task, project, assignee, or author…" value={query} onChange={(event) => setQuery(event.target.value)} /><V2Select aria-label="Filter by project" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="">All projects</option>{projects.filter((project) => inboxItems.some((item) => item.task.projectId === project.id)).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</V2Select><V2Select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as "" | TaskPriority)}><option value="">All priority</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></V2Select><V2Select aria-label="Filter by due status" value={dueFilter} onChange={(event) => setDueFilter(event.target.value as DueFilter)}><option value="ALL">All due dates</option><option value="OVERDUE">Overdue</option><option value="ON_TRACK">On track</option><option value="NO_DUE_DATE">No due date</option></V2Select></div><div className={selectedItem ? "v2-review-queue__body v2-review-queue__body--selected" : "v2-review-queue__body"}><ReviewTaskTable items={visibleItems} projects={projectMap} interns={internMap} selectedKey={selectedItem?.key ?? null} onSelect={selectItem} emptyTitle={emptyState.title} emptyDescription={emptyState.description} />{selectedTask && <ReviewTaskDetailPanel task={selectedTask} project={projectMap.get(selectedTask.projectId)} interns={internMap} updates={updatesByTaskId.get(selectedTask.id)} loading={updatesLoading && !updatesByTaskId.has(selectedTask.id)} error={updatesError} savingUpdate={updateSaving} editLoading={editLoading} editError={editError} onClose={clearSelection} onEditTask={() => void openEdit()} onReviewUpdate={saveUpdateReview} />}{selectedUpdate && <ReviewUpdateDetailPanel task={selectedUpdate.task} project={projectMap.get(selectedUpdate.task.projectId)} update={selectedUpdate.update} saving={updateSaving} onClose={clearSelection} onReview={saveUpdateReview} />}</div>{editingTask && editWorkstreams && <TaskFormModal projectId={editingTask.projectId} workstreams={editWorkstreams} tasks={tasks.filter((task) => task.projectId === editingTask.projectId)} interns={interns} task={editingTask} saving={taskSaving} error={editError} onClose={() => { setEditingTask(null); setEditWorkstreams(null); }} onAddWorkstream={() => undefined} onSave={saveTask} />}</section>;
}
