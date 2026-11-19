import { supabase } from "../supabase";
import type { LegacyTaskResolution, TaskSubmission } from "../types/domain";

type SubmissionRow = {
  id: string; task_id: string; revision: number; deliverable_version_id: string;
  submitted_by: string; submitted_at: string; title: string; note: string;
  decision: TaskSubmission["decision"]; feedback: string;
  decided_by: string | null; decided_at: string | null;
};

export async function getTaskSubmissions(taskId: string): Promise<TaskSubmission[]> {
  const { data, error } = await supabase.from("task_submissions")
    .select("id,task_id,revision,deliverable_version_id,submitted_by,submitted_at,title,note,decision,feedback,decided_by,decided_at")
    .eq("task_id", taskId).order("revision", { ascending: false });
  if (error) throw new Error(`제출 이력 조회 실패: ${error.message}`);
  const rows = (data ?? []) as SubmissionRow[];
  if (rows.length === 0) return [];

  const [versions, contributors] = await Promise.all([
    supabase.from("deliverable_versions").select("id,deliverable_id,version_number,url")
      .in("id", rows.map((row) => row.deliverable_version_id)),
    supabase.from("task_submission_contributors").select("submission_id,intern_id")
      .in("submission_id", rows.map((row) => row.id)),
  ]);
  if (versions.error) throw new Error(`제출 링크 조회 실패: ${versions.error.message}`);
  if (contributors.error) throw new Error(`공동 기여자 조회 실패: ${contributors.error.message}`);
  const versionRows = (versions.data ?? []) as { id: string; deliverable_id: string; version_number: number; url: string }[];
  if (versionRows.length !== rows.length) throw new Error("제출 이력의 링크 버전을 찾을 수 없습니다.");
  const versionsById = new Map(versionRows.map((row) => [row.id, row]));
  return rows.map((row) => {
    const version = versionsById.get(row.deliverable_version_id);
    return {
      id: row.id, taskId: row.task_id, revision: row.revision,
      versionNumber: version!.version_number,
      title: row.title,
      url: version!.url, note: row.note,
      submittedBy: row.submitted_by, submittedAt: row.submitted_at,
      contributorInternIds: ((contributors.data ?? []) as { submission_id: string; intern_id: string }[])
        .filter((item) => item.submission_id === row.id).map((item) => item.intern_id),
      decision: row.decision, feedback: row.feedback,
      decidedBy: row.decided_by, decidedAt: row.decided_at,
    };
  });
}

export async function startAssignedTask(taskId: string): Promise<void> {
  const { error } = await supabase.rpc("start_assigned_task", { p_task_id: taskId });
  if (error) throw new Error(`업무 시작 실패: ${error.message}`);
}

export async function getTaskReviewers(): Promise<{ id: string; displayName: string }[]> {
  const { data, error } = await supabase.rpc("list_task_reviewers");
  if (error) throw new Error(`검토자 목록 조회 실패: ${error.message}`);
  return ((data ?? []) as { id: string; display_name: string }[])
    .map((row) => ({ id: row.id, displayName: row.display_name }));
}

export async function saveTaskBrief(taskId: string, expectedOutput: string,
  reviewerId: string | null, externalRequester: string): Promise<void> {
  const { error } = await supabase.rpc("set_task_brief", {
    p_task_id: taskId, p_expected_output: expectedOutput.trim(),
    p_reviewer_id: reviewerId, p_external_requester: externalRequester.trim(),
  });
  if (error) throw new Error(`업무 검토 정보 저장 실패: ${error.message}`);
}

export async function submitAssignedTask(input: {
  taskId: string; title: string; url: string; note: string; contributorInternIds: string[];
}): Promise<void> {
  const { error } = await supabase.rpc("submit_assigned_task", {
    p_task_id: input.taskId, p_title: input.title.trim(), p_url: input.url.trim(),
    p_note: input.note.trim(), p_contributor_ids: input.contributorInternIds,
  });
  if (error) throw new Error(`최종 제출 실패: ${error.message}`);
}

export async function decideTaskSubmission(
  submissionId: string, decision: "APPROVED" | "CHANGES_REQUESTED", feedback: string,
): Promise<void> {
  const { error } = await supabase.rpc("decide_task_submission", {
    p_submission_id: submissionId, p_decision: decision, p_feedback: feedback.trim(),
  });
  if (error) throw new Error(`최종 검토 실패: ${error.message}`);
}

export async function getLegacyTaskResolution(taskId: string): Promise<LegacyTaskResolution | null> {
  const { data, error } = await supabase.from("task_legacy_resolutions")
    .select("task_id,action,reason,resolved_by,resolved_at").eq("task_id", taskId).maybeSingle();
  if (error) throw new Error(`기존 업무 처리 조회 실패: ${error.message}`);
  if (!data) return null;
  return { taskId: data.task_id, action: data.action, reason: data.reason,
    resolvedBy: data.resolved_by, resolvedAt: data.resolved_at };
}

export async function resolveLegacyReview(
  taskId: string, action: "RESUBMIT" | "COMPLETE", reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("resolve_legacy_review", {
    p_task_id: taskId, p_action: action, p_reason: reason.trim(),
  });
  if (error) throw new Error(`기존 업무 처리 실패: ${error.message}`);
}
