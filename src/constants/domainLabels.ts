import type {
  InternStatus,
  ProjectStatus,
  ProjectType,
  TaskPriority,
  TaskStatus,
  WorkstreamStatus,
  ProgramStatus,
  EnrollmentStatus,
  ProjectMemberRole,
  MembershipStatus,
  TaskUpdateReviewStatus,
  ManagerNoteType,
  ManagerNoteStatus,
  InternReviewStatus,
  ReviewGateResult,
} from "../types/domain";

export const PROJECT_STATUS_LABELS: Record<
  ProjectStatus,
  string
> = {
  PLANNING: "기획",
  ACTIVE: "진행 중",
  ON_HOLD: "보류",
  COMPLETED: "완료",
  ARCHIVED: "보관",
  REVIEW: "검토",
  REVISION: "수정 중",
  DROPPED: "중단",
};

export const PROJECT_TYPE_LABELS:Record<ProjectType,string>={EXPLORE:"EXPLORE",BUILD:"BUILD",REFINE:"REFINE"};
export const REVIEW_GATE_RESULT_LABELS:Record<ReviewGateResult,string>={REVISE:"수정 필요",KEEP:"참고 보관",ASSET:"BX 자산",DROP:"중단"};

export const WORKSTREAM_STATUS_LABELS: Record<
  WorkstreamStatus,
  string
> = {
  PLANNING: "기획",
  ACTIVE: "진행 중",
  ON_HOLD: "보류",
  COMPLETED: "완료",
};

export const INTERN_STATUS_LABELS: Record<
  InternStatus,
  string
> = {
  PLANNED: "예정",
  ACTIVE: "활동 중",
  COMPLETED: "종료",
};

export const TASK_STATUS_LABELS: Record<
  TaskStatus,
  string
> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  REVIEW: "검토",
  DONE: "완료",
  HOLD: "보류",
};

export const TASK_PRIORITY_LABELS: Record<
  TaskPriority,
  string
> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
};

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  PLANNING: "예정", ACTIVE: "진행 중", COMPLETED: "완료", ARCHIVED: "보관",
};
export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  PLANNED: "예정", ACTIVE: "참여 중", COMPLETED: "수료",
};
export const PROJECT_MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  OWNER: "책임자", MEMBER: "멤버",
};
export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: "활성", INACTIVE: "비활성",
};
export const TASK_UPDATE_REVIEW_STATUS_LABELS: Record<TaskUpdateReviewStatus, string> = {
  NOT_REQUIRED: "피드백 기록",
  PENDING: "검토 대기", APPROVED: "승인", CHANGES_REQUESTED: "보완 요청",
};
export const MANAGER_NOTE_TYPE_LABELS:Record<ManagerNoteType,string>={GENERAL:"일반",FEEDBACK:"피드백",RISK:"위험",FOLLOW_UP:"후속 조치"};
export const MANAGER_NOTE_STATUS_LABELS:Record<ManagerNoteStatus,string>={OPEN:"미해결",RESOLVED:"해결",ARCHIVED:"보관"};
export const INTERN_REVIEW_STATUS_LABELS:Record<InternReviewStatus,string>={DRAFT:"초안",FINALIZED:"확정"};
