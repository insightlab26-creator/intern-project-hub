import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/providers/authContext";
import { TASK_STATUS_LABELS } from "../../constants/domainLabels";
import { getInterns } from "../../services/internService";
import { getProjects } from "../../services/projectService";
import { getAllTasks } from "../../services/taskService";
import {
  decideTaskSubmission, getLegacyTaskResolution, getTaskReviewers, getTaskSubmissions,
  resolveLegacyReview, saveTaskBrief, startAssignedTask, submitAssignedTask,
} from "../../services/taskSubmissionService";
import { createTaskUpdate, getTaskUpdates, saveTaskUpdateFeedback } from "../../services/taskUpdateService";
import type { Intern, LegacyTaskResolution, Project, Task, TaskSubmission, TaskUpdate } from "../../types/domain";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2Input } from "../../components/ui/V2Input";
import { V2PageHeader } from "../../components/ui/V2PageHeader";

type Props = { mode: "intern" | "review" };
const errorText = (value: unknown) => value instanceof Error ? value.message : "요청을 처리하지 못했습니다.";

export default function TaskWorkflowPage({ mode }: Props) {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [legacy, setLegacy] = useState<LegacyTaskResolution | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [learning, setLearning] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [contributorIds, setContributorIds] = useState<string[]>([]);
  const [feedbackByUpdate, setFeedbackByUpdate] = useState<Record<string, string>>({});
  const [decisionFeedback, setDecisionFeedback] = useState("");
  const [legacyReason, setLegacyReason] = useState("");
  const [reviewers, setReviewers] = useState<{ id: string; displayName: string }[]>([]);
  const [editingBrief, setEditingBrief] = useState(false);
  const [expectedOutput, setExpectedOutput] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [externalRequester, setExternalRequester] = useState("");
  const selectedId = params.get("taskId");
  const selectedIdRef = useRef(selectedId);

  const loadTasks = useCallback(async () => {
    const [taskItems, projectItems, internItems] = await Promise.all([getAllTasks(), getProjects(), getInterns()]);
    setTasks(taskItems);
    setProjects(projectItems);
    setInterns(internItems);
  }, []);
  const loadDetail = useCallback(async (taskId: string) => {
    const [updateItems, submissionItems, legacyItem] = await Promise.all([
      getTaskUpdates(taskId), getTaskSubmissions(taskId), getLegacyTaskResolution(taskId),
    ]);
    if (selectedIdRef.current !== taskId) return;
    setUpdates(updateItems);
    setSubmissions(submissionItems);
    setLegacy(legacyItem);
    setDetailTaskId(taskId);
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    let active = true;
    Promise.all([getAllTasks(), getProjects(), getInterns()]).then(([taskItems, projectItems, internItems]) => {
      if (!active) return;
      setTasks(taskItems); setProjects(projectItems); setInterns(internItems);
    }).catch((caught) => { if (active) setError(errorText(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (mode !== "review") return;
    void getTaskReviewers().then(setReviewers).catch((caught) => setError(errorText(caught)));
  }, [mode]);
  useEffect(() => {
    if (!selectedId || !tasks.some((task) => task.id === selectedId)) return;
    void Promise.resolve().then(() => loadDetail(selectedId))
      .catch((caught) => setError(errorText(caught)));
  }, [loadDetail, selectedId, tasks]);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const internById = useMemo(() => new Map(interns.map((intern) => [intern.id, intern])), [interns]);
  const visibleTasks = mode === "intern" ? tasks : tasks.filter((task) =>
    profile?.global_role === "ADMIN" || projectById.get(task.projectId)?.operatorId === profile?.id
      || (task.status === "REVIEW" && task.reviewerId === profile?.id));
  const selected = tasks.find((task) => task.id === selectedId) ?? null;
  const myInternId = interns.find((intern) => intern.userUid === profile?.id)?.id;
  const isAssignee = Boolean(selected && myInternId && selected.assigneeInternIds.includes(myInternId));
  const canDecide = mode === "review" && selected?.reviewerId === profile?.id;
  const canManageLegacy = mode === "review" && (profile?.global_role === "ADMIN"
    || projectById.get(selected?.projectId ?? "")?.operatorId === profile?.id);
  const canLeaveFeedback = profile?.global_role === "ADMIN"
    || projectById.get(selected?.projectId ?? "")?.operatorId === profile?.id;

  const openBrief = () => {
    if (!selected) return;
    setExpectedOutput(selected.expectedOutput);
    setReviewerId(selected.reviewerId ?? "");
    setExternalRequester(selected.externalRequester);
    setEditingBrief(true);
  };

  const run = async (action: () => Promise<void>) => {
    if (!selected) return;
    try {
      setBusy(true); setError("");
      await action();
      await loadTasks();
      await loadDetail(selected.id);
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusy(false); }
  };

  const submitProgress = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    void run(async () => {
      await createTaskUpdate({ taskId: selected.id, occurredOn: new Date().toISOString().slice(0, 10),
        progress, learning, blockers, nextPlan });
      setProgress(""); setLearning(""); setBlockers(""); setNextPlan("");
    });
  };
  const submitFinal = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !myInternId) return;
    void run(async () => {
      await submitAssignedTask({ taskId: selected.id, title, url, note,
        contributorInternIds: [...new Set([myInternId, ...contributorIds])] });
      setTitle(""); setUrl(""); setNote(""); setContributorIds([]);
    });
  };

  return <section>
    <V2PageHeader title={mode === "intern" ? "My Quests" : "Review Queue"}
      description={mode === "intern" ? "배정된 업무의 진행과 제출 이력을 관리합니다." : "최종 제출과 기존 방식 검토 대기 업무를 확인합니다."} />
    {error && <p className="v2-form-error" role="alert">{error}</p>}
    {loading ? <V2Card>업무를 불러오는 중입니다.</V2Card> : <div className="v2-workflow-layout">
      <div className="v2-workflow-list">
        {visibleTasks.length === 0 && <V2Card>표시할 업무가 없습니다.</V2Card>}
        {visibleTasks.map((task) => <V2Card key={task.id}>
          <button className="v2-workflow-task" type="button" onClick={() => { selectedIdRef.current = task.id; setDetailTaskId(null); setUpdates([]); setSubmissions([]); setLegacy(null); setEditingBrief(false); setParams({ taskId: task.id }); }}>
            <strong>{task.title}</strong><span>{projectById.get(task.projectId)?.name ?? "Project"}</span>
            <span>{TASK_STATUS_LABELS[task.status]}</span>
            {task.status === "REVIEW" && <small>검토 대기</small>}
          </button>
        </V2Card>)}
      </div>
      {selected && detailTaskId !== selected.id && <V2Card>업무 상세를 불러오는 중입니다.</V2Card>}
      {selected && detailTaskId === selected.id && <div className="v2-workflow-detail">
        <V2Card><h2>{selected.title}</h2><p>{selected.description}</p>
          <p><strong>기대 산출물</strong> {selected.expectedOutput || "지정되지 않음"}</p>
          {selected.externalRequester && <p><strong>외부 요청자</strong> {selected.externalRequester}</p>}
          <p><strong>상태</strong> {TASK_STATUS_LABELS[selected.status]}</p>
          {selected.status === "DONE" && submissions.length === 0 && !legacy &&
            <p>기존 방식으로 완료된 업무입니다. 새 방식의 최종 제출·승인 이력은 없습니다.</p>}
          <p><strong>담당 인턴</strong> {selected.assigneeInternIds.map((id) => internById.get(id)?.name ?? "인턴").join(", ")}</p>
          {mode === "review" && canLeaveFeedback && selected.status !== "REVIEW" && selected.status !== "DONE" && <div>
            <V2Button type="button" variant="secondary" onClick={openBrief}>기대 산출물·검토자 설정</V2Button>
            {editingBrief && <form className="v2-workflow-form" onSubmit={(event) => {
              event.preventDefault();
              void run(async () => { await saveTaskBrief(selected.id, expectedOutput, reviewerId || null, externalRequester); setEditingBrief(false); });
            }}>
              <label>기대 산출물<textarea value={expectedOutput} onChange={(event) => setExpectedOutput(event.target.value)} /></label>
              <label>최종 검토자<select value={reviewerId} onChange={(event) => setReviewerId(event.target.value)}>
                <option value="">선택하지 않음</option>
                {reviewers.map((reviewer) => <option value={reviewer.id} key={reviewer.id}>{reviewer.displayName}</option>)}
              </select></label>
              <V2Input label="외부 요청자" value={externalRequester} onChange={(event) => setExternalRequester(event.target.value)} />
              <V2Button type="submit" disabled={busy}>저장</V2Button>
            </form>}
          </div>}
          {mode === "intern" && isAssignee && selected.status === "TODO" &&
            <V2Button type="button" disabled={busy} onClick={() => void run(() => startAssignedTask(selected.id))}>업무 시작</V2Button>}
          {mode === "review" && selected.status === "REVIEW" && submissions.length === 0 && canManageLegacy &&
            <div><p>기존 방식의 검토 대기 업무입니다.</p>
              <V2Input label="전환 사유" value={legacyReason} onChange={(event) => setLegacyReason(event.target.value)} />
              <V2Button type="button" disabled={busy || !legacyReason.trim()} onClick={() => void run(() => resolveLegacyReview(selected.id, "RESUBMIT", legacyReason))}>보완·재제출 요청</V2Button>{" "}
              <V2Button type="button" variant="secondary" disabled={busy || !legacyReason.trim()} onClick={() => void run(() => resolveLegacyReview(selected.id, "COMPLETE", legacyReason))}>기존 완료 확정</V2Button>
            </div>}
          {legacy && <p>기존 방식 처리 이력 · {legacy.action === "COMPLETE" ? "완료 확정" : "재제출 요청"} · {legacy.reason} · 처리자 {reviewers.find((reviewer) => reviewer.id === legacy.resolvedBy)?.displayName ?? legacy.resolvedBy}</p>}
        </V2Card>

        {mode === "intern" && isAssignee && selected.status === "IN_PROGRESS" && <>
          <V2Card><h3>중간 진행 기록</h3><form onSubmit={submitProgress} className="v2-workflow-form">
            <label>진행 내용<textarea value={progress} onChange={(event) => setProgress(event.target.value)} /></label>
            <label>학습<textarea value={learning} onChange={(event) => setLearning(event.target.value)} /></label>
            <label>장애 요소<textarea value={blockers} onChange={(event) => setBlockers(event.target.value)} /></label>
            <label>다음 계획<textarea value={nextPlan} onChange={(event) => setNextPlan(event.target.value)} /></label>
            <V2Button type="submit" disabled={busy || ![progress, learning, blockers, nextPlan].some((value) => value.trim())}>기록 추가</V2Button>
          </form></V2Card>
          <V2Card><h3>최종 제출</h3><form onSubmit={submitFinal} className="v2-workflow-form">
            <V2Input required label="작업물 제목" value={title} onChange={(event) => setTitle(event.target.value)} />
            <V2Input required label="Teams / 작업물 URL" type="url" value={url} onChange={(event) => setUrl(event.target.value)} />
            <label>제출 설명<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <fieldset><legend>공동 기여자</legend>{selected.assigneeInternIds.map((id) => <label key={id}>
              <input type="checkbox" checked={id === myInternId || contributorIds.includes(id)} disabled={id === myInternId}
                onChange={() => setContributorIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />
              {internById.get(id)?.name ?? "인턴"}
            </label>)}</fieldset>
            <V2Button type="submit" disabled={busy || !selected.expectedOutput || !selected.reviewerId}>검토 요청</V2Button>
            {(!selected.expectedOutput || !selected.reviewerId) && <p>관리자가 기대 산출물과 검토자를 지정해야 제출할 수 있습니다.</p>}
          </form></V2Card>
        </>}

        <V2Card><h3>중간 진행 기록</h3>
          {updates.length === 0 && <p>등록된 기록이 없습니다.</p>}
          {updates.map((update) => <article key={update.id} className="v2-workflow-entry">
            <strong>{update.occurredOn}</strong><p>{[update.progress, update.learning, update.blockers, update.nextPlan].filter(Boolean).join(" · ")}</p>
            {update.managerFeedback && <p>관리자 피드백 · {update.managerFeedback}</p>}
            {mode === "review" && canLeaveFeedback && <div>
              <label>피드백<textarea value={feedbackByUpdate[update.id] ?? update.managerFeedback}
                onChange={(event) => setFeedbackByUpdate((current) => ({ ...current, [update.id]: event.target.value }))} /></label>
              <V2Button type="button" disabled={busy} onClick={() => void run(() => saveTaskUpdateFeedback(update.id, feedbackByUpdate[update.id] ?? update.managerFeedback))}>피드백 저장</V2Button>
            </div>}
          </article>)}
        </V2Card>

        <V2Card><h3>최종 제출 이력</h3>
          {submissions.length === 0 && <p>새 방식의 제출 이력이 없습니다.</p>}
          {submissions.filter((submission) => submission.taskId === selected.id).map((submission) => <article key={submission.id} className="v2-workflow-entry">
            <strong>{submission.revision}회차 · 링크 버전 {submission.versionNumber} · {submission.title}</strong>
            <p>제출자 · {interns.find((intern) => intern.userUid === submission.submittedBy)?.name ?? "사용자"}</p>
            <p>공동 기여자 · {submission.contributorInternIds.map((id) => internById.get(id)?.name ?? "인턴").join(", ")}</p>
            <p><a href={submission.url} target="_blank" rel="noreferrer">제출 링크 열기 ↗</a></p>
            {submission.note && <p>{submission.note}</p>}
            <p>검토 · {submission.decision === "PENDING" ? "대기" : submission.decision === "APPROVED" ? "승인" : "수정 요청"}</p>
            {submission.feedback && <p>검토 의견 · {submission.feedback}</p>}
            {mode === "review" && canDecide && submission.decision === "PENDING" && selected.status === "REVIEW" && <div>
              <label>검토 의견<textarea value={decisionFeedback} onChange={(event) => setDecisionFeedback(event.target.value)} /></label>
              <V2Button type="button" disabled={busy} onClick={() => void run(() => decideTaskSubmission(submission.id, "APPROVED", decisionFeedback))}>승인하고 완료</V2Button>{" "}
              <V2Button type="button" variant="secondary" disabled={busy || !decisionFeedback.trim()} onClick={() => void run(() => decideTaskSubmission(submission.id, "CHANGES_REQUESTED", decisionFeedback))}>수정 요청</V2Button>
            </div>}
          </article>)}
        </V2Card>
      </div>}
    </div>}
  </section>;
}
