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

type ProfileRow = { id: string; display_name: string };

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

export async function getTaskUpdates(taskId: string): Promise<TaskUpdate[]> {
  const { data, error } = await supabase.from("task_updates").select(columns)
    .eq("task_id", taskId).order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`진행 기록 조회 실패: ${error.message}`);
  const rows = (data ?? []) as TaskUpdateRow[];
  const authorIds = [...new Set(rows.map((row) => row.created_by).filter((id): id is string => Boolean(id)))];
  const authorNames = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase.from("profiles")
      .select("id, display_name").in("id", authorIds);
    if (profileError) throw new Error(`작성자 조회 실패: ${profileError.message}`);
    ((profiles ?? []) as ProfileRow[]).forEach((profile) => authorNames.set(profile.id, profile.display_name));
  }
  return rows.map((row) => mapTaskUpdate(row, authorNames));
}

/** Inbox read: one pending-update query plus one batched author lookup, never per Task. */
export async function getPendingTaskUpdates(): Promise<TaskUpdate[]> {
  const { data, error } = await supabase.from("task_updates").select(columns)
    .eq("review_status", "PENDING").order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`검토 대기 진행 기록 조회 실패: ${error.message}`);
  const rows = (data ?? []) as TaskUpdateRow[];
  const authorIds = [...new Set(rows.map((row) => row.created_by).filter((id): id is string => Boolean(id)))];
  const authorNames = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase.from("profiles")
      .select("id, display_name").in("id", authorIds);
    if (profileError) throw new Error(`진행 기록 작성자 조회 실패: ${profileError.message}`);
    ((profiles ?? []) as ProfileRow[]).forEach((profile) => authorNames.set(profile.id, profile.display_name));
  }
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
