// ======================================================
// 공통 상태 타입
// ======================================================

export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED"
  | "REVIEW"
  | "REVISION"
  | "DROPPED";

export type ProjectType = "EXPLORE" | "BUILD" | "REFINE";

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

export type ProgramStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type EnrollmentStatus = "PLANNED" | "ACTIVE" | "COMPLETED";
export type ProjectMemberRole = "OWNER" | "MEMBER";
export type MembershipStatus = "ACTIVE" | "INACTIVE";

export type Program = {
  id: string; code: string; name: string; description: string;
  status: ProgramStatus; startDate: string | null; endDate: string | null;
  createdAt: string; updatedAt: string;
};
export type ProgramInput = Omit<Program, "id" | "createdAt" | "updatedAt">;
export type ProgramEnrollment = {
  id: string; programId: string; internId: string; status: EnrollmentStatus;
  startDate: string | null; endDate: string | null;
};
export type ProgramProject = {
  id: string; programId: string; projectId: string; status: MembershipStatus;
};
export type ProjectMember = {
  id: string; projectId: string; internId: string;
  role: ProjectMemberRole; status: MembershipStatus;
};


// ======================================================
// Project
// ======================================================

export type Project = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  projectType: ProjectType;
  purpose: string;
  background: string;
  expectedOutcome: string;
  field: string;
  currentStage: string;
  teamsFolderUrl: string | null;
  keywords: string[];
  operatorId: string | null;

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
  projectType: ProjectType;
  purpose: string;
  background: string;
  expectedOutcome: string;
  field: string;
  currentStage: string;
  teamsFolderUrl: string | null;
  keywords: string[];
  operatorId: string | null;
  startDate: string | null;
  targetEndDate: string | null;
};

export type UpdateProjectInput = CreateProjectInput & {
  projectId: string;
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

export type UpdateWorkstreamInput = CreateWorkstreamInput & {
  workstreamId: string;
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

export type UpdateInternInput = CreateInternInput & {
  internId: string;
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
  assigneeInternIds: string[];

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

  assigneeInternIds: string[];

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

export type TaskUpdateReviewStatus = "PENDING" | "APPROVED" | "CHANGES_REQUESTED";

export type TaskUpdate = {
  id: string;
  taskId: string;
  occurredOn: string;
  progress: string;
  learning: string;
  blockers: string;
  nextPlan: string;
  reviewStatus: TaskUpdateReviewStatus;
  managerFeedback: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

export type CreateTaskUpdateInput = Pick<
  TaskUpdate,
  "taskId" | "occurredOn" | "progress" | "learning" | "blockers" | "nextPlan"
>;

export type ReviewTaskUpdateInput = Pick<
  TaskUpdate,
  "id" | "reviewStatus" | "managerFeedback"
>;

export type DocumentLink = {
  id: string; projectId: string; taskId: string | null; title: string; description: string;
  url: string; archived: boolean; source: "DOCUMENT" | "RESOURCE"; createdAt: string; updatedAt: string;
};
export type DocumentLinkInput = Omit<DocumentLink, "id" | "createdAt" | "updatedAt">;

export type ReviewGateResult = "REVISE" | "KEEP" | "ASSET" | "DROP";
export type ReviewGateTarget = "PROJECT" | "DELIVERABLE";
export type ReviewGate = {id:string;targetType:ReviewGateTarget;projectId:string|null;deliverableId:string|null;result:ReviewGateResult;comments:string;nextAction:string;sourceUrl:string;dropReason:string;reviewedAt:string;reviewedBy:string};

export type ManagerNoteType="GENERAL"|"FEEDBACK"|"RISK"|"FOLLOW_UP";
export type ManagerNoteStatus="OPEN"|"RESOLVED"|"ARCHIVED";
export type ManagerNote={id:string;projectId:string|null;internId:string|null;taskId:string|null;subject:string;content:string;noteType:ManagerNoteType;status:ManagerNoteStatus;followUpOn:string|null;resolvedOn:string|null;createdAt:string;updatedAt:string};
export type ManagerNoteInput=Omit<ManagerNote,"id"|"createdAt"|"updatedAt">;

export type InternReviewStatus="DRAFT"|"FINALIZED";
export type InternReview={id:string;internId:string;programId:string|null;projectId:string|null;reviewCycle:string;problemUnderstanding:number;researchAnalysis:number;workQuality:number;communication:number;feedbackApplication:number;ownershipGrowth:number;strengths:string;improvements:string;growthGoals:string;status:InternReviewStatus;finalizedAt:string|null;reviewerId:string;createdAt:string;updatedAt:string};
export type InternReviewInput=Omit<InternReview,"id"|"finalizedAt"|"reviewerId"|"createdAt"|"updatedAt">;
export type AuditAction="INSERT"|"UPDATE"|"DELETE"|"INVITE"|"PASSWORD_RESET"|"DEACTIVATE"|"ACTIVATE";export type AuditLog={id:number;entityType:string;entityId:string;action:AuditAction;changedFields:string[];actorId:string|null;actorName:string|null;occurredAt:string};

export type DashboardTaskItem={id:string;title:string;projectName:string;status:TaskStatus;priority:TaskPriority;dueDate:string|null;updatedAt:string;assigneeNames:string[]};
export type DashboardTeamLoad={internId:string|null;name:string;total:number;todo:number;inProgress:number;review:number;hold:number};
export type DashboardWidgetKey="TOTAL_TASKS"|"IN_PROGRESS"|"COMPLETION_RATE"|"DUE_SOON"|"ACTIVE_PROJECTS"|"ACTIVE_PROGRAMS"|"ACTIVE_INTERNS"|"OVERDUE_TASKS"|"UNASSIGNED_TASKS"|"REVIEW_TASKS"|"PENDING_DELIVERABLES"|"OPEN_MANAGER_NOTES"|"FINALIZED_REVIEWS"|"RESOURCE_COUNT";
export type DashboardSummary={exploreProjectCount:number;buildProjectCount:number;refineProjectCount:number;projectReviewCount:number;revisionProjectCount:number;overdueProjectCount:number;totalTaskCount:number;inProgressTaskCount:number;completionRate:number;dueSoonCount:number;activeProjectCount:number;activeProgramCount:number;activeInternCount:number;overdueTaskCount:number;unassignedTaskCount:number;reviewTaskCount:number;pendingDeliverableCount:number;openManagerNoteCount:number;finalizedReviewCount:number;resourceCount:number;weeklyTotal:number;weeklyDone:number;weeklyProgressRate:number;weeklyStatusCounts:Record<TaskStatus,number>;teamLoads:DashboardTeamLoad[];recentTasks:DashboardTaskItem[];dueAlerts:DashboardTaskItem[];reviewTasks:DashboardTaskItem[]};
export type SearchScope="PROJECTS"|"WORKSTREAMS"|"TASKS"|"PROGRAMS"|"INTERNS"|"DELIVERABLES"|"MANAGER_NOTES";
export type GlobalSearchResult={id:string;scope:SearchScope;title:string;description:string;context:string;path:string;updatedAt:string|null};
export type ReportKind="PROJECT_PROGRESS"|"INTERN_PERFORMANCE"|"WEEKLY_TASKS";
export type ReportRow=Record<string,string|number|null>;

export type PlanImportProject = { projectCode:string; projectName:string; description:string; status:ProjectStatus; startDate:string|null; targetEndDate:string|null };
export type PlanImportWorkstream = { projectCode:string; workstreamName:string; description:string; status:WorkstreamStatus; sortOrder:number };
export type PlanImportTask = { projectCode:string; workstreamName:string; taskTitle:string; description:string; status:TaskStatus; priority:TaskPriority; parentTaskTitle:string|null; assigneeNames:string[]; startDate:string|null; dueDate:string|null };
export type PlanImportData = { projects:PlanImportProject[]; workstreams:PlanImportWorkstream[]; tasks:PlanImportTask[] };
export type PlanImportResult = { projectCount:number; workstreamCount:number; taskCount:number; assigneeCount:number };
