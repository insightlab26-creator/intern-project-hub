import { supabase } from "../supabase";
import type {
  CreateInternInput,
  Intern,
  InternStatus,
  UpdateInternInput,
} from "../types/domain";

type InternRow = {
  id: string;

  name: string;
  school: string;
  major: string;
  cohort: string;

  start_date: string | null;
  end_date: string | null;

  status: InternStatus;
  user_id: string | null;

  created_at: string;
  updated_at: string;

  created_by: string | null;
  updated_by: string | null;

  schema_version: number;
};

const internColumns = `
  id,
  name,
  school,
  major,
  cohort,
  start_date,
  end_date,
  status,
  user_id,
  created_at,
  updated_at,
  created_by,
  updated_by,
  schema_version
`;

function mapIntern(row: InternRow): Intern {
  return {
    id: row.id,

    name: row.name,
    school: row.school,
    major: row.major,
    cohort: row.cohort,

    startDate: row.start_date,
    endDate: row.end_date,

    status: row.status,
    userUid: row.user_id,

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

export async function getInterns(): Promise<Intern[]> {
  const { data, error } = await supabase
    .from("interns")
    .select(internColumns)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `인턴 목록 조회 실패: ${error.message}`
    );
  }

  return ((data ?? []) as InternRow[]).map(mapIntern);
}

/** Resolve the active INTERN record linked to the authenticated account. */
export async function getCurrentIntern(): Promise<Intern | null> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("interns")
    .select(internColumns)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`현재 인턴 정보 조회 실패: ${error.message}`);
  return data ? mapIntern(data as InternRow) : null;
}

export async function createIntern(
  input: CreateInternInput
): Promise<Intern> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("interns")
    .insert({
      name: input.name.trim(),
      school: input.school.trim(),
      major: input.major.trim(),
      cohort: input.cohort.trim(),

      start_date: input.startDate,
      end_date: input.endDate,

      status: input.status,

      // 로그인 계정 연결은 이후 별도 기능으로 처리
      user_id: null,

      created_by: currentUserId,
      updated_by: currentUserId,

      schema_version: 1,
    })
    .select(internColumns)
    .single();

  if (error) {
    if (error.code === "23514") {
      throw new Error(
        "인턴 이름이나 참여 기간을 확인해주세요."
      );
    }

    if (error.code === "23503") {
      throw new Error(
        "등록한 사용자 정보를 확인할 수 없습니다."
      );
    }

    throw new Error(
      `인턴 등록 실패: ${error.message}`
    );
  }

  return mapIntern(data as InternRow);
}

export async function updateIntern(
  input: UpdateInternInput
): Promise<Intern> {
  const currentUserId = await getCurrentUserId();
  const { data, error } = await supabase.from("interns").update({
    name: input.name.trim(), school: input.school.trim(),
    major: input.major.trim(), cohort: input.cohort.trim(),
    start_date: input.startDate, end_date: input.endDate,
    status: input.status, updated_by: currentUserId,
  }).eq("id", input.internId).select(internColumns).single();
  if (error) {
    if (error.code === "23514") throw new Error("인턴 이름이나 참여 기간을 확인해주세요.");
    throw new Error(`인턴 수정 실패: ${error.message}`);
  }
  return mapIntern(data as InternRow);
}

export async function linkInternProfile(
  internId: string,
  profileId: string | null
): Promise<void> {
  const currentUserId = await getCurrentUserId();
  const { error } = await supabase.from("interns")
    .update({ user_id: profileId, updated_by: currentUserId })
    .eq("id", internId);
  if (error) throw new Error(`인턴 계정 연결 실패: ${error.message}`);
}
