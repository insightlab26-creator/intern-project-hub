import { supabase } from "../supabase";
import type {
  CreateTaskInput,
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "../types/domain";

type TaskRow = {
  id: string;
  project_id: string;
  workstream_id: string;
  parent_task_id: string | null;

  title: string;
  description: string;

  status: TaskStatus;
  priority: TaskPriority;

  start_date: string | null;
  due_date: string | null;

  sort_order: number;

  created_at: string;
  updated_at: string;

  created_by: string | null;
  updated_by: string | null;

  schema_version: number;
};

type TaskAssigneeRow = {
  task_id: string;
  intern_id: string;
};

type InternAccountRow = {
  id: string;
  user_id: string | null;
};

const taskColumns = `
  id,
  project_id,
  workstream_id,
  parent_task_id,
  title,
  description,
  status,
  priority,
  start_date,
  due_date,
  sort_order,
  created_at,
  updated_at,
  created_by,
  updated_by,
  schema_version
`;

type AssigneeMaps = {
  internIdsByTask: Map<string, string[]>;
  userIdsByIntern: Map<string, string>;
};

/**
 * Task 담당 인턴과 연결된 로그인 계정을 조회한다.
 */
async function getAssigneeMaps(
  taskIds: string[]
): Promise<AssigneeMaps> {
  const internIdsByTask = new Map<string, string[]>();
  const userIdsByIntern = new Map<string, string>();

  if (taskIds.length === 0) {
    return {
      internIdsByTask,
      userIdsByIntern,
    };
  }

  const { data: assigneeData, error: assigneeError } =
    await supabase
      .from("task_assignees")
      .select("task_id, intern_id")
      .in("task_id", taskIds);

  if (assigneeError) {
    throw new Error(
      `Task 담당자 조회 실패: ${assigneeError.message}`
    );
  }

  const assignees =
    (assigneeData ?? []) as TaskAssigneeRow[];

  assignees.forEach((assignee) => {
    const currentInternIds =
      internIdsByTask.get(assignee.task_id) ?? [];

    currentInternIds.push(assignee.intern_id);

    internIdsByTask.set(
      assignee.task_id,
      currentInternIds
    );
  });

  const internIds = [
    ...new Set(
      assignees.map((assignee) => assignee.intern_id)
    ),
  ];

  if (internIds.length === 0) {
    return {
      internIdsByTask,
      userIdsByIntern,
    };
  }

  const { data: internData, error: internError } =
    await supabase
      .from("interns")
      .select("id, user_id")
      .in("id", internIds);

  if (internError) {
    throw new Error(
      `인턴 계정 정보 조회 실패: ${internError.message}`
    );
  }

  const internAccounts =
    (internData ?? []) as InternAccountRow[];

  internAccounts.forEach((intern) => {
    if (intern.user_id) {
      userIdsByIntern.set(intern.id, intern.user_id);
    }
  });

  return {
    internIdsByTask,
    userIdsByIntern,
  };
}

function mapTask(
  row: TaskRow,
  assigneeMaps: AssigneeMaps
): Task {
  const assigneeInternIds =
    assigneeMaps.internIdsByTask.get(row.id) ?? [];

  const assigneeUids = assigneeInternIds
    .map((internId) =>
      assigneeMaps.userIdsByIntern.get(internId)
    )
    .filter(
      (userId): userId is string =>
        typeof userId === "string"
    );

  return {
    id: row.id,
    projectId: row.project_id,

    title: row.title,
    description: row.description,

    workstreamId: row.workstream_id,
    parentTaskId: row.parent_task_id,

    assigneeInternIds,
    assigneeUids,

    status: row.status,
    priority: row.priority,

    startDate: row.start_date,
    dueDate: row.due_date,

    order: row.sort_order,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    schemaVersion: row.schema_version,
  };
}

function getTaskErrorMessage(
  action: "생성" | "수정",
  error: {
    code?: string;
    message: string;
  }
): string {
  const databaseMessage = error.message;

  if (
    databaseMessage.includes(
      "선택한 Workstream이 해당 프로젝트에 속하지 않습니다"
    )
  ) {
    return "선택한 Workstream과 프로젝트가 일치하지 않습니다.";
  }

  if (
    databaseMessage.includes(
      "상위 Task는 동일한 프로젝트와 Workstream에 속해야 합니다"
    )
  ) {
    return "상위 Task는 동일한 Workstream 안에서 선택해야 합니다.";
  }

  if (
    databaseMessage.includes(
      "순환 구조를 만들 수 없습니다"
    )
  ) {
    return "상하위 Task 관계가 순환되지 않도록 확인해주세요.";
  }

  if (
    databaseMessage.includes(
      "자기 자신을 상위 Task로 지정할 수 없습니다"
    )
  ) {
    return "Task 자기 자신은 상위 Task가 될 수 없습니다.";
  }

  if (
    databaseMessage.includes(
      "하위 Task가 있는 Task는 다른 프로젝트 또는 Workstream으로 이동할 수 없습니다"
    )
  ) {
    return "하위 Task가 연결되어 있어 다른 Workstream으로 이동할 수 없습니다.";
  }

  if (
    databaseMessage.includes(
      "수정할 Task를 찾을 수 없습니다"
    )
  ) {
    return "수정할 Task를 찾을 수 없습니다.";
  }

  if (error.code === "23503") {
    return "연결된 프로젝트, Workstream 또는 인턴 정보를 확인해주세요.";
  }

  if (error.code === "23514") {
    return "Task 제목, 기간 또는 정렬 순서를 확인해주세요.";
  }

  return `Task ${action} 실패: ${databaseMessage}`;
}

/**
 * 특정 프로젝트의 Task 목록을 조회한다.
 */
export async function getTasks(
  projectId: string
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .eq("project_id", projectId)
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Task 목록 조회 실패: ${error.message}`
    );
  }

  const taskRows = (data ?? []) as TaskRow[];

  const assigneeMaps = await getAssigneeMaps(
    taskRows.map((task) => task.id)
  );

  return taskRows.map((task) =>
    mapTask(task, assigneeMaps)
  );
}

export async function getAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from("tasks").select(taskColumns)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Task 목록 조회 실패: ${error.message}`);
  const rows = (data ?? []) as TaskRow[];
  const maps = await getAssigneeMaps(rows.map((task) => task.id));
  return rows.map((row) => mapTask(row, maps));
}

/**
 * ID로 Task 한 건을 조회한다.
 */
export async function getTaskById(
  taskId: string
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .eq("id", taskId)
    .single();

  if (error) {
    throw new Error(
      `Task 조회 실패: ${error.message}`
    );
  }

  const taskRow = data as TaskRow;
  const assigneeMaps = await getAssigneeMaps([
    taskRow.id,
  ]);

  return mapTask(taskRow, assigneeMaps);
}

/**
 * Task와 담당 인턴을 하나의 DB 작업으로 생성한다.
 */
export async function createTask(
  input: CreateTaskInput
): Promise<Task> {
  const { data, error } = await supabase.rpc(
    "create_task_with_assignees",
    {
      p_project_id: input.projectId,
      p_workstream_id: input.workstreamId,
      p_parent_task_id: input.parentTaskId,

      p_title: input.title.trim(),
      p_description: input.description.trim(),

      p_status: input.status,
      p_priority: input.priority,

      p_start_date: input.startDate,
      p_due_date: input.dueDate,

      p_sort_order: input.order,
      p_assignee_intern_ids:
        input.assigneeInternIds,
    }
  );

  if (error) {
    throw new Error(
      getTaskErrorMessage("생성", error)
    );
  }

  if (!data || typeof data !== "string") {
    throw new Error(
      "생성된 Task ID를 확인할 수 없습니다."
    );
  }

  return getTaskById(data);
}

/**
 * Task 정보와 담당 인턴을 하나의 DB 작업으로 수정한다.
 */
export async function updateTask(
  input: UpdateTaskInput
): Promise<Task> {
  const { error } = await supabase.rpc(
    "update_task_with_assignees",
    {
      p_task_id: input.taskId,
      p_project_id: input.projectId,
      p_workstream_id: input.workstreamId,
      p_parent_task_id: input.parentTaskId,

      p_title: input.title.trim(),
      p_description: input.description.trim(),

      p_status: input.status,
      p_priority: input.priority,

      p_start_date: input.startDate,
      p_due_date: input.dueDate,

      p_sort_order: input.order,
      p_assignee_intern_ids:
        input.assigneeInternIds,
    }
  );

  if (error) {
    throw new Error(
      getTaskErrorMessage("수정", error)
    );
  }

  return getTaskById(input.taskId);
}
