import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import ScreenState from "../components/ScreenState";
import { getTaskById } from "../services/taskService";
import { createTaskUpdate, getTaskUpdates, reviewTaskUpdate } from "../services/taskUpdateService";
import { getProjectById } from "../services/projectService";
import { getWorkstreams } from "../services/workstreamService";
import { getInterns } from "../services/internService";
import type { Intern, Project, Task, TaskUpdate, TaskUpdateReviewStatus, Workstream } from "../types/domain";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_UPDATE_REVIEW_STATUS_LABELS } from "../constants/domainLabels";

type DetailData = { task: Task; project: Project; streams: Workstream[]; interns: Intern[]; updates: TaskUpdate[] };

const today = () => new Date().toISOString().slice(0, 10);

export default function TaskDetailPage() {
  const { taskId = "" } = useParams();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ occurredOn: today(), progress: "", learning: "", blockers: "", nextPlan: "" });

  const load = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true); setError("");
      const task = await getTaskById(taskId);
      const [project, streams, interns, updates] = await Promise.all([
        getProjectById(task.projectId), getWorkstreams(task.projectId), getInterns(), getTaskUpdates(taskId),
      ]);
      setData({ task, project, streams, interns, updates });
    } catch (e) {
      setError(e instanceof Error ? e.message : "실행 업무를 불러오지 못했습니다.");
    } finally { setLoading(false); }
  }, [taskId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const submitUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (![form.progress, form.learning, form.blockers, form.nextPlan].some((value) => value.trim())) {
      setError("진행 내용, 학습, 장애 요소, 다음 계획 중 하나 이상을 입력해주세요."); return;
    }
    try {
      setSaving(true); setError("");
      await createTaskUpdate({ taskId, ...form });
      setForm({ occurredOn: today(), progress: "", learning: "", blockers: "", nextPlan: "" });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "진행 기록을 저장하지 못했습니다."); }
    finally { setSaving(false); }
  };

  const saveReview = async (id: string, reviewStatus: TaskUpdateReviewStatus, managerFeedback: string) => {
    try { setSaving(true); setError(""); await reviewTaskUpdate({ id, reviewStatus, managerFeedback }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "검토 결과를 저장하지 못했습니다."); }
    finally { setSaving(false); }
  };

  if (loading && !data) return <ScreenState kind="loading" title="실행 업무를 불러오는 중입니다." />;
  if (error && !data) return <ScreenState kind="error" title={error} onRetry={load} />;
  if (!data) return <ScreenState kind="empty" title="실행 업무를 찾을 수 없습니다." />;
  const { task, project, streams, interns, updates } = data;

  return <>
    <Link className="back-button" to="/tasks">← 실행 업무</Link>
    <header className="page-header"><p className="eyebrow">{project.code}</p><h1>{task.title}</h1><p>{task.description || "등록된 설명이 없습니다."}</p></header>
    {error && <ScreenState kind="error" title={error} />}
    <section className="detail-grid">
      <div className="overview-card"><span>상태</span><strong>{TASK_STATUS_LABELS[task.status]}</strong></div>
      <div className="overview-card"><span>우선순위</span><strong>{TASK_PRIORITY_LABELS[task.priority]}</strong></div>
      <div className="overview-card"><span>프로젝트</span><strong>{project.name}</strong></div>
      <div className="overview-card"><span>Workstream</span><strong>{streams.find((x) => x.id === task.workstreamId)?.name || "-"}</strong></div>
      <div className="overview-card"><span>담당자</span><strong>{task.assigneeInternIds.map((id) => interns.find((x) => x.id === id)?.name).filter(Boolean).join(", ") || "없음"}</strong></div>
      <div className="overview-card"><span>기한</span><strong>{task.dueDate || "-"}</strong></div>
    </section>
    <Link className="primary-button inline-link" to={`/projects/${project.id}?tab=Work+Packages`}>프로젝트에서 수정</Link>

    <section className="panel task-update-section">
      <div className="panel-header"><div><p className="eyebrow">MILESTONE UPDATE</p><h2>주요 진행 업데이트</h2><p>일일 업무일지가 아니라 단계 변경·완료·검토 요청·중요 장애만 기록합니다. 세부 Action Item은 Loop/Planner에서 관리하세요.</p></div></div>
      <form className="task-update-form" onSubmit={submitUpdate}>
        <label>기록일<input type="date" required value={form.occurredOn} onChange={(e) => setForm({ ...form, occurredOn: e.target.value })} /></label>
        <label>진행 내용<textarea value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} /></label>
        <label>학습<textarea value={form.learning} onChange={(e) => setForm({ ...form, learning: e.target.value })} /></label>
        <label>장애 요소<textarea value={form.blockers} onChange={(e) => setForm({ ...form, blockers: e.target.value })} /></label>
        <label>다음 계획<textarea value={form.nextPlan} onChange={(e) => setForm({ ...form, nextPlan: e.target.value })} /></label>
        <button className="primary-button" disabled={saving}>{saving ? "저장 중..." : "주요 업데이트 추가"}</button>
      </form>
      <div className="task-update-timeline">
        {updates.length === 0 ? <ScreenState kind="empty" title="아직 진행 기록이 없습니다." /> : updates.map((update) =>
          <TaskUpdateCard key={update.id} update={update} saving={saving} onSave={saveReview} />)}
      </div>
    </section>
  </>;
}

function TaskUpdateCard({ update, saving, onSave }: {
  update: TaskUpdate; saving: boolean;
  onSave: (id: string, status: TaskUpdateReviewStatus, feedback: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(update.reviewStatus);
  const [feedback, setFeedback] = useState(update.managerFeedback);
  return <article className="task-update-card">
    <div className="task-update-heading"><div><strong>{update.occurredOn}</strong><span>{update.authorName || "작성자 미상"} · {new Date(update.createdAt).toLocaleString("ko-KR")}</span></div><span className="status-badge">{TASK_UPDATE_REVIEW_STATUS_LABELS[update.reviewStatus]}</span></div>
    <div className="task-update-content">
      {update.progress && <div><span>진행 내용</span><p>{update.progress}</p></div>}
      {update.learning && <div><span>학습</span><p>{update.learning}</p></div>}
      {update.blockers && <div><span>장애 요소</span><p>{update.blockers}</p></div>}
      {update.nextPlan && <div><span>다음 계획</span><p>{update.nextPlan}</p></div>}
    </div>
    <div className="task-update-review">
      <select value={status} onChange={(e) => setStatus(e.target.value as TaskUpdateReviewStatus)}>
        {Object.entries(TASK_UPDATE_REVIEW_STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select>
      <textarea placeholder="관리자 피드백" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <button className="secondary-button" disabled={saving} onClick={() => void onSave(update.id, status, feedback)}>검토 저장</button>
    </div>
  </article>;
}
