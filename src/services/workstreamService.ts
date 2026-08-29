import { supabase } from "../supabase";
import type {
  CreateWorkstreamInput,
  Workstream,
  WorkstreamStatus,
  UpdateWorkstreamInput,
} from "../types/domain";

type WorkstreamRow = {
  id: string;
  project_id: string;

  name: string;
  description: string;
  status: WorkstreamStatus;

  sort_order: number;

  created_at: string;
  updated_at: string;

  created_by: string | null;
  updated_by: string | null;
};

const workstreamColumns = `
  id,
  project_id,
  name,
  description,
  status,
  sort_order,
  created_at,
  updated_at,
  created_by,
  updated_by
`;

function mapWorkstream(
  row: WorkstreamRow
): Workstream {
  return {
    id: row.id,
    projectId: row.project_id,

    name: row.name,
    description: row.description,
    status: row.status,

    order: row.sort_order,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    throw new Error(
      `로그인 사용자 확인 실패: ${error.message}`
    );
  }

  if (!data.user) {
    throw new Error("로그인이 필요합니다.");
  }

  return data.user.id;
}

export async function getWorkstreams(
  projectId: string
): Promise<Workstream[]> {
  const { data, error } = await supabase
    .from("workstreams")
    .select(workstreamColumns)
    .eq("project_id", projectId)
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Workstream 목록 조회 실패: ${error.message}`
    );
  }

  return ((data ?? []) as WorkstreamRow[]).map(
    mapWorkstream
  );
}

/** Fetch workstream context for several already-authorized projects in one query. */
export async function getWorkstreamsForProjects(projectIds: string[]): Promise<Workstream[]> {
  if (projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from("workstreams")
    .select(workstreamColumns)
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Workstream 목록 조회 실패: ${error.message}`);
  return ((data ?? []) as WorkstreamRow[]).map(mapWorkstream);
}

export async function createWorkstream(
  input: CreateWorkstreamInput
): Promise<Workstream> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("workstreams")
    .insert({
      project_id: input.projectId,

      name: input.name.trim(),
      description: input.description.trim(),
      status: input.status,

      sort_order: input.order,

      created_by: currentUserId,
      updated_by: currentUserId,
    })
    .select(workstreamColumns)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "동일한 순서의 Workstream이 이미 존재합니다."
      );
    }

    if (error.code === "23503") {
      throw new Error(
        "연결할 프로젝트를 찾을 수 없습니다."
      );
    }

    if (error.code === "23514") {
      throw new Error(
        "Workstream 입력값을 확인해주세요."
      );
    }

    throw new Error(
      `Workstream 생성 실패: ${error.message}`
    );
  }

  return mapWorkstream(data as WorkstreamRow);
}

export async function updateWorkstream(
  input: UpdateWorkstreamInput
): Promise<Workstream> {
  const currentUserId = await getCurrentUserId();
  const { data, error } = await supabase.from("workstreams").update({
    name: input.name.trim(), description: input.description.trim(),
    status: input.status, sort_order: input.order, updated_by: currentUserId,
  }).eq("id", input.workstreamId).eq("project_id", input.projectId)
    .select(workstreamColumns).single();
  if (error) {
    if (error.code === "23505") throw new Error("동일한 순서의 Workstream이 이미 존재합니다.");
    if (error.code === "23514") throw new Error("Workstream 입력값을 확인해주세요.");
    throw new Error(`Workstream 수정 실패: ${error.message}`);
  }
  return mapWorkstream(data as WorkstreamRow);
}
