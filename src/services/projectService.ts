import { supabase } from "../supabase";
import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
  ProjectType,
  UpdateProjectInput,
} from "../types/domain";

type ProjectRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  project_type: ProjectType;
  purpose: string;
  background: string;
  expected_outcome: string;
  field: string;
  current_stage: string;
  next_review_date: string | null;
  teams_folder_url: string | null;
  keywords: string[];
  operator_id: string | null;

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
  project_type,
  purpose,
  background,
  expected_outcome,
  field,
  current_stage,
  next_review_date,
  teams_folder_url,
  keywords,
  operator_id,
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
    projectType: row.project_type,
    purpose: row.purpose,
    background: row.background,
    expectedOutcome: row.expected_outcome,
    field: row.field,
    currentStage: row.current_stage,
    nextReviewDate: row.next_review_date,
    teamsFolderUrl: row.teams_folder_url,
    keywords: row.keywords,
    operatorId: row.operator_id,

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

export async function getProjectById(
  projectId: string
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .select(projectColumns)
    .eq("id", projectId)
    .single();

  if (error) {
    throw new Error(
      `프로젝트 조회 실패: ${error.message}`
    );
  }

  return mapProject(data as ProjectRow);
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
      project_type: input.projectType,
      purpose: input.purpose.trim(),
      background: input.background.trim(),
      expected_outcome: input.expectedOutcome.trim(),
      field: input.field.trim(),
      current_stage: input.currentStage.trim(),
      next_review_date: input.nextReviewDate,
      teams_folder_url: input.teamsFolderUrl,
      keywords: input.keywords.map((keyword) => keyword.trim()).filter(Boolean),
      operator_id: input.operatorId,

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

export async function updateProject(
  input: UpdateProjectInput
): Promise<Project> {
  const currentUserId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("projects")
    .update({
      code: input.code.trim(), name: input.name.trim(),
      description: input.description.trim(), status: input.status,
      project_type: input.projectType, purpose: input.purpose.trim(), background: input.background.trim(),
      expected_outcome: input.expectedOutcome.trim(), field: input.field.trim(), current_stage: input.currentStage.trim(),
      next_review_date: input.nextReviewDate, teams_folder_url: input.teamsFolderUrl,
      keywords: input.keywords.map((keyword) => keyword.trim()).filter(Boolean), operator_id: input.operatorId,
      start_date: input.startDate, target_end_date: input.targetEndDate,
      updated_by: currentUserId,
    })
    .eq("id", input.projectId).select(projectColumns).single();
  if (error) {
    if (error.code === "23505") throw new Error("이미 사용 중인 프로젝트 코드입니다.");
    if (error.code === "23514") throw new Error("프로젝트 기간 또는 입력값을 확인해주세요.");
    throw new Error(`프로젝트 수정 실패: ${error.message}`);
  }
  return mapProject(data as ProjectRow);
}
