import { supabase } from "../supabase";
import type {
  CreateTaskUpdateInput,
  ReviewTaskUpdateInput,
  TaskUpdate,
  TaskUpdateReviewStatus,
} from "../types/domain";

type TaskUpdateRow = {
  id: string;
  task_id: string;
  occurred_on: string;
  progress: string;
  learning: string;
  blockers: string;
  next_plan: string;
  review_status: TaskUpdateReviewStatus;
  manager_feedback: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type TaskUpdateAuthorLabelRow = {
  update_id: string;
  author_id: string;
  display_name: string;
};

const columns = "id, task_id, occurred_on, progress, learning, blockers, next_plan, review_status, manager_feedback, created_at, updated_at, created_by";

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("로그인 사용자를 확인할 수 없습니다.");
  return data.user.id;
}

function mapTaskUpdate(row: TaskUpdateRow, authorNames: Map<string, string>): TaskUpdate {
  return {
    id: row.id,
    taskId: row.task_id,
    occurredOn: row.occurred_on,
    progress: row.progress,
    learning: row.learning,
    blockers: row.blockers,
    nextPlan: row.next_plan,
    reviewStatus: row.review_status,
    managerFeedback: row.manager_feedback,
    authorName: row.created_by ? authorNames.get(row.created_by) ?? null : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

/**
 * Resolves labels by Task Update ID rather than profile ID. The database
 * rechecks the Task → Project boundary for every returned label.
 */
async function resolveAuthorNames(rows: TaskUpdateRow[]): Promise<Map<string, string>> {
  if (!rows.length) return new Map();

  const { data, error } = await supabase.rpc("get_task_update_author_labels", {
    p_update_ids: rows.map((row) => row.id),
  });
  if (error) {
    // Keep authorized update content available; the UI's existing neutral
    // unknown-author label makes the incomplete projection visible.
    console.error("진행 기록 작성자 표시 이름 조회 실패:", error.message);
    return new Map();
  }

  return new Map(
    ((data ?? []) as TaskUpdateAuthorLabelRow[]).map((label) => [
      label.author_id,
      label.display_name,
    ]),
  );
}

export async function getTaskUpdates(taskId: string): Promise<TaskUpdate[]> {
  const { data, error } = await supabase.from("task_updates").select(columns)
    .eq("task_id", taskId).order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`진행 기록 조회 실패: ${error.message}`);
  const rows = (data ?? []) as TaskUpdateRow[];
  const authorNames = await resolveAuthorNames(rows);
  return rows.map((row) => mapTaskUpdate(row, authorNames));
}

/** Home read for the signed-in INTERN; RLS remains the authorization boundary. */
export async function getMyTaskUpdates(): Promise<TaskUpdate[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("task_updates").select(columns)
    .eq("created_by", userId).order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`내 진행 기록 조회 실패: ${error.message}`);
  return ((data ?? []) as TaskUpdateRow[]).map((row) => mapTaskUpdate(row, new Map()));
}

/** Inbox read: one pending-update query plus one batched author lookup, never per Task. */
export async function getPendingTaskUpdates(): Promise<TaskUpdate[]> {
  const { data, error } = await supabase.from("task_updates").select(columns)
    .eq("review_status", "PENDING").order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`검토 대기 진행 기록 조회 실패: ${error.message}`);
  const rows = (data ?? []) as TaskUpdateRow[];
  const authorNames = await resolveAuthorNames(rows);
  return rows.map((row) => mapTaskUpdate(row, authorNames));
}

export async function createTaskUpdate(input: CreateTaskUpdateInput): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from("task_updates").insert({
    task_id: input.taskId,
    occurred_on: input.occurredOn,
    progress: input.progress.trim(),
    learning: input.learning.trim(),
    blockers: input.blockers.trim(),
    next_plan: input.nextPlan.trim(),
    review_status: "PENDING",
    manager_feedback: "",
    created_by: userId,
    updated_by: userId,
  });
  if (error) throw new Error(`진행 기록 저장 실패: ${error.message}`);
}

export async function reviewTaskUpdate(input: ReviewTaskUpdateInput): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from("task_updates").update({
    review_status: input.reviewStatus,
    manager_feedback: input.managerFeedback.trim(),
    updated_by: userId,
  }).eq("id", input.id);
  if (error) throw new Error(`진행 기록 검토 실패: ${error.message}`);
}
