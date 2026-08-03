// ======================================================
// 공통 상태 타입
// ======================================================

export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

export type WorkstreamStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED";

export type InternStatus =
  | "PLANNED"
  | "ACTIVE"
  | "COMPLETED";

export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "REVIEW"
  | "DONE"
  | "HOLD";

export type TaskPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH";


// ======================================================
// Project
// ======================================================

export type Project = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;

  startDate: string | null;
  targetEndDate: string | null;

  /*
   * 현재 화면 호환을 위해 임시 유지한다.
   * 추후 project_members 테이블 연결 후 제거할 예정이다.
   */
  ownerUids: string[];

  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  schemaVersion?: number;
};

export type CreateProjectInput = {
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  targetEndDate: string | null;
};


// ======================================================
// Workstream
// ======================================================

export type Workstream = {
  id: string;
  projectId: string;

  name: string;
  description: string;
  status: WorkstreamStatus;

  /*
   * Supabase의 sort_order를 화면에서는 order로 사용한다.
   */
  order: number;

  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CreateWorkstreamInput = {
  projectId: string;
  name: string;
  description: string;
  status: WorkstreamStatus;
  order: number;
};


// ======================================================
// Intern
// ======================================================

export type Intern = {
  id: string;

  name: string;
  school: string;
  major: string;
  cohort: string;

  startDate: string | null;
  endDate: string | null;

  status: InternStatus;

  /*
   * Supabase profiles와 연결된 사용자 UUID다.
   * 로그인 계정이 연결되지 않은 인턴은 null이다.
   */
  userUid: string | null;

  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  schemaVersion?: number;
};

export type CreateInternInput = {
  name: string;
  school: string;
  major: string;
  cohort: string;
  startDate: string | null;
  endDate: string | null;
  status: InternStatus;
};


// ======================================================
// Task
// ======================================================

export type Task = {
  id: string;
  projectId: string;

  title: string;
  description: string;

  workstreamId: string;
  parentTaskId: string | null;

  /*
   * DB에서는 task_assignees 관계 테이블에 저장하지만,
   * 화면에서는 기존 배열 형태를 유지한다.
   */
  assigneeInternIds: string[];
  assigneeUids: string[];

  status: TaskStatus;
  priority: TaskPriority;

  startDate: string | null;
  dueDate: string | null;

  order: number;

  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  schemaVersion?: number;
};

export type CreateTaskInput = {
  projectId: string;

  title: string;
  description: string;

  workstreamId: string;
  parentTaskId: string | null;

  /*
   * 현재 입력 화면은 담당자 한 명만 선택한다.
   * DB 구조는 여러 명의 담당자를 지원한다.
   */
  assigneeInternId: string | null;

  status: TaskStatus;
  priority: TaskPriority;

  startDate: string | null;
  dueDate: string | null;

  order: number;
};

export type UpdateTaskInput = {
  taskId: string;
  projectId: string;

  title: string;
  description: string;

  workstreamId: string;
  parentTaskId: string | null;

  assigneeInternId: string | null;

  status: TaskStatus;
  priority: TaskPriority;

  startDate: string | null;
  dueDate: string | null;

  order: number;
};


// ======================================================
// Task Assignee
// ======================================================

export type TaskAssignee = {
  taskId: string;
  internId: string;
  assignedAt: string;
  assignedBy: string | null;
};