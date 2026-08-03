import { supabase } from "../supabase";
import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
} from "../types/domain";

type ProjectRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;

  start_date: string | null;
  target_end_date: string | null;

  created_at: string;
  updated_at: string;

  created_by: string | null;
  updated_by: string | null;

  schema_version: number;
};

const projectColumns = `
  id,
  code,
  name,
  description,
  status,
  start_date,
  target_end_date,
  created_at,
  updated_at,
  created_by,
  updated_by,
  schema_version
`;

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,

    startDate: row.start_date,
    targetEndDate: row.target_end_date,

    /*
     * 향후 project_members 테이블로 대체한다.
     * 현재 화면에서는 이 필드를 사용하지 않으므로 빈 배열로 둔다.
     */
    ownerUids: [],

    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    schemaVersion: row.schema_version,
  };
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

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

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(projectColumns)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `프로젝트 목록 조회 실패: ${error.message}`
    );
  }

  return ((data ?? []) as ProjectRow[]).map(mapProject);
}

export async function createProject(
  input: CreateProjectInput
): Promise<Project> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description.trim(),

      status: input.status,

      start_date: input.startDate,
      target_end_date: input.targetEndDate,

      created_by: currentUserId,
      updated_by: currentUserId,

      schema_version: 1,
    })
    .select(projectColumns)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "이미 사용 중인 프로젝트 코드입니다."
      );
    }

    if (error.code === "23514") {
      throw new Error(
        "프로젝트 기간 또는 입력값을 확인해주세요."
      );
    }

    throw new Error(
      `프로젝트 생성 실패: ${error.message}`
    );
  }

  return mapProject(data as ProjectRow);
}
